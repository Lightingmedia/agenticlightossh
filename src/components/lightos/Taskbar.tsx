import { Settings, Folder, TerminalSquare, LayoutDashboard, Globe, Info, Shield, Box, AppWindow, Square } from "lucide-react";
import { useWindowManager } from "./WindowManager";
import type { AppId } from "./types";

const APP_ICONS: Record<AppId, typeof Settings> = {
  settings: Settings,
  files: Folder,
  terminal: TerminalSquare,
  control: LayoutDashboard,
  fleet: Shield,
  cluster: Box,
  browser: Globe,
  about: Info,
  route: AppWindow,
};

export const TASKBAR_HEIGHT = 40;

export function Taskbar() {
  const { windows, focusWindow, minimizeWindow, activeId } = useWindowManager();

  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div
      className="absolute bottom-0 left-0 right-0 border-t border-border/60 bg-card/80 backdrop-blur-md flex items-center px-2 gap-1 z-[100]"
      style={{ height: TASKBAR_HEIGHT }}
    >
      {/* Start/brand */}
      <div className="flex items-center gap-1.5 px-2 h-7 rounded bg-primary/15 border border-primary/30 text-primary font-mono text-[11px] font-bold mr-1">
        <Square className="w-3 h-3" style={{ fill: "currentColor" }} />
        LightOS
      </div>

      <div className="w-px h-6 bg-border/60 mx-1" />

      {/* Open windows */}
      <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto">
        {windows.length === 0 && (
          <span className="text-[10px] font-mono text-foreground/30 px-2">No open apps</span>
        )}
        {windows.map((w) => {
          const Icon = APP_ICONS[w.appId];
          const active = w.id === activeId && !w.minimized;
          return (
            <button
              key={w.id}
              onClick={() => {
                if (active) minimizeWindow(w.id);
                else focusWindow(w.id);
              }}
              title={w.title}
              className={`flex items-center gap-1.5 h-7 px-2 rounded font-mono text-[11px] border transition-colors max-w-[180px] shrink-0 ${
                active
                  ? "bg-primary/20 border-primary/60 text-primary"
                  : w.minimized
                    ? "bg-background/40 border-border/40 text-foreground/50 hover:text-foreground/80"
                    : "bg-background/40 border-border/40 text-foreground/80 hover:border-primary/40 hover:text-primary"
              }`}
            >
              <Icon className="w-3 h-3 shrink-0" />
              <span className="truncate">{w.title}</span>
            </button>
          );
        })}
      </div>

      {/* System tray */}
      <div className="flex items-center gap-2 px-2 text-[10px] font-mono text-foreground/60">
        <span className="hidden sm:inline">photonic-mesh-20×64</span>
        <span className="text-primary">●</span>
        <span>{time}</span>
      </div>
    </div>
  );
}
