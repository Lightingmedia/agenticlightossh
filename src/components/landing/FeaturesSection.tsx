import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Server, Bot, Activity, Lock, Coins, Workflow } from "lucide-react";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ui/parallax-section";

const features = [
  {
    icon: Server,
    title: "Hybrid Compute Fabric",
    description:
      "Seamlessly blend your local GPUs with cloud infrastructure. Automatic workload distribution based on cost, latency, and availability.",
    tag: "Infrastructure",
  },
  {
    icon: Bot,
    title: "Autonomous Agents",
    description:
      "Deploy intelligent agents that monitor, scale, and heal your AI workloads. No manual intervention required.",
    tag: "Automation",
  },
  {
    icon: Activity,
    title: "Live Inference Metrics",
    description:
      "Real-time visibility into every inference call. Track latency, throughput, and model performance across your entire fleet.",
    tag: "Observability",
  },
  {
    icon: Lock,
    title: "Zero-Trust Security",
    description:
      "End-to-end encryption with SOC2 compliance. Keep sensitive data on-premise while leveraging cloud scale.",
    tag: "Security",
  },
  {
    icon: Coins,
    title: "Usage-Based Billing",
    description:
      "Pay only for what you use. Detailed cost breakdowns by model, team, and workload with budget alerts.",
    tag: "Cost Control",
  },
  {
    icon: Workflow,
    title: "Pipeline Orchestration",
    description:
      "Chain models, agents, and data sources into production-ready pipelines. Built-in versioning and rollback.",
    tag: "Workflows",
  },
];

const FeaturesSection = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);

  return (
    <section ref={containerRef} className="py-24 relative overflow-hidden">
      {/* Parallax Background */}
      <motion.div 
        className="absolute inset-0 grid-pattern opacity-15" 
        style={{ y: backgroundY }}
      />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <ScrollReveal className="text-center mb-16">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full border border-border bg-card/50">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
              Core Capabilities
            </span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold font-mono mb-4">
            <span className="text-foreground">Everything You Need to</span>
            <br />
            <span className="text-gradient">Scale AI Infrastructure</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            From local development to global deployment, LightOS handles the complexity so you can focus on building.
          </p>
        </ScrollReveal>

        {/* Features Grid with Stagger */}
        <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" staggerDelay={0.1}>
          {features.map((feature) => (
            <StaggerItem key={feature.title}>
              <motion.div
                whileHover={{ y: -5, scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="group h-full p-6 rounded-xl border border-border bg-card/30 hover:border-primary/40 hover:bg-card/60 transition-all duration-300"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-mono text-primary/70 uppercase tracking-wider">
                    {feature.tag}
                  </span>
                </div>
                <h3 className="font-mono font-bold text-lg mb-2 text-foreground">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
};

export default FeaturesSection;