import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import HeroScene, { HeroIllustration } from "./HeroScene";

const rise = (delay: number) => ({ initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, delay } });

const Hero = () => (
  <section className="relative overflow-hidden bg-background pt-32 sm:pt-40">
    <HeroScene />
    <div className="relative z-10 container mx-auto px-4 text-center">
      <motion.div {...rise(0)} className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 backdrop-blur px-4 py-1.5 font-mono text-xs sm:text-sm text-foreground/90 shadow-[0_4px_20px_-8px_hsl(var(--lightrail)/0.4)]">
        <span className="h-1.5 w-1.5 rounded-full bg-lightrail animate-pulse" />
        The AI infrastructure agent
      </motion.div>

      <motion.h1 {...rise(0.08)} className="mt-6 font-mono font-bold tracking-tighter leading-[1.02] text-[2.4rem] sm:text-6xl lg:text-7xl">
        <span className="hero-fade-text">Run AI faster on</span>
        <br />
        the GPUs you <span className="text-lightrail glow-text">own</span>
      </motion.h1>

      <motion.p {...rise(0.16)} className="mx-auto mt-6 max-w-xl text-base sm:text-lg text-muted-foreground">
        AI-powered monitoring and planning for the GPUs you own or rent.
      </motion.p>

      <motion.div {...rise(0.24)} className="mt-8 flex flex-wrap items-center justify-center gap-5">
        <Link to="/auth?next=/dashboard/gateway-setup">
          <Button size="lg" className="rounded-xl h-12 px-6 bg-lightrail text-lightrail-foreground hover:bg-lightrail/90 shadow-[0_10px_30px_-8px_hsl(var(--lightrail)/0.65)]">
            Get started free
          </Button>
        </Link>
        <Link to="/guide" className="group inline-flex items-center gap-1 text-foreground/90 hover:text-foreground">
          First-run guide <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </motion.div>
      <motion.p {...rise(0.3)} className="mt-4 font-mono text-[11px] text-muted-foreground">1 GPU monitoring free · No card required</motion.p>
    </div>
    <div className="relative z-0 px-2">
      <HeroIllustration />
    </div>
  </section>
);

export default Hero;
