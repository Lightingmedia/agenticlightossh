// Generates a tailored LightOS runtime gateway + NVIDIA inference setup checklist.
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayRunId,
  getLovableAiGatewayResponseHeaders,
} from "./run-id.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-lovable-aig-run-id",
};

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SYSTEM = `You are a senior GPU infrastructure engineer helping a cluster administrator finish two things:
1) Deploying the LightOS runtime gateway: an authenticated HTTPS service inside their cluster. Aurora Fabric OS is the only privileged execution authority; the web app only submits constrained workload intent. The gateway talks to NVIDIA drivers, NVML/DCGM telemetry, and the scheduler (Kubernetes, Slurm or Ray). It must expose capacity, intent validation, deployment planning and fabric-state endpoints, and authenticate with a bearer token stored as secrets LIGHTOS_RUNTIME_GATEWAY_URL and LIGHTOS_RUNTIME_GATEWAY_TOKEN.
2) NVIDIA inference serving (e.g. Triton, TensorRT-LLM, NIM or vLLM) reachable through the gateway, reporting real utilization and cost measurements.

Produce a tailored checklist in Markdown for THEIR environment. Rules:
- Group into sections with "## " headings: Prerequisites, Drivers & Telemetry, Gateway Deployment, Security & Auth, Inference Serving, Connect to LightOS, Verification.
- Every item is a "- [ ] " task, concrete and specific to the details given (GPU models, OS, scheduler, network). Include short commands in inline code where useful.
- Call out gaps or risks in their description under a final "## Open questions" section.
- Never claim anything is already done. No marketing language. Keep it under ~600 words.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Please sign in first." }, 401);
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data: userData, error: authErr } = await supabase.auth.getUser(authHeader.slice(7));
  if (authErr || !userData?.user) return json({ error: "Please sign in first." }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }
  const fields = ["gpus", "nodes", "os", "scheduler", "network", "serving", "notes"] as const;
  const lines: string[] = [];
  for (const f of fields) {
    const v = body[f];
    if (v == null || v === "") continue;
    if (typeof v !== "string" || v.length > 2000) return json({ error: `Invalid field: ${f}` }, 400);
    lines.push(`${f}: ${v.trim()}`);
  }
  if (lines.length === 0) return json({ error: "Describe your environment first." }, 400);

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return json({ error: "AI is not configured." }, 500);

  const gateway = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(req));
  try {
    const upstream = await gateway.fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      signal: req.signal,
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        instructions: SYSTEM,
        input: `Cluster environment:\n${lines.join("\n")}`,
        stream: true,
        store: false,
        reasoning: { effort: "medium", summary: "auto" },
        include: ["reasoning.encrypted_content"],
      }),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      console.error("AI gateway error", upstream.status, text);
      let message = "Checklist generation failed.";
      try {
        const parsed = JSON.parse(text);
        message = parsed?.error?.message ?? parsed?.message ?? message;
      } catch { /* keep default */ }
      if (upstream.status === 429) message = "Too many requests right now. Please wait a moment and try again.";
      if (upstream.status === 402) message = message || "AI credits are exhausted.";
      return json({ error: message }, upstream.status);
    }

    const headers = getLovableAiGatewayResponseHeaders(upstream.headers, corsHeaders);
    headers.set("Content-Type", "text/event-stream");
    return new Response(upstream.body, { status: 200, headers });
  } catch (e) {
    if (req.signal.aborted) return new Response(null, { status: 499, headers: corsHeaders });
    console.error("checklist error", e);
    return json({ error: "Checklist generation failed." }, 500);
  }
});
