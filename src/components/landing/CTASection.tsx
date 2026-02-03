import { motion } from "framer-motion";
import { ArrowRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

const CTASection = () => {
  return (
    <section className="py-28 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/50 to-background" />
      <div className="absolute inset-0 grid-pattern opacity-10" />

      {/* Glowing orbs */}
      <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/8 blur-3xl" />
      <div className="absolute top-1/2 right-1/3 translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-cyan-500/5 blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto"
        >
          <h2 className="text-3xl md:text-5xl font-bold font-mono mb-6">
            <span className="text-foreground">Ready to Unify Your </span>
            <span className="text-gradient glow-text">AI Stack?</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Join hundreds of teams running production AI workloads with LightOS.
            Get started in minutes, scale to millions of requests.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="font-mono bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 group"
            >
              Create Free Account
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="font-mono border-border hover:border-primary/50"
            >
              <BookOpen className="mr-2 w-4 h-4" />
              Read the Docs
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mt-8 font-mono">
            Free tier includes 100K inference tokens/month • No credit card required
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;