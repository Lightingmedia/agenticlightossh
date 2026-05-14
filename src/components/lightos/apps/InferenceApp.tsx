import { useEffect, useState } from "react";
import { Activity, Zap, Globe, AlertCircle, Pause, Play } from "lucide-react";

interface Endpoint {
  id: string;
  model: string;
  region: string;
  rps: number;
  p50: number;
  p99: number;
  errors: number;
  status: "live" | "paused";
}

const SEED: Endpoint[] = [
  { id: "ep-aurora-pro", model: "aurora-pro-32b", region: "us-west-2", rps: 482, p50: 38, p99: 142, errors: 0.02, status: "live" },
  { id: "ep-aurora-nano", model: "aurora-nano-3b", region: "eu-central-1", rps: 1840, p50: 12, p99: 48, errors: 0.0, status: "live" },
  { id: "ep-mixtral", model: "mixtral-8x7b", region: "us-east-1", rps: 96, p50: 84, p99: 310, errors: 0.4, status: "live" },
  { id: "ep-llama3-ft", model: "llama3-finetune-v6", region: "ap-southeast-1", rps: 0, p50: 0, p99: 0, errors: 0, status: "paused" },
];

export function InferenceApp() {
  const [eps, setEps] = useState<Endpoint[]>(SEED);

  useEffect(() => {
    const t = setInterval(() => {
      setEps((p) =>
        p.map((e) =>
          e.status === "live"
            ? {
                ...e,
                rps: Math.max(0, Math.round(e.rps + (Math.random() - 0.45) * 40)),
                p50: Math.max(5, Math.round(e.p50 + (Math.random() - 0.5) * 4)),
                p99: Math.max(20, Math.round(e.p99 + (Math.random() - 0.5) * 12)),
              }
            : e,
        ),
      );
    }, 1500);
    return () => clearInterval(t);
  }, []);

  const toggle = (id: string) =>
    setEps((p) => p.map((e) => (e.id === id ? { ...e, status: e.status === "live" ? "paused" : "live", rps: e.status === "live" ? 0 : 100 } : e)));

  const totalRps = eps.filter((e) => e.status === "live").reduce((s, e) => s + e.rps, 0);
  const live = eps.filter((e) => e.status === "live").length;

  return (
    <div className="flex flex-col h-full bg-background text-foreground font-mono overflow-hidden">
      <div className="grid grid-cols-4 gap-3 p-4 border-b border-border/40 bg-card/20">
        {[
          { l: "Live Endpoints", v: `${live}/${eps.length}`, i: Globe, c: "text-primary" },
          { l: "Total RPS", v: totalRps.toLocaleString(), i: Activity, c: "text-emerald-400" },
          { l: "Avg p50", v: `${Math.round(eps.filter((e)=>e.status==="live").reduce((s,e)=>s+e.p50,0)/Math.max(1,live))}ms`, i: Zap, c: "text-blue-400" },
          { l: "Errors / min", v: eps.reduce((s, e) => s + e.errors, 0).toFixed(2), i: AlertCircle, c: "text-amber-400" },
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

      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-[10px] uppercase tracking-widest text-foreground/40 mb-2">Model Endpoints</div>
        <div className="space-y-2">
          {eps.map((e) => (
            <div key={e.id} className="rounded-lg border border-border/40 bg-card/40 p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-sm font-bold">{e.model}</div>
                  <div className="text-[10px] text-foreground/50">{e.id} · {e.region}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold ${e.status === "live" ? "text-emerald-400" : "text-foreground/40"}`}>
                    {e.status.toUpperCase()}
                  </span>
                  <button
                    onClick={() => toggle(e.id)}
                    className="px-2 py-1 rounded border border-border/60 hover:border-primary/60 hover:text-primary text-[10px] flex items-center gap-1"
                  >
                    {e.status === "live" ? <><Pause className="w-3 h-3" /> Pause</> : <><Play className="w-3 h-3" /> Resume</>}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3 text-[10px]">
                <div><span className="text-foreground/40 uppercase">RPS</span><div className="text-sm">{e.rps}</div></div>
                <div><span className="text-foreground/40 uppercase">p50</span><div className="text-sm">{e.p50}ms</div></div>
                <div><span className="text-foreground/40 uppercase">p99</span><div className="text-sm">{e.p99}ms</div></div>
                <div><span className="text-foreground/40 uppercase">err</span><div className="text-sm text-amber-400">{e.errors.toFixed(2)}%</div></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
