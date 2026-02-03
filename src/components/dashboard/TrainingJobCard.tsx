import { motion } from "framer-motion";
import { GraduationCap, Clock, Cpu, TrendingDown, MoreVertical, Pause, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface TrainingJobCardProps {
  id: string;
  name: string;
  model: string;
  status: "running" | "paused" | "completed" | "queued";
  progress: number;
  epoch: number;
  totalEpochs: number;
  loss: number;
  eta: string;
  gpu: string;
}

const TrainingJobCard = ({
  id,
  name,
  model,
  status,
  progress,
  epoch,
  totalEpochs,
  loss,
  eta,
  gpu,
}: TrainingJobCardProps) => {
  const getStatusColor = () => {
    switch (status) {
      case "running": return "text-primary";
      case "paused": return "text-amber-400";
      case "completed": return "text-blue-400";
      case "queued": return "text-muted-foreground";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-xl border border-border bg-card/50 hover:border-primary/30 transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2.5 rounded-lg",
            status === "running" ? "bg-primary/10" : "bg-secondary"
          )}>
            <GraduationCap className={cn("w-5 h-5", getStatusColor())} />
          </div>
          <div>
            <h3 className="font-mono font-bold text-foreground">{name}</h3>
            <p className="text-xs text-muted-foreground">{model}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {status === "running" && (
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Pause className="w-4 h-4" />
            </Button>
          )}
          {status === "paused" && (
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Play className="w-4 h-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Square className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className={cn("font-mono capitalize", getStatusColor())}>
            {status === "running" && (
              <motion.span
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="inline-block mr-2"
              >
                ●
              </motion.span>
            )}
            {status}
          </span>
          <span className="font-mono text-muted-foreground">
            Epoch {epoch}/{totalEpochs}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{progress}% complete</span>
          <span>ETA: {eta}</span>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
        <div className="text-center">
          <TrendingDown className="w-4 h-4 mx-auto mb-1 text-primary" />
          <div className="font-mono text-sm text-foreground">{loss.toFixed(4)}</div>
          <div className="text-xs text-muted-foreground">Loss</div>
        </div>
        <div className="text-center">
          <Clock className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
          <div className="font-mono text-sm text-foreground">{eta}</div>
          <div className="text-xs text-muted-foreground">Remaining</div>
        </div>
        <div className="text-center">
          <Cpu className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
          <div className="font-mono text-sm text-foreground truncate">{gpu}</div>
          <div className="text-xs text-muted-foreground">GPU</div>
        </div>
      </div>

      {/* ID */}
      <div className="mt-3 pt-3 border-t border-border">
        <p className="text-xs font-mono text-muted-foreground truncate">Job ID: {id}</p>
      </div>
    </motion.div>
  );
};

export default TrainingJobCard;
