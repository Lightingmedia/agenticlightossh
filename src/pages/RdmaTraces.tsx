import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Network, PlugZap, RefreshCw, AlertTriangle, CheckCircle2, MinusCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  buildRdmaRequest, completionOf, dash, formatBytes, parseRdmaResponse,
  type PathSupport, type RdmaFilters, type RdmaState, type RdmaView,
} from "@/lib/rdma/model";

const WINDOWS = [{ v: 60, l: "Last 1 min" }, { v: 300, l: "Last 5 min" }, { v: 900, l: "Last 15 min" }, { v: 3600, l: "Last 1 hour" }];
const FILTER_KEYS = ["host", "gpu", "nic", "op", "workload", "initiator"] as const;
const ALL = "__all__";

const rate = (n: number | null) => (n === null ? "—" : `${formatBytes(n)}/s`);
const pkts = (n: number | null) => (n === null ? "—" : `${n.toFixed(0)} pkt/s`);

function PathBadge({ label, path }: { label: string; path: PathSupport }) {
  const Icon = path.status === "observed" ? CheckCircle2 : path.status === "unsupported" ? MinusCircle : AlertTriangle;
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-mono text-sm">{label}</h3>
        <Badge variant={path.status === "observed" ? "default" : "outline"} className="gap-1"><Icon className="h-3 w-3" />{path.status}</Badge>
      </div>
      {path.source && <p className="text-xs text-muted-foreground">Source: {path.source}</p>}
      {path.gap && <p className="text-xs text-muted-foreground">{path.gap}</p>}
    </div>
  );
}

function Ready({ view, filters, setFilters }: { view: RdmaView; filters: RdmaFilters; setFilters: (f: RdmaFilters) => void }) {
  const s = view.summary;
  return (
    <div className="space-y-8">
      <p className="text-xs text-muted-foreground">
        Node {dash(view.node)} · measured {view.observedAt ? new Date(view.observedAt).toLocaleTimeString() : "—"} · window {view.windowSeconds}s
      </p>

      <section aria-label="Port traffic" className="space-y-3">
        <h2 className="font-mono font-bold">Port traffic <span className="text-xs font-normal text-muted-foreground">(kernel counters)</span></h2>
        {view.ports.source !== "sysfs" ? (
          <p className="text-sm text-muted-foreground">Port counters unavailable: {dash(view.ports.reason)}</p>
        ) : !view.ports.rows.length ? (
          <p className="text-sm text-muted-foreground">The host reports no RDMA ports.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>{["Device", "Port", "State", "Link", "TX", "RX", "TX pkts", "RX pkts", "Errors (Δ)"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>
                {view.ports.rows.map((p) => {
                  const errs = Object.entries(p.error_deltas).filter(([, n]) => n !== null && n > 0);
                  return (
                    <tr key={`${p.device}-${p.port}`} className="border-t border-border font-mono">
                      <td className="px-3 py-2">{p.device}</td><td className="px-3 py-2">{p.port}</td>
                      <td className="px-3 py-2">{dash(p.state)}</td><td className="px-3 py-2">{dash(p.link_layer)} {p.rate ?? ""}</td>
                      <td className="px-3 py-2">{rate(p.tx_bytes_per_s)}</td><td className="px-3 py-2">{rate(p.rx_bytes_per_s)}</td>
                      <td className="px-3 py-2">{pkts(p.tx_packets_per_s)}</td><td className="px-3 py-2">{pkts(p.rx_packets_per_s)}</td>
                      <td className="px-3 py-2">{p.reason ? <span className="text-muted-foreground">{p.reason}</span> : errs.length ? <span className="text-destructive">{errs.map(([k, n]) => `${k} +${n}`).join(", ")}</span> : "0"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-label="Capture paths" className="space-y-3">
        <h2 className="font-mono font-bold">What can be observed</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <PathBadge label="CPU verbs" path={view.paths.cpu_verbs} />
          <PathBadge label="CPU mlx5dv" path={view.paths.cpu_mlx5dv} />
          <PathBadge label="GPU-initiated" path={view.paths.gpu_initiated} />
        </div>
        <p className="text-xs text-muted-foreground">
          Devices: {view.devices.length ? view.devices.join(", ") : "—"} · libibverbs {dash(view.libraries.libibverbs === null ? null : String(view.libraries.libibverbs))} · nvidia_peermem {dash(view.peermem === null ? null : String(view.peermem))}
        </p>
      </section>

      <section aria-label="Operation traces" className="space-y-3">
        <h2 className="font-mono font-bold">Operation traces</h2>
        {!view.health.attached ? (
          <p className="text-sm text-muted-foreground">No tracer is sending events to this host. Port traffic above is still measured; per-operation traces appear only when an external tracer is attached.</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-4">
              {[["Events", String(s.events)], ["Bytes", formatBytes(s.bytes)], ["p50 latency", s.latency ? `${s.latency.p50} µs` : "—"], ["p99 latency", s.latency ? `${s.latency.p99} µs` : "—"]].map(([k, v]) => (
                <div key={k} className="rounded-lg border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{k}</p><p className="font-mono text-lg">{v}</p></div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {FILTER_KEYS.filter((k) => view.facets[k].length).map((k) => (
                <Select key={k} value={filters[k] ?? ALL} onValueChange={(v) => setFilters({ ...filters, [k]: v === ALL ? undefined : v })}>
                  <SelectTrigger className="h-8 w-40 text-xs" aria-label={`Filter by ${k}`}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All {k}s</SelectItem>
                    {view.facets[k].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              ))}
            </div>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>{["Time", "Host", "GPU", "NIC", "Op", "Bytes", "Latency", "Result", "Workload"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {view.events.map((e) => (
                    <tr key={e.id} className="border-t border-border font-mono">
                      <td className="px-3 py-2">{new Date(e.ts * 1000).toLocaleTimeString()}</td>
                      <td className="px-3 py-2">{dash(e.host)}</td><td className="px-3 py-2">{dash(e.gpu)}</td><td className="px-3 py-2">{dash(e.nic)}</td>
                      <td className="px-3 py-2">{e.op}</td><td className="px-3 py-2">{formatBytes(e.bytes)}</td>
                      <td className="px-3 py-2">{e.latency_us === null ? "—" : `${e.latency_us} µs`}</td>
                      <td className="px-3 py-2">{completionOf(e.status).replace("_", " ")}</td><td className="px-3 py-2">{dash(e.workload)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">{view.eventsMatched} matching events{view.eventsTruncated ? `, showing ${view.events.length}` : ""}.</p>
          </>
        )}
      </section>
    </div>
  );
}

export default function RdmaTraces() {
  const [windowSeconds, setWindowSeconds] = useState(300);
  const [filters, setFilters] = useState<RdmaFilters>({});
  const [state, setState] = useState<RdmaState>({ kind: "loading" });

  const load = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("rdma-telemetry", { body: buildRdmaRequest(windowSeconds, filters) });
    if (error) {
      let body: unknown;
      try { body = await (error as { context?: Response }).context?.json(); } catch { /* generic */ }
      setState(body ? parseRdmaResponse(body) : { kind: "error", message: "RDMA readings are unavailable. Retry shortly." });
    } else setState(parseRdmaResponse(data));
  }, [windowSeconds, filters]);

  useEffect(() => {
    load();
    const t = window.setInterval(load, 15000);
    return () => window.clearInterval(t);
  }, [load]);

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-mono text-2xl font-bold flex items-center gap-2"><Network className="h-6 w-6 text-primary" />RDMA Traces</h1>
          <p className="text-sm text-muted-foreground">Measured network traffic from your connected GPU host. Missing readings show as "—", never estimated.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(windowSeconds)} onValueChange={(v) => setWindowSeconds(Number(v))}>
            <SelectTrigger className="w-36" aria-label="Time window"><SelectValue /></SelectTrigger>
            <SelectContent>{WINDOWS.map((w) => <SelectItem key={w.v} value={String(w.v)}>{w.l}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={load} aria-label="Refresh"><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </header>

      {state.kind === "loading" && <p className="text-sm text-muted-foreground">Checking your GPU host…</p>}
      {state.kind === "not_connected" && (
        <div className="rounded-lg border border-border bg-card p-6 space-y-3">
          <p className="text-sm">No GPU host is connected to your account, so there is no RDMA traffic to show.</p>
          <Button asChild variant="outline"><Link to="/dashboard/gateway-setup"><PlugZap className="mr-2 h-4 w-4" />Connect GPU</Link></Button>
        </div>
      )}
      {state.kind === "plan_required" && (
        <div className="rounded-lg border border-border bg-card p-6 space-y-3">
          <p className="text-sm">RDMA tracing is included on paid plans. Free covers one GPU for monitoring.</p>
          <Button asChild><Link to="/pricing">See plans</Link></Button>
        </div>
      )}
      {state.kind === "error" && <p role="alert" className="text-sm text-destructive">{state.message}</p>}
      {state.kind === "ready" && <Ready view={state.view} filters={filters} setFilters={setFilters} />}
    </div>
  );
}
