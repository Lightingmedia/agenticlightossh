import { useState, useEffect, useRef } from "react";
import {
  Activity,
  Cpu,
  Zap,
  Thermometer,
  Network,
  Play,
  Square,
  RotateCcw,
  ChevronRight,
  Circle,
  BarChart3,
  Server,
  Layers,
  Brain,
} from "lucide-react";

type JobStatus = "running" | "queued" | "complete" | "failed";
type FabricTopo = "mesh" | "ring" | "butterfly" | "fat-tree";

interface Job {
  id: string; name: string; type: string; status: JobStatus;
  progress: number; fabric: string; ranks: number; bwGbps: number;
  startedAt: string; eta: string;
}
interface NodeMetric {
  id: string; role: string; fabricBwGbps: number; thermalC: number;
  powerW: number; utilizationPct: number;
}
interface LLMDeployment {
  name: string; model: string; replicas: number; tps: number;
  status: "healthy" | "degraded" | "starting";
}
interface FabricSegment {
  id: string; from: string; to: string; topology: FabricTopo;
  bwGbps: number; congestion: number; utilizationPct: number;
}

const FABRIC_COLORS: Record<FabricTopo, string> = {
  mesh: "hsl(var(--primary))", ring: "#10b981", butterfly: "#f59e0b", "fat-tree": "#8b5cf6",
};

function rnd(val: number, range: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val + (Math.random() - 0.5) * range));
}

function MiniBar({ value, max = 100, color = "hsl(var(--primary))" }: { value: number; max?: number; color?: string }) {
  return (
    <div className="relative h-1.5 w-full rounded-full bg-foreground/10 overflow-hidden">
      <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
        style={{ width: `${(value / max) * 100}%`, background: color }} />
    </div>
  );
}

function GaugeRing({ value, max = 100, label, sublabel, color = "hsl(var(--primary))" }: {
  value: number; max?: number; label: string; sublabel: string; color?: string;
}) {
  const r = 30, circ = 2 * Math.PI * r, dash = circ * Math.min(1, value / max);
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="6" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`} transform="rotate(-90 40 40)"
          style={{ transition: "stroke-dasharray 0.7s ease" }} />
        <text x="40" y="43" textAnchor="middle" fontSize="13" fontFamily="monospace" fill="currentColor" fontWeight="bold">
          {label}
        </text>
      </svg>
      <span className="text-[10px] font-mono text-foreground/50 uppercase tracking-wider">{sublabel}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: JobStatus | LLMDeployment["status"] }) {
  const map: Record<string, string> = {
    running: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
    queued: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
    complete: "text-blue-400 bg-blue-400/10 border-blue-400/30",
    failed: "text-red-400 bg-red-400/10 border-red-400/30",
    healthy: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
    degraded: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
    starting: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  };
  return <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${map[status] ?? ""}`}>{status.toUpperCase()}</span>;
}

type Tab = "overview" | "jobs" | "fabric" | "nodes" | "llm";
const TABS: { id: Tab; label: string; icon: typeof Activity }[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "jobs", label: "Job Queue", icon: Layers },
  { id: "fabric", label: "Fabric", icon: Network },
  { id: "nodes", label: "Nodes", icon: Server },
  { id: "llm", label: "LLM Serving", icon: Brain },
];

const TEAL = "#00FFB2";
const AMBER = "#FFB800";

function heatColor(v: number) {
  if (v <= 30) return "#1E2D4A";
  if (v <= 60) return "#00875A";
  if (v <= 85) return TEAL;
  return AMBER;
}

const HEAT_TILES = Array.from({ length: 256 }, () => Math.floor(Math.random() * 100));

const ALERTS = [
  { level: "CRITICAL", color: "#ef4444", msg: "NCE-1 thermal threshold exceeded — 87°C", ago: "2 min ago" },
  { level: "WARNING", color: AMBER, msg: "TFLN Channel 42 BER elevated — 1.2e-9", ago: "8 min ago" },
  { level: "INFO", color: "#3b82f6", msg: "llama-3.3-70b loaded on nce.xlarge", ago: "14 min ago" },
];

const EVENTS = [
  "[14:52:01] Kernel launched on NCE-0, tiles 0–31",
  "[14:51:47] Agent 'research-01' resumed from NGM checkpoint",
  "[14:51:33] TFLN channel 12 recalibrated, BER nominal",
  "[14:51:18] LightLink auto-scaled to 400 Gbps",
];

function KpiCard({ title, value, sub, color = TEAL }: { title: string; value: string; sub: string; color?: string }) {
  return (
    <div className="rounded-lg border border-border/40 bg-card/40 p-4 border-l-4" style={{ borderLeftColor: TEAL }}>
      <div className="text-[10px] font-mono uppercase tracking-widest text-foreground/50">{title}</div>
      <div className="mt-2 font-mono text-3xl font-bold" style={{ color }}>{value}</div>
      <div className="mt-1 text-[11px] font-mono text-foreground/50">{sub}</div>
    </div>
  );
}

function OverviewPanel() {
  return (
    <div className="space-y-4">
      {/* KPI ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard title="NCE Utilization" value="73%" sub="256 tiles active" />
        <KpiCard title="TFLN Channels" value="48 / 64" sub="Active WDM channels" />
        <KpiCard title="NGM Memory" value="141 GB / 192 GB" sub="NCE Global Memory" color={AMBER} />
        <KpiCard title="LightLink" value="387 Gbps" sub="Optical host throughput" />
      </div>

      {/* MIDDLE ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        <div className="lg:col-span-3 rounded-lg border border-border/40 bg-card/40 p-4">
          <div className="flex items-baseline justify-between mb-3">
            <div className="font-mono text-sm text-foreground/80">NCE Tile Heatmap</div>
            <div className="text-[10px] font-mono text-foreground/40">X2 Node · 256 tiles</div>
          </div>
          <div className="grid gap-[2px]" style={{ gridTemplateColumns: "repeat(16, minmax(0, 1fr))" }}>
            {HEAT_TILES.map((v, i) => (
              <div key={i} title={`Tile ${i} · ${v}%`} className="aspect-square rounded-[2px]" style={{ background: heatColor(v) }} />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-[10px] font-mono text-foreground/50">
            {[["0–30%","#1E2D4A"],["31–60%","#00875A"],["61–85%",TEAL],["86–100%",AMBER]].map(([l,c]) => (
              <div key={l} className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: c }} />{l}</div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 rounded-lg border border-border/40 bg-card/40 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-mono text-sm text-foreground/80">Alerts</div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/40">3</span>
          </div>
          <div className="space-y-2">
            {ALERTS.map((a) => (
              <div key={a.msg} className="rounded border border-border/40 bg-background/40 p-2 border-l-4" style={{ borderLeftColor: a.color }}>
                <div className="text-[11px] font-mono">
                  <span style={{ color: a.color }}>[{a.level}]</span>{" "}
                  <span className="text-foreground/80">{a.msg}</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[9px] font-mono text-foreground/40">{a.ago}</span>
                  <div className="flex gap-1">
                    <button className="text-[10px] font-mono px-2 py-0.5 rounded border border-border/60 text-foreground/60 hover:text-primary hover:border-primary/40 transition-colors">Acknowledge</button>
                    <button className="text-[10px] font-mono px-2 py-0.5 rounded border border-border/60 text-foreground/60 hover:text-primary hover:border-primary/40 transition-colors">Resolve</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BOTTOM ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="rounded-lg border border-border/40 bg-card/40 p-4">
          <div className="font-mono text-sm text-foreground/80 mb-3">Active Workloads</div>
          <div className="space-y-2 text-[12px] font-mono">
            {[
              { label: "Inference Endpoints", value: 4, dot: TEAL },
              { label: "Agent Instances", value: 7, dot: TEAL },
              { label: "Training Jobs", value: 1, dot: AMBER },
            ].map((w) => (
              <div key={w.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: w.dot, boxShadow: `0 0 6px ${w.dot}` }} />
                  <span className="text-foreground/70">{w.label}</span>
                </div>
                <span className="text-foreground/90">{w.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border/40 bg-card/40 p-4">
          <div className="font-mono text-sm text-foreground/80 mb-3">System Info</div>
          <div className="space-y-2 text-[12px] font-mono">
            <div className="flex justify-between"><span className="text-foreground/50">Version</span><span className="text-foreground/80">v2.1.4 · NCE-Native</span></div>
            <div className="flex justify-between items-center"><span className="text-foreground/50">SOC2</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded border border-emerald-400/40 bg-emerald-400/10 text-emerald-400">Compliant</span>
            </div>
            <div className="flex justify-between"><span className="text-foreground/50">Last audit</span><span className="text-foreground/80">June 15, 2026</span></div>
          </div>
        </div>

        <div className="rounded-lg border border-border/40 bg-card/40 p-4">
          <div className="font-mono text-sm text-foreground/80 mb-3">System Events</div>
          <div className="space-y-1 text-[11px] font-mono text-foreground/70 leading-relaxed">
            {EVENTS.map((e) => <div key={e}>{e}</div>)}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ControlCenterApp() {
  const [tab, setTab] = useState<Tab>("jobs");
  const [jobs, setJobs] = useState<Job[]>([
    { id: "j1", name: "llama3-70b-finetune", type: "training", status: "running", progress: 67, fabric: "mesh-20x64", ranks: 64, bwGbps: 312, startedAt: "09:14", eta: "2h 18m" },
    { id: "j2", name: "mixtral-8x7b-compile", type: "compile", status: "running", progress: 41, fabric: "butterfly-8x256", ranks: 8, bwGbps: 1480, startedAt: "10:02", eta: "44m" },
    { id: "j3", name: "codegen-inference-batch", type: "inference", status: "queued", progress: 0, fabric: "ring-16x128", ranks: 16, bwGbps: 0, startedAt: "—", eta: "queued" },
    { id: "j4", name: "all-reduce-benchmark", type: "benchmark", status: "complete", progress: 100, fabric: "fat-tree-32x64", ranks: 32, bwGbps: 398, startedAt: "08:30", eta: "done" },
    { id: "j5", name: "stable-diffusion-xl", type: "inference", status: "failed", progress: 23, fabric: "mesh-20x64", ranks: 4, bwGbps: 0, startedAt: "09:55", eta: "—" },
  ]);
  const [nodes, setNodes] = useState<NodeMetric[]>(
    Array.from({ length: 8 }, (_, i) => ({
      id: `node-${String(i + 1).padStart(2, "0")}`, role: i === 0 ? "controller" : "worker",
      fabricBwGbps: 280 + Math.random() * 120, thermalC: 48 + Math.random() * 22,
      powerW: 220 + Math.random() * 180, utilizationPct: 40 + Math.random() * 55,
    }))
  );
  const [segments, setSegments] = useState<FabricSegment[]>([
    { id: "A", from: "NCE-01", to: "NCE-02", topology: "mesh",     bwGbps: 400,  congestion: 0.12, utilizationPct: 78 },
    { id: "B", from: "NCE-02", to: "NCE-03", topology: "ring",     bwGbps: 800,  congestion: 0.06, utilizationPct: 54 },
    { id: "C", from: "NCE-03", to: "NCE-04", topology: "butterfly", bwGbps: 1600, congestion: 0.04, utilizationPct: 91 },
    { id: "D", from: "NCE-04", to: "NCE-01", topology: "fat-tree", bwGbps: 400,  congestion: 0.21, utilizationPct: 43 },
  ]);
  const [deployments] = useState<LLMDeployment[]>([
    { name: "llama3-70b-prod", model: "LLaMA-3 70B", replicas: 4, tps: 142, status: "healthy" },
    { name: "mixtral-8x7b-dev", model: "Mixtral 8×7B", replicas: 2, tps: 87, status: "healthy" },
    { name: "codegen-34b", model: "CodeGen 34B", replicas: 1, tps: 34, status: "degraded" },
    { name: "qwen2-72b", model: "Qwen2 72B", replicas: 2, tps: 0, status: "starting" },
  ]);
  const tick = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    tick.current = setInterval(() => {
      setNodes(p => p.map(n => ({ ...n, fabricBwGbps: rnd(n.fabricBwGbps, 20, 80, 400), thermalC: rnd(n.thermalC, 2, 38, 88), powerW: rnd(n.powerW, 15, 120, 450), utilizationPct: rnd(n.utilizationPct, 5, 10, 99) })));
      setSegments(p => p.map(s => ({ ...s, utilizationPct: rnd(s.utilizationPct, 5, 10, 99), congestion: Math.min(0.99, Math.max(0, s.congestion + (Math.random() - 0.5) * 0.04)) })));
      setJobs(p => p.map(j => j.status === "running" && j.progress < 100 ? { ...j, progress: Math.min(100, j.progress + Math.random() * 0.4) } : j));
    }, 1500);
    return () => clearInterval(tick.current);
  }, []);

  const running = jobs.filter(j => j.status === "running").length;
  const totalBw = nodes.reduce((s, n) => s + n.fabricBwGbps, 0);
  const avgUtil = nodes.reduce((s, n) => s + n.utilizationPct, 0) / nodes.length;
  const avgThermal = nodes.reduce((s, n) => s + n.thermalC, 0) / nodes.length;

  return (
    <div className="flex h-full bg-background text-foreground overflow-hidden font-mono">
      <aside className="w-48 shrink-0 border-r border-border/40 bg-card/20 flex flex-col p-3 gap-4">
        <div>
          <div className="text-[9px] text-foreground/30 uppercase tracking-widest mb-1">LightRail AI</div>
          <div className="text-xs text-primary font-bold">Control Center</div>
          <div className="text-[10px] text-foreground/30 mt-0.5">v2.0 · Wayland</div>
        </div>
        <div className="space-y-3">
          <GaugeRing value={avgUtil} label={`${avgUtil.toFixed(0)}%`} sublabel="Cluster Util" />
          <GaugeRing value={avgThermal} max={90} label={`${avgThermal.toFixed(0)}°`} sublabel="Avg Thermal" color="#f59e0b" />
        </div>
        <div className="space-y-2 border-t border-border/30 pt-3">
          {[
            { icon: Layers,   label: "Active Jobs",  value: String(running) },
            { icon: Network,  label: "Fabric BW",    value: `${(totalBw / 1000).toFixed(1)} Tb/s` },
            { icon: Cpu,      label: "Nodes",        value: `${nodes.length} online` },
            { icon: BarChart3,label: "LLM Svcs",     value: `${deployments.filter(d => d.status === "healthy").length} healthy` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-2">
              <Icon className="w-3 h-3 text-foreground/30 shrink-0" />
              <div className="min-w-0">
                <div className="text-[9px] text-foreground/30 uppercase">{label}</div>
                <div className="text-xs text-foreground/80 truncate">{value}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-auto">
          <div className="text-[9px] text-foreground/20 uppercase mb-1">Fabric Segments</div>
          {segments.map(s => (
            <div key={s.id} className="flex items-center gap-1.5 py-0.5">
              <Circle className="w-1.5 h-1.5 shrink-0" style={{ fill: FABRIC_COLORS[s.topology], color: FABRIC_COLORS[s.topology] }} />
              <span className="text-[9px] text-foreground/40 truncate">{s.from}→{s.to}</span>
              <span className="text-[9px] text-foreground/30 ml-auto">{s.utilizationPct.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center border-b border-border/40 bg-card/10 px-3 shrink-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs border-b-2 transition-colors ${tab === id ? "border-primary text-primary" : "border-transparent text-foreground/40 hover:text-foreground/70"}`}>
              <Icon className="w-3.5 h-3.5" />{label}
              {id === "jobs" && running > 0 && <span className="ml-0.5 text-[9px] bg-primary/20 text-primary rounded-full px-1">{running}</span>}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1 px-2">
            <Circle className="w-1.5 h-1.5 text-emerald-400" style={{ fill: "currentColor" }} />
            <span className="text-[9px] text-foreground/30">Live</span>
            <ChevronRight className="w-3 h-3 text-foreground/20 mx-1" />
            <span className="text-[9px] text-foreground/20">Photonic Mesh 20×64</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {tab === "jobs" && jobs.map(job => (
            <div key={job.id} className="rounded-lg border border-border/40 bg-card/40 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{job.name}</span>
                  <span className="text-[10px] font-mono text-foreground/40 uppercase">{job.type}</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={job.status} />
                  {job.status === "running" && <button className="p-0.5 text-foreground/30 hover:text-red-400"><Square className="w-3 h-3" /></button>}
                  {job.status === "failed" && <button className="p-0.5 text-foreground/30 hover:text-primary"><RotateCcw className="w-3 h-3" /></button>}
                </div>
              </div>
              {job.status === "running" && (
                <div className="mb-2">
                  <MiniBar value={job.progress} />
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] font-mono text-foreground/40">{job.progress.toFixed(0)}%</span>
                    <span className="text-[10px] font-mono text-foreground/40">ETA {job.eta}</span>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-4 gap-2">
                {[["Fabric", job.fabric], ["Ranks", String(job.ranks)], ["BW", job.bwGbps > 0 ? `${job.bwGbps} Gb/s` : "—"], ["Started", job.startedAt]].map(([k, v]) => (
                  <div key={k}><div className="text-[9px] font-mono text-foreground/30 uppercase">{k}</div><div className="text-[11px] font-mono text-foreground/70 truncate">{v}</div></div>
                ))}
              </div>
            </div>
          ))}

          {tab === "fabric" && (
            <>
              <div className="rounded-lg border border-border/40 bg-card/30 p-3">
                <div className="text-[10px] font-mono text-foreground/40 uppercase mb-3">Fabric Topology Map</div>
                <svg viewBox="0 0 320 160" className="w-full" style={{ maxHeight: 160 }}>
                  {[["160","30","270","100"],["270","100","160","130"],["160","130","50","100"],["50","100","160","30"]].map(([x1,y1,x2,y2], i) => (
                    <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={FABRIC_COLORS[segments[i]?.topology ?? "mesh"]} strokeWidth="2" strokeOpacity={0.5 + segments[i]?.utilizationPct / 200} />
                  ))}
                  {[["160","30","NCE-01"],["270","100","NCE-02"],["160","130","NCE-03"],["50","100","NCE-04"]].map(([cx,cy,label]) => (
                    <g key={label}><circle cx={cx} cy={cy} r="14" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="1.5" /><text x={cx} y={String(Number(cy)+4)} textAnchor="middle" fontSize="7" fontFamily="monospace" fill="currentColor">{label}</text></g>
                  ))}
                </svg>
              </div>
              {segments.map(seg => (
                <div key={seg.id} className="rounded-lg border border-border/40 bg-card/40 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Circle className="w-2 h-2" style={{ color: FABRIC_COLORS[seg.topology], fill: FABRIC_COLORS[seg.topology] }} />
                      <span className="font-mono text-xs">{seg.from} → {seg.to}</span>
                      <span className="text-[10px] font-mono text-foreground/40 uppercase">{seg.topology}</span>
                    </div>
                    <span className="font-mono text-xs text-foreground/60">{seg.bwGbps} Gb/s</span>
                  </div>
                  <MiniBar value={seg.utilizationPct} color={seg.utilizationPct > 85 ? "#f59e0b" : FABRIC_COLORS[seg.topology]} />
                  <div className="flex justify-between text-[10px] font-mono text-foreground/40 mt-1">
                    <span>Utilization {seg.utilizationPct.toFixed(0)}%</span>
                    <span className={seg.congestion > 0.15 ? "text-yellow-400" : "text-emerald-400"}>Congestion {(seg.congestion * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </>
          )}

          {tab === "nodes" && nodes.map(node => (
            <div key={node.id} className="rounded-lg border border-border/40 bg-card/40 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Server className="w-3.5 h-3.5 text-primary" />
                  <span className="font-mono text-sm">{node.id}</span>
                  {node.role === "controller" && <span className="text-[9px] font-mono px-1 rounded bg-primary/20 text-primary">CTRL</span>}
                </div>
                <span className="text-[10px] font-mono text-foreground/50">{node.utilizationPct.toFixed(0)}% util</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Fabric BW", val: node.fabricBwGbps.toFixed(0)+"G", pct: node.fabricBwGbps/400, color: "hsl(var(--primary))", icon: Zap },
                  { label: "Thermal", val: node.thermalC.toFixed(0)+"°C", pct: node.thermalC/90, color: node.thermalC>65?"#f59e0b":"#10b981", icon: Thermometer },
                  { label: "Power", val: node.powerW.toFixed(0)+"W", pct: node.powerW/450, color: "#8b5cf6", icon: Activity },
                ].map(({ label, val, pct, color, icon: Icon }) => (
                  <div key={label}>
                    <div className="flex justify-between text-[9px] font-mono text-foreground/40 mb-1">
                      <span><Icon className="inline w-2.5 h-2.5 mr-0.5" />{label}</span><span>{val}</span>
                    </div>
                    <MiniBar value={pct * 100} color={color} />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {tab === "llm" && (
            <>
              {deployments.map(dep => (
                <div key={dep.name} className="rounded-lg border border-border/40 bg-card/40 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-mono text-sm">{dep.name}</div>
                      <div className="text-[10px] font-mono text-foreground/40">{dep.model}</div>
                    </div>
                    <StatusBadge status={dep.status} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><div className="text-[9px] font-mono text-foreground/30 uppercase">Replicas</div><div className="font-mono text-sm">{dep.replicas}</div></div>
                    <div><div className="text-[9px] font-mono text-foreground/30 uppercase">Tokens/s</div><div className={`font-mono text-sm ${dep.tps === 0 ? "text-foreground/30" : ""}`}>{dep.tps || "—"}</div></div>
                    <div className="flex items-end gap-1">
                      <button className="text-[10px] font-mono px-2 py-1 rounded border border-border/60 text-foreground/50 hover:text-primary hover:border-primary/40 transition-colors">Scale</button>
                      <button className="text-[10px] font-mono px-2 py-1 rounded border border-border/60 text-foreground/50 hover:text-primary hover:border-primary/40 transition-colors">Logs</button>
                    </div>
                  </div>
                  {dep.status === "healthy" && <div className="mt-2"><MiniBar value={dep.tps} max={200} /></div>}
                </div>
              ))}
              <button className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-primary/30 text-primary/60 hover:text-primary hover:border-primary/60 transition-colors text-xs font-mono">
                <Play className="w-3 h-3" /> Deploy New Model
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
