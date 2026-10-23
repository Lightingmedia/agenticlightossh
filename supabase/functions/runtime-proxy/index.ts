// MCP requests use the exact same owned-host and entitlement boundary as the UI.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { gatewayFetch } from "../_shared/runtime-gateway.ts";
import { RuntimeAccessError } from "../_shared/runtime-access.ts";
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const Body = z.object({
  path: z.string().max(1024).regex(/^\/v1\/(fabric\/(capacity|telemetry|state)|intents\/validate|deployments\/plan)(\?[^#]*)?$/),
  method: z.enum(["GET", "POST"]).default("GET"), body: z.record(z.unknown()).optional(),
}).strict();
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const base = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_ANON_KEY");
  if (!base || !key) return json({ error: "Authentication unavailable" }, 503);
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
  const client = createClient(base, key, { global: { headers: { Authorization: auth } } });
  const { data, error } = await client.auth.getClaims(auth.slice(7));
  if (error || !data?.claims?.sub) return json({ error: "Unauthorized" }, 401);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Unsupported runtime request" }, 400);
  try {
    return json(await gatewayFetch(parsed.data.path, { id: String(data.claims.sub) }, { method: parsed.data.method, body: parsed.data.body }));
  } catch (e) {
    return json({ error: e instanceof RuntimeAccessError ? e.message : "Runtime request unavailable" }, e instanceof RuntimeAccessError ? e.status : 502);
  }
});