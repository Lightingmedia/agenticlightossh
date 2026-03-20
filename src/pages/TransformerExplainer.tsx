import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";

// ─── Layout constants ──────────────────────────────────────────────────────────
const ROW_H     = 54;   // px per token row
const PAD_V     = 28;   // top/bottom padding inside viz
const N_HEADS   = 12;
const N_LAYERS  = 12;

// ─── Color palettes ────────────────────────────────────────────────────────────
const HEAD_COLORS = [
  "#6366f1","#8b5cf6","#a855f7","#ec4899",
  "#ef4444","#f97316","#eab308","#22c55e",
  "#06b6d4","#3b82f6","#10b981","#14b8a6",
];
const TOKEN_COLORS = [
  "#3b82f6","#8b5cf6","#06b6d4","#10b981",
  "#f59e0b","#ef4444","#ec4899","#6366f1",
];

// Key = red, Query = indigo/blue, Value = green — matching the reference image
const KQV_COLORS = { K: "#ef4444", Q: "#6366f1", V: "#22c55e" };

// ─── Preset output probabilities ───────────────────────────────────────────────
const BASE_PROBS: Array<{ token: string; prob: number }> = [
  { token: "way",        prob: 0.5264 },
  { token: "world",      prob: 0.1823 },
  { token: "lives",      prob: 0.0240 },
  { token: "field",      prob: 0.0128 },
  { token: "future",     prob: 0.0113 },
  { token: "workplace",  prob: 0.0062 },
  { token: "industry",   prob: 0.0058 },
  { token: "entire",     prob: 0.0041 },
  { token: "human",      prob: 0.0039 },
  { token: "business",   prob: 0.0031 },
  { token: "workforce",  prob: 0.0028 },
  { token: "work",       prob: 0.0025 },
  { token: "US",         prob: 0.0018 },
  { token: "U",          prob: 0.0015 },
  { token: "economy",    prob: 0.0014 },
  { token: "digital",    prob: 0.0013 },
  { token: "Internet",   prob: 0.0011 },
  { token: "ways",       prob: 0.0009 },
  { token: "job",        prob: 0.0008 },
  { token: "whole",      prob: 0.0007 },
  { token: "landscape",  prob: 0.0006 },
  { token: "American",   prob: 0.0005 },
  { token: "role",       prob: 0.0004 },
  { token: "face",       prob: 0.0004 },
  { token: "United",     prob: 0.0003 },
  { token: "traditional",prob: 0.0003 },
  { token: "global",     prob: 0.0002 },
];

// ─── Math helpers ──────────────────────────────────────────────────────────────
function seededRng(seed: number) {
  let s = (seed ^ 0xdeadbeef) | 0;
  return () => {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b) | 0;
    s = Math.imul(s ^ (s >>> 15), 0x45d9f3b) | 0;
    s ^= s >>> 16;
    return (s >>> 0) / 4294967296;
  };
}

function softmax(arr: number[], temp: number): number[] {
  const t = Math.max(temp, 0.05);
  const sc = arr.map(x => x / t);
  const valid = sc.filter(isFinite);
  if (!valid.length) return arr.map(() => 1 / arr.length);
  const mx = Math.max(...valid);
  const ex = sc.map(x => isFinite(x) ? Math.exp(x - mx) : 0);
  const sm = ex.reduce((a, b) => a + b, 0);
  return ex.map(x => x / (sm || 1));
}

function computeAttention(n: number, head: number, layer: number, temp: number): number[][] {
  const rng = seededRng(head * 997 + layer * 113 + 7);
  return Array.from({ length: n }, (_, qi) => {
    const scores = Array.from({ length: n }, (_, ki) =>
      ki <= qi ? rng() * 5 - 1.5 : -Infinity
    );
    return softmax(scores, temp);
  });
}

function computeProbs(head: number, layer: number, temp: number) {
  const rng = seededRng(head * 41 + layer * 7 + 3);
  const out = BASE_PROBS.map(p => ({
    ...p,
    prob: Math.max(0, p.prob * (0.5 + rng() * 1.0) * (temp < 0.7 ? 1.4 : temp > 1.4 ? 0.55 : 1)),
  }));
  const total = out.reduce((s, p) => s + p.prob, 0);
  return out.map(p => ({ ...p, prob: p.prob / total })).sort((a, b) => b.prob - a.prob);
}

function tokenize(text: string): string[] {
  const BPE: Record<string, string[]> = {
    artificial:  ["Art", "ificial"],
    intelligence:["Intel", "ligence"],
    transforming:["transform", "ing"],
    language:    ["lang", "uage"],
    processing:  ["process", "ing"],
    generating:  ["generat", "ing"],
  };
  return text.trim()
    .split(/\s+/)
    .flatMap(w => BPE[w.toLowerCase()] ?? [w])
    .slice(0, 8);
}

// ─── Embedding bars ────────────────────────────────────────────────────────────
function EmbedBars({ idx, active }: { idx: number; active: boolean }) {
  const rng = seededRng(idx * 53 + 7);
  const color = TOKEN_COLORS[idx % TOKEN_COLORS.length];
  return (
    <div className="flex gap-px items-end" style={{ height: 22 }}>
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} className="w-1.5 rounded-sm transition-all duration-300"
          style={{
            height: `${(rng() * 0.72 + 0.28) * 22}px`,
            background: color,
            opacity: active ? 0.8 : 0.2,
          }} />
      ))}
    </div>
  );
}

// ─── Attention flow SVG ────────────────────────────────────────────────────────
// Shows three interleaved color streams (Key=red, Query=indigo, Value=green)
// for the highlighted (active query) token, with dim background flows for others.
function AttentionFlows({
  n, weights, activeQ, headColor, w = 300,
}: {
  n: number; weights: number[][]; activeQ: number; headColor: string; w?: number;
}) {
  const h = PAD_V * 2 + n * ROW_H;
  const ty = (i: number) => PAD_V + i * ROW_H + ROW_H / 2;

  // Curvature control points
  const cp1x = w * 0.38;
  const cp2x = w * 0.62;

  // Three KQV offsets so the three streams are visually distinct
  const streams = [
    { color: KQV_COLORS.K, yOff: -4, label: "Key" },
    { color: KQV_COLORS.Q, yOff:  0, label: "Query" },
    { color: KQV_COLORS.V, yOff: +4, label: "Value" },
  ];

  const activePaths: React.ReactNode[] = [];
  const bgPaths: React.ReactNode[] = [];

  for (let qi = 0; qi < n; qi++) {
    for (let ki = 0; ki <= qi; ki++) {
      const wgt = weights[qi]?.[ki] ?? 0;
      if (wgt < 0.005) continue;
      const y1 = ty(ki);
      const y2 = ty(qi);
      const isActive = qi === activeQ;

      streams.forEach(({ color, yOff }, si) => {
        const sw = isActive ? 1.5 + wgt * 10 : 0.6 + wgt * 2;
        const op = isActive ? 0.10 + wgt * 0.72 : 0.025 + wgt * 0.06;
        const d = `M 4 ${y1 + yOff} C ${cp1x} ${y1 + yOff * 2}, ${cp2x} ${y2 + yOff * 2}, ${w - 4} ${y2 + yOff}`;
        const el = (
          <path key={`${si}-${qi}-${ki}`} d={d}
            stroke={color} strokeWidth={sw} opacity={op}
            fill="none" strokeLinecap="round" />
        );
        if (isActive) activePaths.push(el);
        else bgPaths.push(el);
      });
    }
  }

  // KQV labels near the center of the SVG, at the active query token row
  const labelY = ty(activeQ);

  return (
    <svg width={w} height={h} style={{ overflow: "visible", display: "block" }}>
      <defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {bgPaths}
      {activePaths}
      {/* KQV labels */}
      {streams.map(({ color, yOff, label }) => (
        <text key={label}
          x={w * 0.5} y={labelY + yOff * 3 - 4}
          fontSize={8} fontFamily="monospace" fontWeight={700}
          fill={color} textAnchor="middle" opacity={0.9}
          filter="url(#glow)">
          {label}
        </text>
      ))}
    </svg>
  );
}

// ─── Attention matrix ──────────────────────────────────────────────────────────
function AttentionMatrix({
  weights, n, hoveredRow, onHover, headColor,
}: {
  weights: number[][]; n: number; hoveredRow: number | null;
  onHover: (i: number | null) => void; headColor: string;
}) {
  const CELL = Math.min(20, Math.floor(160 / Math.max(n, 1)));
  return (
    <div style={{ paddingTop: PAD_V + ROW_H / 2 - (n * CELL) / 2 }}>
      <div className="font-mono text-[9px] text-center mb-1"
        style={{ color: headColor, letterSpacing: "0.08em" }}>
        Attention ⊙
      </div>
      <div className="flex flex-col gap-px">
        {Array.from({ length: n }, (_, qi) => (
          <div key={qi} className="flex gap-px" style={{ height: CELL }}>
            {Array.from({ length: n }, (_, ki) => {
              const masked = ki > qi;
              const wgt = weights[qi]?.[ki] ?? 0;
              const isHov = hoveredRow === qi;
              return (
                <motion.div key={ki}
                  animate={{ scale: isHov ? 1.25 : 1 }}
                  transition={{ duration: 0.15 }}
                  onMouseEnter={() => onHover(qi)}
                  onMouseLeave={() => onHover(null)}
                  title={masked ? "masked" : `${(wgt * 100).toFixed(1)}%`}
                  style={{
                    width: CELL - 2, height: CELL - 2,
                    borderRadius: "50%",
                    background: masked ? "rgba(255,255,255,0.04)" : headColor,
                    opacity: masked ? 0.06 : Math.max(0.07, wgt),
                    cursor: "crosshair",
                    border: isHov && !masked ? `1px solid ${headColor}88` : "none",
                  }} />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MLP column ────────────────────────────────────────────────────────────────
function MlpColumn({ n, hoveredToken, headColor }: {
  n: number; hoveredToken: number | null; headColor: string;
}) {
  return (
    <div className="flex flex-col" style={{ paddingTop: PAD_V }}>
      {Array.from({ length: n }, (_, i) => {
        const rng = seededRng(i * 77 + 13);
        const isLast = i === n - 1;
        const active = hoveredToken === i || (hoveredToken === null && isLast);
        return (
          <div key={i} className="flex gap-px items-center" style={{ height: ROW_H }}>
            {Array.from({ length: 6 }, (_, j) => {
              const barH = (rng() * 0.6 + 0.4) * 22;
              return (
                <div key={j} className="rounded-sm transition-all duration-300"
                  style={{
                    width: 7, height: barH,
                    background: headColor,
                    opacity: active ? 0.65 : 0.1,
                  }} />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── Probability bar ───────────────────────────────────────────────────────────
function ProbRow({ token, prob, rank, headColor }: {
  token: string; prob: number; rank: number; headColor: string;
}) {
  const isTop = rank === 0;
  const isSecond = rank === 1;
  const pctStr = prob > 0.0001 ? `${(prob * 100).toFixed(2)}%` : "0%";
  const maxProb = 0.55;

  return (
    <div className="flex items-center gap-2 py-px group"
      style={{ opacity: rank > 12 ? 0.4 : rank > 4 ? 0.65 : 1 }}>
      <div className="font-mono text-xs text-right shrink-0" style={{
        width: 76,
        color: isTop ? headColor : isSecond ? "#94a3b8" : "#6b7280",
        fontWeight: isTop ? 700 : 400,
      }}>
        {token}
      </div>
      <div className="relative flex-1 h-2.5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(prob / maxProb, 1) * 100}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="absolute inset-y-0 left-0 rounded-sm"
          style={{
            background: isTop ? headColor : isSecond ? "#475569" : "#1e293b",
            opacity: isTop ? 0.9 : 0.5,
          }} />
      </div>
      <div className="font-mono text-xs shrink-0 text-right" style={{
        width: 50,
        color: isTop ? headColor : isSecond ? "#64748b" : "#374151",
        fontWeight: isTop ? 700 : 400,
      }}>
        {isTop ? pctStr : isSecond ? `≈ ${pctStr}` : pctStr}
      </div>
    </div>
  );
}

// ─── Residual bracket ──────────────────────────────────────────────────────────
function ResidualBracket({ height, label }: { height: number; label: string }) {
  return (
    <div className="relative flex flex-col items-center shrink-0" style={{ width: 20, height }}>
      <div className="absolute top-0 bottom-0 left-[9px] w-px bg-border/40" />
      <div className="absolute top-0 left-[9px] w-2 h-px bg-border/40" />
      <div className="absolute bottom-0 left-[9px] w-2 h-px bg-border/40" />
      <div className="absolute top-1/2 -translate-y-1/2 -left-1" style={{ writingMode: "vertical-rl" }}>
        <span className="font-mono text-[8px] text-muted-foreground/50 rotate-180" style={{ whiteSpace: "nowrap" }}>
          {label}
        </span>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
const TransformerExplainer = () => {
  const [prompt, setPrompt]         = useState("Artificial intelligence is transforming the");
  const [head, setHead]             = useState(2);       // 1-indexed
  const [layer, setLayer]           = useState(1);       // 1-indexed
  const [temp, setTemp]             = useState(1.0);
  const [hoveredToken, setHovered]  = useState<number | null>(null);

  const tokens  = useMemo(() => tokenize(prompt), [prompt]);
  const n       = tokens.length;
  const weights = useMemo(() => computeAttention(n, head, layer, temp), [n, head, layer, temp]);
  const probs   = useMemo(() => computeProbs(head, layer, temp), [head, layer, temp]);

  const headColor  = HEAD_COLORS[(head - 1) % HEAD_COLORS.length];
  const activeQ    = hoveredToken ?? (n - 1);    // highlighted query token
  const vizH       = PAD_V * 2 + n * ROW_H;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-20">
        {/* ── Top controls ── */}
        <div className="border-b border-border bg-card/30 px-6 py-4 sticky top-16 z-20 backdrop-blur">
          <div className="max-w-screen-2xl mx-auto flex flex-col gap-3">
            {/* Title row */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-sm font-bold text-foreground">Transformer Explainer</span>
              <span className="font-mono text-xs text-muted-foreground bg-card border border-border px-2 py-0.5 rounded">
                GPT-2 Small · {N_LAYERS} layers · {N_HEADS} heads · 768d
              </span>
              <div className="ml-auto font-mono text-[10px] text-muted-foreground">
                Hover tokens · switch heads · adjust temperature
              </div>
            </div>

            {/* Controls row */}
            <div className="flex items-center gap-4 flex-wrap">
              {/* Prompt */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <label className="font-mono text-xs text-muted-foreground shrink-0">Prompt</label>
                <input value={prompt} onChange={e => setPrompt(e.target.value)}
                  className="flex-1 min-w-48 max-w-xl font-mono text-sm bg-card border border-border rounded px-3 py-1.5 text-foreground focus:outline-none focus:border-primary/60" />
              </div>

              {/* Temperature */}
              <div className="flex items-center gap-2 shrink-0">
                <label className="font-mono text-xs text-muted-foreground">Temp</label>
                <input type="range" min={0.1} max={2.0} step={0.05} value={temp}
                  onChange={e => setTemp(+e.target.value)} className="w-28 accent-primary" />
                <motion.span key={temp}
                  initial={{ scale: 1.3, color: headColor }}
                  animate={{ scale: 1, color: headColor }}
                  className="font-mono text-xs font-bold w-8">
                  {temp.toFixed(1)}
                </motion.span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Layer selector ── */}
        <div className="border-b border-border bg-card/20 px-6 py-2">
          <div className="max-w-screen-2xl mx-auto flex items-center gap-3">
            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Block</span>
            <button onClick={() => setLayer(l => Math.max(1, l - 1))}
              className="p-0.5 rounded hover:bg-card text-muted-foreground hover:text-foreground">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <div className="flex gap-1">
              {Array.from({ length: N_LAYERS }, (_, i) => (
                <button key={i} onClick={() => setLayer(i + 1)}
                  className="w-6 h-6 rounded font-mono text-[10px] transition-all"
                  style={{
                    background: layer === i + 1 ? headColor : "rgba(255,255,255,0.05)",
                    color: layer === i + 1 ? "#fff" : "#6b7280",
                  }}>
                  {i + 1}
                </button>
              ))}
            </div>
            <button onClick={() => setLayer(l => Math.min(N_LAYERS, l + 1))}
              className="p-0.5 rounded hover:bg-card text-muted-foreground hover:text-foreground">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[10px] text-muted-foreground ml-2">
              Transformer Block {layer} · 11 more identical blocks
            </span>
          </div>
        </div>

        {/* ── Main visualization ── */}
        <div className="overflow-x-auto">
          <div className="px-6 py-6" style={{ minWidth: 900 }}>

            {/* Section header labels */}
            <div className="flex items-end gap-0 mb-1 font-mono text-[10px] text-muted-foreground uppercase tracking-wider select-none"
              style={{ paddingLeft: 104 }}>
              <div style={{ width: 52 }}>Embed</div>
              <div style={{ width: 16 }} />  {/* residual */}
              <div style={{ width: 300, color: headColor }}>Multi-head Self Attention</div>
              <div style={{ width: 20 }} />  {/* residual */}
              <div style={{ width: 170 }}>Attention ⊙</div>
              <div style={{ width: 16 }} />  {/* residual */}
              <div style={{ width: 62 }}>MLP</div>
              <div style={{ width: 16 }} />  {/* residual */}
              <div style={{ width: 80 }}>Output</div>
              <div style={{ width: 20 }} />
              <div style={{ color: headColor }}>Probabilities</div>
            </div>

            <div className="flex items-start" style={{ height: vizH }}>

              {/* ── Token labels (left) ── */}
              <div className="flex flex-col shrink-0" style={{ width: 104, paddingTop: PAD_V }}>
                {tokens.map((tok, i) => (
                  <div key={i}
                    className="flex items-center justify-end pr-3 font-mono text-sm cursor-pointer transition-all duration-150 select-none"
                    style={{
                      height: ROW_H,
                      color: hoveredToken === i ? TOKEN_COLORS[i % TOKEN_COLORS.length] : "#cbd5e1",
                      fontWeight: hoveredToken === i ? 700 : 400,
                    }}
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered(null)}>
                    {tok}
                  </div>
                ))}
              </div>

              {/* ── Embedding bars ── */}
              <div className="shrink-0 flex flex-col" style={{ width: 52, paddingTop: PAD_V }}>
                {tokens.map((_, i) => (
                  <div key={i} className="flex items-center" style={{ height: ROW_H }}
                    onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
                    <EmbedBars idx={i} active={hoveredToken === null || hoveredToken === i} />
                  </div>
                ))}
              </div>

              {/* ── Residual bracket (before attention) ── */}
              <ResidualBracket height={vizH} label="Residual" />

              {/* ── Attention flow SVG ── */}
              <div className="shrink-0" style={{ width: 300, height: vizH }}>
                <AttentionFlows n={n} weights={weights} activeQ={activeQ}
                  headColor={headColor} w={300} />
              </div>

              {/* ── Residual bracket (after attention) ── */}
              <ResidualBracket height={vizH} label="Residual" />

              {/* ── Attention matrix ── */}
              <div className="shrink-0" style={{ width: 170, height: vizH }}>
                <AttentionMatrix weights={weights} n={n}
                  hoveredRow={hoveredToken} onHover={setHovered} headColor={headColor} />
              </div>

              {/* ── Residual bracket (before MLP) ── */}
              <ResidualBracket height={vizH} label="Residual" />

              {/* ── MLP ── */}
              <div className="shrink-0" style={{ width: 62, height: vizH }}>
                <MlpColumn n={n} hoveredToken={hoveredToken} headColor={headColor} />
              </div>

              {/* ── Residual bracket (after MLP) ── */}
              <ResidualBracket height={vizH} label="Residual" />

              {/* ── Output token labels ── */}
              <div className="shrink-0 flex flex-col" style={{ width: 80, paddingTop: PAD_V }}>
                {tokens.map((tok, i) => {
                  const isLast = i === n - 1;
                  return (
                    <div key={i} className="flex items-center pl-2 font-mono text-sm"
                      style={{
                        height: ROW_H,
                        color: isLast ? headColor : "#64748b",
                        fontWeight: isLast ? 700 : 400,
                      }}>
                      {tok}
                    </div>
                  );
                })}
              </div>

              {/* ── Probability panel ── */}
              <div className="ml-4 shrink-0" style={{ width: 240, paddingTop: PAD_V / 2 }}>
                <div className="rounded-xl border border-border bg-card/30 p-3 h-full">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Probabilities
                    </span>
                    <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-full text-white"
                      style={{ background: headColor }}>
                      T={temp.toFixed(1)}
                    </span>
                  </div>
                  <div className="space-y-px overflow-y-auto" style={{ maxHeight: vizH - 48 }}>
                    <AnimatePresence mode="wait">
                      {probs.map((p, rank) => (
                        <ProbRow key={p.token + head + layer}
                          token={p.token} prob={p.prob} rank={rank} headColor={headColor} />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

            </div>{/* end flex row */}

            {/* ── Head selector ── */}
            <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">
                Attention Head
              </span>
              <button onClick={() => setHead(h => Math.max(1, h - 1))}
                className="p-0.5 rounded hover:bg-card text-muted-foreground">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <div className="flex gap-1 flex-wrap">
                {Array.from({ length: N_HEADS }, (_, i) => (
                  <motion.button key={i} onClick={() => setHead(i + 1)}
                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
                    className="w-7 h-7 rounded-lg font-mono text-[11px] transition-colors"
                    style={{
                      background: head === i + 1 ? HEAD_COLORS[i] : "rgba(255,255,255,0.05)",
                      color: head === i + 1 ? "#fff" : "#6b7280",
                      border: `1px solid ${head === i + 1 ? HEAD_COLORS[i] + "99" : "rgba(255,255,255,0.08)"}`,
                    }}>
                    {i + 1}
                  </motion.button>
                ))}
              </div>
              <button onClick={() => setHead(h => Math.min(N_HEADS, h + 1))}
                className="p-0.5 rounded hover:bg-card text-muted-foreground">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-[10px] text-muted-foreground ml-1">
                Head {head} of {N_HEADS}
              </span>
            </div>

            {/* ── Info cards ── */}
            <div className="mt-6 grid sm:grid-cols-3 gap-4">
              {[
                {
                  title: "Tokenization",
                  body: "Input text splits into subword tokens via BPE. Each token maps to a 768-dim embedding. The position embedding is added before the first layer.",
                },
                {
                  title: "Self-Attention (causal)",
                  body: `Each token attends to all previous tokens. Weights = softmax(QKᵀ/√d_k). Temperature reshapes the distribution — lower T sharpens focus, higher T spreads it.`,
                },
                {
                  title: `Next token · "${probs[0]?.token}"`,
                  body: `After 12 transformer blocks, the final hidden state feeds a linear layer over 50,257 vocabulary tokens. Top prediction: "${probs[0]?.token}" at ${(probs[0]?.prob * 100).toFixed(1)}%.`,
                },
              ].map(card => (
                <div key={card.title}
                  className="p-4 rounded-xl border border-border bg-card/30">
                  <div className="font-mono text-xs font-bold mb-1.5" style={{ color: headColor }}>
                    {card.title}
                  </div>
                  <div className="font-mono text-xs text-muted-foreground leading-relaxed">
                    {card.body}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Legend ── */}
            <div className="mt-4 flex items-center gap-5 px-1">
              {[
                { color: KQV_COLORS.K, label: "Key flows" },
                { color: KQV_COLORS.Q, label: "Query flows" },
                { color: KQV_COLORS.V, label: "Value flows" },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="w-6 h-1 rounded-full" style={{ background: l.color, opacity: 0.7 }} />
                  <span className="font-mono text-[10px] text-muted-foreground">{l.label}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: headColor, opacity: 0.7 }} />
                <span className="font-mono text-[10px] text-muted-foreground">Attention weight (matrix)</span>
              </div>
              <div className="ml-auto font-mono text-[10px] text-muted-foreground flex items-center gap-1">
                <Info className="w-3 h-3" />
                Hover a token to inspect its attention pattern
              </div>
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TransformerExplainer;
