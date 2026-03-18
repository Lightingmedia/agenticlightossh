import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ScrollReveal } from "@/components/ui/parallax-section";

const CTASection = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const orbY1 = useTransform(scrollYProgress, [0, 1], [100, -100]);
  const orbY2 = useTransform(scrollYProgress, [0, 1], [50, -150]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.9, 1, 0.95]);

  return (
    <section ref={containerRef} className="py-28 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/50 to-background" />
      <motion.div 
        className="absolute inset-0 grid-pattern opacity-10"
        style={{ y: useTransform(scrollYProgress, [0, 1], [0, 50]) }}
      />

      {/* Parallax Glowing orbs */}
      <motion.div 
        className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/8 blur-3xl"
        style={{ y: orbY1 }}
      />
      <motion.div 
        className="absolute top-1/2 right-1/3 translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-cyan-500/5 blur-3xl"
        style={{ y: orbY2 }}
      />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div style={{ scale }}>
          <ScrollReveal className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold font-mono mb-6">
              <span className="text-foreground">Ready to Unify Your </span>
              <span className="text-gradient glow-text">AI Stack?</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
              Join hundreds of teams running production AI workloads with LightOS.
              Get started in minutes, scale to millions of requests.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/onboard">
                <Button
                  size="lg"
                  className="font-mono bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 group"
                >
                  Run lightos onboard
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
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
          </ScrollReveal>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;