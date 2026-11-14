// Site-wide help chat. Public (signed-out visitors can use it), rate limited per visitor.
// "ask" answers from a fixed product brief; "handoff" stores a message for the admin inbox.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { generateResponse, GatewayError, PaymentRequiredError, RateLimitError } from "npm:@lovable.dev/ai-gateway@0.1.11";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const MODEL = "openai/gpt-6-astra";

const INSTRUCTIONS = `You are the help assistant on the LightOS website (agentic.lightos.sh).
LightRail AI is the company. LightOS is its agent-first infrastructure product and the workspace customers sign in to.

What it is today (early access):
- GPU monitoring and agent planning for AI infrastructure teams who already own or rent GPUs (NVIDIA CUDA focus, vendor-neutral where supported).
- Real GPU readings need a small runtime gateway running on the customer's GPU machine; the dashboard shows "unavailable" rather than invented numbers when no machine is connected.
- A planning assistant helps size memory, parallelism, NCCL/InfiniBand issues and cost estimates. Its numbers are estimates, not measurements.
- GPU Cloud: customers can rent GPU machines through LightOS using prepaid credits (sold in $10 units). Prices come from a live provider quote at booking time; machines stop automatically when credit runs out.
- The browser desktop and terminal at /os is a simulated workspace, not a real server shell.

Plans (monthly): Free $0 (monitor 1 GPU, monitoring only, no card needed); Starter $49 (2 GPUs, agent planning early access, email support; $470/yr); Pro $149 (unlimited GPU monitoring, agent workflow tools, Agent Studio, priority support; $1,430/yr); Enterprise $499 (custom integrations, terms agreed separately). GPU compute is always billed separately. No free trial on paid plans; cancelling keeps access until the paid period ends; plan changes apply immediately with prorated charges.

Getting started: create a free account at /auth, then open Dashboard → Gateway Setup and follow the steps to connect one GPU machine. Pricing is at /pricing, docs at /docs, privacy at /privacy.

Rules:
- Only answer questions about LightOS, GPU infrastructure, and using this site. Politely decline unrelated tasks.
- Never claim certifications (e.g. SOC 2), guaranteed savings, utilization improvements, uptime or features not listed above. If you don't know, say so.
- You cannot see the visitor's account, billing, or machines. For account-specific, billing, refund, sales, partnership or legal questions, or whenever the visitor wants a human, tell them to press "Talk to a person" in this chat so the team can reply by email.
- Do not mention code hosting sites or internal vendors. Do not describe LightOS as a job scheduler.
- Keep answers short: 2–6 sentences or a brief list. Use markdown sparingly.`;

const Msg = z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(2000) }).strict();

const Ask = z.object({ action: z.literal("ask"), messages: z.array(Msg).min(1).max(16) }).strict();
const Handoff = z.object({
  action: z.literal("handoff"),
  name: z.string().trim().max(100).optional(),
  email: z.string().trim().email().max(255),
  message: z.string().trim().min(1).max(4000),
  transcript: z.array(Msg).max(30).default([]),
  page: z.string().trim().max(300).optional(),
}).strict();
const Body = z.discriminatedUnion("action", [Ask, Handoff]);

async function visitorKey(req: Request) {
  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`support:${ip}`));
  return Array.from(new Uint8Array(digest)).slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let raw: unknown;
  try { raw = await req.json(); } catch { return json({ error: "Invalid request" }, 400); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return json({ error: "Please check your message and try again.", fields: parsed.error.flatten().fieldErrors }, 400);
  const body = parsed.data;

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const key = await visitorKey(req);
  const [limit, windowSeconds] = body.action === "ask" ? [30, 600] : [5, 3600];
  const { data: allowed, error: rlError } = await admin.rpc("support_rate_hit", { _key: `${body.action}:${key}`, _limit: limit, _window_seconds: windowSeconds });
  if (rlError) { console.error("support-chat rate limit error", rlError.message); return json({ error: "Chat is unavailable right now. Try again shortly." }, 500); }
  if (!allowed) return json({ error: "You've sent a lot of messages. Please wait a few minutes and try again." }, 429);

  if (body.action === "handoff") {
    let userId: string | null = null;
    const auth = req.headers.get("Authorization");
    if (auth?.startsWith("Bearer ")) {
      const { data } = await admin.auth.getClaims(auth.slice(7));
      const sub = data?.claims?.sub;
      if (typeof sub === "string" && data?.claims?.role === "authenticated") userId = sub;
    }
    const { error } = await admin.from("support_requests").insert({
      user_id: userId, name: body.name || null, email: body.email, message: body.message,
      transcript: body.transcript, page: body.page ?? null,
    });
    if (error) { console.error("support-chat insert error", error.message); return json({ error: "We couldn't send your message. Try again shortly." }, 500); }
    return json({ ok: true });
  }

  if (body.messages.at(-1)?.role !== "user") return json({ error: "The last message must be from you." }, 400);
  try {
    const res = await generateResponse({
      model: MODEL,
      instructions: INSTRUCTIONS,
      input: body.messages.map((m) => ({ role: m.role, content: m.content })),
      reasoning: { effort: "low" },
      max_output_tokens: 700,
    });
    let text = "";
    for (const item of res.output ?? []) {
      if (item.type !== "message") continue;
      for (const c of item.content) {
        if (c.type === "output_text") text += c.text;
        else if (c.type === "refusal") text += c.refusal;
      }
    }
    if (!text.trim()) return json({ error: "I couldn't come up with an answer. Try rephrasing, or talk to a person." }, 502);
    return json({ reply: text });
  } catch (e) {
    if (e instanceof PaymentRequiredError || e instanceof RateLimitError) {
      return json({ error: "The assistant is busy right now. You can still talk to a person." }, 503);
    }
    if (e instanceof GatewayError) console.error("support-chat gateway error", e.code, e.httpStatus, e.ids);
    else console.error("support-chat failure", e);
    return json({ error: "The assistant is unavailable. You can still talk to a person." }, 502);
  }
});
