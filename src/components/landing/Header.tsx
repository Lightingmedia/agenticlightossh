import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronDown, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

type NavItem = { label: string; to: string; desc: string; tag?: string };
const groups: { label: string; items: NavItem[] }[] = [
  {
    label: "Platform",
    items: [
      { label: "LightOS desktop", to: "/os", desc: "The full workspace in your browser", tag: "OS" },
      { label: "Dashboard", to: "/dashboard", desc: "Your GPUs, readings and plans" },
      { label: "Agent Hub", to: "/dashboard/agents", desc: "Your infrastructure agents" },
      { label: "Agent Templates", to: "/dashboard/templates", desc: "Start from a ready-made agent" },
      { label: "Inference API", to: "/dashboard/inference", desc: "Send prompts to hosted models" },
      { label: "Model Registry", to: "/dashboard/models", desc: "Models you can serve", tag: "BETA" },
    ],
  },
  {
    label: "AI Infrastructure",
    items: [
      { label: "GPU Setup", to: "/dashboard/gateway-setup", desc: "Connect your NVIDIA machine" },
      { label: "GPU Cloud", to: "/dashboard/gpu-cloud", desc: "Rent GPUs with prepaid credit" },
      { label: "Compute Exchange", to: "/dashboard/exchange", desc: "Plan workloads and compare costs" },
      { label: "GPU Monitor", to: "/dashboard/gpu", desc: "Live utilization, memory and power" },
      { label: "RDMA Traces", to: "/dashboard/rdma", desc: "Network traffic between GPU nodes" },
      { label: "LightCompiler", to: "/light-compiler", desc: "How models are compiled", tag: "NEW" },
      { label: "Benchmark", to: "/benchmark", desc: "Performance targets and method" },
    ],
  },
  {
    label: "Resources",
    items: [
      { label: "First-run guide", to: "/guide", desc: "Live GPU readings in 10 minutes" },
      { label: "Docs", to: "/docs", desc: "Reference and concepts" },
      { label: "Examples", to: "/examples", desc: "Agents for real data centers" },
      { label: "Blog", to: "/blog", desc: "News and deep dives" },
      { label: "Transformer Explainer", to: "/transformer-explainer", desc: "See how a model thinks" },
      { label: "Onboarding", to: "/onboard", desc: "Guided account setup" },
    ],
  },
];

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  return (
    <header className="fixed top-0 inset-x-0 z-50 px-3 sm:px-4 pt-3 sm:pt-5">
      <nav className="nav-capsule mx-auto max-w-5xl rounded-2xl">
        <div className="flex items-center justify-between gap-4 px-4 sm:px-5 h-14 sm:h-16">
          <Link to="/" className="flex items-center gap-2.5 font-mono text-lg font-bold shrink-0">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-lightrail to-primary/60 flex items-center justify-center shadow-[0_0_18px_hsl(var(--lightrail)/0.35)]">
              <Layers className="w-4 h-4 text-lightrail-foreground" />
            </span>
            <span className="tracking-tight">LightOS</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {groups.map((g) => (
              <div key={g.label} className="relative" onMouseEnter={() => setOpenGroup(g.label)} onMouseLeave={() => setOpenGroup(null)}>
                <button
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg text-[13px] transition-colors ${openGroup === g.label ? "text-foreground bg-secondary/70" : "text-muted-foreground hover:text-foreground"}`}
                  aria-expanded={openGroup === g.label}
                  onFocus={() => setOpenGroup(g.label)}
                >
                  {g.label}
                  <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform ${openGroup === g.label ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {openGroup === g.label && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 top-full pt-2"
                    >
                      <div className="w-72 rounded-xl p-1.5 border border-border bg-popover shadow-2xl">
                        {g.items.map((item) => (
                          <Link key={item.to} to={item.to} onClick={() => setOpenGroup(null)}
                            className="group/item flex items-start justify-between gap-3 px-3 py-2 rounded-lg hover:bg-secondary/70 transition-colors">
                            <span className="min-w-0">
                              <span className="block text-sm text-foreground/90 group-hover/item:text-foreground">{item.label}</span>
                              <span className="block text-xs text-muted-foreground">{item.desc}</span>
                            </span>
                            {item.tag && <span className="mt-0.5 font-mono text-[10px] text-lightrail bg-lightrail/10 px-1.5 py-0.5 rounded">{item.tag}</span>}
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
            <Link to="/pricing" className="px-3 py-2 rounded-lg text-[13px] text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <Link to="/auth" className="px-3 py-2 text-[13px] text-foreground/90 hover:text-foreground">Sign in</Link>
            <Link to="/auth?next=/dashboard/gateway-setup">
              <Button size="sm" className="rounded-xl h-9 px-4 bg-lightrail text-lightrail-foreground hover:bg-lightrail/90 shadow-[0_6px_24px_-6px_hsl(var(--lightrail)/0.6)]">
                Get started
              </Button>
            </Link>
          </div>

          <button className="md:hidden text-foreground p-1" aria-label={mobileOpen ? "Close menu" : "Open menu"} onClick={() => setMobileOpen((v) => !v)}>
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="md:hidden overflow-hidden border-t border-border/60">
              <div className="px-4 py-4 grid gap-5 max-h-[70vh] overflow-y-auto">
                {groups.map((g) => (
                  <div key={g.label}>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">{g.label}</p>
                    <div className="grid grid-cols-2 gap-1">
                      {g.items.map((item) => (
                        <Link key={item.to} to={item.to} onClick={() => setMobileOpen(false)} className="text-sm text-foreground/90 py-1.5">{item.label}</Link>
                      ))}
                    </div>
                  </div>
                ))}
                <Link to="/pricing" onClick={() => setMobileOpen(false)} className="text-sm text-foreground/90">Pricing</Link>
                <div className="flex gap-2 pt-3 border-t border-border/60">
                  <Link to="/auth" className="flex-1" onClick={() => setMobileOpen(false)}><Button variant="outline" size="sm" className="w-full rounded-xl">Sign in</Button></Link>
                  <Link to="/auth?next=/dashboard/gateway-setup" className="flex-1" onClick={() => setMobileOpen(false)}><Button size="sm" className="w-full rounded-xl bg-lightrail text-lightrail-foreground">Get started</Button></Link>
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
