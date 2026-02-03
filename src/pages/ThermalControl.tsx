import { motion } from "framer-motion";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import ThermalHeatmap from "@/components/dashboard/ThermalHeatmap";
import TelemetryChart from "@/components/dashboard/TelemetryChart";
import StatCard from "@/components/dashboard/StatCard";
import { Thermometer, Fan, Zap, AlertTriangle } from "lucide-react";

const thermalZones = [
  { id: "zone-1", name: "GPU Cluster A", temperature: 72, fanSpeed: 75, throttling: false },
  { id: "zone-2", name: "GPU Cluster B", temperature: 78, fanSpeed: 85, throttling: false },
  { id: "zone-3", name: "CPU Rack 1", temperature: 58, fanSpeed: 45, throttling: false },
  { id: "zone-4", name: "GPU Cluster C", temperature: 85, fanSpeed: 100, throttling: true },
  { id: "zone-5", name: "CPU Rack 2", temperature: 52, fanSpeed: 35, throttling: false },
  { id: "zone-6", name: "Storage Array", temperature: 42, fanSpeed: 25, throttling: false },
  { id: "zone-7", name: "Network Core", temperature: 48, fanSpeed: 40, throttling: false },
  { id: "zone-8", name: "GPU Cluster D", temperature: 68, fanSpeed: 65, throttling: false },
];

const stats = [
  { title: "Avg Temperature", value: "63°C", change: "Optimal", changeType: "positive" as const, icon: Thermometer },
  { title: "Avg Fan Speed", value: "59%", change: "Auto", changeType: "neutral" as const, icon: Fan, iconColor: "text-blue-400" },
  { title: "Power Draw", value: "4.2kW", change: "↓ 8%", changeType: "positive" as const, icon: Zap, iconColor: "text-amber-400" },
  { title: "Thermal Events", value: "1", change: "Last 24h", changeType: "negative" as const, icon: AlertTriangle, iconColor: "text-red-400" },
];

const tempHistoryData = Array.from({ length: 24 }, (_, i) => ({
  time: `${i}:00`,
  value: 60 + Math.random() * 20,
  value2: 55 + Math.random() * 15,
}));

const powerData = Array.from({ length: 24 }, (_, i) => ({
  time: `${i}:00`,
  value: 3500 + Math.random() * 1500,
}));

const ThermalControl = () => {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        title="Thermal Control"
        subtitle="Heat aversion and thermal management with learned profiles"
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <StatCard {...stat} />
            </motion.div>
          ))}
        </div>

        {/* Main Heatmap */}
        <ThermalHeatmap zones={thermalZones} />

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TelemetryChart
            title="Temperature History (24h)"
            data={tempHistoryData}
            showSecondary
            color="hsl(0, 84%, 60%)"
            secondaryColor="hsl(45, 90%, 50%)"
            unit="°C"
          />
          <TelemetryChart
            title="Power Consumption (24h)"
            data={powerData}
            color="hsl(280, 70%, 60%)"
            unit="W"
          />
        </div>

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
      </div>
    </div>
  );
};

export default ThermalControl;
