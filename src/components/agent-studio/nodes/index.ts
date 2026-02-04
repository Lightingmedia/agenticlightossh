import { TelemetryNode } from "./TelemetryNode";
import { LogicNode } from "./LogicNode";
import { ActuatorNode } from "./ActuatorNode";

export type { TelemetryNodeData } from "./TelemetryNode";
export type { LogicNodeData } from "./LogicNode";
export type { ActuatorNodeData } from "./ActuatorNode";

export { TelemetryNode, LogicNode, ActuatorNode };

export const nodeTypes = {
  telemetry: TelemetryNode,
  logic: LogicNode,
  actuator: ActuatorNode,
} as const;
