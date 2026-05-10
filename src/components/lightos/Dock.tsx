import {
  LayoutDashboard,
  Terminal,
  FolderOpen,
  Globe,
  Settings,
  Info,
  Shield,
  Box,
} from "lucide-react";
import { useWindowManager } from "./WindowManager";
import type { AppId } from "./types";

const APPS: { id: AppId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "control", label: "AI Control Center", icon: LayoutDashboard },
  { id: "fleet",   label: "Fleet Manager",     icon: Shield },
  { id: "cluster", label: "Cluster Manager",   icon: Box },
  { id: "terminal",label: "Terminal",          icon: Terminal },
  { id: "files",   label: "Files",             icon: FolderOpen },
  { id: "browser", label: "Browser",           icon: Globe },
  { id: "settings",label: "Settings",          icon: Settings },
  { id: "about",   label: "About",             icon: Info },
];

export function Dock() {
  const { openApp, windows } = useWindowManager();

  return (
    <aside
      className="fixed left-2 top-1/2 -translate-y-1/2 z-[100] flex flex-col items-center gap-1.5
        bg-card/40 backdrop-blur border border-border/40 rounded-2xl px-1.5 py-2 shadow-xl"
    >
      {APPS.map(({ id, label, icon: Icon }) => {
        const openWins = windows.filter((w) => w.appId === id);
        const isOpen = openWins.length > 0;
        const isActive = openWins.some((w) => !w.minimized);

        return (
          <div key={id} className="relative flex items-center">
            {/* Open indicator */}
            {isOpen && (
              <span className="absolute -left-1 w-1 h-1 rounded-full bg-primary" />
            )}
            <button
              onClick={() => openApp(id)}
              title={label}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150 ${
                isActive
                  ? "bg-primary/20 border border-primary text-primary shadow-[0_0_12px_hsl(var(--primary)/0.4)]"
                  : isOpen
                  ? "bg-foreground/10 border border-foreground/20 text-foreground/70"
                  : "text-foreground/40 hover:bg-foreground/10 hover:text-foreground/80 border border-transparent"
              }`}
            >
              <Icon className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </aside>
  );
}
