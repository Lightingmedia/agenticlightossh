// Serverless inference for signed-in users on built-in Cloud AI models.
// Returns the reply plus the token counts reported by the model provider; no hardware is involved.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { generateResponse, GatewayError, PaymentRequiredError, RateLimitError } from "npm:@lovable.dev/ai-gateway@0.1.11";

const MODEL = "openai/gpt-6-astra";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const Body = z.object({
  system: z.string().trim().max(2000).optional(),
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(8000),
  }).strict()).min(1).max(20),
}).strict();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "Sign in to use the inference API." }, 401);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data, error } = await sb.auth.getClaims(auth.slice(7));
  if (error || !data?.claims?.sub) return json({ error: "Sign in to use the inference API." }, 401);

  let raw: unknown;
  try { raw = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return json({ error: "Invalid request", fields: parsed.error.flatten().fieldErrors }, 400);
  if (parsed.data.messages.at(-1)?.role !== "user") return json({ error: "The last message must be from the user." }, 400);

  const started = Date.now();
  try {
    const res = await generateResponse({
      model: MODEL,
      instructions: parsed.data.system || "You are a helpful, concise assistant.",
      input: parsed.data.messages.map((m) => ({ role: m.role, content: m.content })),
      reasoning: { effort: "low" },
      max_output_tokens: 2000,
    });
    let text = "";
    for (const item of res.output ?? []) {
      if (item.type !== "message") continue;
      for (const c of item.content) {
        if (c.type === "output_text") text += c.text;
        else if (c.type === "refusal") text += c.refusal;
      }
    }
    if (!text.trim()) return json({ error: "The model returned no answer. Try rephrasing." }, 502);
    // deno-lint-ignore no-explicit-any
    const usage = (res as any).usage ?? {};
    return json({
      reply: text,
      model: MODEL,
      latency_ms: Date.now() - started,
      usage: {
        input_tokens: typeof usage.input_tokens === "number" ? usage.input_tokens : null,
        output_tokens: typeof usage.output_tokens === "number" ? usage.output_tokens : null,
      },
    });
  } catch (e) {
    if (e instanceof PaymentRequiredError) return json({ error: "AI credits are used up for this workspace." }, 402);
    if (e instanceof RateLimitError) return json({ error: "Too many requests right now. Wait a moment and try again." }, 429);
    if (e instanceof GatewayError) {
      console.error("serverless-inference gateway error", e.code, e.httpStatus, e.ids);
      return json({ error: "Inference is unavailable. Try again shortly." }, 502);
    }
    console.error("serverless-inference failure", e);
    return json({ error: "Inference is unavailable. Try again shortly." }, 500);
  }
});
