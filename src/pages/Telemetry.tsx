import { motion } from "framer-motion";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import TelemetryChart from "@/components/dashboard/TelemetryChart";
import StatCard from "@/components/dashboard/StatCard";
import { Activity, Wifi, Clock, AlertTriangle, Server, Gauge } from "lucide-react";

// Mock telemetry data
const latencyData = Array.from({ length: 60 }, (_, i) => ({
  time: `${i}s`,
  value: 20 + Math.random() * 30,
  value2: 30 + Math.random() * 25,
}));

const throughputData = Array.from({ length: 24 }, (_, i) => ({
  time: `${i}:00`,
  value: 1500 + Math.random() * 1500,
}));

const errorRateData = Array.from({ length: 60 }, (_, i) => ({
  time: `${i}m`,
  value: Math.random() * 2,
}));

const networkData = Array.from({ length: 30 }, (_, i) => ({
  time: `${i}m`,
  value: 100 + Math.random() * 200,
  value2: 50 + Math.random() * 150,
}));

const stats = [
  { title: "Avg Latency", value: "34ms", change: "P95: 89ms", changeType: "neutral" as const, icon: Clock },
  { title: "Throughput", value: "2,341/s", change: "↑ 15%", changeType: "positive" as const, icon: Gauge, iconColor: "text-primary" },
  { title: "Error Rate", value: "0.12%", change: "↓ 0.05%", changeType: "positive" as const, icon: AlertTriangle, iconColor: "text-amber-400" },
  { title: "Active Connections", value: "1,247", change: "+89 today", changeType: "positive" as const, icon: Wifi, iconColor: "text-blue-400" },
];

const logs = [
  { time: "12:34:56.789", level: "INFO", service: "inference", message: "Request completed in 34ms" },
  { time: "12:34:55.123", level: "WARN", service: "scheduler", message: "Queue depth exceeding threshold" },
  { time: "12:34:54.456", level: "INFO", service: "agent-registry", message: "Agent node-gpu-7 heartbeat received" },
  { time: "12:34:53.789", level: "ERROR", service: "model-loader", message: "Failed to load model weights, retrying..." },
  { time: "12:34:52.012", level: "INFO", service: "inference", message: "Batch processed: 24 requests" },
  { time: "12:34:51.345", level: "DEBUG", service: "thermal", message: "Fan speed adjusted to 75%" },
];

const Telemetry = () => {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        title="Telemetry"
        subtitle="Real-time system metrics and observability"
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

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TelemetryChart
            title="Request Latency (Real-time)"
            data={latencyData}
            showSecondary
            unit="ms"
            type="line"
          />
          <TelemetryChart
            title="Throughput (24h)"
            data={throughputData}
            color="hsl(160, 84%, 45%)"
            unit=" req/s"
          />
          <TelemetryChart
            title="Error Rate"
            data={errorRateData}
            color="hsl(0, 84%, 60%)"
            unit="%"
            type="area"
          />
          <TelemetryChart
            title="Network I/O"
            data={networkData}
            showSecondary
            color="hsl(220, 70%, 60%)"
            secondaryColor="hsl(280, 70%, 60%)"
            unit=" MB/s"
          />
        </div>

        {/* Live Logs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-xl border border-border bg-card/50"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-mono font-bold text-foreground flex items-center gap-2">
              <Server className="w-4 h-4 text-primary" />
              Live Logs
            </h3>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs text-muted-foreground">Streaming</span>
            </div>
          </div>

          <div className="font-mono text-xs space-y-1 max-h-64 overflow-y-auto">
            {logs.map((log, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex gap-3 py-1.5 px-2 rounded hover:bg-secondary/50"
              >
                <span className="text-muted-foreground flex-shrink-0">{log.time}</span>
                <span
                  className={`flex-shrink-0 ${
                    log.level === "ERROR"
                      ? "text-red-400"
                      : log.level === "WARN"
                      ? "text-amber-400"
                      : log.level === "DEBUG"
                      ? "text-muted-foreground"
                      : "text-primary"
                  }`}
                >
                  [{log.level}]
                </span>
                <span className="text-blue-400 flex-shrink-0">[{log.service}]</span>
                <span className="text-foreground/80 truncate">{log.message}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Telemetry;
