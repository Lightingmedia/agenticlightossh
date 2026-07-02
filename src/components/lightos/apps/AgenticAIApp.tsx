import { useEffect, useRef, useState } from "react";
import { Bot, Activity, GitBranch, Zap, CheckCircle2, AlertCircle, Loader2, Play, Square, Wrench, Database, Globe, Mail, Slack, MessageSquare, Plus, MessageCircle, Maximize2, Trash2, Pause, Save, FolderOpen } from "lucide-react";

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

interface AgentRun {
  id: string;
  agent: string;
  goal: string;
  status: "running" | "complete" | "failed";
  startedAt: number;
  steps: number;
}

interface ToolIntegration {
  id: string;
  name: string;
  icon: typeof Database;
  enabled: boolean;
  calls: number;
}

interface ActivityEvent {
  id: string;
  ts: number;
  agent: string;
  type: "info" | "tool" | "decision" | "success" | "error";
  message: string;
}

const SEED_AGENTS: Agent[] = [
  { id: "a1", name: "fabric-optimizer", role: "Topology auto-tuner", status: "executing", tasks: 142, success: 99.1, lastAction: "Rebalanced ring-16 → mesh-20" },
  { id: "a2", name: "thermal-guardian", role: "Cooling controller", status: "thinking", tasks: 87, success: 98.4, lastAction: "Throttled NCE-03 by 4%" },
  { id: "a3", name: "cost-sentinel", role: "Spend optimizer", status: "idle", tasks: 34, success: 100, lastAction: "Saved $2,148 last 24h" },
  { id: "a4", name: "incident-triage", role: "On-call AI SRE", status: "executing", tasks: 12, success: 91.6, lastAction: "Drained dev-005 (cert expiring)" },
  { id: "a5", name: "model-router", role: "LLM traffic shaper", status: "idle", tasks: 4203, success: 99.9, lastAction: "Routed batch to mixtral-8x7b" },
  { id: "a6", name: "compliance-auditor", role: "Policy enforcement", status: "error", tasks: 18, success: 88.8, lastAction: "Flagged unsigned image" },
];

const SEED_TOOLS: ToolIntegration[] = [
  { id: "pg", name: "Postgres", icon: Database, enabled: true, calls: 1284 },
  { id: "http", name: "HTTP / REST", icon: Globe, enabled: true, calls: 4920 },
  { id: "slack", name: "Slack", icon: Slack, enabled: true, calls: 312 },
  { id: "email", name: "Email", icon: Mail, enabled: false, calls: 0 },
  { id: "shell", name: "Shell exec", icon: Wrench, enabled: true, calls: 98 },
  { id: "chat", name: "Chat memory", icon: MessageSquare, enabled: true, calls: 660 },
];

const ACTION_TEMPLATES = [
  { type: "decision" as const, msg: "Selected route via mesh-20 (latency -12%)" },
  { type: "tool" as const, msg: "POST /v1/topology/apply → 200 OK" },
  { type: "info" as const, msg: "Fetched telemetry window (60s, 240 nodes)" },
  { type: "tool" as const, msg: "SQL: SELECT * FROM thermal_readings WHERE temp > 78" },
  { type: "success" as const, msg: "Threshold normalized in 4.2s" },
  { type: "decision" as const, msg: "Skipping retry — circuit breaker open" },
  { type: "error" as const, msg: "Tool slack.notify timed out (3000ms)" },
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

const TYPE_COLOR: Record<ActivityEvent["type"], string> = {
  info: "text-foreground/60",
  tool: "text-blue-400",
  decision: "text-violet-400",
  success: "text-emerald-400",
  error: "text-red-400",
};

const TEAL = "#00FFB2";

interface AgentInstance {
  id: string; name: string; status: "RUNNING" | "IDLE";
  model: string; nceType: string; tiles: number; ngmGB: number;
  uptime: string; tokens: string;
}

const INSTANCES: AgentInstance[] = [
  { id: "i1", name: "research-analyst", status: "RUNNING", model: "llama-3.3-70b", nceType: "nce.large", tiles: 64, ngmGB: 24, uptime: "3h 42m", tokens: "1.2M" },
  { id: "i2", name: "code-writer", status: "RUNNING", model: "deepseek-coder-v3", nceType: "nce.medium", tiles: 32, ngmGB: 12, uptime: "1h 15m", tokens: "487K" },
  { id: "i3", name: "data-pipeline-01", status: "IDLE", model: "llama-3.1-8b", nceType: "nce.small", tiles: 16, ngmGB: 6, uptime: "22m", tokens: "89K" },
];

function InstancesView() {
  const nodes = [
    { key: "in", label: "User Input", chip: null as string | null },
    { key: "a1", label: "research-analyst", chip: "nce.large" },
    { key: "a2", label: "code-writer", chip: "nce.medium" },
    { key: "out", label: "Output / API", chip: null },
  ];

  return (
    <div className="flex h-full overflow-hidden">
      {/* LEFT 35% */}
      <div className="w-[35%] min-w-[320px] border-r border-border/40 flex flex-col bg-[#0A0E1A]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
          <div className="font-mono text-sm text-foreground/85">Agent Instances</div>
          <button
            className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-md text-black font-bold"
            style={{ background: TEAL, boxShadow: `0 0 12px ${TEAL}55` }}
          >
            <Plus className="w-3.5 h-3.5" /> New Instance
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {INSTANCES.map((a) => (
            <div key={a.id} className="rounded-lg p-3" style={{ background: "#0F1629", border: "1px solid #1E2D4A" }}>
              <div className="flex items-center justify-between mb-2">
                <div className="font-mono text-sm font-bold text-foreground/90">{a.name}</div>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono">
                  <span className={`w-2 h-2 rounded-full ${a.status === "RUNNING" ? "" : "bg-foreground/40"}`}
                    style={a.status === "RUNNING" ? { background: "#22c55e", boxShadow: "0 0 6px #22c55e" } : undefined} />
                  <span className={a.status === "RUNNING" ? "text-emerald-400" : "text-foreground/50"}>{a.status}</span>
                </span>
              </div>
              <div className="text-[11px] font-mono text-foreground/60 space-y-1">
                <div><span className="text-foreground/40">Model:</span> <span className="text-foreground/80">{a.model}</span></div>
                <div><span className="text-foreground/40">NCE:</span> <span className="text-foreground/80">{a.nceType}</span> — {a.tiles} tiles / {a.ngmGB} GB NGM</div>
                <div className="flex justify-between">
                  <span><span className="text-foreground/40">Uptime:</span> {a.uptime}</span>
                  <span><span className="text-foreground/40">Tokens:</span> {a.tokens}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded text-black font-bold" style={{ background: TEAL }}>
                  <MessageCircle className="w-3 h-3" /> Chat
                </button>
                <button className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded border border-border/60 text-foreground/70 hover:border-primary/40 hover:text-primary transition">
                  <Maximize2 className="w-3 h-3" /> Resize
                </button>
                <button className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded border border-red-400/40 text-red-400 hover:bg-red-400/10 transition">
                  <Trash2 className="w-3 h-3" /> Destroy
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT 65% Pipeline */}
      <div className="flex-1 flex flex-col" style={{ background: "#0A0E1A" }}>
        <div className="px-4 py-3 border-b border-border/40 font-mono text-sm text-foreground/85">Pipeline Canvas</div>
        <div
          className="flex-1 relative overflow-auto"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        >
          <div className="min-h-full flex items-center justify-center p-8">
            <div className="flex items-center gap-2">
              {nodes.map((n, i) => (
                <div key={n.key} className="flex items-center gap-2">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className="px-4 py-3 rounded-lg font-mono text-xs text-white min-w-[140px] text-center"
                      style={{ background: "#0F1629", border: `1.5px solid ${TEAL}`, boxShadow: `0 0 14px ${TEAL}33` }}
                    >
                      {n.label}
                    </div>
                    {n.chip && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-foreground/10 text-foreground/60 border border-border/40">
                        {n.chip}
                      </span>
                    )}
                  </div>
                  {i < nodes.length - 1 && (
                    <svg width="56" height="30" viewBox="0 0 56 30" className="shrink-0">
                      <defs>
                        <marker id={`arr-${i}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                          <path d="M0,0 L10,5 L0,10 z" fill={TEAL} />
                        </marker>
                      </defs>
                      <path d="M2,15 C18,2 38,28 54,15" fill="none" stroke={TEAL} strokeWidth="1.8" markerEnd={`url(#arr-${i})`} />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom toolbar */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-t border-border/40 bg-[#0F1629]">
          {[
            { icon: Plus, label: "Add Node" },
            { icon: Play, label: "Run Pipeline", primary: true },
            { icon: Pause, label: "Pause" },
            { icon: Square, label: "Stop" },
            { icon: Save, label: "Save" },
            { icon: FolderOpen, label: "Load Template" },
          ].map((b) => (
            <button
              key={b.label}
              className={`inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1.5 rounded border transition ${
                b.primary
                  ? "text-black font-bold"
                  : "border-border/60 text-foreground/70 hover:border-primary/40 hover:text-primary"
              }`}
              style={b.primary ? { background: TEAL, border: `1px solid ${TEAL}` } : undefined}
            >
              <b.icon className="w-3.5 h-3.5" /> {b.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AgenticAIApp() {
  const [tab, setTab] = useState<"instances" | "agents" | "runs" | "tools" | "activity">("instances");
  const [agents, setAgents] = useState<Agent[]>(SEED_AGENTS);
  const [runs, setRuns] = useState<AgentRun[]>([
    { id: "run-7c1a", agent: "fabric-optimizer", goal: "Rebalance hot ring", status: "running", startedAt: Date.now() - 42_000, steps: 14 },
    { id: "run-3f80", agent: "incident-triage", goal: "Triage cert-expiry alarm", status: "running", startedAt: Date.now() - 18_000, steps: 6 },
    { id: "run-ba12", agent: "cost-sentinel", goal: "Quarterly spend report", status: "complete", startedAt: Date.now() - 600_000, steps: 31 },
  ]);
  const [tools, setTools] = useState<ToolIntegration[]>(SEED_TOOLS);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  // Simulate agent updates + activity stream
  useEffect(() => {
    const t = setInterval(() => {
      setAgents((p) =>
        p.map((a) =>
          Math.random() > 0.7 ? { ...a, tasks: a.tasks + Math.floor(Math.random() * 3) } : a,
        ),
      );
      setRuns((p) =>
        p.map((r) => (r.status === "running" ? { ...r, steps: r.steps + (Math.random() > 0.5 ? 1 : 0) } : r)),
      );
      const tpl = ACTION_TEMPLATES[Math.floor(Math.random() * ACTION_TEMPLATES.length)];
      const agent = agents[Math.floor(Math.random() * agents.length)].name;
      setEvents((p) =>
        [
          ...p,
          { id: `${Date.now()}-${Math.random()}`, ts: Date.now(), agent, type: tpl.type, message: tpl.msg },
        ].slice(-200),
      );
      setTools((p) =>
        p.map((tl) =>
          tl.enabled && Math.random() > 0.6 ? { ...tl, calls: tl.calls + Math.floor(Math.random() * 4) } : tl,
        ),
      );
    }, 1400);
    return () => clearInterval(t);
  }, [agents]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [events]);

  const startRun = (agent: string, goal = "Ad-hoc operator run") => {
    const id = `run-${Math.random().toString(36).slice(2, 6)}`;
    setRuns((p) => [{ id, agent, goal, status: "running", startedAt: Date.now(), steps: 0 }, ...p]);
    return id;
  };
  const stopRun = (id: string) =>
    setRuns((p) => p.map((r) => (r.id === id ? { ...r, status: "complete" } : r)));

  // Listen to terminal-driven events: lightctl agentic {run|stop}
  useEffect(() => {
    const onRun = (e: Event) => {
      const { agent, goal } = (e as CustomEvent).detail || {};
      if (agent) startRun(agent, goal);
    };
    const onStop = (e: Event) => {
      const { id } = (e as CustomEvent).detail || {};
      if (id) stopRun(id);
    };
    window.addEventListener("lightos:agentic:run", onRun);
    window.addEventListener("lightos:agentic:stop", onStop);
    return () => {
      window.removeEventListener("lightos:agentic:run", onRun);
      window.removeEventListener("lightos:agentic:stop", onStop);
    };
  }, []);

  const toggleTool = (id: string) =>
    setTools((p) => p.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t)));

  const total = agents.reduce((s, a) => s + a.tasks, 0);
  const avgSuccess = agents.reduce((s, a) => s + a.success, 0) / agents.length;
  const active = agents.filter((a) => a.status === "executing" || a.status === "thinking").length;

  return (
    <div className="flex flex-col h-full bg-background text-foreground font-mono overflow-hidden">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 p-4 border-b border-border/40 bg-card/20">
        {[
          { label: "Active Agents", value: `${active}/${agents.length}`, icon: Bot, color: "text-primary" },
          { label: "Total Decisions", value: total.toLocaleString(), icon: Activity, color: "text-emerald-400" },
          { label: "Avg Success", value: `${avgSuccess.toFixed(1)}%`, icon: CheckCircle2, color: "text-blue-400" },
          { label: "Open Runs", value: runs.filter((r) => r.status === "running").length, icon: GitBranch, color: "text-violet-400" },
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

      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 pt-2 border-b border-border/40 bg-card/10">
        {(["instances", "agents", "runs", "tools", "activity"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-[11px] uppercase tracking-wider rounded-t border-b-2 transition ${
              tab === t
                ? "text-primary border-primary bg-primary/5"
                : "text-foreground/50 border-transparent hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Main panel */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {tab === "agents" && agents.map((a) => (
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
                <div className="flex items-center gap-2">
                  <StatusDot s={a.status} />
                  <button
                    onClick={() => startRun(a.name)}
                    className="px-2 py-1 rounded border border-primary/40 text-primary hover:bg-primary/10 text-[10px] flex items-center gap-1"
                  >
                    <Play className="w-3 h-3" /> Run
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-[10px]">
                <div><span className="text-foreground/40 uppercase">Tasks</span><div className="text-sm">{a.tasks}</div></div>
                <div><span className="text-foreground/40 uppercase">Success</span><div className="text-sm text-emerald-400">{a.success}%</div></div>
                <div><span className="text-foreground/40 uppercase">Last Action</span><div className="text-[10px] truncate text-foreground/70">{a.lastAction}</div></div>
              </div>
            </div>
          ))}

          {tab === "runs" && (
            runs.length === 0 ? (
              <div className="text-center text-foreground/40 text-xs py-8">No runs yet — start one from the Agents tab.</div>
            ) : runs.map((r) => (
              <div key={r.id} className="rounded-lg border border-border/40 bg-card/40 p-3 flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  r.status === "running" ? "bg-emerald-400 animate-pulse" :
                  r.status === "failed" ? "bg-red-400" : "bg-foreground/30"
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold">{r.id} <span className="text-foreground/40 font-normal">· {r.agent}</span></div>
                  <div className="text-[10px] text-foreground/50">{r.goal}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-foreground/60">{r.steps} steps</div>
                  <div className="text-[10px] text-foreground/40">{Math.round((Date.now() - r.startedAt) / 1000)}s</div>
                </div>
                {r.status === "running" && (
                  <button
                    onClick={() => stopRun(r.id)}
                    className="px-2 py-1 rounded border border-red-400/40 text-red-300 hover:bg-red-400/10 text-[10px] flex items-center gap-1"
                  >
                    <Square className="w-3 h-3" /> Stop
                  </button>
                )}
              </div>
            ))
          )}

          {tab === "tools" && tools.map((tl) => (
            <div key={tl.id} className="rounded-lg border border-border/40 bg-card/40 p-3 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg border grid place-items-center ${tl.enabled ? "border-primary/40 bg-primary/10 text-primary" : "border-border/40 text-foreground/40"}`}>
                <tl.icon className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold">{tl.name}</div>
                <div className="text-[10px] text-foreground/50">{tl.calls.toLocaleString()} calls today</div>
              </div>
              <button
                onClick={() => toggleTool(tl.id)}
                className={`px-3 py-1 rounded border text-[10px] font-bold transition ${
                  tl.enabled
                    ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                    : "border-border/60 text-foreground/60 hover:border-primary/40"
                }`}
              >
                {tl.enabled ? "ENABLED" : "DISABLED"}
              </button>
            </div>
          ))}

          {tab === "activity" && (
            <div ref={logRef} className="text-[11px] space-y-1 h-full overflow-y-auto">
              {events.length === 0 && <div className="text-foreground/40 text-xs py-8 text-center">Waiting for agent events…</div>}
              {events.map((e) => (
                <div key={e.id} className="flex gap-2 leading-tight">
                  <span className="text-foreground/40 shrink-0">{new Date(e.ts).toLocaleTimeString([], { hour12: false })}</span>
                  <span className="text-foreground/60 shrink-0 w-32 truncate">{e.agent}</span>
                  <span className={`uppercase text-[9px] shrink-0 w-16 ${TYPE_COLOR[e.type]}`}>[{e.type}]</span>
                  <span className="text-foreground/85">{e.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Side: live activity log always visible */}
        {tab !== "activity" && (
          <div className="w-72 border-l border-border/40 bg-card/20 flex flex-col">
            <div className="px-3 py-2 border-b border-border/40 text-[10px] uppercase tracking-widest text-foreground/50 flex items-center gap-2">
              <Activity className="w-3 h-3 text-emerald-400 animate-pulse" /> Live Activity
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 text-[10px]">
              {events.slice(-40).reverse().map((e) => (
                <div key={e.id} className="leading-tight">
                  <span className="text-foreground/40 mr-1">{new Date(e.ts).toLocaleTimeString([], { hour12: false })}</span>
                  <span className={TYPE_COLOR[e.type]}>{e.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
