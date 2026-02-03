import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const logos = [
  { name: "Anthropic", text: "Anthropic" },
  { name: "Mistral", text: "Mistral" },
  { name: "Cohere", text: "Cohere" },
  { name: "Meta AI", text: "Meta AI" },
  { name: "Stability", text: "Stability" },
  { name: "Replicate", text: "Replicate" },
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
            Powering teams at leading AI companies
          </span>
        </motion.div>

        <motion.div
          style={{ x }}
          className="flex flex-wrap justify-center items-center gap-10 md:gap-16"
        >
          {logos.map((logo, index) => (
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