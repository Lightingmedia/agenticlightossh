import { Cpu, MessageSquare, ShieldCheck } from "lucide-react";
import { ScrollReveal } from "@/components/ui/parallax-section";

const stages = [
  { icon: Cpu, title: "Inspect your compute", text: "Connect a supported account or GPU gateway. Inventory and measurements come from that connection, not from a forecast." },
  { icon: MessageSquare, title: "Plan with the agent", text: "Describe the workload. Review capacity, constraints, and a proposed placement before any supported action." },
  { icon: ShieldCheck, title: "Verify the outcome", text: "Pilot execution must return a real job result and measured usage. No utilization improvement or savings percentage is promised." },
];

export default function UtilizationSection() {
  return (
    <section className="py-24 border-y border-border bg-card/20">
      <div className="container mx-auto px-4">
        <ScrollReveal className="text-center mb-12">
          <p className="font-mono text-xs text-primary uppercase mb-4">The agent loop</p>
          <h2 className="text-3xl md:text-5xl font-bold font-mono mb-4">From intent to a verified result</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">Monitoring and planning first. Approved execution is the next pilot milestone, not a claim that every workflow is already autonomous.</p>
        </ScrollReveal>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {stages.map(({ icon: Icon, title, text }, index) => (
            <div key={title} className="border-t border-border pt-6">
              <div className="flex items-center gap-3 text-primary mb-4"><Icon className="w-5 h-5" /><span className="font-mono text-sm">0{index + 1}</span></div>
              <h3 className="font-mono font-bold text-lg mb-3">{title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}