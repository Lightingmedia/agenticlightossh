import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Check, Zap, Shield, Cpu, ArrowLeft } from "lucide-react";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { getStripeEnvironment } from "@/lib/stripe";
import { useSubscription } from "@/hooks/use-subscription";
import { useToast } from "@/hooks/use-toast";

const plans = [
  {
    id: "starter",
    name: "Starter",
    description: "Essential AI infrastructure monitoring for small teams",
    monthlyPrice: 49,
    yearlyPrice: 470,
    monthlyPriceId: "starter_monthly",
    yearlyPriceId: "starter_yearly",
    features: [
      "2 GPU monitoring slots",
      "1 AI agent deployment",
      "Basic telemetry dashboard",
      "Thermal alerts",
      "7-day free trial",
      "Email support",
    ],
    icon: Zap,
    popular: false,
  },
  {
    id: "pro",
    name: "Pro",
    description: "Full-stack AI ops for growing infrastructure teams",
    monthlyPrice: 149,
    yearlyPrice: 1430,
    monthlyPriceId: "pro_monthly",
    yearlyPriceId: "pro_yearly",
    features: [
      "Unlimited GPU monitoring",
      "10 AI agent deployments",
      "LLM Serving (Ray Serve)",
      "Agent Studio access",
      "Advanced telemetry & Photonic Fabric",
      "7-day free trial",
      "Priority support",
    ],
    icon: Cpu,
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Dedicated clusters & custom integrations for large-scale ops",
    monthlyPrice: 499,
    yearlyPrice: null,
    monthlyPriceId: "enterprise_monthly",
    yearlyPriceId: null,
    features: [
      "Unlimited everything",
      "Dedicated GPU clusters",
      "Custom model deployments",
      "SLA guarantee (99.9%)",
      "Priority onboarding",
      "Custom integrations",
      "Dedicated account manager",
    ],
    icon: Shield,
    popular: false,
  },
];

export default function Pricing() {
  const [annual, setAnnual] = useState(false);
  const [checkoutPriceId, setCheckoutPriceId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const { tier, isActive, isCanceled } = useSubscription();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  const handleSubscribe = async (plan: typeof plans[0]) => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to subscribe.", variant: "destructive" });
      navigate("/auth");
      return;
    }
    if (isActive && tier === plan.id && !isCanceled) {
      toast({ title: "Already subscribed", description: `You're already on the ${plan.name} plan.` });
      return;
    }
    // If already subscribed to a different plan, open portal for upgrade/downgrade
    if (isActive && tier !== plan.id && tier !== "free") {
      try {
        const { data, error } = await supabase.functions.invoke("create-portal-session", {
          body: { returnUrl: window.location.href, environment: getStripeEnvironment() },
        });
        if (data?.url) {
          window.open(data.url, "_blank");
          return;
        }
      } catch {}
    }
    const priceId = annual && plan.yearlyPriceId ? plan.yearlyPriceId : plan.monthlyPriceId;
    setCheckoutPriceId(priceId);
  };

  if (checkoutPriceId) {
    return (
      <div className="min-h-screen bg-background">
        <PaymentTestModeBanner />
        <div className="max-w-2xl mx-auto py-12 px-4">
          <Button variant="ghost" onClick={() => setCheckoutPriceId(null)} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to plans
          </Button>
          <StripeEmbeddedCheckout
            priceId={checkoutPriceId}
            quantity={1}
            customerEmail={user?.email}
            userId={user?.id || ""}
            returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <div className="max-w-6xl mx-auto py-16 px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4 border-primary/40 text-primary">
            Pricing
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold font-mono text-foreground mb-4">
            Scale Your AI Infrastructure
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From single-GPU setups to enterprise photonic clusters. Start with a 7-day free trial.
          </p>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span className={`text-sm ${!annual ? "text-foreground" : "text-muted-foreground"}`}>Monthly</span>
            <Switch checked={annual} onCheckedChange={setAnnual} />
            <span className={`text-sm ${annual ? "text-foreground" : "text-muted-foreground"}`}>
              Annual <Badge variant="secondary" className="ml-1 text-xs">Save 20%</Badge>
            </span>
          </div>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const price = annual && plan.yearlyPrice ? plan.yearlyPrice : plan.monthlyPrice;
            const period = annual && plan.yearlyPrice ? "/yr" : "/mo";
            const isCurrent = isActive && tier === plan.id;

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col ${
                  plan.popular
                    ? "border-primary shadow-[0_0_30px_-5px_hsl(var(--primary)/0.3)]"
                    : "border-border"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                  </div>
                )}

                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <plan.icon className="w-5 h-5 text-primary" />
                    <CardTitle className="font-mono text-xl">{plan.name}</CardTitle>
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="flex-1">
                  <div className="mb-6">
                    <span className="text-4xl font-bold font-mono text-foreground">${price}</span>
                    <span className="text-muted-foreground">{period}</span>
                  </div>

                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => handleSubscribe(plan)}
                    disabled={isCurrent}
                  >
                    {isCurrent ? "Current Plan" : "Start Free Trial"}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          All plans include a 7-day free trial. Cancel anytime. Downgrades take effect at period end.
        </p>
      </div>
    </div>
  );
}
