import { motion } from "framer-motion";
import { Clock, CheckCircle, XCircle, Loader2, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  model: string;
  status: "queued" | "running" | "completed" | "failed";
  progress?: number;
  tokens?: number;
  duration?: string;
}

interface InferenceQueueProps {
  tasks: Task[];
}

const InferenceQueue = ({ tasks }: InferenceQueueProps) => {
  const getStatusIcon = (status: Task["status"]) => {
    switch (status) {
      case "queued":
        return <Clock className="w-4 h-4 text-muted-foreground" />;
      case "running":
        return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      case "completed":
        return <CheckCircle className="w-4 h-4 text-primary" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-400" />;
    }
  };

  const getStatusColor = (status: Task["status"]) => {
    switch (status) {
      case "queued":
        return "text-muted-foreground";
      case "running":
        return "text-primary";
      case "completed":
        return "text-primary";
      case "failed":
        return "text-red-400";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-xl border border-border bg-card/50"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-mono font-bold text-foreground">Inference Queue</h3>
        <span className="text-xs text-muted-foreground font-mono">
          {tasks.filter((t) => t.status === "running").length} running
        </span>
      </div>

      <div className="space-y-3">
        {tasks.map((task, index) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
          >
            {/* Status Icon */}
            {getStatusIcon(task.status)}

            {/* Model Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Brain className="w-3 h-3 text-muted-foreground" />
                <span className="font-mono text-sm text-foreground truncate">
                  {task.model}
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                {task.id}
              </p>
            </div>

            {/* Progress/Stats */}
            <div className="text-right">
              {task.status === "running" && task.progress !== undefined && (
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${task.progress}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-primary">
                    {task.progress}%
                  </span>
                </div>
              )}
              {task.status === "completed" && (
                <div className="text-xs text-muted-foreground font-mono">
                  {task.tokens} tokens • {task.duration}
                </div>
              )}
              {task.status === "queued" && (
                <span className={cn("text-xs font-mono capitalize", getStatusColor(task.status))}>
                  Waiting
                </span>
              )}
              {task.status === "failed" && (
                <span className="text-xs font-mono text-red-400">Error</span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default InferenceQueue;
