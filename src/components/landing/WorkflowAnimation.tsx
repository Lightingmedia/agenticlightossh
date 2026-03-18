import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useAnimationFrame } from "framer-motion";
import {
  Code2, GitBranch, Zap, Network, Layers, Cpu,
  Terminal, Bot, Play, Pause, RotateCcw,
  ChevronRight, Fingerprint,
} from "lucide-react";
import { ScrollReveal } from "@/components/ui/parallax-section";

// ─── Pipeline data ────────────────────────────────────────────────────────────

const INPUTS = [
  { id: "py",      label: "Python fn",   sub: "@lightrail.jit", color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  { id: "pytorch", label: "PyTorch",     sub: "torch.fx trace", color: "#f97316", bg: "rgba(249,115,22,0.12)" },
  { id: "jax",     label: "JAX",         sub: "make_jaxpr",     color: "#a855f7", bg: "rgba(168,85,247,0.12)" },
];

const STAGES = [
  {
    id: "ast",      num: 1, icon: Code2,
    label: "AST & IR",
    sub: "Static Single Assignment",
    color: "#3b82f6",
    detail: "Python AST → SSA IR · Uniquified names · Phi nodes · Typed instructions",
    metric: "~0.2 ms",  metricLabel: "parse time",
    opcodes: ["CONST", "LOAD", "MATMUL", "FADD", "RET"],
  },
  {
    id: "type",     num: 2, icon: GitBranch,
    label: "Type Inference",
    sub: "Forward dataflow + DCE",
    color: "#a855f7",
    detail: "FP32 / TERNARY / ANALOG propagated · Dead-code removed · Cast lowered",
    metric: "0 removed", metricLabel: "dead ops",
    opcodes: ["FP32→TERNARY", "CAST", "PHI"],
  },
  {
    id: "opt",      num: 3, icon: Zap,
    label: "Photonic Optimisation",
    sub: "FMA fusion · Loop tiling",
    color: "#eab308",
    detail: "FMUL+FADD→FMA · PREFETCH distance=2 · Anderson alias analysis",
    metric: "1 fusion", metricLabel: "FMA ops",
    opcodes: ["FMA", "PREFETCH", "TILE_LOAD", "TILE_STORE"],
  },
  {
    id: "wdm",      num: 4, icon: Network,
    label: "WDM & Routing",
    sub: "TAR · Hungarian Scheduler",
    color: "#06b6d4",
    detail: "Dijkstra 1 280-node graph · Hungarian n≤64 · Topology fingerprint stamped",
    metric: "64 ch", metricLabel: "WDM channels",
    opcodes: ["WDM_BIND", "WDM_ROUTE", "WDM_MUXIN"],
  },
  {
    id: "bytecode", num: 5, icon: Layers,
    label: "Tile Bytecode",
    sub: ".lrbs · .lrfat bundle",
    color: "#10b981",
    detail: "20-tile graph partition · 64-bit instruction words · CRC32 fat binary",
    metric: "64 B", metricLabel: ".lrbs size",
    opcodes: ["TILE_COMPUTE", "TILE_BARRIER", "NCE_DISPATCH"],
  },
  {
    id: "fabric",   num: 6, icon: Cpu,
    label: "Fabric OS Handoff",
    sub: "<100 ns dispatch",
    color: "#22c55e",
    detail: "KernelDescriptor → GlobalScheduler · UNIX socket IPC · <100 ns optical dispatch",
    metric: "<100 ns", metricLabel: "dispatch time",
    opcodes: ["NCE_DISPATCH", "DMA_WRITE", "ALL_REDUCE"],
  },
];

const INTELLIGENCE = [
  { label: "TopologyFingerprint", icon: Fingerprint, color: "#06b6d4", stageIdx: 3 },
  { label: "TAR Dijkstra",        icon: Network,     color: "#a855f7", stageIdx: 3 },
  { label: "Hungarian WDM",       icon: Zap,         color: "#eab308", stageIdx: 3 },
  { label: "WorkloadPartitioner", icon: Layers,      color: "#10b981", stageIdx: 4 },
  { label: "PyTorch Adapter",     icon: Bot,         color: "#f97316", stageIdx: 0 },
  { label: "JAX Adapter",         icon: Bot,         color: "#a855f7", stageIdx: 0 },
];

// ─── Animated particle along a vertical connector ─────────────────────────────

function FlowParticle({
  active, color, delay = 0, duration = 1.2,
}: { active: boolean; color: string; delay?: number; duration?: number }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="particle"
          initial={{ y: 0, opacity: 0.9, scale: 1 }}
          animate={{ y: 48, opacity: 0, scale: 0.4 }}
          transition={{ duration, delay, ease: "easeIn", repeat: Infinity, repeatDelay: 0.1 }}
          style={{
            position: "absolute",
            left: "50%",
            top: 0,
            transform: "translateX(-50%)",
            width: 8, height: 8,
            borderRadius: "50%",
            background: color,
            boxShadow: `0 0 8px ${color}`,
            pointerEvents: "none",
          }}
        />
      )}
    </AnimatePresence>
  );
}

// ─── Connector between two stage cards ───────────────────────────────────────

function Connector({ active, color }: { active: boolean; color: string }) {
  return (
    <div style={{ position: "relative", height: 48, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* Static line */}
      <div style={{
        width: 2, height: "100%",
        background: active
          ? `linear-gradient(to bottom, ${color}, ${color}88)`
          : "rgba(255,255,255,0.08)",
        borderRadius: 2,
        transition: "background 0.4s ease",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Animated fill */}
        {active && (
          <motion.div
            initial={{ scaleY: 0, originY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.4 }}
            style={{ position: "absolute", inset: 0, background: color, borderRadius: 2 }}
          />
        )}
      </div>
      {/* Particles */}
      <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 8, height: 48 }}>
        <FlowParticle active={active} color={color} delay={0} duration={0.9} />
        <FlowParticle active={active} color={color} delay={0.3} duration={0.9} />
        <FlowParticle active={active} color={color} delay={0.6} duration={0.9} />
      </div>
      {/* Arrow head */}
      <div style={{
        position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: 0, height: 0,
        borderLeft: "5px solid transparent",
        borderRight: "5px solid transparent",
        borderTop: `8px solid ${active ? color : "rgba(255,255,255,0.1)"}`,
        transition: "border-top-color 0.4s ease",
      }} />
    </div>
  );
}

// ─── Input node ───────────────────────────────────────────────────────────────

function InputNode({ input, active }: { input: typeof INPUTS[0]; active: boolean }) {
  return (
    <motion.div
      animate={{
        boxShadow: active ? `0 0 20px ${input.color}44, 0 0 40px ${input.color}22` : "none",
        borderColor: active ? `${input.color}88` : "rgba(255,255,255,0.1)",
      }}
      transition={{ duration: 0.4 }}
      style={{
        padding: "10px 16px",
        borderRadius: 10,
        border: "1px solid",
        background: active ? input.bg : "rgba(255,255,255,0.03)",
        minWidth: 110,
        textAlign: "center",
        transition: "background 0.4s ease",
      }}
    >
      <div style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, color: active ? input.color : "#9ca3af" }}>
        {input.label}
      </div>
      <div style={{ fontSize: 9, fontFamily: "monospace", color: "#6b7280", marginTop: 2 }}>{input.sub}</div>
    </motion.div>
  );
}

// ─── Stage card ───────────────────────────────────────────────────────────────

function StageCard({
  stage, state, onClick,
}: {
  stage: typeof STAGES[0];
  state: "idle" | "active" | "done";
  onClick: () => void;
}) {
  const Icon = stage.icon;
  const isActive = state === "active";
  const isDone = state === "done";

  return (
    <motion.button
      onClick={onClick}
      animate={{
        boxShadow: isActive
          ? `0 0 0 1px ${stage.color}88, 0 0 32px ${stage.color}33, 0 8px 32px rgba(0,0,0,0.4)`
          : isDone
            ? `0 0 0 1px ${stage.color}44`
            : "0 0 0 1px rgba(255,255,255,0.08)",
        scale: isActive ? 1.02 : 1,
      }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      style={{
        width: "100%",
        padding: "14px 18px",
        borderRadius: 12,
        border: "1px solid transparent",
        background: isActive
          ? `linear-gradient(135deg, rgba(0,0,0,0.6) 0%, ${stage.color}18 100%)`
          : isDone
            ? "rgba(255,255,255,0.04)"
            : "rgba(255,255,255,0.025)",
        cursor: "pointer",
        textAlign: "left",
        position: "relative",
        overflow: "hidden",
        transition: "background 0.35s ease",
      }}
    >
      {/* Active glow overlay */}
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            position: "absolute", inset: 0,
            background: `radial-gradient(circle at 20% 50%, ${stage.color}15 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative" }}>
        {/* Icon */}
        <motion.div
          animate={{
            background: isActive ? `${stage.color}30` : isDone ? `${stage.color}18` : "rgba(255,255,255,0.06)",
            scale: isActive ? [1, 1.1, 1] : 1,
          }}
          transition={{ duration: isActive ? 1.5 : 0.3, repeat: isActive ? Infinity : 0 }}
          style={{
            width: 38, height: 38, borderRadius: 9,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={18} style={{ color: isActive || isDone ? stage.color : "#6b7280" }} />
        </motion.div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              fontSize: 11, fontFamily: "monospace", fontWeight: 700,
              color: isActive ? stage.color : isDone ? "#9ca3af" : "#6b7280",
            }}>
              Stage {stage.num}
            </span>
            {isDone && (
              <motion.span
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                style={{ fontSize: 9, fontFamily: "monospace", color: "#22c55e",
                  background: "rgba(34,197,94,0.1)", padding: "1px 6px", borderRadius: 99 }}
              >✓ done</motion.span>
            )}
            {isActive && (
              <motion.span
                animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1, repeat: Infinity }}
                style={{ fontSize: 9, fontFamily: "monospace", color: stage.color,
                  background: `${stage.color}18`, padding: "1px 6px", borderRadius: 99 }}
              >● running</motion.span>
            )}
          </div>
          <div style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 700, color: isActive ? "#f1f5f9" : "#94a3b8", marginTop: 1 }}>
            {stage.label}
          </div>
          <div style={{ fontSize: 11, fontFamily: "monospace", color: "#475569", marginTop: 1 }}>
            {stage.sub}
          </div>
        </div>

        {/* Metric */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontFamily: "monospace", fontWeight: 700, color: isActive ? stage.color : "#374151" }}>
            {stage.metric}
          </div>
          <div style={{ fontSize: 9, fontFamily: "monospace", color: "#374151" }}>
            {stage.metricLabel}
          </div>
        </div>
      </div>

      {/* Opcodes strip */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            style={{ overflow: "hidden", position: "relative" }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              {stage.opcodes.map((op, i) => (
                <motion.span
                  key={op}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  style={{
                    fontSize: 9, fontFamily: "monospace", fontWeight: 700,
                    color: stage.color,
                    background: `${stage.color}15`,
                    border: `1px solid ${stage.color}30`,
                    padding: "2px 7px", borderRadius: 4,
                  }}
                >{op}</motion.span>
              ))}
            </div>
            <div style={{ marginTop: 8, fontSize: 10, fontFamily: "monospace", color: "#6b7280", lineHeight: 1.5 }}>
              {stage.detail}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// ─── Intelligence Stack sidebar ────────────────────────────────────────────────

function IntelligenceBadge({ item, active }: { item: typeof INTELLIGENCE[0]; active: boolean }) {
  const Icon = item.icon;
  return (
    <motion.div
      animate={{
        opacity: active ? 1 : 0.3,
        x: active ? 0 : 8,
        boxShadow: active ? `0 0 12px ${item.color}44` : "none",
      }}
      transition={{ duration: 0.3 }}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "7px 12px", borderRadius: 8,
        border: `1px solid ${active ? item.color + "55" : "rgba(255,255,255,0.06)"}`,
        background: active ? `${item.color}12` : "transparent",
        marginBottom: 6,
      }}
    >
      <Icon size={13} style={{ color: active ? item.color : "#374151", flexShrink: 0 }} />
      <span style={{ fontSize: 10, fontFamily: "monospace", color: active ? item.color : "#374151", fontWeight: 600 }}>
        {item.label}
      </span>
      {active && (
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }}
          style={{ width: 5, height: 5, borderRadius: "50%", background: item.color, marginLeft: "auto", flexShrink: 0 }}
        />
      )}
    </motion.div>
  );
}

// ─── Output node ──────────────────────────────────────────────────────────────

function OutputNode({ active }: { active: boolean }) {
  return (
    <motion.div
      animate={{
        boxShadow: active ? "0 0 0 1px rgba(34,197,94,0.5), 0 0 40px rgba(34,197,94,0.2)" : "0 0 0 1px rgba(255,255,255,0.08)",
        background: active ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.025)",
      }}
      transition={{ duration: 0.5 }}
      style={{ borderRadius: 12, padding: "16px 20px", textAlign: "center" }}
    >
      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        {Array.from({ length: 5 }, (_, li) => (
          <div key={li} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {Array.from({ length: 4 }, (_, ci) => (
              <motion.div
                key={ci}
                animate={{
                  background: active
                    ? ["rgba(34,197,94,0.8)", "rgba(6,182,212,0.8)", "rgba(34,197,94,0.8)"]
                    : "rgba(255,255,255,0.08)",
                  boxShadow: active ? "0 0 4px rgba(34,197,94,0.6)" : "none",
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: (li * 4 + ci) * 0.08,
                }}
                style={{ width: 6, height: 6, borderRadius: 2 }}
              />
            ))}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: active ? "#22c55e" : "#4b5563" }}>
        NCE Photonic Fabric
      </div>
      <div style={{ fontSize: 10, fontFamily: "monospace", color: "#374151", marginTop: 2 }}>
        20 layers · 64 WDM channels · &lt;100 ns dispatch
      </div>
    </motion.div>
  );
}

// ─── Main workflow animation ──────────────────────────────────────────────────

const WorkflowAnimation = () => {
  const [activeStage, setActiveStage] = useState(0);
  const [doneStages, setDoneStages] = useState<Set<number>>(new Set());
  const [playing, setPlaying] = useState(true);
  const [inputActive, setInputActive] = useState(true);
  const [outputActive, setOutputActive] = useState(false);

  // Auto-cycle
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setActiveStage((prev) => {
        const next = (prev + 1) % STAGES.length;
        setDoneStages((d) => new Set([...d, prev]));
        setOutputActive(next === 0 && prev === STAGES.length - 1);
        setInputActive(next <= 1);
        return next;
      });
    }, 2000);
    return () => clearInterval(id);
  }, [playing]);

  const reset = () => {
    setActiveStage(0);
    setDoneStages(new Set());
    setOutputActive(false);
    setInputActive(true);
    setPlaying(true);
  };

  const handleStageClick = (i: number) => {
    setPlaying(false);
    setActiveStage(i);
    setDoneStages(new Set(Array.from({ length: i }, (_, k) => k)));
    setOutputActive(false);
    setInputActive(i <= 1);
  };

  return (
    <section style={{ padding: "80px 0", borderTop: "1px solid rgba(255,255,255,0.08)", overflow: "hidden", position: "relative" }}>
      {/* Radial bg glow */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 800, height: 800,
        background: `radial-gradient(circle, ${STAGES[activeStage].color}08 0%, transparent 70%)`,
        pointerEvents: "none",
        transition: "background 1s ease",
      }} />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", position: "relative" }}>
        {/* Header */}
        <ScrollReveal>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 16,
              padding: "6px 14px", borderRadius: 99,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.03)",
            }}>
              <Zap size={13} style={{ color: STAGES[activeStage].color }} />
              <span style={{ fontSize: 11, fontFamily: "monospace", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                LightRail Compiler Workflow
              </span>
            </div>

            <h2 style={{ fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 700, fontFamily: "monospace", marginBottom: 12, lineHeight: 1.2 }}>
              <span style={{ color: "#f1f5f9" }}>6-Stage Photonic </span>
              <span style={{
                background: `linear-gradient(135deg, ${STAGES[activeStage].color}, #06b6d4)`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                backgroundClip: "text", transition: "background 0.5s ease",
              }}>Compilation Pipeline</span>
            </h2>
            <p style={{ fontSize: 14, color: "#6b7280", fontFamily: "monospace", maxWidth: 500, margin: "0 auto" }}>
              Click any stage or watch the auto-play. Each stage lights up as data flows through the photonic fabric.
            </p>

            {/* Controls */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 20 }}>
              <button
                onClick={() => setPlaying((p) => !p)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "7px 16px", borderRadius: 8, cursor: "pointer",
                  background: playing ? `${STAGES[activeStage].color}20` : "rgba(255,255,255,0.06)",
                  border: `1px solid ${playing ? STAGES[activeStage].color + "55" : "rgba(255,255,255,0.1)"}`,
                  color: playing ? STAGES[activeStage].color : "#9ca3af",
                  fontSize: 12, fontFamily: "monospace", fontWeight: 600,
                  transition: "all 0.3s ease",
                }}
              >
                {playing ? <Pause size={13} /> : <Play size={13} />}
                {playing ? "Pause" : "Play"}
              </button>
              <button
                onClick={reset}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "7px 16px", borderRadius: 8, cursor: "pointer",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#6b7280", fontSize: 12, fontFamily: "monospace",
                }}
              >
                <RotateCcw size={12} />
                Reset
              </button>
            </div>
          </div>
        </ScrollReveal>

        {/* Three-column layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px 1fr", gap: 24, alignItems: "start" }}>

          {/* ── Left column: inputs + intelligence stack ── */}
          <div>
            {/* Inputs */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 10, fontFamily: "monospace", color: "#374151", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
                Input Layer
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {INPUTS.map((inp) => (
                  <InputNode key={inp.id} input={inp} active={inputActive} />
                ))}
              </div>
              {/* Arrow to pipeline */}
              <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  {[0,1,2].map(i => (
                    <motion.div key={i}
                      animate={{ opacity: inputActive ? [0.3,1,0.3] : 0.1 }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                      style={{ width: 1, height: 8, background: "#22c55e" }}
                    />
                  ))}
                  <ChevronRight size={12} style={{ color: inputActive ? "#22c55e" : "#374151", transform: "rotate(90deg)", transition: "color 0.3s" }} />
                </div>
              </div>
            </div>

            {/* Intelligence Stack */}
            <div>
              <div style={{ fontSize: 10, fontFamily: "monospace", color: "#374151", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
                Intelligence Stack
              </div>
              {INTELLIGENCE.map((item) => (
                <IntelligenceBadge key={item.label} item={item} active={activeStage === item.stageIdx} />
              ))}
            </div>
          </div>

          {/* ── Centre column: pipeline stages ── */}
          <div>
            {STAGES.map((stage, i) => (
              <div key={stage.id}>
                <StageCard
                  stage={stage}
                  state={activeStage === i ? "active" : doneStages.has(i) ? "done" : "idle"}
                  onClick={() => handleStageClick(i)}
                />
                {i < STAGES.length - 1 && (
                  <Connector
                    active={activeStage === i || doneStages.has(i)}
                    color={stage.color}
                  />
                )}
              </div>
            ))}

            {/* Final connector to output */}
            <Connector active={doneStages.has(STAGES.length - 1) || outputActive} color="#22c55e" />
            <OutputNode active={doneStages.has(STAGES.length - 1) || outputActive} />
          </div>

          {/* ── Right column: active stage detail + progress ── */}
          <div>
            {/* Stage detail */}
            <div style={{
              padding: 20, borderRadius: 12, marginBottom: 20,
              border: `1px solid ${STAGES[activeStage].color}33`,
              background: `${STAGES[activeStage].color}0a`,
              transition: "all 0.4s ease",
            }}>
              <div style={{ fontSize: 10, fontFamily: "monospace", color: "#374151", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
                Active Stage
              </div>
              <div style={{ fontSize: 16, fontFamily: "monospace", fontWeight: 700, color: STAGES[activeStage].color, marginBottom: 6, transition: "color 0.4s" }}>
                {STAGES[activeStage].label}
              </div>
              <div style={{ fontSize: 11, fontFamily: "monospace", color: "#6b7280", lineHeight: 1.7 }}>
                {STAGES[activeStage].detail}
              </div>

              {/* Metric */}
              <div style={{
                marginTop: 14, padding: "10px 14px", borderRadius: 8,
                background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(255,255,255,0.06)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{ fontSize: 10, fontFamily: "monospace", color: "#4b5563" }}>
                  {STAGES[activeStage].metricLabel}
                </span>
                <span style={{ fontSize: 18, fontFamily: "monospace", fontWeight: 700, color: STAGES[activeStage].color }}>
                  {STAGES[activeStage].metric}
                </span>
              </div>
            </div>

            {/* Progress dots */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontFamily: "monospace", color: "#374151", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
                Pipeline Progress
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {STAGES.map((s, i) => {
                  const Icon = s.icon;
                  const isActive = activeStage === i;
                  const isDone = doneStages.has(i);
                  return (
                    <motion.div
                      key={s.id}
                      animate={{ opacity: isActive ? 1 : isDone ? 0.7 : 0.3 }}
                      style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
                      onClick={() => handleStageClick(i)}
                    >
                      {/* dot */}
                      <motion.div
                        animate={{
                          background: isActive ? s.color : isDone ? s.color + "88" : "rgba(255,255,255,0.1)",
                          boxShadow: isActive ? `0 0 8px ${s.color}88` : "none",
                          scale: isActive ? 1.3 : 1,
                        }}
                        transition={{ duration: 0.3 }}
                        style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0 }}
                      />
                      <Icon size={11} style={{ color: isActive ? s.color : isDone ? "#4b5563" : "#1f2937", flexShrink: 0 }} />
                      <span style={{ fontSize: 10, fontFamily: "monospace", color: isActive ? s.color : isDone ? "#4b5563" : "#1f2937" }}>
                        {s.label}
                      </span>
                      {isDone && <span style={{ fontSize: 8, fontFamily: "monospace", color: "#22c55e", marginLeft: "auto" }}>✓</span>}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Compact terminal snip */}
            <div style={{
              borderRadius: 10, overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(0,0,0,0.4)",
            }}>
              <div style={{ padding: "8px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontFamily: "monospace", fontSize: 10, color: "#374151" }}>
                compiler output
              </div>
              <div style={{ padding: 14, fontFamily: "monospace", fontSize: 10, color: "#4b5563", lineHeight: 1.8 }}>
                <AnimatePresence mode="wait">
                  <motion.div key={activeStage} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                    <div style={{ color: "#6b7280" }}>~ <span style={{ color: "#06b6d4" }}>lightos compile</span></div>
                    <div style={{ color: STAGES[activeStage].color }}>[{activeStage + 1}/6] {STAGES[activeStage].label}</div>
                    <div>  ▸  {STAGES[activeStage].sub}</div>
                    {doneStages.has(activeStage) && <div style={{ color: "#22c55e" }}>  ✓  {STAGES[activeStage].metric}</div>}
                    <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1, repeat: Infinity }} style={{ color: STAGES[activeStage].color }}>▌</motion.span>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: overall compile stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          style={{
            marginTop: 40,
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16,
          }}
        >
          {[
            { label: "Compile time",      value: "~1.8 ms",  sub: "first call (cache miss)" },
            { label: "Cache hit latency", value: "<200 ns",  sub: "SHA-256 keyed JIT cache" },
            { label: "WDM channels",      value: "64",       sub: "optical wavelengths" },
            { label: "Dispatch latency",  value: "<100 ns",  sub: "Fabric OS optical dispatch" },
          ].map((stat) => (
            <div key={stat.label} style={{
              padding: "16px 18px", borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.07)",
              background: "rgba(255,255,255,0.02)",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 22, fontFamily: "monospace", fontWeight: 700, color: "#10b981", marginBottom: 4 }}>{stat.value}</div>
              <div style={{ fontSize: 11, fontFamily: "monospace", color: "#9ca3af", marginBottom: 2 }}>{stat.label}</div>
              <div style={{ fontSize: 9, fontFamily: "monospace", color: "#374151" }}>{stat.sub}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default WorkflowAnimation;
