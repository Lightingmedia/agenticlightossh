import { Settings, Folder, TerminalSquare, LayoutDashboard, Globe, Info, Shield, Box, AppWindow, Bot, GitMerge, Building2, Coins, Cloud } from "lucide-react";
import { useWindowManager } from "./WindowManager";
import { Window } from "./Window";
import { AppChrome } from "./AppChrome";
import { SettingsApp } from "./apps/SettingsApp";
import { FilesApp } from "./apps/FilesApp";
import { TerminalApp } from "./apps/TerminalApp";
import { ControlCenterApp } from "./apps/ControlCenterApp";
import { FleetApp } from "./apps/FleetApp";
import { ClusterApp } from "./apps/ClusterApp";
import { BrowserApp } from "./apps/BrowserApp";
import { AboutApp } from "./apps/AboutApp";
import { RouteApp } from "./apps/RouteApp";
import { AgenticAIApp } from "./apps/AgenticAIApp";
import { MLOpsApp } from "./apps/MLOpsApp";
import { DatacenterApp } from "./apps/DatacenterApp";
import { TokenFactoryApp } from "./apps/TokenFactoryApp";
import { InferenceCloudApp } from "./apps/InferenceCloudApp";
import type { WindowState, AppId } from "./types";

const APP_META: Record<AppId, { icon: typeof Settings; title: string; subtitle?: string }> = {
  settings: { icon: Settings, title: "Settings", subtitle: "System preferences" },
  files: { icon: Folder, title: "Files", subtitle: "/root" },
  terminal: { icon: TerminalSquare, title: "Terminal", subtitle: "lsh — root@lightos-main" },
  control: { icon: LayoutDashboard, title: "AI Control Center", subtitle: "Photonic Mesh 20×64" },
  fleet: { icon: Shield, title: "Fleet Manager", subtitle: "mTLS · LightRail CA" },
  cluster: { icon: Box, title: "Cluster Manager", subtitle: "K3s · Slurm · Ray" },
  browser: { icon: Globe, title: "Browser", subtitle: "lightos://web" },
  about: { icon: Info, title: "About LightOS", subtitle: "System Information" },
  agentic: { icon: Bot, title: "Agentic AI", subtitle: "Autonomous operators" },
  mlops: { icon: GitMerge, title: "MLOps", subtitle: "Data · Training · Deploy" },
  datacenter: { icon: Building2, title: "Datacenter Operations", subtitle: "Halls · Power · Cooling" },
  tokenfactory: { icon: Coins, title: "Token Factory", subtitle: "Generation economics" },
  inferencecloud: { icon: Cloud, title: "Inference Cloud", subtitle: "On-demand GPU compute" },
  route: { icon: AppWindow, title: "App", subtitle: "Embedded view" },
};

export function WindowSurface() {
  const { windows } = useWindowManager();
  return (
    <>
      {windows.map((w) => {
        const meta = APP_META[w.appId];
        return (
          <Window key={w.id} win={w}>
            <AppChrome icon={meta.icon} title={meta.title} subtitle={meta.subtitle}>
              {renderApp(w)}
            </AppChrome>
          </Window>
        );
      })}
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
    case "agentic":
      return <AgenticAIApp />;
    case "mlops":
      return <MLOpsApp />;
    case "datacenter":
      return <DatacenterApp />;
    case "tokenfactory":
      return <TokenFactoryApp />;
    case "inferencecloud":
      return <InferenceCloudApp />;
    case "route":
      return <RouteApp win={w} />;
  }
}
