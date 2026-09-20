// ============= Full file contents =============

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ScrollReveal } from "@/components/ui/parallax-section";

const UtilizationSection = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);

  const bars = [
    {
      label: "Legacy Orchestration (Run:ai / Kubernetes)",
      range: "50–60%",
      width: 55,
      color: "hsl(var(--muted-foreground))",
      bg: "bg-muted/40",
      note: "Code-heavy DSLs and static scheduling cap cluster efficiency",
      current: false,
    },
    {
      label: "Aurora Fabric OS",
      range: "70–85%",
      width: 85,
      color: "hsl(var(--primary))",
      bg: "bg-primary/20",
      note: "Zero-code natural language execution + dynamic fabric allocation",
      current: true,
    },
  ];

  return (
    <section ref={containerRef} className="py-24 relative overflow-hidden border-y border-border bg-card/20">
      <motion.div
        className="absolute inset-0 grid-pattern opacity-10"
        style={{ y: backgroundY }}
      />

      <div className="container mx-auto px-4 relative z-10">
        <ScrollReveal className="text-center mb-14">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full border border-border bg-card/50">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
              The Utilization Gap
            </span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold font-mono mb-4">
            <span className="text-foreground">Most of Your GPU Cluster</span>
            <br />
            <span className="text-gradient glow-text">Is Sitting Idle</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Legacy, code-heavy orchestration tools leave a third of your compute on the
            table. Aurora pairs conversational control with dynamic fabric allocation to
            close the gap.
          </p>
        </ScrollReveal>

        <div className="max-w-3xl mx-auto space-y-8">
          {bars.map((bar) => (
            <ScrollReveal key={bar.label}>
              <div
                className={`p-6 rounded-xl border ${
                  bar.current ? "border-primary/40 bg-card/60" : "border-border bg-card/30"
                }`}
              >
                <div className="flex items-baseline justify-between mb-3 gap-4">
                  <div className="font-mono text-sm md:text-base font-bold text-foreground">
                    {bar.label}
                  </div>
                  <div
                    className={`font-mono text-2xl md:text-3xl font-bold ${bar.current ? "text-gradient glow-text" : "text-muted-foreground"}`}
                  >
                    {bar.range}
                  </div>
                </div>
                <div className="h-4 rounded-full bg-muted/40 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${bar.width}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className={`h-full rounded-full ${bar.current ? "bg-gradient-to-r from-primary/60 to-primary glow-primary" : "bg-muted-foreground/40"}`}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-3">{bar.note}</p>
              </div>
            </ScrollReveal>
          ))}

          <ScrollReveal className="text-center">
            <p className="font-mono text-sm text-muted-foreground">
              Typical fleet utilization, measured across high-density GPU clusters
            </p>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
};

export default UtilizationSection;
