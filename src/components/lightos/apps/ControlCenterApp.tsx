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

// ─── Types ────────────────────────────────────────────────────────────────────

type JobStatus = "running" | "queued" | "complete" | "failed";
type FabricTopo = "mesh" | "ring" | "butterfly" | "fat-tree";

interface Job {
  id: string;
  name: string;
  type: "training" | "inference" | "compile" | "benchmark";
  status: JobStatus;
  progress: number;
  fabric: string;
  ranks: number;
  bwGbps: number;
  startedAt: string;
  eta: string;
}

interface NodeMetric {
  id: string;
  role: string;
  fabricBwGbps: number;
  thermalC: number;
  powerW: number;
  utilizationPct: number;
  congestion: number;
}

interface LLMDeployment {
  name: string;
  model: string;
  replicas: number;
  tps: number;
  status: "healthy" | "degraded" | "starting";
}

interface FabricSegment {
  id: string;
  from: string;
  to: string;
  topology: FabricTopo;
  bwGbps: number;
  congestion: number;
  utilizationPct: number;
}

// ─── Simulated data generators ────────────────────────────────────────────────

const FABRIC_COLORS: Record<FabricTopo, string> = {
  mesh: "hsl(var(--primary))",
  ring: "#10b981",
  butterfly: "#f59e0b",
  "fat-tree": "#8b5cf6",
};

function randomDelta(val: number, range: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val + (Math.random() - 0.5) * range));
}

function makeJobs(): Job[] {
  return [
    {
      id: "job-001",
      name: "llama3-70b-finetune",
      type: "training",
      status: "running",
      progress: 67,
      fabric: "photonic-mesh-20x64",
      ranks: 64,
      bwGbps: 312,
      startedAt: "09:14:22",
      eta: "2h 18m",
    },
    {
      id: "job-002",
      name: "mixtral-8x7b-compile",
      type: "compile",
      status: "running",
      progress: 41,
      fabric: "butterfly-8x256",
      ranks: 8,
      bwGbps: 1480,
      startedAt: "10:02:11",
      eta: "44m",
    },
    {
      id: "job-003",
      name: "codegen-inference-batch",
      type: "inference",
      status: "queued",
      progress: 0,
      fabric: "ring-topology-16x128",
      ranks: 16,
      bwGbps: 0,
      startedAt: "—",
      eta: "queued",
    },
    {
      id: "job-004",
      name: "all-reduce-benchmark",
      type: "benchmark",
      status: "complete",
      progress: 100,
      fabric: "fat-tree-32x64",
      ranks: 32,
      bwGbps: 398,
      startedAt: "08:30:00",
      eta: "done",
    },
    {
      id: "job-005",
      name: "stable-diffusion-xl",
      type: "inference",
      status: "failed",
      progress: 23,
      fabric: "photonic-mesh-20x64",
      ranks: 4,
      bwGbps: 0,
      startedAt: "09:55:07",
      eta: "—",
    },
  ];
}

function makeNodes(): NodeMetric[] {
  return Array.from({ length: 8 }, (_, i) => ({
    id: `node-${String(i + 1).padStart(2, "0")}`,
    role: i === 0 ? "controller" : "worker",
    fabricBwGbps: 280 + Math.random() * 120,
    thermalC: 48 + Math.random() * 22,
    powerW: 220 + Math.random() * 180,
    utilizationPct: 40 + Math.random() * 55,
    congestion: Math.random() * 0.4,
  }));
}

function makeDeployments(): LLMDeployment[] {
  return [
    { name: "llama3-70b-prod", model: "LLaMA-3 70B", replicas: 4, tps: 142, status: "healthy" },
    { name: "mixtral-8x7b-dev", model: "Mixtral 8×7B", replicas: 2, tps: 87, status: "healthy" },
    { name: "codegen-34b", model: "CodeGen 34B", replicas: 1, tps: 34, status: "degraded" },
    { name: "qwen2-72b", model: "Qwen2 72B", replicas: 2, tps: 0, status: "starting" },
  ];
}

function makeSegments(): FabricSegment[] {
  return [
    { id: "seg-A", from: "NCE-01", to: "NCE-02", topology: "mesh", bwGbps: 400, congestion: 0.12, utilizationPct: 78 },
    { id: "seg-B", from: "NCE-02", to: "NCE-03", topology: "ring", bwGbps: 800, congestion: 0.06, utilizationPct: 54 },
    { id: "seg-C", from: "NCE-03", to: "NCE-04", topology: "butterfly", bwGbps: 1600, congestion: 0.04, utilizationPct: 91 },
    { id: "seg-D", from: "NCE-04", to: "NCE-01", topology: "fat-tree", bwGbps: 400, congestion: 0.21, utilizationPct: 43 },
  ];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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
  return (
    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${map[status] ?? ""}`}>
      {status.toUpperCase()}
    </span>
  );
}

function MiniBar({ value, max = 100, color = "hsl(var(--primary))" }: { value: number; max?: number; color?: string }) {
  return (
    <div className="relative h-1.5 w-full rounded-full bg-foreground/10 overflow-hidden">
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
        style={{ width: `${(value / max) * 100}%`, background: color }}
      />
    </div>
  );
}

function GaugeRing({ value, max = 100, label, sublabel, color = "hsl(var(--primary))" }: {
  value: number; max?: number; label: string; sublabel: string; color?: string;
}) {
  const pct = Math.min(1, value / max);
  const r = 30;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="6" />
        <circle
          cx="40" cy="40" r={r} fill="none"
          stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          transform="rotate(-90 40 40)"
          style={{ transition: "stroke-dasharray 0.7s ease" }}
        />
        <text x="40" y="43" textAnchor="middle" fontSize="13" fontFamily="monospace" fill="currentColor" fontWeight="bold">
          {label}
        </text>
      </svg>
      <span className="text-[10px] font-mono text-foreground/50 uppercase tracking-wider">{sublabel}</span>
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = "jobs" | "fabric" | "nodes" | "llm";

const TABS: { id: Tab; label: string; icon: typeof Activity }[] = [
  { id: "jobs", label: "Job Queue", icon: Layers },
  { id: "fabric", label: "Fabric", icon: Network },
  { id: "nodes", label: "Nodes", icon: Server },
  { id: "llm", label: "LLM Serving", icon: Brain },
];

// ─── Job Queue Tab ────────────────────────────────────────────────────────────

function JobQueueTab({ jobs }: { jobs: Job[] }) {
  return (
    <div className="space-y-2">
      {jobs.map((job) => (
        <div key={job.id} className="rounded-lg border border-border/40 bg-card/40 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-foreground">{job.name}</span>
              <span className="text-[10px] font-mono text-foreground/40 uppercase">{job.type}</span>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={job.status} />
              {job.status === "running" && (
                <button className="p-0.5 text-foreground/30 hover:text-red-400 transition-colors">
                  <Square className="w-3 h-3" />
                </button>
              )}
              {job.status === "failed" && (
                <button className="p-0.5 text-foreground/30 hover:text-primary transition-colors">
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          {job.status === "running" && (
            <div className="mb-2">
              <MiniBar value={job.progress} color="hsl(var(--primary))" />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] font-mono text-foreground/40">{job.progress}%</span>
                <span className="text-[10px] font-mono text-foreground/40">ETA {job.eta}</span>
              </div>
            </div>
          )}
          <div className="grid grid-cols-4 gap-2">
            {[
              ["Fabric", job.fabric.replace("photonic-", "").replace("topology-", "")],
              ["Ranks", String(job.ranks)],
              ["BW", job.bwGbps > 0 ? `${job.bwGbps} Gb/s` : "—"],
              ["Started", job.startedAt],
            ].map(([k, v]) => (
              <div key={k}>
                <div className="text-[9px] font-mono text-foreground/30 uppercase">{k}</div>
                <div className="text-[11px] font-mono text-foreground/70 truncate">{v}</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="mt-3">
        <button className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-primary/30 text-primary/60 hover:text-primary hover:border-primary/60 transition-colors text-xs font-mono">
          <Play className="w-3 h-3" />
          Submit New Job
        </button>
      </div>
    </div>
  );
}

// ─── Fabric Tab ───────────────────────────────────────────────────────────────

function FabricTab({ segments }: { segments: FabricSegment[] }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/40 bg-card/30 p-3">
        <div className="text-[10px] font-mono text-foreground/40 uppercase mb-3">Fabric Topology Map</div>
        <svg viewBox="0 0 320 160" className="w-full" style={{ maxHeight: 160 }}>
          {/* Edges */}
          {[
            ["160", "30", "270", "100"],
            ["270", "100", "160", "130"],
            ["160", "130", "50", "100"],
            ["50", "100", "160", "30"],
          ].map(([x1, y1, x2, y2], i) => (
            <line
              key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={FABRIC_COLORS[segments[i]?.topology ?? "mesh"]}
              strokeWidth="2"
              strokeOpacity={0.5 + segments[i]?.utilizationPct / 200}
            />
          ))}
          {/* Nodes */}
          {[
            ["160", "30", "NCE-01"],
            ["270", "100", "NCE-02"],
            ["160", "130", "NCE-03"],
            ["50", "100", "NCE-04"],
          ].map(([cx, cy, label]) => (
            <g key={label}>
              <circle cx={cx} cy={cy} r="14" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="1.5" />
              <text x={cx} y={String(Number(cy) + 4)} textAnchor="middle" fontSize="7" fontFamily="monospace" fill="currentColor">
                {label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="space-y-2">
        {segments.map((seg) => (
          <div key={seg.id} className="rounded-lg border border-border/40 bg-card/40 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Circle className="w-2 h-2" style={{ color: FABRIC_COLORS[seg.topology], fill: FABRIC_COLORS[seg.topology] }} />
                <span className="font-mono text-xs">{seg.from} → {seg.to}</span>
                <span className="text-[10px] font-mono text-foreground/40 uppercase">{seg.topology}</span>
              </div>
              <span className="font-mono text-xs text-foreground/60">{seg.bwGbps} Gb/s</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono text-foreground/40">
                <span>Utilization</span>
                <span>{seg.utilizationPct}%</span>
              </div>
              <MiniBar
                value={seg.utilizationPct}
                color={seg.utilizationPct > 85 ? "#f59e0b" : FABRIC_COLORS[seg.topology]}
              />
              <div className="flex justify-between text-[10px] font-mono text-foreground/40 mt-1">
                <span>Congestion</span>
                <span className={seg.congestion > 0.15 ? "text-yellow-400" : "text-emerald-400"}>
                  {(seg.congestion * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Nodes Tab ────────────────────────────────────────────────────────────────

function NodesTab({ nodes }: { nodes: NodeMetric[] }) {
  return (
    <div className="space-y-2">
      {nodes.map((node) => (
        <div key={node.id} className="rounded-lg border border-border/40 bg-card/40 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Server className="w-3.5 h-3.5 text-primary" />
              <span className="font-mono text-sm">{node.id}</span>
              {node.role === "controller" && (
                <span className="text-[9px] font-mono px-1 rounded bg-primary/20 text-primary">CTRL</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Circle className={`w-2 h-2 ${node.utilizationPct > 90 ? "text-yellow-400" : "text-emerald-400"}`}
                style={{ fill: "currentColor" }} />
              <span className="text-[10px] font-mono text-foreground/50">
                {node.utilizationPct.toFixed(0)}% util
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="flex justify-between text-[9px] font-mono text-foreground/40 mb-1">
                <span><Zap className="inline w-2.5 h-2.5 mr-0.5" />Fabric BW</span>
                <span>{node.fabricBwGbps.toFixed(0)}G</span>
              </div>
              <MiniBar value={node.fabricBwGbps} max={400} color="hsl(var(--primary))" />
            </div>
            <div>
              <div className="flex justify-between text-[9px] font-mono text-foreground/40 mb-1">
                <span><Thermometer className="inline w-2.5 h-2.5 mr-0.5" />Thermal</span>
                <span className={node.thermalC > 65 ? "text-yellow-400" : ""}>{node.thermalC.toFixed(0)}°C</span>
              </div>
              <MiniBar value={node.thermalC} max={90} color={node.thermalC > 65 ? "#f59e0b" : "#10b981"} />
            </div>
            <div>
              <div className="flex justify-between text-[9px] font-mono text-foreground/40 mb-1">
                <span><Activity className="inline w-2.5 h-2.5 mr-0.5" />Power</span>
                <span>{node.powerW.toFixed(0)}W</span>
              </div>
              <MiniBar value={node.powerW} max={450} color="#8b5cf6" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── LLM Serving Tab ─────────────────────────────────────────────────────────

function LLMServingTab({ deployments }: { deployments: LLMDeployment[] }) {
  return (
    <div className="space-y-3">
      {deployments.map((dep) => (
        <div key={dep.name} className="rounded-lg border border-border/40 bg-card/40 p-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="font-mono text-sm text-foreground">{dep.name}</div>
              <div className="text-[10px] font-mono text-foreground/40">{dep.model}</div>
            </div>
            <StatusBadge status={dep.status} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-[9px] font-mono text-foreground/30 uppercase">Replicas</div>
              <div className="font-mono text-sm">{dep.replicas}</div>
            </div>
            <div>
              <div className="text-[9px] font-mono text-foreground/30 uppercase">Tokens/s</div>
              <div className={`font-mono text-sm ${dep.tps === 0 ? "text-foreground/30" : ""}`}>
                {dep.tps > 0 ? dep.tps : "—"}
              </div>
            </div>
            <div className="flex items-end gap-1">
              <button className="text-[10px] font-mono px-2 py-1 rounded border border-border/60 text-foreground/50 hover:text-primary hover:border-primary/40 transition-colors">
                Scale
              </button>
              <button className="text-[10px] font-mono px-2 py-1 rounded border border-border/60 text-foreground/50 hover:text-primary hover:border-primary/40 transition-colors">
                Logs
              </button>
            </div>
          </div>
          {dep.status === "healthy" && (
            <div className="mt-2">
              <MiniBar value={dep.tps} max={200} color="hsl(var(--primary))" />
            </div>
          )}
        </div>
      ))}
      <button className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-primary/30 text-primary/60 hover:text-primary hover:border-primary/60 transition-colors text-xs font-mono">
        <Play className="w-3 h-3" />
        Deploy New Model
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ControlCenterApp() {
  const [tab, setTab] = useState<Tab>("jobs");
  const [jobs, setJobs] = useState<Job[]>(makeJobs);
  const [nodes, setNodes] = useState<NodeMetric[]>(makeNodes);
  const [segments, setSegments] = useState<FabricSegment[]>(makeSegments);
  const [deployments] = useState<LLMDeployment[]>(makeDeployments);
  const tickRef = useRef<ReturnType<typeof setInterval>>();

  // Live telemetry simulation
  useEffect(() => {
    tickRef.current = setInterval(() => {
      setNodes((prev) =>
        prev.map((n) => ({
          ...n,
          fabricBwGbps: randomDelta(n.fabricBwGbps, 20, 80, 400),
          thermalC: randomDelta(n.thermalC, 2, 38, 88),
          powerW: randomDelta(n.powerW, 15, 120, 450),
          utilizationPct: randomDelta(n.utilizationPct, 5, 10, 99),
          congestion: Math.min(0.99, Math.max(0, n.congestion + (Math.random() - 0.5) * 0.05)),
        }))
      );
      setSegments((prev) =>
        prev.map((s) => ({
          ...s,
          utilizationPct: randomDelta(s.utilizationPct, 5, 10, 99),
          congestion: Math.min(0.99, Math.max(0, s.congestion + (Math.random() - 0.5) * 0.04)),
        }))
      );
      setJobs((prev) =>
        prev.map((j) =>
          j.status === "running" && j.progress < 100
            ? { ...j, progress: Math.min(100, j.progress + Math.random() * 0.4) }
            : j
        )
      );
    }, 1500);
    return () => clearInterval(tickRef.current);
  }, []);

  const runningJobs = jobs.filter((j) => j.status === "running").length;
  const totalBw = nodes.reduce((s, n) => s + n.fabricBwGbps, 0);
  const avgUtil = nodes.reduce((s, n) => s + n.utilizationPct, 0) / nodes.length;
  const avgThermal = nodes.reduce((s, n) => s + n.thermalC, 0) / nodes.length;

  return (
    <div className="flex h-full bg-background text-foreground overflow-hidden font-mono">
      {/* Left sidebar — metrics overview */}
      <aside className="w-48 shrink-0 border-r border-border/40 bg-card/20 flex flex-col p-3 gap-4">
        <div>
          <div className="text-[9px] text-foreground/30 uppercase tracking-widest mb-2">LightRail AI</div>
          <div className="text-xs text-primary font-bold">Control Center</div>
          <div className="text-[10px] text-foreground/30 mt-0.5">v2.0 · Wayland</div>
        </div>

        <div className="space-y-3">
          <GaugeRing value={avgUtil} label={`${avgUtil.toFixed(0)}%`} sublabel="Cluster Util" />
          <GaugeRing value={avgThermal} max={90} label={`${avgThermal.toFixed(0)}°`} sublabel="Avg Thermal" color="#f59e0b" />
        </div>

        <div className="space-y-2 border-t border-border/30 pt-3">
          {[
            { icon: Layers, label: "Active Jobs", value: String(runningJobs) },
            { icon: Network, label: "Fabric BW", value: `${(totalBw / 1000).toFixed(1)} Tb/s` },
            { icon: Cpu, label: "Nodes", value: `${nodes.length} online` },
            { icon: BarChart3, label: "LLM Svcs", value: `${deployments.filter((d) => d.status === "healthy").length} healthy` },
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
          {segments.map((s) => (
            <div key={s.id} className="flex items-center gap-1.5 py-0.5">
              <Circle className="w-1.5 h-1.5 shrink-0" style={{ fill: FABRIC_COLORS[s.topology], color: FABRIC_COLORS[s.topology] }} />
              <span className="text-[9px] text-foreground/40 truncate">{s.from}→{s.to}</span>
              <span className="text-[9px] text-foreground/30 ml-auto">{s.utilizationPct.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Tab bar */}
        <div className="flex items-center border-b border-border/40 bg-card/10 px-3 shrink-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs border-b-2 transition-colors ${
                tab === id
                  ? "border-primary text-primary"
                  : "border-transparent text-foreground/40 hover:text-foreground/70"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {id === "jobs" && runningJobs > 0 && (
                <span className="ml-0.5 text-[9px] bg-primary/20 text-primary rounded-full px-1">
                  {runningJobs}
                </span>
              )}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2 px-2">
            <div className="flex items-center gap-1">
              <Circle className="w-1.5 h-1.5 text-emerald-400" style={{ fill: "currentColor" }} />
              <span className="text-[9px] text-foreground/30">Live</span>
            </div>
            <ChevronRight className="w-3 h-3 text-foreground/20" />
            <span className="text-[9px] text-foreground/20">Photonic Mesh 20×64</span>
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === "jobs" && <JobQueueTab jobs={jobs} />}
          {tab === "fabric" && <FabricTab segments={segments} />}
          {tab === "nodes" && <NodesTab nodes={nodes} />}
          {tab === "llm" && <LLMServingTab deployments={deployments} />}
        </div>
      </main>
    </div>
  );
}
