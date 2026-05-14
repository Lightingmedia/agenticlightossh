import { useEffect, useState } from "react";
import logo from "@/assets/lightrail-logo-splash.jpg";
import { usePreferences } from "./Preferences";

const BOOT_LINES = [
  "[  OK  ] Started LightRail Photonic Fabric Controller.",
  "[  OK  ] Reached target Photonic Mesh 20×64.",
  "[  OK  ] Mounted /dev/lr0 (1.6 Tb/s lambda link).",
  "[  OK  ] Started LightRail NCE Runtime 1.4.2.",
  "[  OK  ] Reached target Multi-User System.",
  "[  OK  ] Started Aurora LLM Service.",
  "[  OK  ] Started Fleet Manager (mTLS).",
  "[  OK  ] Started lightrail-operator on K3s.",
  "[  OK  ] Reached target Graphical Interface.",
  "Welcome to LightOS 1.0 (Aurora) — based on Ubuntu 24.04 LTS",
];

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const { bootSpeed, logoFadeMs } = usePreferences();
  const [shown, setShown] = useState(0);
  const [phase, setPhase] = useState<"boot" | "logo" | "fade">("boot");

  useEffect(() => {
    if (phase !== "boot") return;
    if (shown >= BOOT_LINES.length) {
      const t = setTimeout(() => setPhase("logo"), 300);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setShown((s) => s + 1), bootSpeed);
    return () => clearTimeout(t);
  }, [shown, phase, bootSpeed]);

  useEffect(() => {
    if (phase !== "logo") return;
    const t1 = setTimeout(() => setPhase("fade"), logoFadeMs);
    const t2 = setTimeout(() => onDone(), logoFadeMs + 500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [phase, logoFadeMs, onDone]);

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-black text-foreground transition-opacity duration-500 ${
        phase === "fade" ? "opacity-0" : "opacity-100"
      }`}
    >
      {phase === "boot" && (
        <div className="h-full w-full p-6 font-mono text-[12px] leading-relaxed text-emerald-400/90 overflow-hidden">
          <div className="text-foreground/60 mb-3">
            LightOS 1.0 (Aurora) · Kernel 6.8.0-lightrail · tty1
          </div>
          {BOOT_LINES.slice(0, shown).map((l, i) => (
            <div key={i} className="whitespace-pre">
              {l}
            </div>
          ))}
          {shown < BOOT_LINES.length && (
            <div className="inline-block w-2 h-4 bg-emerald-400 animate-pulse" />
          )}
        </div>
      )}

      {phase !== "boot" && (
        <div className="h-full w-full grid place-items-center bg-black animate-in fade-in duration-500">
          <div className="flex flex-col items-center gap-8">
            <img
              src={logo}
              alt="LightRail AI — The Light Age of Compute"
              className="max-w-[640px] w-[60vw] h-auto select-none"
              draggable={false}
            />
            <div className="flex flex-col items-center gap-3">
              <div className="flex gap-1.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className="w-2 h-2 rounded-full bg-primary animate-pulse"
                    style={{ animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </div>
              <div className="text-[11px] font-mono text-foreground/50 tracking-widest uppercase">
                Starting LightOS · Ubuntu 24.04 LTS
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
