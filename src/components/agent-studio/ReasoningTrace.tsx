import { useEffect, useRef, useState } from "react";
import { Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface LogEntry {
  id: string;
  timestamp: Date;
  type: "info" | "action" | "decision" | "success" | "warning";
  message: string;
}

interface ReasoningTraceProps {
  logs: LogEntry[];
  className?: string;
}

const typeStyles = {
  info: "text-muted-foreground",
  action: "text-blue-400",
  decision: "text-purple-400",
  success: "text-lightrail",
  warning: "text-amber-400",
};

const typePrefix = {
  info: "[INFO]",
  action: "[ACTION]",
  decision: "[DECISION]",
  success: "[SUCCESS]",
  warning: "[WARN]",
};

export function ReasoningTrace({ logs, className }: ReasoningTraceProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAutoScroll, setIsAutoScroll] = useState(true);

  useEffect(() => {
    if (isAutoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isAutoScroll]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      setIsAutoScroll(isAtBottom);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className={cn("flex flex-col bg-card border border-border rounded-lg overflow-hidden", className)}>
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
        <Terminal className="w-4 h-4 text-lightrail" />
        <span className="text-sm font-medium">Reasoning Trace</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {logs.length} entries
        </span>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-1 bg-background/50"
        style={{ maxHeight: "200px" }}
      >
        <AnimatePresence mode="popLayout">
          {logs.map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex gap-2"
            >
              <span className="text-muted-foreground shrink-0">
                {formatTime(log.timestamp)}
              </span>
              <span className={cn("shrink-0", typeStyles[log.type])}>
                {typePrefix[log.type]}
              </span>
              <span className="text-foreground">{log.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>

        {logs.length === 0 && (
          <div className="text-muted-foreground text-center py-8">
            Agent reasoning trace will appear here...
          </div>
        )}
      </div>
    </div>
  );
}

export type { LogEntry };
