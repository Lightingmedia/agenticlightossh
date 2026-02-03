import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconColor?: string;
}

const StatCard = ({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  iconColor = "text-primary",
}: StatCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-xl border border-border bg-card/50 hover:bg-card/80 transition-colors group"
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={cn(
            "p-2.5 rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20",
            iconColor.includes("amber") && "bg-amber-500/10 group-hover:bg-amber-500/20",
            iconColor.includes("red") && "bg-red-500/10 group-hover:bg-red-500/20",
            iconColor.includes("blue") && "bg-blue-500/10 group-hover:bg-blue-500/20"
          )}
        >
          <Icon className={cn("w-5 h-5", iconColor)} />
        </div>
        {change && (
          <span
            className={cn(
              "text-xs font-mono px-2 py-1 rounded-full",
              changeType === "positive" && "text-primary bg-primary/10",
              changeType === "negative" && "text-red-400 bg-red-500/10",
              changeType === "neutral" && "text-muted-foreground bg-muted"
            )}
          >
            {change}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold font-mono text-foreground mb-1">
        {value}
      </div>
      <div className="text-sm text-muted-foreground">{title}</div>
    </motion.div>
  );
};

export default StatCard;
