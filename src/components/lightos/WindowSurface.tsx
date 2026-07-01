import { useWindowManager } from "./WindowManager";
import { Window } from "./Window";
import { SettingsApp } from "./apps/SettingsApp";
import { FilesApp } from "./apps/FilesApp";
import { TerminalApp } from "./apps/TerminalApp";
import { ControlCenterApp } from "./apps/ControlCenterApp";
import { BrowserApp } from "./apps/BrowserApp";
import { AboutApp } from "./apps/AboutApp";
import { RouteApp } from "./apps/RouteApp";
import { FleetApp } from "./apps/FleetApp";
import { ClusterApp } from "./apps/ClusterApp";
import type { WindowState } from "./types";

export function WindowSurface() {
  const { windows } = useWindowManager();
  return (
    <>
      {windows.map((w) => (
        <Window key={w.id} win={w}>
          {renderApp(w)}
        </Window>
      ))}
    </>
  );
}

function renderApp(w: WindowState) {
  switch (w.appId) {
    case "settings":
      return <SettingsApp />;
    case "files":
      return <FilesApp />;
    case "terminal":
      return <TerminalApp />;
    case "control":
      return <ControlCenterApp />;
    case "fleet":
      return <FleetApp />;
    case "cluster":
      return <ClusterApp />;
    case "browser":
      return <BrowserApp />;
    case "about":
      return <AboutApp />;
    case "route":
      return <RouteApp win={w} />;
  }
}
