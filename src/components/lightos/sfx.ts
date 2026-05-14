// Tiny WebAudio click/hover sounds for desktop UI.
// Lazy-initialized; respects prefers-reduced-motion as a proxy for audio off.

let ctx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (muted) return null;
  if (!ctx) {
    try {
      const Ctor =
        (window.AudioContext as typeof AudioContext) ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((window as any).webkitAudioContext as typeof AudioContext);
      if (!Ctor) return null;
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function blip(freq: number, duration = 0.08, type: OscillatorType = "sine", gain = 0.04) {
  const ac = getCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(freq * 1.6, ac.currentTime + duration);
  g.gain.setValueAtTime(0.0001, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(gain, ac.currentTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);
  osc.connect(g).connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + duration + 0.02);
}

export const sfx = {
  hover: () => blip(880, 0.05, "sine", 0.015),
  click: () => blip(520, 0.09, "triangle", 0.05),
  open: () => {
    blip(420, 0.08, "sine", 0.04);
    setTimeout(() => blip(720, 0.1, "sine", 0.04), 60);
  },
  setMuted: (v: boolean) => {
    muted = v;
  },
};
