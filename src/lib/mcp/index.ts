import { auth, defineMcp } from "@lovable.dev/mcp-js";
import echoTool from "./tools/echo";
import listAgentsTool from "./tools/list-agents";
import getFabricTelemetryTool from "./tools/get-fabric-telemetry";
import getRuntimeCapacityTool from "./tools/get-runtime-capacity";
import validateWorkloadIntentTool from "./tools/validate-workload-intent";
import planDeploymentTool from "./tools/plan-deployment";
import getFabricStateTool from "./tools/get-fabric-state";

// Build the Supabase OAuth issuer from the project ref (inlined by Vite at build).
// Never derive from SUPABASE_URL — that may be the .lovable.cloud proxy which
// publishes a different issuer in discovery and would fail RFC 8414 §3.3 checks.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "lightos-mcp",
  title: "LightOS",
  version: "0.3.0",
  instructions:
    "Authenticated tools for Aurora Fabric OS. Submit constrained workload intent and read verified accelerator capacity, deployment plans, and fabric state. Aurora is the sole privileged execution authority; clients never issue shell, driver, container, or cluster commands.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    echoTool,
    listAgentsTool,
    getFabricTelemetryTool,
    getRuntimeCapacityTool,
    validateWorkloadIntentTool,
    planDeploymentTool,
    getFabricStateTool,
  ],
});
