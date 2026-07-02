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

function ExplorePanel({ kind }: { kind: ExploreKey }) {
  const titles: Record<ExploreKey, string> = {
    metrics: "Metrics (PromQL)",
    traces: "Traces",
    logs: "Logs",
  };
  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-mono text-xl text-foreground">{titles[kind]}</h2>
      <div className="rounded-xl border border-border p-4 font-mono text-xs text-foreground/70" style={{ background: CHART_BG }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-foreground/50">&gt;</span>
          <span className="text-[#00FF88]">
            {kind === "metrics"
              ? 'rate(nce_tile_utilization[1m])'
              : kind === "traces"
              ? 'service.name="inference-gateway"'
              : 'level=error {job="lrca-runtime"}'}
          </span>
        </div>
        <div className="border-t border-border/60 pt-3 text-foreground/50">
          Explore data by editing the query above and hitting run. Results appear here.
        </div>
      </div>
    </div>
  );
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
