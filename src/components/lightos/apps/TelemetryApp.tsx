import { useEffect, useMemo, useState } from "react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Activity, Bot, Cpu, Network, Search, ScrollText, GitBranch } from "lucide-react";

const CHART_BG = "#0A0E1A";
const GRID = "#1E2D4A";
const TEAL = "#00FF88";
const TEAL_DIM = "#3AA37A";
const AMBER = "#F5A524";
const RED = "#EF4444";

type DashKey = "nce" | "inference" | "agents" | "tfln";
type ExploreKey = "metrics" | "traces" | "logs";

const DASHBOARDS: { id: DashKey; label: string; icon: typeof Activity }[] = [
  { id: "nce", label: "NCE Overview", icon: Cpu },
  { id: "inference", label: "Inference Health", icon: Activity },
  { id: "agents", label: "Agent Performance", icon: Bot },
  { id: "tfln", label: "TFLN Fabric", icon: Network },
];

const EXPLORE: { id: ExploreKey; label: string; icon: typeof Activity }[] = [
  { id: "metrics", label: "Metrics (PromQL)", icon: Search },
  { id: "traces", label: "Traces", icon: GitBranch },
  { id: "logs", label: "Logs", icon: ScrollText },
];

function useTicker(intervalMs = 15000) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return tick;
}

function seedSeries(len: number, seed: number, base: number, amp: number, noise = 6) {
  const now = Date.now();
  return Array.from({ length: len }).map((_, i) => ({
    t: new Date(now - (len - 1 - i) * 60_000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    v: Math.round(base + Math.sin((i + seed) / 3) * amp + (Math.random() - 0.5) * noise),
  }));
}

function StatCard({ label, value, tone = "default" as "default" | "teal" | "amber" }) {
  const color = tone === "teal" ? "text-[#00FF88]" : tone === "amber" ? "text-[#F5A524]" : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-card/60 p-3">
      <div className="text-[10px] uppercase tracking-wider text-foreground/50 font-mono">{label}</div>
      <div className={`font-mono text-2xl mt-1 ${color}`}>{value}</div>
    </div>
  );
}

function ChartFrame({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border p-4" style={{ background: CHART_BG }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-mono text-sm text-foreground">{title}</h3>
        {subtitle && <span className="text-[10px] font-mono text-foreground/50">{subtitle}</span>}
      </div>
      <div className="h-52">{children}</div>
    </div>
  );
}

const AXIS = { stroke: "#4B5B7A", tick: { fill: "#7A8AAA", fontSize: 10, fontFamily: "monospace" } };
const TOOLTIP = {
  contentStyle: { background: "#0A0E1A", border: `1px solid ${GRID}`, fontFamily: "monospace", fontSize: 11 },
  labelStyle: { color: "#9AB0D0" },
};

function NCEOverviewDashboard() {
  const tick = useTicker(15000);

  const utilSeries = useMemo(() => {
    void tick;
    const len = 30;
    const now = Date.now();
    return Array.from({ length: len }).map((_, i) => ({
      t: new Date(now - (len - 1 - i) * 60_000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      nce0: Math.max(20, Math.min(100, Math.round(70 + Math.sin(i / 3) * 15 + (Math.random() - 0.5) * 8))),
      nce1: Math.max(20, Math.min(100, Math.round(58 + Math.cos(i / 4) * 12 + (Math.random() - 0.5) * 8))),
    }));
  }, [tick]);

  const tokensSeries = useMemo(() => {
    void tick;
    return seedSeries(30, 2, 18000, 5500, 1200).map((d) => ({ ...d, v: Math.max(5000, d.v) }));
  }, [tick]);

  const reqRateSeries = useMemo(() => {
    void tick;
    return seedSeries(20, 5, 320, 90, 40).map((d) => ({ ...d, v: Math.max(50, d.v) }));
  }, [tick]);

  const tflnSeries = useMemo(() => {
    void tick;
    const len = 30;
    const now = Date.now();
    return Array.from({ length: len }).map((_, i) => ({
      t: new Date(now - (len - 1 - i) * 60_000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      v: Math.max(40, Math.min(56, Math.round(45 + Math.sin(i / 4) * 3 + (Math.random() - 0.5) * 2))),
    }));
  }, [tick]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-mono text-xl text-foreground">NCE Overview</h2>
        <p className="font-mono text-xs text-foreground/60 mt-0.5">Last 30 minutes · Auto-refresh 15s</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="NCE Util" value="71%" tone="teal" />
        <StatCard label="LLM Requests" value="48,291" />
        <StatCard label="p99 Latency" value="284ms" tone="amber" />
        <StatCard label="LRCA Kernels" value="14" tone="teal" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartFrame title="NCE Tile Utilization %" subtitle="0–100%">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={utilSeries} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="tealArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={TEAL} stopOpacity={0.55} />
                  <stop offset="100%" stopColor={TEAL} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="tealDimArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={TEAL_DIM} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={TEAL_DIM} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
              <XAxis dataKey="t" {...AXIS} minTickGap={30} />
              <YAxis domain={[0, 100]} {...AXIS} />
              <Tooltip {...TOOLTIP} />
              <Area type="monotone" dataKey="nce0" name="NCE-0" stroke={TEAL} strokeWidth={2} fill="url(#tealArea)" isAnimationActive={false} />
              <Area type="monotone" dataKey="nce1" name="NCE-1" stroke={TEAL_DIM} strokeWidth={2} fill="url(#tealDimArea)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartFrame>

        <ChartFrame title="LLM Tokens/sec" subtitle="peak ~24k">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={tokensSeries} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
              <XAxis dataKey="t" {...AXIS} minTickGap={30} />
              <YAxis {...AXIS} />
              <Tooltip {...TOOLTIP} />
              <Line type="monotone" dataKey="v" name="tokens/s" stroke={TEAL} strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartFrame>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartFrame title="Inference Request Rate (req/s)">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={reqRateSeries} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
              <XAxis dataKey="t" {...AXIS} minTickGap={30} />
              <YAxis {...AXIS} />
              <Tooltip {...TOOLTIP} />
              <Bar dataKey="v" name="req/s" fill={TEAL} radius={[3, 3, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>

        <ChartFrame title="TFLN Active Channels" subtitle="0–64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={tflnSeries} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="tflnArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={TEAL} stopOpacity={0.55} />
                  <stop offset="100%" stopColor={TEAL} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
              <XAxis dataKey="t" {...AXIS} minTickGap={30} />
              <YAxis domain={[0, 64]} {...AXIS} />
              <Tooltip {...TOOLTIP} />
              <Area type="monotone" dataKey="v" name="channels" stroke={TEAL} strokeWidth={2} fill="url(#tflnArea)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartFrame>
      </div>

      <div className="rounded-xl border border-border overflow-hidden" style={{ background: CHART_BG }}>
        <div className="px-4 py-2.5 border-b border-border/60 flex items-center justify-between">
          <h3 className="font-mono text-sm text-foreground">Alert Rules</h3>
          <span className="text-[10px] font-mono text-foreground/50">3 active</span>
        </div>
        <table className="w-full text-left text-[12px] font-mono">
          <thead className="text-[10px] uppercase tracking-wider text-foreground/50">
            <tr className="border-b border-border/60">
              <th className="px-4 py-2 font-medium">Rule</th>
              <th className="px-4 py-2 font-medium">Expression</th>
              <th className="px-4 py-2 font-medium">Severity</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 text-foreground/85">
            <tr>
              <td className="px-4 py-2">NCE temp &gt; 85°C</td>
              <td className="px-4 py-2 text-foreground/70">nce_junction_temp &gt; 85</td>
              <td className="px-4 py-2"><span className="px-2 py-0.5 rounded-full border border-red-500/40 bg-red-500/10 text-red-400 text-[10px]" style={{ color: RED, borderColor: `${RED}55` }}>CRITICAL</span></td>
              <td className="px-4 py-2"><span className="inline-flex items-center gap-1.5 text-[#00FF88]"><span className="w-1.5 h-1.5 rounded-full bg-[#00FF88] shadow-[0_0_6px_#00FF88]" />Active</span></td>
            </tr>
            <tr>
              <td className="px-4 py-2">p99 latency &gt; 500ms</td>
              <td className="px-4 py-2 text-foreground/70">inference_p99 &gt; 500</td>
              <td className="px-4 py-2"><span className="px-2 py-0.5 rounded-full border text-[10px]" style={{ color: AMBER, borderColor: `${AMBER}55`, background: `${AMBER}18` }}>WARNING</span></td>
              <td className="px-4 py-2"><span className="inline-flex items-center gap-1.5 text-[#00FF88]"><span className="w-1.5 h-1.5 rounded-full bg-[#00FF88] shadow-[0_0_6px_#00FF88]" />Active</span></td>
            </tr>
            <tr>
              <td className="px-4 py-2">TFLN BER &gt; 1e-9</td>
              <td className="px-4 py-2 text-foreground/70">tfln_ber &gt; 1e-9</td>
              <td className="px-4 py-2"><span className="px-2 py-0.5 rounded-full border text-[10px]" style={{ color: AMBER, borderColor: `${AMBER}55`, background: `${AMBER}18` }}>WARNING</span></td>
              <td className="px-4 py-2"><span className="inline-flex items-center gap-1.5 text-[#00FF88]"><span className="w-1.5 h-1.5 rounded-full bg-[#00FF88] shadow-[0_0_6px_#00FF88]" />Active</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlaceholderDashboard({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="font-mono text-xl text-foreground">{label}</h2>
        <p className="font-mono text-xs text-foreground/60 mt-0.5">Last 30 minutes · Auto-refresh 15s</p>
      </div>
      <div className="rounded-xl border border-border p-8 text-center font-mono text-sm text-foreground/60" style={{ background: CHART_BG }}>
        Dashboard configured — panels streaming from telemetry pipeline.
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Explore: Metrics (PromQL)                                          */
/* ------------------------------------------------------------------ */

const METRIC_PRESETS: { label: string; expr: string; kind: "nce" | "llm" }[] = [
  { label: "NCE tile utilization",         expr: "rate(nce_tile_utilization[1m])",          kind: "nce" },
  { label: "NCE junction temp",            expr: "avg(nce_junction_temp) by (die)",         kind: "nce" },
  { label: "LLM tokens/sec",               expr: "sum(rate(llm_tokens_total[1m]))",         kind: "llm" },
  { label: "LLM p99 latency",              expr: "histogram_quantile(0.99, llm_latency_ms)", kind: "llm" },
];

function genMetricSeries(seed: number, base: number, amp: number, noise: number) {
  const len = 60;
  const now = Date.now();
  return Array.from({ length: len }).map((_, i) => ({
    t: new Date(now - (len - 1 - i) * 15_000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    v: Math.max(0, Math.round(base + Math.sin((i + seed) / 4) * amp + (Math.random() - 0.5) * noise)),
  }));
}

function MetricsExplore() {
  const [expr, setExpr] = useState(METRIC_PRESETS[0].expr);
  const [range, setRange] = useState("15m");
  const [step, setStep] = useState("15s");
  const [instance, setInstance] = useState("all");
  const [ran, setRan] = useState(0);

  const isLLM = expr.toLowerCase().includes("llm");
  const seed = expr.length + ran;
  const data = useMemo(
    () => (isLLM
      ? genMetricSeries(seed, 18000, 5500, 1200)
      : genMetricSeries(seed, 72, 14, 6)),
    [seed, isLLM],
  );

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-mono text-xl text-foreground">Metrics (PromQL)</h2>

      <div className="rounded-xl border border-border p-3 font-mono text-xs" style={{ background: CHART_BG }}>
        <div className="flex items-center gap-2">
          <span className="text-[#00FF88]">&gt;</span>
          <input
            value={expr}
            onChange={(e) => setExpr(e.target.value)}
            spellCheck={false}
            className="flex-1 bg-transparent outline-none text-[#00FF88] font-mono text-xs"
          />
          <button
            onClick={() => setRan((r) => r + 1)}
            className="px-3 py-1 rounded border border-[#00FF88]/50 text-[#00FF88] hover:bg-[#00FF88]/10"
          >
            Run
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {METRIC_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => { setExpr(p.expr); setRan((r) => r + 1); }}
              className="px-2 py-0.5 rounded border border-border/60 text-foreground/70 hover:border-[#00FF88]/50 hover:text-[#00FF88] text-[10px]"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
        {[
          { label: "$range", value: range, set: setRange, opts: ["5m", "15m", "1h", "6h"] },
          { label: "$step", value: step, set: setStep, opts: ["5s", "15s", "1m"] },
          { label: "$instance", value: instance, set: setInstance, opts: ["all", "nce-0", "nce-1", "llm-prod-01"] },
        ].map((v) => (
          <div key={v.label} className="rounded-lg border border-border p-2 flex items-center gap-2" style={{ background: CHART_BG }}>
            <span className="text-foreground/50">{v.label}</span>
            <select
              value={v.value}
              onChange={(e) => v.set(e.target.value)}
              className="ml-auto bg-transparent border border-border/60 rounded px-1.5 py-0.5 text-foreground/90 outline-none"
            >
              {v.opts.map((o) => <option key={o} value={o} className="bg-[#0A0E1A]">{o}</option>)}
            </select>
          </div>
        ))}
      </div>

      <ChartFrame title={isLLM ? "Result · LLM metric" : "Result · NCE metric"} subtitle={`step ${step} · range ${range}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
            <XAxis dataKey="t" {...AXIS} minTickGap={40} />
            <YAxis {...AXIS} />
            <Tooltip {...TOOLTIP} />
            <Line type="monotone" dataKey="v" stroke={TEAL} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartFrame>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Explore: Traces                                                    */
/* ------------------------------------------------------------------ */

interface TraceRow {
  id: string; service: string; op: string; durMs: number; status: "OK" | "ERROR"; ts: string;
}
const TRACES: TraceRow[] = [
  { id: "8f2a…c11", service: "inference-gateway", op: "POST /v1/completions", durMs: 284, status: "OK",    ts: "12:04:22" },
  { id: "1c47…a09", service: "lrca-runtime",      op: "kernel.matmul",         durMs: 12,  status: "OK",    ts: "12:04:22" },
  { id: "77bd…9e2", service: "inference-gateway", op: "POST /v1/chat",         durMs: 812, status: "ERROR", ts: "12:04:19" },
  { id: "2fa1…03d", service: "agent-orchestrator",op: "tools.exec",            durMs: 145, status: "OK",    ts: "12:04:11" },
  { id: "b09e…4a7", service: "tfln-driver",       op: "channel.reconfig",      durMs: 38,  status: "OK",    ts: "12:03:58" },
];

function TracesExplore() {
  const [q, setQ] = useState('service.name="inference-gateway"');
  const [status, setStatus] = useState<"all" | "OK" | "ERROR">("all");
  const [selected, setSelected] = useState<TraceRow | null>(TRACES[0]);

  const rows = TRACES.filter((r) =>
    (status === "all" || r.status === status) &&
    (q.trim() === "" || r.service.includes(q.replace(/^.*="?/, "").replace(/"$/, "")) || r.op.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-mono text-xl text-foreground">Traces</h2>
      <div className="rounded-xl border border-border p-3 flex items-center gap-2 font-mono text-xs" style={{ background: CHART_BG }}>
        <span className="text-[#00FF88]">&gt;</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1 bg-transparent outline-none text-[#00FF88]"
          spellCheck={false}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value as "all" | "OK" | "ERROR")} className="bg-transparent border border-border/60 rounded px-1.5 py-0.5 text-foreground/90 outline-none">
          <option value="all"   className="bg-[#0A0E1A]">All status</option>
          <option value="OK"    className="bg-[#0A0E1A]">OK</option>
          <option value="ERROR" className="bg-[#0A0E1A]">ERROR</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3">
        <div className="rounded-xl border border-border overflow-hidden" style={{ background: CHART_BG }}>
          <table className="w-full text-left text-[12px] font-mono">
            <thead className="text-[10px] uppercase tracking-wider text-foreground/50">
              <tr className="border-b border-border/60">
                <th className="px-3 py-2 font-medium">Trace</th>
                <th className="px-3 py-2 font-medium">Service</th>
                <th className="px-3 py-2 font-medium">Operation</th>
                <th className="px-3 py-2 font-medium">Duration</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-foreground/85">
              {rows.map((r) => {
                const active = selected?.id === r.id;
                return (
                  <tr
                    key={r.id}
                    onClick={() => setSelected(r)}
                    className={`cursor-pointer ${active ? "bg-[#00FF88]/10" : "hover:bg-primary/5"}`}
                  >
                    <td className="px-3 py-2 text-[#00FF88]">{r.id}</td>
                    <td className="px-3 py-2">{r.service}</td>
                    <td className="px-3 py-2 text-foreground/70">{r.op}</td>
                    <td className="px-3 py-2">{r.durMs} ms</td>
                    <td className="px-3 py-2" style={{ color: r.status === "OK" ? TEAL : RED }}>{r.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <aside className="rounded-xl border border-border p-3 font-mono text-xs" style={{ background: CHART_BG }}>
          <div className="text-[10px] uppercase tracking-wider text-foreground/50 mb-2">Selected trace</div>
          {selected ? (
            <div className="flex flex-col gap-1.5 text-foreground/80">
              <div><span className="text-foreground/50">id: </span><span className="text-[#00FF88]">{selected.id}</span></div>
              <div><span className="text-foreground/50">service: </span>{selected.service}</div>
              <div><span className="text-foreground/50">op: </span>{selected.op}</div>
              <div><span className="text-foreground/50">status: </span><span style={{ color: selected.status === "OK" ? TEAL : RED }}>{selected.status}</span></div>
              <div><span className="text-foreground/50">duration: </span>{selected.durMs} ms</div>
              <div><span className="text-foreground/50">ts: </span>{selected.ts}</div>
              <div className="mt-2 border-t border-border/60 pt-2">
                <div className="text-foreground/50 mb-1">Span timeline</div>
                <div className="space-y-1">
                  {["gateway.parse 4ms", "auth.verify 8ms", "route.plan 12ms", "runtime.exec 240ms", "response.encode 20ms"].map((s) => (
                    <div key={s} className="flex items-center gap-2">
                      <span className="w-1 h-3 bg-[#00FF88]" />
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-foreground/50">Select a trace to inspect.</div>
          )}
        </aside>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Explore: Logs                                                      */
/* ------------------------------------------------------------------ */

type Level = "INFO" | "WARN" | "ERROR" | "DEBUG";
interface LogRow { ts: string; level: Level; job: string; msg: string; }
const LOGS: LogRow[] = [
  { ts: "12:04:22.104", level: "INFO",  job: "lrca-runtime",       msg: "kernel matmul_v3 dispatched to nce-0 tile 42" },
  { ts: "12:04:19.882", level: "ERROR", job: "inference-gateway",  msg: "upstream timeout after 800ms (model=lightrail-8b)" },
  { ts: "12:04:14.550", level: "WARN",  job: "tfln-driver",        msg: "channel 27 BER above nominal (2.1e-10)" },
  { ts: "12:04:10.021", level: "INFO",  job: "agent-orchestrator", msg: "tool exec succeeded (name=code_search, ms=145)" },
  { ts: "12:04:05.443", level: "DEBUG", job: "scheduler",          msg: "recomputed workload split: {native:0.48, cuda:0.41}" },
  { ts: "12:03:58.998", level: "INFO",  job: "tfln-driver",        msg: "reconfigured 4 channels in 38ms" },
];
const LEVEL_COLOR: Record<Level, string> = { INFO: TEAL, WARN: AMBER, ERROR: RED, DEBUG: "#7A8AAA" };

function LogsExplore() {
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<"all" | Level>("all");
  const [selected, setSelected] = useState<LogRow | null>(null);

  const rows = LOGS.filter((r) =>
    (level === "all" || r.level === level) &&
    (q.trim() === "" || r.msg.toLowerCase().includes(q.toLowerCase()) || r.job.includes(q))
  );

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-mono text-xl text-foreground">Logs</h2>

      <div className="rounded-xl border border-border p-3 flex items-center gap-2 font-mono text-xs" style={{ background: CHART_BG }}>
        <span className="text-[#00FF88]">&gt;</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder='search logs, e.g. {job="lrca-runtime"} kernel'
          className="flex-1 bg-transparent outline-none text-[#00FF88] placeholder:text-foreground/40"
          spellCheck={false}
        />
        <select value={level} onChange={(e) => setLevel(e.target.value as "all" | Level)} className="bg-transparent border border-border/60 rounded px-1.5 py-0.5 text-foreground/90 outline-none">
          {(["all", "INFO", "WARN", "ERROR", "DEBUG"] as const).map((l) => (
            <option key={l} value={l} className="bg-[#0A0E1A]">{l === "all" ? "All levels" : l}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3">
        <div className="rounded-xl border border-border overflow-hidden font-mono text-[12px]" style={{ background: CHART_BG }}>
          <div className="divide-y divide-border/40">
            {rows.map((r, i) => {
              const active = selected === r;
              return (
                <button
                  key={i}
                  onClick={() => setSelected(r)}
                  className={`w-full text-left px-3 py-1.5 flex gap-3 items-start ${active ? "bg-[#00FF88]/10" : "hover:bg-primary/5"}`}
                >
                  <span className="text-foreground/50 w-24 shrink-0">{r.ts}</span>
                  <span className="w-14 shrink-0" style={{ color: LEVEL_COLOR[r.level] }}>{r.level}</span>
                  <span className="w-40 shrink-0 text-foreground/70">{r.job}</span>
                  <span className="text-foreground/85 truncate">{r.msg}</span>
                </button>
              );
            })}
            {rows.length === 0 && (
              <div className="px-3 py-4 text-foreground/50">No matching log lines.</div>
            )}
          </div>
        </div>

        <aside className="rounded-xl border border-border p-3 font-mono text-xs" style={{ background: CHART_BG }}>
          <div className="text-[10px] uppercase tracking-wider text-foreground/50 mb-2">Event details</div>
          {selected ? (
            <div className="flex flex-col gap-1.5 text-foreground/80">
              <div><span className="text-foreground/50">ts: </span>{selected.ts}</div>
              <div><span className="text-foreground/50">level: </span><span style={{ color: LEVEL_COLOR[selected.level] }}>{selected.level}</span></div>
              <div><span className="text-foreground/50">job: </span>{selected.job}</div>
              <div className="mt-2 border-t border-border/60 pt-2 whitespace-pre-wrap text-foreground/90">{selected.msg}</div>
            </div>
          ) : (
            <div className="text-foreground/50">Select a log line to inspect.</div>
          )}
        </aside>
      </div>
    </div>
  );
}

function ExplorePanel({ kind }: { kind: ExploreKey }) {
  if (kind === "metrics") return <MetricsExplore />;
  if (kind === "traces")  return <TracesExplore />;
  return <LogsExplore />;
}

export function TelemetryApp() {
  const [dash, setDash] = useState<DashKey>("nce");
  const [explore, setExplore] = useState<ExploreKey | null>(null);

  return (
    <div className="h-full w-full flex overflow-hidden">
      {/* Inner sidebar */}
      <aside className="w-[220px] shrink-0 border-r border-border flex flex-col" style={{ background: CHART_BG }}>
        <div className="px-4 py-3 border-b border-border/60">
          <div className="text-[10px] uppercase tracking-wider text-foreground/50 font-mono">Dashboards</div>
        </div>
        <nav className="flex flex-col py-1">
          {DASHBOARDS.map((d) => {
            const Icon = d.icon;
            const active = explore === null && dash === d.id;
            return (
              <button
                key={d.id}
                onClick={() => { setDash(d.id); setExplore(null); }}
                className={`flex items-center gap-2 px-4 py-2 text-left font-mono text-xs transition-colors border-l-2 ${
                  active
                    ? "border-[#00FF88] text-[#00FF88] bg-[#00FF88]/10"
                    : "border-transparent text-foreground/75 hover:bg-primary/5 hover:text-foreground"
                }`}
              >
                {active && <span className="w-1.5 h-1.5 rounded-full bg-[#00FF88] shadow-[0_0_6px_#00FF88]" />}
                {!active && <Icon className="w-3.5 h-3.5 opacity-70" />}
                <span className="truncate">{d.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="px-4 py-3 border-t border-b border-border/60 mt-2">
          <div className="text-[10px] uppercase tracking-wider text-foreground/50 font-mono">Explore</div>
        </div>
        <nav className="flex flex-col py-1">
          {EXPLORE.map((e) => {
            const Icon = e.icon;
            const active = explore === e.id;
            return (
              <button
                key={e.id}
                onClick={() => setExplore(e.id)}
                className={`flex items-center gap-2 px-4 py-2 text-left font-mono text-xs transition-colors border-l-2 ${
                  active
                    ? "border-[#00FF88] text-[#00FF88] bg-[#00FF88]/10"
                    : "border-transparent text-foreground/75 hover:bg-primary/5 hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5 opacity-70" />
                <span className="truncate">{e.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main panel */}
      <main className="flex-1 min-w-0 overflow-auto bg-background/60 p-5">
        {explore
          ? <ExplorePanel kind={explore} />
          : dash === "nce"
            ? <NCEOverviewDashboard />
            : <PlaceholderDashboard label={DASHBOARDS.find((d) => d.id === dash)!.label} />}
      </main>
    </div>
  );
}
