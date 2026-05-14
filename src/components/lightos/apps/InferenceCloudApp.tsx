import { useState } from "react";
import { Cloud, Cpu, Zap, MapPin, Plus, Server } from "lucide-react";

interface Instance {
  id: string;
  region: string;
  type: string;
  gpus: number;
  status: "running" | "provisioning" | "stopped";
  price: number;
}

const REGIONS = ["us-west-2", "eu-central-1", "ap-southeast-1", "us-east-1"];
const TYPES = [
  { id: "lr.nano.x1", gpus: 1, price: 0.42, label: "1× Aurora-Nano" },
  { id: "lr.pro.x4", gpus: 4, price: 2.18, label: "4× Aurora-Pro" },
  { id: "lr.ultra.x8", gpus: 8, price: 6.40, label: "8× Aurora-Ultra (NVL)" },
];

export function InferenceCloudApp() {
  const [instances, setInstances] = useState<Instance[]>([
    { id: "inf-7a3c", region: "us-west-2", type: "lr.pro.x4", gpus: 4, status: "running", price: 2.18 },
    { id: "inf-9b21", region: "eu-central-1", type: "lr.nano.x1", gpus: 1, status: "running", price: 0.42 },
    { id: "inf-3f08", region: "us-east-1", type: "lr.ultra.x8", gpus: 8, status: "provisioning", price: 6.40 },
  ]);
  const [region, setRegion] = useState(REGIONS[0]);
  const [typeId, setTypeId] = useState(TYPES[0].id);

  const launch = () => {
    const t = TYPES.find((x) => x.id === typeId)!;
    setInstances((p) => [
      ...p,
      {
        id: `inf-${Math.random().toString(36).slice(2, 6)}`,
        region,
        type: typeId,
        gpus: t.gpus,
        status: "provisioning",
        price: t.price,
      },
    ]);
    setTimeout(() => {
      setInstances((p) =>
        p.map((i) => (i.status === "provisioning" ? { ...i, status: "running" } : i)),
      );
    }, 2400);
  };

  const totalGpus = instances.filter((i) => i.status === "running").reduce((s, i) => s + i.gpus, 0);
  const burnRate = instances.filter((i) => i.status === "running").reduce((s, i) => s + i.price, 0);

  return (
    <div className="flex flex-col h-full bg-background text-foreground font-mono overflow-hidden">
      <div className="p-4 border-b border-border/40 bg-card/20">
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { l: "Active Instances", v: instances.filter((i) => i.status === "running").length, i: Cloud, c: "text-primary" },
            { l: "GPUs Online", v: totalGpus, i: Cpu, c: "text-emerald-400" },
            { l: "Burn / hr", v: `$${burnRate.toFixed(2)}`, i: Zap, c: "text-yellow-400" },
          ].map((m) => (
            <div key={m.l} className="rounded-lg border border-border/40 bg-card/40 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] uppercase tracking-wider text-foreground/40">{m.l}</span>
                <m.i className={`w-3.5 h-3.5 ${m.c}`} />
              </div>
              <div className={`text-xl font-bold ${m.c}`}>{m.v}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 p-2">
          <MapPin className="w-3.5 h-3.5 text-primary ml-1" />
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="bg-background/50 border border-border/40 rounded px-2 py-1 text-xs"
          >
            {REGIONS.map((r) => <option key={r}>{r}</option>)}
          </select>
          <select
            value={typeId}
            onChange={(e) => setTypeId(e.target.value)}
            className="bg-background/50 border border-border/40 rounded px-2 py-1 text-xs flex-1"
          >
            {TYPES.map((t) => <option key={t.id} value={t.id}>{t.label} — ${t.price}/hr</option>)}
          </select>
          <button
            onClick={launch}
            className="flex items-center gap-1 px-3 py-1 rounded bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition"
          >
            <Plus className="w-3 h-3" /> Launch
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-[10px] uppercase tracking-widest text-foreground/40 mb-2">Instances</div>
        <div className="space-y-2">
          {instances.map((i) => (
            <div key={i.id} className="rounded-lg border border-border/40 bg-card/40 p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 grid place-items-center">
                <Server className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold">{i.id}</div>
                <div className="text-[10px] text-foreground/50">{i.type} · {i.region} · {i.gpus} GPU</div>
              </div>
              <div className="text-right">
                <div className={`text-[10px] font-bold ${
                  i.status === "running" ? "text-emerald-400" :
                  i.status === "provisioning" ? "text-yellow-400" : "text-foreground/40"
                }`}>{i.status.toUpperCase()}</div>
                <div className="text-[10px] text-foreground/50">${i.price.toFixed(2)}/hr</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
