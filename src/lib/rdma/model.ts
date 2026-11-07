// RDMA observability view model. Parses the rdma-telemetry response defensively:
// missing or malformed values become null and are shown as "—", never estimated.

export type PathStatus = "observed" | "unavailable" | "unsupported";

export interface RdmaEvent {
  id: number;
  ts: number;
  host: string | null; pid: number | null; process: string | null; rank: number | null;
  gpu: string | null; nic: string | null; port: number | null;
  provider: string; transport: string | null; initiator: "cpu" | "gpu";
  op: string; direction: string | null; bytes: number | null; peer: string | null; qpn: number | null;
  status: string | null; latency_us: number | null;
  workload: string | null; collective: string | null; comm: string | null; seq: number | null;
}

export interface PathSupport { status: PathStatus; source?: string; gap?: string }

export interface TracerHealth {
  name: string; version: string | null; mode: "full" | "sampled" | null; sample_rate: number | null;
  attached: boolean; seconds_since_seen: number | null; batches: number;
  events_accepted: number; events_rejected: number; tracer_dropped: number | null;
  fields_dropped: number; sensitive_fields_dropped: number;
  overhead: { value_pct: number; method: string } | null;
  paths: Record<string, boolean>;
}

export interface PortRow {
  device: string; port: string; state: string | null; rate: string | null; link_layer: string | null;
  measured_seconds: number | null;
  tx_bytes_per_s: number | null; rx_bytes_per_s: number | null;
  tx_packets_per_s: number | null; rx_packets_per_s: number | null;
  error_deltas: Record<string, number | null>; reason: string | null;
}

export interface OpGroup { op: string; initiator: string; count: number; bytes: number | null; bytes_known: number; latency_samples: number; latency_p50_us: number | null }

export interface RdmaSummary {
  events: number; bytes: number | null; bytes_known_events: number;
  latency: { samples: number; p50: number; p95: number; p99: number; max: number } | null;
  completions: { success: number; error: number; not_observed: number };
  by_op: OpGroup[];
}

export interface RdmaView {
  node: string | null;
  windowSeconds: number;
  observedAt: string | null;
  paths: { cpu_verbs: PathSupport; cpu_mlx5dv: PathSupport; gpu_initiated: PathSupport };
  devices: string[];
  libraries: { libibverbs: boolean | null; libmlx5: boolean | null };
  peermem: boolean | null;
  health: { attached: boolean; tracers: TracerHealth[]; gateway_dropped: number | null; ring_size: number | null; ring_capacity: number | null };
  ports: { source: "sysfs" | "unavailable"; reason: string | null; samples: number | null; rows: PortRow[] };
  summary: RdmaSummary;
  events: RdmaEvent[];
  eventsMatched: number;
  eventsTruncated: boolean;
  facets: Record<"host" | "gpu" | "nic" | "op" | "workload" | "initiator", string[]>;
}

export interface RdmaFilters { host?: string; gpu?: string; nic?: string; op?: string; workload?: string; initiator?: "cpu" | "gpu" }

export type RdmaState =
  | { kind: "loading" }
  | { kind: "not_connected" }
  | { kind: "plan_required"; message: string }
  | { kind: "error"; message: string }
  | { kind: "ready"; view: RdmaView };

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);
const bool = (v: unknown): boolean | null => (typeof v === "boolean" ? v : null);

const PATH_STATUSES: PathStatus[] = ["observed", "unavailable", "unsupported"];
function parsePath(v: unknown): PathSupport {
  const o = obj(v);
  const status = PATH_STATUSES.includes(o.status as PathStatus) ? (o.status as PathStatus) : "unavailable";
  return { status, source: str(o.source) ?? undefined, gap: str(o.gap) ?? (status === "observed" ? undefined : "Not reported by the gateway.") };
}

export function parseEvent(v: unknown): RdmaEvent | null {
  const o = obj(v);
  const id = num(o.id), ts = num(o.ts), op = str(o.op), provider = str(o.provider);
  const initiator = o.initiator === "cpu" || o.initiator === "gpu" ? o.initiator : null;
  if (id === null || ts === null || !op || !provider || !initiator) return null;
  return {
    id, ts, op, provider, initiator,
    host: str(o.host), pid: num(o.pid), process: str(o.process), rank: num(o.rank),
    gpu: str(o.gpu), nic: str(o.nic), port: num(o.port), transport: str(o.transport),
    direction: str(o.direction), bytes: num(o.bytes), peer: str(o.peer), qpn: num(o.qpn),
    status: str(o.status), latency_us: num(o.latency_us),
    workload: str(o.workload), collective: str(o.collective), comm: str(o.comm), seq: num(o.seq),
  };
}

function parseTracer(v: unknown): TracerHealth {
  const o = obj(v);
  const oh = obj(o.overhead);
  const pct = num(oh.value_pct), method = str(oh.method);
  return {
    name: str(o.name) ?? "unknown", version: str(o.version),
    mode: o.mode === "full" || o.mode === "sampled" ? o.mode : null,
    sample_rate: num(o.sample_rate), attached: o.attached === true, seconds_since_seen: num(o.seconds_since_seen),
    batches: num(o.batches) ?? 0, events_accepted: num(o.events_accepted) ?? 0, events_rejected: num(o.events_rejected) ?? 0,
    tracer_dropped: num(o.tracer_dropped), fields_dropped: num(o.fields_dropped) ?? 0,
    sensitive_fields_dropped: num(o.sensitive_fields_dropped) ?? 0,
    overhead: pct !== null && method ? { value_pct: pct, method } : null,
    paths: Object.fromEntries(Object.entries(obj(o.paths)).map(([k, b]) => [k, b === true])),
  };
}

function parsePort(v: unknown): PortRow {
  const o = obj(v), r = obj(o.rates);
  return {
    device: str(o.device) ?? "unknown", port: String(o.port ?? "?"), state: str(o.state), rate: str(o.rate),
    link_layer: str(o.link_layer), measured_seconds: num(o.measured_seconds),
    tx_bytes_per_s: num(r.tx_bytes_per_s), rx_bytes_per_s: num(r.rx_bytes_per_s),
    tx_packets_per_s: num(r.tx_packets_per_s), rx_packets_per_s: num(r.rx_packets_per_s),
    error_deltas: Object.fromEntries(Object.entries(obj(o.error_deltas)).map(([k, n]) => [k, num(n)])),
    reason: str(o.reason),
  };
}

function parseSummary(v: unknown): RdmaSummary {
  const o = obj(v), l = obj(o.latency_us), c = obj(o.completions);
  const samples = num(l.samples);
  const latency = samples && samples > 0 && num(l.p50) !== null && num(l.p95) !== null && num(l.p99) !== null && num(l.max) !== null
    ? { samples, p50: l.p50 as number, p95: l.p95 as number, p99: l.p99 as number, max: l.max as number } : null;
  return {
    events: num(o.events) ?? 0, bytes: num(o.bytes), bytes_known_events: num(o.bytes_known_events) ?? 0, latency,
    completions: { success: num(c.success) ?? 0, error: num(c.error) ?? 0, not_observed: num(c.not_observed) ?? 0 },
    by_op: arr(o.by_op).map((g) => {
      const x = obj(g);
      return { op: str(x.op) ?? "?", initiator: str(x.initiator) ?? "?", count: num(x.count) ?? 0, bytes: num(x.bytes),
        bytes_known: num(x.bytes_known) ?? 0, latency_samples: num(x.latency_samples) ?? 0, latency_p50_us: num(x.latency_p50_us) };
    }),
  };
}

const FACETS = ["host", "gpu", "nic", "op", "workload", "initiator"] as const;

export function parseRdmaResponse(raw: unknown): RdmaState {
  const r = obj(raw);
  if (r.configured === false) return { kind: "not_connected" };
  if (r.cause === "plan_required") return { kind: "plan_required", message: str(r.error) ?? "Upgrade to use RDMA tracing." };
  if (str(r.error)) return { kind: "error", message: str(r.error)! };
  const ov = obj(r.overview), ev = obj(r.events);
  if (!r.overview || !r.events) return { kind: "error", message: "The GPU service returned an incomplete RDMA response." };
  const caps = obj(ov.capabilities), paths = obj(caps.paths), libs = obj(caps.libraries), kernel = obj(caps.kernel);
  const health = obj(ov.capture_health), pc = obj(ov.port_counters), facets = obj(ev.facets);
  return {
    kind: "ready",
    view: {
      node: str(ov.node), windowSeconds: num(ov.window_seconds) ?? 300, observedAt: str(r.observed_at),
      paths: { cpu_verbs: parsePath(paths.cpu_verbs), cpu_mlx5dv: parsePath(paths.cpu_mlx5dv), gpu_initiated: parsePath(paths.gpu_initiated) },
      devices: arr(caps.devices).map(str).filter((d): d is string => !!d),
      libraries: { libibverbs: bool(libs.libibverbs), libmlx5: bool(libs.libmlx5) },
      peermem: bool(kernel.nvidia_peermem_loaded),
      health: {
        attached: health.attached === true, tracers: arr(health.tracers).map(parseTracer),
        gateway_dropped: num(health.gateway_dropped), ring_size: num(health.ring_size), ring_capacity: num(health.ring_capacity),
      },
      ports: { source: pc.source === "sysfs" ? "sysfs" : "unavailable", reason: str(pc.reason), samples: num(pc.samples), rows: arr(pc.ports).map(parsePort) },
      summary: parseSummary(ov.summary),
      events: arr(ev.events).map(parseEvent).filter((e): e is RdmaEvent => e !== null),
      eventsMatched: num(ev.matched) ?? 0,
      eventsTruncated: ev.truncated === true,
      facets: Object.fromEntries(FACETS.map((k) => [k, arr(facets[k]).map(str).filter((s): s is string => !!s)])) as RdmaView["facets"],
    },
  };
}

/** Body for the rdma-telemetry function; empty filter values are omitted. */
export function buildRdmaRequest(windowSeconds: number, filters: RdmaFilters, limit = 200) {
  const clean = Object.fromEntries(Object.entries(filters).filter(([, v]) => typeof v === "string" && v.trim() !== "").map(([k, v]) => [k, (v as string).trim()]));
  return { window_seconds: Math.min(3600, Math.max(60, Math.round(windowSeconds))), limit: Math.min(500, Math.max(1, limit)), filters: clean };
}

export function completionOf(status: string | null): "success" | "error" | "not_observed" {
  if (status === null || status === "pending") return "not_observed";
  return status === "success" || status === "IBV_WC_SUCCESS" ? "success" : "error";
}

export function formatBytes(n: number | null): string {
  if (n === null) return "—";
  const u = ["B", "KiB", "MiB", "GiB", "TiB"];
  let i = 0, v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${i === 0 ? v : v.toFixed(1)} ${u[i]}`;
}

export const dash = (v: string | number | null | undefined) => (v === null || v === undefined || v === "" ? "—" : String(v));
