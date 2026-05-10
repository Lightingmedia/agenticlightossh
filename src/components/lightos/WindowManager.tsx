import { createContext, useContext, useState, useRef, useCallback, ReactNode } from "react";
import type { AppId, WindowState } from "./types";
import { APP_META } from "./types";

// ─── Context ──────────────────────────────────────────────────────────────────

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
}

const WindowManagerCtx = createContext<Ctx | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function WindowManagerProvider({ children }: { children: ReactNode }) {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const zCounter = useRef(100);
  const offsetCounter = useRef(0);

  const nextZ = () => ++zCounter.current;

  const cascadePos = useCallback(() => {
    const BASE_X = 80;
    const BASE_Y = 48;
    const OFFSET = 28;
    const idx = offsetCounter.current++ % 10;
    return { x: BASE_X + idx * OFFSET, y: BASE_Y + idx * OFFSET };
  }, []);

  const focusWindow = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, zIndex: nextZ(), minimized: false } : w))
    );
  }, []);

  const openApp = useCallback((appId: AppId) => {
    const meta = APP_META[appId];
    if (!meta) return;

    if (meta.singleton) {
      setWindows((prev) => {
        const existing = prev.find((w) => w.appId === appId);
        if (existing) {
          return prev.map((w) =>
            w.id === existing.id ? { ...w, zIndex: nextZ(), minimized: false } : w
          );
        }
        const { x, y } = cascadePos();
        const newWin: WindowState = {
          id: `${appId}-${Date.now()}`,
          appId,
          title: meta.title,
          x,
          y,
          width: meta.width,
          height: meta.height,
          zIndex: nextZ(),
          minimized: false,
          maximized: false,
        };
        return [...prev, newWin];
      });
    } else {
      const { x, y } = cascadePos();
      const newWin: WindowState = {
        id: `${appId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        appId,
        title: meta.title,
        x,
        y,
        width: meta.width,
        height: meta.height,
        zIndex: nextZ(),
        minimized: false,
        maximized: false,
      };
      setWindows((prev) => [...prev, newWin]);
    }
  }, [cascadePos]);

  const openRoute = useCallback((url: string, title = "LightOS", opts: OpenRouteOpts = {}) => {
    const { x, y } = cascadePos();
    const newWin: WindowState = {
      id: `route-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      appId: "route",
      title,
      x,
      y,
      width: opts.width ?? 900,
      height: opts.height ?? 620,
      zIndex: nextZ(),
      minimized: false,
      maximized: false,
      payload: { url },
    };
    setWindows((prev) => [...prev, newWin]);
  }, [cascadePos]);

  const closeWindow = useCallback((id: string) => {
    setWindows((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, minimized: true } : w))
    );
  }, []);

  const toggleMaximize = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        if (w.maximized) {
          return {
            ...w,
            maximized: false,
            ...(w.prev ?? {}),
            prev: undefined,
          };
        }
        return {
          ...w,
          maximized: true,
          prev: { x: w.x, y: w.y, width: w.width, height: w.height },
          x: 0,
          y: 40,
          width: window.innerWidth,
          height: window.innerHeight - 40,
          zIndex: nextZ(),
        };
      })
    );
  }, []);

  const updateWindow = useCallback((id: string, patch: Partial<WindowState>) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  }, []);

  return (
    <WindowManagerCtx.Provider
      value={{ windows, openApp, openRoute, closeWindow, focusWindow, minimizeWindow, toggleMaximize, updateWindow }}
    >
      {children}
    </WindowManagerCtx.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWindowManager(): Ctx {
  const ctx = useContext(WindowManagerCtx);
  if (!ctx) throw new Error("useWindowManager must be used inside WindowManagerProvider");
  return ctx;
}
