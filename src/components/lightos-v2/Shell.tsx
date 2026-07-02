import { useState, type ComponentType } from "react";
import {
  LayoutGrid, Brain, LineChart, Zap, Cloud, Building2,
  Database, TerminalSquare, Radio, Cpu, BarChart3, FlaskConical,
  Bell, type LucideProps,
} from "lucide-react";

export type AppKey =
  | "control" | "agentic" | "mlops" | "inference" | "compute" | "datacenter"
  | "tokens" | "terminal" | "photonic" | "nce" | "telemetry" | "thermal";

type IconType = ComponentType<LucideProps>;

const NAV: { key: AppKey; label: string; Icon: IconType }[] = [
  { key: "control", label: "Control Center", Icon: LayoutGrid },
  { key: "agentic", label: "Agentic AI", Icon: Brain },
  { key: "mlops", label: "MLOps", Icon: LineChart },
  { key: "inference", label: "Inference", Icon: Zap },
  { key: "compute", label: "Compute Cloud", Icon: Cloud },
  { key: "datacenter", label: "Datacenter", Icon: Building2 },
  { key: "tokens", label: "Token Factory", Icon: Database },
  { key: "terminal", label: "Terminal", Icon: TerminalSquare },
  { key: "photonic", label: "Photonic Fabric", Icon: Radio },
  { key: "nce", label: "NCE Monitor", Icon: Cpu },
  { key: "telemetry", label: "Telemetry", Icon: BarChart3 },
  { key: "thermal", label: "Thermal Control", Icon: FlaskConical },
];

const BG = "#0A0E1A";
const CARD = "#0F1629";
const BORDER = "#1E2D4A";
const TEAL = "#00FFB2";
const HOVER = "#151F35";

function Placeholder({ label }: { label: string }) {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="text-center">
        <div style={{ color: TEAL }} className="font-mono text-xs tracking-[0.3em] uppercase mb-3">
          LightOS
        </div>
        <div className="text-white text-3xl font-semibold">{label}</div>
        <div className="text-gray-500 mt-2 text-sm">Module ready — content coming in next prompt.</div>
      </div>
    </div>
  );
}

export default function Shell() {
  const [active, setActive] = useState<AppKey>("control");
  const [fadeKey, setFadeKey] = useState(0);

  const go = (k: AppKey) => {
    setActive(k);
    setFadeKey((n) => n + 1);
  };

  const activeLabel = NAV.find((n) => n.key === active)?.label ?? "";

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: BG, fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Top nav */}
      <header
        className="h-14 flex items-center justify-between px-5 shrink-0"
        style={{ background: BG, borderBottom: `1px solid ${BORDER}` }}
      >
        <div className="flex items-baseline gap-2">
          <span style={{ color: TEAL }} className="font-bold text-[15px] tracking-wide">LightRail AI</span>
          <span className="text-white/90 text-[15px] font-medium">LightOS</span>
        </div>
        <div className="flex items-center gap-4">
          <button className="relative p-2 rounded-md hover:bg-white/5 text-white/80" aria-label="Notifications">
            <Bell size={18} />
            <span
              className="absolute -top-0.5 -right-0.5 text-[10px] font-mono font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center text-white"
              style={{ background: "#FF4D4D" }}
            >
              3
            </span>
          </button>
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center font-mono text-xs font-bold"
            style={{ background: `linear-gradient(135deg, ${TEAL}, #00A876)`, color: BG }}
          >
            LA
          </div>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Sidebar */}
        <aside
          className="shrink-0 py-3 overflow-y-auto"
          style={{ width: 240, background: BG, borderRight: `1px solid ${BORDER}` }}
        >
          <nav className="flex flex-col">
            {NAV.map(({ key, label, Icon }) => {
              const isActive = key === active;
              return (
                <button
                  key={key}
                  onClick={() => go(key)}
                  className="group flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors"
                  style={{
                    color: isActive ? TEAL : "#8A94A6",
                    background: isActive ? "rgba(0,255,178,0.04)" : "transparent",
                    borderLeft: `3px solid ${isActive ? TEAL : "transparent"}`,
                    paddingLeft: isActive ? 13 : 16,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = HOVER;
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  }}
                >
                  <Icon size={16} className="shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-y-auto" style={{ background: BG }}>
          <div
            key={fadeKey}
            className="h-full w-full p-6"
            style={{ animation: "lightos-fade 150ms ease-out" }}
          >
            <Placeholder label={activeLabel} />
          </div>
          <style>{`@keyframes lightos-fade { from { opacity: 0 } to { opacity: 1 } }`}</style>
        </main>
      </div>
    </div>
  );
}
