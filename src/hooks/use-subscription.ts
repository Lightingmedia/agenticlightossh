import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;
const environment = clientToken?.startsWith("pk_test_") ? "sandbox" : "live";

export type SubscriptionTier = "free" | "starter" | "pro" | "enterprise";

interface Subscription {
  id: string;
  status: string;
  product_id: string;
  price_id: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

// Map Stripe product IDs to tiers — these are human-readable price IDs
const PRICE_TO_TIER: Record<string, SubscriptionTier> = {
  starter_monthly: "starter",
  starter_yearly: "starter",
  pro_monthly: "pro",
  pro_yearly: "pro",
  enterprise_monthly: "enterprise",
};

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [tier, setTier] = useState<SubscriptionTier>("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function fetch() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("environment", environment)
        .in("status", ["active", "trialing"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setSubscription(data as Subscription);
        setTier(PRICE_TO_TIER[data.price_id] || "pro");
      } else {
        setSubscription(null);
        setTier("free");
      }
      setLoading(false);

      // Realtime
      channel = supabase
        .channel("subscription-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${user.id}` },
          () => fetch()
        )
        .subscribe();
    }

    fetch();
    return () => { channel?.unsubscribe(); };
  }, []);

  const isActive = subscription && ["active", "trialing"].includes(subscription.status);
  const isTrial = subscription?.status === "trialing";
  const expiresAt = subscription?.current_period_end ? new Date(subscription.current_period_end) : null;

  return { subscription, tier, isActive, isTrial, expiresAt, loading };
}
