import {
  LayoutGrid,
  Brain,
  BarChart3,
  Zap,
  Cloud,
  Building2,
  Database,
  TerminalSquare,
  Radio,
  Cpu,
  Activity,
  FlaskConical,
} from "lucide-react";
import { useWindowManager } from "./WindowManager";
import type { AppId } from "./types";

export const LEFT_SIDEBAR_WIDTH = 240;

type NavItem = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  appId?: AppId;
  route?: { url: string; title: string };
};

const NAV: NavItem[] = [
  { label: "Control Center", icon: LayoutGrid, appId: "control" },
  { label: "Agentic AI", icon: Brain, appId: "agentic" },
  { label: "MLOps", icon: BarChart3, appId: "mlops" },
  { label: "Inference", icon: Zap, appId: "inference" },
  { label: "Compute Cloud", icon: Cloud, appId: "cloud" },
  { label: "Datacenter", icon: Building2, appId: "datacenter" },
  { label: "Token Factory", icon: Database, appId: "tokenfactory" },
  { label: "Terminal", icon: TerminalSquare, appId: "terminal" },
  { label: "Photonic Fabric", icon: Radio, route: { url: "/dashboard/photonic", title: "Photonic Fabric" } },
  { label: "NCE Monitor", icon: Cpu, route: { url: "/dashboard/gpu", title: "NCE Monitor" } },
  { label: "Telemetry", icon: Activity, route: { url: "/dashboard/telemetry", title: "Telemetry" } },
  { label: "Thermal Control", icon: FlaskConical, route: { url: "/dashboard/thermal", title: "Thermal Control" } },
];

export function LeftSidebar() {
  const { openApp, openRoute, windows, activeId } = useWindowManager();
  const activeWin = windows.find((w) => w.id === activeId);

  const isActive = (item: NavItem) => {
    if (!activeWin) return false;
    if (item.appId) return activeWin.appId === item.appId;
    if (item.route) return activeWin.payload?.url === item.route.url;
    return false;
  };

  return (
    <aside
      className="fixed left-0 top-8 bottom-0 z-40 flex flex-col py-3 gap-0.5 overflow-y-auto"
      style={{
        width: LEFT_SIDEBAR_WIDTH,
        background: "#0A0E1A",
        borderRight: "1px solid #1E2D4A",
      }}
    >
      {NAV.map((item) => {
        const active = isActive(item);
        const Icon = item.icon;
        return (
          <button
            key={item.label}
            onClick={() =>
              item.appId ? openApp(item.appId) : item.route && openRoute(item.route.url, item.route.title)
            }
            className="group relative flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
            style={{
              color: active ? "#00FFB2" : "rgba(226,232,240,0.65)",
              background: active ? "rgba(0,255,178,0.06)" : "transparent",
              borderLeft: active ? "3px solid #00FFB2" : "3px solid transparent",
              paddingLeft: active ? 13 : 16,
            }}
            onMouseEnter={(e) => {
              if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.03)";
            }}
            onMouseLeave={(e) => {
              if (!active) e.currentTarget.style.background = "transparent";
            }}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="text-[13px] font-medium tracking-wide">{item.label}</span>
          </button>
        );
      })}
    </aside>
  );
}
