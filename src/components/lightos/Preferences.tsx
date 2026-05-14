import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type BgIntensity = "off" | "subtle" | "normal" | "intense";

export interface LightOSPrefs {
  iconSize: number; // px (40-96)
  density: "compact" | "comfy";
  splashEnabled: boolean;
  bootSpeed: number; // ms per line (40-400)
  logoFadeMs: number; // ms (300-3000)
  bgIntensity: BgIntensity;
  reducedMotion: "auto" | "on" | "off"; // auto = follow system
}

const DEFAULTS: LightOSPrefs = {
  iconSize: 56,
  density: "comfy",
  splashEnabled: true,
  bootSpeed: 180,
  logoFadeMs: 1600,
  bgIntensity: "normal",
  reducedMotion: "auto",
};

const KEY = "lightos:prefs:v1";

interface Ctx extends LightOSPrefs {
  setPref: <K extends keyof LightOSPrefs>(key: K, value: LightOSPrefs[K]) => void;
  reset: () => void;
  ready: boolean;
}

const PrefsCtx = createContext<Ctx | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<LightOSPrefs>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setPrefs((p) => ({ ...p, ...JSON.parse(raw) }));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
  }, [prefs, ready]);

  const setPref: Ctx["setPref"] = (key, value) =>
    setPrefs((p) => ({ ...p, [key]: value }));
  const reset = () => setPrefs(DEFAULTS);

  return (
    <PrefsCtx.Provider value={{ ...prefs, setPref, reset, ready }}>
      {children}
    </PrefsCtx.Provider>
  );
}

export function usePreferences(): Ctx {
  const ctx = useContext(PrefsCtx);
  if (ctx) return ctx;
  return { ...DEFAULTS, setPref: () => {}, reset: () => {}, ready: false };
}

/** Returns null when no PreferencesProvider is mounted yet. */
export function usePreferencesOptional(): Ctx | null {
  return useContext(PrefsCtx);
}

/** Resolves the reducedMotion preference, honoring the system setting on "auto". */
export function useReducedMotion(): boolean {
  const { reducedMotion } = usePreferences();
  const [systemPref, setSystemPref] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setSystemPref(m.matches);
    update();
    m.addEventListener?.("change", update);
    return () => m.removeEventListener?.("change", update);
  }, []);
  if (reducedMotion === "on") return true;
  if (reducedMotion === "off") return false;
  return systemPref;
}

