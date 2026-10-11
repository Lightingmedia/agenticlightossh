"""Gateway tests: no network, no GPU. Run: cd gateway && pytest -q"""
import os
import sys
import types

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from lightos_gateway.app import create_app, load_token  # noqa: E402
from lightos_gateway.telemetry import (  # noqa: E402
    DcgmExporterProvider, NoGpuProvider, NvmlProvider, Sampler, parse_prometheus,
)

TOKEN = "a" * 64
AUTH = {"Authorization": f"Bearer {TOKEN}"}


class FakeNvml:
    """Minimal pynvml stand-in."""

    NVML_TEMPERATURE_GPU = 0

    def __init__(self, gpus):
        self.gpus = gpus  # list of dicts

    def nvmlInit(self): pass
    def nvmlDeviceGetCount(self): return len(self.gpus)
    def nvmlDeviceGetHandleByIndex(self, i): return self.gpus[i]
    def nvmlDeviceGetUUID(self, h): return h["uuid"]
    def nvmlDeviceGetName(self, h): return h["name"].encode()
    def nvmlDeviceGetMemoryInfo(self, h): return types.SimpleNamespace(used=h["used"] * 1048576, total=24576 * 1048576)
    def nvmlDeviceGetUtilizationRates(self, h): return types.SimpleNamespace(gpu=h["util"])
    def nvmlDeviceGetPowerUsage(self, h): return h["power_mw"]
    def nvmlDeviceGetTemperature(self, h, _): return 55
    def nvmlDeviceGetComputeRunningProcesses(self, h): return [1] if h.get("proc") else []
    def nvmlSystemGetDriverVersion(self): return "550.54"
    def nvmlSystemGetCudaDriverVersion(self): return 12040


def gpu(uuid, util, proc=False):
    return {"uuid": uuid, "name": "NVIDIA L4", "util": util, "power_mw": 72000, "used": 1024, "proc": proc}


def client(provider, **kw):
    app = create_app(TOKEN, provider, db_path=":memory:", node_name="brev-test", start_sampler=False, **kw)
    return TestClient(app), app


# ---- auth ----

def test_load_token_rejects_missing_and_short():
    with pytest.raises(SystemExit):
        load_token({})
    with pytest.raises(SystemExit):
        load_token({"LIGHTOS_GATEWAY_TOKEN": "short"})
    assert load_token({"LIGHTOS_GATEWAY_TOKEN": TOKEN}) == TOKEN


def test_auth_required_and_token_not_echoed():
    c, _ = client(NvmlProvider(FakeNvml([gpu("GPU-1", 0)])))
    for h in ({}, {"Authorization": "Bearer wrong"}, {"Authorization": TOKEN}):
        r = c.get("/v1/fabric/capacity", headers=h)
        assert r.status_code == 401
        assert r.json()["code"] == "unauthorized"
        assert TOKEN not in r.text
    assert c.get("/v1/fabric/capacity", headers=AUTH).status_code == 200


def test_healthz_is_public_and_minimal():
    c, _ = client(NvmlProvider(FakeNvml([gpu("GPU-1", 0)])))
    r = c.get("/healthz")
    assert r.status_code == 200
    assert r.json() == {"status": "ok", "gpu_count": 1, "source": "nvml"}


# ---- shapes ----

def test_capacity_and_telemetry_shapes():
    nv = FakeNvml([gpu("GPU-1", 80), gpu("GPU-2", 0), gpu("GPU-3", 1, proc=True)])
    c, _ = client(NvmlProvider(nv))
    cap = c.get("/v1/fabric/capacity?runtime=cuda", headers=AUTH).json()
    assert cap["totals"] == {"devices": 3, "allocated": 2, "free": 1}
    assert cap["collector"] == "nvml"
    assert cap["runtimes"]["cuda"]["cuda_version"] == "12.4"

    t = c.get("/v1/fabric/telemetry?window_seconds=60", headers=AUTH).json()
    assert set(t["cluster"]) >= {"gpu_util_pct_avg", "power_w_sum", "gpus_reporting"}
    assert t["cluster"]["gpus_reporting"] == 3
    assert t["cluster"]["power_w_sum"] == 216.0
    d = t["devices"][0]
    for key, sub in (("gpu_util_pct", "avg"), ("power_w", "avg"), ("fb_used_mib", "max"), ("gpu_temp_c", "max")):
        assert sub in d[key]
    assert d["uuid"] == "GPU-1" and d["node"].startswith("brev-test")


def test_window_average_moves_with_load():
    nv = FakeNvml([gpu("GPU-1", 0)])
    now = [1000.0]
    s = Sampler(NvmlProvider(nv), clock=lambda: now[0])
    c, _ = client(s.provider, sampler=s)
    for u in (0, 100, 100, 100):
        now[0] += 5
        nv.gpus[0]["util"] = u
        s.tick()
    t = c.get("/v1/fabric/telemetry?window_seconds=10", headers=AUTH).json()
    assert t["devices"][0]["gpu_util_pct"]["avg"] == 100.0


def test_ring_buffer_is_one_hour():
    s = Sampler(NoGpuProvider("x"))
    assert s.buf.maxlen == 720


# ---- no GPU ----

def test_no_gpu_reports_zero_with_reason():
    c, _ = client(NoGpuProvider("nvml_unavailable"))
    cap = c.get("/v1/fabric/capacity?runtime=cuda", headers=AUTH).json()
    assert cap["totals"] == {"devices": 0, "allocated": 0, "free": 0}
    assert cap["reason"] == "nvml_unavailable"
    t = c.get("/v1/fabric/telemetry", headers=AUTH).json()
    assert t["devices"] == [] and t["cluster"]["gpu_util_pct_avg"] is None and t["reason"] == "nvml_unavailable"
    j = c.post("/v1/jobs", headers=AUTH, json={"kind": "inference_request", "payload": {}})
    assert j.status_code == 501


def test_nvml_with_zero_devices():
    c, _ = client(NvmlProvider(FakeNvml([])))
    cap = c.get("/v1/fabric/capacity", headers=AUTH).json()
    assert cap["totals"]["devices"] == 0 and cap["reason"] == "no_gpu_visible"


# ---- jobs / register ----

def test_jobs_501_without_model_server():
    c, _ = client(NvmlProvider(FakeNvml([gpu("GPU-1", 0)])))
    r = c.post("/v1/jobs", headers=AUTH, json={"kind": "inference_request", "payload": {"messages": []}})
    assert r.status_code == 501 and r.json()["code"] == "inference_not_configured"


def test_register_accepts_lightos_cuda_report():
    c, app = client(NvmlProvider(FakeNvml([gpu("GPU-1", 0)])))
    report = {
        "enrollment_id": "0b7f6f2e-2c1e-4a53-9c38-111111111111", "hostname": "brev-1", "os": "Ubuntu 22.04",
        "driver": {"present": True, "version": "550.54"}, "nvcc": {"present": True, "version": "12.4"},
        "cudart": {"present": True, "version": "12.4"},
        "gpus": [{"index": 0, "name": "NVIDIA L4", "uuid": "GPU-1", "memory_total_mib": 23034, "compute_capability": "8.9"}],
    }
    r = c.post("/v1/nodes/register", headers=AUTH, json=report)
    assert r.status_code == 200 and r.json()["accepted"] is True
    assert app.state.registry.count() == 1
    bad = c.post("/v1/nodes/register", headers=AUTH, json={"hostname": "x"})
    assert bad.status_code == 400


# ---- DCGM ----

DCGM_TEXT = """# HELP DCGM_FI_DEV_GPU_UTIL GPU utilization
DCGM_FI_DEV_GPU_UTIL{gpu="0",UUID="GPU-1",modelName="NVIDIA L4",Hostname="h"} 42
DCGM_FI_DEV_POWER_USAGE{gpu="0",UUID="GPU-1",modelName="NVIDIA L4"} 61.5
DCGM_FI_DEV_FB_USED{gpu="0",UUID="GPU-1",modelName="NVIDIA L4"} 2048
DCGM_FI_DEV_FB_FREE{gpu="0",UUID="GPU-1",modelName="NVIDIA L4"} 20000
DCGM_FI_DEV_GPU_TEMP{gpu="0",UUID="GPU-1",modelName="NVIDIA L4"} 60
"""


def test_dcgm_provider_parses_exporter():
    assert len(parse_prometheus(DCGM_TEXT)) == 5
    p = DcgmExporterProvider("http://x/metrics", fetch=lambda _u: DCGM_TEXT)
    c, _ = client(p)
    t = c.get("/v1/fabric/telemetry", headers=AUTH).json()
    assert t["collector"] == "dcgm"
    assert t["devices"][0]["gpu_util_pct"]["avg"] == 42.0
    assert c.get("/healthz").json()["source"] == "dcgm"
