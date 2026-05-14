import { Building2, Zap, Thermometer, Droplets, Wind, Gauge } from "lucide-react";

const HALLS = [
  { id: "DC-01-A", racks: 48, util: 87, powerKW: 312, pue: 1.18, tempC: 24, status: "nominal" },
  { id: "DC-01-B", racks: 48, util: 92, powerKW: 348, pue: 1.21, tempC: 26, status: "nominal" },
  { id: "DC-01-C", racks: 32, util: 64, powerKW: 198, pue: 1.16, tempC: 23, status: "nominal" },
  { id: "DC-02-A", racks: 64, util: 41, powerKW: 142, pue: 1.14, tempC: 22, status: "scaling" },
  { id: "DC-02-B", racks: 64, util: 0, powerKW: 8, pue: 1.0, tempC: 21, status: "standby" },
];

export function DatacenterApp() {
  const totalPower = HALLS.reduce((s, h) => s + h.powerKW, 0);
  const totalRacks = HALLS.reduce((s, h) => s + h.racks, 0);
  const avgPUE = HALLS.reduce((s, h) => s + h.pue, 0) / HALLS.length;

  return (
    <div className="flex flex-col h-full bg-background text-foreground font-mono overflow-hidden">
      <div className="p-4 border-b border-border/40 bg-card/20 grid grid-cols-4 gap-3">
        {[
          { label: "Total Power", v: `${(totalPower / 1000).toFixed(2)} MW`, icon: Zap, c: "text-yellow-400" },
          { label: "Avg PUE", v: avgPUE.toFixed(2), icon: Gauge, c: "text-emerald-400" },
          { label: "Racks", v: totalRacks, icon: Building2, c: "text-primary" },
          { label: "Cooling", v: "Liquid-Loop", icon: Droplets, c: "text-blue-400" },
        ].map((m) => (
          <div key={m.label} className="rounded-lg border border-border/40 bg-card/40 p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] uppercase tracking-wider text-foreground/40">{m.label}</span>
              <m.icon className={`w-3.5 h-3.5 ${m.c}`} />
            </div>
            <div className={`text-xl font-bold ${m.c}`}>{m.v}</div>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-[10px] uppercase tracking-widest text-foreground/40 mb-2">Halls & Operations</div>
        <div className="space-y-2">
          {HALLS.map((h) => (
            <div key={h.id} className="rounded-lg border border-border/40 bg-card/40 p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 grid place-items-center">
                    <Building2 className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-bold">{h.id}</div>
                    <div className="text-[10px] text-foreground/50">{h.racks} racks · {h.util}% util</div>
                  </div>
                </div>
                <span className={`text-[9px] px-2 py-0.5 rounded border ${
                  h.status === "nominal" ? "border-emerald-400/40 text-emerald-400 bg-emerald-400/10" :
                  h.status === "scaling" ? "border-yellow-400/40 text-yellow-400 bg-yellow-400/10" :
                  "border-foreground/20 text-foreground/40 bg-foreground/5"
                }`}>{h.status.toUpperCase()}</span>
              </div>
              <div className="grid grid-cols-4 gap-3 text-[10px]">
                <div className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-yellow-400" /><div><div className="text-foreground/40 uppercase text-[9px]">Power</div><div>{h.powerKW} kW</div></div></div>
                <div className="flex items-center gap-1.5"><Thermometer className="w-3 h-3 text-orange-400" /><div><div className="text-foreground/40 uppercase text-[9px]">Temp</div><div>{h.tempC}°C</div></div></div>
                <div className="flex items-center gap-1.5"><Gauge className="w-3 h-3 text-emerald-400" /><div><div className="text-foreground/40 uppercase text-[9px]">PUE</div><div>{h.pue}</div></div></div>
                <div className="flex items-center gap-1.5"><Wind className="w-3 h-3 text-blue-400" /><div><div className="text-foreground/40 uppercase text-[9px]">Cooling</div><div>Liquid</div></div></div>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary/60 to-primary transition-all" style={{ width: `${h.util}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
