import { defineMcp } from "@lovable.dev/mcp-js";
import echoTool from "./tools/echo";
import listAgentsTool from "./tools/list-agents";
import getFabricTelemetryTool from "./tools/get-fabric-telemetry";

export default defineMcp({
  name: "lightos-mcp",
  title: "LightOS / LightRail MCP",
  version: "0.1.0",
  instructions:
    "Tools for the LightOS photonic AI datacenter platform. Use `echo` to verify connectivity, `list_agents` to enumerate running datacenter agents, and `get_fabric_telemetry` to sample photonic fabric metrics.",
  tools: [echoTool, listAgentsTool, getFabricTelemetryTool],
});
