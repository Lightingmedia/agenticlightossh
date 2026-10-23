import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { BrainCircuit, Check, Cpu, GitBranch, Layers, Pause, Play, RotateCcw, ShieldCheck, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";

const stages = [
  { name: "Understand", detail: "AI interprets the workload and its constraints." },
  { name: "Plan", detail: "Capacity, memory, and policy inform the placement plan." },
  { name: "Schedule", detail: "The scheduler selects a suitable compute target." },
  { name: "Route", detail: "A workload route is proposed for your approval." },
  { name: "Approve", detail: "Your approval is required before supported execution." },
  { name: "Deploy", detail: "Illustrative execution → readings return to the agent." },
];

const paths = [
  "M140 90 H250 Q270 90 270 110 V140 Q270 160 290 160 H380",
  "M140 242 H250 Q270 242 270 222 V180 Q270 160 290 160 H380",
  "M380 160 H490 Q510 160 510 140 V110 Q510 90 530 90 H640",
  "M380 160 H490 Q510 160 510 180 V222 Q510 242 530 242 H640",
  "M640 90 H760 Q780 90 780 110 V140 Q780 160 800 160 H880",
  "M640 242 H760 Q780 242 780 222 V180 Q780 160 800 160 H880",
];

export default function WorkloadJourney() {
  const reducedMotion = useReducedMotion();
  const [stage, setStage] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || reducedMotion) return;
    const timer = window.setInterval(() => setStage((value) => (value + 1) % stages.length), 2400);
    return () => window.clearInterval(timer);
  }, [paused, reducedMotion]);

  const current = stages[stage];
  return (
    <div className="workload-journey" aria-label="Illustration of AI workload orchestration">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3 font-mono text-[10px] sm:text-xs">
        <span className="flex items-center gap-2 text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-lightrail" />AURORA FABRIC OS / WORKLOAD FLOW</span>
        <span className="text-muted-foreground shrink-0">ILLUSTRATION · NOT LIVE</span>
      </div>
      <div className="workload-map">
        <svg className="workload-connections" viewBox="0 0 1000 320" preserveAspectRatio="none" aria-hidden="true">
          {paths.map((path, index) => (
            <g key={path}>
              <path d={path} fill="none" className="text-border" stroke="currentColor" strokeWidth="1" />
              <motion.path d={path} fill="none" className={index === 1 ? "text-glow-secondary" : "text-lightrail"} stroke="currentColor" strokeWidth="2" strokeDasharray="6 14"
                animate={{ strokeDashoffset: paused || reducedMotion ? 0 : -80, opacity: stage >= (index < 2 ? 0 : index < 4 ? 2 : 4) ? 0.85 : 0.12 }}
                transition={{ strokeDashoffset: { duration: 3, repeat: paused || reducedMotion ? 0 : Infinity, ease: "linear" }, opacity: { duration: 0.4 } }} />
            </g>
          ))}
          <path d="M880 198 V295 H380 V202" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 6" className="text-glow-secondary/40" />
        </svg>

        <div className="workload-node workload-input">
          <div className="flex items-center gap-2 text-foreground"><Layers className="h-4 w-4 text-glow-secondary" /><span>AI workload</span></div>
          <p>Fine-tune · Serve · Batch</p>
          <div className="mt-3 flex gap-1.5" aria-hidden="true">{[0, 1, 2, 3].map((i) => <motion.span key={i} className="h-1.5 w-6 bg-glow-secondary/50" animate={{ opacity: stage === 0 ? [0.3, 1, 0.3] : 0.35 }} transition={{ duration: 1.8, delay: i * 0.15, repeat: paused || reducedMotion ? 0 : Infinity }} />)}</div>
        </div>
        <div className="workload-node workload-policy">
          <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-glow-secondary" /><span>Your constraints</span></div>
          <p>Memory · Budget · Policy</p>
        </div>
        <div className={`workload-node workload-agent ${stage <= 1 || stage === 5 ? "workload-active" : ""}`}>
          <div className="workload-chip"><BrainCircuit className="h-8 w-8 text-lightrail" /></div>
          <h2 className="text-xl font-bold text-foreground">LightOS</h2>
          <p className="text-lightrail">AI orchestration agent</p>
          <span className="mt-3 block text-[10px] text-muted-foreground">OBSERVE → REASON → PLAN</span>
        </div>
        <div className={`workload-node workload-scheduler ${stage === 2 ? "workload-active" : ""}`}>
          <div className="flex items-center gap-2"><Workflow className="h-4 w-4 text-lightrail" /><span>Schedule</span></div>
          <p>Match capacity & locality</p>
          <span className="workload-status">{stage >= 2 ? "Placement proposed" : "Evaluating targets"}</span>
        </div>
        <div className={`workload-node workload-router ${stage === 3 || stage === 4 ? "workload-active" : ""}`}>
          <div className="flex items-center gap-2"><GitBranch className="h-4 w-4 text-glow-secondary" /><span>Route</span></div>
          <p>Workload → compute target</p>
          <span className="workload-status">{stage >= 4 ? "Approval gate" : "Route proposed"}</span>
        </div>
        <div className={`workload-node workload-target ${stage === 5 ? "workload-active" : ""}`}>
          <Cpu className={`h-8 w-8 mb-3 ${stage === 5 ? "text-lightrail" : "text-muted-foreground"}`} />
          <span>Your GPUs</span>
          <p>Owned or rented</p>
          <span className="workload-status flex items-center justify-center gap-1">{stage === 5 && <Check className="h-3 w-3" />}{stage === 5 ? "Demo deployment" : "Awaiting plan"}</span>
        </div>
        <span className="workload-feedback font-mono text-[10px] text-glow-secondary">TELEMETRY FEEDBACK → AGENT</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
        <div className="flex flex-wrap gap-1" aria-label="Workload stages">
          {stages.map((item, index) => <Button key={item.name} variant="ghost" size="sm" aria-pressed={stage === index} onClick={() => { setStage(index); setPaused(true); }} className={`h-7 px-2 text-[10px] font-mono gap-1.5 ${stage === index ? "bg-lightrail/10 text-lightrail" : "text-muted-foreground"}`}><span className="opacity-50">0{index + 1}</span>{item.name}</Button>)}
        </div>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" aria-label={paused ? "Play animation" : "Pause animation"} title={paused ? "Play animation" : "Pause animation"} onClick={() => setPaused((value) => !value)}>{paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}</Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" aria-label="Restart animation" title="Restart animation" onClick={() => { setStage(0); setPaused(false); }}><RotateCcw className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
      <p className="mt-2 min-h-[32px] sm:min-h-[18px] text-xs text-muted-foreground">{current.detail}</p>
    </div>
  );
}