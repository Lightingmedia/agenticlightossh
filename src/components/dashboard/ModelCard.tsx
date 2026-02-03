import { motion } from "framer-motion";
import { Brain, Download, Zap, Clock, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ModelCardProps {
  name: string;
  provider: string;
  parameters: string;
  quantization: string;
  status: "deployed" | "available" | "downloading";
  latency?: string;
  requests?: number;
}

const ModelCard = ({
  name,
  provider,
  parameters,
  quantization,
  status,
  latency,
  requests,
}: ModelCardProps) => {
  const getStatusStyles = () => {
    switch (status) {
      case "deployed":
        return { badge: "bg-primary/10 text-primary border-primary/30", text: "Deployed" };
      case "available":
        return { badge: "bg-secondary text-muted-foreground border-border", text: "Available" };
      case "downloading":
        return { badge: "bg-amber-500/10 text-amber-400 border-amber-500/30", text: "Downloading" };
    }
  };

  const styles = getStatusStyles();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-xl border border-border bg-card/50 hover:border-primary/30 transition-all group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-gradient-to-br from-primary/20 to-glow-secondary/20">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-mono font-bold text-foreground">{name}</h3>
            <p className="text-xs text-muted-foreground">{provider}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Badge variant="outline" className={cn("font-mono text-xs", styles.badge)}>
          {styles.text}
        </Badge>
        <Badge variant="outline" className="font-mono text-xs">
          {parameters}
        </Badge>
        <Badge variant="outline" className="font-mono text-xs">
          {quantization}
        </Badge>
      </div>

      {/* Stats */}
      {status === "deployed" && (
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-mono text-foreground">{latency}</div>
              <div className="text-xs text-muted-foreground">P95 Latency</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-mono text-foreground">{requests?.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Requests/hr</div>
            </div>
          </div>
        </div>
      )}

      {status === "available" && (
        <Button variant="outline" size="sm" className="w-full mt-2 font-mono">
          <Download className="w-4 h-4 mr-2" />
          Deploy Model
        </Button>
      )}

      {status === "downloading" && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Downloading...</span>
            <span>64%</span>
          </div>
          <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-amber-500"
              initial={{ width: 0 }}
              animate={{ width: "64%" }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ModelCard;
