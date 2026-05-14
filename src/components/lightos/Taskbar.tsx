import { Settings, Folder, TerminalSquare, LayoutDashboard, Globe, Info, Shield, Box, AppWindow, Square, Volume2, VolumeX, Bot, GitMerge, Building2, Coins, Cloud, Activity } from "lucide-react";
import { useEffect, useState } from "react";
import { useWindowManager } from "./WindowManager";
import { sfx } from "./sfx";
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
  agentic: Bot,
  mlops: GitMerge,
  datacenter: Building2,
  tokenfactory: Coins,
  inference: Activity,
  cloud: Cloud,
  route: AppWindow,
};

export const TASKBAR_HEIGHT = 56;

export function Taskbar() {
  const { windows, focusWindow, minimizeWindow, activeId } = useWindowManager();
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
  const [audioOn, setAudioOn] = useState(true);

  useEffect(() => {
    const id = setInterval(
      () => setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })),
      30_000
    );
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="absolute bottom-0 left-0 right-0 border-t border-primary/30 bg-background/70 backdrop-blur-xl flex items-center px-3 gap-2 z-[100] shadow-[0_-8px_30px_-12px_hsl(var(--primary)/0.45)]"
      style={{
        height: TASKBAR_HEIGHT,
        backgroundImage:
          "linear-gradient(180deg, hsl(var(--primary) / 0.06), transparent 40%)",
      }}
    >
      {/* Start/brand */}
      <button
        onMouseEnter={() => audioOn && sfx.hover()}
        onClick={() => audioOn && sfx.click()}
        className="flex items-center gap-2 px-3 h-10 rounded-md bg-primary/15 border border-primary/40 text-primary font-mono text-sm font-bold mr-1 hover:bg-primary/25 hover:shadow-[0_0_18px_hsl(var(--primary)/0.6)] transition-all"
      >
        <Square className="w-4 h-4" style={{ fill: "currentColor" }} />
        LightOS
      </button>

      <div className="w-px h-8 bg-border/60 mx-1" />

      {/* Open windows */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto">
        {windows.length === 0 && (
          <span className="text-xs font-mono text-foreground/40 px-2">No open apps</span>
        )}
        {windows.map((w) => {
          const Icon = APP_ICONS[w.appId];
          const active = w.id === activeId && !w.minimized;
          return (
            <button
              key={w.id}
              onMouseEnter={() => audioOn && sfx.hover()}
              onClick={() => {
                if (audioOn) sfx.click();
                if (active) minimizeWindow(w.id);
                else focusWindow(w.id);
              }}
              title={w.title}
              className={`flex items-center gap-2 h-10 px-3 rounded-md font-mono text-xs border transition-all max-w-[220px] shrink-0 ${
                active
                  ? "bg-primary/25 border-primary text-primary shadow-[0_0_14px_hsl(var(--primary)/0.5)]"
                  : w.minimized
                    ? "bg-card/60 border-border/50 text-foreground/60 hover:text-foreground hover:border-primary/40"
                    : "bg-card/70 border-border/60 text-foreground/85 hover:border-primary/60 hover:text-primary hover:shadow-[0_0_10px_hsl(var(--primary)/0.35)]"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{w.title}</span>
            </button>
          );
        })}
      </div>

      {/* System tray */}
      <div className="flex items-center gap-3 px-3 h-10 rounded-md bg-card/60 border border-border/50 text-xs font-mono text-foreground/80">
        <span className="hidden md:inline text-foreground/60">photonic-mesh-20×64</span>
        <span className="text-primary animate-pulse">●</span>
        <button
          aria-label={audioOn ? "Mute UI sounds" : "Unmute UI sounds"}
          onClick={() => {
            const next = !audioOn;
            setAudioOn(next);
            sfx.setMuted(!next);
            if (next) sfx.click();
          }}
          className="text-foreground/70 hover:text-primary transition-colors"
        >
          {audioOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
        <span className="text-foreground tabular-nums">{time}</span>
      </div>
    </div>
  );
}
