import { useEffect, useState } from "react";
import { WindowManagerProvider, useWindowManager } from "@/components/lightos/WindowManager";
import { TopPanel } from "@/components/lightos/TopPanel";
import { Dock } from "@/components/lightos/Dock";
import { Taskbar, TASKBAR_HEIGHT } from "@/components/lightos/Taskbar";
import { DesktopIcons } from "@/components/lightos/DesktopIcons";
import { WindowSurface } from "@/components/lightos/WindowSurface";
import { SplashScreen } from "@/components/lightos/SplashScreen";

function Desktop() {
  const { openApp, windows } = useWindowManager();

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
      <div
        className="absolute top-8 left-16 right-0"
        style={{ bottom: TASKBAR_HEIGHT }}
      >
        <DesktopIcons />
        <WindowSurface />
      </div>
      <Taskbar />
    </div>
  );
}

export default function LightOS() {
  const [booted, setBooted] = useState(false);
  return (
    <WindowManagerProvider>
      {!booted && <SplashScreen onDone={() => setBooted(true)} />}
      {booted && <Desktop />}
    </WindowManagerProvider>
  );
}
