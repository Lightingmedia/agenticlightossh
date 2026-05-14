import { useState } from "react";
import { WindowManagerProvider, useWindowManager } from "@/components/lightos/WindowManager";
import { PreferencesProvider, usePreferences } from "@/components/lightos/Preferences";
import { TopPanel } from "@/components/lightos/TopPanel";
import { Dock } from "@/components/lightos/Dock";
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
      <Dock />
      <div className="absolute top-8 left-16 right-0" style={{ bottom: TASKBAR_HEIGHT }}>
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
