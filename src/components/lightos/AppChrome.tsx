import { ReactNode, useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Circle } from "lucide-react";

interface MenuItem {
  label: string;
  shortcut?: string;
  onClick?: () => void;
  separator?: boolean;
  disabled?: boolean;
}

export interface AppMenu {
  label: string;
  items: MenuItem[];
}

interface AppChromeProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  menus?: AppMenu[];
  toolbar?: ReactNode;
  status?: ReactNode;
  /** When true, the body itself manages padding/scroll (default true). */
  flush?: boolean;
  children: ReactNode;
}

const DEFAULT_MENUS: AppMenu[] = [
  {
    label: "File",
    items: [
      { label: "New", shortcut: "⌘N", disabled: true },
      { label: "Open…", shortcut: "⌘O", disabled: true },
      { separator: true, label: "" },
      { label: "Close Window", shortcut: "⌘W", disabled: true },
    ],
  },
  {
    label: "Edit",
    items: [
      { label: "Undo", shortcut: "⌘Z", disabled: true },
      { label: "Redo", shortcut: "⇧⌘Z", disabled: true },
      { separator: true, label: "" },
      { label: "Cut", shortcut: "⌘X", disabled: true },
      { label: "Copy", shortcut: "⌘C", disabled: true },
      { label: "Paste", shortcut: "⌘V", disabled: true },
    ],
  },
  {
    label: "View",
    items: [
      { label: "Reload", shortcut: "⌘R", disabled: true },
      { label: "Toggle Sidebar", disabled: true },
    ],
  },
  {
    label: "Help",
    items: [{ label: "LightOS Documentation", disabled: true }],
  },
];

export function AppChrome({
  icon: Icon,
  title,
  subtitle,
  menus = DEFAULT_MENUS,
  toolbar,
  status,
  flush = true,
  children,
}: AppChromeProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  return (
    <div className="flex flex-col h-full bg-background text-foreground font-mono">
      {/* Menubar */}
      <div
        ref={ref}
        className="flex items-center h-7 shrink-0 border-b border-border/50 bg-card/60 backdrop-blur-sm px-2 gap-0.5 select-none"
      >
        <div className="flex items-center gap-1.5 pr-2 mr-1 border-r border-border/40">
          <Icon className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] font-bold text-foreground/90">{title}</span>
        </div>
        {menus.map((m) => (
          <div key={m.label} className="relative">
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                setOpenMenu(openMenu === m.label ? null : m.label);
              }}
              onMouseEnter={() => openMenu && setOpenMenu(m.label)}
              className={`px-2 h-6 rounded text-[11px] transition-colors ${
                openMenu === m.label
                  ? "bg-primary/20 text-primary"
                  : "text-foreground/70 hover:bg-foreground/10"
              }`}
            >
              {m.label}
            </button>
            {openMenu === m.label && (
              <div className="absolute left-0 top-full mt-0.5 min-w-[200px] z-50 rounded-md border border-border/60 bg-popover/95 backdrop-blur-md shadow-2xl py-1">
                {m.items.map((it, i) =>
                  it.separator ? (
                    <div key={i} className="my-1 border-t border-border/40" />
                  ) : (
                    <button
                      key={i}
                      disabled={it.disabled}
                      onClick={() => {
                        it.onClick?.();
                        setOpenMenu(null);
                      }}
                      className="w-full flex items-center justify-between px-3 py-1 text-[11px] text-foreground/80 hover:bg-primary/20 hover:text-primary disabled:text-foreground/30 disabled:hover:bg-transparent disabled:hover:text-foreground/30"
                    >
                      <span>{it.label}</span>
                      {it.shortcut && (
                        <span className="text-[10px] text-foreground/40 ml-6">{it.shortcut}</span>
                      )}
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
        ))}
        {subtitle && (
          <span className="ml-auto text-[10px] text-foreground/40 truncate pl-2">{subtitle}</span>
        )}
      </div>

      {/* Toolbar (optional) */}
      {toolbar && (
        <div className="flex items-center gap-1 h-9 shrink-0 px-2 border-b border-border/40 bg-card/30">
          {toolbar}
        </div>
      )}

      {/* Body */}
      <div className={`flex-1 min-h-0 overflow-hidden ${flush ? "" : "p-3 overflow-auto"}`}>
        {children}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between h-5 shrink-0 px-2 border-t border-border/40 bg-card/40 text-[10px] text-foreground/50">
        <div className="flex items-center gap-1.5 truncate">
          <Circle className="w-1.5 h-1.5 text-emerald-400" style={{ fill: "currentColor" }} />
          <span>Ready</span>
          {status && <span className="text-foreground/30">·</span>}
          {status}
        </div>
        <div className="flex items-center gap-2 text-foreground/30">
          <span>UTF-8</span>
          <span>·</span>
          <span>LightOS</span>
        </div>
      </div>
    </div>
  );
}
