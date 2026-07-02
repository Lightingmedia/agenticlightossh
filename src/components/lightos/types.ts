export type AppId =
  | "settings"
  | "files"
  | "terminal"
  | "control"
  | "fleet"
  | "cluster"
  | "browser"
  | "about"
  | "agentic"
  | "mlops"
  | "datacenter"
  | "tokenfactory"
  | "inference"
  | "cloud"
  | "photonic"
  | "nce"
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
