// ============= Full file contents =============

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { MessageSquare, Cpu, GitBranch, Package, Activity, ShieldCheck } from "lucide-react";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ui/parallax-section";

const features = [
  {
    icon: MessageSquare,
    title: "Conversational Control",
    description:
      "Express workload intent through conversation. Inspect the agent's interpretation before taking action; automatic cluster healing is not part of the launch offer.",
    tag: "Agent-first",
  },
  {
    icon: Cpu,
    title: "Runtime-aware Planning",
    description:
      "Request capacity and placement plans through an authenticated runtime gateway. Runtime support depends on connected hardware and verified adapters, not a universal translation guarantee.",
    tag: "Early access",
  },
  {
    icon: GitBranch,
    title: "Supported Execution",
    description:
      "The next pilot milestone is one approved, bounded inference job with a verified outcome. Autonomous fabric allocation remains roadmap work; no utilization gain is promised.",
    tag: "Pilot milestone",
  },
  {
    icon: Package,
    title: "Seamless Integration",
    description:
      "Bring a supported provider credential or an existing GPU host. Available inventory and telemetry depend on your provider, permissions, and gateway configuration.",
    tag: "Your compute",
  },
  {
    icon: Activity,
    title: "Measured GPU Telemetry",
    description:
      "A connected NVIDIA gateway can report NVML or DCGM usage, power, and temperature. Missing hardware is shown as unavailable, not as a successful connection.",
    tag: "Observability",
  },
  {
    icon: ShieldCheck,
    title: "Controlled Access",
    description:
      "Private provider credentials stay server-side. Authentication and authorization are required; account isolation and execution controls are launch gates, not a SOC 2 certification claim.",
    tag: "Trust",
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
              What is available. What comes next.
            </span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold font-mono mb-4">
            <span className="text-foreground">Compute Orchestration,</span>
            <br />
            <span className="text-gradient">Without the Friction</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            The agent is the product. This workspace brings together compute connections,
            capacity inspection, and workload planning. Execution and wider hardware support
            expand only after real-world verification.
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
