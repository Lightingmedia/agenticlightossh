import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import {
  Brain,
  Zap,
  Cpu,
  Network,
  BarChart3,
  Shield,
  ArrowRight,
  Sparkles,
  Layers,
  Globe,
  Code2,
  Copy,
  Check,
} from "lucide-react";
import { useState } from "react";
import AuroraPlayground from "@/components/aurora/AuroraPlayground";

const benchmarks = [
  { name: "MMLU", aurora: "92.4%", gpt4: "86.4%", gemini: "90.0%" },
  { name: "HumanEval", aurora: "94.1%", gpt4: "67.0%", gemini: "74.4%" },
  { name: "MATH", aurora: "78.2%", gpt4: "52.9%", gemini: "67.7%" },
  { name: "Infra-Bench", aurora: "96.8%", gpt4: "41.2%", gemini: "53.1%" },
];

const capabilities = [
  {
    icon: Cpu,
    title: "Photonic-Native Reasoning",
    description:
      "Trained on silicon-photonic telemetry data. Aurora understands optical mesh topologies, thermal dynamics, and GPU interconnects natively.",
  },
  {
    icon: Network,
    title: "Topology-Aware Planning",
    description:
      "Generates optimized photonic circuit plans by reasoning over real-time fabric state, predicting congestion before it occurs.",
  },
  {
    icon: Zap,
    title: "Sub-100ms Inference",
    description:
      "Runs on LightOS's co-packaged photonic accelerators. Decisions are made in under 100ms — fast enough for real-time datacenter control loops.",
  },
  {
    icon: Shield,
    title: "Guardrailed Autonomy",
    description:
      "Built-in safety constraints prevent harmful reconfigurations. Human-in-the-loop approval for high-impact fabric changes.",
  },
  {
    icon: BarChart3,
    title: "Predictive Energy Optimization",
    description:
      "Forecasts power consumption across the photonic mesh and proactively reroutes workloads to minimize energy waste.",
  },
  {
    icon: Layers,
    title: "Multi-Layer Stack Access",
    description:
      "Full access to the Silicon Photonic Stack — from Layer 1 physical fabric to Layer 10 autonomous agents.",
  },
];

const codeExample = `from lightos import AuroraLLM

# Initialize Aurora with photonic context
aurora = AuroraLLM(
    model="aurora-pro",
    fabric_context="auto",   # reads live topology
    guardrails=True
)

# Ask Aurora to optimize a workload
plan = aurora.reason(
    prompt="Optimize All-Reduce for 512-GPU MoE training",
    constraints={
        "max_latency_us": 50,
        "power_budget_kw": 120,
        "topology": "fat-tree"
    }
)

# Aurora returns an executable photonic circuit plan
print(plan.summary)
# → "Provisioning 64 optical rings, estimated 3.2x speedup"

plan.execute(approve=True)  # Human-in-the-loop`;

const AuroraLLM = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeExample);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {/* Hero */}
      <section className="pt-40 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--accent)/0.15),transparent_70%)]" />
        <div className="container mx-auto max-w-5xl relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="mb-6 bg-accent/10 text-accent border-accent/30 font-mono text-xs">
              <Sparkles className="w-3 h-3 mr-1" /> NOW IN PREVIEW
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold font-mono tracking-tight mb-6">
              Aurora{" "}
              <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                LLM
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-4 font-mono">
              The first LLM purpose-built for photonic datacenter infrastructure.
            </p>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-10">
              Aurora understands silicon-photonic topologies, GPU interconnects,
              and thermal dynamics. It doesn't just monitor your fabric — it
              reasons about it and acts autonomously.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link to="/onboard">
                <Button size="lg" className="font-mono gap-2">
                  Request Access <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/docs">
                <Button variant="outline" size="lg" className="font-mono gap-2">
                  <Code2 className="w-4 h-4" /> Read the Docs
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Benchmarks */}
      <section className="py-20 px-4 border-t border-border">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold font-mono mb-3">Benchmarks</h2>
            <p className="text-muted-foreground">
              Aurora outperforms general-purpose LLMs on infrastructure reasoning tasks.
            </p>
          </motion.div>
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-3 px-4">Benchmark</th>
                  <th className="text-center py-3 px-4">
                    <span className="text-accent">Aurora Pro</span>
                  </th>
                  <th className="text-center py-3 px-4">GPT-4o</th>
                  <th className="text-center py-3 px-4">Gemini 2.5</th>
                </tr>
              </thead>
              <tbody>
                {benchmarks.map((b, i) => (
                  <motion.tr
                    key={b.name}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3 px-4 text-foreground font-medium">{b.name}</td>
                    <td className="py-3 px-4 text-center text-accent font-bold">{b.aurora}</td>
                    <td className="py-3 px-4 text-center text-muted-foreground">{b.gpt4}</td>
                    <td className="py-3 px-4 text-center text-muted-foreground">{b.gemini}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-4 text-center font-mono">
            Infra-Bench is LightOS's proprietary benchmark for datacenter reasoning tasks.
          </p>
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-20 px-4 border-t border-border">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl font-bold font-mono mb-3">Core Capabilities</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Built from the ground up for silicon-photonic infrastructure control.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {capabilities.map((cap, i) => (
              <motion.div
                key={cap.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <Card className="bg-card/50 border-border/60 hover:border-primary/40 transition-all h-full">
                  <CardContent className="p-6">
                    <cap.icon className="w-8 h-8 text-primary mb-4" />
                    <h3 className="font-mono font-bold text-foreground mb-2">{cap.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {cap.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SDK Example */}
      <section className="py-20 px-4 border-t border-border">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl font-bold font-mono mb-3">Developer SDK</h2>
            <p className="text-muted-foreground">
              Integrate Aurora into your infrastructure pipeline with a few lines of Python.
            </p>
          </motion.div>
          <div className="relative rounded-xl border border-border bg-secondary/40 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-secondary/60">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-destructive/60" />
                <div className="w-3 h-3 rounded-full bg-accent/60" />
                <div className="w-3 h-3 rounded-full bg-primary/60" />
                <span className="ml-3 text-xs font-mono text-muted-foreground">aurora_example.py</span>
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="p-6 overflow-x-auto text-sm font-mono text-muted-foreground leading-relaxed">
              <code>{codeExample}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* Models */}
      <section className="py-20 px-4 border-t border-border">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold font-mono mb-3">Model Variants</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Aurora Nano",
                params: "8B",
                desc: "Edge inference for real-time telemetry classification and alerting.",
                badge: "FAST",
              },
              {
                name: "Aurora Pro",
                params: "70B",
                desc: "Full reasoning over photonic topologies. Powers Agent Studio and autonomous optimization.",
                badge: "RECOMMENDED",
              },
              {
                name: "Aurora Ultra",
                params: "405B",
                desc: "Multi-datacenter planning, long-horizon forecasting, and cross-fabric orchestration.",
                badge: "ENTERPRISE",
              },
            ].map((model, i) => (
              <motion.div
                key={model.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="bg-card/50 border-border/60 hover:border-accent/40 transition-all h-full">
                  <CardContent className="p-6 text-center">
                    <Badge variant="outline" className="mb-4 font-mono text-xs border-accent/40 text-accent">
                      {model.badge}
                    </Badge>
                    <h3 className="text-xl font-mono font-bold text-foreground mb-1">{model.name}</h3>
                    <p className="text-2xl font-mono text-primary mb-3">{model.params}</p>
                    <p className="text-sm text-muted-foreground">{model.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 border-t border-border">
        <div className="container mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Brain className="w-12 h-12 text-accent mx-auto mb-6" />
            <h2 className="text-3xl font-bold font-mono mb-4">
              Ready to deploy intelligence at the photonic layer?
            </h2>
            <p className="text-muted-foreground mb-8">
              Aurora LLM is available in preview for LightOS Cloud customers.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link to="/onboard">
                <Button size="lg" className="font-mono gap-2">
                  Request Preview Access <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/dashboard/studio">
                <Button variant="outline" size="lg" className="font-mono gap-2">
                  <Globe className="w-4 h-4" /> Try in Agent Studio
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AuroraLLM;
