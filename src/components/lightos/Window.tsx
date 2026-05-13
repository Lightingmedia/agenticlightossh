import { motion } from "framer-motion";
import { Minus, Square, X, Copy } from "lucide-react";
import { ReactNode, useRef } from "react";
import { useWindowManager } from "./WindowManager";
import type { WindowState } from "./types";

interface Props {
  win: WindowState;
  children: ReactNode;
}

const TOP_PANEL = 32;
const DOCK = 64;
const TASKBAR = 40;

export function Window({ win, children }: Props) {
  const { focusWindow, closeWindow, minimizeWindow, toggleMaximize, updateWindow } =
    useWindowManager();
  const dragOrigin = useRef({ x: 0, y: 0 });

  if (win.minimized) return null;

  const maxBounds = {
    x: DOCK,
    y: TOP_PANEL,
    width: typeof window !== "undefined" ? window.innerWidth - DOCK : 1280,
    height: typeof window !== "undefined" ? window.innerHeight - TOP_PANEL - TASKBAR : 720,
  };

  const style = win.maximized
    ? { x: maxBounds.x, y: maxBounds.y, width: maxBounds.width, height: maxBounds.height }
    : { x: win.x, y: win.y, width: win.width, height: win.height };

  return (
    <motion.div
      drag={!win.maximized}
      dragMomentum={false}
      dragListener={false}
      onMouseDown={() => focusWindow(win.id)}
      animate={style}
      transition={{ type: "spring", stiffness: 500, damping: 40, mass: 0.6 }}
      style={{
        position: "absolute",
        zIndex: win.zIndex,
      }}
      className="rounded-lg overflow-hidden border border-border/60 bg-card/95 backdrop-blur-md shadow-2xl flex flex-col"
    >
      {/* Title bar */}
      <motion.div
        onPointerDown={(e) => {
          if (win.maximized) return;
          // Don't start drag when clicking interactive controls (buttons, etc.)
          if ((e.target as HTMLElement).closest("button")) return;
          dragOrigin.current = { x: e.clientX - win.x, y: e.clientY - win.y };
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (win.maximized) return;
          if (!(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) return;
          updateWindow(win.id, {
            x: Math.max(0, e.clientX - dragOrigin.current.x),
            y: Math.max(TOP_PANEL, e.clientY - dragOrigin.current.y),
          });
        }}
        onPointerUp={(e) => {
          const el = e.currentTarget as HTMLElement;
          if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
        }}
        onDoubleClick={() => toggleMaximize(win.id)}
        className="flex items-center justify-between px-3 h-9 bg-muted/40 border-b border-border/60 cursor-grab active:cursor-grabbing select-none"
      >
        <div className="text-xs font-mono text-foreground/90 truncate">{win.title}</div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              minimizeWindow(win.id);
            }}
            className="w-6 h-6 grid place-items-center rounded hover:bg-foreground/10 text-muted-foreground"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleMaximize(win.id);
            }}
            className="w-6 h-6 grid place-items-center rounded hover:bg-foreground/10 text-muted-foreground"
          >
            {win.maximized ? <Copy className="w-3 h-3" /> : <Square className="w-3 h-3" />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeWindow(win.id);
            }}
            className="w-6 h-6 grid place-items-center rounded hover:bg-destructive/80 hover:text-destructive-foreground text-muted-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden bg-background">{children}</div>

      {/* Resize handle (south-east) */}
      {!win.maximized && (
        <div
          onPointerDown={(e) => {
            e.stopPropagation();
            const startX = e.clientX;
            const startY = e.clientY;
            const startW = win.width;
            const startH = win.height;
            const target = e.currentTarget as HTMLElement;
            target.setPointerCapture(e.pointerId);
            const move = (ev: PointerEvent) => {
              updateWindow(win.id, {
                width: Math.max(320, startW + (ev.clientX - startX)),
                height: Math.max(220, startH + (ev.clientY - startY)),
              });
            };
            const up = (ev: PointerEvent) => {
              target.releasePointerCapture(ev.pointerId);
              window.removeEventListener("pointermove", move);
              window.removeEventListener("pointerup", up);
            };
            window.addEventListener("pointermove", move);
            window.addEventListener("pointerup", up);
          }}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
          style={{
            background:
              "linear-gradient(135deg, transparent 50%, hsl(var(--primary) / 0.5) 50%)",
          }}
        />
      )}
    </motion.div>
  );
}
