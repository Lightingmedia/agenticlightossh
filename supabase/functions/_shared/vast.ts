// Vast.ai API through the Lovable connector gateway, plus the shared metering
// pass used by both the customer-facing function and the scheduled meter.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { chargeDelta, mustStopForBalance } from "./resale-pricing.ts";

const GATEWAY = "https://connector-gateway.lovable.dev/udc_vast_ai";

export class VastError extends Error {
  constructor(public status: number, public details: string) {
    super(`Vast.ai request failed [${status}]: ${details.slice(0, 500)}`);
  }
}

export async function vast(path: string, init: { method?: string; body?: unknown } = {}): Promise<any> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const connKey = Deno.env.get("UDC_VAST_AI_API_KEY");
  if (!lovableKey || !connKey) throw new VastError(503, "Vast.ai connection is not configured");
  const res = await fetch(`${GATEWAY}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": connKey,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Vast ${init.method ?? "GET"} ${path} -> ${res.status}: ${text.slice(0, 500)}`);
    throw new VastError(res.status, text);
  }
  try { return JSON.parse(text); } catch { return text; }
}

export async function balanceCents(admin: SupabaseClient, userId: string): Promise<number> {
  const { data, error } = await admin.from("compute_credit_ledger").select("amount_cents").eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).reduce((s, r) => s + (r.amount_cents as number), 0);
}

type Rental = {
  id: string; user_id: string; instance_id: number | null; status: string;
  price_per_hour: number | string; started_at: string; charged_cents: number;
};

/** Destroys the Vast machine (ignoring "already gone") and closes the rental. */
export async function endRental(admin: SupabaseClient, r: Rental, message: string) {
  if (r.instance_id) {
    try { await vast(`/api/v0/instances/${r.instance_id}/`, { method: "DELETE" }); }
    catch (e) { if (!(e instanceof VastError && e.status === 404)) throw e; }
  }
  await admin.from("compute_rentals").update({
    status: "stopped", status_message: message, ended_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }).eq("id", r.id);
}

/**
 * Charge active rentals for time used so far and stop any whose owner is out
 * of credit. Idempotent: each charge's reference is the cumulative total owed,
 * so overlapping runs cannot post the same minutes twice.
 */
export async function meterRentals(admin: SupabaseClient, userId?: string) {
  let q = admin.from("compute_rentals").select("id,user_id,instance_id,status,price_per_hour,started_at,charged_cents")
    .in("status", ["starting", "running"]);
  if (userId) q = q.eq("user_id", userId);
  const { data, error } = await q;
  if (error) throw error;
  const now = new Date();
  const stopped: string[] = [];
  for (const r of (data ?? []) as Rental[]) {
    const price = Number(r.price_per_hour);
    const delta = chargeDelta(price, new Date(r.started_at), now, r.charged_cents);
    if (delta > 0) {
      const total = r.charged_cents + delta;
      const { error: insErr } = await admin.from("compute_credit_ledger").insert({
        user_id: r.user_id, amount_cents: -delta, kind: "usage", rental_id: r.id,
        reference: `usage:${r.id}:${total}`, note: "GPU time",
      });
      if (!insErr) {
        await admin.from("compute_rentals").update({ charged_cents: total, updated_at: now.toISOString() })
          .eq("id", r.id).eq("charged_cents", r.charged_cents);
      } else if (!String(insErr.message).includes("duplicate")) {
        throw insErr;
      }
    }
    if (mustStopForBalance(await balanceCents(admin, r.user_id))) {
      await endRental(admin, r, "Stopped automatically: prepaid credit ran out");
      stopped.push(r.id);
    }
  }
  return { metered: data?.length ?? 0, stopped };
}
