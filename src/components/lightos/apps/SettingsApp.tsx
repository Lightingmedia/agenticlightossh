import { useState } from "react";
import { Cpu, MemoryStick, HardDrive, Monitor, RotateCcw } from "lucide-react";
import { usePreferences } from "../Preferences";

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
            <p className="mt-4 text-[11px] font-mono text-muted-foreground">
              Changes apply on next boot. Reload <span className="text-primary">/os</span> to preview.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
