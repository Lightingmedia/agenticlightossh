"""RDMA observability for the LightOS runtime gateway.

Two data sources, always kept apart:

1. Port counters (measured aggregates): read from the kernel's
   ``/sys/class/infiniband/<dev>/ports/<n>/counters``. Real on any host with RDMA NICs, but
   per-port totals only -- they cannot attribute traffic to a process, QP or operation.
2. Per-operation trace events (raw): accepted ONLY from a local tracer that posts batches to
   ``POST /v1/rdma/events``. LightOS does not ship that tracer. Without one, there are no
   per-operation events and the API says so instead of estimating them.

Rules: never infer or fill missing fields; never store payloads, memory keys, addresses or
credentials; derived aggregates are computed from stored raw events and labelled as such.
"""
from __future__ import annotations

import ctypes.util
import os
import re
import threading
import time
from collections import deque
from typing import Any, Callable, Deque, Dict, List, Optional, Tuple

SYSFS_IB = "/sys/class/infiniband"
EVENT_RING = 50_000
MAX_BATCH = 5_000
MAX_RETURN = 500
TRACER_ATTACHED_S = 120.0
COUNTER_INTERVAL_S = 5.0
COUNTER_RING_S = 3600

PROVIDERS = {"libibverbs", "mlx5dv"}
INITIATORS = {"cpu", "gpu"}
TRANSPORTS = {"RC", "UC", "UD", "DC", "XRC", "RAW_PACKET"}
DIRECTIONS = {"tx", "rx"}
SUCCESS = {"success", "IBV_WC_SUCCESS"}
PENDING = {"pending"}
# Keys that commonly carry payloads, memory keys, addresses or secrets. Always dropped.
SENSITIVE = {"payload", "data", "buf", "buffer", "addr", "remote_addr", "local_addr", "rkey", "lkey",
             "key", "token", "secret", "password", "sge", "sg_list", "imm_data", "cmdline", "env"}
_LABEL = re.compile(r"^[A-Za-z0-9_.:/@\- ]{1,128}$")
_OP = re.compile(r"^[A-Z][A-Z0-9_]{1,40}$")
_STATUS = re.compile(r"^[A-Za-z0-9_]{1,48}$")

FIELDS = ("ts", "host", "pid", "process", "rank", "gpu", "nic", "port", "provider", "transport",
          "initiator", "op", "direction", "bytes", "peer", "qpn", "status", "latency_us",
          "workload", "collective", "comm", "seq")
REQUIRED = ("ts", "op", "provider", "initiator")


def _label(v: Any, n: int = 128) -> Optional[str]:
    return v[:n] if isinstance(v, str) and _LABEL.match(v) else None


def _int(v: Any, lo: int = 0, hi: int = 2**63) -> Optional[int]:
    return v if isinstance(v, int) and not isinstance(v, bool) and lo <= v <= hi else None


def _float(v: Any, lo: float = 0.0, hi: float = 1e12) -> Optional[float]:
    if isinstance(v, bool) or not isinstance(v, (int, float)):
        return None
    f = float(v)
    return f if lo <= f <= hi and f == f else None


def normalize_event(raw: Any) -> Tuple[Optional[dict], int, int, Optional[str]]:
    """Return (event | None, dropped_field_count, sensitive_field_count, reject_reason).

    Unknown keys are dropped. Invalid optional values become None (and are counted) --
    they are never guessed. Events missing a required field are rejected.
    """
    if not isinstance(raw, dict):
        return None, 0, 0, "not_an_object"
    dropped = sum(1 for k in raw if k not in FIELDS and k != "ts_ns")
    sensitive = sum(1 for k in raw if str(k).lower() in SENSITIVE)
    ts = _float(raw.get("ts"), 1e9, 1e10)
    if ts is None and _int(raw.get("ts_ns"), 10**18, 10**19) is not None:
        ts = raw["ts_ns"] / 1e9
    ev = {
        "ts": ts,
        "host": _label(raw.get("host")),
        "pid": _int(raw.get("pid"), 0, 2**31),
        "process": _label(raw.get("process"), 64),
        "rank": _int(raw.get("rank"), 0, 2**20),
        "gpu": _label(raw.get("gpu"), 64),
        "nic": _label(raw.get("nic"), 64),
        "port": _int(raw.get("port"), 0, 255),
        "provider": raw.get("provider") if raw.get("provider") in PROVIDERS else None,
        "transport": raw.get("transport") if raw.get("transport") in TRANSPORTS else None,
        "initiator": raw.get("initiator") if raw.get("initiator") in INITIATORS else None,
        "op": raw.get("op") if isinstance(raw.get("op"), str) and _OP.match(raw["op"]) else None,
        "direction": raw.get("direction") if raw.get("direction") in DIRECTIONS else None,
        "bytes": _int(raw.get("bytes"), 0, 2**40),
        "peer": _label(raw.get("peer")),
        "qpn": _int(raw.get("qpn"), 0, 2**24 - 1),
        "status": raw.get("status") if isinstance(raw.get("status"), str) and _STATUS.match(raw["status"]) else None,
        "latency_us": _float(raw.get("latency_us"), 0.0, 3.6e9),
        "workload": _label(raw.get("workload")),
        "collective": _label(raw.get("collective"), 64),
        "comm": _label(raw.get("comm"), 64),
        "seq": _int(raw.get("seq")),
    }
    for k in REQUIRED:
        if ev[k] is None:
            return None, dropped, sensitive, f"missing_or_invalid_{k}"
    invalid = sum(1 for k in FIELDS if k in raw and raw[k] is not None and ev[k] is None)
    return ev, dropped + invalid, sensitive, None


def completion(status: Optional[str]) -> str:
    if status is None or status in PENDING:
        return "not_observed"
    return "success" if status in SUCCESS else "error"


def percentile(sorted_vals: List[float], p: float) -> float:
    """Nearest-rank percentile on an already sorted, non-empty list."""
    k = max(1, int(-(-p * len(sorted_vals) // 100)))  # ceil(p/100 * n)
    return round(sorted_vals[min(k, len(sorted_vals)) - 1], 3)


def aggregate(events: List[dict]) -> dict:
    """Derived aggregates over raw events. Every figure says how many events it used."""
    lat = sorted(e["latency_us"] for e in events if e["latency_us"] is not None)
    sized = [e["bytes"] for e in events if e["bytes"] is not None]
    comp = {"success": 0, "error": 0, "not_observed": 0}
    by: Dict[Tuple[str, str], dict] = {}
    for e in events:
        comp[completion(e["status"])] += 1
        g = by.setdefault((e["op"], e["initiator"]), {"op": e["op"], "initiator": e["initiator"], "count": 0,
                                                       "bytes": 0, "bytes_known": 0, "_lat": []})
        g["count"] += 1
        if e["bytes"] is not None:
            g["bytes"] += e["bytes"]
            g["bytes_known"] += 1
        if e["latency_us"] is not None:
            g["_lat"].append(e["latency_us"])
    groups = []
    for g in sorted(by.values(), key=lambda x: -x["count"]):
        ls = sorted(g.pop("_lat"))
        g["latency_samples"] = len(ls)
        g["latency_p50_us"] = percentile(ls, 50) if ls else None
        groups.append(g)
    return {
        "derived_from": "raw_trace_events",
        "events": len(events),
        "bytes": sum(sized) if sized else None,
        "bytes_known_events": len(sized),
        "latency_us": None if not lat else {
            "samples": len(lat), "method": "nearest_rank",
            "p50": percentile(lat, 50), "p95": percentile(lat, 95), "p99": percentile(lat, 99), "max": lat[-1],
        },
        "completions": comp,
        "by_op": groups,
        "first_ts": min((e["ts"] for e in events), default=None),
        "last_ts": max((e["ts"] for e in events), default=None),
    }


FILTER_KEYS = ("host", "gpu", "nic", "op", "workload", "initiator")


def filter_events(events: List[dict], now: float, window_seconds: int, filters: Dict[str, Optional[str]]) -> List[dict]:
    cutoff = now - window_seconds
    active = {k: v for k, v in filters.items() if k in FILTER_KEYS and v}
    return [e for e in events if e["ts"] >= cutoff and all(e.get(k) == v for k, v in active.items())]


def facets(events: List[dict]) -> Dict[str, List[str]]:
    out: Dict[str, List[str]] = {}
    for k in FILTER_KEYS:
        out[k] = sorted({e[k] for e in events if e.get(k) is not None})[:200]
    return out


class TraceStore:
    """Bounded raw-event ring plus per-tracer capture health."""

    def __init__(self, maxlen: int = EVENT_RING, clock: Callable[[], float] = time.time):
        self.events: Deque[dict] = deque(maxlen=maxlen)
        self.clock = clock
        self.lock = threading.Lock()
        self.next_id = 1
        self.gateway_dropped = 0  # evicted from the ring before being read
        self.tracers: Dict[str, dict] = {}

    def ingest(self, body: Any) -> Tuple[int, dict]:
        if not isinstance(body, dict):
            return 400, {"code": "invalid_json", "message": "Body must be a JSON object"}
        tr = body.get("tracer")
        name = _label(tr.get("name"), 64) if isinstance(tr, dict) else None
        if not name:
            return 400, {"code": "invalid_tracer", "message": "tracer.name is required"}
        events = body.get("events", [])
        if not isinstance(events, list) or len(events) > MAX_BATCH:
            return 400, {"code": "invalid_events", "message": f"events must be a list (max {MAX_BATCH})"}
        accepted, rejected, dropped_fields, sensitive = [], {}, 0, 0
        for raw in events:
            ev, d, s, why = normalize_event(raw)
            dropped_fields += d
            sensitive += s
            if why:
                rejected[why] = rejected.get(why, 0) + 1
            else:
                accepted.append(ev)
        now = self.clock()
        paths = tr.get("paths") if isinstance(tr.get("paths"), dict) else {}
        oh = tr.get("overhead") if isinstance(tr.get("overhead"), dict) else None
        overhead = None
        if oh and _float(oh.get("value_pct"), 0, 1000) is not None and _label(oh.get("method"), 128):
            overhead = {"value_pct": float(oh["value_pct"]), "method": oh["method"], "source": "tracer_reported"}
        with self.lock:
            for ev in accepted:
                if len(self.events) == self.events.maxlen:
                    self.gateway_dropped += 1
                ev["id"] = self.next_id
                ev["received_at"] = now
                self.next_id += 1
                self.events.append(ev)
            h = self.tracers.setdefault(name, {"name": name, "batches": 0, "events_accepted": 0, "events_rejected": 0,
                                               "fields_dropped": 0, "sensitive_fields_dropped": 0,
                                               "tracer_dropped": None, "rejections": {}})
            h.update(
                version=_label(tr.get("version"), 64),
                mode=tr.get("mode") if tr.get("mode") in ("full", "sampled") else None,
                sample_rate=_float(tr.get("sample_rate"), 0.0, 1.0),
                paths={k: paths.get(k) is True for k in ("cpu_verbs", "cpu_mlx5dv", "gpu_initiated")},
                overhead=overhead,
                last_seen=now,
            )
            h["batches"] += 1
            h["events_accepted"] += len(accepted)
            h["events_rejected"] += sum(rejected.values())
            h["fields_dropped"] += dropped_fields
            h["sensitive_fields_dropped"] += sensitive
            for k, v in rejected.items():
                h["rejections"][k] = h["rejections"].get(k, 0) + v
            td = _int(body.get("dropped"))
            if td is not None:
                h["tracer_dropped"] = (h["tracer_dropped"] or 0) + td
        return 202, {"accepted": len(accepted), "rejected": sum(rejected.values()), "rejections": rejected,
                     "fields_dropped": dropped_fields, "sensitive_fields_dropped": sensitive}

    def snapshot(self) -> List[dict]:
        with self.lock:
            return list(self.events)

    def health(self) -> dict:
        now = self.clock()
        with self.lock:
            tracers = [dict(t, attached=now - t["last_seen"] <= TRACER_ATTACHED_S,
                            seconds_since_seen=round(now - t["last_seen"], 1)) for t in self.tracers.values()]
            return {"tracers": tracers, "attached": any(t["attached"] for t in tracers),
                    "ring_capacity": self.events.maxlen, "ring_size": len(self.events),
                    "gateway_dropped": self.gateway_dropped}


# ---------- kernel port counters ----------

COUNTERS = ("port_xmit_data", "port_rcv_data", "port_xmit_packets", "port_rcv_packets",
            "port_xmit_discards", "port_rcv_errors", "symbol_error", "link_downed")
HW_COUNTERS = ("out_of_sequence", "packet_seq_err", "local_ack_timeout_err", "rnr_nak_retry_err",
               "np_cnp_sent", "rp_cnp_handled")


def _read(path: str) -> Optional[str]:
    try:
        with open(path) as f:
            return f.read().strip()
    except OSError:
        return None


def _read_int(path: str) -> Optional[int]:
    v = _read(path)
    try:
        return int(v) if v is not None else None
    except ValueError:
        return None


def read_ports(root: str = SYSFS_IB) -> List[dict]:
    out = []
    try:
        devs = sorted(os.listdir(root))
    except OSError:
        return out
    for dev in devs:
        pdir = os.path.join(root, dev, "ports")
        try:
            ports = sorted(os.listdir(pdir), key=lambda p: int(p) if p.isdigit() else 0)
        except OSError:
            continue
        for p in ports:
            base = os.path.join(pdir, p)
            c = {k: _read_int(os.path.join(base, "counters", k)) for k in COUNTERS}
            hw = {k: _read_int(os.path.join(base, "hw_counters", k)) for k in HW_COUNTERS}
            out.append({"device": dev, "port": int(p) if p.isdigit() else p,
                        "state": _read(os.path.join(base, "state")), "rate": _read(os.path.join(base, "rate")),
                        "link_layer": _read(os.path.join(base, "link_layer")),
                        "counters": c, "hw_counters": {k: v for k, v in hw.items() if v is not None}})
    return out


class CounterSampler:
    def __init__(self, root: str = SYSFS_IB, interval: float = COUNTER_INTERVAL_S, clock=time.time):
        self.root, self.interval, self.clock = root, interval, clock
        self.buf: Deque[Tuple[float, List[dict]]] = deque(maxlen=int(COUNTER_RING_S / interval))
        self._stop = threading.Event()

    def tick(self) -> None:
        try:
            self.buf.append((self.clock(), read_ports(self.root)))
        except Exception:
            pass

    def start(self) -> None:
        self.tick()
        threading.Thread(target=self._run, daemon=True).start()

    def _run(self) -> None:
        while not self._stop.wait(self.interval):
            self.tick()

    def window(self, seconds: int) -> dict:
        snaps = [s for s in self.buf if s[0] >= self.clock() - seconds]
        latest = self.buf[-1][1] if self.buf else []
        body = {"source": "sysfs" if latest else "unavailable", "path": self.root, "window_seconds": seconds,
                "samples": len(snaps), "interval_seconds": self.interval, "ports": []}
        if not latest:
            body["reason"] = "no_rdma_devices_visible"
            return body
        first = snaps[0] if len(snaps) >= 2 else None
        last = snaps[-1] if len(snaps) >= 2 else None
        before = {(p["device"], p["port"]): p for p in (first[1] if first else [])}
        dt = (last[0] - first[0]) if first and last else 0
        for p in latest:
            row = {k: p[k] for k in ("device", "port", "state", "rate", "link_layer")}
            row["measured_seconds"] = round(dt, 1) if dt > 0 else None
            prev = before.get((p["device"], p["port"]))
            rates, deltas = {}, {}
            for k in COUNTERS:
                a = prev["counters"].get(k) if prev else None
                b = p["counters"].get(k)
                d = b - a if a is not None and b is not None and dt > 0 else None
                d = d if d is not None and d >= 0 else None  # counter reset/wrap -> unknown, not zero
                deltas[k] = d
            # port_xmit_data / port_rcv_data count 4-octet words (IBTA spec).
            rates["tx_bytes_per_s"] = round(deltas["port_xmit_data"] * 4 / dt, 1) if deltas["port_xmit_data"] is not None else None
            rates["rx_bytes_per_s"] = round(deltas["port_rcv_data"] * 4 / dt, 1) if deltas["port_rcv_data"] is not None else None
            rates["tx_packets_per_s"] = round(deltas["port_xmit_packets"] / dt, 1) if deltas["port_xmit_packets"] is not None else None
            rates["rx_packets_per_s"] = round(deltas["port_rcv_packets"] / dt, 1) if deltas["port_rcv_packets"] is not None else None
            row["rates"] = rates
            row["error_deltas"] = {k: deltas[k] for k in ("port_xmit_discards", "port_rcv_errors", "symbol_error", "link_downed")}
            row["hw_counters"] = p["hw_counters"]
            if dt <= 0:
                row["reason"] = "needs_two_samples"
            out_rows = body["ports"]
            out_rows.append(row)
        return body


# ---------- path support ----------

def capabilities(ports: List[dict], health: dict, find_library=ctypes.util.find_library,
                 module_root: str = "/sys/module") -> dict:
    devices = sorted({p["device"] for p in ports})
    attached = [t for t in health["tracers"] if t["attached"]]

    def declared(path: str) -> Optional[str]:
        names = [t["name"] for t in attached if t["paths"].get(path)]
        return ", ".join(names) if names else None

    ibverbs = find_library("ibverbs") is not None
    mlx5 = find_library("mlx5") is not None
    peermem = os.path.isdir(os.path.join(module_root, "nvidia_peermem"))
    no_tracer = ("No per-operation tracer is attached. libibverbs dispatches ibv_post_send/ibv_poll_cq "
                 "through inline provider calls, so they cannot be intercepted by library preloading; "
                 "a provider-level probe is required and LightOS does not ship one yet.")

    def cpu_path(key: str, needs: bool, need_reason: str) -> dict:
        by = declared(key)
        if by:
            return {"status": "observed", "source": f"tracer:{by}"}
        if not devices:
            return {"status": "unavailable", "gap": "No RDMA devices are visible to the gateway (/sys/class/infiniband is empty)."}
        if not needs:
            return {"status": "unavailable", "gap": need_reason}
        return {"status": "unavailable", "gap": no_tracer}

    gpu_by = declared("gpu_initiated")
    return {
        "devices": devices,
        "libraries": {"libibverbs": ibverbs, "libmlx5": mlx5, "source": "dynamic_linker_lookup_in_gateway_container"},
        "kernel": {"nvidia_peermem_loaded": peermem, "source": "/sys/module",
                   "note": "GPUDirect RDMA kernel support only; this does not observe any traffic."},
        "paths": {
            "cpu_verbs": cpu_path("cpu_verbs", ibverbs, "libibverbs was not found in the gateway environment."),
            "cpu_mlx5dv": cpu_path("cpu_mlx5dv", mlx5 and any(d.startswith("mlx5") for d in devices),
                                   "No mlx5 device or libmlx5 provider visible to the gateway."),
            "gpu_initiated": {"status": "observed", "source": f"tracer:{gpu_by}"} if gpu_by else {
                "status": "unsupported",
                "gap": ("GPU-initiated (GPUDirect Async / IBGDA) work requests are rung from GPU kernels straight "
                        "to NIC doorbells and never pass through host CPU code. LightOS has no device-side "
                        "instrumentation, so this path cannot be observed."),
            },
        },
    }
