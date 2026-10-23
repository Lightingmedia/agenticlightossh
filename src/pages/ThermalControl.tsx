import DashboardHeader from "@/components/dashboard/DashboardHeader";
import AccountGpuReadings from "@/components/dashboard/AccountGpuReadings";
import { useRealtimeThermalZones } from "@/hooks/use-realtime-telemetry";

export default function ThermalControl() {
  const { zones, loading, error } = useRealtimeThermalZones();
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Thermal Control" subtitle="Temperatures from your connected GPU host" />
      <div className="p-6 space-y-6">
        <AccountGpuReadings thermal />
        <section className="space-y-4" aria-label="Account thermal zones">
          <h2 className="font-mono font-bold">Reported cooling zones</h2>
          <p className="text-sm text-muted-foreground">Fan control and thermal automation are unavailable on the current gateway.</p>
          {loading ? <p className="text-sm text-muted-foreground">Loading your zones…</p>
            : error ? <p role="alert" className="text-sm text-destructive">Cooling zones are unavailable. Please retry.</p>
            : zones.length === 0 ? <p className="text-sm text-muted-foreground">No cooling zones reported for your account yet.</p>
            : <div className="grid gap-4 sm:grid-cols-2">{zones.map(zone => <article key={zone.id} className="rounded-lg border border-border bg-card p-4">
                <h3 className="font-mono text-sm">{zone.name}</h3>
                <p className="text-sm text-muted-foreground mt-2">Last report: {new Date(zone.updated_at).toLocaleString()}</p>
              </article>)}</div>}
        </section>
      </div>
    </div>
  );
}
