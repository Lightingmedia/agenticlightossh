import { useEffect } from "react";
import { WindowManagerProvider, useWindowManager } from "@/components/lightos/WindowManager";
import { TopPanel } from "@/components/lightos/TopPanel";
import { Dock } from "@/components/lightos/Dock";
import { WindowSurface } from "@/components/lightos/WindowSurface";

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
          "radial-gradient(circle at 20% 20%, hsl(var(--primary) / 0.08), transparent 60%), radial-gradient(circle at 80% 70%, hsl(var(--primary) / 0.06), transparent 55%), hsl(var(--background))",
      }}
    >
      <TopPanel />
      <Dock />
      <div className="absolute top-8 left-16 right-0 bottom-0">
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
