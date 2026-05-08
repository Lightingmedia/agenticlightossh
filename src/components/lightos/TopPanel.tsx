import { useEffect, useState } from "react";
import { Wifi, Volume2, Power, Activity } from "lucide-react";
import { useWindowManager } from "./WindowManager";

export function TopPanel() {
  const [time, setTime] = useState(new Date());
  const { openApp } = useWindowManager();

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fmt = time.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return (
    <div className="absolute top-0 left-0 right-0 h-8 bg-background/80 backdrop-blur-md border-b border-border/40 flex items-center justify-between px-3 text-xs font-mono z-[100]">
      <button
        onClick={() => openApp("control")}
        className="flex items-center gap-2 px-2 py-1 rounded hover:bg-foreground/10 text-foreground/90"
      >
        <Activity className="w-3.5 h-3.5 text-primary" />
        Activities
      </button>
      <div className="text-foreground/80">{fmt}</div>
      <div className="flex items-center gap-3 text-muted-foreground">
        <Wifi className="w-3.5 h-3.5" />
        <Volume2 className="w-3.5 h-3.5" />
        <Power className="w-3.5 h-3.5" />
      </div>
    </div>
  );
}
