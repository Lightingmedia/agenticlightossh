import { Link } from "react-router-dom";
import { Cpu, PlugZap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGatewayMonitoring } from "@/hooks/use-gateway-monitoring";

export default function AccountGpuReadings({ thermal = false }: { thermal?: boolean }) {
  const data = useGatewayMonitoring();
  const devices = data?.telemetry?.devices ?? [];
  const format = (value?: number | null) => typeof value === "number" && Number.isFinite(value) ? value.toFixed(1) : "—";
  return (
    <section className="space-y-4 border-b border-border py-5" aria-label={thermal ? "Account GPU temperatures" : "Connected GPU nodes"}>
      <h2 className="font-mono font-bold flex items-center gap-2"><Cpu className="h-4 w-4 text-primary" />{thermal ? "GPU temperatures" : "Connected GPU nodes"}</h2>
      {!data ? <p className="text-sm text-muted-foreground">Checking your GPU host…</p>
        : !data.configured ? <div className="flex flex-wrap items-center gap-3"><p className="text-sm text-muted-foreground">No GPU host connected to your account.</p><Button asChild variant="outline"><Link to="/dashboard/gateway-setup"><PlugZap className="mr-2 h-4 w-4" />Connect GPU</Link></Button></div>
        : data.error ? <p role="alert" className="text-sm text-destructive">{data.error}</p>
        : !devices.length ? <p className="text-sm text-muted-foreground">Your gateway reports no GPU readings yet.</p>
        : <>
          <p className="text-xs text-muted-foreground">Measured at {data.observed_at ? new Date(data.observed_at).toLocaleTimeString() : "unknown"}</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{devices.map(device => <article key={device.uuid} className="rounded-lg border border-border bg-card p-4 space-y-3">
            <h3 className="font-mono text-sm break-words">{device.node ?? device.uuid}</h3>
            <dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-muted-foreground">Temperature</dt><dd className="font-mono">{format(device.gpu_temp_c?.max)} °C</dd></div><div><dt className="text-muted-foreground">Power</dt><dd className="font-mono">{format(device.power_w?.avg)} W</dd></div>{!thermal && <div><dt className="text-muted-foreground">GPU utilization</dt><dd className="font-mono">{format(device.gpu_util_pct?.avg)}%</dd></div>}</dl>
          </article>)}</div>
        </>}
      {data?.entitlement?.upgrade_required && <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4"><p className="text-sm text-muted-foreground">{data.entitlement.detected_devices} GPUs detected. Your plan monitors {data.entitlement.gpu_limit}; additional readings are restricted.</p><Button asChild size="sm"><Link to="/pricing">Upgrade plan</Link></Button></div>}
    </section>
  );
}