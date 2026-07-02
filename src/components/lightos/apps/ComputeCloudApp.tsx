// Compute Cloud — NCE instance provisioning console for LightOS.
import { useMemo, useState } from "react";
import { Play, Terminal, Square, ChevronDown, Trash2, Server } from "lucide-react";

const TEAL = "#00FFB2";
const AMBER = "#FFB800";
const GRAY = "#64748b";
const GREEN = "#22c55e";

type InstStatus = "Running" | "Spot" | "Stopped";
interface Instance {
  id: string;
  type: string;
  tiles: number;
  ngm: string;
  status: InstStatus;
  cuda: boolean;
  uptime: string;
  costHr: number;
}

const INITIAL: Instance[] = [
  { id: "inst-001", type: "nce.xlarge",  tiles: 128, ngm: "48 GB",  status: "Running", cuda: true,  uptime: "5d 14h", costHr: 3.84 },
  { id: "inst-002", type: "nce.large",   tiles: 64,  ngm: "24 GB",  status: "Running", cuda: false, uptime: "2d 6h",  costHr: 1.92 },
  { id: "inst-003", type: "nce.medium",  tiles: 32,  ngm: "12 GB",  status: "Running", cuda: true,  uptime: "18h",    costHr: 0.96 },
  { id: "inst-004", type: "nce.x2.spot", tiles: 256, ngm: "192 GB", status: "Spot",    cuda: false, uptime: "45m",    costHr: 1.80 },
  { id: "inst-005", type: "nce.small",   tiles: 16,  ngm: "6 GB",   status: "Stopped", cuda: false, uptime: "—",      costHr: 0.00 },
];

const NCE_TYPES = [
  { id: "nce.nano",   tiles: 4,   ngm: "1.5 GB", hr: 0.12 },
  { id: "nce.small",  tiles: 16,  ngm: "6 GB",   hr: 0.48 },
  { id: "nce.medium", tiles: 32,  ngm: "12 GB",  hr: 0.96 },
  { id: "nce.large",  tiles: 64,  ngm: "24 GB",  hr: 1.92 },
  { id: "nce.xlarge", tiles: 128, ngm: "48 GB",  hr: 3.84 },
  { id: "nce.x2",     tiles: 256, ngm: "192 GB", hr: 7.20 },
];

function StatusPill({ s }: { s: InstStatus }) {
  const color = s === "Running" ? GREEN : s === "Spot" ? AMBER : GRAY;
  const dot = s === "Running" ? "●" : s === "Spot" ? "◑" : "○";
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11px]" style={{ color }}>
      <span>{dot}</span> {s}
    </span>
  );
}

function CudaPill({ on }: { on: boolean }) {
  return (
    <span
      className="inline-block font-mono text-[10px] px-2 py-0.5 rounded-full font-bold"
      style={{
        background: on ? `${TEAL}22` : "#33415555",
        color: on ? TEAL : "#94a3b8",
        border: `1px solid ${on ? TEAL + "66" : "#33415588"}`,
      }}
    >
      {on ? "ON" : "OFF"}
    </span>
  );
}

export function ComputeCloudApp() {
  const [instances, setInstances] = useState<Instance[]>(INITIAL);
  const [selType, setSelType] = useState("nce.small");
  const [cuda, setCuda] = useState(false);
  const [spot, setSpot] = useState(false);

  const running = instances.filter((i) => i.status === "Running").length;
  const tilesAlloc = useMemo(
    () => instances.filter((i) => i.status !== "Stopped").reduce((s, i) => s + i.tiles, 0),
    [instances],
  );
  const monthly = useMemo(
    () => Math.round(instances.filter((i) => i.status !== "Stopped").reduce((s, i) => s + i.costHr * 24 * 30, 0)),
    [instances],
  );

  const provision = () => {
    const t = NCE_TYPES.find((x) => x.id === selType)!;
    const id = `inst-${String(instances.length + 1).padStart(3, "0")}`;
    setInstances((p) => [
      ...p,
      {
        id,
        type: spot ? `${t.id}.spot` : t.id,
        tiles: t.tiles,
        ngm: t.ngm,
        status: spot ? "Spot" : "Running",
        cuda,
        uptime: "just now",
        costHr: spot ? +(t.hr * 0.25).toFixed(2) : t.hr,
      },
    ]);
  };

  const toggleStop = (id: string) => {
    setInstances((p) =>
      p.map((i) =>
        i.id === id
          ? { ...i, status: i.status === "Stopped" ? "Running" : "Stopped", uptime: i.status === "Stopped" ? "just now" : "—" }
          : i,
      ),
    );
  };

  const remove = (id: string) => setInstances((p) => p.filter((i) => i.id !== id));

  return (
    <div className="h-full overflow-auto text-foreground" style={{ background: "#0A0E1A" }}>
      <div className="p-5 space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border-l-4 p-4" style={{ background: "#0F1629", borderLeftColor: TEAL, borderTop: "1px solid #1E2D4A", borderRight: "1px solid #1E2D4A", borderBottom: "1px solid #1E2D4A" }}>
            <div className="text-[10px] font-mono uppercase tracking-widest text-foreground/50">Running Instances</div>
            <div className="font-mono text-3xl font-bold mt-1" style={{ color: TEAL }}>{running}</div>
          </div>
          <div className="rounded-lg border-l-4 p-4" style={{ background: "#0F1629", borderLeftColor: AMBER, borderTop: "1px solid #1E2D4A", borderRight: "1px solid #1E2D4A", borderBottom: "1px solid #1E2D4A" }}>
            <div className="text-[10px] font-mono uppercase tracking-widest text-foreground/50">NCE Tiles</div>
            <div className="font-mono text-3xl font-bold mt-1" style={{ color: AMBER }}>{tilesAlloc}<span className="text-foreground/50 text-lg">/256</span></div>
            <div className="text-[10px] font-mono text-foreground/50">allocated</div>
          </div>
          <div className="rounded-lg border-l-4 p-4" style={{ background: "#0F1629", borderLeftColor: "#ffffff", borderTop: "1px solid #1E2D4A", borderRight: "1px solid #1E2D4A", borderBottom: "1px solid #1E2D4A" }}>
            <div className="text-[10px] font-mono uppercase tracking-widest text-foreground/50">Cost</div>
            <div className="font-mono text-3xl font-bold mt-1 text-white">${monthly.toLocaleString()}<span className="text-foreground/50 text-lg">/mo</span></div>
          </div>
        </div>

        {/* Instance table */}
        <div className="rounded-lg border border-border/40 overflow-hidden" style={{ background: "#0F1629" }}>
          <table className="w-full text-left">
            <thead className="bg-[#1E2D4A]/60 text-[10px] font-mono uppercase tracking-widest text-foreground/60">
              <tr>
                {["Instance ID","Type","Tiles","NGM","Status","CUDA Compat","Uptime","Cost/hr","Actions"].map((h) => (
                  <th key={h} className="px-3 py-2 font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {instances.map((i, idx) => (
                <tr key={i.id} className={`border-t border-border/30 ${idx % 2 ? "bg-white/[0.015]" : ""}`}>
                  <td className="px-3 py-2 font-mono text-[12px] text-foreground/90">{i.id}</td>
                  <td className="px-3 py-2 font-mono text-[12px] text-foreground/70">{i.type}</td>
                  <td className="px-3 py-2 font-mono text-[12px]" style={{ color: TEAL }}>{i.tiles}</td>
                  <td className="px-3 py-2 font-mono text-[12px]" style={{ color: TEAL }}>{i.ngm}</td>
                  <td className="px-3 py-2"><StatusPill s={i.status} /></td>
                  <td className="px-3 py-2"><CudaPill on={i.cuda} /></td>
                  <td className="px-3 py-2 font-mono text-[12px] text-foreground/80">{i.uptime}</td>
                  <td className="px-3 py-2 font-mono text-[12px]" style={{ color: TEAL }}>${i.costHr.toFixed(2)}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1.5">
                      {i.status === "Stopped" ? (
                        <>
                          <button onClick={() => toggleStop(i.id)} className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded border" style={{ borderColor: `${TEAL}66`, color: TEAL }}>
                            <Play className="w-3 h-3" /> Start
                          </button>
                          <button onClick={() => remove(i.id)} className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded border border-red-400/40 text-red-400 hover:bg-red-400/10">
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded border border-border/60 text-foreground/70 hover:border-primary/40 hover:text-primary">
                            <Terminal className="w-3 h-3" /> SSH
                          </button>
                          <button onClick={() => toggleStop(i.id)} className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded border border-border/60 text-foreground/70 hover:border-red-400/50 hover:text-red-400">
                            <Square className="w-3 h-3" /> Stop
                          </button>
                          <button className="inline-flex items-center text-[10px] font-mono px-1.5 py-1 rounded border border-border/60 text-foreground/70">
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Provisioning card */}
        <div className="rounded-lg border border-border/40 p-4" style={{ background: "#0F1629" }}>
          <div className="flex items-center gap-2 mb-3">
            <Server className="w-4 h-4" style={{ color: TEAL }} />
            <div className="font-mono text-sm text-foreground/90">Provision NCE Instance</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {NCE_TYPES.map((t) => {
              const sel = selType === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelType(t.id)}
                  className="text-left rounded-lg p-3 transition"
                  style={{
                    background: sel ? `${TEAL}0d` : "#0A0E1A",
                    border: `1px solid ${sel ? TEAL : "#1E2D4A"}`,
                    boxShadow: sel ? `0 0 12px ${TEAL}33` : "none",
                  }}
                >
                  <div className="font-mono text-sm font-bold" style={{ color: sel ? TEAL : "#e2e8f0" }}>{t.id}</div>
                  <div className="font-mono text-[11px] text-foreground/60 mt-1">{t.tiles} tiles · {t.ngm}</div>
                  <div className="font-mono text-[11px] mt-1" style={{ color: sel ? TEAL : "#94a3b8" }}>${t.hr.toFixed(2)}/hr</div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-6 mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-[11px] font-mono uppercase tracking-widest text-foreground/60">CUDA Compat</span>
              <button
                onClick={() => setCuda((v) => !v)}
                className="relative w-10 h-5 rounded-full transition-colors"
                style={{ background: cuda ? TEAL : "#334155" }}
              >
                <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: cuda ? "22px" : "2px" }} />
              </button>
              <span className="font-mono text-[11px]" style={{ color: cuda ? TEAL : "#94a3b8" }}>{cuda ? "ON" : "OFF"}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-[11px] font-mono uppercase tracking-widest text-foreground/60">Spot Instance</span>
              <button
                onClick={() => setSpot((v) => !v)}
                className="relative w-10 h-5 rounded-full transition-colors"
                style={{ background: spot ? AMBER : "#334155" }}
              >
                <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: spot ? "22px" : "2px" }} />
              </button>
              <span className="font-mono text-[11px]" style={{ color: spot ? AMBER : "#94a3b8" }}>{spot ? "ON" : "OFF"}</span>
            </label>
          </div>

          <button
            onClick={provision}
            className="w-full mt-4 inline-flex items-center justify-center gap-1.5 text-[13px] font-mono font-bold py-2.5 rounded-md text-black"
            style={{ background: TEAL, boxShadow: `0 0 14px ${TEAL}66` }}
          >
            <Play className="w-4 h-4" /> Provision Instance
          </button>
        </div>
      </div>
    </div>
  );
}
