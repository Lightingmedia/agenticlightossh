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
  return { ...DEFAULTS, setPref: () => {}, reset: () => {} };
}

/** Returns null when no PreferencesProvider is mounted yet. */
export function usePreferencesOptional(): Ctx | null {
  return useContext(PrefsCtx);
}
