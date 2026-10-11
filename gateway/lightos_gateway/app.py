"""LightOS runtime gateway: a plain ASGI app (FastAPI) run with uvicorn.

Contract consumed by the LightOS app (supabase/functions/_shared/runtime-gateway.ts):
Bearer auth + X-LightOS-User-ID / X-LightOS-User-Email / X-Request-ID headers.
"""
from __future__ import annotations

import hmac
import json
import os
import socket
import sqlite3
import threading
import time
import uuid
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from .inference import InferenceBackend, from_env as inference_from_env
from .telemetry import Provider, Sampler, detect_provider

MIN_TOKEN_LEN = 32
ALLOC_UTIL_PCT = 5.0
GPU_HOUR_USD = {"T4": 0.59, "L4": 0.80, "A10G": 1.10, "L40S": 1.80, "A100": 2.50, "H100": 3.95, "H200": 4.50}


def load_token(env=os.environ) -> str:
    token = (env.get("LIGHTOS_GATEWAY_TOKEN") or "").strip()
    if len(token) < MIN_TOKEN_LEN:
        raise SystemExit(
            f"LIGHTOS_GATEWAY_TOKEN must be set and at least {MIN_TOKEN_LEN} characters "
            "(generate one with: openssl rand -hex 32)"
        )
    return token


def _err(status: int, code: str, message: str) -> JSONResponse:
    return JSONResponse({"code": code, "message": message}, status)


def _agg(vals, fn):
    v = [x for x in vals if x is not None]
    if not v:
        return None
    return round(sum(v) / len(v), 2) if fn == "avg" else max(v)


class Registry:
    """Node registrations from `lightos cuda`, kept in SQLite (":memory:" in tests)."""

    def __init__(self, path: str):
        self.db = sqlite3.connect(path, check_same_thread=False)
        self.lock = threading.Lock()
        self.db.execute(
            "CREATE TABLE IF NOT EXISTS nodes (enrollment_id TEXT PRIMARY KEY, hostname TEXT, "
            "user_id TEXT, report TEXT, registered_at REAL)"
        )

    def put(self, enrollment_id: str, hostname: str, user_id: Optional[str], report: dict) -> None:
        with self.lock:
            self.db.execute(
                "INSERT OR REPLACE INTO nodes VALUES (?,?,?,?,?)",
                (enrollment_id, hostname, user_id, json.dumps(report), time.time()),
            )
            self.db.commit()

    def count(self) -> int:
        with self.lock:
            return self.db.execute("SELECT COUNT(*) FROM nodes").fetchone()[0]


def _valid_report(b: Any) -> Optional[str]:
    if not isinstance(b, dict):
        return "body must be a JSON object"
    for k in ("enrollment_id", "hostname", "os"):
        if not isinstance(b.get(k), str) or not b[k] or len(b[k]) > 255:
            return f"{k} is required"
    for k in ("driver", "nvcc", "cudart"):
        v = b.get(k)
        if not isinstance(v, dict) or not isinstance(v.get("present"), bool):
            return f"{k} must be {{present, version}}"
    gpus = b.get("gpus")
    if not isinstance(gpus, list) or len(gpus) > 64:
        return "gpus must be a list (max 64)"
    for g in gpus:
        if not isinstance(g, dict) or not isinstance(g.get("index"), int) or not isinstance(g.get("name"), str):
            return "each gpu needs index and name"
    return None


def create_app(
    token: str,
    provider: Optional[Provider] = None,
    *,
    sampler: Optional[Sampler] = None,
    inference: Optional[InferenceBackend] = None,
    db_path: Optional[str] = None,
    node_name: Optional[str] = None,
    start_sampler: bool = True,
) -> FastAPI:
    if len(token) < MIN_TOKEN_LEN:
        raise ValueError("gateway token too short")
    token_b = token.encode()
    provider = provider or detect_provider()
    sampler = sampler or Sampler(provider)
    if start_sampler:
        sampler.start()
    elif not sampler.buf:
        sampler.tick()
    static = provider.static()
    inference = inference if inference is not None else inference_from_env()
    node = node_name or os.environ.get("GATEWAY_NODE_NAME") or socket.gethostname()
    registry = Registry(db_path or os.environ.get("GATEWAY_DB_PATH", "/data/gateway.db"))
    events: List[dict] = []
    jobs: Dict[str, dict] = {}
    busy = {"n": 0}

    api = FastAPI(title="LightOS runtime gateway", docs_url=None, redoc_url=None, openapi_url=None)

    @api.middleware("http")
    async def auth(request: Request, call_next):
        if request.url.path == "/healthz":
            return await call_next(request)
        h = request.headers.get("authorization", "")
        given = h[7:].encode() if h.startswith("Bearer ") else b""
        if not hmac.compare_digest(given, token_b):
            return _err(401, "unauthorized", "Invalid gateway token")
        return await call_next(request)

    def devices_now():
        return sampler.latest()

    def gpu_rate(name: str) -> Optional[float]:
        override = os.environ.get("GPU_HOUR_USD")
        if override:
            try:
                return float(override)
            except ValueError:
                pass
        for k, v in GPU_HOUR_USD.items():
            if k in name:
                return v
        return None

    def reason() -> Optional[str]:
        return None if devices_now() else (provider.reason or "no_gpu_visible")

    def capacity(window_seconds: int = 60) -> dict:
        devs = devices_now()
        win = sampler.window(window_seconds)
        util: Dict[str, List[float]] = {}
        procs: Dict[str, bool] = {}
        for _, rows in win:
            for r in rows:
                if r.util is not None:
                    util.setdefault(r.uuid, []).append(r.util)
                procs[r.uuid] = procs.get(r.uuid, False) or r.has_process
        allocated = sum(
            1 for d in devs
            if procs.get(d.uuid) or (util.get(d.uuid) and sum(util[d.uuid]) / len(util[d.uuid]) >= ALLOC_UTIL_PCT)
        )
        body = {
            "source": "measured" if devs else "unavailable",
            "collector": provider.source,
            "runtimes": {
                "cuda": {"available": bool(devs), "driver": static.driver, "cuda_version": static.cuda},
                "rocm": {"available": False}, "tpu_xla": {"available": False}, "oneapi_sycl": {"available": False},
            },
            "nodes": [{"node": node, "devices": [
                {"uuid": d.uuid, "model": d.name, "memory_mib": d.mem_total, "runtime": "cuda"} for d in devs
            ]}] if devs else [],
            "totals": {"devices": len(devs), "allocated": allocated, "free": len(devs) - allocated},
        }
        if not devs:
            body["reason"] = reason()
        return body

    @api.get("/healthz")
    def healthz():
        return {"status": "ok", "gpu_count": len(devices_now()), "source": provider.source}

    @api.get("/v1/fabric/capacity")
    def get_capacity(runtime: str = "all", window_seconds: int = 60):
        c = capacity(max(10, min(3600, window_seconds)))
        if runtime not in ("all", "cuda"):
            c["totals"] = {"devices": 0, "allocated": 0, "free": 0}
            c["nodes"] = []
            c["reason"] = f"runtime_{runtime}_not_available"
        return c

    @api.get("/v1/fabric/telemetry")
    def telemetry(window_seconds: int = 60):
        w = max(10, min(3600, window_seconds))
        win = sampler.window(w)
        by: Dict[str, list] = {}
        for _, rows in win:
            for r in rows:
                by.setdefault(r.uuid, []).append(r)
        devices = [{
            "uuid": u, "node": f"{node} · {rs[-1].name}", "model": rs[-1].name,
            "gpu_util_pct": {"avg": _agg([r.util for r in rs], "avg"), "max": _agg([r.util for r in rs], "max")},
            "power_w": {"avg": _agg([r.power for r in rs], "avg"), "max": _agg([r.power for r in rs], "max")},
            "fb_used_mib": {"max": _agg([r.mem_used for r in rs], "max")},
            "gpu_temp_c": {"max": _agg([r.temp for r in rs], "max")},
        } for u, rs in by.items()]
        powers = [d["power_w"]["avg"] for d in devices if d["power_w"]["avg"] is not None]
        body = {
            "source": "measured" if devices else "unavailable",
            "collector": provider.source,
            "window_seconds": w, "samples": len(win), "interval_seconds": sampler.interval,
            "cluster": {
                "gpu_util_pct_avg": _agg([d["gpu_util_pct"]["avg"] for d in devices], "avg"),
                "power_w_sum": round(sum(powers), 1) if powers else None,
                "gpus_reporting": len(devices),
            },
            "devices": devices,
        }
        if not devices:
            body["reason"] = reason()
        return body

    @api.get("/v1/fabric/topology")
    def topology():
        devs = devices_now()
        return {"source": "measured" if devs else "unavailable", "nodes": [{"id": node, "gpus": [d.uuid for d in devs]}],
                "links": [], "note": "Single node; inter-node fabric not modelled"}

    @api.get("/v1/fabric/events")
    def get_events(window_seconds: int = 300):
        cutoff = time.time() - window_seconds
        return {"events": [e for e in list(events) + list(sampler.errors) if e["ts"] >= cutoff]}

    def validate_intent(i: dict) -> dict:
        devs = devices_now()
        mem_gib = (devs[0].mem_total or 0) / 1024 if devs else 0
        issues = []
        if not devs:
            issues.append("No GPUs visible on this gateway")
        if i.get("runtime") not in (None, "auto", "cuda"):
            issues.append(f"Runtime {i.get('runtime')} not available on this gateway")
        try:
            count = int(i.get("acceleratorCount", 1))
            min_mem = float(i.get("minimumMemoryGiB", 0))
            ceiling = float(i.get("maxCostPerHourUsd", 1e9))
        except (TypeError, ValueError):
            return {"valid": False, "issues": ["Intent has non-numeric fields"], "capacity": capacity()["totals"]}
        if count > len(devs):
            issues.append(f"Requested {count} GPUs, {len(devs)} available")
        if min_mem > mem_gib:
            issues.append(f"Needs {min_mem} GiB, GPU has {mem_gib:.0f} GiB")
        rate = gpu_rate(devs[0].name) if devs else None
        if rate and ceiling < rate * count:
            issues.append("Cost ceiling below this GPU's list price")
        return {"valid": not issues, "issues": issues, "capacity": capacity()["totals"],
                "estimated_cost_per_hour_usd": rate * count if rate else None,
                "cost_source": "list_price_estimate" if rate else "unknown"}

    async def body_json(req: Request) -> Any:
        try:
            return await req.json()
        except Exception:
            return None

    @api.post("/v1/intents/validate")
    async def validate(req: Request):
        b = await body_json(req)
        if not isinstance(b, dict):
            return _err(400, "invalid_json", "Body must be a JSON object")
        return validate_intent(b.get("intent") or {})

    @api.post("/v1/deployments/plan")
    async def plan(req: Request):
        b = await body_json(req)
        if not isinstance(b, dict):
            return _err(400, "invalid_json", "Body must be a JSON object")
        v = validate_intent(b.get("intent") or {})
        devs = devices_now()
        return {"projectId": b.get("projectId"), "feasible": v["valid"], "issues": v["issues"],
                "placement": {"node": node, "gpu": devs[0].name if devs else None, "devices": v["capacity"]["devices"]},
                "estimated_cost_per_hour_usd": v.get("estimated_cost_per_hour_usd"), "executed": False}

    def run_job(jid: str) -> None:
        j = jobs[jid]
        if j["status"] == "cancelled":
            return
        j["status"] = "running"
        busy["n"] += 1
        t0 = time.time()
        try:
            out = inference.chat(j["payload"], timeout=j["timeout"])
            if j["status"] == "cancelled":
                return
            dur = time.time() - t0
            devs = devices_now()
            rate = gpu_rate(devs[0].name) if devs else None
            j.update(status="succeeded", finished_at=time.time(), result=out,
                     metrics={"duration_s": round(dur, 3),
                              "gpu_cost_usd": round(rate * dur / 3600, 6) if rate else None})
        except Exception as e:
            j.update(status="failed", error=str(e)[:300])
        finally:
            busy["n"] -= 1

    @api.post("/v1/jobs")
    async def submit(req: Request):
        b = await body_json(req)
        if not isinstance(b, dict):
            return _err(400, "invalid_json", "Body must be a JSON object")
        if b.get("kind") != "inference_request":
            return _err(400, "unsupported_kind", "Only inference_request is supported")
        if not devices_now():
            return _err(501, "no_gpu", "No GPUs visible on this gateway; jobs cannot run here")
        if inference is None or not inference.configured():
            return _err(501, "inference_not_configured",
                        "No local model server is configured (start the 'inference' profile and set VLLM_URL)")
        try:
            timeout = max(5, min(600, int(b.get("timeout_seconds", 60))))
        except (TypeError, ValueError):
            timeout = 60
        jid = str(uuid.uuid4())
        jobs[jid] = {"job_id": jid, "status": "queued", "payload": b.get("payload") or {}, "timeout": timeout,
                     "created_at": time.time(), "placement": {"node": node, "model": inference.model},
                     "requested_by": req.headers.get("x-lightos-user-id")}
        threading.Thread(target=run_job, args=(jid,), daemon=True).start()
        return JSONResponse({k: jobs[jid][k] for k in ("job_id", "status", "placement")}, 202)

    @api.get("/v1/jobs/{jid}")
    def status(jid: str):
        j = jobs.get(jid)
        if not j:
            return _err(404, "not_found", "Unknown job")
        return {k: v for k, v in j.items() if k != "payload"}

    @api.delete("/v1/jobs/{jid}")
    def cancel(jid: str):
        j = jobs.get(jid)
        if not j:
            return _err(404, "not_found", "Unknown job")
        if j["status"] in ("queued", "running"):
            j["status"] = "cancelled"
        return {"job_id": jid, "status": j["status"]}

    @api.post("/v1/nodes/register")
    async def register(req: Request):
        b = await body_json(req)
        problem = _valid_report(b)
        if problem:
            return _err(400, "invalid_report", problem)
        registry.put(b["enrollment_id"], b["hostname"], req.headers.get("x-lightos-user-id"), b)
        events.append({"ts": time.time(), "type": "node_registered",
                       "enrollment_id": b["enrollment_id"], "hostname": b["hostname"]})
        return {"accepted": True, "enrollment_id": b["enrollment_id"], "registered_nodes": registry.count()}

    api.state.sampler = sampler
    api.state.registry = registry
    return api


def main_app() -> FastAPI:
    """uvicorn entrypoint: ``uvicorn lightos_gateway.app:main_app --factory``."""
    return create_app(load_token())
