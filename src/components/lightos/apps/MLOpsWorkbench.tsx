import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Plus, ArrowRight, FlaskConical } from "lucide-react";

const TEAL = "#00FF88";
const TEAL_DIM = "#3AA37A";
const GRID = "#1E2D4A";
const PANEL_BG = "#0A0E1A";

type TabId = "experiments" | "registry" | "training" | "deployments";
const TABS: { id: TabId; label: string }[] = [
  { id: "experiments",  label: "Experiments" },
  { id: "registry",     label: "Model Registry" },
  { id: "training",     label: "Training Jobs" },
  { id: "deployments",  label: "Deployments" },
];

interface Experiment {
  id: string;
  name: string;
  runs: number;
  updated: string;
  best: string;
  tags: string[];
}

const EXPERIMENTS: Experiment[] = [
  { id: "e1", name: "llama-3-finetune-v3",     runs: 12, updated: "2 hours ago", best: "val_loss=0.0847 · acc=94.2%", tags: ["production", "llama", "qlora"] },
  { id: "e2", name: "nce-kernel-benchmark",    runs: 5,  updated: "1 day ago",   best: "24,100 tok/s",                tags: ["benchmark", "nce"] },
  { id: "e3", name: "embedding-model-v2",      runs: 8,  updated: "3 days ago",  best: "MTEB=68.4",                    tags: ["embeddings"] },
];

interface Run {
  id: string; lr: string; batch: number; loss: number; acc: number; tiles: number; dur: string; best?: boolean;
}
const RUNS: Record<string, Run[]> = {
  e1: [
    { id: "run-009", lr: "2e-4", batch: 32, loss: 0.0847, acc: 94.2, tiles: 128, dur: "4h 12m", best: true },
    { id: "run-008", lr: "3e-4", batch: 32, loss: 0.0921, acc: 93.1, tiles: 128, dur: "4h 08m" },
    { id: "run-007", lr: "2e-4", batch: 16, loss: 0.0893, acc: 93.7, tiles: 64,  dur: "6h 44m" },
  ],
  e2: [
    { id: "run-005", lr: "—",    batch: 1,  loss: 0,      acc: 0,    tiles: 128, dur: "42m",   best: true },
  ],
  e3: [
    { id: "run-008", lr: "1e-4", batch: 64, loss: 0.19,   acc: 68.4, tiles: 64,  dur: "2h 04m", best: true },
  ],
};

const LOSS_SERIES = Array.from({ length: 30 }).map((_, i) => ({
  x: i,
  v: +(0.42 * Math.exp(-i / 9) + 0.08 + (Math.random() - 0.5) * 0.005).toFixed(4),
}));
const ACC_SERIES = Array.from({ length: 30 }).map((_, i) => ({
  x: i,
  v: +(78 + (1 - Math.exp(-i / 8)) * 16 + (Math.random() - 0.5) * 0.4).toFixed(2),
}));

const AXIS = { stroke: "#4B5B7A", tick: { fill: "#7A8AAA", fontSize: 10, fontFamily: "monospace" } };
const TOOLTIP = {
  contentStyle: { background: PANEL_BG, border: `1px solid ${GRID}`, fontFamily: "monospace", fontSize: 11 },
  labelStyle: { color: "#9AB0D0" },
};

function Chip({ label }: { label: string }) {
  return (
    <span className="px-1.5 py-0.5 rounded border border-border/70 bg-card/60 text-[10px] text-foreground/80">
      {label}
    </span>
  );
}

function ChartCard({ title, data, domain }: { title: string; data: { x: number; v: number }[]; domain?: [number, number] }) {
  return (
    <div className="rounded-xl border border-border p-3" style={{ background: PANEL_BG }}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs text-foreground">{title}</h4>
        <span className="text-[10px] text-foreground/50">3 epochs</span>
      </div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
            <XAxis dataKey="x" {...AXIS} />
            <YAxis domain={domain ?? ["auto", "auto"]} {...AXIS} />
            <Tooltip {...TOOLTIP} />
            <Line type="monotone" dataKey="v" stroke={TEAL} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ExperimentsView() {
  const [selected, setSelected] = useState<string>(EXPERIMENTS[0].id);
  const experiment = EXPERIMENTS.find((e) => e.id === selected)!;
  const runs = RUNS[selected] ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[35%_1fr] gap-4">
      {/* LEFT — experiment list */}
      <div className="flex flex-col gap-3">
        <button className="flex items-center gap-1.5 self-start px-3 py-1.5 rounded border border-[#00FF88]/50 bg-[#00FF88]/10 text-[#00FF88] text-xs hover:bg-[#00FF88]/20">
          <Plus className="w-3.5 h-3.5" />
          New Experiment
        </button>
        <div className="flex flex-col gap-2">
          {EXPERIMENTS.map((e) => {
            const active = e.id === selected;
            return (
              <button
                key={e.id}
                onClick={() => setSelected(e.id)}
                className={`text-left rounded-xl border p-3 transition ${
                  active
                    ? "border-[#00FF88]/50 bg-[#00FF88]/8"
                    : "border-border/60 bg-card/50 hover:border-primary/40"
                }`}
                style={active ? { borderLeftWidth: 3, borderLeftColor: TEAL, boxShadow: `0 0 18px ${TEAL}22` } : undefined}
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm text-foreground">{e.name}</div>
                  <div className="text-[10px] text-foreground/60">{e.runs} runs · {e.updated}</div>
                </div>
                <div className="text-[11px] text-foreground/70 mt-1">Best: <span className="text-[#00FF88]">{e.best}</span></div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {e.tags.map((t) => <Chip key={t} label={t} />)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT — run comparison */}
      <div className="flex flex-col gap-3">
        <div>
          <h3 className="text-sm text-foreground">{experiment.name} · Run Comparison</h3>
          <p className="text-[11px] text-foreground/60 mt-0.5">Auto-sorted by best metric · click any row for full run detail</p>
        </div>

        <div className="rounded-xl border border-border overflow-hidden" style={{ background: PANEL_BG }}>
          <table className="w-full text-left text-[12px]">
            <thead className="text-[10px] uppercase tracking-wider text-foreground/50">
              <tr className="border-b border-border/60">
                <th className="px-3 py-2 font-medium">Run</th>
                <th className="px-3 py-2 font-medium">LR</th>
                <th className="px-3 py-2 font-medium">Batch</th>
                <th className="px-3 py-2 font-medium">val_loss</th>
                <th className="px-3 py-2 font-medium">acc</th>
                <th className="px-3 py-2 font-medium">NCE Tiles</th>
                <th className="px-3 py-2 font-medium">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-foreground/85">
              {runs.map((r) => (
                <tr key={r.id} style={r.best ? { background: `${TEAL}12` } : undefined}>
                  <td className="px-3 py-2" style={r.best ? { color: TEAL } : undefined}>{r.id}{r.best && " ★"}</td>
                  <td className="px-3 py-2">{r.lr}</td>
                  <td className="px-3 py-2">{r.batch}</td>
                  <td className="px-3 py-2" style={r.best ? { color: TEAL } : undefined}>{r.loss.toFixed(4)}</td>
                  <td className="px-3 py-2" style={r.best ? { color: TEAL } : undefined}>{r.acc.toFixed(1)}%</td>
                  <td className="px-3 py-2">{r.tiles}</td>
                  <td className="px-3 py-2 text-foreground/70">{r.dur}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ChartCard title="Training Loss" data={LOSS_SERIES} />
          <ChartCard title="Validation Accuracy" data={ACC_SERIES} domain={[70, 100]} />
        </div>

        <div className="mt-1 flex items-center justify-between rounded-xl border border-dashed border-border/70 p-3">
          <div>
            <div className="text-xs text-foreground">Import PyTorch/CUDA model</div>
            <div className="text-[11px] text-foreground/60">Auto-apply NCE compatibility via LRCA runtime</div>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-border/70 text-foreground/85 hover:border-[#00FF88]/60 hover:text-[#00FF88] text-xs">
            <ArrowRight className="w-3.5 h-3.5" />
            Import CUDA Model
          </button>
        </div>
      </div>
    </div>
  );
}

function PlaceholderTab({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-border p-8 text-center text-foreground/60 text-sm" style={{ background: PANEL_BG }}>
      <FlaskConical className="w-6 h-6 mx-auto mb-2 text-[#00FF88]" />
      {label} — configured, streaming from MLOps control plane.
    </div>
  );
}

export function MLOpsWorkbench() {
  const [tab, setTab] = useState<TabId>("experiments");

  return (
    <div className="flex flex-col gap-4 mb-6 font-mono">
      <div className="flex items-center gap-1 border-b border-border/60">
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-2 text-xs border-b-2 -mb-px transition ${
                active
                  ? "border-[#00FF88] text-[#00FF88]"
                  : "border-transparent text-foreground/70 hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "experiments" ? (
        <ExperimentsView />
      ) : (
        <PlaceholderTab label={TABS.find((t) => t.id === tab)!.label} />
      )}
    </div>
  );
}
