import { useState, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Copy, Check, ArrowRight, Layers, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Hero = () => {
  const [copied, setCopied] = useState<"install" | "onboard" | null>(null);
  const [activeTab, setActiveTab] = useState<"mac" | "windows">("mac");
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    scrollYProgress
  } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  const installCommands = {
    mac: "curl -fsSL https://agentic.lightos.sh | bash",
    windows: "iwr https://agentic.lightos.sh/install.ps1 | iex"
  };
  const onboardCommand = "lightos onboard";

  const handleCopy = (type: "install" | "onboard") => {
    const text = type === "install" ? installCommands[activeTab] : onboardCommand;
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return <section ref={containerRef} className="relative min-h-screen pt-36 pb-20 overflow-hidden">
      {/* Parallax Background Grid */}
      <motion.div className="absolute inset-0 grid-pattern opacity-20" style={{
      y: useTransform(scrollYProgress, [0, 1], [0, 100])
    }} />

      {/* Parallax Gradient Orbs */}
      <motion.div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-primary/15 via-primary/5 to-transparent blur-3xl" style={{
      y: useTransform(scrollYProgress, [0, 1], [0, 200])
    }} />
      <motion.div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-cyan-500/10 to-transparent blur-3xl" style={{
      y: useTransform(scrollYProgress, [0, 1], [0, 150])
    }} />

      <motion.div className="container mx-auto px-4 relative z-10" style={{
      y,
      opacity,
      scale
    }}>
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full border border-border bg-card/50">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm text-muted-foreground font-mono">
              Agentic LightOS v0.2 — Photonic-Native AI
            </span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold font-mono leading-tight mb-6">
            <span className="text-foreground">One Command to </span>
            <span className="text-gradient glow-text">Onboard.</span>
            <br />
            <span className="text-foreground">Deploy </span>
            <span className="text-gradient glow-text">Agents.</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            The unified photonic-native AI platform. Topology-aware routing, 64-channel WDM scheduling,
            and framework adapters for PyTorch &amp; JAX — installed in seconds.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.25 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link to="/onboard">
              <Button size="lg" className="font-mono bg-primary text-primary-foreground hover:bg-primary/90 glow-primary group">
                <Terminal className="mr-2 w-4 h-4" />
                Run Onboard Wizard
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button size="lg" variant="outline" className="font-mono border-border hover:border-primary/50">
                Open Dashboard
              </Button>
            </Link>
          </motion.div>

          {/* Two-line Install + Onboard Terminal Box */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
            className="terminal-window max-w-2xl mx-auto">
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card/50">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
              </div>
              {/* OS tabs */}
              <div className="ml-4 flex gap-1">
                <button onClick={() => setActiveTab("mac")}
                  className={`px-3 py-1 rounded font-mono text-xs transition-colors ${activeTab === "mac" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  macOS / Linux
                </button>
                <button onClick={() => setActiveTab("windows")}
                  className={`px-3 py-1 rounded font-mono text-xs transition-colors ${activeTab === "windows" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  Windows
                </button>
              </div>
            </div>

            {/* Line 1 — install */}
            <div className="px-4 pt-4 pb-2 flex items-center justify-between gap-4">
              <code className="text-primary font-mono text-sm flex-1 text-left">
                <span className="text-muted-foreground mr-2">~</span>
                <span className="text-cyan-400">curl</span>
                <span className="text-muted-foreground"> -fsSL </span>
                <span className="text-primary">https://agentic.lightos.sh</span>
                <span className="text-muted-foreground"> | bash</span>
              </code>
              <button onClick={() => handleCopy("install")} className="text-muted-foreground hover:text-foreground transition-colors p-2 flex-shrink-0">
                {copied === "install" ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* Line 2 — onboard */}
            <div className="px-4 pb-4 flex items-center justify-between gap-4">
              <code className="text-primary font-mono text-sm flex-1 text-left">
                <span className="text-muted-foreground mr-2">~</span>
                <span className="text-green-400">lightos</span>
                <span className="text-primary"> onboard</span>
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="text-primary ml-0.5">▌</motion.span>
              </code>
              <button onClick={() => handleCopy("onboard")} className="text-muted-foreground hover:text-foreground transition-colors p-2 flex-shrink-0">
                {copied === "onboard" ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </motion.div>

          {/* Sub-caption */}
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.5 }}
            className="text-xs text-muted-foreground mt-4 font-mono">
            Requires Python 3.10+ · macOS, Linux, WSL2 · Free forever for open-source
          </motion.p>
        </div>

        {/* Floating Logo Graphic with Parallax */}
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.4 }}
          style={{ y: useTransform(scrollYProgress, [0, 1], [0, -100]) }}
          className="absolute right-10 top-1/3 hidden xl:block">
          <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center glow-primary">
            <Layers className="w-16 h-16 text-primary/60" />
          </div>
        </motion.div>
      </motion.div>
    </section>;
};

export default Hero;
