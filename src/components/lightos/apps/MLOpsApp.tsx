import { Database, Brain, GitMerge, FlaskConical, Package, TrendingUp } from "lucide-react";

const PIPELINES = [
  { name: "ingest-clickstream", stage: "data", status: "running", throughput: "12.4k rec/s", health: 98 },
  { name: "feature-store-sync", stage: "data", status: "running", throughput: "3.1k feat/s", health: 100 },
  { name: "llama3-finetune-v7", stage: "training", status: "running", throughput: "epoch 14/40", health: 96 },
  { name: "embedding-refresh", stage: "training", status: "complete", throughput: "—", health: 100 },
  { name: "model-eval-suite", stage: "eval", status: "running", throughput: "247 prompts", health: 92 },
  { name: "canary-rollout-v6", stage: "deploy", status: "running", throughput: "5% traffic", health: 99 },
];

const STAGES = [
  { id: "data", label: "Data", icon: Database, color: "text-blue-400 border-blue-400/40 bg-blue-400/10" },
  { id: "training", label: "Training", icon: Brain, color: "text-violet-400 border-violet-400/40 bg-violet-400/10" },
  { id: "eval", label: "Eval", icon: FlaskConical, color: "text-yellow-400 border-yellow-400/40 bg-yellow-400/10" },
  { id: "deploy", label: "Deploy", icon: Package, color: "text-emerald-400 border-emerald-400/40 bg-emerald-400/10" },
];

export function MLOpsApp() {
  return (
    <div className="flex flex-col h-full bg-background text-foreground font-mono overflow-hidden">
      <div className="p-4 border-b border-border/40 bg-card/20">
        <div className="flex items-center gap-3 mb-3">
          <GitMerge className="w-4 h-4 text-primary" />
          <span className="text-xs uppercase tracking-widest text-foreground/50">ML Pipeline</span>
        </div>
        <div className="flex items-center gap-2">
          {STAGES.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div className={`flex-1 rounded-lg border ${s.color} px-3 py-2.5 flex items-center gap-2`}>
                <s.icon className="w-4 h-4" />
                <div>
                  <div className="text-xs font-bold">{s.label}</div>
                  <div className="text-[9px] opacity-60">{PIPELINES.filter((p) => p.stage === s.id).length} pipelines</div>
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
          {PIPELINES.map((p) => {
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
                <div className="text-right">
                  <div className={`text-[10px] font-bold ${p.status === "running" ? "text-emerald-400" : "text-blue-400"}`}>{p.status.toUpperCase()}</div>
                  <div className="text-[10px] text-foreground/50">health {p.health}%</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
