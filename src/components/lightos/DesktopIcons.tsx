import { Settings, LayoutDashboard, Bot, GitMerge, Building2, Coins, Cloud, Activity, TerminalSquare } from "lucide-react";
import { useWindowManager } from "./WindowManager";
import { usePreferences, useReducedMotion } from "./Preferences";
import { sfx } from "./sfx";
import type { AppId } from "./types";

// Desktop shows feature apps only. System/utility apps live in the dock to avoid duplication.
const DESKTOP_APPS: { id: AppId; label: string; icon: typeof Settings }[] = [
  { id: "control", label: "Control Center", icon: LayoutDashboard },
  { id: "agentic", label: "Agentic AI", icon: Bot },
  { id: "mlops", label: "MLOps", icon: GitMerge },
  { id: "inference", label: "Inference", icon: Activity },
  { id: "cloud", label: "Compute Cloud", icon: Cloud },
  { id: "datacenter", label: "Datacenter", icon: Building2 },
  { id: "tokenfactory", label: "Token Factory", icon: Coins },
  { id: "terminal", label: "Terminal", icon: TerminalSquare },
];

export function DesktopIcons() {
  const { openApp } = useWindowManager();
  const { iconSize, density } = usePreferences();
  const reduced = useReducedMotion();

  const tileW = iconSize + 32; // label/padding allowance
  const gapX = density === "compact" ? 12 : 32;
  const gapY = density === "compact" ? 8 : 24;
  const padding = density === "compact" ? "p-1" : "p-2";
  const radius = iconSize >= 64 ? "rounded-2xl" : "rounded-xl";

  return (
    <div className="absolute inset-0 grid place-items-center pointer-events-none z-[5]">
      <div
        className="grid grid-cols-4 pointer-events-auto"
        style={{ columnGap: gapX, rowGap: gapY }}
      >
        {DESKTOP_APPS.map(({ id, label, icon: Icon }, i) => (
          <button
            key={id}
            onMouseEnter={() => sfx.hover()}
            onDoubleClick={() => {
              sfx.open();
              openApp(id);
            }}
            onClick={(e) => {
              if ((e.detail ?? 1) === 1 && window.matchMedia("(hover: none)").matches) {
                sfx.open();
                openApp(id);
              }
            }}
            style={{ width: tileW, animationDelay: `${i * 60}ms` }}
            className={`group flex flex-col items-center gap-1.5 ${padding} rounded-lg hover:bg-primary/10 focus:bg-primary/15 focus:outline-none transition-all duration-300 ${reduced ? "" : "hover:-translate-y-1 animate-fade-in"}`}
          >
            <div
              style={{ width: iconSize, height: iconSize }}
              className={`${radius} relative overflow-hidden border border-border/60 bg-card/70 backdrop-blur-md grid place-items-center text-foreground/85 group-hover:border-primary group-hover:text-primary group-hover:shadow-[0_0_28px_hsl(var(--primary)/0.55)] transition-all duration-300 ${reduced ? "" : "group-hover:scale-110"}`}
            >
              <span
                aria-hidden
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background:
                    "radial-gradient(circle at 30% 30%, hsl(var(--primary) / 0.35), transparent 60%)",
                }}
              />
              <Icon
                style={{ width: iconSize * 0.5, height: iconSize * 0.5 }}
                className={`relative z-10 transition-transform duration-300 ${reduced ? "" : "group-hover:scale-110 group-active:scale-95"}`}
              />
            </div>
            <span className="font-mono text-[11px] text-foreground/90 text-center leading-tight px-1.5 py-0.5 rounded group-hover:bg-background/70 group-hover:text-primary transition-colors">
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
