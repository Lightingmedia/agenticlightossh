import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  Loader2,
  Terminal,
  Layers,
  Cpu,
  Zap,
  Network,
  Bot,
  ArrowRight,
  Copy,
  Check,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

// ─── Wizard step definitions ─────────────────────────────────────────────────
const WIZARD_STEPS = [
  {
    id: "install",
    icon: Terminal,
    title: "Install LightOS",
    subtitle: "One-command setup",
    description: "Copy and run the install script in your terminal. It detects your OS, installs the CLI, and configures your PATH automatically.",
  },
  {
    id: "fabric",
    icon: Layers,
    title: "Fabric Scan",
    subtitle: "Photonic topology detection",
    description: "LightOS scans and maps your 20-layer photonic NCE fabric, measuring WDM channel availability and hop latencies.",
  },
  {
    id: "fingerprint",
    icon: Cpu,
    title: "Topology Fingerprint",
    subtitle: "Cryptographic fabric stamp",
    description: "A SHA-256 digest of your 20×64 utilisation matrix is computed, enabling deterministic route caching and congestion auditability.",
  },
  {
    id: "routing",
    icon: Network,
    title: "TAR + Scheduling",
    subtitle: "Mathematically optimal routing",
    description: "The Topology-Aware Router (TAR) runs Dijkstra with congestion-penalised weights. The Mathematical Scheduler assigns WDM channels using the Hungarian algorithm (n≤64).",
  },
  {
    id: "framework",
    icon: Zap,
    title: "Framework Adapter",
    subtitle: "PyTorch · JAX · Native",
    description: "LightOS detects your installed framework and wires up the right adapter — torch.fx symbolic trace for PyTorch, jax.make_jaxpr for JAX.",
  },
  {
    id: "agent",
    icon: Bot,
    title: "First Agent",
    subtitle: "Photonic fabric agent deployed",
    description: "Your first agentic worker is registered on the photonic fabric, pinned to a WDM channel and NCE layer, ready to accept inference tasks.",
  },
];

// ─── Simulated log lines per step ────────────────────────────────────────────
const STEP_LOGS: Record<string, { type: string; text: string; delay: number }[]> = {
  install: [
    { type: "cmd",  text: "curl -fsSL https://agentic.lightos.sh | bash", delay: 0 },
    { type: "info", text: "  ▸  Detecting environment…", delay: 600 },
    { type: "ok",   text: "  ✓  Platform: linux (x86_64)", delay: 1100 },
    { type: "ok",   text: "  ✓  Python 3.12.2 found", delay: 1500 },
    { type: "info", text: "  ▸  Installing LightOS CLI…", delay: 1900 },
    { type: "ok",   text: "  ✓  LightOS v0.2.0 installed", delay: 2600 },
    { type: "ok",   text: "  ✓  PATH configured in ~/.bashrc", delay: 3000 },
  ],
  fabric: [
    { type: "cmd",  text: "lightos onboard", delay: 0 },
    { type: "step", text: "  [1/6]  Scanning photonic fabric topology…", delay: 600 },
    { type: "info", text: "  ▸  Probing 20 fabric layers…", delay: 1200 },
    { type: "ok",   text: "  ✓  Layers 1–5   : Ternary compute (TDOT/TADD)", delay: 1800 },
    { type: "ok",   text: "  ✓  Layers 6–7   : Analog wave (MZI arrays)", delay: 2100 },
    { type: "ok",   text: "  ✓  Layer 19     : Global collective backbone", delay: 2400 },
    { type: "ok",   text: "  ✓  64 WDM channels detected (193.1–196.0 THz)", delay: 2900 },
  ],
  fingerprint: [
    { type: "step", text: "  [2/6]  Generating topology fingerprint…", delay: 0 },
    { type: "info", text: "  ▸  Serialising 20×64 utilisation matrix…", delay: 500 },
    { type: "info", text: "  ▸  Serialising hop latency matrix…", delay: 900 },
    { type: "info", text: "  ▸  Computing SHA-256…", delay: 1300 },
    { type: "ok",   text: "  ✓  Fingerprint: a3f8c91d4b2e7f05…e72b0045", delay: 1900 },
    { type: "ok",   text: "  ✓  Cache: 0 entries (cold start)", delay: 2300 },
    { type: "ok",   text: "  ✓  Congestion score: 0.14", delay: 2700 },
  ],
  routing: [
    { type: "step", text: "  [3/6]  Running Topology-Aware Router (TAR)…", delay: 0 },
    { type: "info", text: "  ▸  Building fabric graph (1 280 nodes)…", delay: 500 },
    { type: "ok",   text: "  ✓  Intra-layer edges: 1 216", delay: 1000 },
    { type: "ok",   text: "  ✓  Inter-layer edges:   380", delay: 1300 },
    { type: "info", text: "  ▸  Dijkstra shortest-path…", delay: 1700 },
    { type: "ok",   text: "  ✓  Routes solved — mathematically optimal", delay: 2300 },
    { type: "info", text: "  ▸  Hungarian WDM assignment (n=64)…", delay: 2700 },
    { type: "ok",   text: "  ✓  All 64 channels assigned — min-cost matching", delay: 3300 },
  ],
  framework: [
    { type: "step", text: "  [4/6]  Selecting framework adapter…", delay: 0 },
    { type: "info", text: "  ▸  Probing Python environment…", delay: 500 },
    { type: "ok",   text: "  ✓  torch 2.4.0 detected", delay: 1100 },
    { type: "info", text: "  ▸  Initialising torch.fx symbolic trace…", delay: 1500 },
    { type: "ok",   text: "  ✓  PyTorch adapter ready", delay: 2100 },
    { type: "info", text: "  ▸  Mapping aten:: ops → LightRail IR…", delay: 2500 },
    { type: "ok",   text: "  ✓  Op map: mm→MATMUL  add→FADD  sum→ALL_REDUCE", delay: 3000 },
  ],
  agent: [
    { type: "step", text: "  [5/6]  Registering photonic fabric agent…", delay: 0 },
    { type: "info", text: "  ▸  Generating agent ID…", delay: 500 },
    { type: "ok",   text: "  ✓  agent-a9f2k1 created", delay: 1000 },
    { type: "ok",   text: "  ✓  Pinned: Layer 1 / WDM Ch 0 (193.10 THz)", delay: 1400 },
    { type: "step", text: "  [6/6]  Finalising…", delay: 1900 },
    { type: "banner",text: "  ╔══════════════════════════════╗", delay: 2500 },
    { type: "banner",text: "  ║  ✓  Onboarding complete!     ║", delay: 2550 },
    { type: "banner",text: "  ╚══════════════════════════════╝", delay: 2600 },
    { type: "hint",  text: "  lightos status  |  lightos agents", delay: 3000 },
  ],
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function LogLine({ line }: { line: { type: string; text: string } }) {
  const cls: Record<string, string> = {
    cmd:    "text-cyan-300",
    info:   "text-muted-foreground",
    ok:     "text-green-400",
    step:   "text-primary font-semibold",
    banner: "text-green-400 font-bold",
    hint:   "text-primary/70",
  };
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15 }}
      className={`font-mono text-xs leading-relaxed ${cls[line.type] ?? "text-foreground"}`}
    >
      {line.type === "cmd" && <span className="text-muted-foreground mr-2">~</span>}
      {line.text}
    </motion.div>
  );
}

function StepIndicator({
  step,
  index,
  currentStep,
  completedSteps,
}: {
  step: typeof WIZARD_STEPS[0];
  index: number;
  currentStep: number;
  completedSteps: Set<number>;
}) {
  const isCompleted = completedSteps.has(index);
  const isCurrent = currentStep === index;
  const Icon = step.icon;

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg transition-all cursor-pointer ${
      isCurrent ? "bg-primary/10 border border-primary/30" :
      isCompleted ? "opacity-70" : "opacity-40"
    }`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
        isCompleted ? "bg-green-500/20 text-green-400" :
        isCurrent ? "bg-primary/20 text-primary" :
        "bg-card border border-border text-muted-foreground"
      }`}>
        {isCompleted
          ? <CheckCircle2 className="w-4 h-4" />
          : isCurrent
            ? <Icon className="w-4 h-4" />
            : <Circle className="w-4 h-4" />
        }
      </div>
      <div className="min-w-0">
        <div className={`font-mono text-sm font-bold ${isCurrent ? "text-foreground" : "text-muted-foreground"}`}>
          {step.title}
        </div>
        <div className="font-mono text-xs text-muted-foreground">{step.subtitle}</div>
      </div>
      {isCurrent && <ChevronRight className="w-4 h-4 text-primary ml-auto mt-1 flex-shrink-0" />}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
const Onboard = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [runningStep, setRunningStep] = useState<number | null>(null);
  const [visibleLogs, setVisibleLogs] = useState<{ type: string; text: string }[]>([]);
  const [copied, setCopied] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const step = WIZARD_STEPS[currentStep];
  const Icon = step.icon;

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [visibleLogs]);

  // Clear all pending timeouts
  const clearTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  const runStep = (stepIndex: number) => {
    if (runningStep !== null) return;
    clearTimeouts();
    setVisibleLogs([]);
    setRunningStep(stepIndex);
    const stepId = WIZARD_STEPS[stepIndex].id;
    const lines = STEP_LOGS[stepId] ?? [];
    const maxDelay = Math.max(...lines.map((l) => l.delay), 0);

    lines.forEach((line) => {
      const t = setTimeout(() => {
        setVisibleLogs((prev) => [...prev, { type: line.type, text: line.text }]);
      }, line.delay);
      timeoutsRef.current.push(t);
    });

    const done = setTimeout(() => {
      setCompletedSteps((prev) => new Set([...prev, stepIndex]));
      setRunningStep(null);
      if (stepIndex < WIZARD_STEPS.length - 1) {
        setCurrentStep(stepIndex + 1);
      } else {
        setAllDone(true);
      }
    }, maxDelay + 600);
    timeoutsRef.current.push(done);
  };

  // Auto-run when step changes (except initial load)
  const hasAutoRunRef = useRef(false);
  const handleNext = () => {
    if (runningStep !== null) return;
    runStep(currentStep);
    hasAutoRunRef.current = true;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText("curl -fsSL https://agentic.lightos.sh | bash");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-mono text-base font-bold">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Layers className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span>LightOS</span>
            <span className="text-muted-foreground font-normal">/ onboard</span>
          </Link>
          <div className="hidden sm:flex items-center gap-4 font-mono text-xs text-muted-foreground">
            <span>{completedSteps.size}/{WIZARD_STEPS.length} steps complete</span>
            <div className="w-32 h-1.5 bg-border rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                animate={{ width: `${(completedSteps.size / WIZARD_STEPS.length) * 100}%` }}
                transition={{ type: "spring", stiffness: 120 }}
              />
            </div>
          </div>
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="font-mono text-xs">
              Skip to Dashboard
            </Button>
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 max-w-6xl">
        {!allDone ? (
          <div className="grid lg:grid-cols-[280px_1fr] gap-8">
            {/* Left sidebar — step list */}
            <div className="space-y-2">
              <div className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-4">
                Onboarding Steps
              </div>
              {WIZARD_STEPS.map((s, i) => (
                <StepIndicator
                  key={s.id}
                  step={s}
                  index={i}
                  currentStep={currentStep}
                  completedSteps={completedSteps}
                />
              ))}
            </div>

            {/* Right — main content */}
            <div className="space-y-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Step header */}
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                        Step {currentStep + 1} of {WIZARD_STEPS.length}
                      </div>
                      <h1 className="text-2xl font-bold font-mono text-foreground">{step.title}</h1>
                      <p className="text-muted-foreground text-sm mt-1">{step.description}</p>
                    </div>
                  </div>

                  {/* Special install step — show copy box */}
                  {step.id === "install" && (
                    <div className="mb-6 space-y-3">
                      {/* curl command */}
                      <div className="terminal-window overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-card/50 font-mono text-xs text-muted-foreground">
                          macOS / Linux
                        </div>
                        <div className="px-4 py-3 flex items-center justify-between gap-4">
                          <code className="font-mono text-sm text-cyan-300 flex-1">
                            <span className="text-muted-foreground mr-2">~</span>
                            curl -fsSL https://agentic.lightos.sh | bash
                          </code>
                          <button
                            onClick={handleCopy}
                            className="text-muted-foreground hover:text-foreground transition-colors p-1.5"
                          >
                            {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      {/* onboard command */}
                      <div className="terminal-window overflow-hidden">
                        <div className="px-4 py-3 flex items-center gap-2">
                          <code className="font-mono text-sm text-green-400">
                            <span className="text-muted-foreground mr-2">~</span>
                            lightos onboard
                          </code>
                          <motion.span
                            animate={{ opacity: [1, 0, 1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                            className="text-primary"
                          >▌</motion.span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Terminal output */}
                  <div className="terminal-window overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card/50">
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                      </div>
                      <span className="ml-3 font-mono text-xs text-muted-foreground">lightos — terminal</span>
                      {runningStep === currentStep && (
                        <span className="ml-auto flex items-center gap-1 font-mono text-xs text-primary">
                          <Loader2 className="w-3 h-3 animate-spin" /> running
                        </span>
                      )}
                      {completedSteps.has(currentStep) && (
                        <span className="ml-auto flex items-center gap-1 font-mono text-xs text-green-400">
                          <CheckCircle2 className="w-3 h-3" /> done
                        </span>
                      )}
                    </div>

                    <div
                      ref={terminalRef}
                      className="p-4 min-h-[240px] max-h-[280px] overflow-y-auto bg-gradient-to-br from-background via-card/40 to-background space-y-1"
                    >
                      <AnimatePresence initial={false}>
                        {visibleLogs.map((l, i) => (
                          <LogLine key={i} line={l} />
                        ))}
                      </AnimatePresence>
                      {runningStep === null && visibleLogs.length === 0 && (
                        <div className="font-mono text-xs text-muted-foreground flex items-center gap-1">
                          <span>~</span>
                          <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1, repeat: Infinity }}>▌</motion.span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action button */}
                  <div className="mt-6 flex items-center gap-4">
                    <Button
                      size="lg"
                      onClick={handleNext}
                      disabled={runningStep !== null || completedSteps.has(currentStep)}
                      className="font-mono bg-primary text-primary-foreground hover:bg-primary/90 group disabled:opacity-50"
                    >
                      {runningStep === currentStep
                        ? <><Loader2 className="mr-2 w-4 h-4 animate-spin" /> Running…</>
                        : completedSteps.has(currentStep)
                          ? <><CheckCircle2 className="mr-2 w-4 h-4" /> Completed</>
                          : <>
                              Run Step {currentStep + 1}
                              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </>
                      }
                    </Button>
                    {completedSteps.has(currentStep) && currentStep < WIZARD_STEPS.length - 1 && (
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => setCurrentStep(currentStep + 1)}
                        className="font-mono border-border"
                      >
                        Next Step
                        <ChevronRight className="ml-2 w-4 h-4" />
                      </Button>
                    )}
                    {completedSteps.has(currentStep) && currentStep === WIZARD_STEPS.length - 1 && (
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => setAllDone(true)}
                        className="font-mono border-border"
                      >
                        Finish
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        ) : (
          /* ─── All done screen ─────────────────────────────────────────── */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl mx-auto text-center py-16"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
              className="w-20 h-20 rounded-2xl bg-green-500/10 text-green-400 flex items-center justify-center mx-auto mb-8"
            >
              <CheckCircle2 className="w-10 h-10" />
            </motion.div>

            <h1 className="text-3xl md:text-4xl font-bold font-mono mb-4">
              <span className="text-gradient glow-text">Onboarding Complete!</span>
            </h1>
            <p className="text-muted-foreground mb-2">
              Your photonic NCE fabric is mapped, fingerprinted, and ready.
              Your first agentic worker is running.
            </p>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-4 my-8">
              {[
                { label: "WDM Channels", value: "64" },
                { label: "Fabric Layers", value: "20" },
                { label: "Active Agents", value: "1" },
              ].map((s) => (
                <div key={s.label} className="p-4 rounded-xl border border-border bg-card/30">
                  <div className="text-2xl font-bold font-mono text-primary">{s.value}</div>
                  <div className="text-xs text-muted-foreground font-mono mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Terminal snippet */}
            <div className="terminal-window text-left mb-8">
              <div className="px-4 py-2 border-b border-border bg-card/50 font-mono text-xs text-muted-foreground">
                Next commands
              </div>
              <div className="px-4 py-3 space-y-1 font-mono text-sm">
                <div><span className="text-muted-foreground mr-2">~</span><span className="text-cyan-300">lightos status</span></div>
                <div><span className="text-muted-foreground mr-2">~</span><span className="text-cyan-300">lightos agents</span></div>
                <div><span className="text-muted-foreground mr-2">~</span><span className="text-cyan-300">lightos fingerprint</span></div>
                <div><span className="text-muted-foreground mr-2">~</span><span className="text-cyan-300">lightos compile model.py::my_kernel</span></div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/dashboard">
                <Button size="lg" className="font-mono bg-primary text-primary-foreground hover:bg-primary/90 group">
                  Open Dashboard
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/docs">
                <Button size="lg" variant="outline" className="font-mono border-border">
                  Read the Docs
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Onboard;
