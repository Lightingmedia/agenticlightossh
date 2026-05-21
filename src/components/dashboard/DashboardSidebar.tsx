import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Bot,
  Cpu,
  Activity,
  Thermometer,
  Brain,
  Layers,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  BarChart3,
  Blocks,
  Database,
  GitBranch,
  PlayCircle,
  Rocket,
  Monitor,
  ChevronDown,
  Network,
  Workflow,
  Server,
  FileText,
  BatteryCharging,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";

const monitoringItems = [
  { icon: LayoutDashboard, label: "Overview", path: "/dashboard" },
  { icon: Network, label: "Photonic Fabric", path: "/dashboard/photonic" },
  { icon: Bot, label: "Agents", path: "/dashboard/agents" },
  { icon: Cpu, label: "GPU Monitor", path: "/dashboard/gpu" },
  { icon: Activity, label: "Telemetry", path: "/dashboard/telemetry" },
  { icon: Thermometer, label: "Thermal Control", path: "/dashboard/thermal" },
  { icon: BatteryCharging, label: "Power Governor", path: "/dashboard/governor" },
  { icon: Zap, label: "Inference", path: "/dashboard/inference" },
  { icon: Server, label: "LLM Serving", path: "/dashboard/llm-serving" },
  { icon: Brain, label: "LLM Models", path: "/dashboard/models" },
  { icon: BarChart3, label: "Training", path: "/dashboard/training" },
  { icon: Zap, label: "llmperf-bench", path: "/dashboard/benchmark" },
];

const lightosItems = [
  { icon: Server, label: "Clusters", path: "/dashboard/clusters" },
  { icon: FileText, label: "Runs", path: "/dashboard/runs" },
];

const builderItems = [
  { icon: Workflow, label: "Agent Studio", path: "/dashboard/studio" },
  { icon: Blocks, label: "Templates", path: "/dashboard/templates" },
  { icon: Database, label: "Data Sources", path: "/dashboard/data-sources" },
  { icon: GitBranch, label: "Rules", path: "/dashboard/rules" },
  { icon: PlayCircle, label: "Actions", path: "/dashboard/actions" },
  { icon: Rocket, label: "Deploy", path: "/dashboard/deploy" },
  { icon: Monitor, label: "Monitor", path: "/dashboard/monitor" },
];

const DashboardSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [builderExpanded, setBuilderExpanded] = useState(true);
  const location = useLocation();

  const NavItem = ({ item }: { item: typeof monitoringItems[0] }) => {
    const isActive = location.pathname === item.path;
    return (
      <Link
        to={item.path}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all duration-300 group relative overflow-hidden",
          isActive
            ? "bg-gradient-to-r from-primary/12 to-primary/5 border-primary/25 text-primary shadow-[inset_0_1px_1px_rgba(16,185,129,0.18),0_0_14px_rgba(16,185,129,0.12)]"
            : "border-transparent text-muted-foreground hover:bg-primary/5 hover:border-primary/10 hover:text-foreground hover:shadow-[inset_0_1px_1px_rgba(16,185,129,0.06)]"
        )}
      >
        {/* Active left-edge accent bar */}
        {isActive && (
          <span className="sidebar-active-indicator" />
        )}

        <item.icon
          className={cn(
            "w-4 h-4 flex-shrink-0 transition-all duration-300",
            isActive
              ? "text-primary scale-110 drop-shadow-[0_0_6px_rgba(16,185,129,0.55)]"
              : "group-hover:text-foreground group-hover:scale-105"
          )}
        />
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-mono font-medium text-[11px] truncate tracking-widest uppercase"
          >
            {item.label}
          </motion.span>
        )}
        {isActive && !collapsed && (
          <motion.div
            layoutId="activeNav"
            className="ml-auto w-1.5 h-1.5 rounded-full bg-primary led-glow-green flex-shrink-0"
          />
        )}
      </Link>
    );
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 256 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className="fixed left-0 top-0 h-screen z-50 flex flex-col"
      style={{
        background: "linear-gradient(180deg, rgba(6,10,18,0.97) 0%, rgba(8,14,24,0.95) 50%, rgba(6,10,18,0.97) 100%)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderRight: "1px solid rgba(16,185,129,0.12)",
        boxShadow: "4px 0 32px rgba(0,0,0,0.7), inset -1px 0 0 rgba(16,185,129,0.06)",
      }}
    >
      {/* Top gradient accent line */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(16,185,129,0.4), rgba(56,189,248,0.25), transparent)" }} />

      {/* Logo Panel */}
      <div
        className="h-16 flex items-center px-4 relative overflow-hidden"
        style={{ borderBottom: "1px solid rgba(16,185,129,0.1)" }}
      >
        {/* Subtle bg glow behind logo */}
        <div className="absolute left-0 top-0 w-full h-full pointer-events-none" style={{ background: "radial-gradient(ellipse at 30% 50%, rgba(16,185,129,0.06) 0%, transparent 70%)" }} />

        <Link to="/" className="flex items-center gap-3 relative z-10">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(56,189,248,0.12) 100%)",
              border: "1px solid rgba(16,185,129,0.3)",
              boxShadow: "0 0 16px rgba(16,185,129,0.2), inset 0 1px 1px rgba(255,255,255,0.06)",
            }}
          >
            <Layers className="w-4 h-4 text-primary drop-shadow-[0_0_4px_rgba(16,185,129,0.7)]" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-mono font-bold text-[14px] text-foreground tracking-wider leading-none flex items-center gap-2"
              >
                LightOS
                <span className="w-1.5 h-1.5 rounded-full bg-primary led-glow-green flex-shrink-0" />
              </motion.span>
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-mono text-[8px] mt-1 leading-none tracking-[0.18em] uppercase"
                style={{ color: "rgba(16,185,129,0.45)" }}
              >
                v1.0.4 // HYPERVISOR
              </motion.span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 overflow-y-auto space-y-5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-primary/10">

        {/* Monitoring Section */}
        <div>
          {!collapsed && (
            <div className="px-3 mb-2 flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-primary/50 led-glow-green" />
              <span className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-[0.2em]">Monitoring</span>
              <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(16,185,129,0.15), transparent)" }} />
            </div>
          )}
          <ul className="space-y-0.5">
            {monitoringItems.map((item) => (
              <li key={item.path}>
                <NavItem item={item} />
              </li>
            ))}
          </ul>
        </div>

        {/* LightOS Section */}
        <div>
          {!collapsed && (
            <div className="px-3 mb-2 flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-blue-400/50 led-glow-blue" />
              <span className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-[0.2em]">System Alpha</span>
              <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(56,189,248,0.15), transparent)" }} />
            </div>
          )}
          <ul className="space-y-0.5">
            {lightosItems.map((item) => (
              <li key={item.path}>
                <NavItem item={item} />
              </li>
            ))}
          </ul>
        </div>

        {/* Agent Builder Section */}
        <div>
          {!collapsed ? (
            <button
              onClick={() => setBuilderExpanded(!builderExpanded)}
              className="w-full flex items-center justify-between px-3 mb-2 group"
            >
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-amber-400/50 led-glow-amber" />
                <span className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-[0.2em] group-hover:text-muted-foreground/80 transition-colors">Agent Builder</span>
              </div>
              <ChevronDown className={cn("w-3 h-3 text-muted-foreground/40 transition-transform duration-200", builderExpanded && "rotate-180")} />
            </button>
          ) : (
            <div className="h-px mx-3 mb-4" style={{ background: "rgba(16,185,129,0.1)" }} />
          )}

          {(builderExpanded || collapsed) && (
            <ul className="space-y-0.5">
              {builderItems.map((item) => (
                <li key={item.path}>
                  <NavItem item={item} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </nav>

      {/* Bottom bar */}
      <div
        className="p-2 space-y-0.5"
        style={{ borderTop: "1px solid rgba(16,185,129,0.08)", background: "rgba(0,0,0,0.25)" }}
      >
        <Link
          to="/dashboard/billing"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
            location.pathname === "/dashboard/billing"
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          <CreditCard className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="font-medium text-sm">Billing</span>}
        </Link>
        <Link
          to="/dashboard/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all duration-300 group",
            location.pathname === "/dashboard/settings"
              ? "bg-primary/10 border-primary/20 text-primary"
              : "border-transparent text-muted-foreground hover:bg-primary/5 hover:border-primary/10 hover:text-foreground"
          )}
        >
          <Settings className="w-4 h-4 flex-shrink-0 group-hover:rotate-45 transition-transform duration-300" />
          {!collapsed && <span className="font-mono text-[11px] tracking-widest uppercase">Settings</span>}
        </Link>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent text-muted-foreground hover:bg-primary/5 hover:text-primary transition-all duration-300"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-primary" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="font-mono text-[11px] tracking-widest uppercase">Collapse</span>
            </>
          )}
        </button>
      </div>

      {/* Bottom gradient accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(16,185,129,0.2), transparent)" }} />
    </motion.aside>
  );
};

export default DashboardSidebar;
