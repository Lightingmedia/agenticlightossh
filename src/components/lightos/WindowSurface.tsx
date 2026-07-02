import { Settings, Folder, TerminalSquare, LayoutDashboard, Globe, Info, Shield, Box, AppWindow, Bot, GitMerge, Building2, Coins, Cloud, Activity, Network } from "lucide-react";
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
import { InferenceApp } from "./apps/InferenceApp";
import { InferenceCloudApp } from "./apps/InferenceCloudApp";
import { ComputeCloudApp } from "./apps/ComputeCloudApp";
import { PhotonicFabricApp } from "./apps/PhotonicFabricApp";
import { NCEMonitorApp } from "./apps/NCEMonitorApp";
import { TelemetryApp } from "./apps/TelemetryApp";
import { ThermalControlApp } from "./apps/ThermalControlApp";
import { Gauge as GaugeIcon, LineChart as LineChartIcon, Thermometer as ThermometerIcon } from "lucide-react";
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
  agentic: { icon: Bot, title: "Agentic AI", subtitle: "Workspace · runs · tools" },
  mlops: { icon: GitMerge, title: "MLOps", subtitle: "Data · Training · Deploy" },
  datacenter: { icon: Building2, title: "Datacenter Operations", subtitle: "Halls · Power · Cooling" },
  tokenfactory: { icon: Coins, title: "Token Factory", subtitle: "Generation economics" },
  inference: { icon: Activity, title: "Inference", subtitle: "Model endpoints · live traffic" },
  cloud: { icon: Cloud, title: "Compute Cloud", subtitle: "On-demand GPU instances" },
  photonic: { icon: Network, title: "Photonic Fabric", subtitle: "TFLN PIC · 64-Ch WDM" },
  nce: { icon: GaugeIcon, title: "NCE Monitor", subtitle: "X2 Node · 2 Dies · 256 Tiles" },
  telemetry: { icon: LineChartIcon, title: "Telemetry", subtitle: "Metrics · Traces · Logs" },
  thermalctl: { icon: ThermometerIcon, title: "Thermal Control", subtitle: "Cooling · Fans · Throttling" },
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
              <div key={w.appId} className="lightos-window-enter h-full">
                {renderApp(w)}
              </div>
            </AppChrome>
          </Window>
        );
      })}
    </>
  );
}

function renderApp(w: WindowState) {
  // If a built-in app was opened with a route URL, render it as an embedded page.
  if (w.payload?.url && w.appId !== "route") {
    return <RouteApp win={w} />;
  }
  switch (w.appId) {
    case "settings":
      return <SettingsApp />;
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
    case "inference":
      return <InferenceApp />;
    case "cloud":
      return <ComputeCloudApp />;
    case "photonic":
      return <PhotonicFabricApp />;
    case "nce":
      return <NCEMonitorApp />;
    case "telemetry":
      return <TelemetryApp />;
    case "thermalctl":
      return <ThermalControlApp />;
    case "route":
      return <RouteApp win={w} />;
  }
}
