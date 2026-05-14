import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export interface LightOSPrefs {
  iconSize: number; // px (40-96)
  density: "compact" | "comfy";
  splashEnabled: boolean;
  bootSpeed: number; // ms per line (40-400)
  logoFadeMs: number; // ms (300-3000)
}

const DEFAULTS: LightOSPrefs = {
  iconSize: 56,
  density: "comfy",
  splashEnabled: true,
  bootSpeed: 180,
  logoFadeMs: 1600,
};

const KEY = "lightos:prefs:v1";

interface Ctx extends LightOSPrefs {
  setPref: <K extends keyof LightOSPrefs>(key: K, value: LightOSPrefs[K]) => void;
  reset: () => void;
}

const PrefsCtx = createContext<Ctx | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<LightOSPrefs>(() => {
    if (typeof window === "undefined") return DEFAULTS;
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return DEFAULTS;
      return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch {
      return DEFAULTS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
  }, [prefs]);

  const setPref: Ctx["setPref"] = (key, value) =>
    setPrefs((p) => ({ ...p, [key]: value }));
  const reset = () => setPrefs(DEFAULTS);

  return (
    <PrefsCtx.Provider value={{ ...prefs, setPref, reset }}>{children}</PrefsCtx.Provider>
  );
}

export function usePreferences(): Ctx {
  const ctx = useContext(PrefsCtx);
  if (ctx) return ctx;
  // Safe fallback so consumers (e.g. SplashScreen during HMR) never crash.
  return {
    ...DEFAULTS,
    setPref: () => {},
    reset: () => {},
  };
}
