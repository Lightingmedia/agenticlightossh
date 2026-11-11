// GPU resale: customers top up prepaid credit, rent live Vast.ai machines on
// the LightOS Vast account at the provider price plus markup, and stop them.
// Every price is taken from a live Vast offer at request time.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import Stripe from "https://esm.sh/stripe@22.0.2";
import { type StripeEnv, createStripeClient, resolveOrCreateCustomer } from "../_shared/stripe.ts";
import { customerPricePerHour, requiredStartCents, validTopupCents, RESALE_MARKUP, MIN_TOPUP_CENTS, MAX_TOPUP_CENTS, TOPUP_STEP_CENTS } from "../_shared/resale-pricing.ts";
/** Registered one-time price: $10 of GPU credit per unit. */
const CREDIT_PRICE_ID = "gpu_credit_10";
import { VastError, balanceCents, endRental, meterRentals, vast } from "../_shared/vast.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const SSH_KEY = /^(ssh-ed25519|ssh-rsa|ecdsa-sha2-nistp(256|384|521)) [A-Za-z0-9+/=]{40,}( [^\r\n]{0,200})?$/;
const MAX_ACTIVE_RENTALS = 3;
const TRUSTED_ORIGINS = ["https://agentic.lightos.sh", "https://agenticlightossh.lovable.app"];

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("offers"),
    gpu_name: z.string().trim().max(40).regex(/^[A-Za-z0-9 _-]*$/).optional(),
    num_gpus: z.number().int().min(1).max(16).optional(),
    max_price: z.number().positive().max(200).optional(),
  }).strict(),
  z.object({ action: z.literal("account") }).strict(),
  z.object({
    action: z.literal("topup"),
    amount_cents: z.number().int(),
    environment: z.enum(["sandbox", "live"]).default("sandbox"),
    return_url: z.string().url().max(2048),
  }).strict(),
  z.object({ action: z.literal("rent"), offer_id: z.number().int().positive(), ssh_key: z.string().trim().max(2000) }).strict(),
  z.object({ action: z.literal("stop"), rental_id: z.string().uuid() }).strict(),
]);

type Offer = Record<string, any>;

function present(o: Offer) {
  const provider = Number(o.dph_total);
  return {
    offer_id: o.id as number,
    gpu_name: String(o.gpu_name ?? "GPU"),
    num_gpus: Number(o.num_gpus ?? 1),
    gpu_ram_gb: o.gpu_ram ? Math.round(Number(o.gpu_ram) / 1024) : null,
    cpu_cores: o.cpu_cores_effective ?? null,
    ram_gb: o.cpu_ram ? Math.round(Number(o.cpu_ram) / 1024) : null,
    disk_gb: o.disk_space ? Math.round(Number(o.disk_space)) : null,
    location: o.geolocation ?? null,
    reliability: o.reliability2 ?? o.reliability ?? null,
    datacenter: Boolean(o.hosting_type === 1 || o.datacenter),
    cuda: o.cuda_max_good ?? null,
    price_per_hour: customerPricePerHour(provider),
  };
}

async function searchOffers(filters: { gpu_name?: string; num_gpus?: number; max_price?: number; id?: number }) {
  const q: Record<string, unknown> = {
    limit: filters.id ? 1 : 40,
    type: "ondemand",
    verified: { eq: true },
    rentable: { eq: true },
    rented: { eq: false },
    reliability: { gte: 0.95 },
    order: [["dph_total", "asc"]],
  };
  if (filters.id) q.id = { eq: filters.id };
  if (filters.gpu_name) q.gpu_name = { eq: filters.gpu_name.replace(/\s+/g, " ") };
  if (filters.num_gpus) q.num_gpus = { eq: filters.num_gpus };
  if (filters.max_price) q.dph_total = { lte: filters.max_price / (1 + RESALE_MARKUP) };
  const res = await vast("/api/v0/bundles/", { method: "POST", body: q });
  return (Array.isArray(res?.offers) ? res.offers : []) as Offer[];
}

async function refreshStatus(admin: ReturnType<typeof createClient>, rentals: any[]) {
  for (const r of rentals) {
    if (!r.instance_id || !["starting", "running"].includes(r.status)) continue;
    try {
      const res = await vast(`/api/v0/instances/${r.instance_id}/`);
      const inst = res?.instances ?? res?.instance ?? null;
      if (!inst) continue;
      const actual = String(inst.actual_status ?? "");
      const patch: Record<string, unknown> = {
        ssh_host: inst.ssh_host ?? r.ssh_host, ssh_port: inst.ssh_port ?? r.ssh_port,
        status_message: inst.status_msg ? String(inst.status_msg).slice(0, 300) : r.status_message,
        updated_at: new Date().toISOString(),
      };
      if (actual === "running") patch.status = "running";
      if (["exited", "offline", "unknown"].includes(actual) && r.status === "running") {
        patch.status_message = `Provider reports machine ${actual}`;
      }
      await admin.from("compute_rentals").update(patch).eq("id", r.id);
      Object.assign(r, patch);
    } catch (e) {
      if (e instanceof VastError && e.status === 404) {
        await endRental(admin as any, r, "Machine no longer exists at the provider");
        r.status = "stopped";
      }
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "Sign in required" }, 401);
  const url = Deno.env.get("SUPABASE_URL")!;
  const authClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data: u, error: uErr } = await authClient.auth.getUser(auth.slice(7));
  if (uErr || !u?.user) return json({ error: "Sign in required" }, 401);
  const user = u.user;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  let raw: unknown;
  try { raw = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors }, 400);
  const body = parsed.data;

  try {
    switch (body.action) {
      case "offers": {
        const offers = await searchOffers(body);
        return json({ offers: offers.map(present), markup: RESALE_MARKUP, fetched_at: new Date().toISOString() });
      }

      case "account": {
        await meterRentals(admin, user.id);
        const [{ data: rentals }, { data: ledger }] = await Promise.all([
          admin.from("compute_rentals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
          admin.from("compute_credit_ledger").select("id,amount_cents,kind,note,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
        ]);
        await refreshStatus(admin, rentals ?? []);
        return json({
          balance_cents: await balanceCents(admin, user.id),
          rentals: rentals ?? [], ledger: ledger ?? [],
          limits: { min_topup_cents: MIN_TOPUP_CENTS, max_topup_cents: MAX_TOPUP_CENTS },
        });
      }

      case "topup": {
        if (!validTopupCents(body.amount_cents)) return json({ error: `Top-ups must be $${MIN_TOPUP_CENTS / 100}–$${MAX_TOPUP_CENTS / 100} in $${TOPUP_STEP_CENTS / 100} steps` }, 400);
        const origin = req.headers.get("origin") ?? "";
        const allowed = new Set([origin, ...TRUSTED_ORIGINS].filter(Boolean));
        const ret = new URL(body.return_url);
        if (!allowed.has(ret.origin)) return json({ error: "Invalid return URL" }, 400);
        const stripe = createStripeClient(body.environment as StripeEnv);
        const prices = await stripe.prices.list({ lookup_keys: [CREDIT_PRICE_ID], expand: ["data.product"] });
        const creditPrice = prices.data[0];
        if (!creditPrice || creditPrice.unit_amount !== TOPUP_STEP_CENTS) return json({ error: "GPU credit is not available for purchase yet" }, 503);
        const product = creditPrice.product as Stripe.Product;
        const customerId = await resolveOrCreateCustomer(stripe, { email: user.email ?? undefined, userId: user.id });
        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          ui_mode: "embedded_page",
          line_items: [{ price: creditPrice.id, quantity: body.amount_cents / TOPUP_STEP_CENTS }],
          customer: customerId,
          metadata: { userId: user.id, kind: "compute_topup", credit_cents: String(body.amount_cents), managed_payments: "true" },
          payment_intent_data: { description: product.name, metadata: { userId: user.id, kind: "compute_topup" } },
          return_url: `${ret.origin}${ret.pathname}?topup_session={CHECKOUT_SESSION_ID}`,
          managed_payments: { enabled: true },
        } as Stripe.Checkout.SessionCreateParams);
        return json({ clientSecret: session.client_secret });
      }

      case "rent": {
        if (!SSH_KEY.test(body.ssh_key)) return json({ error: "Paste a public SSH key (starts with ssh-ed25519, ssh-rsa or ecdsa-sha2-…)" }, 400);
        const { count } = await admin.from("compute_rentals").select("id", { count: "exact", head: true })
          .eq("user_id", user.id).in("status", ["starting", "running"]);
        if ((count ?? 0) >= MAX_ACTIVE_RENTALS) return json({ error: `You can run up to ${MAX_ACTIVE_RENTALS} machines at once` }, 409);

        const [offer] = await searchOffers({ id: body.offer_id });
        if (!offer) return json({ error: "That machine was just taken. Refresh the list and pick another." }, 409);
        const view = present(offer);
        const need = requiredStartCents(view.price_per_hour);
        const balance = await balanceCents(admin, user.id);
        if (balance < need) {
          return json({ error: `You need at least $${(need / 100).toFixed(2)} of credit (one hour) to start this machine.`, required_cents: need, balance_cents: balance }, 402);
        }

        const { data: rental, error: insErr } = await admin.from("compute_rentals").insert({
          user_id: user.id, offer_id: view.offer_id, gpu_name: view.gpu_name, num_gpus: view.num_gpus,
          geolocation: view.location, provider_price_per_hour: Number(offer.dph_total), price_per_hour: view.price_per_hour,
          status: "starting", status_message: "Requesting machine",
        }).select().single();
        if (insErr || !rental) throw insErr ?? new Error("Could not record rental");

        let created: any;
        try {
          created = await vast(`/api/v0/asks/${view.offer_id}/`, {
            method: "PUT",
            body: {
              image: "vastai/base-image:@vastai-automatic-tag", disk: 32, runtype: "ssh",
              label: `lightos-${rental.id.slice(0, 8)}`, cancel_unavail: true, target_state: "running",
            },
          });
        } catch (e) {
          const insufficient = e instanceof VastError && /credit|balance|payment/i.test(e.details);
          const msg = insufficient
            ? "LightOS can't start machines right now (provider account needs funding). You were not charged."
            : "The provider couldn't start this machine. You were not charged.";
          await admin.from("compute_rentals").update({ status: "failed", status_message: msg, ended_at: new Date().toISOString() }).eq("id", rental.id);
          return json({ error: msg }, 502);
        }
        const instanceId = Number(created?.new_contract);
        if (!created?.success || !instanceId) {
          await admin.from("compute_rentals").update({ status: "failed", status_message: "Provider did not confirm the machine. You were not charged.", ended_at: new Date().toISOString() }).eq("id", rental.id);
          return json({ error: "Provider did not confirm the machine. You were not charged." }, 502);
        }
        const startedAt = new Date().toISOString();
        await admin.from("compute_rentals").update({ instance_id: instanceId, started_at: startedAt, status_message: "Booting", updated_at: startedAt }).eq("id", rental.id);
        try {
          await vast(`/api/v0/instances/${instanceId}/ssh/`, { method: "POST", body: { ssh_key: body.ssh_key } });
        } catch {
          await admin.from("compute_rentals").update({ status_message: "Booting. SSH key not attached yet — stop and retry if you can't connect." }).eq("id", rental.id);
        }
        return json({ rental_id: rental.id, price_per_hour: view.price_per_hour });
      }

      case "stop": {
        const { data: r } = await admin.from("compute_rentals").select("*").eq("id", body.rental_id).eq("user_id", user.id).maybeSingle();
        if (!r) return json({ error: "Rental not found" }, 404);
        if (!["starting", "running"].includes(r.status)) return json({ ok: true, already: true });
        await meterRentals(admin, user.id);
        const { data: fresh } = await admin.from("compute_rentals").select("*").eq("id", r.id).single();
        await endRental(admin, fresh ?? r, "Stopped by you");
        return json({ ok: true });
      }
    }
  } catch (e) {
    console.error("compute-resale error", e);
    if (e instanceof VastError) return json({ error: "GPU provider request failed", status: e.status }, 502);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
