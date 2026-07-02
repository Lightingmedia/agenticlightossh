import { useEffect, useState } from "react";
import { Database, Brain, GitMerge, FlaskConical, Package, TrendingUp, Play, Pause, Rocket, GitBranch } from "lucide-react";
import { MLOpsWorkbench } from "./MLOpsWorkbench";

type Stage = "data" | "training" | "eval" | "deploy";
type Status = "running" | "paused" | "complete";

interface Pipeline {
  name: string;
  stage: Stage;
  status: Status;
  throughput: string;
  health: number;
}

const SEED: Pipeline[] = [
  { name: "ingest-clickstream", stage: "data", status: "running", throughput: "12.4k rec/s", health: 98 },
  { name: "feature-store-sync", stage: "data", status: "running", throughput: "3.1k feat/s", health: 100 },
  { name: "llama3-finetune-v7", stage: "training", status: "running", throughput: "epoch 14/40", health: 96 },
  { name: "embedding-refresh", stage: "training", status: "complete", throughput: "—", health: 100 },
  { name: "model-eval-suite", stage: "eval", status: "running", throughput: "247 prompts", health: 92 },
  { name: "canary-rollout-v6", stage: "deploy", status: "running", throughput: "5% traffic", health: 99 },
];

const STAGES: { id: Stage; label: string; icon: typeof Database; color: string }[] = [
  { id: "data", label: "Data", icon: Database, color: "text-blue-400 border-blue-400/40 bg-blue-400/10" },
  { id: "training", label: "Training", icon: Brain, color: "text-violet-400 border-violet-400/40 bg-violet-400/10" },
  { id: "eval", label: "Eval", icon: FlaskConical, color: "text-yellow-400 border-yellow-400/40 bg-yellow-400/10" },
  { id: "deploy", label: "Deploy", icon: Package, color: "text-emerald-400 border-emerald-400/40 bg-emerald-400/10" },
];

export function MLOpsApp() {
  const [pipelines, setPipelines] = useState<Pipeline[]>(SEED);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2200);
  };

  const toggle = (name: string) =>
    setPipelines((p) =>
      p.map((x) =>
        x.name === name ? { ...x, status: x.status === "running" ? "paused" : "running" } : x,
      ),
    );

  const triggerTraining = () => {
    const id = `finetune-${Math.random().toString(36).slice(2, 6)}`;
    setPipelines((p) => [
      { name: id, stage: "training", status: "running", throughput: "epoch 1/40", health: 100 },
      ...p,
    ]);
    flash(`Training run ${id} started`);
  };

  const rolloutCanary = () => {
    const id = `canary-${Math.random().toString(36).slice(2, 6)}`;
    setPipelines((p) => [
      { name: id, stage: "deploy", status: "running", throughput: "1% → 5% → 25%", health: 100 },
      ...p,
    ]);
    flash(`Canary ${id} rolling out`);
  };

  // Listen to terminal-driven events: lightctl mlops {start|stop|train|canary}
  useEffect(() => {
    const onToggle = (e: Event) => {
      const { name, action } = (e as CustomEvent).detail || {};
      setPipelines((p) => {
        const exists = p.some((x) => x.name === name);
        if (!exists) {
          return [{ name, stage: "training", status: action === "stop" ? "paused" : "running", throughput: "via terminal", health: 100 }, ...p];
        }
        return p.map((x) => (x.name === name ? { ...x, status: action === "stop" ? "paused" : "running" } : x));
      });
      flash(`${action === "stop" ? "Stopped" : "Started"} ${name}`);
    };
    const onTrain = (e: Event) => {
      const { name } = (e as CustomEvent).detail || {};
      setPipelines((p) => [{ name, stage: "training", status: "running", throughput: "epoch 1/40", health: 100 }, ...p]);
      flash(`Training run ${name} started`);
    };
    const onCanary = (e: Event) => {
      const { name } = (e as CustomEvent).detail || {};
      setPipelines((p) => [{ name, stage: "deploy", status: "running", throughput: "1% → 5% → 25%", health: 100 }, ...p]);
      flash(`Canary ${name} rolling out`);
    };
    window.addEventListener("lightos:mlops:toggle", onToggle);
    window.addEventListener("lightos:mlops:train", onTrain);
    window.addEventListener("lightos:mlops:canary", onCanary);
    return () => {
      window.removeEventListener("lightos:mlops:toggle", onToggle);
      window.removeEventListener("lightos:mlops:train", onTrain);
      window.removeEventListener("lightos:mlops:canary", onCanary);
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-background text-foreground font-mono overflow-y-auto">
      <div className="p-4">
        <MLOpsWorkbench />
      </div>
      <div className="p-4 border-b border-t border-border/40 bg-card/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <GitMerge className="w-4 h-4 text-primary" />
            <span className="text-xs uppercase tracking-widest text-foreground/50">ML Pipeline</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={triggerTraining}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-violet-400/40 bg-violet-400/10 text-violet-300 hover:bg-violet-400/20 text-[11px] font-bold transition"
            >
              <Brain className="w-3.5 h-3.5" /> New Training Run
            </button>
            <button
              onClick={rolloutCanary}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-emerald-400/40 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20 text-[11px] font-bold transition"
            >
              <Rocket className="w-3.5 h-3.5" /> Canary Rollout
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {STAGES.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div className={`flex-1 rounded-lg border ${s.color} px-3 py-2.5 flex items-center gap-2`}>
                <s.icon className="w-4 h-4" />
                <div>
                  <div className="text-xs font-bold">{s.label}</div>
                  <div className="text-[9px] opacity-60">{pipelines.filter((p) => p.stage === s.id).length} pipelines</div>
                </div>
              </div>
              {i < STAGES.length - 1 && <span className="text-foreground/30">→</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "Datasets", v: "1.2 PB", sub: "+38 GB/h", icon: Database },
            { label: "Models", v: "47", sub: "12 in prod", icon: Brain },
            { label: "Drift Score", v: "0.04", sub: "stable", icon: TrendingUp },
          ].map((m) => (
            <div key={m.label} className="rounded-lg border border-border/40 bg-card/40 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] uppercase tracking-wider text-foreground/40">{m.label}</span>
                <m.icon className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="text-xl font-bold text-primary">{m.v}</div>
              <div className="text-[10px] text-foreground/50">{m.sub}</div>
            </div>
          ))}
        </div>

        <div className="text-[10px] uppercase tracking-widest text-foreground/40 mb-2">Active Pipelines</div>
        <div className="space-y-2">
          {pipelines.map((p) => {
            const stage = STAGES.find((s) => s.id === p.stage)!;
            return (
              <div key={p.name} className="rounded-lg border border-border/40 bg-card/40 p-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg border ${stage.color} grid place-items-center`}>
                  <stage.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">{p.name}</div>
                  <div className="text-[10px] text-foreground/50">{p.throughput}</div>
                </div>
                <div className="text-right mr-2">
                  <div className={`text-[10px] font-bold ${
                    p.status === "running" ? "text-emerald-400" :
                    p.status === "paused" ? "text-amber-400" : "text-blue-400"
                  }`}>{p.status.toUpperCase()}</div>
                  <div className="text-[10px] text-foreground/50">health {p.health}%</div>
                </div>
                {p.status !== "complete" && (
                  <button
                    onClick={() => toggle(p.name)}
                    className="px-2 py-1 rounded border border-border/60 hover:border-primary/60 hover:text-primary text-[10px] flex items-center gap-1"
                  >
                    {p.status === "running" ? <><Pause className="w-3 h-3" />Stop</> : <><Play className="w-3 h-3" />Start</>}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {toast && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg border border-primary/50 bg-background/95 text-primary text-[11px] shadow-[0_0_24px_hsl(var(--primary)/0.4)] flex items-center gap-2">
          <GitBranch className="w-3.5 h-3.5" /> {toast}
        </div>
      )}
    </div>
  );
}
