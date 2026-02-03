import { motion } from "framer-motion";
import { Bot, Cpu, Activity, MoreVertical, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AgentCardProps {
  id: string;
  name: string;
  type: string;
  status: "online" | "offline" | "busy" | "idle";
  cpu: number;
  memory: number;
  tasks: number;
  uptime: string;
}

const AgentCard = ({
  id,
  name,
  type,
  status,
  cpu,
  memory,
  tasks,
  uptime,
}: AgentCardProps) => {
  const getStatusStyles = () => {
    switch (status) {
      case "online":
        return { dot: "bg-primary", badge: "bg-primary/10 text-primary" };
      case "busy":
        return { dot: "bg-amber-500", badge: "bg-amber-500/10 text-amber-400" };
      case "idle":
        return { dot: "bg-blue-500", badge: "bg-blue-500/10 text-blue-400" };
      case "offline":
        return { dot: "bg-red-500", badge: "bg-red-500/10 text-red-400" };
    }
  };

  const styles = getStatusStyles();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="p-5 rounded-xl border border-border bg-card/50 hover:border-primary/30 transition-all group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="p-2.5 rounded-lg bg-secondary">
              <Bot className="w-5 h-5 text-foreground" />
            </div>
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card",
                styles.dot
              )}
            />
          </div>
          <div>
            <h3 className="font-mono font-bold text-foreground">{name}</h3>
            <p className="text-xs text-muted-foreground">{type}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-2 mb-4">
        <span className={cn("text-xs font-mono px-2 py-1 rounded-full capitalize", styles.badge)}>
          {status}
        </span>
        <span className="text-xs text-muted-foreground">• {uptime}</span>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-2 rounded-lg bg-secondary/50">
          <Cpu className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
          <div className="font-mono text-sm text-foreground">{cpu}%</div>
          <div className="text-xs text-muted-foreground">CPU</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-secondary/50">
          <Activity className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
          <div className="font-mono text-sm text-foreground">{memory}%</div>
          <div className="text-xs text-muted-foreground">Memory</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-secondary/50">
          <Power className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
          <div className="font-mono text-sm text-foreground">{tasks}</div>
          <div className="text-xs text-muted-foreground">Tasks</div>
        </div>
      </div>

      {/* ID */}
      <div className="mt-4 pt-3 border-t border-border">
        <p className="text-xs font-mono text-muted-foreground truncate">ID: {id}</p>
      </div>
    </motion.div>
  );
};

export default AgentCard;
