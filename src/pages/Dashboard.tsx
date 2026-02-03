import { motion } from "framer-motion";
import {
  Bot,
  Cpu,
  Activity,
  Zap,
  TrendingUp,
  Clock,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import StatCard from "@/components/dashboard/StatCard";
import TelemetryChart from "@/components/dashboard/TelemetryChart";
import InferenceQueue from "@/components/dashboard/InferenceQueue";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

// Mock data
const stats = [
  { title: "Active Agents", value: "24", change: "+3 today", changeType: "positive" as const, icon: Bot },
  { title: "GPU Utilization", value: "78%", change: "↑ 12%", changeType: "positive" as const, icon: Cpu, iconColor: "text-amber-400" },
  { title: "Requests/min", value: "2,341", change: "↓ 5%", changeType: "negative" as const, icon: Activity, iconColor: "text-blue-400" },
  { title: "Avg Latency", value: "34ms", change: "P95", changeType: "neutral" as const, icon: Zap },
];

const telemetryData = Array.from({ length: 24 }, (_, i) => ({
  time: `${i}:00`,
  value: 50 + Math.random() * 40,
  value2: 30 + Math.random() * 30,
}));

const queueTasks = [
  { id: "task-001", model: "llama-3.1-70b", status: "running" as const, progress: 67, tokens: undefined, duration: undefined },
  { id: "task-002", model: "mistral-7b-v0.3", status: "running" as const, progress: 23, tokens: undefined, duration: undefined },
  { id: "task-003", model: "codellama-34b", status: "queued" as const, progress: undefined, tokens: undefined, duration: undefined },
  { id: "task-004", model: "mixtral-8x7b", status: "completed" as const, progress: undefined, tokens: 1247, duration: "1.2s" },
  { id: "task-005", model: "llama-3.1-8b", status: "completed" as const, progress: undefined, tokens: 892, duration: "0.8s" },
];

const recentAlerts = [
  { time: "2m ago", message: "GPU-7 temperature approaching threshold", type: "warning" },
  { time: "15m ago", message: "Auto-scaling triggered for high load", type: "info" },
  { time: "1h ago", message: "New agent node-west-12 registered", type: "success" },
];

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Overview" subtitle="Monitor your AI infrastructure in real-time" />

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
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
            <InferenceQueue tasks={queueTasks} />
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
