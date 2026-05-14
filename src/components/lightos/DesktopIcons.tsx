import { Settings, Folder, TerminalSquare, LayoutDashboard, Globe, Info, Shield, Box } from "lucide-react";
import { useWindowManager } from "./WindowManager";
import { usePreferences } from "./Preferences";
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
  const { iconSize, density } = usePreferences();

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
        {DESKTOP_APPS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onDoubleClick={() => openApp(id)}
            onClick={(e) => {
              if ((e.detail ?? 1) === 1 && window.matchMedia("(hover: none)").matches) openApp(id);
            }}
            style={{ width: tileW }}
            className={`group flex flex-col items-center gap-1.5 ${padding} rounded-lg hover:bg-primary/10 focus:bg-primary/15 focus:outline-none transition-colors`}
          >
            <div
              style={{ width: iconSize, height: iconSize }}
              className={`${radius} border border-border/60 bg-card/80 backdrop-blur-sm grid place-items-center text-foreground/85 group-hover:border-primary/60 group-hover:text-primary group-hover:shadow-[0_0_18px_hsl(var(--primary)/0.45)] transition-all`}
            >
              <Icon style={{ width: iconSize * 0.5, height: iconSize * 0.5 }} />
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
