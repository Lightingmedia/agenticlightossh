import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import WorkloadJourney from "./WorkloadJourney";

const Hero = () => {
  return (
    <section className="relative pt-44 sm:pt-36 pb-8 overflow-hidden bg-background">
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-6">
          <div className="max-w-2xl">
            <p className="font-mono text-[10px] text-lightrail mb-2">AGENT-FIRST INFRASTRUCTURE · EARLY ACCESS</p>
            <h1 className="text-3xl sm:text-4xl font-bold font-mono leading-tight mb-3">LightOS<span className="text-muted-foreground"> / </span><br className="sm:hidden" /><span className="text-foreground">AI workload orchestration</span></h1>
            <p className="text-sm text-muted-foreground max-w-xl">From workload intent to a plan you approve. AI-powered monitoring and planning for the GPUs you already own or rent.</p>
          </div>
          <div className="shrink-0">
            <div className="flex flex-wrap gap-3">
            <Link to="/auth?next=/dashboard/gateway-setup">
              <Button className="font-mono bg-lightrail text-lightrail-foreground hover:bg-lightrail/90 group">
                Get started free<ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
             <Link to="/docs#quickstart">
              <Button variant="outline" className="font-mono">First-run guide</Button>
            </Link>
            </div>
            <p className="text-[10px] text-muted-foreground mt-3 font-mono">1 GPU monitoring free · No card required</p>
          </div>
        </div>
        <WorkloadJourney />
      </div>
    </section>
  );
};

export default Hero;
