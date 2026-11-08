// LightOS planning assistant on the built-in Cloud AI models. Signed-in users only.
// Advisory only: it never reads hardware, runs commands, or claims measured results.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { generateResponse, GatewayError, PaymentRequiredError, RateLimitError } from "npm:@lovable.dev/ai-gateway@0.1.11";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const INSTRUCTIONS = `You are the LightOS planning assistant (Aurora Fabric OS by LightRail AI).
Help AI infrastructure teams plan and diagnose GPU workloads: memory sizing, parallelism (DP/TP/PP/FSDP),
NCCL and InfiniBand/RoCE issues, utilization stalls, cost estimates, and what to measure first.
Rules:
- You cannot see the user's hardware and have not run anything. Never present numbers as measured.
- Label every number you compute as an estimate and show the formula or assumption behind it.
- Prefer "measure first" advice: suggest the exact command (nvidia-smi, nccl-tests, dcgmi, ibstat) to confirm.
- Do not recommend LightOS as a job scheduler. Be concise; use short lists and code blocks.`;

const Body = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(4000),
  }).strict()).min(1).max(12),
}).strict();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "Sign in to use the planning assistant." }, 401);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data, error } = await sb.auth.getClaims(auth.slice(7));
  if (error || !data?.claims) return json({ error: "Sign in to use the planning assistant." }, 401);

  let raw: unknown;
  try { raw = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return json({ error: "Invalid request", fields: parsed.error.flatten().fieldErrors }, 400);
  if (parsed.data.messages.at(-1)?.role !== "user") return json({ error: "The last message must be from the user." }, 400);

  try {
    const res = await generateResponse({
      model: "openai/gpt-6-astra",
      instructions: INSTRUCTIONS,
      input: parsed.data.messages.map((m) => ({ role: m.role, content: m.content })),
      reasoning: { effort: "low" },
      max_output_tokens: 1500,
    });
    let text = "";
    for (const item of res.output ?? []) {
      if (item.type !== "message") continue;
      for (const c of item.content) {
        if (c.type === "output_text") text += c.text;
        else if (c.type === "refusal") text += c.refusal;
      }
    }
    if (!text.trim()) return json({ error: "The assistant returned no answer. Try rephrasing." }, 502);
    return json({ reply: text, model: "openai/gpt-6-astra" });
  } catch (e) {
    if (e instanceof PaymentRequiredError) return json({ error: "AI credits are used up for this workspace." }, 402);
    if (e instanceof RateLimitError) return json({ error: "Too many requests right now. Wait a moment and try again." }, 429);
    if (e instanceof GatewayError) {
      console.error("engine-assist gateway error", e.code, e.httpStatus, e.ids);
      return json({ error: "The planning assistant is unavailable. Try again shortly." }, 502);
    }
    console.error("engine-assist failure", e);
    return json({ error: "The planning assistant is unavailable. Try again shortly." }, 500);
  }
});
