// Switch an existing subscription to another plan immediately. Stripe bills
// (upgrade) or credits (downgrade) the prorated difference right away; the
// payments webhook then records the new plan as the source of truth.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";
import { PAID_PRICE_TIERS, PLAN_CHANGE_PRORATION, subscriptionTier } from "../_shared/launch-policy.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const Body = z.object({
  priceId: z.string().refine((p) => p in PAID_PRICE_TIERS, "Unknown plan"),
  environment: z.enum(["sandbox", "live"]),
}).strict();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return json({ error: "Sign in required" }, 401);

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, 400);
    const { priceId, environment } = parsed.data;
    const env = environment as StripeEnv;

    const { data: rows } = await admin.from("subscriptions")
      .select("stripe_subscription_id, price_id, status, current_period_end, created_at")
      .eq("user_id", user.id).eq("environment", env).order("created_at", { ascending: false });
    const current = (rows ?? []).find((r) => r.status !== "canceled" && subscriptionTier([r]) !== "free");
    if (!current) return json({ error: "No active plan to change. Choose a plan to subscribe." }, 404);
    const stripe = createStripeClient(env);
    const sub = await stripe.subscriptions.retrieve(current.stripe_subscription_id);
    if (sub.metadata?.userId !== user.id) return json({ error: "Subscription does not belong to this account" }, 403);
    if (current.price_id === priceId) {
      if (!sub.cancel_at_period_end) return json({ error: "You're already on this plan." }, 409);
      // Same plan after a cancellation: resume renewal instead of buying again.
      await stripe.subscriptions.update(sub.id, { cancel_at_period_end: false });
      await admin.from("subscriptions").update({ cancel_at_period_end: false, updated_at: new Date().toISOString() })
        .eq("stripe_subscription_id", sub.id).eq("environment", env);
      return json({ ok: true, plan: PAID_PRICE_TIERS[priceId], resumed: true });
    }
    const item = sub.items.data[0];
    const prices = await stripe.prices.list({ lookup_keys: [priceId] });
    const newPrice = prices.data[0];
    if (!item || !newPrice) return json({ error: "Plan not available" }, 404);

    const updated = await stripe.subscriptions.update(sub.id, {
      items: [{ id: item.id, price: newPrice.id }],
      proration_behavior: PLAN_CHANGE_PRORATION,
      payment_behavior: "error_if_incomplete",
      cancel_at_period_end: false,
    });
    const end = updated.items.data[0]?.current_period_end;
    await admin.from("subscriptions").update({
      price_id: priceId,
      status: updated.status,
      cancel_at_period_end: false,
      ...(end && { current_period_end: new Date(end * 1000).toISOString() }),
      updated_at: new Date().toISOString(),
    }).eq("stripe_subscription_id", sub.id).eq("environment", env);

    return json({ ok: true, plan: PAID_PRICE_TIERS[priceId] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("change-plan failed:", msg);
    // Card declines on the prorated charge surface here with Stripe's own message.
    return json({ error: msg }, 402);
  }
});
