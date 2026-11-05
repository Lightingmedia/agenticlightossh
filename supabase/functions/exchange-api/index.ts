// Compute Exchange API: catalog reads, server-validated workload plans with
// cost estimates, and owner-scoped workload tracking. No provisioning — a
// workload is an approved plan record, never an execution.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const Spec = z.object({
  workloadType: z.enum(["inference", "fine_tune", "batch"]),
  artifact: z.string().trim().min(1).max(512),
  runtime: z.string().trim().min(1).max(64),
  accelerator: z.string().trim().min(1).max(64),
  count: z.number().int().min(1).max(1024),
  minMemoryGb: z.number().int().min(0).max(4096),
  allowedRegions: z.array(z.string().trim().min(1).max(64)).max(32),
  budget: z.number().min(0).max(1_000_000),
  currency: z.string().trim().length(3),
  interruptible: z.boolean(),
  checkpoint: z.boolean(),
  hours: z.number().min(0.25).max(8760),
}).strict();

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("catalog") }).strict(),
  z.object({ action: z.literal("list") }).strict(),
  z.object({ action: z.literal("plan"), offer_id: z.string().uuid(), spec: Spec, idempotency_key: z.string().trim().min(8).max(128) }).strict(),
  z.object({ action: z.literal("cancel"), workload_id: z.string().uuid() }).strict(),
]);

const PLAN_TTL_MS = 10 * 60_000;
const round = (n: number) => Math.round(n * 100) / 100;

// Server-side eligibility + estimate. Mirrors src/lib/exchange/core.ts; the
// server is authoritative because the browser can be bypassed.
function evaluate(spec: z.infer<typeof Spec>, offer: Record<string, unknown>) {
  const reasons: string[] = [];
  if (offer.kind === "unsupported") reasons.push("Integration not supported yet");
  if (offer.kind === "quote_required") reasons.push("Price requires a provider quote");
  if (offer.accelerator !== spec.accelerator) reasons.push(`Accelerator ${offer.accelerator} ≠ requested ${spec.accelerator}`);
  if ((offer.memory_gb as number) < spec.minMemoryGb) reasons.push(`Memory ${offer.memory_gb} GB below required ${spec.minMemoryGb} GB`);
  if ((offer.count as number) < spec.count) reasons.push(`Only ${offer.count} accelerators available, need ${spec.count}`);
  if (spec.allowedRegions.length && !spec.allowedRegions.includes(offer.region as string)) reasons.push(`Region ${offer.region} not allowed`);
  if (offer.runtime !== spec.runtime) reasons.push(`Runtime ${offer.runtime} incompatible with ${spec.runtime}`);
  if (offer.purchase_model === "spot" && !spec.interruptible) reasons.push("Spot capacity requires an interruptible workload");
  if (offer.currency !== spec.currency) reasons.push(`Priced in ${offer.currency}, budget in ${spec.currency}`);

  let estimate: { low: number; high: number } | null = null;
  if (typeof offer.price_per_hour === "number") {
    const base = offer.price_per_hour * spec.count * spec.hours;
    estimate = { low: round(base), high: round(base * 1.25) }; // +25%: queueing, egress, billing lag
    if (reasons.length === 0 && estimate.high > spec.budget) reasons.push(`Upper estimate ${estimate.high} exceeds budget ${spec.budget}`);
  }
  return { eligible: reasons.length === 0, reasons, estimate };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const base = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY"), service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!base || !anon || !service) return json({ error: "Exchange service unavailable" }, 503);
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "Sign in to use the exchange" }, 401);
  const client = createClient(base, anon, { global: { headers: { Authorization: auth } } });
  const { data, error } = await client.auth.getClaims(auth.slice(7));
  if (error || !data?.claims?.sub) return json({ error: "Unauthorized" }, 401);
  const userId = String(data.claims.sub);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid request" }, 400);
  const body = parsed.data;
  const db = createClient(base, service);

  if (body.action === "catalog") {
    const { data: offers, error: readError } = await db.from("exchange_offers").select("*").order("provider");
    if (readError) return json({ error: "Could not read catalog" }, 503);
    return json({ offers });
  }

  if (body.action === "list") {
    const { data: workloads, error: readError } = await db.from("exchange_workloads")
      .select("*, exchange_workload_events(status, note, created_at)")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(100);
    if (readError) return json({ error: "Could not read workloads" }, 503);
    return json({ workloads });
  }

  if (body.action === "cancel") {
    const { data: wl, error: readError } = await db.from("exchange_workloads")
      .select("id,status").eq("id", body.workload_id).eq("user_id", userId).maybeSingle();
    if (readError || !wl) return json({ error: "Workload not found" }, 404);
    if (wl.status !== "approved") return json({ error: `Cannot cancel a workload in status ${wl.status}` }, 409);
    const { error: updateError } = await db.from("exchange_workloads")
      .update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", wl.id);
    if (updateError) return json({ error: "Could not cancel workload" }, 503);
    await db.from("exchange_workload_events").insert({ workload_id: wl.id, status: "cancelled", note: "Cancelled by owner" });
    return json({ status: "cancelled" });
  }

  // action === "plan"
  const { data: offer, error: offerError } = await db.from("exchange_offers").select("*").eq("id", body.offer_id).maybeSingle();
  if (offerError || !offer) return json({ error: "Offer not found" }, 404);
  const result = evaluate(body.spec, offer);
  if (!result.eligible || !result.estimate) return json({ error: "Offer is not eligible for this workload", reasons: result.reasons }, 422);

  const now = new Date();
  const { data: workload, error: insertError } = await db.from("exchange_workloads").insert({
    user_id: userId,
    offer_id: offer.id,
    spec: body.spec,
    estimate_low: result.estimate.low,
    estimate_high: result.estimate.high,
    max_spend: result.estimate.high,
    currency: body.spec.currency,
    status: "approved",
    idempotency_key: body.idempotency_key,
    expires_at: new Date(now.getTime() + PLAN_TTL_MS).toISOString(),
  }).select("id, status, estimate_low, estimate_high, max_spend, currency, expires_at, created_at").single();
  if (insertError) {
    if (insertError.code === "23505") return json({ error: "This plan was already submitted", duplicate: true }, 409);
    return json({ error: "Could not record plan" }, 503);
  }
  await db.from("exchange_workload_events").insert({
    workload_id: workload.id, status: "approved",
    note: "Plan approved. No resources were provisioned; this is a cost estimate record.",
  });
  return json({ workload, note: "Plan recorded. No resources were provisioned." }, 201);
});
