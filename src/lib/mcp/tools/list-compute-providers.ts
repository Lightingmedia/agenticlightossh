import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { PROVIDERS } from "../../providers/catalog";

export default defineTool({
  name: "list_compute_providers",
  title: "List compute providers",
  description:
    "List the hyperscalers, NVIDIA services, GPU clouds and inference APIs LightOS can place workloads on, with accelerators, runtimes and capabilities. Use the returned ids in plan_deployment.allowedProviders. Never returns credentials.",
  inputSchema: {
    category: z.enum(["hyperscaler", "nvidia", "gpu_cloud", "inference_api", "self_managed", "any"]).optional(),
    runtime: z.enum(["cuda", "rocm", "tpu_xla", "oneapi_sycl", "neuron", "asic", "any"]).optional(),
    accelerator: z.string().trim().max(40).optional().describe("Substring match, e.g. 'H200' or 'TPU'"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ category, runtime, accelerator }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const acc = accelerator?.toLowerCase();
    const providers = PROVIDERS
      .filter((p) => !category || category === "any" || p.category === category)
      .filter((p) => !runtime || runtime === "any" || p.runtimes.includes(runtime))
      .filter((p) => !acc || p.accelerators.some((a) => a.toLowerCase().includes(acc)))
      .map(({ id, name, category, accelerators, runtimes, capabilities, validation, phase }) => ({
        id, name, category, accelerators, runtimes, capabilities, validation, phase,
      }));
    return {
      content: [{ type: "text", text: JSON.stringify(providers, null, 2) }],
      structuredContent: { providers },
    };
  },
});
