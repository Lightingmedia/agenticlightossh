export type AppId =
  | "settings"
  | "files"
  | "terminal"
  | "control"
  | "fleet"
  | "cluster"
  | "browser"
  | "about"
  | "route";

export interface WindowState {
  id: string;
  appId: AppId;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  minimized: boolean;
  maximized: boolean;
  prev?: { x: number; y: number; width: number; height: number };
  /** Arbitrary per-window data (e.g. iframe url for "route" windows). */
  payload?: { url?: string; [k: string]: unknown };
}

/** Metadata record used by WindowManager to configure each application. */
export interface AppMeta {
  title: string;
  width: number;
  height: number;
  singleton: boolean;
}

export const APP_META: Record<AppId, AppMeta> = {
  control: { title: "AI Control Center", width: 920, height: 640, singleton: true },
  fleet:   { title: "Fleet Manager",     width: 880, height: 620, singleton: true },
  cluster: { title: "Cluster Manager",   width: 900, height: 640, singleton: true },
  terminal:{ title: "Terminal",          width: 680, height: 460, singleton: false },
  files:   { title: "Files",             width: 680, height: 480, singleton: true },
  settings:{ title: "Settings",          width: 720, height: 520, singleton: true },
  browser: { title: "Browser",           width: 900, height: 620, singleton: false },
  about:   { title: "About LightOS",     width: 480, height: 360, singleton: true },
  route:   { title: "LightOS",           width: 900, height: 620, singleton: false },
};
