import { Settings, Folder, TerminalSquare, LayoutDashboard, Globe, Info, Shield, Box, Bot, GitMerge, Building2, Coins, Cloud } from "lucide-react";
import { useWindowManager } from "./WindowManager";
import type { AppId } from "./types";

const APPS: { id: AppId; label: string; icon: typeof Settings }[] = [
  { id: "control", label: "AI Control Center", icon: LayoutDashboard },
  { id: "agentic", label: "Agentic AI",          icon: Bot },
  { id: "mlops",   label: "MLOps",               icon: GitMerge },
  { id: "datacenter", label: "Datacenter Ops",   icon: Building2 },
  { id: "tokenfactory", label: "Token Factory",  icon: Coins },
  { id: "inferencecloud", label: "Inference Cloud", icon: Cloud },
  { id: "fleet",   label: "Fleet Manager",       icon: Shield },
  { id: "cluster", label: "Cluster Manager",     icon: Box },
  { id: "terminal", label: "Terminal",           icon: TerminalSquare },
  { id: "files",   label: "Files",               icon: Folder },
  { id: "browser", label: "Browser",             icon: Globe },
  { id: "settings", label: "Settings",           icon: Settings },
  { id: "about",   label: "About",               icon: Info },
];

export function Dock() {
  const { openApp, windows, activeId } = useWindowManager();

  return (
    <div className="absolute left-0 top-8 bottom-0 w-16 bg-background/70 backdrop-blur-md border-r border-border/40 flex flex-col items-center py-3 gap-2 z-[100]">
      {APPS.map(({ id, label, icon: Icon }) => {
        const open = windows.some((w) => w.appId === id);
        const active = windows.find((w) => w.appId === id)?.id === activeId;
        return (
          <button
            key={id}
            title={label}
            onClick={() => openApp(id)}
            className={`relative w-11 h-11 grid place-items-center rounded-lg border transition-all ${
              active
                ? "bg-primary/20 border-primary text-primary shadow-[0_0_12px_hsl(var(--primary)/0.5)]"
                : "bg-card/60 border-border/40 text-foreground/80 hover:border-primary/60 hover:text-primary"
            }`}
          >
            <Icon className="w-5 h-5" />
            {open && (
              <span className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-primary" />
            )}
          </button>
        );
      })}
    </div>
  );
}
