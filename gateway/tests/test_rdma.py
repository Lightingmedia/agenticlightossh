"""RDMA observability tests: ingestion, missing/unsupported fields, aggregation, filtering,
empty states and port counters. No network, no RDMA hardware. Run: cd gateway && pytest -q"""
import os
import sys

from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from lightos_gateway import rdma  # noqa: E402
from lightos_gateway.app import create_app  # noqa: E402
from lightos_gateway.telemetry import NoGpuProvider  # noqa: E402

TOKEN = "b" * 64
AUTH = {"Authorization": f"Bearer {TOKEN}"}
NOW = 1_800_000_000.0


class Clock:
    def __init__(self, t=NOW):
        self.t = t

    def __call__(self):
        return self.t


def make(tmp_path, clock=None, libs=("ibverbs", "mlx5"), sysfs=None):
    clock = clock or Clock()
    store = rdma.TraceStore(clock=clock)
    counters = rdma.CounterSampler(str(sysfs or tmp_path / "noib"), clock=clock)
    app = create_app(TOKEN, NoGpuProvider("x"), db_path=":memory:", node_name="n1", start_sampler=False,
                     trace_store=store, counter_sampler=counters,
                     find_library=lambda n: f"lib{n}.so" if n in libs else None,
                     module_root=str(tmp_path / "mod"))
    return TestClient(app), store, counters, clock


def ev(**kw):
    base = {"ts": NOW - 10, "host": "node-a", "pid": 4242, "rank": 0, "gpu": "GPU-0", "nic": "mlx5_0",
            "provider": "libibverbs", "transport": "RC", "initiator": "cpu", "op": "RDMA_WRITE",
            "direction": "tx", "bytes": 1048576, "peer": "node-b", "qpn": 77, "status": "success",
            "latency_us": 12.5, "workload": "nccl-allreduce", "collective": "AllReduce"}
    base.update(kw)
    return base


def post(c, events, **tracer):
    t = {"name": "test-tracer", "version": "0.1", "mode": "full",
         "paths": {"cpu_verbs": True}}
    t.update(tracer)
    return c.post("/v1/rdma/events", headers=AUTH, json={"tracer": t, "events": events})


# ---- auth ----

def test_rdma_endpoints_require_token(tmp_path):
    c, *_ = make(tmp_path)
    assert c.get("/v1/rdma/overview").status_code == 401
    assert c.post("/v1/rdma/events", json={}).status_code == 401


# ---- ingestion ----

def test_ingest_accepts_and_strips_sensitive_fields(tmp_path):
    c, store, *_ = make(tmp_path)
    r = post(c, [ev(payload="secret-bytes", rkey=123, lkey=9, remote_addr="0xdead", token="t")])
    assert r.status_code == 202
    body = r.json()
    assert body["accepted"] == 1 and body["sensitive_fields_dropped"] == 5
    stored = store.snapshot()[0]
    for k in ("payload", "rkey", "lkey", "remote_addr", "token"):
        assert k not in stored
    assert "secret-bytes" not in c.get("/v1/rdma/events", headers=AUTH).text


def test_missing_required_field_rejects_event(tmp_path):
    c, store, *_ = make(tmp_path)
    no_op = ev()
    del no_op["op"]
    r = post(c, [no_op, ev(provider="efa"), ev(initiator="nic"), ev(ts="yesterday"), ev()]).json()
    assert r["accepted"] == 1 and r["rejected"] == 4
    assert r["rejections"] == {"missing_or_invalid_op": 1, "missing_or_invalid_provider": 1,
                               "missing_or_invalid_initiator": 1, "missing_or_invalid_ts": 1}
    assert len(store.snapshot()) == 1


def test_missing_optional_fields_stay_null_not_inferred(tmp_path):
    c, store, *_ = make(tmp_path)
    post(c, [{"ts": NOW - 1, "op": "SEND", "provider": "mlx5dv", "initiator": "cpu",
              "bytes": -5, "transport": "QUIC", "latency_us": "fast"}])
    e = store.snapshot()[0]
    for k in ("host", "gpu", "nic", "peer", "qpn", "status", "workload", "collective", "rank"):
        assert e[k] is None
    assert e["bytes"] is None and e["transport"] is None and e["latency_us"] is None


def test_ts_ns_accepted(tmp_path):
    c, store, *_ = make(tmp_path)
    x = ev()
    del x["ts"]
    x["ts_ns"] = int((NOW - 2) * 1e9)
    assert post(c, [x]).json()["accepted"] == 1
    assert abs(store.snapshot()[0]["ts"] - (NOW - 2)) < 1e-3


def test_bad_batches_rejected(tmp_path):
    c, *_ = make(tmp_path)
    assert c.post("/v1/rdma/events", headers=AUTH, json={"events": []}).status_code == 400
    assert c.post("/v1/rdma/events", headers=AUTH, json={"tracer": {"name": "t"}, "events": "x"}).status_code == 400
    big = [ev()] * (rdma.MAX_BATCH + 1)
    assert post(c, big).status_code == 400


def test_ring_overflow_counts_gateway_drops():
    clock = Clock()
    store = rdma.TraceStore(maxlen=3, clock=clock)
    store.ingest({"tracer": {"name": "t"}, "events": [ev(seq=i) for i in range(5)]})
    assert store.health()["gateway_dropped"] == 2
    assert [e["seq"] for e in store.snapshot()] == [2, 3, 4]


def test_capture_health_tracks_tracer_drops_sampling_and_overhead(tmp_path):
    c, store, _, clock = make(tmp_path)
    c.post("/v1/rdma/events", headers=AUTH, json={
        "tracer": {"name": "t", "mode": "sampled", "sample_rate": 0.1,
                   "overhead": {"value_pct": 1.7, "method": "A/B nccl-tests busbw"}},
        "dropped": 40, "events": [ev()]})
    c.post("/v1/rdma/events", headers=AUTH, json={"tracer": {"name": "t"}, "dropped": 2, "events": []})
    h = store.health()["tracers"][0]
    assert h["tracer_dropped"] == 42 and h["batches"] == 2 and h["attached"] is True
    # The second heartbeat did not report sampling or overhead: they are now unknown, not carried over.
    assert h["mode"] is None and h["sample_rate"] is None and h["overhead"] is None
    clock.t += rdma.TRACER_ATTACHED_S + 1
    assert store.health()["attached"] is False


# ---- aggregation ----

def test_aggregate_uses_only_known_values():
    events = [rdma.normalize_event(ev(latency_us=v, bytes=b, status=s))[0]
              for v, b, s in [(10, 100, "success"), (20, None, "IBV_WC_RETRY_EXC_ERR"),
                              (None, 300, None), (40, 400, "pending")]]
    a = rdma.aggregate(events)
    assert a["events"] == 4
    assert a["bytes"] == 800 and a["bytes_known_events"] == 3
    assert a["latency_us"]["samples"] == 3
    assert a["latency_us"]["p50"] == 20 and a["latency_us"]["p99"] == 40 and a["latency_us"]["max"] == 40
    assert a["completions"] == {"success": 1, "error": 1, "not_observed": 2}
    assert a["derived_from"] == "raw_trace_events"


def test_aggregate_empty_is_null_not_zero():
    a = rdma.aggregate([])
    assert a["events"] == 0 and a["bytes"] is None and a["latency_us"] is None


def test_percentile_nearest_rank():
    vals = sorted(float(i) for i in range(1, 101))
    assert rdma.percentile(vals, 50) == 50 and rdma.percentile(vals, 95) == 95 and rdma.percentile(vals, 99) == 99
    assert rdma.percentile([7.0], 99) == 7.0


# ---- filtering ----

def test_filters_by_window_host_device_op_workload(tmp_path):
    c, *_ = make(tmp_path)
    post(c, [ev(), ev(host="node-b"), ev(op="RDMA_READ"), ev(gpu="GPU-1"), ev(nic="mlx5_1"),
             ev(workload="fsdp-7b"), ev(ts=NOW - 4000)])
    q = lambda s: c.get(f"/v1/rdma/events?window_seconds=3600&{s}", headers=AUTH).json()
    assert q("")["matched"] == 6  # the 4000 s-old event is outside the window
    assert q("host=node-b")["matched"] == 1
    assert q("op=RDMA_READ")["matched"] == 1
    assert q("gpu=GPU-1")["matched"] == 1
    assert q("nic=mlx5_1")["matched"] == 1
    assert q("workload=fsdp-7b")["matched"] == 1
    assert q("host=node-a&op=RDMA_WRITE&gpu=GPU-0&nic=mlx5_0&workload=nccl-allreduce")["matched"] == 1
    assert set(q("")["facets"]["host"]) == {"node-a", "node-b"}
    ov = c.get("/v1/rdma/overview?window_seconds=3600&host=node-b", headers=AUTH).json()
    assert ov["summary"]["events"] == 1 and ov["filters"] == {"host": "node-b"}


def test_events_newest_first_and_limited(tmp_path):
    c, *_ = make(tmp_path)
    post(c, [ev(ts=NOW - i, seq=i) for i in range(10)])
    r = c.get("/v1/rdma/events?limit=3", headers=AUTH).json()
    assert [e["seq"] for e in r["events"]] == [0, 1, 2]
    assert r["truncated"] is True and r["returned"] == 3 and r["matched"] == 10


# ---- empty / unsupported states ----

def test_no_tracer_no_devices_reports_gaps_not_numbers(tmp_path):
    c, *_ = make(tmp_path, libs=())
    ov = c.get("/v1/rdma/overview", headers=AUTH).json()
    assert ov["summary"]["events"] == 0 and ov["summary"]["latency_us"] is None
    assert ov["capture_health"]["attached"] is False and ov["capture_health"]["tracers"] == []
    assert ov["port_counters"]["source"] == "unavailable"
    assert ov["port_counters"]["reason"] == "no_rdma_devices_visible"
    p = ov["capabilities"]["paths"]
    assert p["cpu_verbs"]["status"] == "unavailable" and "gap" in p["cpu_verbs"]
    assert p["gpu_initiated"]["status"] == "unsupported"
    ev_ = c.get("/v1/rdma/events", headers=AUTH).json()
    assert ev_["source"] == "none" and ev_["events"] == []


def test_paths_observed_only_when_attached_tracer_declares_them(tmp_path):
    sysfs = tmp_path / "ib"
    write_port(sysfs, "mlx5_0", 1, xmit=0, rcv=0)
    c, *_ = make(tmp_path, sysfs=sysfs)
    p = c.get("/v1/rdma/overview", headers=AUTH).json()["capabilities"]["paths"]
    assert p["cpu_verbs"]["status"] == "unavailable" and "tracer" in p["cpu_verbs"]["gap"]
    post(c, [], paths={"cpu_verbs": True, "cpu_mlx5dv": False})
    p = c.get("/v1/rdma/overview", headers=AUTH).json()["capabilities"]["paths"]
    assert p["cpu_verbs"] == {"status": "observed", "source": "tracer:test-tracer"}
    assert p["cpu_mlx5dv"]["status"] == "unavailable"
    assert p["gpu_initiated"]["status"] == "unsupported"


# ---- port counters ----

def write_port(root, dev, port, xmit, rcv, state="4: ACTIVE"):
    base = root / dev / "ports" / str(port)
    (base / "counters").mkdir(parents=True, exist_ok=True)
    (base / "state").write_text(state)
    (base / "rate").write_text("400 Gb/sec (4X NDR)")
    (base / "link_layer").write_text("InfiniBand")
    for k, v in {"port_xmit_data": xmit, "port_rcv_data": rcv, "port_xmit_packets": 10, "port_rcv_packets": 10}.items():
        (base / "counters" / k).write_text(str(v))


def test_port_counter_rates_from_two_samples(tmp_path):
    root = tmp_path / "ib"
    clock = Clock()
    write_port(root, "mlx5_0", 1, xmit=1000, rcv=0)
    s = rdma.CounterSampler(str(root), clock=clock)
    s.tick()
    one = s.window(300)
    assert one["source"] == "sysfs" and one["ports"][0]["rates"]["tx_bytes_per_s"] is None
    assert one["ports"][0]["reason"] == "needs_two_samples"
    clock.t += 10
    write_port(root, "mlx5_0", 1, xmit=3500, rcv=250)
    s.tick()
    w = s.window(300)
    port = w["ports"][0]
    assert port["measured_seconds"] == 10
    assert port["rates"]["tx_bytes_per_s"] == 1000.0  # (3500-1000) words * 4 B / 10 s
    assert port["rates"]["rx_bytes_per_s"] == 100.0
    assert port["state"] == "4: ACTIVE" and port["link_layer"] == "InfiniBand"


def test_counter_reset_is_unknown_not_zero(tmp_path):
    root = tmp_path / "ib"
    clock = Clock()
    write_port(root, "mlx5_0", 1, xmit=5000, rcv=5000)
    s = rdma.CounterSampler(str(root), clock=clock)
    s.tick()
    clock.t += 5
    write_port(root, "mlx5_0", 1, xmit=10, rcv=6000)
    s.tick()
    r = s.window(300)["ports"][0]["rates"]
    assert r["tx_bytes_per_s"] is None and r["rx_bytes_per_s"] == 800.0
