// RDMA observability from the caller's own LightOS runtime gateway. Signed-in users only.
// Read-only: returns the gateway's raw trace events, derived summary, capture health and
// kernel port counters. Nothing here fills in or estimates missing readings.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { gatewayFetch } from "../_shared/runtime-gateway.ts";
import { RuntimeAccessError } from "../_shared/runtime-access.ts";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const label = z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_.:/@\- ]+$/);
const Body = z.object({
  window_seconds: z.number().int().min(60).max(3600).default(300),
  limit: z.number().int().min(1).max(500).default(200),
  filters: z.object({
    host: label.optional(), gpu: label.optional(), nic: label.optional(),
    op: label.optional(), workload: label.optional(), initiator: z.enum(["cpu", "gpu"]).optional(),
  }).strict().default({}),
}).strict();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
  const base = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_ANON_KEY");
  if (!base || !key) return json({ error: "Authentication unavailable" }, 503);
  const sb = createClient(base, key, { global: { headers: { Authorization: auth } } });
  const { data, error } = await sb.auth.getClaims(auth.slice(7));
  if (error || !data?.claims) return json({ error: "Unauthorized" }, 401);
  const user = { id: String(data.claims.sub), email: data.claims.email as string | undefined };

  let raw: unknown = {};
  try { raw = await req.json(); } catch { /* empty body -> defaults */ }
  const parsed = Body.safeParse(raw ?? {});
  if (!parsed.success) return json({ error: "Invalid request", fields: parsed.error.flatten().fieldErrors }, 400);
  const { window_seconds, limit, filters } = parsed.data;
  const qs = new URLSearchParams({ window_seconds: String(window_seconds) });
  for (const [k, v] of Object.entries(filters)) if (v) qs.set(k, v);

  try {
    const [overview, events] = await Promise.all([
      gatewayFetch(`/v1/rdma/overview?${qs}`, user),
      gatewayFetch(`/v1/rdma/events?${qs}&limit=${limit}`, user),
    ]);
    return json({ configured: true, overview, events, observed_at: new Date().toISOString() });
  } catch (e) {
    if (e instanceof RuntimeAccessError && e.status === 404) return json({ configured: false });
    const msg = (e as Error).message ?? "";
    if (e instanceof RuntimeAccessError && e.status === 403) {
      return json({ configured: true, cause: "plan_required", error: msg }, 403);
    }
    const cause = /invalid gateway token|unauthorized/i.test(msg) ? "token_mismatch"
      : /returned 404/.test(msg) ? "gateway_outdated"
      : e instanceof TypeError || /error sending request|connect|dns|timed out|tcp/i.test(msg) ? "unreachable"
      : "gateway_error";
    const errors: Record<string, string> = {
      token_mismatch: "Invalid gateway token",
      gateway_outdated: "Your GPU service does not have RDMA tracing yet. Update it on the GPU machine.",
      unreachable: "Your GPU service could not be reached. Check that it is running and retry.",
      gateway_error: "RDMA readings are unavailable. Retry shortly.",
    };
    return json({ configured: true, cause, error: errors[cause] }, 502);
  }
});
