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

const PRICE_TO_TIER: Record<string, SubscriptionTier> = {
  starter_monthly: "starter",
  starter_yearly: "starter",
  pro_monthly: "pro",
  pro_yearly: "pro",
  enterprise_monthly: "enterprise",
};

// Tier hierarchy for comparison
const TIER_LEVEL: Record<SubscriptionTier, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  enterprise: 3,
};

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [tier, setTier] = useState<SubscriptionTier>("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function fetchSub() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch active/trialing OR canceled-with-remaining-access
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("environment", environment)
        .order("created_at", { ascending: false })
        .limit(5);

      // Find the best active subscription
      const now = new Date();
      const activeSub = (data || []).find((s) => {
        if (["active", "trialing"].includes(s.status)) return true;
        if (s.status === "canceled" && s.current_period_end && new Date(s.current_period_end) > now) return true;
        return false;
      });

      if (activeSub) {
        setSubscription(activeSub as Subscription);
        setTier(PRICE_TO_TIER[activeSub.price_id] || "pro");
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
          () => fetchSub()
        )
        .subscribe();
    }

    fetchSub();
    return () => { channel?.unsubscribe(); };
  }, []);

  const isActive = !!subscription && (
    ["active", "trialing"].includes(subscription.status) ||
    (subscription.status === "canceled" && subscription.current_period_end && new Date(subscription.current_period_end) > new Date())
  );
  const isTrial = subscription?.status === "trialing";
  const isCanceled = subscription?.status === "canceled" || !!subscription?.cancel_at_period_end;
  const expiresAt = subscription?.current_period_end ? new Date(subscription.current_period_end) : null;

  function hasAccess(requiredTier: SubscriptionTier): boolean {
    return TIER_LEVEL[tier] >= TIER_LEVEL[requiredTier];
  }

  return { subscription, tier, isActive, isTrial, isCanceled, expiresAt, loading, hasAccess };
}
