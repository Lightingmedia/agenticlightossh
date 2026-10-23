// CUDA PDK node enrollment.
//  POST {action:"create"}            (user JWT)  -> one-time setup code, 15 min expiry
//  POST {action:"status", id}        (user JWT)  -> real node report + gateway result
//  POST {action:"report", code, report} (setup code, called by `lightos cuda`)
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { gatewayFetch } from "../_shared/runtime-gateway.ts";
import { runtimeAccess } from "../_shared/runtime-access.ts";
import { MONITORING_LIMITS, requiresUpgrade } from "../_shared/launch-policy.ts";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const admin = () => {
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Enrollment service unavailable");
  return createClient(url, key);
};

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function newCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const s = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}
async function sha256(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s.toUpperCase().trim()));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("");
}

const Ver = z.object({ present: z.boolean(), version: z.string().max(64).nullable() });
const Report = z.object({
  hostname: z.string().max(255),
  os: z.string().max(255),
  driver: Ver,
  nvcc: Ver,
  cudart: Ver,
  gpus: z.array(z.object({
    index: z.number().int().min(0).max(1024),
    name: z.string().max(128),
    uuid: z.string().max(128).nullable(),
    memory_total_mib: z.number().nonnegative().max(10_000_000).nullable(),
    compute_capability: z.string().max(16).nullable(),
  })).max(64),
});
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create") }),
  z.object({ action: z.literal("status"), id: z.string().uuid() }),
  z.object({ action: z.literal("report"), code: z.string().min(4).max(20), report: Report }),
]);

async function requireUser(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !key) return null;
  const sb = createClient(url, key, {
    global: { headers: { Authorization: auth } },
  });
  const { data, error } = await sb.auth.getClaims(auth.slice(7));
  if (error || !data?.claims?.sub) return null;
  return { id: String(data.claims.sub), email: data.claims.email as string | undefined };
}

async function gatewayState(userId: string) {
  try { await runtimeAccess(userId, (name) => Deno.env.get(name)); return "configured"; } catch { return "not_configured"; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let raw: unknown;
  try { raw = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
  const body = parsed.data;
  const db = admin();

  if (body.action === "report") {
    const hash = await sha256(body.code);
    const { data: row } = await db.from("node_enrollments").select("*").eq("code_hash", hash).maybeSingle();
    if (!row || row.status !== "pending" || new Date(row.expires_at) < new Date()) {
      return json({ error: "Setup code is invalid, expired, or already used" }, 401);
    }
    let gateway_status = "not_configured";
    let gateway_message: string | null = "No LightOS runtime gateway is connected yet";
    // Claim once before forwarding; concurrent reports cannot reuse the code.
    const { data: claimed } = await db.from("node_enrollments").update({ status: "reported" })
      .eq("id", row.id).eq("status", "pending").gt("expires_at", new Date().toISOString()).select("id").maybeSingle();
    if (!claimed) return json({ error: "Setup code is invalid, expired, or already used" }, 401);
    if (await gatewayState(row.user_id) === "configured") {
      try {
        const { data: u } = await db.from("profiles").select("email").eq("user_id", row.user_id).maybeSingle();
        await gatewayFetch("/v1/nodes/register", { id: row.user_id, email: u?.email ?? undefined }, {
          method: "POST",
          body: { enrollment_id: row.id, ...body.report },
        });
        gateway_status = "accepted";
        gateway_message = null;
      } catch (e) {
        gateway_status = "error";
        gateway_message = "Gateway registration failed. Check the connection and retry with a new code.";
      }
    }
    await db.from("node_enrollments").update({
      status: "reported", report: body.report, gateway_status, gateway_message, reported_at: new Date().toISOString(),
    }).eq("id", row.id);
    return json({ ok: true, gateway_status, gateway_message });
  }

  const user = await requireUser(req);
  if (!user) return json({ error: "Unauthorized" }, 401);

  if (body.action === "create") {
    const code = newCode();
    const expires_at = new Date(Date.now() + 15 * 60_000).toISOString();
    const { data, error } = await db.from("node_enrollments")
      .insert({ user_id: user.id, code_hash: await sha256(code), expires_at }).select("id").single();
    if (error) return json({ error: "Could not create setup code" }, 500);
    return json({ id: data.id, code, expires_at, gateway: await gatewayState(user.id) });
  }

  const { data: row } = await db.from("node_enrollments")
    .select("id,status,report,gateway_status,gateway_message,reported_at,expires_at")
    .eq("id", body.id).eq("user_id", user.id).maybeSingle();
  if (!row) return json({ error: "Not found" }, 404);
  let tier: "free" | "starter" | "pro" | "enterprise" = "free";
  try { tier = (await runtimeAccess(user.id, (name) => Deno.env.get(name))).tier; } catch { /* fail closed */ }
  const report = row.report as { gpus?: unknown[] } | null;
  const detected = report?.gpus?.length ?? 0;
  return json({ ...row, report: report ? { ...report, gpus: report.gpus?.slice(0, MONITORING_LIMITS[tier]) } : null,
    entitlement: { tier, detected_devices: detected, upgrade_required: requiresUpgrade(detected, tier) }, gateway: await gatewayState(user.id) });
});
