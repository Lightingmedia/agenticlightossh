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
} from "lucide-react";
import { cn } from "@/lib/utils";

const monitoringItems = [
  { icon: LayoutDashboard, label: "Overview", path: "/dashboard" },
  { icon: Network, label: "Photonic Fabric", path: "/dashboard/photonic" },
  { icon: Bot, label: "Agents", path: "/dashboard/agents" },
  { icon: Cpu, label: "GPU Monitor", path: "/dashboard/gpu" },
  { icon: Activity, label: "Telemetry", path: "/dashboard/telemetry" },
  { icon: Thermometer, label: "Thermal Control", path: "/dashboard/thermal" },
  { icon: Zap, label: "Inference", path: "/dashboard/inference" },
  { icon: Brain, label: "LLM Models", path: "/dashboard/models" },
  { icon: BarChart3, label: "Training", path: "/dashboard/training" },
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
          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
          isActive
            ? "bg-primary/15 text-primary"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        )}
      >
        <item.icon
          className={cn(
            "w-5 h-5 flex-shrink-0 transition-colors",
            isActive ? "text-primary" : "group-hover:text-foreground"
          )}
        />
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-medium text-sm truncate"
          >
            {item.label}
          </motion.span>
        )}
        {isActive && !collapsed && (
          <motion.div
            layoutId="activeNav"
            className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
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
      className="fixed left-0 top-0 h-screen bg-card border-r border-border z-50 flex flex-col"
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-border">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-glow-secondary flex items-center justify-center flex-shrink-0">
            <Layers className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="font-mono font-bold text-lg text-foreground"
            >
              LightOS
            </motion.span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 overflow-y-auto">
        {/* Monitoring Section */}
        {!collapsed && (
          <div className="px-3 mb-2 text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Monitoring
          </div>
        )}
        <ul className="space-y-1">
          {monitoringItems.map((item) => (
            <li key={item.path}>
              <NavItem item={item} />
            </li>
          ))}
        </ul>

        {/* Agent Builder Section */}
        <div className="mt-6">
          {!collapsed ? (
            <button
              onClick={() => setBuilderExpanded(!builderExpanded)}
              className="w-full flex items-center justify-between px-3 mb-2 text-xs font-mono text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
            >
              <span>Agent Builder</span>
              <ChevronDown className={cn("w-4 h-4 transition-transform", builderExpanded && "rotate-180")} />
            </button>
          ) : (
            <div className="h-px bg-border mx-3 mb-4" />
          )}
          
          {(builderExpanded || collapsed) && (
            <ul className="space-y-1">
              {builderItems.map((item) => (
                <li key={item.path}>
                  <NavItem item={item} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </nav>

      {/* Settings & Collapse */}
      <div className="border-t border-border p-2">
        <Link
          to="/dashboard/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
            location.pathname === "/dashboard/settings"
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="font-medium text-sm">Settings</span>}
        </Link>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors mt-1"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="font-medium text-sm">Collapse</span>
            </>
          )}
        </button>
      </div>
    </motion.aside>
  );
};

export default DashboardSidebar;
