import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { callRuntimeGateway, toolResult } from "../runtime-gateway";

export default defineTool({
  name: "get_fabric_state",
  title: "Get live fabric state",
  description: "Read live Aurora topology, telemetry, or recent policy events from the privileged control plane.",
  inputSchema: {
    view: z.enum(["topology", "telemetry", "events"]),
    windowSeconds: z.number().int().min(1).max(3600),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ view, windowSeconds }, ctx) => {
    try {
      return toolResult(await callRuntimeGateway(ctx, `/v1/fabric/${view}?window_seconds=${windowSeconds}`));
    } catch (error) {
      return { content: [{ type: "text", text: error instanceof Error ? error.message : "Fabric request failed" }], isError: true };
    }
  },
});