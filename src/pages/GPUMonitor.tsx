import { motion } from "framer-motion";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import GPUCard from "@/components/dashboard/GPUCard";
import TelemetryChart from "@/components/dashboard/TelemetryChart";
import ThermalHeatmap from "@/components/dashboard/ThermalHeatmap";
import { useRealtimeGPUs, useRealtimeThermalZones } from "@/hooks/use-realtime-telemetry";
import { Skeleton } from "@/components/ui/skeleton";

const GPUMonitor = () => {
  const { gpus, loading: gpusLoading } = useRealtimeGPUs();
  const { zones, loading: zonesLoading } = useRealtimeThermalZones();

  // Transform GPU data for cards
  const gpuCards = gpus.map((gpu) => ({
    name: gpu.gpu_name,
    id: gpu.gpu_id,
    utilization: Number(gpu.utilization),
    temperature: Number(gpu.temperature),
    power: Number(gpu.power),
    memoryUsed: Number(gpu.memory_used),
    memoryTotal: Number(gpu.memory_total),
    status: gpu.status as "online" | "busy" | "idle" | "offline",
  }));

  // Transform thermal zones for heatmap
  const thermalZones = zones.map((zone) => ({
    id: zone.zone_id,
    name: zone.name,
    temperature: Number(zone.temperature),
    fanSpeed: Number(zone.fan_speed),
    throttling: zone.throttling,
  }));

  // Calculate summary stats
  const totalGPUs = gpus.length;
  const onlineGPUs = gpus.filter((g) => g.status !== "offline").length;
  const totalPower = gpus.reduce((acc, g) => acc + Number(g.power), 0);
  const avgUtilization = gpus.length > 0
    ? Math.round(gpus.reduce((acc, g) => acc + Number(g.utilization), 0) / gpus.length)
    : 0;

  // Generate chart data from current GPU states
  const utilizationData = Array.from({ length: 60 }, (_, i) => ({
    time: `${i}m`,
    value: 60 + Math.random() * 35,
    value2: 40 + Math.random() * 40,
  }));

  const powerData = Array.from({ length: 24 }, (_, i) => ({
    time: `${i}:00`,
    value: 800 + Math.random() * 400,
  }));

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        title="GPU Monitor"
        subtitle="Real-time GPU metrics and thermal management"
      />

      <div className="p-6 space-y-6">
        {/* GPU Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl border border-border bg-card/50"
          >
            {gpusLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-mono font-bold text-foreground">{totalGPUs}</div>
            )}
            <div className="text-sm text-muted-foreground">Total GPUs</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-xl border border-border bg-card/50"
          >
            {gpusLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-mono font-bold text-primary">{onlineGPUs}</div>
            )}
            <div className="text-sm text-muted-foreground">Online</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 rounded-xl border border-border bg-card/50"
          >
            {gpusLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-mono font-bold text-amber-400">{totalPower.toLocaleString()}W</div>
            )}
            <div className="text-sm text-muted-foreground">Total Power</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-4 rounded-xl border border-border bg-card/50"
          >
            {gpusLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-mono font-bold text-foreground">{avgUtilization}%</div>
            )}
            <div className="text-sm text-muted-foreground">Avg Utilization</div>
          </motion.div>
        </div>

        {/* GPU Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-mono font-bold text-foreground">GPU Nodes</h3>
            <span className="text-xs text-primary animate-pulse flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Live
            </span>
          </div>
          {gpusLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {gpuCards.map((gpu, index) => (
                <motion.div
                  key={gpu.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <GPUCard {...gpu} />
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TelemetryChart
            title="GPU Utilization (Last Hour)"
            data={utilizationData}
            showSecondary
            color="hsl(160, 84%, 45%)"
            secondaryColor="hsl(45, 90%, 50%)"
            unit="%"
          />
          <TelemetryChart
            title="Power Consumption (24h)"
            data={powerData}
            color="hsl(0, 84%, 60%)"
            unit="W"
            type="area"
          />
        </div>

        {/* Thermal Heatmap */}
        {zonesLoading ? (
          <Skeleton className="h-64 rounded-xl" />
        ) : (
          <ThermalHeatmap zones={thermalZones} />
        )}
      </div>
    </div>
  );
};

export default GPUMonitor;
