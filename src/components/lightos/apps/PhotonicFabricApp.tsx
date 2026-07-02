// Photonic Fabric — TFLN PIC optical interconnect visualizer.
import { useMemo, useState } from "react";

const TEAL = "#00FFB2";
const RED = "#FF4D4D";
const GREEN = "#22c55e";

type ChStatus = "ACTIVE" | "IDLE" | "ERROR";
interface Channel {
  n: number;
  wavelength: number; // nm
  frequency: number;  // THz
  status: ChStatus;
  dataRate: number;   // Gbps
  power: number;      // dBm
  ber: number;
  snr: number;        // dB
  flow?: string;
}

// Deterministic mock: 42 active, 18 idle, 4 error across 64 channels.
const ERROR_CH = new Set([7, 23, 41, 58]);
const IDLE_CH = new Set([2, 5, 11, 15, 20, 27, 30, 34, 38, 43, 47, 50, 53, 56, 60, 62, 63, 64]);

function buildChannels(): Channel[] {
  return Array.from({ length: 64 }, (_, i) => {
    const n = i + 1;
    const wavelength = +(1529.55 + i * 0.8).toFixed(2);
    const frequency = +(196.1 - i * 0.05).toFixed(2);
    const status: ChStatus = ERROR_CH.has(n) ? "ERROR" : IDLE_CH.has(n) ? "IDLE" : "ACTIVE";
    const power = status === "ACTIVE" ? -1 - (i % 5) * 0.25 : status === "ERROR" ? -6.5 : -12;
    const ber = status === "ACTIVE" ? 1.1e-12 * (1 + (i % 4) * 0.4) : status === "ERROR" ? 3.2e-4 : 0;
    const snr = status === "ACTIVE" ? +(28 + (i % 6) * 0.4).toFixed(1) : status === "ERROR" ? 8.1 : 0;
    return {
      n, wavelength, frequency, status,
      dataRate: status === "ACTIVE" ? 800 : 0,
      power: +power.toFixed(2), ber, snr,
      flow: status === "ACTIVE" ? `NCE-${i % 8} → NCE-${(i + 1) % 8} (Tensor Parallel Allreduce)` : undefined,
    };
  });
}

function pad(n: number) { return n.toString().padStart(2, "0"); }

function ChannelCard({ ch, selected, onClick }: { ch: Channel; selected: boolean; onClick: () => void }) {
  const isActive = ch.status === "ACTIVE";
  const isError = ch.status === "ERROR";
  const border = isActive ? TEAL : isError ? RED : "#1E2D4A";
  const bg = isError ? "rgba(255,77,77,0.08)" : isActive ? "rgba(0,255,178,0.04)" : "#0F1629";
  const glow = isActive ? `0 0 10px ${TEAL}44` : isError ? `0 0 10px ${RED}55` : "none";
  return (
    <button
      onClick={onClick}
      className="text-left rounded-md p-1.5 transition-all"
      style={{
        background: bg,
        border: `1px solid ${border}`,
        boxShadow: selected ? `0 0 0 2px ${TEAL}, ${glow}` : glow,
        minHeight: 72,
      }}
    >
      <div className="font-mono text-[9px] text-foreground/60">CH-{pad(ch.n)}</div>
      <div className="font-mono text-[10px] mt-0.5" style={{ color: isActive ? TEAL : isError ? RED : "#94a3b8" }}>
        {ch.wavelength}nm
      </div>
      {isActive && (
        <div className="font-mono text-[9px] mt-0.5" style={{ color: TEAL }}>800 Gbps</div>
      )}
      {isError && (
        <div className="font-mono text-[9px] mt-0.5" style={{ color: RED }}>ERROR</div>
      )}
      {ch.status === "IDLE" && (
        <div className="font-mono text-[9px] mt-0.5 text-foreground/40">idle</div>
      )}
    </button>
  );
}

function StatusBadge({ s }: { s: ChStatus }) {
  const c = s === "ACTIVE" ? TEAL : s === "ERROR" ? RED : "#94a3b8";
  return (
    <span
      className="inline-block font-mono text-[10px] px-2 py-0.5 rounded-full font-bold"
      style={{ background: `${c}22`, color: c, border: `1px solid ${c}66` }}
    >
      {s}
    </span>
  );
}

function DetailRow({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border/30 py-1.5">
      <span className="text-[10px] font-mono uppercase tracking-widest text-foreground/50">{label}</span>
      <span className="font-mono text-[12px]" style={{ color: ok === false ? RED : ok ? GREEN : "#e2e8f0" }}>
        {value}{ok !== undefined && <span className="ml-1">{ok ? "✓" : "✗"}</span>}
      </span>
    </div>
  );
}

export function PhotonicFabricApp() {
  const channels = useMemo(buildChannels, []);
  const [selectedN, setSelectedN] = useState(12);
  const selected = channels[selectedN - 1];

  const activeCount = channels.filter((c) => c.status === "ACTIVE").length;
  const idleCount = channels.filter((c) => c.status === "IDLE").length;
  const errCount = channels.filter((c) => c.status === "ERROR").length;

  return (
    <div className="h-full overflow-auto text-foreground" style={{ background: "#0A0E1A" }}>
      <div className="p-5 space-y-4">
        {/* Header */}
        <div>
          <h2 className="font-mono text-lg text-foreground/95">Photonic Fabric — TFLN PIC</h2>
          <div className="font-mono text-[11px] text-foreground/50 mt-0.5">
            X2 Node · 64-Channel WDM · C-Band (193.1–196.1 THz)
          </div>
          <div className="flex gap-4 mt-2 font-mono text-[10px]">
            <span style={{ color: TEAL }}>● {activeCount} ACTIVE</span>
            <span className="text-foreground/50">● {idleCount} IDLE</span>
            <span style={{ color: RED }}>● {errCount} ERROR</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
          {/* Grid */}
          <div className="rounded-lg border border-border/40 p-3" style={{ background: "#0F1629" }}>
            <div className="font-mono text-sm text-foreground/85 mb-3">WDM Channel Grid</div>
            <div className="grid grid-cols-8 gap-2">
              {channels.map((ch) => (
                <ChannelCard
                  key={ch.n}
                  ch={ch}
                  selected={ch.n === selectedN}
                  onClick={() => setSelectedN(ch.n)}
                />
              ))}
            </div>
          </div>

          {/* Detail */}
          <div className="rounded-lg border border-border/40 p-4" style={{ background: "#0F1629" }}>
            <div className="font-mono text-sm text-foreground/85 mb-3">Channel Detail</div>
            <div className="space-y-1">
              <DetailRow label="Channel" value={`CH-${pad(selected.n)}`} />
              <DetailRow label="Wavelength" value={`${selected.wavelength} nm`} />
              <DetailRow label="Frequency" value={`${selected.frequency} THz`} />
              <div className="flex items-center justify-between border-b border-border/30 py-1.5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-foreground/50">Status</span>
                <StatusBadge s={selected.status} />
              </div>
              <DetailRow label="Data Rate" value={selected.dataRate ? `${selected.dataRate} Gbps` : "—"} />
              <DetailRow label="Optical Power" value={`${selected.power} dBm`} ok={selected.power > -3} />
              <DetailRow
                label="BER"
                value={selected.ber ? selected.ber.toExponential(1).replace("e+0", "e+").replace("e-0", "e-") : "—"}
                ok={selected.ber > 0 && selected.ber < 1e-9}
              />
              <DetailRow label="SNR" value={selected.snr ? `${selected.snr} dB` : "—"} ok={selected.snr > 20} />
              <div className="pt-2">
                <div className="text-[10px] font-mono uppercase tracking-widest text-foreground/50 mb-1">Active Flow</div>
                <div className="font-mono text-[11px] text-foreground/85 leading-relaxed">
                  {selected.flow ?? <span className="text-foreground/40">— no flow —</span>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* LightLink Status */}
        <div>
          <div className="font-mono text-sm text-foreground/85 mb-2">LightLink Status</div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-border/40 p-4 text-center" style={{ background: "#0F1629" }}>
              <div className="font-mono text-3xl font-bold" style={{ color: TEAL }}>387<span className="text-lg text-foreground/50"> Gbps</span></div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-foreground/50 mt-1">Throughput</div>
            </div>
            <div className="rounded-lg border border-border/40 p-4 text-center" style={{ background: "#0F1629" }}>
              <div className="font-mono text-3xl font-bold" style={{ color: TEAL }}>4.2<span className="text-lg text-foreground/50"> µs</span></div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-foreground/50 mt-1">Host Latency</div>
            </div>
            <div className="rounded-lg border border-border/40 p-4 text-center" style={{ background: "#0F1629" }}>
              <div className="font-mono text-3xl font-bold" style={{ color: GREEN }}>0 <span className="text-lg">✓</span></div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-foreground/50 mt-1">Errors (24h)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
