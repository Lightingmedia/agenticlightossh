import { describe, expect, it } from "vitest";
import { buildRdmaRequest, completionOf, formatBytes, parseEvent, parseRdmaResponse } from "@/lib/rdma/model";

const event = { id: 1, ts: 1_800_000_000, op: "RDMA_WRITE", provider: "libibverbs", initiator: "cpu", bytes: 4096, latency_us: 9.5, status: "success" };
const ready = {
  configured: true,
  observed_at: "2026-11-07T18:00:00Z",
  overview: {
    node: "node-a", window_seconds: 300,
    capabilities: { devices: [], libraries: { libibverbs: false, libmlx5: false }, kernel: { nvidia_peermem_loaded: false },
      paths: { cpu_verbs: { status: "unavailable", gap: "No tracer" }, cpu_mlx5dv: { status: "unavailable", gap: "x" }, gpu_initiated: { status: "unsupported", gap: "y" } } },
    capture_health: { attached: false, tracers: [], gateway_dropped: 0, ring_size: 0, ring_capacity: 50000 },
    port_counters: { source: "unavailable", reason: "no_rdma_devices_visible", ports: [] },
    summary: { events: 0, bytes: null, bytes_known_events: 0, latency_us: null, completions: { success: 0, error: 0, not_observed: 0 }, by_op: [] },
  },
  events: { source: "none", matched: 0, returned: 0, truncated: false, events: [], facets: {} },
};

describe("parseRdmaResponse states", () => {
  it("not connected when the account has no GPU host", () => {
    expect(parseRdmaResponse({ configured: false })).toEqual({ kind: "not_connected" });
  });
  it("plan_required for Free accounts", () => {
    expect(parseRdmaResponse({ configured: true, cause: "plan_required", error: "Free supports one GPU" }).kind).toBe("plan_required");
  });
  it("error passes through the server message", () => {
    expect(parseRdmaResponse({ configured: true, cause: "unreachable", error: "Could not reach" })).toEqual({ kind: "error", message: "Could not reach" });
  });
  it("incomplete gateway response is an error, not an empty success", () => {
    expect(parseRdmaResponse({ configured: true, overview: {} }).kind).toBe("error");
  });
  it("empty gateway: zero events, null latency and bytes, unsupported GPU path", () => {
    const s = parseRdmaResponse(ready);
    if (s.kind !== "ready") throw new Error(s.kind);
    expect(s.view.events).toEqual([]);
    expect(s.view.summary.latency).toBeNull();
    expect(s.view.summary.bytes).toBeNull();
    expect(s.view.paths.gpu_initiated.status).toBe("unsupported");
    expect(s.view.ports.source).toBe("unavailable");
  });
  it("unknown path status is treated as unavailable with a gap", () => {
    const raw = structuredClone(ready);
    (raw.overview.capabilities.paths as Record<string, unknown>).cpu_verbs = { status: "magic" };
    const s = parseRdmaResponse(raw);
    if (s.kind !== "ready") throw new Error(s.kind);
    expect(s.view.paths.cpu_verbs.status).toBe("unavailable");
    expect(s.view.paths.cpu_verbs.gap).toBeTruthy();
  });
});

describe("parseEvent", () => {
  it("keeps missing optional fields null", () => {
    const e = parseEvent(event)!;
    expect(e.host).toBeNull();
    expect(e.gpu).toBeNull();
    expect(e.qpn).toBeNull();
    expect(e.peer).toBeNull();
  });
  it("drops events missing required fields", () => {
    expect(parseEvent({ ...event, op: undefined })).toBeNull();
    expect(parseEvent({ ...event, initiator: "nic" })).toBeNull();
    expect(parseEvent({ ...event, ts: "now" })).toBeNull();
  });
  it("ignores non-numeric latency instead of coercing it", () => {
    expect(parseEvent({ ...event, latency_us: "12" })!.latency_us).toBeNull();
  });
});

describe("request building and formatting", () => {
  it("omits blank filters and clamps window and limit", () => {
    expect(buildRdmaRequest(10, { host: " node-a ", gpu: "", op: undefined }, 9999)).toEqual({ window_seconds: 60, limit: 500, filters: { host: "node-a" } });
    expect(buildRdmaRequest(99999, {}).window_seconds).toBe(3600);
  });
  it("completion classification", () => {
    expect(completionOf(null)).toBe("not_observed");
    expect(completionOf("pending")).toBe("not_observed");
    expect(completionOf("IBV_WC_SUCCESS")).toBe("success");
    expect(completionOf("IBV_WC_RETRY_EXC_ERR")).toBe("error");
  });
  it("bytes", () => {
    expect(formatBytes(null)).toBe("—");
    expect(formatBytes(1048576)).toBe("1.0 MiB");
  });
});
