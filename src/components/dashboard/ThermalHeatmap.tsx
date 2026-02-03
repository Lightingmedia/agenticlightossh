import { motion } from "framer-motion";
import { Thermometer, Fan, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThermalZone {
  id: string;
  name: string;
  temperature: number;
  fanSpeed: number;
  throttling: boolean;
}

interface ThermalHeatmapProps {
  zones: ThermalZone[];
}

const ThermalHeatmap = ({ zones }: ThermalHeatmapProps) => {
  const getHeatColor = (temp: number) => {
    if (temp >= 85) return "from-red-500 to-red-600";
    if (temp >= 75) return "from-orange-500 to-orange-600";
    if (temp >= 65) return "from-amber-500 to-amber-600";
    if (temp >= 50) return "from-yellow-500 to-yellow-600";
    return "from-primary to-glow-secondary";
  };

  const getTempTextColor = (temp: number) => {
    if (temp >= 80) return "text-red-400";
    if (temp >= 70) return "text-amber-400";
    return "text-foreground";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-xl border border-border bg-card/50"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-mono font-bold text-foreground flex items-center gap-2">
          <Thermometer className="w-5 h-5 text-primary" />
          Thermal Management
        </h3>
        <span className="text-xs text-muted-foreground font-mono">
          Heat Aversion Active
        </span>
      </div>

      {/* Heatmap Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {zones.map((zone, index) => (
          <motion.div
            key={zone.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              "relative p-4 rounded-lg bg-gradient-to-br",
              getHeatColor(zone.temperature),
              "overflow-hidden"
            )}
          >
            {/* Animated heat waves */}
            {zone.temperature >= 70 && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-t from-transparent to-white/10"
                animate={{ opacity: [0.1, 0.3, 0.1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-white/80 truncate">
                  {zone.name}
                </span>
                {zone.throttling && (
                  <AlertTriangle className="w-3 h-3 text-white animate-pulse" />
                )}
              </div>
              <div className="text-2xl font-mono font-bold text-white">
                {zone.temperature}°C
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Fan Status */}
      <div className="grid grid-cols-2 gap-3">
        {zones.slice(0, 2).map((zone) => (
          <div
            key={`fan-${zone.id}`}
            className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50"
          >
            <motion.div
              animate={{ rotate: zone.fanSpeed > 0 ? 360 : 0 }}
              transition={{
                duration: 2 / (zone.fanSpeed / 50 || 1),
                repeat: Infinity,
                ease: "linear",
              }}
            >
              <Fan className="w-5 h-5 text-primary" />
            </motion.div>
            <div>
              <div className="text-sm font-mono text-foreground">
                {zone.fanSpeed}%
              </div>
              <div className="text-xs text-muted-foreground">
                {zone.name} Fan
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Learned thermal profiles optimize workload distribution</span>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-primary" />
            <span>Cool</span>
            <div className="w-3 h-3 rounded bg-amber-500" />
            <span>Warm</span>
            <div className="w-3 h-3 rounded bg-red-500" />
            <span>Hot</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ThermalHeatmap;
