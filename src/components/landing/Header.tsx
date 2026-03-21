import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronDown, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      {/* Announcement Bar */}
      <div className="bg-secondary/80 backdrop-blur-sm border-b border-border py-2 px-4">
        <div className="container mx-auto flex items-center justify-center gap-2 text-sm">
          <span className="text-primary">⚡</span>
          <span className="font-mono text-muted-foreground">LightOS v0.2 — Photonic-native AI is live.</span>
          <Link to="/onboard" className="text-primary hover:underline font-mono">
            Run lightos onboard →
          </Link>
        </div>
      </div>

      {/* Main Header */}
      <nav className="bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 font-mono text-lg font-bold">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <Layers className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-foreground tracking-tight">LightOS</span>
              </Link>
              <Link to="/aurora-llm" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent-foreground hover:bg-accent/20 transition-colors font-mono text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                Aurora LLM
                </Link>
                <Link to="/aurora-llm" className="flex items-center gap-2 text-accent-foreground font-mono text-sm" onClick={() => setMobileMenuOpen(false)}>
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  Aurora LLM
                </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <div className="relative">
                <button
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors font-mono text-sm uppercase tracking-wide"
                  onMouseEnter={() => setProductsOpen(true)}
                  onMouseLeave={() => setProductsOpen(false)}
                >
                  Platform
                  <ChevronDown className="w-4 h-4" />
                </button>
                <AnimatePresence>
                  {productsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 mt-2 w-52 bg-card border border-border rounded-lg shadow-xl py-2"
                      onMouseEnter={() => setProductsOpen(true)}
                      onMouseLeave={() => setProductsOpen(false)}
                    >
                      <Link to="/light-compiler" className="flex items-center justify-between px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        LightCompiler
                        <span className="text-primary text-xs ml-2 bg-primary/10 px-1.5 py-0.5 rounded">NEW</span>
                      </Link>
                      <Link to="/transformer-explainer" className="flex items-center justify-between px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        Transformer Explainer
                        <span className="text-purple-400 text-xs ml-2 bg-purple-500/10 px-1.5 py-0.5 rounded">VIZ</span>
                      </Link>
                      <div className="border-t border-border my-1" />
                      <Link to="/dashboard/templates" className="block px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Agent Templates</Link>
                      <Link to="/dashboard/agents" className="block px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Agent Hub</Link>
                      <Link to="/dashboard/inference" className="block px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Inference API</Link>
                      <Link to="/dashboard/models" className="block px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        Model Registry <span className="text-primary text-xs">BETA</span>
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <Link to="/docs" className="text-muted-foreground hover:text-foreground transition-colors font-mono text-sm uppercase tracking-wide">
                Docs
              </Link>
              <Link to="/examples" className="text-muted-foreground hover:text-foreground transition-colors font-mono text-sm uppercase tracking-wide">
                Examples
              </Link>
              <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors font-mono text-sm uppercase tracking-wide">
                Dashboard
              </Link>
              <Link to="/onboard" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-mono text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Onboard
              </Link>
              <Link to="/aurora-llm" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-mono text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Aurora LLM
              </Link>
            </div>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-3">
              <Button variant="ghost" size="sm" className="font-mono text-muted-foreground hover:text-foreground">
                Sign In
              </Button>
              <Link to="/dashboard">
                <Button size="sm" className="font-mono bg-primary text-primary-foreground hover:bg-primary/90">
                  Get Started
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden text-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-border bg-background"
            >
              <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
                <Link to="/dashboard/templates" className="text-muted-foreground hover:text-foreground font-mono text-sm uppercase" onClick={() => setMobileMenuOpen(false)}>Agent Templates</Link>
                <Link to="/docs" className="text-muted-foreground hover:text-foreground font-mono text-sm uppercase" onClick={() => setMobileMenuOpen(false)}>Docs</Link>
                <Link to="/examples" className="text-muted-foreground hover:text-foreground font-mono text-sm uppercase" onClick={() => setMobileMenuOpen(false)}>Examples</Link>
                <Link to="/dashboard" className="text-muted-foreground hover:text-foreground font-mono text-sm uppercase" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
                <Link to="/onboard" className="flex items-center gap-2 text-primary font-mono text-sm" onClick={() => setMobileMenuOpen(false)}>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  Onboard
                </Link>
                <div className="flex gap-3 pt-4 border-t border-border">
                  <Button variant="outline" size="sm" className="font-mono flex-1">Sign In</Button>
                  <Link to="/dashboard" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                    <Button size="sm" className="font-mono w-full bg-primary text-primary-foreground">Get Started</Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
};

export default Header;
