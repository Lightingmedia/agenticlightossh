import { motion } from "framer-motion";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import GPUCard from "@/components/dashboard/GPUCard";
import TelemetryChart from "@/components/dashboard/TelemetryChart";
import ThermalHeatmap from "@/components/dashboard/ThermalHeatmap";

// Mock GPU data
const gpus = [
  { name: "NVIDIA A100", id: "gpu-node-7", utilization: 87, temperature: 72, power: 312, memoryUsed: 68, memoryTotal: 80, status: "busy" as const },
  { name: "NVIDIA H100", id: "gpu-node-12", utilization: 45, temperature: 58, power: 280, memoryUsed: 45, memoryTotal: 80, status: "online" as const },
  { name: "NVIDIA A100", id: "gpu-node-3", utilization: 92, temperature: 78, power: 350, memoryUsed: 72, memoryTotal: 80, status: "busy" as const },
  { name: "NVIDIA RTX 4090", id: "gpu-edge-1", utilization: 23, temperature: 45, power: 180, memoryUsed: 8, memoryTotal: 24, status: "idle" as const },
  { name: "NVIDIA A100", id: "gpu-node-15", utilization: 0, temperature: 35, power: 50, memoryUsed: 0, memoryTotal: 80, status: "offline" as const },
  { name: "NVIDIA H100", id: "gpu-node-18", utilization: 67, temperature: 65, power: 310, memoryUsed: 58, memoryTotal: 80, status: "online" as const },
];

const thermalZones = [
  { id: "zone-1", name: "GPU Cluster A", temperature: 72, fanSpeed: 75, throttling: false },
  { id: "zone-2", name: "GPU Cluster B", temperature: 78, fanSpeed: 85, throttling: false },
  { id: "zone-3", name: "CPU Rack 1", temperature: 58, fanSpeed: 45, throttling: false },
  { id: "zone-4", name: "GPU Cluster C", temperature: 85, fanSpeed: 100, throttling: true },
];

const utilizationData = Array.from({ length: 60 }, (_, i) => ({
  time: `${i}m`,
  value: 60 + Math.random() * 35,
  value2: 40 + Math.random() * 40,
}));

const powerData = Array.from({ length: 24 }, (_, i) => ({
  time: `${i}:00`,
  value: 800 + Math.random() * 400,
}));

const GPUMonitor = () => {
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
            <div className="text-2xl font-mono font-bold text-foreground">6</div>
            <div className="text-sm text-muted-foreground">Total GPUs</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-xl border border-border bg-card/50"
          >
            <div className="text-2xl font-mono font-bold text-primary">5</div>
            <div className="text-sm text-muted-foreground">Online</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 rounded-xl border border-border bg-card/50"
          >
            <div className="text-2xl font-mono font-bold text-amber-400">1,482W</div>
            <div className="text-sm text-muted-foreground">Total Power</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-4 rounded-xl border border-border bg-card/50"
          >
            <div className="text-2xl font-mono font-bold text-foreground">68%</div>
            <div className="text-sm text-muted-foreground">Avg Utilization</div>
          </motion.div>
        </div>

        {/* GPU Grid */}
        <div>
          <h3 className="font-mono font-bold text-foreground mb-4">GPU Nodes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gpus.map((gpu, index) => (
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
        <ThermalHeatmap zones={thermalZones} />
      </div>
    </div>
  );
};

export default GPUMonitor;
