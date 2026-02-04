import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Activity, Thermometer, Zap, Cpu } from "lucide-react";

export type TelemetryNodeData = {
  label: string;
  type: "thermal" | "power" | "network" | "gpu";
  value?: number;
};

const iconMap = {
  thermal: Thermometer,
  power: Zap,
  network: Activity,
  gpu: Cpu,
};

const colorMap = {
  thermal: "from-orange-500/20 to-red-500/20 border-orange-500/50",
  power: "from-yellow-500/20 to-amber-500/20 border-yellow-500/50",
  network: "from-blue-500/20 to-cyan-500/20 border-blue-500/50",
  gpu: "from-green-500/20 to-emerald-500/20 border-green-500/50",
};

export const TelemetryNode = memo(({ data }: NodeProps) => {
  const nodeData = data as TelemetryNodeData;
  const Icon = iconMap[nodeData.type] || Activity;
  const colorClass = colorMap[nodeData.type] || colorMap.network;

  return (
    <div
      className={`px-4 py-3 rounded-lg border bg-gradient-to-br ${colorClass} backdrop-blur-sm min-w-[140px]`}
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
          <div className="text-xs font-medium text-foreground/70">Telemetry</div>
          <div className="text-sm font-semibold">{nodeData.label}</div>
        </div>
      </div>
      {nodeData.value !== undefined && (
        <div className="mt-2 text-xs text-muted-foreground">
          Value: <span className="text-lightrail font-mono">{nodeData.value}%</span>
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

TelemetryNode.displayName = "TelemetryNode";
