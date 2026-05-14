import { useEffect, useState } from "react";
import { Bot, Activity, GitBranch, Zap, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

type AgentStatus = "thinking" | "executing" | "idle" | "error";
interface Agent {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  tasks: number;
  success: number;
  lastAction: string;
}

const SEED: Agent[] = [
  { id: "a1", name: "fabric-optimizer", role: "Topology auto-tuner", status: "executing", tasks: 142, success: 99.1, lastAction: "Rebalanced ring-16 → mesh-20" },
  { id: "a2", name: "thermal-guardian", role: "Cooling controller", status: "thinking", tasks: 87, success: 98.4, lastAction: "Throttled NCE-03 by 4%" },
  { id: "a3", name: "cost-sentinel", role: "Spend optimizer", status: "idle", tasks: 34, success: 100, lastAction: "Saved $2,148 last 24h" },
  { id: "a4", name: "incident-triage", role: "On-call AI SRE", status: "executing", tasks: 12, success: 91.6, lastAction: "Drained dev-005 (cert expiring)" },
  { id: "a5", name: "model-router", role: "LLM traffic shaper", status: "idle", tasks: 4203, success: 99.9, lastAction: "Routed batch to mixtral-8x7b" },
  { id: "a6", name: "compliance-auditor", role: "Policy enforcement", status: "error", tasks: 18, success: 88.8, lastAction: "Flagged unsigned image" },
];

function StatusDot({ s }: { s: AgentStatus }) {
  const map = {
    thinking: { color: "bg-yellow-400", icon: Loader2, label: "THINKING", spin: true },
    executing: { color: "bg-emerald-400", icon: Zap, label: "EXECUTING", spin: false },
    idle: { color: "bg-foreground/30", icon: CheckCircle2, label: "IDLE", spin: false },
    error: { color: "bg-red-400", icon: AlertCircle, label: "ERROR", spin: false },
  }[s];
  const Icon = map.icon;
  return (
    <span className="inline-flex items-center gap-1.5 text-[9px] font-mono">
      <span className={`w-1.5 h-1.5 rounded-full ${map.color} ${s === "executing" ? "animate-pulse" : ""}`} />
      <Icon className={`w-3 h-3 ${map.spin ? "animate-spin" : ""}`} />
      {map.label}
    </span>
  );
}

export function AgenticAIApp() {
  const [agents, setAgents] = useState<Agent[]>(SEED);

  useEffect(() => {
    const t = setInterval(() => {
      setAgents((p) =>
        p.map((a) =>
          Math.random() > 0.7
            ? { ...a, tasks: a.tasks + Math.floor(Math.random() * 3) }
            : a,
        ),
      );
    }, 1800);
    return () => clearInterval(t);
  }, []);

  const total = agents.reduce((s, a) => s + a.tasks, 0);
  const avgSuccess = agents.reduce((s, a) => s + a.success, 0) / agents.length;
  const active = agents.filter((a) => a.status === "executing" || a.status === "thinking").length;

  return (
    <div className="flex flex-col h-full bg-background text-foreground font-mono overflow-hidden">
      <div className="grid grid-cols-4 gap-3 p-4 border-b border-border/40 bg-card/20">
        {[
          { label: "Active Agents", value: `${active}/${agents.length}`, icon: Bot, color: "text-primary" },
          { label: "Total Decisions", value: total.toLocaleString(), icon: Activity, color: "text-emerald-400" },
          { label: "Avg Success", value: `${avgSuccess.toFixed(1)}%`, icon: CheckCircle2, color: "text-blue-400" },
          { label: "Pipelines", value: "12", icon: GitBranch, color: "text-violet-400" },
        ].map((m) => (
          <div key={m.label} className="rounded-lg border border-border/40 bg-card/40 p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] uppercase tracking-wider text-foreground/40">{m.label}</span>
              <m.icon className={`w-3.5 h-3.5 ${m.color}`} />
            </div>
            <div className={`text-xl font-bold ${m.color}`}>{m.value}</div>
          </div>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {agents.map((a) => (
          <div key={a.id} className="rounded-lg border border-border/40 bg-card/40 p-3 hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 grid place-items-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-bold">{a.name}</div>
                  <div className="text-[10px] text-foreground/40">{a.role}</div>
                </div>
              </div>
              <StatusDot s={a.status} />
            </div>
            <div className="grid grid-cols-3 gap-3 text-[10px]">
              <div><span className="text-foreground/40 uppercase">Tasks</span><div className="text-sm">{a.tasks}</div></div>
              <div><span className="text-foreground/40 uppercase">Success</span><div className="text-sm text-emerald-400">{a.success}%</div></div>
              <div className="col-span-1"><span className="text-foreground/40 uppercase">Last Action</span><div className="text-[10px] truncate text-foreground/70">{a.lastAction}</div></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
