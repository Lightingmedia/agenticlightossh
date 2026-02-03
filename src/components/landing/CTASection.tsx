import { motion } from "framer-motion";
import { ArrowRight, Github } from "lucide-react";
import { Button } from "@/components/ui/button";

const CTASection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card to-background" />
      <div className="absolute inset-0 grid-pattern opacity-10" />

      {/* Glowing orbs */}
      <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute top-1/2 right-1/4 translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-primary/5 blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto"
        >
          <h2 className="text-4xl md:text-6xl font-bold font-mono mb-6">
            <span className="text-foreground">Ready to </span>
            <span className="text-gradient glow-text">orchestrate?</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-10">
            Join thousands of engineers building the future of distributed AI.
            Start free, scale infinitely.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="font-mono bg-primary text-primary-foreground hover:bg-primary/90 glow-primary group"
            >
              Get Started Free
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="font-mono border-border hover:border-foreground"
            >
              <Github className="mr-2 w-4 h-4" />
              View on GitHub
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mt-6 font-mono">
            No credit card required • 10,000 free inference calls/month
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;