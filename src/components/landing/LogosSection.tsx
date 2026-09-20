// ============= Full file contents =============

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const ecosystem = [
  { name: "NVIDIA Inception", text: "NVIDIA Inception" },
  { name: "NGC Catalog", text: "NGC Catalog" },
  { name: "CUDA", text: "CUDA" },
  { name: "NVIDIA GPU Cloud", text: "NVIDIA GPU Cloud" },
  { name: "Nsight", text: "Nsight Tools" },
  { name: "PyTorch", text: "PyTorch" },
];

const LogosSection = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const x = useTransform(scrollYProgress, [0, 1], [-50, 50]);

  return (
    <section ref={containerRef} className="py-16 border-y border-border bg-card/30 overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <span className="text-sm text-muted-foreground uppercase tracking-wider">
            Built inside the NVIDIA ecosystem
          </span>
        </motion.div>

        <motion.div
          style={{ x }}
          className="flex flex-wrap justify-center items-center gap-10 md:gap-16"
        >
          {ecosystem.map((logo, index) => (
            <motion.div
              key={logo.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08, duration: 0.5 }}
              whileHover={{ scale: 1.1, color: "hsl(var(--primary))" }}
              className="text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors text-lg md:text-xl font-semibold tracking-wide cursor-default"
            >
              {logo.text}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default LogosSection;
