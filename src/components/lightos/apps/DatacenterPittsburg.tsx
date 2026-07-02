import { useState } from "react";
import { ChevronDown, ChevronRight, Cpu, Network, Zap } from "lucide-react";

type AssetKind = "chip" | "switch" | "bolt";
interface Asset {
  name: string;
  meta: string;
  kind: AssetKind;
  online?: boolean;
}
interface Rack {
  id: string;
  assets: Asset[];
}

const RACKS: Rack[] = [
  {
    id: "Rack-01",
    assets: [
      { name: "X2-Node-01", meta: "nce.x2 · 600W", kind: "chip", online: true },
      { name: "X2-Node-02", meta: "nce.x2 · 587W", kind: "chip", online: true },
      { name: "LightLink-Switch-01", meta: "4×400G", kind: "switch", online: true },
      { name: "PDU-01", meta: "8.2 kW", kind: "bolt" },
    ],
  },
  { id: "Rack-02", assets: [] },
];

const FIBER = [
  { from: "X2-Node-01 Port-A", to: "LightLink-Switch Port-1", rate: "400G" },
  { from: "X2-Node-01 Port-B", to: "X2-Node-02 Port-A", rate: "400G" },
  { from: "X2-Node-02 Port-A", to: "LightLink-Switch Port-2", rate: "400G" },
];

const KindIcon = ({ kind }: { kind: AssetKind }) => {
  const cls = "w-3.5 h-3.5 text-teal-300";
  if (kind === "switch") return <Network className={cls} />;
  if (kind === "bolt") return <Zap className={cls} />;
  return <Cpu className={cls} />;
};

function RackVisualization() {
  const units = Array.from({ length: 22 }, (_, i) => i + 1);
  const zoneFor = (u: number) => {
    if (u <= 2) return "switch";
    if (u <= 8) return "node1";
    if (u <= 14) return "node2";
    if (u <= 20) return "empty";
    return "pdu";
  };
  const zoneLabel = (u: number) => {
    const z = zoneFor(u);
    if (u === 1) return { z, label: "LightLink-Switch-01 · 2U", head: "SWITCH" };
    if (u === 3) return { z, label: "X2-NODE-01 · 6U", head: "X2-NODE-01" };
    if (u === 9) return { z, label: "X2-NODE-02 · 6U", head: "X2-NODE-02" };
    if (u === 15) return { z, label: "Available 6U", head: "EMPTY" };
    if (u === 21) return { z, label: "PDU-01 · 2U", head: "PDU-01" };
    return null;
  };

  const zoneStyle: Record<string, string> = {
    switch: "bg-teal-500/10 border-teal-400/40",
    node1: "bg-teal-500/5 border-teal-400/30",
    node2: "bg-teal-500/5 border-teal-400/30",
    empty: "border-dashed border-foreground/20 bg-transparent",
    pdu: "bg-yellow-500/10 border-yellow-400/40",
  };

  return (
    <div className="rounded-lg border border-border/40 bg-[#05070d] p-3 h-full flex flex-col">
      <div className="text-[10px] uppercase tracking-widest text-foreground/40 mb-2">Rack-01 Visualization</div>
      <div className="flex-1 flex gap-2 overflow-hidden">
        <div className="flex flex-col text-[9px] font-mono text-foreground/40 pt-1 gap-[3px]">
          {units.map((u) => (
            <div key={u} className="h-6 leading-6 pr-1 text-right w-8">U{u}</div>
          ))}
        </div>
        <div className="flex-1 flex flex-col gap-[3px] relative">
          {units.map((u) => {
            const z = zoneFor(u);
            const info = zoneLabel(u);
            return (
              <div
                key={u}
                className={`h-6 rounded-sm border ${zoneStyle[z]} flex items-center px-2 relative`}
              >
                {info && (
                  <div className="text-[10px] font-mono flex items-center gap-2 w-full">
                    <span className="text-teal-300/90 font-semibold">[{info.head}]</span>
                    <span className="text-foreground/60">{info.label}</span>
                    {(info.head === "X2-NODE-01" || info.head === "X2-NODE-02") && (
                      <span className="ml-auto flex items-center gap-1">
                        <span className="px-1.5 py-0.5 rounded bg-teal-500/15 border border-teal-400/40 text-teal-300 text-[9px]">NCE-0</span>
                        <span className="px-1.5 py-0.5 rounded bg-teal-500/15 border border-teal-400/40 text-teal-300 text-[9px]">TFLN PIC</span>
                        <span className="px-1.5 py-0.5 rounded bg-teal-500/15 border border-teal-400/40 text-teal-300 text-[9px]">NCE-1</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-[10px] font-mono text-foreground/70">
        <span>Power <span className="text-teal-300">8.2 kW</span></span>
        <span>Inlet <span className="text-teal-300">22°C</span></span>
        <span>PUE <span className="text-teal-300">1.38</span></span>
      </div>
    </div>
  );
}

export function DatacenterPittsburg() {
  const [open, setOpen] = useState<Record<string, boolean>>({ "Rack-01": true, "Rack-02": false });

  return (
    <div className="border-b border-border/40 bg-background/60 p-4 font-mono">
      <div className="mb-3">
        <div className="text-sm font-bold text-foreground">Datacenter · Pittsburg, CA</div>
      </div>
      <div className="grid grid-cols-5 gap-3" style={{ minHeight: 520 }}>
        {/* LEFT 40% */}
        <div className="col-span-2 flex flex-col gap-3 min-h-0">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Racks", value: "2" },
              { label: "Assets", value: "47" },
              { label: "Power", value: "3.2 kW / 20 kW" },
            ].map((c) => (
              <div key={c.label} className="rounded-lg border border-border/40 bg-card/40 p-2.5">
                <div className="text-[9px] uppercase tracking-wider text-foreground/40">{c.label}</div>
                <div className="text-base font-bold text-teal-300">{c.value}</div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-border/40 bg-card/30 p-3 flex-1 overflow-auto">
            <div className="text-[10px] uppercase tracking-widest text-foreground/40 mb-2">Asset Tree</div>
            <div className="space-y-1">
              {RACKS.map((r) => (
                <div key={r.id}>
                  <button
                    onClick={() => setOpen((o) => ({ ...o, [r.id]: !o[r.id] }))}
                    className="flex items-center gap-1 text-xs text-foreground/80 hover:text-teal-300 w-full"
                  >
                    {open[r.id] ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    <span className="font-semibold">{r.id}</span>
                    {!open[r.id] && <span className="text-foreground/40 text-[10px] ml-1">(collapsed)</span>}
                  </button>
                  {open[r.id] && r.assets.length > 0 && (
                    <div className="ml-5 mt-1 space-y-1">
                      {r.assets.map((a) => (
                        <div key={a.name} className="flex items-center gap-2 text-[11px] py-1 px-2 rounded hover:bg-teal-500/5">
                          <KindIcon kind={a.kind} />
                          <span className="text-foreground/90">{a.name}</span>
                          <span className="text-foreground/50">— {a.meta}</span>
                          {a.online && (
                            <span className="ml-auto flex items-center gap-1 text-teal-300 text-[10px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shadow-[0_0_6px_rgba(45,212,191,0.8)]" />
                              Online
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border/40 bg-card/30 p-3">
            <div className="text-[10px] uppercase tracking-widest text-foreground/40 mb-2">Optical Fiber Map</div>
            <div className="space-y-1.5">
              {FIBER.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shadow-[0_0_6px_rgba(45,212,191,0.8)]" />
                  <span className="text-foreground/90">{f.from}</span>
                  <span className="text-foreground/40">→</span>
                  <span className="text-foreground/90">{f.to}</span>
                  <span className="ml-auto text-teal-300">{f.rate}</span>
                  <span className="text-teal-300 text-[10px]">Active</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT 60% */}
        <div className="col-span-3 min-h-0">
          <RackVisualization />
        </div>
      </div>
    </div>
  );
}
