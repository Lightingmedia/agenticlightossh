import { useState } from "react";

const CHART_BG = "#0A0E1A";
const TEAL = "#00FF88";
const AMBER = "#F5A524";
const RED = "#EF4444";
const GREEN_COOL = "#22c55e";

type FanMode = "AUTO" | "MANUAL";
interface FanZone {
  id: number;
  name: string;
  pct: number;
  rpm: number;
  status: "Normal" | "Warning" | "Critical";
  mode: FanMode;
}

const INITIAL_ZONES: FanZone[] = [
  { id: 1, name: "NCE-0 Cooling", pct: 68, rpm: 5440, status: "Normal",  mode: "AUTO" },
  { id: 2, name: "NCE-1 Cooling", pct: 61, rpm: 4880, status: "Normal",  mode: "AUTO" },
  { id: 3, name: "PIC Cooling",   pct: 45, rpm: 3600, status: "Normal",  mode: "AUTO" },
  { id: 4, name: "PSU Cooling",   pct: 74, rpm: 5920, status: "Warning", mode: "MANUAL" },
];

const EVENTS = [
  { ts: "2026-07-01 09:14:22", dev: "NCE-0", temp: "302°C", dur: "4.2s", load: "training_run_v3", critical: true },
  { ts: "2026-06-30 22:48:11", dev: "NCE-1", temp: "298°C", dur: "1.8s", load: "llm-prod-01 inference", critical: false },
];

function Kpi({ label, value, tone = "teal" as "teal" | "default" }) {
  const color = tone === "teal" ? "text-[#00FF88]" : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-card/60 p-3">
      <div className="text-[10px] uppercase tracking-wider text-foreground/50 font-mono">{label}</div>
      <div className={`font-mono text-2xl mt-1 ${color}`}>{value}</div>
    </div>
  );
}

function HeatBlock({ name, temp, color, height }: { name: string; temp: string; color: string; height: number }) {
  return (
    <div
      className="w-full rounded-md border border-border/50 relative overflow-hidden flex items-center justify-between px-3"
      style={{ background: `${color}33`, height, boxShadow: `inset 0 0 24px ${color}22` }}
    >
      <span className="font-mono text-xs text-foreground/90">{name}</span>
      <span className="font-mono text-sm" style={{ color }}>{temp}</span>
    </div>
  );
}

function ThermalHeatmapPanel() {
  return (
    <div className="rounded-xl border border-border p-4" style={{ background: CHART_BG }}>
      <h3 className="font-mono text-sm text-foreground mb-3">Thermal Heatmap</h3>
      <div className="flex flex-col gap-2 p-3 rounded-lg border border-border/60 bg-background/40">
        <HeatBlock name="NCE-0 Cooling Zone" temp="264°C" color="#00875A" height={70} />
        <HeatBlock name="TFLN PIC"            temp="48°C"  color={GREEN_COOL} height={40} />
        <HeatBlock name="NCE-1 Cooling Zone" temp="258°C" color="#00875A" height={70} />
        <HeatBlock name="Power Supply Unit"   temp="289°C" color={AMBER} height={55} />
      </div>
      <div className="mt-3 flex flex-wrap gap-3 font-mono text-[10px] text-foreground/70">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: GREEN_COOL }} />Green &lt;250°C</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#00875A" }} />Teal 250-280°C</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: AMBER }} />Amber 280-295°C</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: RED }} />Red &gt;300°C</span>
      </div>
    </div>
  );
}

function FanControlPanel() {
  const [zones, setZones] = useState<FanZone[]>(INITIAL_ZONES);

  const setMode = (id: number, mode: FanMode) =>
    setZones((zs) => zs.map((z) => (z.id === id ? { ...z, mode } : z)));

  const setPct = (id: number, pct: number) =>
    setZones((zs) =>
      zs.map((z) =>
        z.id === id ? { ...z, pct, rpm: Math.round((pct / 100) * 8000) } : z
      )
    );

  return (
    <div className="rounded-xl border border-border p-4" style={{ background: CHART_BG }}>
      <h3 className="font-mono text-sm text-foreground mb-3">Fan Control</h3>
      <div className="flex flex-col divide-y divide-border/50">
        {zones.map((z) => {
          const statusColor = z.status === "Normal" ? TEAL : z.status === "Warning" ? AMBER : RED;
          return (
            <div key={z.id} className="py-3 flex flex-col gap-2">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-foreground/90">Zone {z.id} · {z.name}</span>
                <span style={{ color: statusColor }} className="flex items-center gap-1.5">
                  {z.status === "Warning" ? "⚠" : "●"} {z.status}
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px] text-foreground/75">
                <span className="text-[#00FF88] w-14">{z.pct}%</span>
                <span className="w-24">{z.rpm.toLocaleString()} RPM</span>
                <div className="ml-auto flex items-center gap-1">
                  {(["AUTO", "MANUAL"] as FanMode[]).map((m) => {
                    const active = z.mode === m;
                    const accent = m === "AUTO" ? TEAL : AMBER;
                    return (
                      <button
                        key={m}
                        onClick={() => setMode(z.id, m)}
                        className="px-2 py-0.5 rounded border text-[10px]"
                        style={{
                          borderColor: active ? accent : "#2A3550",
                          color: active ? accent : "#7A8AAA",
                          background: active ? `${accent}18` : "transparent",
                        }}
                      >
                        {active ? `${m} ✓` : m}
                      </button>
                    );
                  })}
                </div>
              </div>
              {z.mode === "MANUAL" && (
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={z.pct}
                  onChange={(e) => setPct(z.id, Number(e.target.value))}
                  className="w-full accent-[#F5A524]"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ThrottlingTable() {
  return (
    <div className="rounded-xl border border-border overflow-hidden" style={{ background: CHART_BG }}>
      <div className="px-4 py-2.5 border-b border-border/60 flex items-center justify-between">
        <h3 className="font-mono text-sm text-foreground">Throttling Events (Last 24h)</h3>
        <span className="text-[10px] font-mono text-foreground/50">{EVENTS.length} events</span>
      </div>
      <table className="w-full text-left text-[12px] font-mono">
        <thead className="text-[10px] uppercase tracking-wider text-foreground/50">
          <tr className="border-b border-border/60">
            <th className="px-4 py-2 font-medium">Timestamp</th>
            <th className="px-4 py-2 font-medium">Device</th>
            <th className="px-4 py-2 font-medium">Temperature</th>
            <th className="px-4 py-2 font-medium">Duration</th>
            <th className="px-4 py-2 font-medium">Workload</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40 text-foreground/85">
          {EVENTS.map((e) => (
            <tr key={e.ts} style={e.critical ? { background: `${RED}18` } : undefined}>
              <td className="px-4 py-2 text-foreground/70">{e.ts}</td>
              <td className="px-4 py-2">{e.dev}</td>
              <td className="px-4 py-2" style={{ color: e.critical ? RED : AMBER }}>{e.temp}</td>
              <td className="px-4 py-2">{e.dur}</td>
              <td className="px-4 py-2 text-foreground/70">{e.load}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ThermalControlApp() {
  return (
    <div className="h-full w-full overflow-auto bg-background/60 p-5">
      <div className="flex flex-col gap-4 font-mono">
        <div>
          <h2 className="text-xl text-foreground">Thermal Control</h2>
          <p className="text-xs text-foreground/60 mt-0.5">Cooling zones · fan profiles · throttling history</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="NCE-0" value="294°C" tone="teal" />
          <Kpi label="NCE-1" value="276°C" tone="teal" />
          <Kpi label="Inlet" value="22°C"  tone="teal" />
          <Kpi label="PUE"   value="1.38" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ThermalHeatmapPanel />
          <FanControlPanel />
        </div>

        <ThrottlingTable />
      </div>
    </div>
  );
}
