import { Link } from "react-router-dom";
import { useSubscription, SubscriptionTier } from "@/hooks/use-subscription";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

interface FeatureGateProps {
  requiredTier: SubscriptionTier;
  featureName: string;
  children: React.ReactNode;
}

export function FeatureGate({ requiredTier, featureName, children }: FeatureGateProps) {
  const { hasAccess, loading, tier } = useSubscription();

  if (loading) return <p className="p-6 text-sm text-muted-foreground">Checking plan access…</p>;

  if (!hasAccess(requiredTier)) {
    return (
      <div className="relative">
        <div className="flex min-h-64 items-center justify-center p-6">
          <Card className="max-w-md border-primary/30 bg-card/95 backdrop-blur">
            <CardContent className="pt-6 text-center space-y-4">
              <Lock className="w-10 h-10 text-primary mx-auto" />
              <div>
                <h3 className="text-lg font-mono font-bold text-foreground">{featureName}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  This feature requires a <span className="text-primary capitalize">{requiredTier}</span> plan or higher.
                  {tier === "free" ? " Explore paid early-access plans." : " Upgrade to unlock."}
                </p>
              </div>
              <Button asChild>
                <Link to="/pricing">
                  {tier === "free" ? "View Paid Plans" : "Upgrade Plan"}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
