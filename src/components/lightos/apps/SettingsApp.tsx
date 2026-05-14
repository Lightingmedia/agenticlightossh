import { useEffect, useRef, useState } from "react";
import { Cpu, MemoryStick, HardDrive, Monitor, RotateCcw, Play, Pause, SkipForward, RefreshCw } from "lucide-react";
import { usePreferences } from "../Preferences";

const PREVIEW_LINES = [
  "[  OK  ] Started LightRail Photonic Fabric Controller.",
  "[  OK  ] Mounted /dev/lr0 (1.6 Tb/s lambda link).",
  "[  OK  ] Started Aurora LLM Service.",
  "[  OK  ] Reached target Graphical Interface.",
];

function BootPreview() {
  const { bootSpeed, logoFadeMs } = usePreferences();
  const [runId, setRunId] = useState(0);
  const [shown, setShown] = useState(0);
  const [phase, setPhase] = useState<"boot" | "logo" | "done">("boot");
  const timers = useRef<number[]>([]);

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setShown(0);
    setPhase("boot");
  }, [runId]);

  useEffect(() => {
    if (phase !== "boot") return;
    if (shown >= PREVIEW_LINES.length) {
      const t = window.setTimeout(() => setPhase("logo"), 200);
      timers.current.push(t);
      return () => clearTimeout(t);
    }
    const t = window.setTimeout(() => setShown((s) => s + 1), bootSpeed);
    timers.current.push(t);
    return () => clearTimeout(t);
  }, [shown, phase, bootSpeed]);

  useEffect(() => {
    if (phase !== "logo") return;
    const t = window.setTimeout(() => setPhase("done"), logoFadeMs);
    timers.current.push(t);
    return () => clearTimeout(t);
  }, [phase, logoFadeMs]);

  return (
    <div className="mt-5 rounded-lg border border-border/60 bg-black overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 bg-card/40">
        <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
          Live preview
        </span>
        <button
          onClick={() => setRunId((n) => n + 1)}
          className="inline-flex items-center gap-1 text-[11px] font-mono text-primary hover:text-primary/80"
        >
          <Play className="w-3 h-3" /> Replay
        </button>
      </div>
      <div className="relative h-44">
        {/* Boot text */}
        <div
          className={`absolute inset-0 p-3 font-mono text-[11px] leading-relaxed text-emerald-400/90 transition-opacity duration-300 ${
            phase === "boot" ? "opacity-100" : "opacity-0"
          }`}
        >
          {PREVIEW_LINES.slice(0, shown).map((l, i) => (
            <div key={i}>{l}</div>
          ))}
          {phase === "boot" && shown < PREVIEW_LINES.length && (
            <span className="inline-block w-1.5 h-3 bg-emerald-400 animate-pulse align-middle" />
          )}
        </div>
        {/* Logo phase */}
        <div
          className={`absolute inset-0 grid place-items-center transition-opacity ${
            phase === "logo" ? "opacity-100" : "opacity-0"
          }`}
          style={{ transitionDuration: `${Math.min(logoFadeMs, 800)}ms` }}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="text-primary font-mono text-sm font-bold tracking-wider">
              LIGHTRAIL · AURORA
            </div>
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"
                  style={{ animationDelay: `${i * 120}ms` }}
                />
              ))}
            </div>
          </div>
        </div>
        {/* Done */}
        {phase === "done" && (
          <div className="absolute inset-0 grid place-items-center text-[11px] font-mono text-muted-foreground">
            ✓ Boot complete · click Replay
          </div>
        )}
      </div>
    </div>
  );
}

type Tab = "system" | "desktop" | "boot";

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border/30 last:border-0">
      <div className="min-w-0">
        <div className="text-sm text-foreground/90">{label}</div>
        {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-10 h-5 rounded-full transition-colors ${value ? "bg-primary" : "bg-foreground/20"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-background transition-transform ${value ? "translate-x-5" : ""}`}
      />
    </button>
  );
}

function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  unit = "",
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-44 accent-primary"
      />
      <span className="text-xs font-mono text-foreground/70 w-16 text-right tabular-nums">
        {value}
        {unit}
      </span>
    </div>
  );
}

export function SettingsApp() {
  const [tab, setTab] = useState<Tab>("desktop");
  const prefs = usePreferences();

  const tabs: { id: Tab; label: string }[] = [
    { id: "system", label: "System" },
    { id: "desktop", label: "Desktop" },
    { id: "boot", label: "Boot" },
  ];

  const hw = [
    { icon: Cpu, label: "Processor", value: "LightRail Fabric Controller Gen 2" },
    { icon: MemoryStick, label: "Memory", value: "1.5 TB HBM3e" },
    { icon: Monitor, label: "Graphics", value: "LightRail AI Labs NCE-700" },
    { icon: HardDrive, label: "Disk Capacity", value: "128 TB NVMe-oF" },
  ];

  return (
    <div className="flex h-full bg-background text-foreground">
      <aside className="w-52 bg-card/40 border-r border-border/40 p-3 space-y-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`w-full text-left px-3 py-2 rounded text-sm font-mono ${
              tab === t.id
                ? "bg-primary text-primary-foreground"
                : "text-foreground/80 hover:bg-foreground/5"
            }`}
          >
            {t.label}
          </button>
        ))}
      </aside>

      <main className="flex-1 p-8 overflow-auto">
        {tab === "system" && (
          <>
            <div className="flex items-center gap-5 mb-8">
              <div className="w-20 h-20 rounded-full bg-primary/30 border border-primary grid place-items-center text-2xl font-mono font-bold text-primary">
                LR
              </div>
              <div>
                <h1 className="text-2xl font-mono font-bold">LightOS AI Appliance</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Ubuntu 24.04 LTS Base · Wayland · Kernel 6.8-custom
                </p>
              </div>
            </div>
            <h2 className="text-sm font-mono text-muted-foreground mb-3 uppercase tracking-wider">
              Hardware
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {hw.map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-lg border border-border/60 bg-card/60 p-4">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase text-muted-foreground">
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </div>
                  <div className="mt-2 font-mono text-foreground">{value}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "desktop" && (
          <div className="max-w-xl">
            <h1 className="text-xl font-mono font-bold mb-1">Desktop</h1>
            <p className="text-sm text-muted-foreground mb-5">
              Customize how desktop icons look and how tightly they pack on the grid.
            </p>
            <div className="rounded-lg border border-border/60 bg-card/40 px-4">
              <Row label="Icon size" hint="Tile size for desktop icons (40–96 px)">
                <Slider
                  value={prefs.iconSize}
                  min={40}
                  max={96}
                  step={4}
                  unit="px"
                  onChange={(v) => prefs.setPref("iconSize", v)}
                />
              </Row>
              <Row label="Grid spacing" hint="Compact stacks tightly; comfy adds breathing room">
                <div className="flex rounded-md border border-border/60 overflow-hidden text-xs font-mono">
                  {(["compact", "comfy"] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => prefs.setPref("density", d)}
                      className={`px-3 py-1.5 ${
                        prefs.density === d
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground/70 hover:bg-foreground/5"
                      }`}
                    >
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </button>
                  ))}
                </div>
              </Row>
            </div>
            <button
              onClick={prefs.reset}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-mono text-foreground/60 hover:text-primary transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Reset all preferences
            </button>
          </div>
        )}

        {tab === "boot" && (
          <div className="max-w-xl">
            <h1 className="text-xl font-mono font-bold mb-1">Boot</h1>
            <p className="text-sm text-muted-foreground mb-5">
              Control the LightOS startup sequence shown when the OS loads.
            </p>
            <div className="rounded-lg border border-border/60 bg-card/40 px-4">
              <Row
                label="Show splash screen"
                hint="Display the boot console and LightRail logo on startup"
              >
                <Toggle
                  value={prefs.splashEnabled}
                  onChange={(v) => prefs.setPref("splashEnabled", v)}
                />
              </Row>
              <Row label="Boot text speed" hint="Delay between init lines (lower = faster)">
                <Slider
                  value={prefs.bootSpeed}
                  min={40}
                  max={400}
                  step={20}
                  unit="ms"
                  onChange={(v) => prefs.setPref("bootSpeed", v)}
                />
              </Row>
              <Row label="Logo fade duration" hint="How long the logo lingers before fading out">
                <Slider
                  value={prefs.logoFadeMs}
                  min={300}
                  max={3000}
                  step={100}
                  unit="ms"
                  onChange={(v) => prefs.setPref("logoFadeMs", v)}
                />
              </Row>
            </div>
            <BootPreview />
            <p className="mt-3 text-[11px] font-mono text-muted-foreground">
              Live preview reflects current settings. Full splash plays on next reload of <span className="text-primary">/os</span>.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
