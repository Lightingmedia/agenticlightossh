import { createContext, useCallback, useContext, useState, ReactNode } from "react";
import type { AppId, WindowState } from "./types";

interface OpenRouteOpts {
  width?: number;
  height?: number;
}

interface Ctx {
  windows: WindowState[];
  openApp: (appId: AppId) => void;
  openRoute: (url: string, title?: string, opts?: OpenRouteOpts) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  toggleMaximize: (id: string) => void;
  updateWindow: (id: string, patch: Partial<WindowState>) => void;
  activeId: string | null;
}

const WindowCtx = createContext<Ctx | null>(null);

const APP_META: Record<AppId, { title: string; w: number; h: number }> = {
  settings: { title: "Settings", w: 880, h: 580 },
  files: { title: "Files", w: 820, h: 540 },
  terminal: { title: "Terminal — root@lightos-main", w: 820, h: 480 },
  control: { title: "AI Control Center", w: 1180, h: 720 },
  fleet:   { title: "Fleet Manager", w: 920, h: 640 },
  cluster: { title: "Cluster Manager", w: 960, h: 660 },
  browser: { title: "LightRail Browser", w: 1080, h: 680 },
  about: { title: "About LightOS", w: 520, h: 420 },
  agentic: { title: "Agentic AI", w: 960, h: 660 },
  mlops: { title: "MLOps", w: 960, h: 660 },
  datacenter: { title: "Datacenter Operations", w: 960, h: 660 },
  tokenfactory: { title: "Token Factory", w: 880, h: 640 },
  inference: { title: "Inference Endpoints", w: 960, h: 640 },
  cloud: { title: "Compute Cloud", w: 960, h: 640 },
  route: { title: "Application", w: 1180, h: 720 },
};

let zCounter = 10;

export function WindowManagerProvider({ children }: { children: ReactNode }) {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const focusWindow = useCallback((id: string) => {
    zCounter += 1;
    setWindows((ws) =>
      ws.map((w) => (w.id === id ? { ...w, zIndex: zCounter, minimized: false } : w)),
    );
    setActiveId(id);
  }, []);

  const openApp = useCallback((appId: AppId) => {
    setWindows((ws) => {
      const existing = ws.find((w) => w.appId === appId);
      if (existing && appId !== "route") {
        zCounter += 1;
        setActiveId(existing.id);
        return ws.map((w) =>
          w.id === existing.id ? { ...w, zIndex: zCounter, minimized: false } : w,
        );
      }
      const meta = APP_META[appId];
      const id = `${appId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      zCounter += 1;
      const offset = ws.length * 28;
      const newWin: WindowState = {
        id,
        appId,
        title: meta.title,
        x: 120 + offset,
        y: 80 + offset,
        width: meta.w,
        height: meta.h,
        zIndex: zCounter,
        minimized: false,
        maximized: false,
      };
      setActiveId(id);
      return [...ws, newWin];
    });
  }, []);

  const openRoute = useCallback(
    (url: string, title?: string, opts?: OpenRouteOpts) => {
      setWindows((ws) => {
        const meta = APP_META.route;
        const id = `route-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        zCounter += 1;
        const offset = ws.length * 28;
        const newWin: WindowState = {
          id,
          appId: "route",
          title: title || url,
          x: 100 + offset,
          y: 70 + offset,
          width: opts?.width ?? meta.w,
          height: opts?.height ?? meta.h,
          zIndex: zCounter,
          minimized: false,
          maximized: false,
          payload: { url },
        };
        setActiveId(id);
        return [...ws, newWin];
      });
    },
    [],
  );

  const closeWindow = useCallback((id: string) => {
    setWindows((ws) => ws.filter((w) => w.id !== id));
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setWindows((ws) => ws.map((w) => (w.id === id ? { ...w, minimized: true } : w)));
  }, []);

  const toggleMaximize = useCallback((id: string) => {
    setWindows((ws) =>
      ws.map((w) => {
        if (w.id !== id) return w;
        if (w.maximized && w.prev) {
          return { ...w, maximized: false, ...w.prev, prev: undefined };
        }
        return {
          ...w,
          maximized: true,
          prev: { x: w.x, y: w.y, width: w.width, height: w.height },
        };
      }),
    );
  }, []);

  const updateWindow = useCallback((id: string, patch: Partial<WindowState>) => {
    setWindows((ws) => ws.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  }, []);

  return (
    <WindowCtx.Provider
      value={{
        windows,
        openApp,
        openRoute,
        closeWindow,
        focusWindow,
        minimizeWindow,
        toggleMaximize,
        updateWindow,
        activeId,
      }}
    >
      {children}
    </WindowCtx.Provider>
  );
}

export function useWindowManager() {
  const ctx = useContext(WindowCtx);
  if (!ctx) throw new Error("useWindowManager must be used inside WindowManagerProvider");
  return ctx;
}
