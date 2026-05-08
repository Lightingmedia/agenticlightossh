import { useWindowManager } from "./WindowManager";
import { Window } from "./Window";
import { SettingsApp } from "./apps/SettingsApp";
import { FilesApp } from "./apps/FilesApp";
import { TerminalApp } from "./apps/TerminalApp";
import { ControlCenterApp } from "./apps/ControlCenterApp";
import { BrowserApp } from "./apps/BrowserApp";
import { AboutApp } from "./apps/AboutApp";
import type { AppId } from "./types";

const REGISTRY: Record<AppId, React.ComponentType> = {
  settings: SettingsApp,
  files: FilesApp,
  terminal: TerminalApp,
  control: ControlCenterApp,
  browser: BrowserApp,
  about: AboutApp,
};

export function WindowSurface() {
  const { windows } = useWindowManager();
  return (
    <>
      {windows.map((w) => {
        const Comp = REGISTRY[w.appId];
        return (
          <Window key={w.id} win={w}>
            <Comp />
          </Window>
        );
      })}
    </>
  );
}
