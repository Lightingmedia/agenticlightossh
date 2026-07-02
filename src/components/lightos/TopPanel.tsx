import { useEffect, useRef, useState } from "react";
import { Wifi, Volume2, Power, Activity, AppWindow, Bell, User } from "lucide-react";

import { useWindowManager } from "./WindowManager";

interface RouteEntry {
  label: string;
  url: string;
}

const ROUTE_GROUPS: { name: string; routes: RouteEntry[] }[] = [
  {
    name: "Dashboard",
    routes: [
      { label: "Overview", url: "/dashboard" },
      { label: "Agents", url: "/dashboard/agents" },
      { label: "GPU Monitor", url: "/dashboard/gpu" },
      { label: "Telemetry", url: "/dashboard/telemetry" },
      { label: "Thermal", url: "/dashboard/thermal" },
      { label: "Inference", url: "/dashboard/inference" },
      { label: "Models", url: "/dashboard/models" },
      { label: "Photonic Fabric", url: "/dashboard/photonic" },
      { label: "Clusters", url: "/dashboard/clusters" },
      { label: "Runs", url: "/dashboard/runs" },
      { label: "Billing", url: "/dashboard/billing" },
    ],
  },
  {
    name: "Agent Studio",
    routes: [
      { label: "Studio", url: "/dashboard/studio" },
      { label: "Templates", url: "/dashboard/templates" },
      { label: "Data Sources", url: "/dashboard/data-sources" },
      { label: "Rules", url: "/dashboard/rules" },
      { label: "Actions", url: "/dashboard/actions" },
      { label: "Deploy", url: "/dashboard/deploy" },
      { label: "Monitor", url: "/dashboard/monitor" },
    ],
  },
  {
    name: "Platform",
    routes: [
      { label: "LightCompiler", url: "/light-compiler" },
      { label: "Transformer Explainer", url: "/transformer-explainer" },
      { label: "Benchmark", url: "/benchmark" },
      { label: "Docs", url: "/docs" },
      { label: "Examples", url: "/examples" },
      { label: "Pricing", url: "/pricing" },
      { label: "Landing", url: "/" },
    ],
  },
];

export function TopPanel() {
  const [time, setTime] = useState(new Date());
  const [open, setOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const { openApp, openRoute } = useWindowManager();
  const menuRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  const ALERTS = [
    { level: "critical", title: "Tile T-47 offline", meta: "NCE-0 · 2 min ago", color: "#FF4D4D" },
    { level: "warning", title: "PSU inlet temp 74°C", meta: "Rack-01 · 8 min ago", color: "#FFB800" },
    { level: "info", title: "Auto-scale added 4 tiles", meta: "llm-prod-01 · 12 min ago", color: "#00FFB2" },
  ];

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  useEffect(() => {
    if (!bellOpen) return;
    const onClick = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [bellOpen]);

  const fmt = time.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return (
    <div className="absolute top-0 left-0 right-0 h-8 bg-background/80 backdrop-blur-md border-b border-border/40 flex items-center justify-between px-3 text-xs font-mono z-[100]">
      <div className="flex items-center gap-1" ref={menuRef}>
        <div className="flex items-center gap-1.5 pr-3 mr-1 border-r border-border/40">
          <span className="font-bold" style={{ color: "#00FFB2" }}>LightRail AI</span>
          <span className="text-foreground/90 font-semibold">LightOS</span>
        </div>
        <button
          onClick={() => openApp("control")}
          className="flex items-center gap-2 px-2 py-1 rounded hover:bg-foreground/10 text-foreground/90"
        >
          <Activity className="w-3.5 h-3.5 text-primary" />
          Activities
        </button>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 px-2 py-1 rounded hover:bg-foreground/10 text-foreground/90"
        >
          <AppWindow className="w-3.5 h-3.5 text-primary" />
          Apps
        </button>
        {open && (
          <div className="absolute top-9 left-2 w-[640px] max-h-[70vh] overflow-auto rounded-lg border border-border/60 bg-card/95 backdrop-blur-md shadow-2xl p-3 grid grid-cols-3 gap-3">
            {ROUTE_GROUPS.map((g) => (
              <div key={g.name}>
                <div className="text-[10px] uppercase tracking-wider text-primary mb-1.5">
                  {g.name}
                </div>
                <div className="flex flex-col">
                  {g.routes.map((r) => (
                    <button
                      key={r.url}
                      onClick={() => {
                        setOpen(false);
                        if (r.url === "/dashboard/inference") {
                          openApp("inference");
                        } else {
                          openRoute(r.url, r.label);
                        }
                      }}
                      className="text-left px-2 py-1 rounded text-xs text-foreground/80 hover:bg-foreground/10 hover:text-primary truncate"
                      title={r.url}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="text-foreground/80">{fmt}</div>
      <div className="flex items-center gap-3 text-muted-foreground">
        <Wifi className="w-3.5 h-3.5" />
        <Volume2 className="w-3.5 h-3.5" />
        <button className="relative p-1 rounded hover:bg-foreground/10 text-foreground/80" aria-label="Notifications">
          <Bell className="w-3.5 h-3.5" />
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center"
            style={{ background: "#FF4D4D", color: "white" }}
          >
            3
          </span>
        </button>
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center border"
          style={{ background: "#0F1629", borderColor: "#1E2D4A", color: "#00FFB2" }}
          aria-label="User"
        >
          <User className="w-3 h-3" />
        </div>
        <Power className="w-3.5 h-3.5" />
      </div>
    </div>
  );
}

