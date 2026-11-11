import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@22.0.2";
import { type StripeEnv, createStripeClient, resolveOrCreateCustomer } from "../_shared/stripe.ts";
import { CHECKOUT_TRIAL_DAYS, subscriptionTier } from "../_shared/launch-policy.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data: userData, error: authErr } = await authClient.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authedUser = userData.user;

    const { priceId, quantity, returnUrl, environment } = await req.json();
    if (!priceId || typeof priceId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(priceId)) {
      return new Response(JSON.stringify({ error: "Invalid priceId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const customerEmail = authedUser.email;
    const userId = authedUser.id;

    // Validate returnUrl against an allow-list of trusted origins to prevent
    // open-redirect abuse via Stripe's post-checkout redirect.
    const requestOrigin = req.headers.get("origin") ?? "";
    const allowedOrigins = new Set(
      [
        requestOrigin,
        "https://agentic.lightos.sh",
        "https://agenticlightossh.lovable.app",
      ].filter(Boolean),
    );
    let safeReturnUrl: string | null = null;
    if (returnUrl) {
      if (typeof returnUrl !== "string") {
        return new Response(JSON.stringify({ error: "Invalid returnUrl" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      try {
        const parsed = new URL(returnUrl);
        if (!allowedOrigins.has(parsed.origin)) {
          return new Response(JSON.stringify({ error: "Invalid returnUrl" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        safeReturnUrl = parsed.toString();
      } catch {
        return new Response(JSON.stringify({ error: "Invalid returnUrl" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (environment !== "sandbox" && environment !== "live") {
      return new Response(JSON.stringify({ error: "Invalid environment" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const env = environment as StripeEnv;
    const stripe = createStripeClient(env);

    const prices = await stripe.prices.list({ lookup_keys: [priceId] });
    if (!prices.data.length) {
      return new Response(JSON.stringify({ error: "Price not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const stripePrice = prices.data[0];
    const isRecurring = stripePrice.type === "recurring";

    // One plan per account: existing subscribers change plans instead.
    if (isRecurring) {
      const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: subs } = await admin.from("subscriptions")
        .select("price_id, status, current_period_end").eq("user_id", userId).eq("environment", env);
      if (subscriptionTier((subs ?? []).filter((r) => r.status !== "canceled")) !== "free") {
        return new Response(JSON.stringify({ error: "You already have a plan. Use Change plan instead." }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    let productDescription: string | undefined;
    if (!isRecurring) {
      const productId = typeof stripePrice.product === "string" ? stripePrice.product : stripePrice.product.id;
      productDescription = (await stripe.products.retrieve(productId)).name;
    }

    const customerId = await resolveOrCreateCustomer(stripe, { email: customerEmail ?? undefined, userId });

    const sessionParams = {
      line_items: [{ price: stripePrice.id, quantity: quantity || 1 }],
      mode: isRecurring ? "subscription" : "payment",
      ui_mode: "embedded_page",
      return_url: safeReturnUrl || `${requestOrigin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
      customer: customerId,
      metadata: { userId, managed_payments: "true" },
      managed_payments: { enabled: true },
      ...(!isRecurring && { payment_intent_data: { description: productDescription } }),
      ...(isRecurring && { subscription_data: { ...(CHECKOUT_TRIAL_DAYS > 0 && { trial_period_days: CHECKOUT_TRIAL_DAYS }), metadata: { userId } } }),
    } as Stripe.Checkout.SessionCreateParams;

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
