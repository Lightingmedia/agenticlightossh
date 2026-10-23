import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const script = [
  { p: "you", t: "How much GPU headroom do I have for a 7B fine-tune?" },
  { p: "agent", t: "Reading capacity from your connected gateway…" },
  { p: "sys", t: "gateway ✓  1 GPU visible · measured readings received" },
  { p: "agent", t: "Drafting a placement plan with memory and power constraints." },
  { p: "sys", t: "plan ready → awaiting your approval" },
];

const tone: Record<string, string> = {
  you: "text-foreground",
  agent: "text-primary",
  sys: "text-muted-foreground",
};

const Hero = () => {
  const [shown, setShown] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setShown((n) => (n >= script.length ? 1 : n + 1)), 1400);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative pt-40 pb-24 overflow-hidden">
      <div className="absolute inset-0 grid-pattern opacity-20 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10 grid lg:grid-cols-2 gap-12 items-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full border border-border bg-card/50">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs text-muted-foreground font-mono">Early access · Free for one GPU</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold font-mono leading-[1.05] mb-6">
            The agent for your <span className="text-gradient glow-text">GPU infrastructure</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl">
            Connect the GPUs you already own or rent. Ask questions, see measured capacity, and get
            workload plans you approve — all through conversation.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/auth?next=/dashboard/gateway-setup">
              <Button size="lg" className="font-mono glow-primary group w-full sm:w-auto">
                <Terminal className="mr-2 w-4 h-4" />Get started free
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/dashboard/templates">
              <Button size="lg" variant="outline" className="font-mono w-full sm:w-auto">View agent templates</Button>
            </Link>
          </div>
          <p className="text-xs text-muted-foreground mt-4 font-mono">No card required · GPU rental billed by your provider</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}
          className="terminal-window">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card/50">
            <span className="w-2.5 h-2.5 rounded-full bg-destructive/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/50" />
            <span className="w-2.5 h-2.5 rounded-full bg-primary/70" />
            <span className="ml-3 font-mono text-xs text-muted-foreground">lightos — agent session (illustration)</span>
          </div>
          <div className="p-5 font-mono text-sm space-y-3 min-h-[260px]">
            {script.slice(0, shown).map((l, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className={tone[l.p]}>
                <span className="text-muted-foreground mr-2">{l.p === "you" ? "›" : l.p === "agent" ? "◆" : "·"}</span>{l.t}
              </motion.div>
            ))}
            <span className="text-primary animate-pulse">▌</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
