import { DragEvent } from "react";
import { 
  Thermometer, 
  Zap, 
  Activity, 
  Cpu, 
  GitBranch, 
  AlertTriangle, 
  TrendingUp, 
  Shield,
  Radio,
  Lightbulb,
  RotateCcw,
  Send,
  ChevronDown
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface ToolboxCategory {
  title: string;
  items: {
    type: string;
    nodeType: "telemetry" | "logic" | "actuator";
    label: string;
    icon: React.ElementType;
    description: string;
    data: Record<string, unknown>;
  }[];
}

const toolboxCategories: ToolboxCategory[] = [
  {
    title: "Telemetry Nodes",
    items: [
      {
        type: "thermal",
        nodeType: "telemetry",
        label: "Thermal Monitor",
        icon: Thermometer,
        description: "Monitor temperature thresholds",
        data: { label: "Thermal Monitor", type: "thermal" },
      },
      {
        type: "power",
        nodeType: "telemetry",
        label: "Power Sensor",
        icon: Zap,
        description: "Track power consumption",
        data: { label: "Power Sensor", type: "power" },
      },
      {
        type: "network",
        nodeType: "telemetry",
        label: "Congestion Monitor",
        icon: Activity,
        description: "Detect network bottlenecks",
        data: { label: "Congestion Monitor", type: "network" },
      },
      {
        type: "gpu",
        nodeType: "telemetry",
        label: "GPU Metrics",
        icon: Cpu,
        description: "GPU utilization & memory",
        data: { label: "GPU Metrics", type: "gpu" },
      },
    ],
  },
  {
    title: "Logic Blocks",
    items: [
      {
        type: "condition",
        nodeType: "logic",
        label: "Thermal Trigger",
        icon: GitBranch,
        description: "IF thermal > threshold",
        data: { label: "Thermal Trigger", type: "trigger", condition: "temp > 85°C" },
      },
      {
        type: "trigger",
        nodeType: "logic",
        label: "I/O Wall Detector",
        icon: AlertTriangle,
        description: "Detect electrical saturation",
        data: { label: "I/O Wall Detector", type: "trigger", condition: "io_wall == true" },
      },
      {
        type: "predictor",
        nodeType: "logic",
        label: "Congestion Predictor",
        icon: TrendingUp,
        description: "ML-based traffic forecast",
        data: { label: "Congestion Predictor", type: "predictor" },
      },
      {
        type: "guardrail",
        nodeType: "logic",
        label: "HITL Guardrail",
        icon: Shield,
        description: "Require human approval",
        data: { label: "HITL Guardrail", type: "guardrail" },
      },
    ],
  },
  {
    title: "Photonic Actuators",
    items: [
      {
        type: "circuit",
        nodeType: "actuator",
        label: "Circuit Provisioner",
        icon: Radio,
        description: "Provision optical circuit",
        data: { label: "Circuit Provisioner", type: "circuit" },
      },
      {
        type: "bypass",
        nodeType: "actuator",
        label: "Photonic Bypass",
        icon: Lightbulb,
        description: "Bypass electrical I/O",
        data: { label: "Photonic Bypass", type: "bypass" },
      },
      {
        type: "reconfigure",
        nodeType: "actuator",
        label: "Topology Reconfig",
        icon: RotateCcw,
        description: "Reconfigure mesh topology",
        data: { label: "Topology Reconfig", type: "reconfigure" },
      },
      {
        type: "alert",
        nodeType: "actuator",
        label: "Alert Dispatcher",
        icon: Send,
        description: "Send operator alerts",
        data: { label: "Alert Dispatcher", type: "alert" },
      },
    ],
  },
];

interface ToolboxSidebarProps {
  className?: string;
}

export function ToolboxSidebar({ className }: ToolboxSidebarProps) {
  const onDragStart = (event: DragEvent, nodeType: string, data: Record<string, unknown>) => {
    event.dataTransfer.setData("application/reactflow-type", nodeType);
    event.dataTransfer.setData("application/reactflow-data", JSON.stringify(data));
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className={cn("w-72 bg-card border-r border-border overflow-y-auto", className)}>
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Logic Toolbox</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Drag blocks onto the canvas
        </p>
      </div>

      <div className="p-2">
        {toolboxCategories.map((category) => (
          <Collapsible key={category.title} defaultOpen className="mb-2">
            <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-lg hover:bg-muted/50 transition-colors">
              {category.title}
              <ChevronDown className="w-4 h-4 transition-transform duration-200 [&[data-state=open]]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 mt-1">
              {category.items.map((item) => (
                <div
                  key={item.label}
                  draggable
                  onDragStart={(e) => onDragStart(e, item.nodeType, item.data)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-grab active:cursor-grabbing bg-background hover:bg-muted/50 border border-border hover:border-lightrail/30 transition-all group"
                >
                  <div className="p-1.5 rounded-md bg-muted group-hover:bg-lightrail/10 transition-colors">
                    <item.icon className="w-4 h-4 text-muted-foreground group-hover:text-lightrail transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{item.label}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {item.description}
                    </div>
                  </div>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </div>
  );
}
