// ============= Full file contents =============

import { motion } from "framer-motion";

const ecosystem = [
  { name: "CUDA", text: "CUDA" },
  { name: "ROCm", text: "ROCm" },
  { name: "TPU / XLA", text: "TPU / XLA" },
  { name: "oneAPI / SYCL", text: "oneAPI / SYCL" },
  { name: "Habana Gaudi", text: "Habana Gaudi" },
  { name: "Vulkan Compute", text: "Vulkan Compute" },
  { name: "Metal", text: "Metal" },
  { name: "PyTorch", text: "PyTorch" },
];

const LogosSection = () => {
  return (
    <section className="py-16 border-y border-border bg-card/30 overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <span className="text-sm text-muted-foreground uppercase tracking-wider">
            Speaks every accelerator stack — seamlessly
          </span>
        </motion.div>

        <div className="flex flex-wrap justify-center items-center gap-10 md:gap-16">
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
        </div>
      </div>
    </section>
  );
};

export default LogosSection;
