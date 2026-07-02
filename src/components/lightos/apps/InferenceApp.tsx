// Inference Endpoints console for LightOS.
// Note: TokenFactoryApp remains available as its own component/app.
import { useEffect, useMemo, useState } from "react";
import { Plus, Play, Edit3, BarChart3, Trash2, Circle } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

const TEAL = "#00FFB2";
const AMBER = "#FFB800";
const GREEN = "#22c55e";

type Status = "Running" | "Scaling";
interface Endpoint {
  name: string; model: string; replicas: number; status: Status;
  rps: number; p99: number; tiles: number;
}

const INITIAL_ENDPOINTS: Endpoint[] = [
  { name: "llm-prod-01",   model: "llama-3.3-70b",     replicas: 3, status: "Running", rps: 142, p99: 280, tiles: 192 },
  { name: "embeddings-v2", model: "nomic-embed-1.5",   replicas: 2, status: "Running", rps: 890, p99: 12,  tiles: 32  },
  { name: "vision-api",    model: "llava-1.6",         replicas: 1, status: "Scaling", rps: 28,  p99: 640, tiles: 64  },
  { name: "coder-api",     model: "deepseek-coder-v3", replicas: 2, status: "Running", rps: 67,  p99: 195, tiles: 64  },
];
const ENDPOINTS = INITIAL_ENDPOINTS;

const MODEL_OPTIONS = [
  "llama-3.3-70b", "llama-3.1-8b", "nomic-embed-1.5",
  "llava-1.6", "deepseek-coder-v3", "mistral-7b-instruct",
];

function StatusPill({ s }: { s: Status }) {
  const isRun = s === "Running";
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11px]">
      {isRun ? (
        <span className="w-2 h-2 rounded-full" style={{ background: GREEN, boxShadow: `0 0 6px ${GREEN}` }} />
      ) : (
        <Circle className="w-2.5 h-2.5" style={{ color: AMBER, fill: AMBER }} />
      )}
      <span style={{ color: isRun ? GREEN : AMBER }}>{s}</span>
    </span>
  );
}

function seedSeries(base: number, jitter: number, n = 24) {
  return Array.from({ length: n }, (_, i) => ({
    x: i,
    y: Math.max(0, base + Math.sin(i / 2) * jitter * 0.5 + (Math.random() - 0.5) * jitter),
  }));
}

function Sparkline({
  title, value, unit, color, data,
}: { title: string; value: string; unit: string; color: string; data: { x: number; y: number }[] }) {
  const id = useMemo(() => `g-${Math.random().toString(36).slice(2, 8)}`, []);
  return (
    <div className="rounded-lg border border-border/40 bg-[#0F1629] p-3">
      <div className="text-[10px] font-mono uppercase tracking-widest text-foreground/50">{title}</div>
      <div className="flex items-baseline gap-1 mt-1">
        <span className="font-mono text-2xl font-bold" style={{ color }}>{value}</span>
        <span className="font-mono text-[10px] text-foreground/50">{unit}</span>
      </div>
      <div className="h-16 mt-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.6} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="y" stroke={color} strokeWidth={1.5} fill={`url(#${id})`} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function InferenceApp() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>(INITIAL_ENDPOINTS);
  const [selected, setSelected] = useState(INITIAL_ENDPOINTS[0].name);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState<{ name: string; model: string; replicas: number; status: Status }>({
    name: "", model: MODEL_OPTIONS[0], replicas: 1, status: "Running",
  });
  const createEndpoint = () => {
    const name = form.name.trim();
    if (!name) return;
    setEndpoints((p) => [
      ...p,
      { name, model: form.model, replicas: form.replicas, status: form.status, rps: 0, p99: 0, tiles: form.replicas * 32 },
    ]);
    setShowNew(false);
    setForm({ name: "", model: MODEL_OPTIONS[0], replicas: 1, status: "Running" });
  };
  const [prompt, setPrompt] = useState("");
  const [temp, setTemp] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(512);
  const [stream, setStream] = useState(true);
  const [response, setResponse] = useState(
    "The LightRail NCE architecture enables photonic-native compute with sub-millisecond fabric latency, unifying training and inference across a single coherent memory plane..."
  );

  const [series, setSeries] = useState({
    rps: seedSeries(142, 30),
    p99: seedSeries(280, 60),
    util: seedSeries(73, 10),
    kv: seedSeries(92, 5),
  });

  useEffect(() => {
    const t = setInterval(() => {
      setSeries((s) => ({
        rps: [...s.rps.slice(1), { x: s.rps.at(-1)!.x + 1, y: Math.max(0, s.rps.at(-1)!.y + (Math.random() - 0.5) * 20) }],
        p99: [...s.p99.slice(1), { x: s.p99.at(-1)!.x + 1, y: Math.max(50, s.p99.at(-1)!.y + (Math.random() - 0.5) * 40) }],
        util:[...s.util.slice(1), { x: s.util.at(-1)!.x + 1, y: Math.min(100, Math.max(30, s.util.at(-1)!.y + (Math.random() - 0.5) * 6)) }],
        kv:  [...s.kv.slice(1),  { x: s.kv.at(-1)!.x + 1,  y: Math.min(100, Math.max(70, s.kv.at(-1)!.y + (Math.random() - 0.5) * 3)) }],
      }));
    }, 1500);
    return () => clearInterval(t);
  }, []);

  const curr = (arr: { y: number }[]) => arr.at(-1)!.y;

  return (
    <div className="h-full overflow-auto bg-background text-foreground" style={{ background: "#0A0E1A" }}>
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-lg text-foreground/90">Inference Endpoints</h2>
          <button
            onClick={() => setShowNew(true)}
            className="inline-flex items-center gap-1.5 text-[12px] font-mono font-bold px-3 py-1.5 rounded-md text-black"
            style={{ background: TEAL, boxShadow: `0 0 12px ${TEAL}66` }}
          >
            <Plus className="w-4 h-4" /> New Endpoint
          </button>
        </div>

        {showNew && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowNew(false)}>
            <div
              className="w-[420px] rounded-lg border p-5 space-y-4"
              style={{ background: "#0F1629", borderColor: `${TEAL}55`, boxShadow: `0 0 40px ${TEAL}22` }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="font-mono text-sm font-bold" style={{ color: TEAL }}>New Endpoint</div>
                <button onClick={() => setShowNew(false)} className="text-foreground/50 hover:text-foreground text-lg leading-none">×</button>
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-foreground/50">Name</label>
                <input
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="my-endpoint-01"
                  className="mt-1 w-full font-mono text-[12px] bg-[#0A0E1A] border border-border/60 rounded px-2 py-1.5 text-foreground/90 focus:outline-none"
                  onFocus={(e) => (e.currentTarget.style.borderColor = TEAL)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "")}
                />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-foreground/50">Model</label>
                <select
                  value={form.model}
                  onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                  className="mt-1 w-full font-mono text-[12px] bg-[#0A0E1A] border border-border/60 rounded px-2 py-1.5 text-foreground/90"
                >
                  {MODEL_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-widest text-foreground/50">Replicas</label>
                  <input
                    type="number" min={1} max={16} value={form.replicas}
                    onChange={(e) => setForm((f) => ({ ...f, replicas: Math.max(1, parseInt(e.target.value) || 1) }))}
                    className="mt-1 w-full font-mono text-[12px] bg-[#0A0E1A] border border-border/60 rounded px-2 py-1.5 text-foreground/90"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-widest text-foreground/50">Initial Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Status }))}
                    className="mt-1 w-full font-mono text-[12px] bg-[#0A0E1A] border border-border/60 rounded px-2 py-1.5 text-foreground/90"
                  >
                    <option value="Running">Running</option>
                    <option value="Scaling">Scaling</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowNew(false)}
                  className="flex-1 text-[12px] font-mono py-2 rounded-md border border-border/60 text-foreground/70 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  onClick={createEndpoint}
                  disabled={!form.name.trim()}
                  className="flex-1 text-[12px] font-mono font-bold py-2 rounded-md text-black disabled:opacity-40"
                  style={{ background: TEAL, boxShadow: `0 0 12px ${TEAL}55` }}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="rounded-lg border border-border/40 overflow-hidden" style={{ background: "#0F1629" }}>
          <table className="w-full text-left">
            <thead className="bg-[#1E2D4A]/50 text-[10px] font-mono uppercase tracking-widest text-foreground/60">
              <tr>
                {["Name","Model","Replicas","Status","Req/s","p99 Latency","NCE Tiles","Actions"].map((h) => (
                  <th key={h} className="px-3 py-2 font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {endpoints.map((e, i) => (
                <tr key={e.name} className={`border-t border-border/30 ${i % 2 ? "bg-white/[0.015]" : ""}`}>
                  <td className="px-3 py-2 font-mono text-[12px] text-foreground/90">{e.name}</td>
                  <td className="px-3 py-2 font-mono text-[12px] text-foreground/70">{e.model}</td>
                  <td className="px-3 py-2 font-mono text-[12px]" style={{ color: TEAL }}>{e.replicas}</td>
                  <td className="px-3 py-2"><StatusPill s={e.status} /></td>
                  <td className="px-3 py-2 font-mono text-[12px]" style={{ color: TEAL }}>{e.rps}</td>
                  <td className="px-3 py-2 font-mono text-[12px]" style={{ color: TEAL }}>{e.p99}ms</td>
                  <td className="px-3 py-2 font-mono text-[12px]" style={{ color: TEAL }}>{e.tiles}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1.5">
                      <button className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded border border-border/60 text-foreground/70 hover:border-primary/40 hover:text-primary transition">
                        <Edit3 className="w-3 h-3" /> Edit
                      </button>
                      <button className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded border border-border/60 text-foreground/70 hover:border-primary/40 hover:text-primary transition">
                        <BarChart3 className="w-3 h-3" /> Metrics
                      </button>
                      <button className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded border border-red-400/40 text-red-400 hover:bg-red-400/10 transition">
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Playground */}
          <div className="rounded-lg border border-border/40 p-4" style={{ background: "#0F1629" }}>
            <div className="font-mono text-sm text-foreground/85 mb-3">Request Playground</div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-foreground/50">Endpoint</label>
                <select
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  className="mt-1 w-full font-mono text-[12px] bg-[#0A0E1A] border border-border/60 rounded px-2 py-1.5 text-foreground/90 focus:outline-none focus:border-[color:var(--teal)]"
                  style={{ ["--teal" as any]: TEAL }}
                >
                  {endpoints.map((e) => <option key={e.name} value={e.name}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-foreground/50">Prompt</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ask something..."
                  rows={4}
                  className="mt-1 w-full font-mono text-[12px] bg-[#0A0E1A] border border-border/60 rounded px-2 py-1.5 text-foreground/90 resize-none focus:outline-none"
                  onFocus={(e) => (e.currentTarget.style.borderColor = TEAL)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "")}
                />
              </div>
              <div className="grid grid-cols-3 gap-3 items-end">
                <div className="col-span-2">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-foreground/50">
                    Temperature: <span style={{ color: TEAL }}>{temp.toFixed(1)}</span>
                  </label>
                  <input
                    type="range" min={0} max={2} step={0.1} value={temp}
                    onChange={(e) => setTemp(parseFloat(e.target.value))}
                    className="w-full mt-1 accent-[color:var(--teal)]"
                    style={{ ["--teal" as any]: TEAL }}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-widest text-foreground/50">Max Tokens</label>
                  <input
                    type="number" value={maxTokens} onChange={(e) => setMaxTokens(parseInt(e.target.value) || 0)}
                    className="mt-1 w-full font-mono text-[12px] bg-[#0A0E1A] border border-border/60 rounded px-2 py-1.5 text-foreground/90"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-widest text-foreground/50">Stream</span>
                <button
                  onClick={() => setStream((s) => !s)}
                  className="relative w-10 h-5 rounded-full transition-colors"
                  style={{ background: stream ? TEAL : "#334155" }}
                  aria-pressed={stream}
                >
                  <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                    style={{ left: stream ? "22px" : "2px" }} />
                </button>
                <span className="font-mono text-[11px]" style={{ color: stream ? TEAL : "#94a3b8" }}>{stream ? "ON" : "OFF"}</span>
              </div>
              <button
                className="w-full inline-flex items-center justify-center gap-1.5 text-[12px] font-mono font-bold py-2 rounded-md text-black"
                style={{ background: TEAL, boxShadow: `0 0 12px ${TEAL}55` }}
              >
                <Play className="w-4 h-4" /> Send Request
              </button>
              <div className="rounded border border-border/40 bg-[#0A0E1A] p-3 font-mono text-[11px] text-foreground/80 whitespace-pre-wrap leading-relaxed max-h-40 overflow-auto">
                {response}
              </div>
            </div>
          </div>

          {/* Metrics */}
          <div className="rounded-lg border border-border/40 p-4" style={{ background: "#0F1629" }}>
            <div className="font-mono text-sm text-foreground/85 mb-3">Endpoint Metrics</div>
            <div className="grid grid-cols-2 gap-3">
              <Sparkline title="Requests / sec"     value={curr(series.rps).toFixed(0)} unit="rps"  color={TEAL}  data={series.rps} />
              <Sparkline title="p99 Latency"        value={curr(series.p99).toFixed(0)} unit="ms"   color={AMBER} data={series.p99} />
              <Sparkline title="NCE Tile Util."     value={curr(series.util).toFixed(0)} unit="%"   color={TEAL}  data={series.util} />
              <Sparkline title="KV Cache Hit Rate"  value={curr(series.kv).toFixed(1)}   unit="%"   color={GREEN} data={series.kv} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
