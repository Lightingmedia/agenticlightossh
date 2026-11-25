import { ArrowRight, Cpu, Layers, Server, Network } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const ranges = [
  { count: 1, name: "Single GPU", use: "Experiments & inference", description: "A focused machine for development, small-model inference and fine-tuning.", icon: Cpu },
  { count: 2, name: "Dual GPU", use: "Larger models", description: "More accelerator capacity for memory-intensive models and parallel experiments.", icon: Layers },
  { count: 4, name: "Four GPUs", use: "Training & fine-tuning", description: "Multi-GPU machines for larger training runs and demanding AI workloads.", icon: Server },
  { count: 8, name: "Eight GPUs", use: "High-capacity workloads", description: "Full-node compute for workloads that need multiple accelerators. Network capabilities vary by offer.", icon: Network },
];

export default function ComputeRanges() {
  return (
    <section aria-label="Compute ranges" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-mono text-2xl font-bold">Compute for every workload</h2>
          <p className="mt-2 text-sm text-muted-foreground">Choose a machine size. GPU model, memory and hourly rate depend on the live offer.</p>
        </div>
        <span className="text-xs text-primary font-mono">PREPAID · PAY BY THE MINUTE</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ranges.map((range) => (
          <article key={range.count} className="flex flex-col rounded-lg border border-border bg-card p-5">
            <div className="mb-5 flex items-center justify-between"><range.icon className="h-6 w-6 text-primary" /><span className="font-mono text-sm text-muted-foreground">{range.count}× GPU</span></div>
            <h3 className="font-mono text-xl font-bold">{range.name}</h3>
            <p className="mt-1 text-sm text-primary">{range.use}</p>
            <p className="my-4 flex-1 text-sm text-muted-foreground">{range.description}</p>
            <p className="mb-4 border-t border-border pt-4 text-sm">Live offer pricing <span className="block text-xs text-muted-foreground">Availability checked after sign-in</span></p>
            <Button asChild variant="outline" className="w-full gap-2"><Link to={`/rent-compute?gpus=${range.count}#machines`}>View {range.count}-GPU machines <ArrowRight className="h-4 w-4 shrink-0" /></Link></Button>
          </article>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">GPU credits are separate from LightOS monitoring subscriptions. Pay LightOS for rented time; stop your machine to end compute billing. No fixed capacity or rate is guaranteed.</p>
    </section>
  );
}