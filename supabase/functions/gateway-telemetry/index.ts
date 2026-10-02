// Live GPU usage from the LightOS runtime gateway (DCGM-backed). Signed-in users only.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { gatewayConfig, gatewayFetch } from "../_shared/runtime-gateway.ts";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data, error } = await sb.auth.getClaims(auth.slice(7));
  if (error || !data?.claims) return json({ error: "Unauthorized" }, 401);
  const user = { id: String(data.claims.sub), email: data.claims.email as string | undefined };

  try {
    if (!gatewayConfig()) return json({ configured: false });
  } catch (e) {
    return json({ configured: false, error: (e as Error).message });
  }

  const url = new URL(req.url);
  const win = Math.min(3600, Math.max(10, Number(url.searchParams.get("window_seconds") ?? 60) || 60));
  try {
    const [capacity, telemetry] = await Promise.all([
      gatewayFetch("/v1/fabric/capacity?runtime=cuda", user),
      gatewayFetch(`/v1/fabric/telemetry?window_seconds=${win}`, user),
    ]);
    return json({ configured: true, capacity, telemetry });
  } catch (e) {
    return json({ configured: true, error: (e as Error).message }, 502);
  }
});
