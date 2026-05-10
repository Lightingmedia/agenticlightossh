import { useState } from "react";
import { Box, Cpu, Layers, GitBranch, Circle, AlertTriangle, CheckCircle, Clock, XCircle, Play, Square, RotateCcw, ChevronRight, Zap } from "lucide-react";

type PodPhase = "Running" | "Pending" | "Succeeded" | "Failed" | "Terminating";
type SlurmState = "RUNNING" | "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED";
type RayStatus = "ALIVE" | "DEAD" | "RESTARTING";

interface Pod { name: string; namespace: string; phase: PodPhase; node: string; cpuReq: string; memReq: string; age: string; restarts: number; }
interface SlurmJob { jobId: number; name: string; partition: string; state: SlurmState; nodes: number; cpus: number; elapsed: string; fabric: string; }
interface RayNode { nodeId: string; hostname: string; status: RayStatus; cpus: number; cpuUsed: number; memGB: number; memUsedGB: number; }
interface CRD { name: string; kind: string; namespace: string; phase: string; fabric: string; ranks: number; age: string; }

const PODS: Pod[] = [
  { name: "lrd-controller-0", namespace: "lightrail-system", phase: "Running", node: "lightos-ctrl-01", cpuReq: "500m", memReq: "512Mi", age: "8d", restarts: 0 },
  { name: "llama3-70b-prod-0", namespace: "lightrail-inference", phase: "Running", node: "lightos-worker-01", cpuReq: "4", memReq: "32Gi", age: "2d", restarts: 0 },
  { name: "ray-head-0", namespace: "lightrail-ray", phase: "Running", node: "lightos-worker-01", cpuReq: "2", memReq: "8Gi", age: "5h", restarts: 0 },
  { name: "train-job-llama-0", namespace: "lightrail-jobs", phase: "Running", node: "lightos-worker-03", cpuReq: "8", memReq: "128Gi", age: "2h", restarts: 0 },
  { name: "compile-mixtral-0", namespace: "lightrail-jobs", phase: "Pending", node: "—", cpuReq: "2", memReq: "16Gi", age: "3m", restarts: 0 },
  { name: "sdxl-inference-0", namespace: "lightrail-inference", phase: "Failed", node: "lightos-edge-01", cpuReq: "2", memReq: "16Gi", age: "1h", restarts: 4 },
];
const SLURM: SlurmJob[] = [
  { jobId: 10042, name: "llama3-finetune", partition: "gpu-fabric", state: "RUNNING", nodes: 4, cpus: 128, elapsed: "2:22:18", fabric: "mesh-20x64" },
  { jobId: 10043, name: "all-reduce-bench", partition: "bench", state: "COMPLETED", nodes: 8, cpus: 256, elapsed: "0:42:11", fabric: "fat-tree-32x64" },
  { jobId: 10044, name: "diffusion-xl-train", partition: "gpu-fabric", state: "PENDING", nodes: 2, cpus: 64, elapsed: "—", fabric: "ring-16x128" },
];
const RAY: RayNode[] = [
  { nodeId: "ray-001", hostname: "lightos-worker-01", status: "ALIVE", cpus: 32, cpuUsed: 18, memGB: 128, memUsedGB: 72 },
  { nodeId: "ray-002", hostname: "lightos-worker-02", status: "ALIVE", cpus: 32, cpuUsed: 24, memGB: 128, memUsedGB: 98 },
  { nodeId: "ray-003", hostname: "lightos-worker-03", status: "RESTARTING", cpus: 32, cpuUsed: 0, memGB: 128, memUsedGB: 0 },
];
const CRDS: CRD[] = [
  { name: "prod-cluster", kind: "LightRailCluster", namespace: "lightrail-system", phase: "Ready", fabric: "mesh-20x64", ranks: 8, age: "8d" },
  { name: "train-job-llama", kind: "LightRailJob", namespace: "lightrail-jobs", phase: "Running", fabric: "mesh-20x64", ranks: 64, age: "2h" },
  { name: "worker-pool-a", kind: "LightRailNodePool", namespace: "lightrail-system", phase: "Ready", fabric: "mesh-20x64", ranks: 4, age: "8d" },
  { name: "rolling-2.0.1", kind: "LightRailOTAPolicy", namespace: "lightrail-system", phase: "Progressing", fabric: "—", ranks: 0, age: "1h" },
];

function PhaseIcon({ phase }: { phase: PodPhase }) {
  const map: Record<PodPhase, { icon: typeof Circle; color: string }> = { Running: { icon: CheckCircle, color: "text-emerald-400" }, Pending: { icon: Clock, color: "text-yellow-400" }, Succeeded: { icon: CheckCircle, color: "text-blue-400" }, Failed: { icon: XCircle, color: "text-red-400" }, Terminating: { icon: Square, color: "text-foreground/40" } };
  const { icon: Icon, color } = map[phase];
  return <Icon className={`w-3 h-3 ${color} shrink-0`} />;
}

function Bar({ value, max }: { value: number; max: number }) {
  return <div className="relative h-1 w-16 rounded-full bg-foreground/10 overflow-hidden"><div className="absolute inset-y-0 left-0 rounded-full bg-primary/60" style={{ width: `${Math.min(100, (value / max) * 100)}%` }} /></div>;
}

type ClusterTab = "k8s" | "slurm" | "ray" | "crds";
const TABS: { id: ClusterTab; label: string; icon: typeof Box }[] = [
  { id: "k8s", label: "Kubernetes", icon: Box }, { id: "slurm", label: "Slurm Queue", icon: Layers },
  { id: "ray", label: "Ray Cluster", icon: Zap }, { id: "crds", label: "LightRail CRDs", icon: GitBranch },
];

export function ClusterApp() {
  const [tab, setTab] = useState<ClusterTab>("k8s");

  const running = PODS.filter(p => p.phase === "Running").length;
  const failed = PODS.filter(p => p.phase === "Failed").length;
  const alive = RAY.filter(n => n.status === "ALIVE").length;

  return (
    <div className="flex h-full bg-background text-foreground overflow-hidden font-mono">
      <aside className="w-44 shrink-0 border-r border-border/40 bg-card/20 p-3 flex flex-col gap-4">
        <div>
          <div className="text-[9px] text-foreground/30 uppercase tracking-widest mb-1">LightOS</div>
          <div className="text-xs text-primary font-bold">Cluster Manager</div>
          <div className="text-[10px] text-foreground/30 mt-0.5">K3s · Slurm · Ray</div>
        </div>
        <div className="space-y-2">
          {[["K8s Pods", `${running} running`], ["Slurm Jobs", `${SLURM.filter(j => j.state === "RUNNING").length} active`], ["Ray Nodes", `${alive}/${RAY.length} alive`], ["CRDs", `${CRDS.length} objects`]].map(([label, value]) => (
            <div key={label} className="flex justify-between items-center">
              <div className="text-[10px] text-foreground/40">{label}</div><div className="text-[10px] text-foreground/60">{value}</div>
            </div>
          ))}
        </div>
        <div className="border-t border-border/30 pt-3 space-y-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)} className={`w-full flex items-center gap-2 text-left px-2 py-1.5 rounded text-[11px] transition-colors ${tab === id ? "bg-primary/20 text-primary" : "text-foreground/40 hover:text-foreground/70"}`}>
              <Icon className="w-3 h-3 shrink-0" />{label}
            </button>
          ))}
        </div>
        <div className="mt-auto space-y-1">
          <div className="text-[9px] text-foreground/20 uppercase">Control Plane</div>
          {[["K3s", true], ["lightrail-operator", true], ["scheduler-extender", true], ["slurm-bridge", true]].map(([label, ok]) => (
            <div key={label as string} className="flex items-center gap-1.5">
              <Circle className={`w-1.5 h-1.5 ${ok ? "text-emerald-400" : "text-red-400"}`} style={{ fill: "currentColor" }} />
              <span className="text-[9px] text-foreground/30">{label as string}</span>
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
              {id === "k8s" && failed > 0 && <span className="ml-0.5 text-[9px] bg-red-400/20 text-red-400 rounded-full px-1">{failed}</span>}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
          {tab === "k8s" && PODS.map(pod => (
            <div key={pod.name} className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-3 items-center px-2 py-2 rounded-lg border border-border/40 bg-card/30 hover:bg-card/50 transition-colors">
              <PhaseIcon phase={pod.phase} />
              <div className="min-w-0"><div className="font-mono text-xs truncate">{pod.name}</div><div className="text-[9px] text-foreground/30 truncate">{pod.namespace}</div></div>
              <div className="text-[10px] font-mono text-foreground/50 truncate max-w-[80px]">{pod.node}</div>
              <div className="text-[10px] font-mono text-foreground/50">{pod.cpuReq}</div>
              <div className="text-[10px] font-mono text-foreground/50">{pod.memReq}</div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-foreground/30">{pod.age}</span>
                {pod.restarts > 0 && <span className="text-[9px] font-mono text-yellow-400">{pod.restarts}↺</span>}
                {pod.phase === "Failed" && <button className="text-foreground/30 hover:text-primary"><RotateCcw className="w-2.5 h-2.5" /></button>}
              </div>
            </div>
          ))}

          {tab === "slurm" && (
            <>
              {SLURM.map(job => (
                <div key={job.jobId} className="rounded-lg border border-border/40 bg-card/30 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-foreground/30">#{job.jobId}</span>
                      <span className="font-mono text-sm">{job.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${job.state === "RUNNING" ? "text-emerald-400 border-emerald-400/30 bg-emerald-400/10" : job.state === "PENDING" ? "text-yellow-400 border-yellow-400/30 bg-yellow-400/10" : job.state === "COMPLETED" ? "text-blue-400 border-blue-400/30 bg-blue-400/10" : "text-red-400 border-red-400/30 bg-red-400/10"}`}>{job.state}</span>
                      {job.state === "RUNNING" && <button className="text-foreground/30 hover:text-red-400"><Square className="w-3 h-3" /></button>}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[["Partition", job.partition], ["Nodes", `${job.nodes}n · ${job.cpus}c`], ["Elapsed", job.elapsed], ["Fabric", job.fabric]].map(([k, v]) => (
                      <div key={k}><div className="text-[9px] font-mono text-foreground/30 uppercase">{k}</div><div className="text-xs font-mono text-foreground/60 truncate">{v}</div></div>
                    ))}
                  </div>
                </div>
              ))}
              <button className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-primary/30 text-primary/60 hover:text-primary hover:border-primary/60 transition-colors text-xs font-mono">
                <Play className="w-3 h-3" />Submit Slurm Job
              </button>
            </>
          )}

          {tab === "ray" && (
            <>
              <div className="grid grid-cols-3 gap-3 mb-2">
                {[["Nodes", `${alive}/${RAY.length}`, alive < RAY.length ? "text-yellow-400" : "text-emerald-400"], ["CPUs Used", `${RAY.reduce((s,n)=>s+n.cpuUsed,0)}/${RAY.reduce((s,n)=>s+n.cpus,0)}`, ""], ["Memory", `${RAY.reduce((s,n)=>s+n.memUsedGB,0)}/${RAY.reduce((s,n)=>s+n.memGB,0)} GB`, ""]].map(([label, value, color]) => (
                  <div key={label as string} className="rounded-lg border border-border/40 bg-card/40 p-3 text-center">
                    <div className="text-[9px] font-mono text-foreground/30 uppercase">{label as string}</div>
                    <div className={`font-mono text-sm mt-1 ${color as string}`}>{value as string}</div>
                  </div>
                ))}
              </div>
              {RAY.map(node => (
                <div key={node.nodeId} className="rounded-lg border border-border/40 bg-card/30 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Circle className={`w-2 h-2 ${node.status === "ALIVE" ? "text-emerald-400" : node.status === "RESTARTING" ? "text-yellow-400" : "text-red-400"}`} style={{ fill: "currentColor" }} />
                      <span className="font-mono text-sm">{node.hostname}</span>
                    </div>
                    <span className={`text-[9px] font-mono ${node.status === "ALIVE" ? "text-emerald-400" : node.status === "RESTARTING" ? "text-yellow-400" : "text-red-400"}`}>{node.status}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-[9px] font-mono text-foreground/30 mb-1"><span><Cpu className="inline w-2.5 h-2.5 mr-0.5" />CPU</span><span>{node.cpuUsed}/{node.cpus}</span></div>
                      <Bar value={node.cpuUsed} max={node.cpus} />
                    </div>
                    <div>
                      <div className="flex justify-between text-[9px] font-mono text-foreground/30 mb-1"><span>Memory</span><span>{node.memUsedGB}/{node.memGB} GB</span></div>
                      <Bar value={node.memUsedGB} max={node.memGB} />
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {tab === "crds" && (
            <>
              <div className="text-[10px] font-mono text-foreground/30 mb-2">LightRail operator custom resources managed by <span className="text-primary">lightrail-operator</span> in lightrail-system.</div>
              {CRDS.map(crd => (
                <div key={`${crd.kind}-${crd.name}`} className="rounded-lg border border-border/40 bg-card/30 px-3 py-2.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-1 rounded bg-primary/10 text-primary border border-primary/20">{crd.kind}</span>
                      <span className="font-mono text-xs">{crd.name}</span>
                    </div>
                    <div className="text-[9px] font-mono text-foreground/30 mt-0.5">{crd.namespace} · {crd.fabric}{crd.ranks > 0 ? ` · ${crd.ranks} ranks` : ""}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[9px] font-mono ${["Ready","Running"].includes(crd.phase) ? "text-emerald-400" : crd.phase === "Pending" ? "text-yellow-400" : "text-blue-400"}`}>{crd.phase}</span>
                    <span className="text-[9px] font-mono text-foreground/20">{crd.age}</span>
                    <ChevronRight className="w-3 h-3 text-foreground/20" />
                  </div>
                </div>
              ))}
              <div className="mt-2 rounded-lg border border-border/40 bg-card/20 p-3">
                <div className="text-[9px] font-mono text-foreground/30 uppercase mb-2">Available CRD Kinds</div>
                <div className="flex flex-wrap gap-1.5">
                  {["LightRailCluster","LightRailNodePool","LightRailJob","LightRailFabricRoute","LightRailOTAPolicy"].map(k => (
                    <span key={k} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-foreground/5 border border-border/40 text-foreground/40">{k}</span>
                  ))}
                </div>
              </div>
            </>
          )}

          {(tab === "k8s" || tab === "slurm") && (
            <div className="flex items-center gap-1.5 pt-1">
              {failed > 0 && tab === "k8s" && <AlertTriangle className="w-3 h-3 text-yellow-400" />}
              <span className="text-[9px] font-mono text-foreground/20">{tab === "k8s" ? `${PODS.length} pods · ${failed} failed` : `${SLURM.length} jobs · ${SLURM.filter(j=>j.state==="PENDING").length} pending`}</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
