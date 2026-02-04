import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { GitBranch, AlertTriangle, TrendingUp, Shield } from "lucide-react";

export type LogicNodeData = {
  label: string;
  type: "condition" | "trigger" | "predictor" | "guardrail";
  condition?: string;
};

const iconMap = {
  condition: GitBranch,
  trigger: AlertTriangle,
  predictor: TrendingUp,
  guardrail: Shield,
};

const colorMap = {
  condition: "from-purple-500/20 to-violet-500/20 border-purple-500/50",
  trigger: "from-red-500/20 to-rose-500/20 border-red-500/50",
  predictor: "from-cyan-500/20 to-teal-500/20 border-cyan-500/50",
  guardrail: "from-amber-500/20 to-yellow-500/20 border-amber-500/50",
};

export const LogicNode = memo(({ data }: NodeProps) => {
  const nodeData = data as LogicNodeData;
  const Icon = iconMap[nodeData.type] || GitBranch;
  const colorClass = colorMap[nodeData.type] || colorMap.condition;

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
        <div className="p-1.5 rounded-md bg-background/50">
          <Icon className="w-4 h-4 text-foreground" />
        </div>
        <div>
          <div className="text-xs font-medium text-foreground/70">Logic</div>
          <div className="text-sm font-semibold">{nodeData.label}</div>
        </div>
      </div>
      {nodeData.condition && (
        <div className="mt-2 px-2 py-1 rounded bg-background/30 font-mono text-xs text-muted-foreground">
          {nodeData.condition}
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

LogicNode.displayName = "LogicNode";
