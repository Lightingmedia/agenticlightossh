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
      "Zero-code natural language execution. Allocate, schedule, and heal GPU workloads by simply asking — no YAML, no cluster DSL, no orchestration code.",
    tag: "Zero-Code",
  },
  {
    icon: Cpu,
    title: "CUDA Translation Layer",
    description:
      "A software CUDA translation layer that plugs directly into NVIDIA's ecosystem, optimizing your existing GPU clusters without rewriting kernels.",
    tag: "NVIDIA",
  },
  {
    icon: GitBranch,
    title: "Dynamic Fabric Allocation",
    description:
      "Workloads flow to wherever capacity exists. Dynamic fabric allocation pushes cluster utilization to 70–85% — where legacy schedulers stall at 50–60%.",
    tag: "Utilization",
  },
  {
    icon: Package,
    title: "NVIDIA NGC Deployment",
    description:
      "Deploy through the NVIDIA NGC catalog with one click. Containers, drivers, and frameworks pre-validated for high-density GPU infrastructure.",
    tag: "NGC",
  },
  {
    icon: Activity,
    title: "Kernel-Level Telemetry",
    description:
      "Real-time visibility into every CUDA stream and inference call. Track latency, throughput, and thermal behavior across the entire fabric.",
    tag: "Observability",
  },
  {
    icon: ShieldCheck,
    title: "Zero-Trust for GPU Fleets",
    description:
      "End-to-end encryption with SOC2 compliance. Keep sensitive training data on-premise while burst-elastic compute scales in the cloud.",
    tag: "Security",
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
              Built for CUDA Teams
            </span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold font-mono mb-4">
            <span className="text-foreground">GPU Orchestration,</span>
            <br />
            <span className="text-gradient">Without the Friction</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Aurora Fabric OS transforms complex GPU orchestration into an intuitive,
            autonomous conversational layer — from a single node to high-density
            datacenter clusters.
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
