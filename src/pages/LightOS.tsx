import { useEffect } from "react";
import { WindowManagerProvider, useWindowManager } from "@/components/lightos/WindowManager";
import { TopPanel } from "@/components/lightos/TopPanel";
import { Dock } from "@/components/lightos/Dock";
import { WindowSurface } from "@/components/lightos/WindowSurface";
import type { AppId } from "@/components/lightos/types";
import {
  Box,
  Folder,
  LayoutDashboard,
  MonitorCog,
  ServerCog,
  Settings,
  Shield,
  TerminalSquare,
} from "lucide-react";

const DESKTOP_APPS: { id: AppId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "control", label: "AI Control Center", icon: LayoutDashboard },
  { id: "fleet", label: "Fleet Manager", icon: Shield },
  { id: "cluster", label: "Cluster Manager", icon: Box },
  { id: "terminal", label: "Terminal", icon: TerminalSquare },
  { id: "files", label: "Files", icon: Folder },
  { id: "settings", label: "Settings", icon: Settings },
];

function DesktopIcon({
  id,
  label,
  icon: Icon,
}: {
  id: AppId;
  label: string;
  icon: typeof LayoutDashboard;
}) {
  const { openApp } = useWindowManager();

  return (
    <button
      type="button"
      onClick={() => openApp(id)}
      onDoubleClick={() => openApp(id)}
      className="group flex w-24 flex-col items-center gap-2 rounded-xl border border-transparent p-2 text-center font-mono text-[11px] text-foreground/85 transition hover:border-primary/30 hover:bg-card/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      title={label}
    >
      <span className="grid h-12 w-12 place-items-center rounded-2xl border border-border/50 bg-background/70 shadow-lg shadow-black/20 backdrop-blur-md transition group-hover:border-primary/60 group-hover:text-primary">
        <Icon className="h-6 w-6" />
      </span>
      <span className="rounded bg-background/35 px-1.5 py-0.5 leading-tight shadow-sm">{label}</span>
    </button>
  );
}

function Desktop() {
  const { openApp, windows } = useWindowManager();

  // Auto-open Control Center on first load
  useEffect(() => {
    if (windows.length === 0) openApp("control");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 overflow-hidden text-foreground"
      style={{
        background:
          "radial-gradient(circle at 18% 18%, hsl(var(--primary) / 0.16), transparent 42%), radial-gradient(circle at 82% 74%, hsl(var(--primary) / 0.10), transparent 45%), linear-gradient(135deg, hsl(var(--background)), hsl(var(--card)))",
      }}
    >
      <TopPanel />
      <Dock />
      <div className="absolute top-8 left-16 right-0 bottom-0">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="absolute left-8 top-8 z-0 grid grid-cols-1 gap-4">
          {DESKTOP_APPS.map((app) => (
            <DesktopIcon key={app.id} {...app} />
          ))}
        </div>

        <div className="pointer-events-none absolute bottom-5 right-6 z-0 w-72 rounded-2xl border border-border/40 bg-card/45 p-4 font-mono text-xs shadow-2xl shadow-black/25 backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-foreground/90">
              <MonitorCog className="h-4 w-4 text-primary" />
              LightOS Appliance
            </div>
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary">
              ONLINE
            </span>
          </div>
          <div className="space-y-2 text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Fabric control</span>
              <span className="text-foreground">healthy</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Fleet enrollment</span>
              <span className="text-foreground">6 nodes</span>
            </div>
            <div className="flex items-center justify-between">
              <span>K8s / Slurm bridge</span>
              <span className="text-foreground">armed</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                <ServerCog className="h-3.5 w-3.5" />
                OTA channel
              </span>
              <span className="text-foreground">stable</span>
            </div>
          </div>
        </div>

        <WindowSurface />
      </div>

      {/* Desktop hint when nothing open */}
      {windows.length === 0 && (
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className="text-center font-mono">
            <div className="text-6xl font-bold text-primary mb-3 tracking-tight">LightOS</div>
            <div className="text-sm text-muted-foreground">
              Click an app from the dock to get started
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LightOS() {
  return (
    <WindowManagerProvider>
      <Desktop />
    </WindowManagerProvider>
  );
}
