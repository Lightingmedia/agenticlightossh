import { motion, useReducedMotion } from "framer-motion";
import scene from "@/assets/hero-ai-factory.jpg";

/** Presentation-only isometric illustration. Not connected to live gateway state. */
const Cloud = ({ className = "", delay = 0, still = false }: { className?: string; delay?: number; still?: boolean }) => (
  <motion.svg
    viewBox="0 0 120 70"
    className={`absolute pointer-events-none ${className}`}
    aria-hidden="true"
    animate={still ? undefined : { y: [0, -8, 0], x: [0, 6, 0] }}
    transition={{ duration: 9, delay, repeat: Infinity, ease: "easeInOut" }}
  >
    <path
      d="M30 62h64a20 20 0 0 0 2-40 26 26 0 0 0-49-6A18 18 0 0 0 30 62z"
      className="fill-card/70 stroke-border"
      strokeWidth="1.2"
    />
    <path d="M30 62h64" className="stroke-lightrail/60" strokeWidth="1.5" />
  </motion.svg>
);

export default function HeroScene() {
  const reduced = !!useReducedMotion();
  return (
    <>
      {/* sky: glow, fog and drifting clouds */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute left-1/2 top-[-10%] h-[620px] w-[980px] -translate-x-1/2 rounded-full bg-lightrail/[0.07] blur-[120px]" />
        <motion.div className="absolute left-[8%] top-[18%] h-48 w-[520px] rounded-full bg-foreground/[0.035] blur-3xl"
          animate={reduced ? undefined : { x: [0, 60, 0] }} transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div className="absolute right-[4%] top-[30%] h-56 w-[560px] rounded-full bg-foreground/[0.03] blur-3xl"
          animate={reduced ? undefined : { x: [0, -70, 0] }} transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }} />
        <div className="hero-sky-dots absolute inset-0" />
        <Cloud className="w-24 -left-6 top-28 opacity-60" still={reduced} />
        <Cloud className="w-20 right-0 top-24 opacity-50 hidden sm:block" delay={2} still={reduced} />
        <Cloud className="w-16 left-[56%] top-[148px] opacity-40 hidden lg:block" delay={4} still={reduced} />
        <Cloud className="w-20 left-[20%] top-[46%] opacity-35 hidden lg:block" delay={1} still={reduced} />
      </div>
    </>
  );
}

export function HeroIllustration() {
  const reduced = !!useReducedMotion();
  return (
    <div className="relative mx-auto w-full max-w-[1360px] -mt-10 sm:-mt-24 lg:-mt-40 pointer-events-none select-none" aria-hidden="true">
      <motion.img
        src={scene}
        alt=""
        width={1920}
        height={1088}
        className="hero-scene-mask w-full h-auto"
        initial={{ opacity: 0, y: 30 }}
        animate={reduced ? { opacity: 1, y: 0 } : { opacity: 1, y: [0, -6, 0] }}
        transition={reduced ? { duration: 0.6 } : { opacity: { duration: 1 }, y: { duration: 8, repeat: Infinity, ease: "easeInOut" } }}
      />
      {/* centre beam pulse */}
      <motion.div
        className="absolute left-1/2 top-[26%] h-[30%] w-[16%] -translate-x-1/2 rounded-full bg-lightrail/20 blur-3xl mix-blend-screen"
        animate={reduced ? undefined : { opacity: [0.35, 0.8, 0.35] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
