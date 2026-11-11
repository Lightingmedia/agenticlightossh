import { loadStripe, Stripe } from "@stripe/stripe-js";
import { supabase } from "@/integrations/supabase/client";

type StripeEnv = 'sandbox' | 'live';

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;

// Display-only checks must tolerate an unfinished payments setup.
export function getConfiguredStripeEnvironment(): StripeEnv | null {
  if (clientToken?.startsWith('pk_test_')) return 'sandbox';
  if (clientToken?.startsWith('pk_live_')) return 'live';
  return null;
}

// Payment actions still fail closed; never silently fall back to live.
function paymentsEnvironment(): StripeEnv {
  const environment = getConfiguredStripeEnvironment();
  if (environment) return environment;
  throw new Error("Payments are not configured for this build yet. Complete go-live to accept payments.");
}

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    paymentsEnvironment();
    stripePromise = loadStripe(clientToken as string);
  }
  return stripePromise;
}

export async function getStripePriceId(priceId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("get-stripe-price", {
    body: { priceId, environment: paymentsEnvironment() },
  });
  if (error || !data?.stripeId) {
    throw new Error(`Failed to resolve price: ${priceId}`);
  }
  return data.stripeId;
}

export function getStripeEnvironment(): StripeEnv {
  return paymentsEnvironment();
}
