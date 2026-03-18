import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Cpu,
  Zap,
  Code2,
  Terminal,
  Layers,
  ArrowRight,
  CheckCircle2,
  Braces,
  GitBranch,
  Workflow,
  Server,
  Gauge,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";

const compilationStages = [
  {
    icon: Code2,
    title: "Parse",
    description: "Ingests your agent logic — Python, YAML, or visual flows — into a unified AST.",
    color: "text-primary",
  },
  {
    icon: Braces,
    title: "Optimize",
    description: "Applies photonic-aware optimizations: circuit coalescing, latency folding, and dead-path elimination.",
    color: "text-[hsl(var(--glow-secondary))]",
  },
  {
    icon: GitBranch,
    title: "Lower",
    description: "Translates high-level agent intents into hardware-specific photonic switching instructions.",
    color: "text-primary",
  },
  {
    icon: Cpu,
    title: "Emit",
    description: "Generates deployment-ready micro-apps targeting LightOS runtimes across any cloud region.",
    color: "text-[hsl(var(--glow-secondary))]",
  },
];

const features = [
  {
    icon: Workflow,
    title: "Visual → Binary Pipeline",
    description:
      "Compile drag-and-drop agent flows from the Agent Studio directly into optimized, deployable artifacts.",
  },
  {
    icon: Gauge,
    title: "Photonic-Aware Scheduling",
    description:
      "The compiler understands optical circuit latency and schedules operations to minimize reconfiguration overhead.",
  },
  {
    icon: Server,
    title: "Multi-Target Emission",
    description:
      "Emit to bare-metal LightOS clusters, cloud Kubernetes, or edge nodes — from a single source definition.",
  },
  {
    icon: Zap,
    title: "Sub-Microsecond Hot-Reload",
    description:
      "Incremental compilation allows live agent updates without tearing down photonic circuits.",
  },
];

const codeSnippet = `from lightrail_sdk import LightCompiler

# Define your agent source
compiler = LightCompiler(target="lightos-v2")

# Compile from Python to photonic instructions
artifact = compiler.compile(
    source="agents/thermal_guardian.py",
    optimize=True,
    targets=["aws-us-east-1", "gcp-eu-west-4"],
)

# Inspect the compilation report
print(artifact.report)
# → ParseTime: 12ms | OptPasses: 7 | EmittedOps: 342
# → PhotonicCircuits: 18 | EstLatency: 0.8μs

# Deploy the compiled artifact
artifact.deploy(runtime="managed")`;

const LightCompiler = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative pt-36 pb-20 overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-secondary/50 mb-8">
              <Terminal className="w-4 h-4 text-primary" />
              <span className="font-mono text-sm text-muted-foreground">
                Compiler Infrastructure for Photonic Agents
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-mono font-bold tracking-tight mb-6">
              <span className="text-foreground">Light</span>
              <span className="text-gradient">Compiler</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              The first compiler built for photonic-native agent workloads.
              Transform high-level logic into hardware-optimized instructions
              that run at the speed of light.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/dashboard/studio">
                <Button
                  size="lg"
                  className="font-mono bg-primary text-primary-foreground hover:bg-primary/90 gap-2 px-8"
                >
                  Open Agent Studio
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/docs">
                <Button
                  variant="outline"
                  size="lg"
                  className="font-mono border-border text-foreground hover:bg-secondary gap-2 px-8"
                >
                  Read the Docs
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Compilation Pipeline */}
      <section className="py-20 border-t border-border">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-mono font-bold text-foreground mb-4">
              Four-Stage Pipeline
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              From human-readable agent definitions to photonic machine code in
              milliseconds.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-6 relative">
            {/* Connection line */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent -translate-y-1/2 z-0" />

            {compilationStages.map((stage, i) => (
              <motion.div
                key={stage.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative z-10"
              >
                <Card className="bg-card border-border hover:border-primary/40 transition-colors h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <stage.icon className={`w-5 h-5 ${stage.color}`} />
                      </div>
                      <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
                        Stage {i + 1}
                      </span>
                    </div>
                    <CardTitle className="font-mono text-lg text-foreground">
                      {stage.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {stage.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Code Example */}
      <section className="py-20 border-t border-border bg-secondary/20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-mono font-bold text-foreground mb-6">
                Compile in{" "}
                <span className="text-gradient">Three Lines</span>
              </h2>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                The LightCompiler SDK gives you programmatic control over the
                entire compilation pipeline. Define your source, set your
                targets, and deploy — the compiler handles photonic optimization
                automatically.
              </p>
              <ul className="space-y-3">
                {[
                  "Automatic dead-path elimination",
                  "Cross-region circuit deduplication",
                  "Human-readable compilation reports",
                  "Deterministic, reproducible builds",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 text-sm text-muted-foreground"
                  >
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="terminal-window overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--terminal-border))]">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-destructive/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                    <div className="w-3 h-3 rounded-full bg-primary/60" />
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">
                    compile.py
                  </span>
                  <button
                    onClick={handleCopy}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-primary" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <pre className="p-4 overflow-x-auto text-sm font-mono leading-relaxed">
                  <code className="text-muted-foreground">
                    {codeSnippet.split("\n").map((line, i) => (
                      <div key={i}>
                        {line.startsWith("#") || line.startsWith("# →") ? (
                          <span className="text-muted-foreground/60">{line}</span>
                        ) : line.includes("from ") || line.includes("import ") ? (
                          <span>
                            <span className="text-primary">{line.split(" ")[0]}</span>{" "}
                            {line.slice(line.indexOf(" ") + 1)}
                          </span>
                        ) : (
                          <span>{line}</span>
                        )}
                      </div>
                    ))}
                  </code>
                </pre>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 border-t border-border">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-mono font-bold text-foreground mb-4">
              Built for Photonic Infrastructure
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Not just another compiler — LightCompiler is photonic-native from
              the ground up.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="bg-card border-border hover:border-primary/30 transition-colors h-full">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <feature.icon className="w-5 h-5 text-primary" />
                      </div>
                      <CardTitle className="font-mono text-lg text-foreground">
                        {feature.title}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto"
          >
            <Layers className="w-12 h-12 text-primary mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-mono font-bold text-foreground mb-4">
              Ready to Compile?
            </h2>
            <p className="text-muted-foreground mb-8">
              Start building photonic-optimized agents in the Agent Studio, or
              use the SDK to integrate LightCompiler into your existing CI/CD
              pipeline.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/dashboard/studio">
                <Button
                  size="lg"
                  className="font-mono bg-primary text-primary-foreground hover:bg-primary/90 gap-2 px-8"
                >
                  Launch Agent Studio
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <a
                href="https://pypi.org/project/lightos/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  variant="outline"
                  size="lg"
                  className="font-mono border-border text-foreground hover:bg-secondary gap-2 px-8"
                >
                  <Terminal className="w-4 h-4" />
                  pip install lightos
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LightCompiler;
