import { motion } from "framer-motion";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import TelemetryChart from "@/components/dashboard/TelemetryChart";
import StatCard from "@/components/dashboard/StatCard";
import { Activity, Wifi, Clock, AlertTriangle, Server, Gauge } from "lucide-react";
import { useRealtimeSystemLogs } from "@/hooks/use-realtime-telemetry";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const stats = [
  { title: "Avg Latency", value: "34ms", change: "P95: 89ms", changeType: "neutral" as const, icon: Clock },
  { title: "Throughput", value: "2,341/s", change: "↑ 15%", changeType: "positive" as const, icon: Gauge, iconColor: "text-primary" },
  { title: "Error Rate", value: "0.12%", change: "↓ 0.05%", changeType: "positive" as const, icon: AlertTriangle, iconColor: "text-amber-400" },
  { title: "Active Connections", value: "1,247", change: "+89 today", changeType: "positive" as const, icon: Wifi, iconColor: "text-blue-400" },
];

// Generate chart data
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

const Telemetry = () => {
  const { logs, loading } = useRealtimeSystemLogs();

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

          {loading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            <div className="font-mono text-xs space-y-1 max-h-64 overflow-y-auto">
              {logs.map((log, index) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="flex gap-3 py-1.5 px-2 rounded hover:bg-secondary/50"
                >
                  <span className="text-muted-foreground flex-shrink-0">
                    {format(new Date(log.created_at), "HH:mm:ss.SSS")}
                  </span>
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
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Telemetry;
