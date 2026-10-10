// Compute provider connections for LightOS.
//  POST {action:"catalog"}                                       (public)  -> provider catalog, no secrets
//  POST {action:"list"}                                          (user JWT) -> caller's connections
//  POST {action:"connect", providerId, authMethod, label, credentials}  -> validate, vault, store
//  POST {action:"test", id}                                      (user JWT) -> re-validate stored credentials
//  POST {action:"inventory", id}                                 (user JWT) -> normalized GPU inventory
//  POST {action:"disconnect", id}                                (user JWT) -> delete row + vault secret
//
// Credentials are accepted once, validated server-side, written to Supabase
// Vault and never returned. Launch/terminate is NOT exposed here: Aurora
// Fabric OS (runtime gateway) is the sole execution authority.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { gatewayConfig, gatewayFetch } from "../_shared/runtime-gateway.ts";
import { getAuthMethod, getProvider, PROVIDERS, splitCredentials } from "../_shared/provider-catalog.ts";
import { ADAPTERS } from "../_shared/providers/adapters.ts";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const admin = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const MAX_CONNECTIONS_PER_USER = 50;
const PUBLIC_COLUMNS =
  "id,provider_id,auth_method,label,account_ref,identity,status,status_message,validation_mode,launch_enabled,last_validated_at,created_at,updated_at";

const Id = z.string().uuid();
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("catalog") }),
  z.object({ action: z.literal("list") }),
  z.object({
    action: z.literal("connect"),
    providerId: z.string().min(1).max(64),
    authMethod: z.string().min(1).max(64),
    label: z.string().trim().min(1).max(120),
    credentials: z.record(z.string().max(20_000)).refine((o) => Object.keys(o).length <= 20),
  }),
  z.object({ action: z.literal("test"), id: Id }),
  z.object({ action: z.literal("inventory"), id: Id }),
  z.object({ action: z.literal("disconnect"), id: Id }),
]);

type User = { id: string; email?: string };

async function requireUser(req: Request): Promise<User | null> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data, error } = await sb.auth.getClaims(auth.slice(7));
  if (error || !data?.claims?.sub) return null;
  return { id: String(data.claims.sub), email: data.claims.email as string | undefined };
}

function errMessage(e: unknown) {
  return (e instanceof Error ? e.message : "Provider request failed").slice(0, 400);
}

type Outcome = { status: "connected" | "awaiting_gateway" | "error"; identity: string | null; message: string | null };

/** Validate credentials directly or via the Aurora runtime gateway. */
async function validate(
  user: User,
  providerId: string,
  authMethod: string,
  creds: Record<string, string>,
  connectionId: string | null,
): Promise<Outcome> {
  const provider = getProvider(providerId)!;
  if (provider.validation === "direct") {
    const adapter = ADAPTERS[providerId];
    if (!adapter) return { status: "error", identity: null, message: "No adapter for this provider yet" };
    try {
      const v = await adapter.validate(creds);
      return { status: "connected", identity: v.identity, message: v.message ?? null };
    } catch (e) {
      return { status: "error", identity: null, message: errMessage(e) };
    }
  }
  let configured = false;
  try { configured = gatewayConfig() !== null; } catch { configured = false; }
  if (!configured) {
    return { status: "awaiting_gateway", identity: null, message: "Credentials stored. Validation runs once your Aurora runtime gateway is connected." };
  }
  try {
    const r = await gatewayFetch("/v1/providers/validate", user, {
      method: "POST",
      body: { connectionId, providerId, authMethod, credentials: creds },
    });
    return r?.ok
      ? { status: "connected", identity: r.identity ?? null, message: null }
      : { status: "error", identity: null, message: String(r?.message ?? "Gateway rejected the credentials").slice(0, 400) };
  } catch (e) {
    return { status: "error", identity: null, message: errMessage(e) };
  }
}

async function audit(db: ReturnType<typeof admin>, user: User, row: { id: string | null; provider_id: string }, action: string, ok: boolean, message: string | null) {
  await db.from("provider_events").insert({
    connection_id: row.id, user_id: user.id, provider_id: row.provider_id, action, ok, message: message?.slice(0, 400) ?? null,
  });
}

async function loadCreds(db: ReturnType<typeof admin>, row: { secret_id: string | null; account_ref: Record<string, string> }) {
  let secret: Record<string, string> = {};
  if (row.secret_id) {
    const { data, error } = await db.rpc("provider_secret_get", { p_id: row.secret_id });
    if (error || !data) throw new Error("Stored credential could not be read");
    secret = JSON.parse(data as string);
  }
  return { ...row.account_ref, ...secret };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let raw: unknown;
  try { raw = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return json({ error: "Invalid request", fields: Object.keys(parsed.error.flatten().fieldErrors) }, 400);
  const body = parsed.data;

  if (body.action === "catalog") return json({ providers: PROVIDERS });

  const user = await requireUser(req);
  if (!user) return json({ error: "Unauthorized" }, 401);
  const db = admin();

  if (body.action === "list") {
    const { data, error } = await db.from("provider_connections").select(PUBLIC_COLUMNS)
      .eq("user_id", user.id).order("created_at", { ascending: true });
    if (error) return json({ error: "Could not load connections" }, 500);
    return json({ connections: data, gateway: (() => { try { return gatewayConfig() ? "configured" : "not_configured"; } catch { return "not_configured"; } })() });
  }

  if (body.action === "connect") {
    const provider = getProvider(body.providerId);
    const method = getAuthMethod(body.providerId, body.authMethod);
    if (!provider || !method) return json({ error: "Unknown provider or auth method" }, 400);

    const { count } = await db.from("provider_connections").select("id", { count: "exact", head: true }).eq("user_id", user.id);
    if ((count ?? 0) >= MAX_CONNECTIONS_PER_USER) return json({ error: "Connection limit reached" }, 409);

    const { secret, accountRef, missing, invalid } = splitCredentials(method, body.credentials);
    if (missing.length || invalid.length) return json({ error: "Missing or invalid fields", missing, invalid }, 400);

    const outcome = await validate(user, provider.id, method.id, { ...accountRef, ...secret }, null);
    if (outcome.status === "error") {
      await audit(db, user, { id: null, provider_id: provider.id }, "connect", false, outcome.message);
      return json({ error: outcome.message ?? "Validation failed", status: "error" }, 422);
    }

    let secretId: string | null = null;
    if (Object.keys(secret).length) {
      const { data, error } = await db.rpc("provider_secret_put", {
        p_secret: JSON.stringify(secret),
        p_name: `provider:${user.id}:${crypto.randomUUID()}`,
      });
      if (error || !data) return json({ error: "Could not store credential securely" }, 500);
      secretId = data as string;
    }

    const { data: row, error } = await db.from("provider_connections").insert({
      user_id: user.id, provider_id: provider.id, auth_method: method.id, label: body.label,
      account_ref: accountRef, identity: outcome.identity, status: outcome.status, status_message: outcome.message,
      validation_mode: provider.validation, secret_id: secretId,
      last_validated_at: outcome.status === "connected" ? new Date().toISOString() : null,
    }).select(PUBLIC_COLUMNS).single();
    if (error) {
      if (secretId) await db.rpc("provider_secret_delete", { p_id: secretId });
      return json({ error: error.code === "23505" ? "A connection with this label already exists" : "Could not save connection" }, error.code === "23505" ? 409 : 500);
    }
    await audit(db, user, row, "connect", true, outcome.identity);
    return json({ connection: row });
  }

  // Remaining actions operate on one of the caller's own connections.
  const { data: row } = await db.from("provider_connections").select("*").eq("id", body.id).eq("user_id", user.id).maybeSingle();
  if (!row) return json({ error: "Not found" }, 404);

  if (body.action === "disconnect") {
    if (row.secret_id) await db.rpc("provider_secret_delete", { p_id: row.secret_id });
    await db.from("provider_connections").delete().eq("id", row.id);
    await audit(db, user, { id: null, provider_id: row.provider_id }, "disconnect", true, row.label);
    return json({ ok: true });
  }

  let creds: Record<string, string>;
  try { creds = await loadCreds(db, row); } catch (e) { return json({ error: errMessage(e) }, 500); }

  if (body.action === "test") {
    const outcome = await validate(user, row.provider_id, row.auth_method, creds, row.id);
    const { data: updated } = await db.from("provider_connections").update({
      status: outcome.status, identity: outcome.identity ?? row.identity, status_message: outcome.message,
      last_validated_at: outcome.status === "connected" ? new Date().toISOString() : row.last_validated_at,
    }).eq("id", row.id).select(PUBLIC_COLUMNS).single();
    await audit(db, user, row, "test", outcome.status !== "error", outcome.message ?? outcome.identity);
    return json({ connection: updated });
  }

  // inventory
  const provider = getProvider(row.provider_id);
  try {
    let items;
    if (provider?.validation === "direct" && ADAPTERS[row.provider_id]) {
      items = await ADAPTERS[row.provider_id].inventory(creds);
    } else {
      const r = await gatewayFetch(`/v1/providers/${encodeURIComponent(row.id)}/inventory`, user, {
        method: "POST", body: { providerId: row.provider_id, authMethod: row.auth_method, credentials: creds },
      });
      items = r?.items ?? [];
    }
    await audit(db, user, row, "inventory", true, `${items.length} items`);
    return json({ items, fetchedAt: new Date().toISOString() });
  } catch (e) {
    await audit(db, user, row, "inventory", false, errMessage(e));
    return json({ error: errMessage(e) }, 502);
  }
});
