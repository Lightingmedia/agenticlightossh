import { auth, defineMcp } from "@lovable.dev/mcp-js";
import echoTool from "./tools/echo";
import listAgentsTool from "./tools/list-agents";
import getFabricTelemetryTool from "./tools/get-fabric-telemetry";

// Build the Supabase OAuth issuer from the project ref (inlined by Vite at build).
// Never derive from SUPABASE_URL — that may be the .lovable.cloud proxy which
// publishes a different issuer in discovery and would fail RFC 8414 §3.3 checks.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "lightos-mcp",
  title: "LightOS / LightRail MCP",
  version: "0.2.0",
  instructions:
    "Tools for the LightOS photonic AI datacenter platform. All tools require an authenticated LightOS user (Supabase OAuth). Use `echo` to verify connectivity, `list_agents` to enumerate running datacenter agents, and `get_fabric_telemetry` to sample photonic fabric metrics.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [echoTool, listAgentsTool, getFabricTelemetryTool],
});
