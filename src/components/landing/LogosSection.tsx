import { motion } from "framer-motion";

const logos = [
  { name: "NVIDIA", text: "NVIDIA" },
  { name: "AMD", text: "AMD" },
  { name: "Google", text: "GOOGLE" },
  { name: "Meta", text: "META" },
  { name: "OpenAI", text: "OPENAI" },
  { name: "Anthropic", text: "ANTHROPIC" },
  { name: "Microsoft", text: "MICROSOFT" },
  { name: "AWS", text: "AWS" },
];

const LogosSection = () => {
  return (
    <section className="py-16 border-y border-border bg-card/50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <span className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
            Used by <span className="text-primary">5000+</span> engineers at:
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-wrap justify-center items-center gap-8 md:gap-12"
        >
          {logos.map((logo, index) => (
            <motion.div
              key={logo.name}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="text-muted-foreground/50 hover:text-muted-foreground transition-colors font-mono text-lg md:text-xl font-bold tracking-widest"
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