import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check } from "lucide-react";

const Hero = () => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"mac" | "windows">("mac");

  const installCommands = {
    mac: "curl -fsSL https://lightos.dev/install | bash",
    windows: "irm https://lightos.dev/install.ps1 | iex",
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(installCommands[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative min-h-screen pt-32 pb-20 overflow-hidden">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 grid-pattern opacity-30" />
      
      {/* Gradient Orb */}
      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 mb-8"
          >
            <span className="text-sm text-muted-foreground font-mono uppercase tracking-wide">
              Backed by
            </span>
            <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded">Y</span>
            <span className="text-sm text-muted-foreground font-mono uppercase tracking-wide">
              Combinator
            </span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-8xl font-bold font-mono leading-tight mb-8"
          >
            <span className="text-foreground">ORCHESTRATE</span>
            <br />
            <span className="text-foreground">AI WITH </span>
            <span className="text-gradient glow-text">AGENTS</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground font-mono mb-10 max-w-2xl"
          >
            The only AI infrastructure platform built for{" "}
            <span className="text-foreground border-b border-dashed border-primary">distributed compute</span>{" "}
            engineers.
          </motion.p>

          {/* Install Command Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="terminal-window max-w-xl"
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
                MAC / LINUX
              </button>
              <button
                onClick={() => setActiveTab("windows")}
                className={`px-4 py-3 font-mono text-sm transition-colors ${
                  activeTab === "windows"
                    ? "text-foreground border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                WINDOWS (POWERSHELL)
              </button>
            </div>

            {/* Command */}
            <div className="p-4 flex items-center justify-between gap-4">
              <code className="text-primary font-mono text-sm md:text-base">
                <span className="text-muted-foreground mr-2">&gt;</span>
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

        {/* Floating Brace Graphic */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="absolute right-0 top-1/2 -translate-y-1/2 hidden lg:block"
        >
          <div className="text-[300px] font-mono text-primary/20 glow-text select-none">
            {`{ }`}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;