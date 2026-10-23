import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Check, Zap, Shield, Cpu, Gauge } from "lucide-react";

const plans = [
  {
    id: "free",
    name: "Free",
    description: "Monitor one GPU forever. No credit card required",
    monthlyPrice: 0,
    yearlyPrice: null,
    features: [
      "1 GPU monitoring",
      "Usage and power with connected gateway",
      "Monitoring only",
      "No card required",
    ],
    icon: Gauge,
    popular: false,
  },
  {
    id: "starter",
    name: "Starter",
    description: "Essential AI infrastructure monitoring for small teams",
    monthlyPrice: 49,
    yearlyPrice: 470,
    features: [
      "2 GPU monitoring slots",
      "Agent planning · early access",
      "Basic telemetry dashboard",
      "Thermal alerts",
      "Your compute billed separately",
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
    features: [
      "Unlimited GPU monitoring",
      "Agent workflow tools · early access",
      "Supported execution · pilot validation",
      "Agent Studio workspace",
      "Advanced telemetry with gateway",
      "Photonic controls · research preview",
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
    features: [
      "Unlimited monitoring slots",
      "Bring your own GPU clusters",
      "Custom integration planning",
      "Service terms agreed separately",
      "Assisted onboarding · early access",
    ],
    icon: Shield,
    popular: false,
  },
];

const PricingSection = () => {
  const [annual, setAnnual] = useState(false);

  return (
    <section className="py-24 px-4" id="pricing">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4 border-primary/40 text-primary font-mono">
            Pricing
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold font-mono text-foreground mb-4">
            Scale Your AI Infrastructure
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Start free with one GPU. Paid plans are early access; GPU rental is billed separately by your provider.
          </p>

          <div className="flex items-center justify-center gap-3 mt-8">
            <span className={`text-sm font-mono ${!annual ? "text-foreground" : "text-muted-foreground"}`}>Monthly</span>
            <Switch checked={annual} onCheckedChange={setAnnual} />
            <span className={`text-sm font-mono ${annual ? "text-foreground" : "text-muted-foreground"}`}>
              Annual <Badge variant="secondary" className="ml-1 text-xs">Save 20%</Badge>
            </span>
          </div>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const price = annual && plan.yearlyPrice ? plan.yearlyPrice : plan.monthlyPrice;
            const period = annual && plan.yearlyPrice ? "/yr" : "/mo";

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
                    asChild
                  >
                    <Link to={plan.id === "free" ? "/auth?next=/dashboard/providers" : "/pricing"}>{plan.id === "free" ? "Get Started Free" : "View Paid Plan"}</Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Free: one GPU, monitoring only, no card required. Paid access and supported execution are subject to pilot validation. Compute charges are separate.
        </p>
      </div>
    </section>
  );
};

export default PricingSection;
