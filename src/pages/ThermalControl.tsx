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

  const thermalZones = zones.map((zone) => ({
    id: zone.zone_id,
    name: zone.name,
    temperature: Number(zone.temperature),
    fanSpeed: Number(zone.fan_speed),
    throttling: zone.throttling,
  }));

  const maxTemp = gpus.length > 0
    ? Math.max(...gpus.map((g) => Number(g.temperature)))
    : 0;
  const avgTemp = gpus.length > 0
    ? Math.round(gpus.reduce((acc, g) => acc + Number(g.temperature), 0) / gpus.length)
    : 0;
  const throttledCount = zones.filter((z) => z.throttling).length;
  const totalPower = gpus.reduce((acc, g) => acc + Number(g.power), 0);

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

  const getTempColor = (temp: number) =>
    temp >= 80 ? "text-red-400" : temp >= 70 ? "text-amber-400" : "text-primary";

  const getTempBorderStyle = (temp: number) => {
    if (temp >= 80) return { animation: "thermal-critical 1.5s infinite ease-in-out", border: "1px solid rgba(239,68,68,0.6)" };
    if (temp >= 70) return { border: "1px solid rgba(245,158,11,0.35)", boxShadow: "0 0 8px rgba(245,158,11,0.15)" };
    return { border: "1px solid rgba(16,185,129,0.2)", boxShadow: "0 0 6px rgba(16,185,129,0.08)" };
  };

  const getTempBg = (temp: number) => {
    if (temp >= 80) return "rgba(239,68,68,0.08)";
    if (temp >= 70) return "rgba(245,158,11,0.08)";
    return "rgba(16,185,129,0.05)";
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
          {[
            {
              icon: Thermometer, iconClass: "text-red-400",
              label: "Max Temp", delay: 0,
              loading: gpusLoading,
              value: maxTemp ? `${maxTemp}°C` : "—",
              valueClass: getTempColor(maxTemp),
            },
            {
              icon: Gauge, iconClass: "text-primary",
              label: "Avg Temp", delay: 0.06,
              loading: gpusLoading,
              value: avgTemp ? `${avgTemp}°C` : "—",
              valueClass: "text-foreground",
            },
            {
              icon: AlertTriangle, iconClass: "text-amber-400",
              label: "Throttling", delay: 0.12,
              loading: zonesLoading,
              value: String(throttledCount),
              valueClass: throttledCount > 0 ? "text-amber-400" : "text-primary",
            },
            {
              icon: Zap, iconClass: "text-amber-400",
              label: "Total Power", delay: 0.18,
              loading: gpusLoading,
              value: `${totalPower.toLocaleString()}W`,
              valueClass: "text-foreground",
            },
          ].map(({ icon: Icon, iconClass, label, delay, loading, value, valueClass }) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay }}
              className="p-4 rounded-xl glass-card-premium cyber-corners"
            >
              <div className="flex items-center gap-2 mb-3">
                <Icon className={`w-4 h-4 ${iconClass}`} />
                <span className="text-[10px] font-mono text-muted-foreground/70 tracking-widest uppercase">{label}</span>
              </div>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className={`text-2xl font-mono font-bold ${valueClass} glow-text`}>{value}</div>
              )}
            </motion.div>
          ))}
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
          className="p-5 rounded-xl glass-card-premium cyber-corners terminal-scanlines border border-primary/15"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-mono font-bold text-foreground flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase">
              <Fan className="w-4 h-4 text-primary led-glow" />
              Fan Control Profiles
            </h3>
            <span className="text-[9px] font-mono text-muted-foreground/50 tracking-widest uppercase">Learned Thermal Opt Active</span>
          </div>

          {zonesLoading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {zones.map((zone) => {
                const temp = Number(zone.temperature);
                const fanSpd = Number(zone.fan_speed);
                const borderStyle = getTempBorderStyle(temp);
                return (
                  <motion.div
                    key={zone.zone_id}
                    className="p-4 rounded-lg relative overflow-hidden"
                    style={{ background: getTempBg(temp), ...borderStyle }}
                    whileHover={{ scale: 1.01 }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-mono text-xs text-foreground tracking-wide">{zone.name}</div>
                        <div className="text-[10px] text-muted-foreground/60 font-mono mt-0.5 tracking-widest flex items-center gap-2">
                          <span className={getTempColor(temp)}>{temp}°C</span>
                          {zone.throttling && (
                            <span className="badge-neon-amber text-[8px] px-1.5 py-0.5 rounded tracking-widest uppercase">Throttling</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-mono text-lg font-bold ${fanSpd > 80 ? "text-amber-400" : "text-primary"}`}>{fanSpd}%</div>
                        <div className="text-[9px] text-muted-foreground/50 font-mono tracking-widest uppercase">Fan Spd</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Slider
                        defaultValue={[fanSpd]}
                        max={100}
                        step={5}
                        className="flex-1"
                        onValueCommit={(value) => handleFanAdjust(zone.zone_id, value[0])}
                        disabled={adjustingZone === zone.zone_id}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="font-mono text-[10px] border-primary/25 text-primary hover:bg-primary/10 tracking-widest h-7 px-3"
                        onClick={() => handleFanAdjust(zone.zone_id, 100)}
                        disabled={adjustingZone === zone.zone_id}
                      >
                        Max
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* GPU Temperature Nodes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-xl glass-card-premium cyber-corners terminal-scanlines border border-primary/15"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-mono font-bold text-foreground flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase">
              <Cpu className="w-4 h-4 text-primary" />
              GPU Temperature per Node
            </h3>
            <span className="text-[9px] text-primary font-mono flex items-center gap-2 tracking-widest uppercase animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-primary led-glow-green" />
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
                const borderStyle = getTempBorderStyle(temp);
                return (
                  <motion.div
                    key={gpu.gpu_id}
                    className="p-3 rounded-lg text-center relative overflow-hidden"
                    style={{ background: getTempBg(temp), ...borderStyle }}
                    whileHover={{ scale: 1.04 }}
                  >
                    <div className={`text-2xl font-mono font-bold ${getTempColor(temp)} drop-shadow-[0_0_6px_currentColor]`}>{temp}°C</div>
                    <div className="text-[9px] text-muted-foreground/50 font-mono truncate mt-1 tracking-widest">{gpu.gpu_id}</div>
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
          className="p-5 rounded-xl glass-card-premium cyber-corners border border-primary/15"
        >
          <h3 className="font-mono font-bold text-foreground mb-5 text-[10px] tracking-[0.2em] uppercase flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary led-glow-green" />
            Learned Heat Aversion
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "Workload Distribution", body: "Automatically routes compute away from hot zones" },
              { label: "Predictive Cooling", body: "Pre-emptively adjusts fan speeds based on load patterns" },
              { label: "Throttle Prevention", body: "Reduces workload before thermal throttling occurs" },
            ].map(({ label, body }) => (
              <div
                key={label}
                className="p-4 rounded-lg"
                style={{ background: "rgba(8,14,24,0.5)", border: "1px solid rgba(16,185,129,0.1)" }}
              >
                <div className="text-[9px] font-mono text-primary/70 tracking-widest uppercase mb-2">{label}</div>
                <div className="text-xs text-foreground/70 font-sans leading-relaxed">{body}</div>
              </div>
            ))}
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
