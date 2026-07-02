import {
  Settings, LayoutDashboard, Bot, GitMerge, Building2, Coins, Cloud, Activity, TerminalSquare,
  Cpu, Thermometer, LineChart, Network, Boxes, BookOpen, FlaskConical, Workflow, Database,
  Sparkles, ScrollText, Wand2, Rocket, Eye, Server, Brain, GraduationCap, Gauge, FileCode2,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useWindowManager } from "./WindowManager";
import { usePreferences, useReducedMotion } from "./Preferences";
import { sfx } from "./sfx";
import { supabase } from "@/integrations/supabase/client";
import type { AppId } from "./types";

type DesktopApp =
  | { id: AppId; label: string; icon: typeof Settings; kind: "app" }
  | { id: string; label: string; icon: typeof Settings; kind: "route"; url: string };

const PAGES: DesktopApp[][] = [
  [
    { kind: "app", id: "control",      label: "Control Center", icon: LayoutDashboard },
    { kind: "app", id: "agentic",      label: "Agentic AI",     icon: Bot },
    { kind: "app", id: "mlops",        label: "MLOps",          icon: GitMerge },
    { kind: "app", id: "inference",    label: "Inference",      icon: Activity },
    { kind: "app", id: "cloud",        label: "Compute Cloud",  icon: Cloud },
    { kind: "app", id: "datacenter",   label: "Datacenter",     icon: Building2 },
    { kind: "app", id: "tokenfactory", label: "Token Factory",  icon: Coins },
    { kind: "app", id: "terminal",     label: "Terminal",       icon: TerminalSquare },
    { kind: "app", id: "photonic",     label: "Photonic Fabric",icon: Network },
    { kind: "route", id: "gpu",        label: "GPU Monitor",    icon: Cpu,         url: "/dashboard/gpu" },
    { kind: "route", id: "telemetry",  label: "Telemetry",      icon: LineChart,   url: "/dashboard/telemetry" },
    { kind: "route", id: "thermal",    label: "Thermal Control",icon: Thermometer, url: "/dashboard/thermal" },
  ],
  [
    { kind: "route", id: "agents",       label: "Agents",        icon: Bot,        url: "/dashboard/agents" },
    { kind: "route", id: "agent-new",    label: "Agent Builder", icon: Wand2,      url: "/dashboard/agent/new" },
    { kind: "route", id: "studio",       label: "Agent Studio",  icon: Sparkles,   url: "/dashboard/studio" },
    { kind: "route", id: "templates",    label: "Templates",     icon: BookOpen,   url: "/dashboard/templates" },
    { kind: "route", id: "data-sources", label: "Data Sources",  icon: Database,   url: "/dashboard/data-sources" },
    { kind: "route", id: "rules",        label: "Rules",         icon: ScrollText, url: "/dashboard/rules" },
    { kind: "route", id: "actions",      label: "Actions",       icon: Workflow,   url: "/dashboard/actions" },
    { kind: "route", id: "deploy",       label: "Deploy",        icon: Rocket,     url: "/dashboard/deploy" },
    { kind: "route", id: "monitor",      label: "Monitor",       icon: Eye,        url: "/dashboard/monitor" },
    { kind: "route", id: "runs",         label: "Runs",          icon: FileCode2,  url: "/dashboard/runs" },
    { kind: "route", id: "models",       label: "LLM Models",    icon: Brain,      url: "/dashboard/models" },
    { kind: "route", id: "llm-serving",  label: "LLM Serving",   icon: Server,     url: "/dashboard/llm-serving" },
  ],
  [
    { kind: "route", id: "training",   label: "Training",      icon: GraduationCap, url: "/dashboard/training" },
    { kind: "route", id: "clusters",   label: "Clusters",      icon: Boxes,         url: "/dashboard/clusters" },
    { kind: "route", id: "benchmark",  label: "llmperf-bench", icon: Gauge,         url: "/dashboard/benchmark" },
    { kind: "route", id: "alpha",      label: "LightOS Alpha", icon: FlaskConical,  url: "/light-compiler" },
  ],
];

const PAGE_KEY = "lightos.desktop.page";

function findAppLocation(query: string): { page: number; index: number; app: DesktopApp } | null {
  const q = query.toLowerCase();
  for (let p = 0; p < PAGES.length; p++) {
    for (let i = 0; i < PAGES[p].length; i++) {
      const a = PAGES[p][i];
      if (
        String(a.id).toLowerCase() === q ||
        a.label.toLowerCase() === q ||
        (a.kind === "route" && a.url.toLowerCase() === q)
      ) {
        return { page: p, index: i, app: a };
      }
    }
  }
  return null;
}

export function DesktopIcons() {
  const { openApp, openRoute } = useWindowManager();
  const { iconSize, density } = usePreferences();
  const reduced = useReducedMotion();

  const [page, setPageState] = useState(() => {
    if (typeof window === "undefined") return 0;
    const saved = parseInt(localStorage.getItem(PAGE_KEY) ?? "0", 10);
    return Number.isFinite(saved) && saved >= 0 && saved < PAGES.length ? saved : 0;
  });
  const [focused, setFocused] = useState<{ page: number; index: number } | null>(null);
  const tileRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const remoteTimer = useRef<number | null>(null);

  // Persist page locally + remotely (debounced) via edge function
  const setPage = useCallback((next: number | ((p: number) => number)) => {
    setPageState((prev) => {
      const v = typeof next === "function" ? (next as (p: number) => number)(prev) : next;
      const clamped = Math.max(0, Math.min(PAGES.length - 1, v));
      try { localStorage.setItem(PAGE_KEY, String(clamped)); } catch { /* ignore */ }
      if (remoteTimer.current) window.clearTimeout(remoteTimer.current);
      remoteTimer.current = window.setTimeout(async () => {
        try {
          await supabase.functions.invoke("user-prefs", {
            method: "POST",
            body: { desktop_page: clamped },
          });
        } catch { /* offline ok */ }
      }, 600);
      return clamped;
    });
  }, []);

  // Hydrate from server-side preference on mount (overrides local if logged in)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: sess } = await supabase.auth.getSession();
        if (!sess.session) return;
        const { data, error } = await supabase.functions.invoke("user-prefs", { method: "GET" });
        if (cancelled || error || !data) return;
        const p = Number((data as { desktop_page?: number }).desktop_page);
        if (Number.isInteger(p) && p >= 0 && p < PAGES.length) {
          setPageState(p);
          try { localStorage.setItem(PAGE_KEY, String(p)); } catch { /* ignore */ }
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // Deep links: #app/<id|label|route>  or  #page/<n>
  useEffect(() => {
    const apply = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (!hash) return;
      const [kind, ...rest] = hash.split("/");
      const value = decodeURIComponent(rest.join("/"));
      if (kind === "page") {
        const n = parseInt(value, 10);
        if (Number.isFinite(n)) setPage(n);
      } else if (kind === "app") {
        const loc = findAppLocation(value);
        if (loc) {
          setPage(loc.page);
          setFocused({ page: loc.page, index: loc.index });
        }
      }
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, [setPage]);

  // Focus + scroll-to-tile when a deep link selects it
  useEffect(() => {
    if (!focused) return;
    const id = `${focused.page}:${focused.index}`;
    const el = tileRefs.current[id];
    if (el) {
      requestAnimationFrame(() => el.focus({ preventScroll: true }));
    }
  }, [focused, page]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).closest("input,textarea,[contenteditable]")) return;
      if (e.key === "ArrowRight") setPage((p) => p + 1);
      if (e.key === "ArrowLeft") setPage((p) => p - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setPage]);

  // ---- Touch swipe with vertical-scroll guard + interactive guard ----
  const touch = useRef<{
    x: number; y: number; t: number; locked: "h" | "v" | null; ignore: boolean;
  } | null>(null);

  const isInteractiveTarget = (el: EventTarget | null) => {
    const node = el as HTMLElement | null;
    if (!node) return false;
    return !!node.closest(
      "[data-lightos-window], [data-no-swipe], iframe, input, textarea, select, button[data-app-content], [contenteditable], [role='dialog']"
    );
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (isInteractiveTarget(e.target)) {
      touch.current = { x: 0, y: 0, t: 0, locked: null, ignore: true };
      return;
    }
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY, t: Date.now(), locked: null, ignore: false };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!touch.current || touch.current.ignore) return;
    const t = e.touches[0];
    const dx = t.clientX - touch.current.x;
    const dy = t.clientY - touch.current.y;
    if (touch.current.locked === null && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      touch.current.locked = Math.abs(dx) > Math.abs(dy) * 1.3 ? "h" : "v";
    }
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current || touch.current.ignore) { touch.current = null; return; }
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.current.x;
    const dy = t.clientY - touch.current.y;
    const dt = Date.now() - touch.current.t;
    const locked = touch.current.locked;
    touch.current = null;
    // Bail on vertical scrolls / slow drags
    if (locked === "v") return;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.2 || dt > 600) return;
    // Velocity-based momentum: fast flick can jump 2 pages
    const velocity = Math.abs(dx) / Math.max(dt, 1); // px/ms
    const jump = velocity > 1.4 ? 2 : 1;
    setPage((p) => p + (dx < 0 ? jump : -jump));
  };

  const tileW = iconSize + 32;
  const gapX = density === "compact" ? 12 : 28;
  const gapY = density === "compact" ? 8 : 20;
  const padding = density === "compact" ? "p-1" : "p-2";
  const radius = iconSize >= 64 ? "rounded-2xl" : "rounded-xl";

  const launch = (app: DesktopApp) => {
    sfx.open();
    if (app.kind === "app") openApp(app.id);
    else window.location.assign(app.url);
  };

  return (
    <div className="absolute inset-0 grid place-items-center pointer-events-none z-[5]">
      <div className="pointer-events-auto flex flex-col items-center gap-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPage((p) => p - 1)}
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
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div
              className="flex"
              style={{
                transform: `translate3d(-${page * 100}%, 0, 0)`,
                transition: reduced
                  ? "none"
                  : "transform 620ms cubic-bezier(0.22, 1, 0.36, 1)",
                willChange: "transform",
              }}
            >
              {PAGES.map((apps, pi) => (
                <div
                  key={pi}
                  className="grid grid-cols-4 shrink-0 w-full"
                  style={{ columnGap: gapX, rowGap: gapY }}
                >
                  {apps.map((app, i) => {
                    const Icon = app.icon;
                    const isFocused = focused?.page === pi && focused?.index === i;
                    return (
                      <button
                        key={app.id}
                        ref={(el) => { tileRefs.current[`${pi}:${i}`] = el; }}
                        onMouseEnter={() => sfx.hover()}
                        onDoubleClick={() => launch(app)}
                        onClick={(e) => {
                          if ((e.detail ?? 1) === 1 && window.matchMedia("(hover: none)").matches) {
                            launch(app);
                          }
                        }}
                        style={{ width: tileW, animationDelay: `${i * 40}ms` }}
                        className={`group flex flex-col items-center gap-1.5 ${padding} rounded-lg hover:bg-primary/10 focus:bg-primary/15 focus:outline-none transition-all duration-300 ${reduced ? "" : "hover:-translate-y-1 animate-fade-in"} ${isFocused ? "ring-2 ring-primary/70 bg-primary/10" : ""}`}
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
            onClick={() => setPage((p) => p + 1)}
            disabled={page === PAGES.length - 1}
            aria-label="Next page"
            className="p-2 rounded-full bg-card/40 border border-border/60 text-foreground/70 hover:text-primary hover:border-primary disabled:opacity-30 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

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
