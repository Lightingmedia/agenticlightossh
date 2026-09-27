import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { callRuntimeGateway, toolResult } from "../runtime-gateway";

export default defineTool({
  name: "validate_workload_intent",
  title: "Validate workload intent",
  description: "Validate a constrained accelerator workload intent against Aurora policy without executing it.",
  inputSchema: {
    workloadClass: z.enum(["inference", "fine_tuning", "batch_training"]),
    model: z.string().trim().min(1).max(160),
    runtime: z.enum(["cuda", "rocm", "tpu_xla", "oneapi_sycl", "auto"]),
    objective: z.enum(["lowest_latency", "lowest_cost", "maximum_throughput"]),
    acceleratorCount: z.number().int().min(1).max(1024),
    minimumMemoryGiB: z.number().int().min(1).max(2048),
    region: z.string().trim().min(1).max(80),
    maxCostPerHourUsd: z.number().min(0).max(100000),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async (intent, ctx) => {
    try {
      return toolResult(await callRuntimeGateway(ctx, "/v1/intents/validate", { method: "POST", body: { intent } }));
    } catch (error) {
      return { content: [{ type: "text", text: error instanceof Error ? error.message : "Intent validation failed" }], isError: true };
    }
  },
});