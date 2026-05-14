import { useEffect, useState } from "react";
import { Coins, TrendingUp, Activity, DollarSign } from "lucide-react";

const MODELS = [
  { name: "aurora-pro-70b", tps: 142, cost: 0.0012, share: 38 },
  { name: "aurora-nano-7b", tps: 1240, cost: 0.0001, share: 27 },
  { name: "mixtral-8x7b", tps: 287, cost: 0.0008, share: 18 },
  { name: "llama3-70b", tps: 184, cost: 0.0011, share: 12 },
  { name: "qwen2-72b", tps: 96, cost: 0.0010, share: 5 },
];

export function TokenFactoryApp() {
  const [counter, setCounter] = useState(8_421_002_341);
  const [tps, setTps] = useState(1949);
  const [revenue, setRevenue] = useState(12842.18);

  useEffect(() => {
    const t = setInterval(() => {
      const inc = 1800 + Math.random() * 400;
      setCounter((c) => c + inc);
      setTps(Math.round(1800 + Math.random() * 400));
      setRevenue((r) => r + inc * 0.0008);
    }, 800);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col h-full bg-background text-foreground font-mono overflow-hidden">
      <div className="p-6 border-b border-border/40 bg-gradient-to-br from-primary/10 via-card/20 to-transparent">
        <div className="flex items-center gap-2 mb-2">
          <Coins className="w-4 h-4 text-primary" />
          <span className="text-[10px] uppercase tracking-widest text-foreground/50">Lifetime Tokens Generated</span>
        </div>
        <div className="text-4xl font-bold text-primary tabular-nums tracking-tight">
          {counter.toLocaleString()}
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { l: "Tokens / sec", v: tps.toLocaleString(), i: Activity, c: "text-emerald-400" },
            { l: "Revenue (24h)", v: `$${revenue.toFixed(2)}`, i: DollarSign, c: "text-yellow-400" },
            { l: "Margin", v: "61.4%", i: TrendingUp, c: "text-blue-400" },
          ].map((m) => (
            <div key={m.l} className="rounded-lg border border-border/40 bg-card/50 backdrop-blur p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] uppercase tracking-wider text-foreground/40">{m.l}</span>
                <m.i className={`w-3.5 h-3.5 ${m.c}`} />
              </div>
              <div className={`text-lg font-bold ${m.c} tabular-nums`}>{m.v}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-[10px] uppercase tracking-widest text-foreground/40 mb-2">Model Output Mix</div>
        <div className="space-y-2">
          {MODELS.map((m) => (
            <div key={m.name} className="rounded-lg border border-border/40 bg-card/40 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-bold">{m.name}</div>
                <div className="text-[10px] text-foreground/50">${m.cost.toFixed(4)} /1k tok</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-foreground/10 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary/50 to-primary" style={{ width: `${m.share * 2.5}%` }} />
                </div>
                <span className="text-[10px] text-foreground/60 tabular-nums w-20 text-right">{m.tps} tps · {m.share}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
