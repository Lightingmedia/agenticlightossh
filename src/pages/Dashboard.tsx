import { motion } from "framer-motion";
import {
  Bot,
  Cpu,
  Activity,
  Zap,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import StatCard from "@/components/dashboard/StatCard";
import TelemetryChart from "@/components/dashboard/TelemetryChart";
import InferenceQueue from "@/components/dashboard/InferenceQueue";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealtimeAgents, useRealtimeGPUs, useRealtimeInferenceTasks, useRealtimeSystemLogs } from "@/hooks/use-realtime-telemetry";
import { format } from "date-fns";

const Dashboard = () => {
  const { agents, loading: agentsLoading } = useRealtimeAgents();
  const { gpus, loading: gpusLoading } = useRealtimeGPUs();
  const { tasks, loading: tasksLoading } = useRealtimeInferenceTasks();
  const { logs, loading: logsLoading } = useRealtimeSystemLogs();

  // Calculate live stats
  const activeAgents = agents.filter((a) => a.status !== "offline").length;
  const avgUtilization = gpus.length > 0
    ? Math.round(gpus.reduce((acc, g) => acc + Number(g.utilization), 0) / gpus.length)
    : 0;
  const runningTasks = tasks.filter((t) => t.status === "running").length;

  const stats = [
    { title: "Active Agents", value: activeAgents.toString(), change: `${agents.length} total`, changeType: "positive" as const, icon: Bot },
    { title: "GPU Utilization", value: `${avgUtilization}%`, change: `${gpus.length} GPUs`, changeType: "positive" as const, icon: Cpu, iconColor: "text-amber-400" },
    { title: "Running Tasks", value: runningTasks.toString(), change: `${tasks.filter((t) => t.status === "queued").length} queued`, changeType: "neutral" as const, icon: Activity, iconColor: "text-blue-400" },
    { title: "Avg Latency", value: "34ms", change: "P95", changeType: "neutral" as const, icon: Zap },
  ];

  // Transform tasks for queue component
  const queueTasks = tasks.slice(0, 5).map((task) => ({
    id: task.task_id,
    model: task.model,
    status: task.status as "queued" | "running" | "completed" | "failed",
    progress: task.progress ?? undefined,
    tokens: task.tokens ?? undefined,
    duration: task.duration ?? undefined,
  }));

  // Get recent alerts from system logs
  const recentAlerts = logs
    .filter((log) => log.level === "WARN" || log.level === "ERROR" || log.level === "INFO")
    .slice(0, 3)
    .map((log) => ({
      time: format(new Date(log.created_at), "HH:mm"),
      message: `[${log.service}] ${log.message}`,
      type: log.level === "ERROR" ? "warning" : log.level === "WARN" ? "warning" : "info",
    }));

  const telemetryData = Array.from({ length: 24 }, (_, i) => ({
    time: `${i}:00`,
    value: 50 + Math.random() * 40,
    value2: 30 + Math.random() * 30,
  }));

  const isLoading = agentsLoading || gpusLoading || tasksLoading;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Overview" subtitle="Monitor your AI infrastructure in real-time" />

      <div className="p-6 space-y-6">
        {/* Live indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span>Real-time updates enabled</span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading
            ? [...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))
            : stats.map((stat, index) => (
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

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TelemetryChart
            title="Request Throughput"
            data={telemetryData}
            showSecondary
            unit=" req/s"
          />
          <TelemetryChart
            title="GPU Utilization"
            data={telemetryData.map((d) => ({ ...d, value: d.value * 0.8 }))}
            color="hsl(45, 90%, 50%)"
            unit="%"
          />
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Inference Queue */}
          <div className="lg:col-span-2">
            {tasksLoading ? (
              <div className="p-5 rounded-xl border border-border bg-card/50 space-y-3">
                <Skeleton className="h-6 w-32" />
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : (
              <InferenceQueue tasks={queueTasks} />
            )}
          </div>

          {/* Alerts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-xl border border-border bg-card/50"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono font-bold text-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Recent Alerts
              </h3>
              <Link to="/dashboard/telemetry">
                <Button variant="ghost" size="sm" className="text-xs">
                  View All
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>

            {logsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {recentAlerts.map((alert, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50"
                  >
                    <div
                      className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        alert.type === "warning"
                          ? "bg-amber-500"
                          : alert.type === "success"
                          ? "bg-primary"
                          : "bg-blue-500"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground/90">{alert.message}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        {alert.time}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-xl border border-border bg-card/50"
        >
          <h3 className="font-mono font-bold text-foreground mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            <Link to="/dashboard/agents">
              <Button variant="outline" className="font-mono">
                <Bot className="w-4 h-4 mr-2" />
                Register Agent
              </Button>
            </Link>
            <Link to="/dashboard/inference">
              <Button variant="outline" className="font-mono">
                <Zap className="w-4 h-4 mr-2" />
                Submit Task
              </Button>
            </Link>
            <Link to="/dashboard/models">
              <Button variant="outline" className="font-mono">
                <TrendingUp className="w-4 h-4 mr-2" />
                Deploy Model
              </Button>
            </Link>
            <Link to="/dashboard/gpu">
              <Button variant="outline" className="font-mono">
                <Cpu className="w-4 h-4 mr-2" />
                GPU Status
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
