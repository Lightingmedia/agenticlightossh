import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { ArrowRight, Terminal, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ScrollReveal } from "@/components/ui/parallax-section";

// ─── Simulated onboard terminal lines ────────────────────────────────────────
const ONBOARD_LINES = [
  { delay: 0,    type: "cmd",     text: "curl -fsSL https://agentic.lightos.sh | bash" },
  { delay: 900,  type: "info",    text: "  ▸  Detecting environment…" },
  { delay: 1400, type: "ok",      text: "  ✓  Platform: linux (x86_64)" },
  { delay: 1800, type: "ok",      text: "  ✓  Python 3.12.2" },
  { delay: 2200, type: "ok",      text: "  ✓  LightOS CLI installed" },
  { delay: 2700, type: "banner",  text: "  ╔══════════════════════════════╗" },
  { delay: 2750, type: "banner",  text: "  ║  ✓  LightOS installed!       ║" },
  { delay: 2800, type: "banner",  text: "  ╚══════════════════════════════╝" },
  { delay: 3200, type: "blank",   text: "" },
  { delay: 3500, type: "cmd",     text: "lightos onboard" },
  { delay: 4100, type: "step",    text: "  [1/6]  Scanning photonic fabric topology…" },
  { delay: 4800, type: "ok",      text: "  ✓  Detected 20-layer NCE, 64 WDM channels" },
  { delay: 5300, type: "step",    text: "  [2/6]  Generating topology fingerprint…" },
  { delay: 5900, type: "ok",      text: "  ✓  Fingerprint: a3f8c91d…e72b0045" },
  { delay: 6400, type: "step",    text: "  [3/6]  Running Topology-Aware Router…" },
  { delay: 7100, type: "ok",      text: "  ✓  Dijkstra solved (1 280-node graph)" },
  { delay: 7400, type: "ok",      text: "  ✓  Hungarian assignment: n=64 → optimal" },
  { delay: 7900, type: "step",    text: "  [4/6]  Framework adapter…" },
  { delay: 8400, type: "ok",      text: "  ✓  PyTorch detected → torch.fx adapter" },
  { delay: 8900, type: "step",    text: "  [5/6]  Registering photonic agent…" },
  { delay: 9400, type: "ok",      text: "  ✓  agent-a9f2k1 on Layer 1 / WDM Ch 0" },
  { delay: 9900, type: "step",    text: "  [6/6]  Finalising…" },
  { delay: 10300, type: "banner", text: "  ╔══════════════════════════════╗" },
  { delay: 10350, type: "banner", text: "  ║  ✓  Onboarding complete!     ║" },
  { delay: 10400, type: "banner", text: "  ╚══════════════════════════════╝" },
  { delay: 10700, type: "hint",   text: "  Next: lightos status  |  lightos agents" },
];

function TerminalLine({ line }: { line: typeof ONBOARD_LINES[0] }) {
  const colours: Record<string, string> = {
    cmd:    "text-cyan-300",
    info:   "text-muted-foreground",
    ok:     "text-green-400",
    step:   "text-primary",
    banner: "text-green-400 font-bold",
    hint:   "text-primary/70",
    blank:  "",
  };
  const prefix = line.type === "cmd"
    ? <span className="text-muted-foreground mr-2">~</span>
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className={`font-mono text-sm leading-relaxed ${colours[line.type] ?? "text-foreground"}`}
    >
      {prefix}{line.text}
    </motion.div>
  );
}

// ─── Steps summary beside the terminal ───────────────────────────────────────
const STEPS = [
  { label: "Installer", desc: "One curl command — auto-detects OS and Python" },
  { label: "Fabric Scan", desc: "Maps your 20-layer photonic NCE topology" },
  { label: "Fingerprint", desc: "SHA-256 cryptographic stamp of fabric state" },
  { label: "TAR Routing", desc: "Dijkstra + congestion-penalised WDM assignment" },
  { label: "Framework", desc: "PyTorch FX or JAX JAXPR adapter, auto-detected" },
  { label: "First Agent", desc: "Photonic fabric agent registered and running" },
];

const OnboardSection = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start end", "end start"] });
  const backgroundY = useTransform(scrollYProgress, [0, 1], ["-5%", "5%"]);

  const [visibleLines, setVisibleLines] = useState<typeof ONBOARD_LINES>([]);
  const [playing, setPlaying] = useState(false);
  const [done, setDone] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [visibleLines]);

  const startDemo = () => {
    if (playing) return;
    setPlaying(true);
    setDone(false);
    setVisibleLines([]);

    ONBOARD_LINES.forEach((line) => {
      setTimeout(() => {
        setVisibleLines((prev) => [...prev, line]);
        if (line === ONBOARD_LINES[ONBOARD_LINES.length - 1]) {
          setDone(true);
          setPlaying(false);
        }
      }, line.delay);
    });
  };

  return (
    <section ref={containerRef} className="py-24 border-t border-border relative overflow-hidden">
      {/* Parallax background */}
      <motion.div className="absolute inset-0 grid-pattern opacity-10" style={{ y: backgroundY }} />
      <motion.div
        className="absolute top-1/2 left-0 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl pointer-events-none"
        style={{ y: useTransform(scrollYProgress, [0, 1], [80, -80]) }}
      />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <ScrollReveal className="text-center mb-16">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full border border-border bg-card/50">
            <Terminal className="w-3.5 h-3.5 text-primary" />
            <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
              One-Command Onboarding
            </span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold font-mono mb-4">
            <span className="text-foreground">From Zero to </span>
            <span className="text-gradient glow-text">Photonic AI</span>
            <br />
            <span className="text-foreground">in Seconds</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            One <code className="text-primary bg-primary/10 px-1 rounded">curl</code> command installs the LightOS CLI.
            Then <code className="text-primary bg-primary/10 px-1 rounded">lightos onboard</code> fingerprints your
            photonic fabric, assigns WDM channels, and registers your first AI agent.
          </p>
        </ScrollReveal>

        <div className="grid lg:grid-cols-2 gap-10 items-start max-w-6xl mx-auto">
          {/* Left — animated terminal */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {/* Terminal window */}
            <div className="terminal-window overflow-hidden shadow-2xl shadow-primary/10">
              {/* Chrome bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card/50">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/70" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                  <div className="w-3 h-3 rounded-full bg-green-500/70" />
                </div>
                <span className="ml-4 font-mono text-xs text-muted-foreground">
                  ubuntu@lightos-node: ~
                </span>
                <div className="ml-auto flex items-center gap-2">
                  {playing && (
                    <span className="flex items-center gap-1 text-xs font-mono text-primary">
                      <Loader2 className="w-3 h-3 animate-spin" /> running…
                    </span>
                  )}
                  {done && (
                    <span className="flex items-center gap-1 text-xs font-mono text-green-400">
                      <CheckCircle2 className="w-3 h-3" /> done
                    </span>
                  )}
                </div>
              </div>

              {/* Terminal body */}
              <div
                ref={terminalRef}
                className="p-4 min-h-[380px] max-h-[420px] overflow-y-auto bg-gradient-to-br from-background via-card/40 to-background space-y-1"
              >
                <AnimatePresence initial={false}>
                  {visibleLines.map((line, i) => (
                    <TerminalLine key={i} line={line} />
                  ))}
                </AnimatePresence>

                {/* Idle placeholder */}
                {!playing && !done && visibleLines.length === 0 && (
                  <div className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
                    <span>~</span>
                    <motion.span
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >▌</motion.span>
                  </div>
                )}

                {/* Cursor after done */}
                {done && (
                  <div className="flex items-center gap-2 font-mono text-sm text-muted-foreground mt-1">
                    <span>~</span>
                    <motion.span
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >▌</motion.span>
                  </div>
                )}
              </div>

              {/* Play / replay button */}
              <div className="px-4 py-3 border-t border-border bg-card/30 flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground">
                  Interactive demo — click to run
                </span>
                <button
                  onClick={startDemo}
                  disabled={playing}
                  className={`px-3 py-1.5 rounded font-mono text-xs transition-all ${
                    playing
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                >
                  {done ? "▶ Replay" : playing ? "Running…" : "▶ Run Demo"}
                </button>
              </div>
            </div>
          </motion.div>

          {/* Right — steps */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="space-y-4"
          >
            {STEPS.map((step, i) => (
              <motion.div
                key={step.label}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card/30 hover:border-primary/40 hover:bg-card/60 transition-all group"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-mono text-sm font-bold group-hover:bg-primary/20 transition-colors">
                  {i + 1}
                </div>
                <div>
                  <div className="font-mono font-bold text-sm text-foreground mb-0.5">{step.label}</div>
                  <div className="text-muted-foreground text-sm">{step.desc}</div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-primary/30 group-hover:text-primary ml-auto mt-0.5 transition-colors flex-shrink-0" />
              </motion.div>
            ))}

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.5 }}
              className="pt-4 flex flex-col sm:flex-row gap-3"
            >
              <Link to="/onboard" className="flex-1">
                <Button size="lg" className="w-full font-mono bg-primary text-primary-foreground hover:bg-primary/90 group">
                  Open Onboard Wizard
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/docs" className="flex-1">
                <Button size="lg" variant="outline" className="w-full font-mono border-border hover:border-primary/50">
                  Read the Docs
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default OnboardSection;
