import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers,
  Zap,
  Network,
  Cpu,
  ArrowRight,
  Copy,
  Check,
  Play,
  Code2,
  BarChart3,
  GitBranch,
  Terminal,
  ChevronDown,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import WorkflowAnimation from "@/components/landing/WorkflowAnimation";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ui/parallax-section";

// ─── Pipeline stages ──────────────────────────────────────────────────────────
const PIPELINE_STAGES = [
  {
    num: 1,
    label: "AST Parsing & IR",
    icon: Code2,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    desc: "Python function → Static Single Assignment IR. Uniquified SSA names, typed instructions, phi nodes.",
  },
  {
    num: 2,
    label: "Type Inference & Lowering",
    icon: GitBranch,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    desc: "Forward dataflow propagation resolves TERNARY, ANALOG, FP32 types. Dead-code elimination.",
  },
  {
    num: 3,
    label: "Photonic Optimisation",
    icon: Zap,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    desc: "FMUL+FADD → FMA fusion. Loop tiling with PREFETCH distance=2. Alias analysis.",
  },
  {
    num: 4,
    label: "WDM & Wavelength Mapping",
    icon: Network,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    desc: "Topology-Aware Router (Dijkstra). Hungarian WDM assignment (n≤64). Topology fingerprint stamped.",
  },
  {
    num: 5,
    label: "Tile Bytecode & Fat Binary",
    icon: Layers,
    color: "text-primary",
    bg: "bg-primary/10",
    desc: "Graph partitioned across 20 NCE tiles. .lrbs bytecode serialised. .lrfat multi-gen bundle.",
  },
  {
    num: 6,
    label: "Fabric OS Handoff",
    icon: Cpu,
    color: "text-green-400",
    bg: "bg-green-500/10",
    desc: "KernelDescriptor dispatched. <100 ns optical dispatch. UNIX socket IPC with real daemon.",
  },
];

// ─── Code examples ────────────────────────────────────────────────────────────
const CODE_EXAMPLES = [
  {
    id: "jit",
    label: "@lightrail.jit",
    code: `import lightrail

@lightrail.jit(
    num_wdm_channels=64,
    enable_fma=True,
    enable_tar=True,          # Topology-Aware Router
    enable_math_sched=True,   # Hungarian scheduling
    mode="jit",
)
def attention_kernel(
    q: "fp32[1024,64]",
    k: "fp32[1024,64]",
    v: "fp32[1024,64]",
) -> "fp32[1024,64]":
    scores = matmul(q, k)     # → MATMUL opcode
    scores = scores * 0.125   # → FMUL (fused)
    weights = softmax(scores) # → dispatched on WDM Ch 0
    return matmul(weights, v)

# Cache-miss: compiles in ~2ms
out = attention_kernel(q, k, v)

# Cache-hit: <200 ns overhead
out = attention_kernel(q, k, v)`,
  },
  {
    id: "pytorch",
    label: "PyTorch Adapter",
    code: `import lightrail
from lightrail.adapters import PyTorchAdapter
import torch.nn as nn

# Compile an existing nn.Module — no source changes
model = nn.TransformerEncoderLayer(d_model=512, nhead=8)

stack = lightrail.IntelligenceStack()
result = stack.compile_framework_model(
    model,
    example_inputs=[torch.randn(32, 128, 512)],
    framework="pytorch",
)

print(result.summary())
# topology_fingerprint : a3f8c91d…
# wdm_channels         : 64
# mathematically_optimal: True
# solver               : HungarianSolver
# bypasses_electrical_io_wall: True`,
  },
  {
    id: "stack",
    label: "Intelligence Stack",
    code: `from lightrail.intelligence.stack import LightRailIntelligenceStack
from lightrail.topology.fingerprint import FabricTopologyState
import numpy as np

# Wire up a custom fabric topology
state = FabricTopologyState(
    utilisation=np.random.uniform(0.1, 0.6, (20, 64)),
    hop_latency_ns=np.random.uniform(0.5, 5.0, (20, 64)),
    remaining_bw_gbps=np.full((20, 64), 400.0),
)

stack = LightRailIntelligenceStack()
stack.update_topology(state)

# Fingerprint for audit / caching
fp = stack.fingerprint()
print(f"Fingerprint : {fp.digest}")
print(f"Congestion  : {fp.congestion_score():.3f}")

# Compile a function
result = stack.compile_function(my_kernel)
report = stack.congestion_report()`,
  },
];

// ─── Features grid ────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Network,
    title: "Topology-Aware Router",
    tag: "TAR",
    desc: "Dijkstra shortest-path on the 1 280-node (20×64) fabric graph with congestion-penalised edge weights. Mathematically provable optimal routes.",
  },
  {
    icon: BarChart3,
    title: "Hungarian WDM Scheduler",
    tag: "Math Optimal",
    desc: "Hungarian algorithm for n≤64 instructions → 64 WDM channels. Critical-path topological scheduler for larger graphs. Zero heuristics.",
  },
  {
    icon: Zap,
    title: "Ternary & Analog Native",
    tag: "Photonic",
    desc: "TDOT/TADD ops packed to 2 bits/symbol. MZI phase φ=2·arccos(√|w|) for analog weights. Layers 1–5 ternary, 6–7 analog wave.",
  },
  {
    icon: GitBranch,
    title: "Framework Adapters",
    tag: "PyTorch · JAX",
    desc: "torch.fx.symbolic_trace and jax.make_jaxpr extract computation graphs without modifying your model. Zero source changes required.",
  },
  {
    icon: Cpu,
    title: "Topology Fingerprint",
    tag: "SHA-256",
    desc: "Cryptographic SHA-256 stamp of the 20×64 utilisation + hop-latency matrix. Enables deterministic route caching and congestion auditability.",
  },
  {
    icon: Layers,
    title: "Fat Binary (.lrfat)",
    tag: "Multi-Gen",
    desc: "Multi-generation bundle: host code + .lrbs per NCE generation. JSON manifest + CRC32 integrity. AOT .lrnpu for production deploy.",
  },
];

// ─── Fabric presets (mirrored from backend for instant UI — fetched on mount) ──
const DEFAULT_FABRICS = [
  { name: "photonic-mesh-20x64", display: "Photonic Mesh 20×64 (default)", wdm_channels: 64 },
  { name: "photonic-mesh-40x32", display: "Photonic Mesh 40×32",           wdm_channels: 32 },
  { name: "ring-topology-16x128",display: "Ring 16×128",                   wdm_channels: 128 },
  { name: "butterfly-8x256",     display: "Butterfly 8×256",               wdm_channels: 256 },
  { name: "fat-tree-32x64",      display: "Fat-Tree 32×64",                wdm_channels: 64 },
];

const KERNEL_SUGGESTIONS = [
  "attention_kernel",
  "conv_layer",
  "linear_layer",
  "gpt_block",
  "transformer_encoder",
  "softmax",
  "matmul",
];

type LogLine = { type: string; text: string; stage?: number | null };

type CompileMeta = {
  compile_ms: number;
  cached: boolean;
  wdm_channels: number;
  dispatch_ns: number;
  fingerprint: string;
  fabric: string;
};

// ─── Compiler output terminal ─────────────────────────────────────────────────
function CompilerTerminal() {
  const [running, setRunning]         = useState(false);
  const [lines, setLines]             = useState<LogLine[]>([]);
  const [done, setDone]               = useState(false);
  const [meta, setMeta]               = useState<CompileMeta | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [fabric, setFabric]           = useState("photonic-mesh-20x64");
  const [customFabric, setCustomFabric] = useState("");
  const [fnName, setFnName]           = useState("attention_kernel");
  const [cached, setCached]           = useState(false);
  const [fabrics, setFabrics]         = useState(DEFAULT_FABRICS);
  const [backendUp, setBackendUp]     = useState<boolean | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Fetch fabric list + ping backend on mount
  useEffect(() => {
    fetch("/api/compile/ping")
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then(() => setBackendUp(true))
      .catch(() => setBackendUp(false));

    fetch("/api/fabrics")
      .then((r) => r.json())
      .then((data: typeof DEFAULT_FABRICS) => setFabrics(data))
      .catch(() => {/* keep defaults */});
  }, []);

  const effectiveFabric = fabric === "__custom__" ? customFabric.trim() || "photonic-mesh-20x64" : fabric;

  const run = async () => {
    if (running) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setRunning(true);
    setDone(false);
    setError(null);
    setMeta(null);
    setLines([]);

    try {
      const res = await fetch("/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fabric: effectiveFabric, function_name: fnName, cached }),
        signal: ctrl.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { value, done: rdDone } = await reader.read();
        if (rdDone) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          const dataLine = part.trim().replace(/^data: /, "");
          if (dataLine === "[DONE]") { setDone(true); continue; }
          if (!dataLine) continue;
          try {
            const obj = JSON.parse(dataLine) as LogLine & { meta?: CompileMeta };
            if (obj.type === "done") {
              if (obj.meta) setMeta(obj.meta);
              setDone(true);
            } else {
              setLines((p) => [...p, obj]);
              if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (e: unknown) {
      if ((e as { name?: string }).name !== "AbortError") {
        setError("Backend unreachable — is `uvicorn main:app --port 8000` running?");
      }
    } finally {
      setRunning(false);
    }
  };

  const colourCls: Record<string, string> = {
    cmd:    "text-cyan-300",
    info:   "text-muted-foreground",
    ok:     "text-green-400",
    step:   "text-primary font-semibold",
    banner: "text-yellow-300",
    done:   "text-green-400",
  };

  return (
    <div className="terminal-window overflow-hidden shadow-2xl shadow-primary/10 flex flex-col">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card/50">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/70" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
          <div className="w-3 h-3 rounded-full bg-green-500/70" />
        </div>
        <span className="ml-3 font-mono text-xs text-muted-foreground">lightos — LightRail compiler</span>
        <div className="ml-auto flex items-center gap-2">
          {backendUp === true  && <span className="font-mono text-[10px] text-green-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />backend online</span>}
          {backendUp === false && <span className="font-mono text-[10px] text-yellow-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />backend offline</span>}
          {running && <span className="font-mono text-xs text-primary animate-pulse">compiling…</span>}
          {done    && <span className="font-mono text-xs text-green-400">✓ compiled</span>}
        </div>
      </div>

      {/* Controls bar */}
      <div className="px-4 py-3 border-b border-border bg-card/30 flex flex-wrap gap-3 items-end">
        {/* Fabric selector */}
        <div className="flex flex-col gap-1">
          <label className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Fabric</label>
          <div className="relative">
            <select
              value={fabric}
              onChange={(e) => setFabric(e.target.value)}
              disabled={running}
              className="font-mono text-xs bg-card border border-border rounded px-2 py-1.5 pr-6 text-foreground appearance-none focus:outline-none focus:border-primary/60 disabled:opacity-50"
            >
              {fabrics.map((f) => (
                <option key={f.name} value={f.name}>{f.display}</option>
              ))}
              <option value="__custom__">Custom…</option>
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* Custom fabric input */}
        {fabric === "__custom__" && (
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Fabric name / NxM</label>
            <input
              value={customFabric}
              onChange={(e) => setCustomFabric(e.target.value)}
              placeholder="e.g. photonic-mesh-12x96"
              disabled={running}
              className="font-mono text-xs bg-card border border-border rounded px-2 py-1.5 text-foreground w-48 focus:outline-none focus:border-primary/60 disabled:opacity-50"
            />
          </div>
        )}

        {/* Function name */}
        <div className="flex flex-col gap-1">
          <label className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Function / kernel</label>
          <div className="relative">
            <input
              value={fnName}
              onChange={(e) => setFnName(e.target.value)}
              list="kernel-suggestions"
              placeholder="function_name"
              disabled={running}
              className="font-mono text-xs bg-card border border-border rounded px-2 py-1.5 text-foreground w-44 focus:outline-none focus:border-primary/60 disabled:opacity-50"
            />
            <datalist id="kernel-suggestions">
              {KERNEL_SUGGESTIONS.map((k) => <option key={k} value={k} />)}
            </datalist>
          </div>
        </div>

        {/* Cache toggle */}
        <label className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground cursor-pointer select-none pb-1.5">
          <input type="checkbox" checked={cached} onChange={(e) => setCached(e.target.checked)} disabled={running} className="accent-primary" />
          cache hit
        </label>
      </div>

      {/* Output scroll area */}
      <div
        ref={ref}
        className="p-4 flex-1 min-h-[300px] max-h-[360px] overflow-y-auto bg-gradient-to-br from-background via-card/40 to-background space-y-0.5"
      >
        <AnimatePresence initial={false}>
          {lines.map((l, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.1 }}
              className={`font-mono text-xs leading-relaxed ${colourCls[l.type] ?? "text-foreground"}`}
            >
              {l.text}
            </motion.div>
          ))}
        </AnimatePresence>
        {error && <div className="font-mono text-xs text-red-400 mt-2">{error}</div>}
        {!running && !done && !error && (
          <div className="font-mono text-xs text-muted-foreground flex items-center gap-1">
            <span>~</span>
            <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1, repeat: Infinity }}>▌</motion.span>
          </div>
        )}
      </div>

      {/* Meta summary (after compile) */}
      {meta && (
        <div className="px-4 py-2 border-t border-border bg-card/20 flex flex-wrap gap-4">
          {[
            { label: "compile", value: `${meta.compile_ms} ms` },
            { label: "cache",   value: meta.cached ? "HIT" : "MISS" },
            { label: "WDM",     value: `${meta.wdm_channels} ch` },
            { label: "dispatch",value: `<${meta.dispatch_ns} ns` },
          ].map((s) => (
            <div key={s.label} className="flex flex-col">
              <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider">{s.label}</span>
              <span className="font-mono text-xs font-bold text-primary">{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border bg-card/30 flex justify-between items-center">
        <span className="font-mono text-xs text-muted-foreground">LightRail v0.2 · 6-stage photonic compiler</span>
        <button
          onClick={run}
          disabled={running}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-xs transition-all ${running ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
        >
          {running ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
          {done ? "Recompile" : running ? "Compiling…" : "▶ Compile"}
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
const LightCompiler = () => {
  const [activeExample, setActiveExample] = useState("jit");
  const [copiedExample, setCopiedExample] = useState(false);
  const example = CODE_EXAMPLES.find((e) => e.id === activeExample)!;

  const copyExample = () => {
    navigator.clipboard.writeText(example.code);
    setCopiedExample(true);
    setTimeout(() => setCopiedExample(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-28">
        {/* Hero */}
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 grid-pattern opacity-15" />
          <motion.div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] rounded-full bg-primary/8 blur-3xl pointer-events-none"
            animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 6, repeat: Infinity }} />

          <div className="container mx-auto px-4 relative z-10 text-center max-w-4xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full border border-border bg-card/50">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span className="font-mono text-sm text-muted-foreground">LightRail Photonic Compiler v0.2</span>
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl md:text-6xl font-bold font-mono leading-tight mb-6">
              <span className="text-gradient glow-text">LightCompiler</span>
              <br />
              <span className="text-foreground text-3xl md:text-4xl">Photonic-Native AI Compilation</span>
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
              A 6-stage compiler targeting the 20-layer optical fabric NCE. One decorator —
              <code className="text-primary bg-primary/10 px-1 rounded mx-1">@lightrail.jit</code> — transforms
              Python functions into WDM-scheduled, ternary-native photonic kernels.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/onboard">
                <Button size="lg" className="font-mono bg-primary text-primary-foreground hover:bg-primary/90 group">
                  <Terminal className="mr-2 w-4 h-4" />
                  Get Started — lightos onboard
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/docs">
                <Button size="lg" variant="outline" className="font-mono border-border hover:border-primary/50">
                  Compiler Docs
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* 6-Stage Pipeline */}
        <section className="py-20 border-t border-border">
          <div className="container mx-auto px-4 max-w-6xl">
            <ScrollReveal className="text-center mb-14">
              <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full border border-border bg-card/50">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">6-Stage Pipeline</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold font-mono">
                <span className="text-foreground">From Python to </span>
                <span className="text-gradient">Photonic Bytecode</span>
              </h2>
            </ScrollReveal>

            <div className="relative">
              {/* Connector line */}
              <div className="hidden lg:block absolute top-12 left-[calc(8.33%-1px)] right-[calc(8.33%-1px)] h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

              <StaggerContainer className="grid grid-cols-2 lg:grid-cols-6 gap-4" staggerDelay={0.08}>
                {PIPELINE_STAGES.map((stage) => {
                  const Icon = stage.icon;
                  return (
                    <StaggerItem key={stage.num}>
                      <motion.div whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 300 }}
                        className="p-4 rounded-xl border border-border bg-card/30 hover:border-primary/40 hover:bg-card/60 transition-all text-center relative group">
                        <div className={`w-10 h-10 rounded-xl ${stage.bg} ${stage.color} flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="font-mono text-xs font-bold text-foreground mb-1">{stage.label}</div>
                        <div className="font-mono text-xs text-primary/60">Stage {stage.num}</div>
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-3 bg-card border border-border rounded-lg shadow-xl text-left opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          <div className="text-xs text-muted-foreground leading-relaxed">{stage.desc}</div>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-border" />
                        </div>
                      </motion.div>
                    </StaggerItem>
                  );
                })}
              </StaggerContainer>
            </div>
          </div>
        </section>

        {/* Workflow animation */}
        <WorkflowAnimation />

        {/* Live compiler demo */}
        <section className="py-20 border-t border-border bg-card/20">
          <div className="container mx-auto px-4 max-w-6xl">
            <ScrollReveal className="text-center mb-14">
              <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full border border-border bg-card/50">
                <Play className="w-3.5 h-3.5 text-primary" />
                <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Live Demo</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold font-mono">
                <span className="text-foreground">See the Compiler </span>
                <span className="text-gradient">in Action</span>
              </h2>
            </ScrollReveal>

            <div className="grid lg:grid-cols-2 gap-8 items-start">
              {/* Code panel */}
              <div>
                <div className="flex gap-2 mb-3">
                  {CODE_EXAMPLES.map((ex) => (
                    <button key={ex.id} onClick={() => setActiveExample(ex.id)}
                      className={`px-3 py-1.5 rounded font-mono text-xs transition-all ${activeExample === ex.id ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>
                      {ex.label}
                    </button>
                  ))}
                </div>
                <div className="terminal-window overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">{example.label}</span>
                    <button onClick={copyExample} className="text-muted-foreground hover:text-foreground transition-colors">
                      {copiedExample ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.pre key={activeExample} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="p-4 font-mono text-xs text-foreground/90 overflow-x-auto leading-relaxed max-h-[400px] overflow-y-auto">
                      {example.code}
                    </motion.pre>
                  </AnimatePresence>
                </div>
              </div>

              {/* Compiler output */}
              <CompilerTerminal />
            </div>
          </div>
        </section>

        {/* Features grid */}
        <section className="py-20 border-t border-border">
          <div className="container mx-auto px-4 max-w-6xl">
            <ScrollReveal className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold font-mono">
                <span className="text-foreground">Compiler </span>
                <span className="text-gradient">Capabilities</span>
              </h2>
            </ScrollReveal>
            <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" staggerDelay={0.08}>
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <StaggerItem key={f.title}>
                    <motion.div whileHover={{ y: -4, scale: 1.01 }} transition={{ type: "spring", stiffness: 300 }}
                      className="p-6 rounded-xl border border-border bg-card/30 hover:border-primary/40 hover:bg-card/60 transition-all group">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-mono text-primary/70 uppercase tracking-wider">{f.tag}</span>
                      </div>
                      <h3 className="font-mono font-bold text-base mb-2 text-foreground">{f.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                    </motion.div>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 border-t border-border text-center">
          <div className="container mx-auto px-4 max-w-2xl">
            <ScrollReveal>
              <h2 className="text-3xl md:text-4xl font-bold font-mono mb-6">
                <span className="text-foreground">Start Compiling </span>
                <span className="text-gradient glow-text">Photonically</span>
              </h2>
              <p className="text-muted-foreground mb-10">
                One command to install. One decorator to compile.
                Mathematically optimal WDM scheduling, out of the box.
              </p>
              <div className="terminal-window max-w-sm mx-auto mb-8">
                <div className="px-4 py-3 space-y-1.5">
                  <div className="font-mono text-sm text-cyan-300">
                    <span className="text-muted-foreground mr-2">~</span>
                    curl -fsSL https://agentic.lightos.sh | bash
                  </div>
                  <div className="font-mono text-sm text-green-400">
                    <span className="text-muted-foreground mr-2">~</span>
                    lightos onboard
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/onboard">
                  <Button size="lg" className="font-mono bg-primary text-primary-foreground hover:bg-primary/90 group">
                    Run lightos onboard
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link to="/dashboard/photonic">
                  <Button size="lg" variant="outline" className="font-mono border-border hover:border-primary/50">
                    Photonic Fabric Dashboard
                  </Button>
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default LightCompiler;
