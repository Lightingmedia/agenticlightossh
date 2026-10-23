import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Activity, Cpu, Lock, MessageSquare, Plug, ShieldCheck, Check, Copy, Gauge, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const reveal = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-80px" }, transition: { duration: 0.5 } };

export function FactsBar() {
  const facts = [
    ["1 GPU", "free monitoring, no card"],
    ["15s", "telemetry refresh"],
    ["Your keys", "encrypted per account"],
    ["Measured", "never simulated numbers"],
  ];
  return (
    <section className="border-y border-border bg-card/30">
      <div className="container mx-auto px-4 grid grid-cols-2 md:grid-cols-4">
        {facts.map(([v, l]) => (
          <div key={v} className="py-8 px-4 text-center border-border md:border-r last:border-r-0">
            <div className="font-mono text-2xl md:text-3xl font-bold text-primary">{v}</div>
            <div className="text-xs text-muted-foreground mt-1 font-mono uppercase tracking-wide">{l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

const stages = [
  { icon: Plug, name: "Connect", text: "Run the LightOS gateway on your GPU host and paste its address. Your token is encrypted and tied to your account.", status: "Live" },
  { icon: Activity, name: "Monitor", text: "Utilization, memory, temperature and power read straight from the hardware. If nothing is visible, we say so.", status: "Live" },
  { icon: MessageSquare, name: "Plan", text: "Describe a workload. The agent checks real capacity and drafts a placement plan for you to review.", status: "Early access" },
  { icon: ShieldCheck, name: "Execute", text: "Approved jobs run through the gateway and return a verified result. Being validated with pilot teams.", status: "Pilot" },
];

export function LifecycleSection() {
  const [i, setI] = useState(0);
  const S = stages[i];
  return (
    <section className="py-24">
      <div className="container mx-auto px-4 max-w-5xl">
        <motion.div {...reveal} className="text-center mb-12">
          <p className="font-mono text-xs text-primary uppercase mb-3">How it works</p>
          <h2 className="text-3xl md:text-5xl font-bold font-mono">One loop. Intent to verified result.</h2>
        </motion.div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
          {stages.map((s, idx) => (
            <button key={s.name} onClick={() => setI(idx)}
              className={`p-4 rounded-lg border font-mono text-sm text-left transition-colors ${idx === i ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
              <span className="text-xs opacity-70">0{idx + 1}</span><div className="font-bold">{s.name}</div>
            </button>
          ))}
        </div>
        <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-card/50 p-8 flex flex-col md:flex-row gap-6 items-start">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><S.icon className="w-6 h-6 text-primary" /></div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-mono text-xl font-bold">{S.name}</h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded border border-primary/30 text-primary">{S.status}</span>
            </div>
            <p className="text-muted-foreground">{S.text}</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

const bento = [
  { icon: Cpu, title: "Vendor-agnostic by design", text: "Built for CUDA first, with ROCm, TPU/XLA and oneAPI on the roadmap. Bring whatever hardware you run.", span: "md:col-span-2" },
  { icon: Lock, title: "Server-side authority", text: "The browser only submits intent. Drivers, shells and cluster control stay on your host.", span: "" },
  { icon: Gauge, title: "Honest telemetry", text: "No fabricated charts. Readings carry a timestamp, or a reason when there are none.", span: "" },
  { icon: MessageSquare, title: "Agent tools over MCP", text: "Capacity, telemetry and planning are exposed as authenticated tools any compatible agent can call.", span: "md:col-span-2" },
];

export function BentoSection() {
  return (
    <section className="py-24 bg-card/20 border-y border-border">
      <div className="container mx-auto px-4 max-w-5xl">
        <motion.h2 {...reveal} className="text-3xl md:text-5xl font-bold font-mono text-center mb-12">Built for teams who run their own GPUs</motion.h2>
        <div className="grid md:grid-cols-3 gap-4">
          {bento.map((b, idx) => (
            <motion.div key={b.title} {...reveal} transition={{ duration: 0.5, delay: idx * 0.06 }}
              className={`group rounded-xl border border-border bg-card/50 p-6 hover:border-primary/50 hover:shadow-[0_0_30px_-10px_hsl(var(--primary)/0.5)] transition-all ${b.span}`}>
              <b.icon className="w-6 h-6 text-primary mb-4" />
              <h3 className="font-mono font-bold text-lg mb-2">{b.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{b.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

const snippets = {
  shell: `# on your GPU host
docker compose up -d          # start the LightOS gateway
cloudflared tunnel --url http://localhost:8000

# then paste the https address in GPU Setup`,
  agent: `› "Show my GPU memory and plan a vLLM server"
◆ capacity: read from your gateway
◆ plan: 1 replica · fits in available memory
◆ status: awaiting approval`,
};

export function CodeSection() {
  const [tab, setTab] = useState<keyof typeof snippets>("shell");
  const [copied, setCopied] = useState(false);
  return (
    <section className="py-24">
      <div className="container mx-auto px-4 max-w-6xl grid lg:grid-cols-2 gap-12 items-center">
        <motion.div {...reveal}>
          <p className="font-mono text-xs text-primary uppercase mb-3">Setup</p>
          <h2 className="text-3xl md:text-4xl font-bold font-mono mb-4">Connected in about ten minutes</h2>
          <ul className="space-y-3 text-muted-foreground">
            {["Runs on any NVIDIA host with Docker", "No inbound ports — outbound tunnel only", "Token never leaves your account vault", "Guided step-by-step in the dashboard"].map((t) => (
              <li key={t} className="flex gap-3"><Check className="w-4 h-4 text-primary mt-1 shrink-0" />{t}</li>
            ))}
          </ul>
        </motion.div>
        <motion.div {...reveal} className="terminal-window">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50">
            <div className="flex gap-1">
              {(["shell", "agent"] as const).map((k) => (
                <button key={k} onClick={() => setTab(k)}
                  className={`px-3 py-1 rounded font-mono text-xs ${tab === k ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}>{k}</button>
              ))}
            </div>
            <Button variant="ghost" size="icon" aria-label="Copy snippet"
              onClick={() => { navigator.clipboard.writeText(snippets[tab]); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
              {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <pre className="p-5 font-mono text-sm text-primary whitespace-pre-wrap">{snippets[tab]}</pre>
        </motion.div>
      </div>
    </section>
  );
}

export function FinalCTA() {
  return (
    <section className="py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
      <motion.div {...reveal} className="container mx-auto px-4 text-center relative">
        <h2 className="text-3xl md:text-5xl font-bold font-mono mb-4">Put an agent on your GPUs today.</h2>
        <p className="text-muted-foreground mb-8 max-w-xl mx-auto">Start free with one GPU. Pilot teams get hands-on onboarding.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/auth?next=/dashboard/gateway-setup"><Button size="lg" className="font-mono glow-primary">Start free <ArrowRight className="ml-2 w-4 h-4" /></Button></Link>
          <Link to="/pricing"><Button size="lg" variant="outline" className="font-mono">See pricing</Button></Link>
        </div>
      </motion.div>
    </section>
  );
}
