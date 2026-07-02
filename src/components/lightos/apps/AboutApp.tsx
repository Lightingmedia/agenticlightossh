export function AboutApp() {
  return (
    <div className="p-8 h-full overflow-auto bg-background text-foreground">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full bg-primary/30 border border-primary grid place-items-center font-mono font-bold text-primary text-xl">
          LR
        </div>
        <div>
          <h1 className="text-xl font-mono font-bold">LightOS 1.0 — Aurora RISC-V64</h1>
          <p className="text-xs text-muted-foreground font-mono">
            RISC-V AI Fabric Operating System · LightRail AI Labs
          </p>
        </div>
      </div>
      <div className="space-y-2 text-sm font-mono text-foreground/80">
        <p>
          <span className="text-muted-foreground">Base:</span> LightOS RISC-V64 appliance image
        </p>
        <p>
          <span className="text-muted-foreground">Kernel:</span> 6.8.0-lightrail-rv64 (PREEMPT_DYNAMIC)
        </p>
        <p>
          <span className="text-muted-foreground">Compositor:</span> KWin / Wayland
        </p>
        <p>
          <span className="text-muted-foreground">Runtime:</span> LightRail RISC-V NCE Runtime 1.4.2
        </p>
        <p>
          <span className="text-muted-foreground">Fabric:</span> photonic-mesh-20x64
        </p>
        <p className="pt-4 text-xs text-muted-foreground">
          © 2026 LightRail AI Labs. All rights reserved.
        </p>
      </div>
    </div>
  );
}
