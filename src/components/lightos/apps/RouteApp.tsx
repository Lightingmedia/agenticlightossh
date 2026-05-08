import type { WindowState } from "../types";

export function RouteApp({ win }: { win: WindowState }) {
  const url = (win.payload?.url as string) || "/";
  return (
    <iframe
      src={url}
      title={win.title}
      className="w-full h-full border-0 bg-background"
    />
  );
}
