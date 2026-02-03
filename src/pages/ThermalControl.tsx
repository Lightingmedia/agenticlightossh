import { motion } from "framer-motion";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import ThermalHeatmap from "@/components/dashboard/ThermalHeatmap";
import TelemetryChart from "@/components/dashboard/TelemetryChart";
import { Thermometer, Cpu, Fan, AlertTriangle, Zap, Gauge } from "lucide-react";
import { useRealtimeGPUs, useRealtimeThermalZones } from "@/hooks/use-realtime-telemetry";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { adjustThermal } from "@/lib/api";
import { toast } from "sonner";
import { useState } from "react";

const ThermalControl = () => {
  const { gpus, loading: gpusLoading } = useRealtimeGPUs();
  const { zones, loading: zonesLoading } = useRealtimeThermalZones();
  const [adjustingZone, setAdjustingZone] = useState<string | null>(null);

  // Transform thermal zones for heatmap
  const thermalZones = zones.map((zone) => ({
    id: zone.zone_id,
    name: zone.name,
    temperature: Number(zone.temperature),
    fanSpeed: Number(zone.fan_speed),
    throttling: zone.throttling,
  }));

  // Calculate thermal stats
  const maxTemp = gpus.length > 0 
    ? Math.max(...gpus.map((g) => Number(g.temperature)))
    : 0;
  const avgTemp = gpus.length > 0
    ? Math.round(gpus.reduce((acc, g) => acc + Number(g.temperature), 0) / gpus.length)
    : 0;
  const throttledCount = zones.filter((z) => z.throttling).length;
  const totalPower = gpus.reduce((acc, g) => acc + Number(g.power), 0);

  // Chart data
  const tempHistoryData = Array.from({ length: 60 }, (_, i) => ({
    time: `${i}m`,
    value: 55 + Math.random() * 30,
    value2: 50 + Math.random() * 25,
  }));

  const powerHistoryData = Array.from({ length: 24 }, (_, i) => ({
    time: `${i}:00`,
    value: 800 + Math.random() * 600,
  }));

  const handleFanAdjust = async (zoneId: string, speed: number) => {
    setAdjustingZone(zoneId);
    try {
      await adjustThermal(zoneId, speed);
      toast.success(`Fan speed adjusted to ${speed}%`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to adjust fan speed");
    } finally {
      setAdjustingZone(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        title="Thermal Control"
        subtitle="Heat aversion through learned thermal profiles"
      />

      <div className="p-6 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl border border-border bg-card/50"
          >
            <div className="flex items-center gap-2 mb-2">
              <Thermometer className="w-4 h-4 text-red-400" />
              <span className="text-xs text-muted-foreground">Max Temp</span>
            </div>
            {gpusLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className={`text-2xl font-mono font-bold ${maxTemp >= 80 ? 'text-red-400' : maxTemp >= 70 ? 'text-amber-400' : 'text-primary'}`}>
                {maxTemp}°C
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-xl border border-border bg-card/50"
          >
            <div className="flex items-center gap-2 mb-2">
              <Gauge className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Avg Temp</span>
            </div>
            {gpusLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-mono font-bold text-foreground">{avgTemp}°C</div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 rounded-xl border border-border bg-card/50"
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-muted-foreground">Throttling</span>
            </div>
            {zonesLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className={`text-2xl font-mono font-bold ${throttledCount > 0 ? 'text-amber-400' : 'text-primary'}`}>
                {throttledCount}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-4 rounded-xl border border-border bg-card/50"
          >
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-muted-foreground">Total Power</span>
            </div>
            {gpusLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-mono font-bold text-foreground">{totalPower.toLocaleString()}W</div>
            )}
          </motion.div>
        </div>

        {/* Thermal Heatmap */}
        {zonesLoading ? (
          <Skeleton className="h-64 rounded-xl" />
        ) : (
          <ThermalHeatmap zones={thermalZones} />
        )}

        {/* Fan Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-xl border border-border bg-card/50"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-mono font-bold text-foreground flex items-center gap-2">
              <Fan className="w-5 h-5 text-primary" />
              Fan Control Profiles
            </h3>
            <span className="text-xs text-muted-foreground">Learned thermal optimization active</span>
          </div>

          {zonesLoading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {zones.map((zone) => (
                <motion.div
                  key={zone.zone_id}
                  className="p-4 rounded-lg bg-secondary/50"
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-mono text-sm text-foreground">{zone.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {Number(zone.temperature)}°C • {zone.throttling && <span className="text-amber-400">Throttling</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-lg text-primary">{Number(zone.fan_speed)}%</div>
                      <div className="text-xs text-muted-foreground">Fan Speed</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Slider
                      defaultValue={[Number(zone.fan_speed)]}
                      max={100}
                      step={5}
                      className="flex-1"
                      onValueCommit={(value) => handleFanAdjust(zone.zone_id, value[0])}
                      disabled={adjustingZone === zone.zone_id}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="font-mono text-xs"
                      onClick={() => handleFanAdjust(zone.zone_id, 100)}
                      disabled={adjustingZone === zone.zone_id}
                    >
                      Max
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* GPU Temperature per Node */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-xl border border-border bg-card/50"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-mono font-bold text-foreground flex items-center gap-2">
              <Cpu className="w-5 h-5 text-primary" />
              GPU Temperature per Node
            </h3>
            <span className="text-xs text-primary animate-pulse flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Live
            </span>
          </div>

          {gpusLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {gpus.map((gpu) => {
                const temp = Number(gpu.temperature);
                const colorClass = temp >= 80 ? 'text-red-400' : temp >= 70 ? 'text-amber-400' : 'text-primary';
                const bgClass = temp >= 80 ? 'bg-red-500/10' : temp >= 70 ? 'bg-amber-500/10' : 'bg-primary/10';

                return (
                  <motion.div
                    key={gpu.gpu_id}
                    className={`p-3 rounded-lg ${bgClass} text-center`}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className={`text-2xl font-mono font-bold ${colorClass}`}>{temp}°C</div>
                    <div className="text-xs text-muted-foreground truncate">{gpu.gpu_id}</div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Heat Aversion Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-xl border border-border bg-card/50"
        >
          <h3 className="font-mono font-bold text-foreground mb-4">Learned Heat Aversion</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-secondary/50">
              <div className="text-sm text-muted-foreground mb-1">Workload Distribution</div>
              <div className="text-foreground">
                Automatically routes compute away from hot zones
              </div>
            </div>
            <div className="p-4 rounded-lg bg-secondary/50">
              <div className="text-sm text-muted-foreground mb-1">Predictive Cooling</div>
              <div className="text-foreground">
                Pre-emptively adjusts fan speeds based on load patterns
              </div>
            </div>
            <div className="p-4 rounded-lg bg-secondary/50">
              <div className="text-sm text-muted-foreground mb-1">Throttle Prevention</div>
              <div className="text-foreground">
                Reduces workload before thermal throttling occurs
              </div>
            </div>
          </div>
        </motion.div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TelemetryChart
            title="Temperature History (Last Hour)"
            data={tempHistoryData}
            showSecondary
            color="hsl(0, 84%, 60%)"
            secondaryColor="hsl(45, 90%, 50%)"
            unit="°C"
          />
          <TelemetryChart
            title="Power Consumption (24h)"
            data={powerHistoryData}
            color="hsl(45, 90%, 50%)"
            unit="W"
            type="area"
          />
        </div>
      </div>
    </div>
  );
};

export default ThermalControl;
