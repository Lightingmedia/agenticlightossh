import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "get_fabric_telemetry",
  title: "Get photonic fabric telemetry",
  description:
    "Return a snapshot of photonic-fabric telemetry (utilization, latency, thermal) for the requested window in seconds.",
  inputSchema: {
    windowSeconds: z
      .number()
      .int()
      .describe("Sampling window in seconds. Typical range 10-300."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ windowSeconds }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const w = Math.max(1, Math.min(600, windowSeconds));
    const snapshot = {
      windowSeconds: w,
      timestamp: new Date().toISOString(),
      nodes: 240,
      utilizationPct: +(60 + Math.random() * 30).toFixed(1),
      p50LatencyUs: +(4 + Math.random() * 2).toFixed(2),
      p99LatencyUs: +(9 + Math.random() * 4).toFixed(2),
      avgTempC: +(62 + Math.random() * 8).toFixed(1),
      hotspots: Math.floor(Math.random() * 4),
      requestedBy: ctx.getUserEmail() ?? ctx.getUserId(),
    };
    return {
      content: [{ type: "text", text: JSON.stringify(snapshot, null, 2) }],
      structuredContent: snapshot,
    };
  },
});
