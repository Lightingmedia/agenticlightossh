import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/use-subscription";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, ExternalLink, Calendar, AlertTriangle } from "lucide-react";
import { getStripeEnvironment } from "@/lib/stripe";
import { useToast } from "@/hooks/use-toast";

export default function Billing() {
  const { subscription, tier, isActive, isTrial, isCanceled, expiresAt, loading } = useSubscription();
  const [portalLoading, setPortalLoading] = useState(false);
  const { toast } = useToast();

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: {
          returnUrl: window.location.href,
          environment: getStripeEnvironment(),
        },
      });
      if (error || !data?.url) throw new Error(error?.message || "Failed to open billing portal");
      window.open(data.url, "_blank");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-mono font-bold text-foreground mb-6">Billing & Subscription</h1>

      {/* Current Plan */}
      <Card className="mb-6 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-mono text-xl flex items-center gap-2">
                {tier === "free" ? "Free Tier" : `${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan`}
                {isTrial && <Badge variant="outline" className="border-primary text-primary">Trial</Badge>}
                {isCanceled && <Badge variant="outline" className="border-destructive text-destructive">Canceling</Badge>}
                {isActive && !isCanceled && <Badge className="bg-primary text-primary-foreground">Active</Badge>}
              </CardTitle>
              <CardDescription className="mt-1">
                {tier === "free"
                  ? "You're on the free tier. Subscribe to unlock all features."
                  : `Your ${tier} subscription is ${isActive ? "active" : "inactive"}.`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {expiresAt && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              {isCanceled
                ? `Access until ${expiresAt.toLocaleDateString()}`
                : `Next billing date: ${expiresAt.toLocaleDateString()}`}
            </div>
          )}

          {isCanceled && expiresAt && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="w-4 h-4" />
              Your plan will downgrade to Free after {expiresAt.toLocaleDateString()}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            {isActive ? (
              <Button onClick={openPortal} disabled={portalLoading} variant="outline">
                <CreditCard className="w-4 h-4 mr-2" />
                {portalLoading ? "Opening..." : "Manage Subscription"}
                <ExternalLink className="w-3 h-3 ml-2" />
              </Button>
            ) : (
              <Button asChild>
                <Link to="/pricing">View Plans & Subscribe</Link>
              </Button>
            )}

            {isActive && (
              <Button asChild variant="ghost">
                <Link to="/pricing">Change Plan</Link>
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Manage your payment method, invoices, and cancellation through the billing portal.
            {getStripeEnvironment() === "sandbox" && " (Test mode — no real charges)"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
