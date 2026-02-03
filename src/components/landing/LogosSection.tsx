import { motion } from "framer-motion";

const logos = [
  { name: "Anthropic", text: "Anthropic" },
  { name: "Mistral", text: "Mistral" },
  { name: "Cohere", text: "Cohere" },
  { name: "Meta AI", text: "Meta AI" },
  { name: "Stability", text: "Stability" },
  { name: "Replicate", text: "Replicate" },
];

const LogosSection = () => {
  return (
    <section className="py-16 border-y border-border bg-card/30">
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
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-wrap justify-center items-center gap-10 md:gap-16"
        >
          {logos.map((logo, index) => (
            <motion.div
              key={logo.name}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors text-lg md:text-xl font-semibold tracking-wide"
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