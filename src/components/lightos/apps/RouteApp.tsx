import { useEffect, useRef, useState } from "react";
import { Loader2, AlertTriangle, RotateCw, ExternalLink } from "lucide-react";
import type { WindowState } from "../types";

export function RouteApp({ win }: { win: WindowState }) {
  const url = (win.payload?.url as string) || "/";
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [nonce, setNonce] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setStatus("loading");
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    // If iframe never loads within 15s, treat as error.
    timeoutRef.current = window.setTimeout(() => {
      setStatus((s) => (s === "loading" ? "error" : s));
    }, 15000);
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [url, nonce]);

  const reload = () => {
    setNonce((n) => n + 1);
  };

  return (
    <div className="relative w-full h-full bg-background overflow-hidden">
      <iframe
        ref={iframeRef}
        key={nonce}
        src={url}
        title={win.title}
        onLoad={() => setStatus("ready")}
        onError={() => setStatus("error")}
        className="absolute inset-0 w-full h-full border-0 bg-background"
      />

      {status === "loading" && (
        <div className="absolute inset-0 grid place-items-center bg-background/90 backdrop-blur-sm z-10 font-mono">
          <div className="flex flex-col items-center gap-3 text-foreground/80">
            <Loader2 className="w-7 h-7 text-primary animate-spin" />
            <div className="text-xs uppercase tracking-[0.25em] text-primary">Loading</div>
            <div className="text-[11px] text-muted-foreground truncate max-w-[80%]">{url}</div>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 grid place-items-center bg-background/95 backdrop-blur-sm z-10 font-mono p-6">
          <div className="flex flex-col items-center gap-3 text-center max-w-sm">
            <AlertTriangle className="w-8 h-8 text-destructive" />
            <div className="text-sm font-semibold text-foreground">Could not load this view</div>
            <div className="text-[11px] text-muted-foreground break-all">{url}</div>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={reload}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30"
              >
                <RotateCw className="w-3.5 h-3.5" /> Retry
              </button>
              <button
                onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-foreground/5 hover:bg-foreground/10 text-foreground/80 border border-border/60"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open in tab
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
