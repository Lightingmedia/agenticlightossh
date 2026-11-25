import Header from "@/components/landing/Header";
import ComputeRanges from "@/components/gpu-cloud/ComputeRanges";
import RentGpuSection from "@/components/gpu-cloud/RentGpuSection";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function RentCompute() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-32 sm:px-6">
        <div className="mb-10 border-b border-border pb-8">
          <p className="mb-3 font-mono text-sm text-primary">LIGHTOS GPU CLOUD</p>
          <h1 className="font-mono text-4xl font-bold sm:text-5xl">Rent Compute</h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">From a single GPU to an eight-GPU machine. Choose live offers and pay for rented time through LightOS.</p>
          <Button asChild variant="link" className="mt-3 px-0 gap-2"><Link to="/pricing?tab=compute">Compute pricing <ArrowRight className="h-4 w-4" /></Link></Button>
        </div>
        <ComputeRanges />
        <div id="machines" className="mt-12 scroll-mt-28"><RentGpuSection /></div>
      </main>
    </div>
  );
}