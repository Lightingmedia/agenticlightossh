import { motion } from "framer-motion";
import { Cpu, Thermometer, Zap, HardDrive } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface GPUCardProps {
  name: string;
  id: string;
  utilization: number;
  temperature: number;
  power: number;
  memoryUsed: number;
  memoryTotal: number;
  status: "online" | "busy" | "idle" | "offline";
}

const GPUCard = ({
  name,
  id,
  utilization,
  temperature,
  power,
  memoryUsed,
  memoryTotal,
  status,
}: GPUCardProps) => {
  const getStatusColor = () => {
    switch (status) {
      case "online": return "bg-primary";
      case "busy": return "bg-amber-500";
      case "idle": return "bg-blue-500";
      case "offline": return "bg-red-500";
    }
  };

  const getTempColor = () => {
    if (temperature >= 80) return "text-red-400";
    if (temperature >= 65) return "text-amber-400";
    return "text-primary";
  };

  const memoryPercent = (memoryUsed / memoryTotal) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-5 rounded-xl border border-border bg-card/50 hover:border-primary/30 transition-all"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Cpu className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-mono font-bold text-foreground">{name}</h3>
            <p className="text-xs text-muted-foreground font-mono">{id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("w-2 h-2 rounded-full animate-pulse", getStatusColor())} />
          <span className="text-xs text-muted-foreground capitalize">{status}</span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Utilization */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Utilization</span>
            <span className="font-mono text-foreground">{utilization}%</span>
          </div>
          <Progress value={utilization} className="h-2" />
        </div>

        {/* Temperature */}
        <div className="flex items-center gap-2">
          <Thermometer className={cn("w-4 h-4", getTempColor())} />
          <span className={cn("font-mono text-sm", getTempColor())}>{temperature}°C</span>
        </div>

        {/* Power */}
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="font-mono text-sm text-foreground">{power}W</span>
        </div>

        {/* Memory */}
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-blue-400" />
          <span className="font-mono text-xs text-muted-foreground">
            {memoryUsed}GB / {memoryTotal}GB
          </span>
        </div>
      </div>

      {/* Memory Bar */}
      <div className="mt-4 space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>VRAM</span>
          <span>{memoryPercent.toFixed(0)}%</span>
        </div>
        <Progress value={memoryPercent} className="h-1.5" />
      </div>
    </motion.div>
  );
};

export default GPUCard;
