import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

const AGENTS = [
  { name: "fabric-optimizer", role: "Topology auto-tuner", status: "executing" },
  { name: "thermal-guardian", role: "Cooling controller", status: "thinking" },
  { name: "cost-sentinel", role: "Spend optimizer", status: "idle" },
  { name: "incident-triage", role: "On-call AI SRE", status: "executing" },
  { name: "model-router", role: "LLM traffic shaper", status: "idle" },
  { name: "compliance-auditor", role: "Policy enforcement", status: "error" },
];

export default defineTool({
  name: "list_agents",
  title: "List LightRail agents",
  description: "List the datacenter AI agents running in this LightOS deployment with their role and current status.",
  inputSchema: {
    status: z
      .enum(["executing", "thinking", "idle", "error", "any"])
      .optional()
      .describe("Filter by agent status. Defaults to 'any'."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ status }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const filtered = !status || status === "any" ? AGENTS : AGENTS.filter((a) => a.status === status);
    return {
      content: [{ type: "text", text: JSON.stringify(filtered, null, 2) }],
      structuredContent: { agents: filtered },
    };
  },
});
