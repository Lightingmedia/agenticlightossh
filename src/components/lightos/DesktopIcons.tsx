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
    <div className="absolute inset-0 grid place-items-center pointer-events-none z-[5]">
      <div className="grid grid-cols-4 gap-x-8 gap-y-6 pointer-events-auto">
        {DESKTOP_APPS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onDoubleClick={() => openApp(id)}
            onClick={(e) => {
              if ((e.detail ?? 1) === 1 && window.matchMedia("(hover: none)").matches) openApp(id);
            }}
            className="group w-24 flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-primary/10 focus:bg-primary/15 focus:outline-none transition-colors"
          >
            <div className="w-14 h-14 rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm grid place-items-center text-foreground/85 group-hover:border-primary/60 group-hover:text-primary group-hover:shadow-[0_0_18px_hsl(var(--primary)/0.45)] transition-all">
              <Icon className="w-7 h-7" />
            </div>
            <span className="font-mono text-[11px] text-foreground/85 text-center leading-tight px-1.5 py-0.5 rounded group-hover:bg-background/70">
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
