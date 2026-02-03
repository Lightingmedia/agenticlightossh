import { motion } from "framer-motion";
import { Cpu, Network, Zap, Shield, BarChart3, Globe } from "lucide-react";

const features = [
  {
    icon: Cpu,
    title: "DISTRIBUTED COMPUTE",
    description:
      "Connect your local machines and cloud GPUs into a unified compute fabric. Automatic load balancing across your entire infrastructure.",
    accent: "Hybrid Architecture",
  },
  {
    icon: Network,
    title: "AGENT ORCHESTRATION",
    description:
      "Intelligent agents coordinate tasks across datacenters. Self-healing, auto-scaling, and context-aware routing built in.",
    accent: "Autonomous Agents",
  },
  {
    icon: Zap,
    title: "REAL-TIME INFERENCE",
    description:
      "Sub-100ms latency for LLM inference. Stream responses from the edge with automatic failover to cloud resources.",
    accent: "Edge + Cloud",
  },
  {
    icon: Shield,
    title: "ENTERPRISE SECURITY",
    description:
      "SOC2 compliant with end-to-end encryption. Keep sensitive workloads on-premise while leveraging cloud scale.",
    accent: "Zero Trust",
  },
  {
    icon: BarChart3,
    title: "COST ANALYTICS",
    description:
      "Track inference costs per token, per model, per team. Optimize spending with intelligent resource allocation.",
    accent: "Per-Token Billing",
  },
  {
    icon: Globe,
    title: "MULTI-REGION",
    description:
      "Deploy globally with automatic geo-routing. Data residency compliance built into every request.",
    accent: "Global Scale",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 grid-pattern opacity-20" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
            <span className="font-mono text-sm text-muted-foreground uppercase tracking-wider">
              How it Works
            </span>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold font-mono">
            <span className="text-gradient">INFRASTRUCTURE</span>
            <br />
            <span className="text-foreground">INTELLIGENCE</span>
          </h2>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group p-6 rounded-xl border border-border bg-card/50 hover:border-primary/50 hover:bg-card transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:glow-primary transition-all">
                  <feature.icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <span className="text-xs font-mono text-primary uppercase tracking-wider">
                    {feature.accent}
                  </span>
                  <h3 className="font-mono font-bold text-lg mt-1 mb-3 text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;