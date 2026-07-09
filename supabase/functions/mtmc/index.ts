// MTMC (Multi-Task Model Consolidation) Engine
// Single-pass parse + classify + slot-fill in one structured JSON call.
// Fast/cheap primary model; falls back to a stronger model when confidence < threshold.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const PRIMARY_MODEL = "google/gemini-3.1-flash-lite"; // cheapest capable
const FALLBACK_MODEL = "google/gemini-3.1-pro-preview"; // stronger reasoning
const DEFAULT_THRESHOLD = 0.72;

const SYSTEM_PROMPT = `You are the LightOS MTMC (Multi-Task Model Consolidation) engine.
In a SINGLE structured JSON response, perform ALL of these tasks at once for the user's utterance:

1) intent   — one short snake_case label describing the operator's goal
2) domain   — one of: fabric, thermal, cost, security, inference, training, general
3) slots    — object of named entities extracted from the utterance (free-form keys/values)
4) actions  — array of {tool, args} the LightOS orchestrator should invoke, in order
5) reply    — short natural-language answer for the operator
6) confidence — number in [0,1] reflecting your certainty in the above

Rules:
- Output ONLY valid JSON matching the schema. No prose, no code fences.
- If the utterance is ambiguous, lower confidence and put a clarifying question in "reply".
- Prefer empty arrays/objects over guesses. Never invent tool names.`;

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    intent: { type: "string" },
    domain: { type: "string", enum: ["fabric", "thermal", "cost", "security", "inference", "training", "general"] },
    slots: { type: "object", additionalProperties: true },
    actions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { tool: { type: "string" }, args: { type: "object", additionalProperties: true } },
        required: ["tool", "args"],
      },
    },
    reply: { type: "string" },
    confidence: { type: "number" },
  },
  required: ["intent", "domain", "slots", "actions", "reply", "confidence"],
};

// Approximate cost per 1K tokens (illustrative, for cost logging).
const COST_PER_1K = {
  "google/gemini-3.1-flash-lite": 0.00019,
  "google/gemini-3-flash-preview": 0.0004,
  "google/gemini-3.1-pro-preview": 0.005,
} as Record<string, number>;

interface GatewayCall {
  model: string;
  parsed: any;
  usage: { prompt: number; completion: number; total: number };
  raw: string;
}

async function callGateway(model: string, text: string, apiKey: string): Promise<GatewayCall> {
  const body = {
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: text },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "mtmc_output", strict: true, schema: RESPONSE_SCHEMA },
    },
  };
  const resp = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(`Gateway ${resp.status}: ${detail}`);
  }
  const data = await resp.json();
  const raw = data?.choices?.[0]?.message?.content ?? "{}";
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { intent: "unknown", domain: "general", slots: {}, actions: [], reply: raw, confidence: 0 };
  }
  const usage = {
    prompt: data?.usage?.prompt_tokens ?? 0,
    completion: data?.usage?.completion_tokens ?? 0,
    total: data?.usage?.total_tokens ?? 0,
  };
  return { model, parsed, usage, raw };
}

function estimateCost(model: string, totalTokens: number): number {
  const rate = COST_PER_1K[model] ?? 0.001;
  return +((rate * totalTokens) / 1000).toFixed(6);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: claims, error: claimsErr } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
  if (claimsErr || !claims?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { text?: string; threshold?: number; force_model?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const text = (body.text ?? "").trim();
  if (!text || text.length > 4000) {
    return new Response(JSON.stringify({ error: "text is required (1..4000 chars)" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const threshold = typeof body.threshold === "number" ? body.threshold : DEFAULT_THRESHOLD;
  const startedAt = Date.now();

  try {
    const primary = await callGateway(body.force_model ?? PRIMARY_MODEL, text, apiKey);
    const confidence = Number(primary.parsed?.confidence ?? 0);
    const escalated = !body.force_model && confidence < threshold;

    let final = primary;
    let fallback: GatewayCall | null = null;
    if (escalated) {
      fallback = await callGateway(FALLBACK_MODEL, text, apiKey);
      // Keep whichever confidence is higher.
      if (Number(fallback.parsed?.confidence ?? 0) >= confidence) final = fallback;
    }

    const costPrimary = estimateCost(primary.model, primary.usage.total);
    const costFallback = fallback ? estimateCost(fallback.model, fallback.usage.total) : 0;

    const payload = {
      result: final.parsed,
      routing: {
        primary_model: primary.model,
        primary_confidence: confidence,
        escalated,
        final_model: final.model,
        threshold,
      },
      cost: {
        primary_usd: costPrimary,
        fallback_usd: costFallback,
        total_usd: +(costPrimary + costFallback).toFixed(6),
        // Baseline: cost if we had always used the fallback for every request.
        baseline_always_fallback_usd: estimateCost(FALLBACK_MODEL, primary.usage.total),
      },
      tokens: {
        primary: primary.usage,
        fallback: fallback?.usage ?? null,
      },
      latency_ms: Date.now() - startedAt,
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = /429/.test(msg) ? 429 : /402/.test(msg) ? 402 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
