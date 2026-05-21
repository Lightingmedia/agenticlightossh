import { motion } from "framer-motion";
import {
  Bot,
  Cpu,
  Activity,
  Zap,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Radio,
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

const LEVEL_CONFIG = {
  ERROR:   { dot: "bg-red-500 led-glow-red",    badge: "badge-neon-red",   label: "ERR" },
  WARN:    { dot: "bg-amber-500 led-glow-amber", badge: "badge-neon-amber", label: "WRN" },
  INFO:    { dot: "bg-blue-400 led-glow-blue",   badge: "badge-neon-blue",  label: "INF" },
  SUCCESS: { dot: "bg-primary led-glow-green",   badge: "badge-neon-green", label: "OK " },
} as const;

const Dashboard = () => {
  const { agents, loading: agentsLoading } = useRealtimeAgents();
  const { gpus, loading: gpusLoading } = useRealtimeGPUs();
  const { tasks, loading: tasksLoading } = useRealtimeInferenceTasks();
  const { logs, loading: logsLoading } = useRealtimeSystemLogs();

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

  const queueTasks = tasks.slice(0, 5).map((task) => ({
    id: task.task_id,
    model: task.model,
    status: task.status as "queued" | "running" | "completed" | "failed",
    progress: task.progress ?? undefined,
    tokens: task.tokens ?? undefined,
    duration: task.duration ?? undefined,
  }));

  const recentAlerts = logs
    .filter((log) => log.level === "WARN" || log.level === "ERROR" || log.level === "INFO")
    .slice(0, 3)
    .map((log) => ({
      time: format(new Date(log.created_at), "HH:mm:ss"),
      message: `[${log.service}] ${log.message}`,
      level: log.level as keyof typeof LEVEL_CONFIG,
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

        {/* Live telemetry ticker */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between px-4 py-3 rounded-lg glass-card-premium border border-primary/20"
          style={{ boxShadow: "0 0 20px rgba(16,185,129,0.06), inset 0 0 30px rgba(16,185,129,0.02)" }}
        >
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-primary led-glow-green flex-shrink-0" />
            <span className="font-mono text-xs text-primary font-bold tracking-[0.2em] uppercase">
              Telemetry Link Active
            </span>
            <Radio className="w-3 h-3 text-primary/50 animate-pulse" />
          </div>
          <div className="hidden lg:flex items-center gap-4 font-mono text-[9px] text-muted-foreground/55 tracking-[0.15em] uppercase">
            <span>Node: US-EAST-1</span>
            <span className="text-primary/20">|</span>
            <span>Hertz: 60Hz</span>
            <span className="text-primary/20">|</span>
            <span>Memory: 92.4GB / 128GB</span>
            <span className="text-primary/20">|</span>
            <span className="text-primary/70">Status: <span className="text-primary">Nominal</span></span>
          </div>
        </motion.div>

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
                  transition={{ delay: index * 0.08 }}
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

          {/* Alerts Terminal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-5 rounded-xl glass-card-premium cyber-corners terminal-scanlines border border-primary/15"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono font-bold text-foreground flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 led-glow-amber" />
                Recent Alerts
              </h3>
              <Link to="/dashboard/telemetry">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[10px] font-mono text-primary hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all duration-300 h-7 px-2.5 tracking-wider"
                >
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
              <div className="space-y-2.5">
                {recentAlerts.length === 0 ? (
                  <p className="font-mono text-[10px] text-muted-foreground/50 tracking-widest text-center py-4">NO ALERTS DETECTED</p>
                ) : recentAlerts.map((alert, index) => {
                  const cfg = LEVEL_CONFIG[alert.level] ?? LEVEL_CONFIG.INFO;
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.08 }}
                      className="flex items-start gap-3 p-3 rounded-lg border transition-all duration-300"
                      style={{
                        background: "rgba(8,14,24,0.6)",
                        borderColor: "rgba(16,185,129,0.08)",
                      }}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${cfg.dot}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${cfg.badge}`}>
                            {cfg.label}
                          </span>
                          <span className="text-[9px] text-muted-foreground/40 font-mono tracking-widest">{alert.time}</span>
                        </div>
                        <p className="text-[10px] font-mono text-foreground/80 tracking-wide leading-relaxed">{alert.message}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="p-5 rounded-xl glass-card-premium cyber-corners terminal-scanlines border border-primary/15"
        >
          <h3 className="font-mono font-bold text-foreground mb-4 text-[10px] tracking-[0.2em] uppercase flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary led-glow-green" />
            Quick Actions
          </h3>
          <div className="flex flex-wrap gap-3">
            <Link to="/dashboard/agents">
              <Button variant="outline" className="font-mono text-[10px] tracking-widest border-primary/20 text-primary hover:bg-primary/10 hover:border-primary/35 shadow-[0_0_10px_rgba(16,185,129,0.05)] transition-all duration-300 uppercase">
                <Bot className="w-3.5 h-3.5 mr-2" />
                Register Agent
              </Button>
            </Link>
            <Link to="/dashboard/inference">
              <Button variant="outline" className="font-mono text-[10px] tracking-widest border-primary/20 text-primary hover:bg-primary/10 hover:border-primary/35 shadow-[0_0_10px_rgba(16,185,129,0.05)] transition-all duration-300 uppercase">
                <Zap className="w-3.5 h-3.5 mr-2" />
                Submit Task
              </Button>
            </Link>
            <Link to="/dashboard/models">
              <Button variant="outline" className="font-mono text-[10px] tracking-widest border-primary/20 text-primary hover:bg-primary/10 hover:border-primary/35 shadow-[0_0_10px_rgba(16,185,129,0.05)] transition-all duration-300 uppercase">
                <TrendingUp className="w-3.5 h-3.5 mr-2" />
                Deploy Model
              </Button>
            </Link>
            <Link to="/dashboard/gpu">
              <Button variant="outline" className="font-mono text-[10px] tracking-widest border-primary/20 text-primary hover:bg-primary/10 hover:border-primary/35 shadow-[0_0_10px_rgba(16,185,129,0.05)] transition-all duration-300 uppercase">
                <Cpu className="w-3.5 h-3.5 mr-2" />
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
