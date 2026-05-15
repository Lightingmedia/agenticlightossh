import {
  Settings, LayoutDashboard, Bot, GitMerge, Building2, Coins, Cloud, Activity, TerminalSquare,
  Cpu, Thermometer, LineChart, Network, Boxes, BookOpen, FlaskConical, Workflow, Database,
  Sparkles, ScrollText, Wand2, Rocket, Eye, Server, Brain, GraduationCap, Gauge, FileCode2,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useWindowManager } from "./WindowManager";
import { usePreferences, useReducedMotion } from "./Preferences";
import { sfx } from "./sfx";
import type { AppId } from "./types";

type DesktopApp =
  | { id: AppId; label: string; icon: typeof Settings; kind: "app" }
  | { id: string; label: string; icon: typeof Settings; kind: "route"; url: string };

// Three pages — Ubuntu-style app grid
const PAGES: DesktopApp[][] = [
  // Page 1 — Workspace
  [
    { kind: "app", id: "control",      label: "Control Center", icon: LayoutDashboard },
    { kind: "app", id: "agentic",      label: "Agentic AI",     icon: Bot },
    { kind: "app", id: "mlops",        label: "MLOps",          icon: GitMerge },
    { kind: "app", id: "inference",    label: "Inference",      icon: Activity },
    { kind: "app", id: "cloud",        label: "Compute Cloud",  icon: Cloud },
    { kind: "app", id: "datacenter",   label: "Datacenter",     icon: Building2 },
    { kind: "app", id: "tokenfactory", label: "Token Factory",  icon: Coins },
    { kind: "app", id: "terminal",     label: "Terminal",       icon: TerminalSquare },
    { kind: "route", id: "photonic",   label: "Photonic Fabric",icon: Network,     url: "/dashboard/photonic" },
    { kind: "route", id: "gpu",        label: "GPU Monitor",    icon: Cpu,         url: "/dashboard/gpu" },
    { kind: "route", id: "telemetry",  label: "Telemetry",      icon: LineChart,   url: "/dashboard/telemetry" },
    { kind: "route", id: "thermal",    label: "Thermal Control",icon: Thermometer, url: "/dashboard/thermal" },
  ],
  // Page 2 — AI Studio
  [
    { kind: "route", id: "agents",       label: "Agents",        icon: Bot,          url: "/dashboard/agents" },
    { kind: "route", id: "agent-new",    label: "Agent Builder", icon: Wand2,        url: "/dashboard/agent/new" },
    { kind: "route", id: "studio",       label: "Agent Studio",  icon: Sparkles,     url: "/dashboard/studio" },
    { kind: "route", id: "templates",    label: "Templates",     icon: BookOpen,     url: "/dashboard/templates" },
    { kind: "route", id: "data-sources", label: "Data Sources",  icon: Database,     url: "/dashboard/data-sources" },
    { kind: "route", id: "rules",        label: "Rules",         icon: ScrollText,   url: "/dashboard/rules" },
    { kind: "route", id: "actions",      label: "Actions",       icon: Workflow,     url: "/dashboard/actions" },
    { kind: "route", id: "deploy",       label: "Deploy",        icon: Rocket,       url: "/dashboard/deploy" },
    { kind: "route", id: "monitor",      label: "Monitor",       icon: Eye,          url: "/dashboard/monitor" },
    { kind: "route", id: "runs",         label: "Runs",          icon: FileCode2,    url: "/dashboard/runs" },
    { kind: "route", id: "models",       label: "LLM Models",    icon: Brain,        url: "/dashboard/models" },
    { kind: "route", id: "llm-serving",  label: "LLM Serving",   icon: Server,       url: "/dashboard/llm-serving" },
  ],
  // Page 3 — Compute
  [
    { kind: "route", id: "training",   label: "Training",      icon: GraduationCap, url: "/dashboard/training" },
    { kind: "route", id: "clusters",   label: "Clusters",      icon: Boxes,         url: "/dashboard/clusters" },
    { kind: "route", id: "benchmark",  label: "llmperf-bench", icon: Gauge,         url: "/dashboard/benchmark" },
    { kind: "route", id: "alpha",      label: "LightOS Alpha", icon: FlaskConical,  url: "/light-compiler" },
  ],
];

const PAGE_KEY = "lightos.desktop.page";

export function DesktopIcons() {
  const { openApp, openRoute } = useWindowManager();
  const { iconSize, density } = usePreferences();
  const reduced = useReducedMotion();
  const [page, setPage] = useState(() => {
    if (typeof window === "undefined") return 0;
    const saved = parseInt(localStorage.getItem(PAGE_KEY) ?? "0", 10);
    return Number.isFinite(saved) && saved >= 0 && saved < PAGES.length ? saved : 0;
  });

  // Persist page across refreshes / logins
  useEffect(() => {
    try { localStorage.setItem(PAGE_KEY, String(page)); } catch { /* ignore */ }
  }, [page]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).closest("input,textarea,[contenteditable]")) return;
      if (e.key === "ArrowRight") setPage((p) => Math.min(PAGES.length - 1, p + 1));
      if (e.key === "ArrowLeft") setPage((p) => Math.max(0, p - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Touch swipe gestures
  const touch = useRef<{ x: number; y: number; t: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.current.x;
    const dy = t.clientY - touch.current.y;
    const dt = Date.now() - touch.current.t;
    touch.current = null;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.2 || dt > 600) return;
    if (dx < 0) setPage((p) => Math.min(PAGES.length - 1, p + 1));
    else setPage((p) => Math.max(0, p - 1));
  };

  const tileW = iconSize + 32;
  const gapX = density === "compact" ? 12 : 28;
  const gapY = density === "compact" ? 8 : 20;
  const padding = density === "compact" ? "p-1" : "p-2";
  const radius = iconSize >= 64 ? "rounded-2xl" : "rounded-xl";

  const launch = (app: DesktopApp) => {
    sfx.open();
    if (app.kind === "app") openApp(app.id);
    else openRoute(app.url, app.label, { width: 1200, height: 760 });
  };

  return (
    <div className="absolute inset-0 grid place-items-center pointer-events-none z-[5]">
      <div className="pointer-events-auto flex flex-col items-center gap-5">
        {/* Page viewport */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            aria-label="Previous page"
            className="p-2 rounded-full bg-card/40 border border-border/60 text-foreground/70 hover:text-primary hover:border-primary disabled:opacity-30 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div
            className="overflow-hidden touch-pan-y"
            style={{ width: (tileW + gapX) * 4 }}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${page * 100}%)` }}
            >
              {PAGES.map((apps, pi) => (
                <div
                  key={pi}
                  className="grid grid-cols-4 shrink-0 w-full"
                  style={{ columnGap: gapX, rowGap: gapY }}
                >
                  {apps.map((app, i) => {
                    const Icon = app.icon;
                    return (
                      <button
                        key={app.id}
                        onMouseEnter={() => sfx.hover()}
                        onDoubleClick={() => launch(app)}
                        onClick={(e) => {
                          if ((e.detail ?? 1) === 1 && window.matchMedia("(hover: none)").matches) {
                            launch(app);
                          }
                        }}
                        style={{ width: tileW, animationDelay: `${i * 40}ms` }}
                        className={`group flex flex-col items-center gap-1.5 ${padding} rounded-lg hover:bg-primary/10 focus:bg-primary/15 focus:outline-none transition-all duration-300 ${reduced ? "" : "hover:-translate-y-1 animate-fade-in"}`}
                      >
                        <div
                          style={{ width: iconSize, height: iconSize }}
                          className={`${radius} relative overflow-hidden border border-border/60 bg-card/70 backdrop-blur-md grid place-items-center text-foreground/85 group-hover:border-primary group-hover:text-primary group-hover:shadow-[0_0_28px_hsl(var(--primary)/0.55)] transition-all duration-300 ${reduced ? "" : "group-hover:scale-110"}`}
                        >
                          <span
                            aria-hidden
                            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                            style={{
                              background:
                                "radial-gradient(circle at 30% 30%, hsl(var(--primary) / 0.35), transparent 60%)",
                            }}
                          />
                          <Icon
                            style={{ width: iconSize * 0.5, height: iconSize * 0.5 }}
                            className={`relative z-10 transition-transform duration-300 ${reduced ? "" : "group-hover:scale-110 group-active:scale-95"}`}
                          />
                        </div>
                        <span className="font-mono text-[11px] text-foreground/90 text-center leading-tight px-1.5 py-0.5 rounded group-hover:bg-background/70 group-hover:text-primary transition-colors">
                          {app.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setPage((p) => Math.min(PAGES.length - 1, p + 1))}
            disabled={page === PAGES.length - 1}
            aria-label="Next page"
            className="p-2 rounded-full bg-card/40 border border-border/60 text-foreground/70 hover:text-primary hover:border-primary disabled:opacity-30 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Pagination dots */}
        <div className="flex items-center gap-2">
          {PAGES.map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              aria-label={`Page ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === page ? "w-6 bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.8)]" : "w-1.5 bg-foreground/30 hover:bg-foreground/60"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
