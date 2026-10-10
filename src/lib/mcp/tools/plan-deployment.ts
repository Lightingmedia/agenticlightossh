import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { callRuntimeGateway, toolResult } from "../runtime-gateway";

export default defineTool({
  name: "plan_deployment",
  title: "Plan accelerator deployment",
  description: "Ask Aurora for a policy-controlled placement, fabric route, cost estimate, and runtime plan; this tool never executes the plan.",
  inputSchema: {
    projectId: z.string().trim().min(1).max(120),
    workloadClass: z.enum(["inference", "fine_tuning", "batch_training"]),
    model: z.string().trim().min(1).max(160),
    runtime: z.enum(["cuda", "rocm", "tpu_xla", "oneapi_sycl", "auto"]),
    objective: z.enum(["lowest_latency", "lowest_cost", "maximum_throughput"]),
    acceleratorCount: z.number().int().min(1).max(1024),
    minimumMemoryGiB: z.number().int().min(1).max(2048),
    region: z.string().trim().min(1).max(80),
    availabilityTier: z.enum(["standard", "high"]),
    dataLocality: z.string().trim().max(160),
    maxCostPerHourUsd: z.number().min(0).max(100000),
    maxRuntimeMinutes: z.number().int().min(0).max(525600),
    allowedProviders: z.array(z.string().trim().min(1).max(64)).max(30).optional()
      .describe("Provider ids from list_compute_providers to consider; omit to let Aurora choose among the user's connected providers."),
  },
  annotations: { readOnlyHint: true, idempotentHint: false, openWorldHint: true },
  handler: async (args, ctx) => {
    try {
      const { projectId, ...intent } = args;
      return toolResult(await callRuntimeGateway(ctx, "/v1/deployments/plan", {
        method: "POST",
        body: { projectId, intent },
      }));
    } catch (error) {
      return { content: [{ type: "text", text: error instanceof Error ? error.message : "Deployment planning failed" }], isError: true };
    }
  },
});