import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { encryptRuntimeToken, runtimeConnectionUrl } from "../_shared/runtime-connection.ts";
import { RuntimeAccessError } from "../_shared/runtime-access.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("status") }).strict(),
  z.object({ action: z.literal("disconnect") }).strict(),
  z.object({ action: z.literal("connect"), url: z.string().max(512), token: z.string().trim().min(1).max(4096) }).strict(),
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const env = (name: string) => Deno.env.get(name);
  const base = env("SUPABASE_URL"), anon = env("SUPABASE_ANON_KEY"), service = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!base || !anon || !service) return json({ error: "Connection service unavailable" }, 503);
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "Sign in to connect a GPU" }, 401);
  const client = createClient(base, anon, { global: { headers: { Authorization: auth } } });
  const { data, error } = await client.auth.getClaims(auth.slice(7));
  if (error || !data?.claims?.sub) return json({ error: "Unauthorized" }, 401);
  const userId = String(data.claims.sub);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Enter a valid address and gateway token" }, 400);
  const body = parsed.data;
  const db = createClient(base, service);
  try {
    if (body.action === "status") {
      const { data: row, error: readError } = await db.from("runtime_connections")
        .select("base_url,updated_at").eq("user_id", userId).maybeSingle();
      if (readError) return json({ error: "Could not read connection" }, 503);
      return json({ connected: !!row, url: row?.base_url ?? null, updated_at: row?.updated_at ?? null });
    }
    if (body.action === "disconnect") {
      const { error: deleteError } = await db.from("runtime_connections").delete().eq("user_id", userId);
      if (deleteError) return json({ error: "Could not disconnect" }, 503);
      return json({ connected: false });
    }
    const baseUrl = runtimeConnectionUrl(body.url);
    // Validate before replacing a working connection. No redirects; no forwarded
    // user credentials; provider-owned tunnel domain only. No secret logging.
    const response = await fetch(`${baseUrl}/v1/fabric/capacity?runtime=cuda`, {
      headers: { Authorization: `Bearer ${body.token}`, "X-LightOS-User-ID": userId, Accept: "application/json" },
      redirect: "error", signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return json({ error: response.status === 401 ? "Token mismatch. Enter the token from your GPU host." : "The GPU host did not accept the connection." }, 422);
    const capacity = await response.json();
    if (!Array.isArray(capacity.nodes) || !Number.isInteger(capacity.totals?.devices) || capacity.totals.devices < 0) {
      return json({ error: "This address did not return valid GPU inventory" }, 422);
    }
    const tokenCiphertext = await encryptRuntimeToken(body.token, userId, env);
    const { error: saveError } = await db.from("runtime_connections").upsert({
      user_id: userId, base_url: baseUrl, token_ciphertext: tokenCiphertext, updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (saveError) return json({ error: "Could not save connection" }, 503);
    return json({ connected: true, detected_devices: capacity.totals.devices });
  } catch (error) {
    return json({ error: error instanceof RuntimeAccessError ? error.message : "Could not reach your GPU host. Check that its tunnel is running." }, error instanceof RuntimeAccessError ? error.status : 502);
  }
});