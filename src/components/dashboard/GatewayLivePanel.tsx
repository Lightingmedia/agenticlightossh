import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cpu, DollarSign, Gauge, PlugZap, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface DeviceTelemetry {
  uuid: string;
  node?: string;
  gpu_util_pct?: { avg?: number };
  power_w?: { avg?: number };
  fb_used_mib?: { max?: number };
  gpu_temp_c?: { max?: number };
}
interface Resp {
  configured: boolean;
  error?: string;
  capacity?: { totals?: { devices?: number; allocated?: number; free?: number } };
  telemetry?: { cluster?: { gpu_util_pct_avg?: number; power_w_sum?: number; gpus_reporting?: number }; devices?: DeviceTelemetry[] };
}

const RATE_KEY = "lightos:gpu-hour-usd";

export default function GatewayLivePanel() {
  const [data, setData] = useState<Resp | null>(null);
  const [rate, setRate] = useState<number>(() => Number(localStorage.getItem(RATE_KEY)) || 0);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data: d, error } = await supabase.functions.invoke("gateway-telemetry");
      if (!alive) return;
      setData(error ? { configured: true, error: error.message } : (d as Resp));
    };
    load();
    const t = window.setInterval(load, 15000);
    return () => { alive = false; window.clearInterval(t); };
  }, []);

  const totals = data?.capacity?.totals;
  const cluster = data?.telemetry?.cluster;
  const allocated = totals?.allocated ?? 0;
  const hourly = rate > 0 ? allocated * rate : null;
  const fmt = (n?: number, d = 1) => (n == null ? "—" : n.toFixed(d));

  return (
    <div className="p-6 rounded-xl border border-border bg-card/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-mono font-bold text-foreground flex items-center gap-2">
          <Cpu className="w-4 h-4 text-primary" /> Live GPU usage &amp; cost
        </h3>
        <span className="text-xs font-mono text-muted-foreground">
          {data?.configured && !data.error ? "gateway · DCGM · 15s" : "gateway offline"}
        </span>
      </div>

      {!data ? (
        <p className="text-sm text-muted-foreground">Connecting…</p>
      ) : !data.configured ? (
        <div className="flex items-start gap-3 text-sm text-muted-foreground">
          <PlugZap className="w-5 h-5 text-primary shrink-0" />
          <p>
            No GPU cluster connected yet. Once your runtime gateway address and key are added, this panel shows real
            GPU usage, power and cost, and MTMC runs requests on your GPUs first.{" "}
            <Link to="/gateway-setup" className="text-primary underline">Setup checklist</Link>
          </p>
        </div>
      ) : data.error ? (
        <p className="text-sm text-destructive">Gateway error: {data.error}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <Metric icon={<Gauge className="w-4 h-4" />} label="Avg GPU util" value={`${fmt(cluster?.gpu_util_pct_avg)}%`} />
            <Metric icon={<Cpu className="w-4 h-4" />} label="GPUs in use" value={`${allocated} / ${totals?.devices ?? "—"}`} />
            <Metric icon={<Zap className="w-4 h-4" />} label="Power draw" value={`${fmt((cluster?.power_w_sum ?? 0) / 1000, 2)} kW`} />
            <Metric icon={<DollarSign className="w-4 h-4" />} label="Cost / hour" value={hourly == null ? "set rate" : `$${hourly.toFixed(2)}`} />
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
            Your price per GPU-hour (USD)
            <input
              type="number" min={0} step="0.01" value={rate || ""}
              onChange={(e) => { const v = Number(e.target.value); setRate(v); localStorage.setItem(RATE_KEY, String(v)); }}
              className="w-24 bg-background border border-border rounded px-2 py-1 font-mono text-foreground"
            />
          </label>
          <div className="space-y-2">
            {(data.telemetry?.devices ?? []).slice(0, 8).map((d) => (
              <div key={d.uuid} className="flex items-center gap-3 text-xs font-mono">
                <span className="w-40 truncate text-muted-foreground">{d.node ?? d.uuid}</span>
                <div className="flex-1 h-2 rounded bg-muted overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${Math.min(100, d.gpu_util_pct?.avg ?? 0)}%` }} />
                </div>
                <span className="w-12 text-right">{fmt(d.gpu_util_pct?.avg, 0)}%</span>
                <span className="w-16 text-right text-muted-foreground">{fmt(d.power_w?.avg, 0)} W</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg border border-border bg-background/40">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">{icon}{label}</div>
      <div className="font-mono text-lg text-foreground">{value}</div>
    </div>
  );
}
