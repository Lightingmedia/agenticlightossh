import { motion } from "framer-motion";
import { ArrowRight, Zap, Clock, DollarSign, Cpu, BarChart3, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";

const metrics = [
  { label: "System MFU", value: "68%", delta: "+23% vs H100", icon: Cpu, color: "text-cyan-400" },
  { label: "Tokens / sec", value: "4,820", delta: "Cluster yield", icon: Zap, color: "text-primary" },
  { label: "TTFT", value: "18 ms", delta: "−62% latency", icon: Clock, color: "text-green-400" },
  { label: "Cost / 1M tok", value: "$0.12", delta: "−71% vs GPU", icon: DollarSign, color: "text-yellow-400" },
];

const comparisons = [
  { accelerator: "LightRail NCE", mfu: 68, ttft: 18, costPerM: 0.12, highlight: true },
  { accelerator: "NVIDIA H100", mfu: 45, ttft: 42, costPerM: 0.41, highlight: false },
  { accelerator: "NVIDIA A100", mfu: 38, ttft: 55, costPerM: 0.52, highlight: false },
  { accelerator: "TPU v5e", mfu: 42, ttft: 38, costPerM: 0.35, highlight: false },
  { accelerator: "Gaudi 3 NPU", mfu: 40, ttft: 45, costPerM: 0.38, highlight: false },
];

const Benchmark = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {/* Hero */}
      <section className="relative pt-36 pb-20 overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-10" />
        <motion.div
          className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-primary/15 to-transparent blur-3xl"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 6, repeat: Infinity }}
        />

        <div className="container mx-auto px-4 relative z-10 text-center max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full border border-border bg-card/50">
            <BarChart3 className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground font-mono">llmperf-bench · Open-Source LLM Benchmarking</span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold font-mono leading-tight mb-6">
            <span className="text-foreground">Photonic AI is </span>
            <span className="text-gradient glow-text">Faster.</span>
            <br />
            <span className="text-foreground">Prove it with </span>
            <span className="text-gradient glow-text">Data.</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Compare LightRail Neural Compute Engine against NVIDIA H100, A100, TPU v5e & Gaudi 3 —
            throughput, latency, and cost per token on real LLM workloads.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/dashboard/benchmark">
              <Button size="lg" className="font-mono bg-primary text-primary-foreground hover:bg-primary/90 glow-primary group">
                <Activity className="mr-2 w-4 h-4" />
                Open Full Dashboard
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <a href="https://github.com/philschmid/llmperf-bench" target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="outline" className="font-mono border-border hover:border-primary/50">
                View on GitHub
              </Button>
            </a>
          </motion.div>
        </div>
      </section>

      {/* Key Metrics */}
      <section className="py-20 border-t border-border">
        <div className="container mx-auto px-4">
          <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="text-2xl md:text-3xl font-bold font-mono text-center mb-12">
            LightRail NCE at a Glance
          </motion.h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {metrics.map((m, i) => (
              <motion.div key={m.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <Card className="bg-card/50 border-border hover:border-primary/30 transition-colors">
                  <CardContent className="p-6 text-center">
                    <m.icon className={`w-8 h-8 mx-auto mb-3 ${m.color}`} />
                    <div className="text-3xl font-bold font-mono text-foreground mb-1">{m.value}</div>
                    <div className="text-sm font-mono text-muted-foreground mb-2">{m.label}</div>
                    <div className="text-xs text-primary font-mono">{m.delta}</div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 border-t border-border">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="text-2xl md:text-3xl font-bold font-mono text-center mb-12">
            Head-to-Head Comparison
          </motion.h2>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <Card className="bg-card/50 border-border overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm font-mono">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left p-4 text-muted-foreground">Accelerator</th>
                        <th className="text-right p-4 text-muted-foreground">MFU %</th>
                        <th className="text-right p-4 text-muted-foreground">TTFT (ms)</th>
                        <th className="text-right p-4 text-muted-foreground">$/1M tokens</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisons.map((row) => (
                        <tr key={row.accelerator}
                          className={`border-b border-border last:border-0 ${row.highlight ? "bg-primary/5" : ""}`}>
                          <td className={`p-4 ${row.highlight ? "text-primary font-bold" : "text-foreground"}`}>
                            {row.highlight && <span className="inline-block w-2 h-2 rounded-full bg-primary mr-2" />}
                            {row.accelerator}
                          </td>
                          <td className="text-right p-4 text-foreground">{row.mfu}%</td>
                          <td className="text-right p-4 text-foreground">{row.ttft} ms</td>
                          <td className="text-right p-4 text-foreground">${row.costPerM.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <div className="text-center mt-10">
            <Link to="/dashboard/benchmark">
              <Button size="lg" className="font-mono bg-primary text-primary-foreground hover:bg-primary/90 group">
                Explore Full Benchmark Dashboard
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Benchmark;
