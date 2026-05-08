export type AppId =
  | "settings"
  | "files"
  | "terminal"
  | "control"
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
