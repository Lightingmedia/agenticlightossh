import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WindowManagerProvider, useWindowManager } from "@/components/lightos/WindowManager";
import { PreferencesProvider, usePreferences } from "@/components/lightos/Preferences";
import { TopPanel } from "@/components/lightos/TopPanel";
import { LeftSidebar, LEFT_SIDEBAR_WIDTH } from "@/components/lightos/LeftSidebar";
import { Taskbar, TASKBAR_HEIGHT } from "@/components/lightos/Taskbar";
import { DesktopIcons } from "@/components/lightos/DesktopIcons";
import { WindowSurface } from "@/components/lightos/WindowSurface";
import { SplashScreen } from "@/components/lightos/SplashScreen";
import { LiquidBackground } from "@/components/lightos/LiquidBackground";

function Desktop() {
  const { windows } = useWindowManager();
  void windows;
  return (
    <div className="fixed inset-0 overflow-hidden text-foreground bg-background">
      <LiquidBackground />
      <TopPanel />
      <LeftSidebar />
      <div className="absolute top-8 right-0" style={{ left: LEFT_SIDEBAR_WIDTH, bottom: TASKBAR_HEIGHT }}>
        <DesktopIcons />
        <WindowSurface />
      </div>
      <Taskbar />
    </div>
  );
}


function Boot() {
  const { splashEnabled } = usePreferences();
  const [booted, setBooted] = useState(!splashEnabled);
  const [shuttingDown, setShuttingDown] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onShutdown = () => {
      setShuttingDown(true);
      setTimeout(() => navigate("/"), 1400);
    };
    window.addEventListener("lightos:shutdown", onShutdown);
    return () => window.removeEventListener("lightos:shutdown", onShutdown);
  }, [navigate]);

  if (shuttingDown) {
    return (
      <div className="fixed inset-0 bg-background grid place-items-center text-primary font-mono">
        <div className="text-center space-y-3 animate-pulse">
          <div className="text-xs uppercase tracking-[0.4em] text-foreground/50">LightOS</div>
          <div className="text-2xl font-bold">● Shutting down…</div>
          <div className="text-[11px] text-foreground/40">returning to main app</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {!booted && <SplashScreen onDone={() => setBooted(true)} />}
      {booted && <Desktop />}
    </>
  );
}

export default function LightOS() {
  return (
    <PreferencesProvider>
      <WindowManagerProvider>
        <Boot />
      </WindowManagerProvider>
    </PreferencesProvider>
  );
}
