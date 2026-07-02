import { Cpu, MemoryStick, HardDrive, Monitor } from "lucide-react";

export function SettingsApp() {
  const tabs = [
    { label: "Wi-Fi", active: true },
    { label: "Bluetooth" },
    { label: "Displays" },
    { label: "Power" },
    { label: "Users" },
    { label: "Privacy & Security" },
    { label: "About" },
  ];

  const hw = [
    { icon: Cpu, label: "Processor", value: "LightRail RISC-V Fabric Controller (RV64GC)" },
    { icon: MemoryStick, label: "Memory", value: "1.5 TB HBM3e" },
    { icon: Monitor, label: "AI Accelerator", value: "LightRail RISC-V NCE Fabric" },
    { icon: HardDrive, label: "Disk Capacity", value: "128 TB NVMe-oF" },
  ];

  return (
    <div className="flex h-full bg-background text-foreground">
      <aside className="w-56 bg-card/40 border-r border-border/40 p-3 space-y-1">
        {tabs.map((t) => (
          <button
            key={t.label}
            className={`w-full text-left px-3 py-2 rounded text-sm font-mono ${
              t.active
                ? "bg-primary text-primary-foreground"
                : "text-foreground/80 hover:bg-foreground/5"
            }`}
          >
            {t.label}
          </button>
        ))}
      </aside>
      <main className="flex-1 p-8 overflow-auto">
        <div className="flex items-center gap-5 mb-8">
          <div className="w-20 h-20 rounded-full bg-primary/30 border border-primary grid place-items-center text-2xl font-mono font-bold text-primary">
            LR
          </div>
          <div>
            <h1 className="text-2xl font-mono font-bold">LightOS AI Appliance</h1>
            <p className="text-sm text-muted-foreground mt-1">
              RISC-V64 Appliance Image · Wayland · Kernel 6.8-lightrail-rv64
            </p>
          </div>
        </div>
        <h2 className="text-sm font-mono text-muted-foreground mb-3 uppercase tracking-wider">
          Hardware
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {hw.map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="rounded-lg border border-border/60 bg-card/60 p-4"
            >
              <div className="flex items-center gap-2 text-xs font-mono uppercase text-muted-foreground">
                <Icon className="w-3.5 h-3.5" /> {label}
              </div>
              <div className="mt-2 font-mono text-foreground">{value}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
