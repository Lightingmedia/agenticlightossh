import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { callRuntimeGateway, toolResult } from "../runtime-gateway";

export default defineTool({
  name: "get_runtime_capacity",
  title: "Get accelerator capacity",
  description: "Read verified CUDA, ROCm, TPU/XLA, and oneAPI/SYCL capacity from the Aurora control plane.",
  inputSchema: {
    runtime: z.enum(["all", "cuda", "rocm", "tpu_xla", "oneapi_sycl"]).describe("Runtime family to inspect."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ runtime }, ctx) => {
    try {
      const data = await callRuntimeGateway(ctx, `/v1/fabric/capacity?runtime=${encodeURIComponent(runtime)}`);
      return toolResult(data);
    } catch (error) {
      return { content: [{ type: "text", text: error instanceof Error ? error.message : "Capacity request failed" }], isError: true };
    }
  },
});