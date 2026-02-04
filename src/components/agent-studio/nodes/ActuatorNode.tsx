import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Radio, Lightbulb, RotateCcw, Send } from "lucide-react";

export type ActuatorNodeData = {
  label: string;
  type: "circuit" | "bypass" | "reconfigure" | "alert";
  target?: string;
};

const iconMap = {
  circuit: Radio,
  bypass: Lightbulb,
  reconfigure: RotateCcw,
  alert: Send,
};

const colorMap = {
  circuit: "from-lightrail/20 to-emerald-500/20 border-lightrail/50",
  bypass: "from-cyan-500/20 to-blue-500/20 border-cyan-500/50",
  reconfigure: "from-indigo-500/20 to-purple-500/20 border-indigo-500/50",
  alert: "from-pink-500/20 to-rose-500/20 border-pink-500/50",
};

export const ActuatorNode = memo(({ data }: NodeProps) => {
  const nodeData = data as ActuatorNodeData;
  const Icon = iconMap[nodeData.type] || Radio;
  const colorClass = colorMap[nodeData.type] || colorMap.circuit;

  return (
    <div
      className={`px-4 py-3 rounded-lg border bg-gradient-to-br ${colorClass} backdrop-blur-sm min-w-[160px]`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-lightrail !border-2 !border-background"
      />
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-md bg-lightrail/20">
          <Icon className="w-4 h-4 text-lightrail" />
        </div>
        <div>
          <div className="text-xs font-medium text-lightrail/70">Actuator</div>
          <div className="text-sm font-semibold">{nodeData.label}</div>
        </div>
      </div>
      {nodeData.target && (
        <div className="mt-2 text-xs text-muted-foreground">
          Target: <span className="text-lightrail font-mono">{nodeData.target}</span>
        </div>
      )}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-lightrail !border-2 !border-background"
      />
    </div>
  );
});

ActuatorNode.displayName = "ActuatorNode";
