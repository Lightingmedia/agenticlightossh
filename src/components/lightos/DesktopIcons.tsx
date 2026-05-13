import { Settings, Folder, TerminalSquare, LayoutDashboard, Globe, Info, Shield, Box } from "lucide-react";
import { useWindowManager } from "./WindowManager";
import type { AppId } from "./types";

const DESKTOP_APPS: { id: AppId; label: string; icon: typeof Settings }[] = [
  { id: "control", label: "Control Center", icon: LayoutDashboard },
  { id: "fleet", label: "Fleet Manager", icon: Shield },
  { id: "cluster", label: "Cluster Manager", icon: Box },
  { id: "terminal", label: "Terminal", icon: TerminalSquare },
  { id: "files", label: "Files", icon: Folder },
  { id: "browser", label: "Browser", icon: Globe },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "about", label: "About", icon: Info },
];

export function DesktopIcons() {
  const { openApp } = useWindowManager();
  return (
    <div className="absolute top-4 left-4 grid grid-cols-1 gap-3 z-[5]">
      {DESKTOP_APPS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onDoubleClick={() => openApp(id)}
          onClick={(e) => {
            // Single click selects, double click opens. For convenience, single click also opens on touch.
            if ((e.detail ?? 1) === 1 && window.matchMedia("(hover: none)").matches) openApp(id);
          }}
          className="group w-20 flex flex-col items-center gap-1 p-1.5 rounded-lg hover:bg-primary/10 focus:bg-primary/15 focus:outline-none transition-colors"
        >
          <div className="w-12 h-12 rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm grid place-items-center text-foreground/80 group-hover:border-primary/60 group-hover:text-primary group-hover:shadow-[0_0_14px_hsl(var(--primary)/0.4)] transition-all">
            <Icon className="w-6 h-6" />
          </div>
          <span className="font-mono text-[10px] text-foreground/80 text-center leading-tight px-1 rounded group-hover:bg-background/60">
            {label}
          </span>
        </button>
      ))}
    </div>
  );
}
