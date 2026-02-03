import { useState, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Copy, Check, ArrowRight, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Hero = () => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"mac" | "windows">("mac");
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  const installCommands = {
    mac: "pip install lightos && lightos init",
    windows: "pip install lightos; lightos init",
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(installCommands[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section ref={containerRef} className="relative min-h-screen pt-36 pb-20 overflow-hidden">
      {/* Parallax Background Grid */}
      <motion.div 
        className="absolute inset-0 grid-pattern opacity-20" 
        style={{ y: useTransform(scrollYProgress, [0, 1], [0, 100]) }}
      />
      
      {/* Parallax Gradient Orbs */}
      <motion.div 
        className="absolute top-1/3 right-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-primary/15 via-primary/5 to-transparent blur-3xl"
        style={{ y: useTransform(scrollYProgress, [0, 1], [0, 200]) }}
      />
      <motion.div 
        className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-cyan-500/10 to-transparent blur-3xl"
        style={{ y: useTransform(scrollYProgress, [0, 1], [0, 150]) }}
      />

      <motion.div 
        className="container mx-auto px-4 relative z-10"
        style={{ y, opacity, scale }}
      >
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full border border-border bg-card/50"
          >
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm text-muted-foreground font-mono">
              Now supporting 50+ AI models
            </span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold font-mono leading-tight mb-6"
          >
            <span className="text-foreground">Connect Your </span>
            <span className="text-gradient glow-text">Compute.</span>
            <br />
            <span className="text-foreground">Deploy </span>
            <span className="text-gradient glow-text">Agents.</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto"
          >
            The unified platform that bridges your local machines with distributed AI datacenters. 
            Run inference, manage models, and orchestrate agents—all from one place.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
          >
            <Link to="/dashboard">
              <Button size="lg" className="font-mono bg-primary text-primary-foreground hover:bg-primary/90 glow-primary group">
                Start Building Free
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="font-mono border-border hover:border-primary/50">
              View Documentation
            </Button>
          </motion.div>

          {/* Install Command Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="terminal-window max-w-lg mx-auto"
          >
            {/* Tabs */}
            <div className="flex border-b border-border">
              <button
                onClick={() => setActiveTab("mac")}
                className={`px-4 py-3 font-mono text-sm transition-colors ${
                  activeTab === "mac"
                    ? "text-foreground border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                macOS / Linux
              </button>
              <button
                onClick={() => setActiveTab("windows")}
                className={`px-4 py-3 font-mono text-sm transition-colors ${
                  activeTab === "windows"
                    ? "text-foreground border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Windows
              </button>
            </div>

            {/* Command */}
            <div className="p-4 flex items-center justify-between gap-4">
              <code className="text-primary font-mono text-sm">
                <span className="text-muted-foreground mr-2">$</span>
                {installCommands[activeTab]}
              </code>
              <button
                onClick={handleCopy}
                className="text-muted-foreground hover:text-foreground transition-colors p-2"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-primary" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </button>
            </div>
          </motion.div>
        </div>

        {/* Floating Logo Graphic with Parallax */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          style={{ y: useTransform(scrollYProgress, [0, 1], [0, -100]) }}
          className="absolute right-10 top-1/3 hidden xl:block"
        >
          <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center glow-primary">
            <Layers className="w-16 h-16 text-primary/60" />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Hero;