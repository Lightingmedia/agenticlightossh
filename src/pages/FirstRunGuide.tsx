import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Check, Copy, Cpu, Gauge, KeyRound, PlugZap, Rocket, Terminal, TriangleAlert, UserPlus } from "lucide-react";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";

type Step = {
  id: string;
  icon: typeof Cpu;
  title: string;
  where: string;
  text: string;
  code?: string;
  note?: string;
  action?: { label: string; to: string };
};

const steps: Step[] = [
  {
    id: "account",
    icon: UserPlus,
    title: "Create your free account",
    where: "In your browser",
    text: "Sign up with email or Google. The Free plan monitors one GPU with no card required.",
    action: { label: "Create free account", to: "/auth?next=/dashboard/gateway-setup" },
  },
  {
    id: "check",
    icon: Cpu,
    title: "Check your GPU machine",
    where: "On your NVIDIA machine (Linux terminal)",
    text: "Make sure the NVIDIA driver, Docker and the NVIDIA Container Toolkit are installed. You should see your GPUs listed and a working Docker GPU test.",
    code: `nvidia-smi
docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi`,
    note: "Using Windows? Run these inside your Linux machine (for example after `brev shell <name>` or in WSL), not in PowerShell.",
  },
  {
    id: "baseline",
    icon: Gauge,
    title: "Optional: record a 60-second baseline",
    where: "On your NVIDIA machine",
    text: "A read-only check that needs no root and sends nothing anywhere. It records utilization, memory, power, temperature and a fingerprint of your setup so later changes can be compared.",
    code: `curl -fsSL https://agentic.lightos.sh/sidecar/install.sh -o lightos-install.sh
less lightos-install.sh   # read it first
bash lightos-install.sh`,
  },
  {
    id: "gateway",
    icon: Terminal,
    title: "Start the LightOS gateway",
    where: "On your NVIDIA machine, inside the gateway folder",
    text: "The gateway reads your GPUs and answers only to requests carrying your private token. It opens an outbound tunnel, so no inbound ports are needed.",
    code: `cd gateway
cp .env.example .env
sed -i "s/^LIGHTOS_GATEWAY_TOKEN=.*/LIGHTOS_GATEWAY_TOKEN=$(openssl rand -hex 32)/" .env
docker compose up -d --build`,
  },
  {
    id: "address",
    icon: KeyRound,
    title: "Get your address and token",
    where: "On your NVIDIA machine",
    text: "This prints the https address of your tunnel and runs a health check. You should see a GPU count of 1 or more.",
    code: `set -a; . ./.env; set +a
URL=$(docker compose logs tunnel-quick 2>/dev/null | grep -o 'https://[a-z0-9-]*\\.trycloudflare\\.com' | tail -1)
echo "Gateway address: $URL"
curl -s "$URL/healthz"; echo
grep LIGHTOS_GATEWAY_TOKEN .env`,
    note: "Your token is a password. Paste it only into the GPU Setup form — never into chat, email or screenshots.",
  },
  {
    id: "connect",
    icon: PlugZap,
    title: "Connect it in GPU Setup",
    where: "In LightOS",
    text: "Open Dashboard → Gateway Setup, paste the address and token into “Connect your GPU”, then press Connect GPU. The token is encrypted and tied to your account.",
    action: { label: "Open GPU Setup", to: "/dashboard/gateway-setup" },
  },
  {
    id: "readings",
    icon: Rocket,
    title: "See your live readings",
    where: "In LightOS",
    text: "Your dashboard shows utilization, memory, temperature and power straight from the hardware, refreshed about every 15 seconds. If nothing is visible, LightOS tells you why instead of showing made-up numbers.",
    action: { label: "Open dashboard", to: "/dashboard" },
  },
];

const problems = [
  ["“Gateway unreachable”", "The tunnel stopped or its address changed (this happens on every restart). Rerun step 5 and update the address in GPU Setup."],
  ["“Token mismatch”", "The token in GPU Setup differs from the one on your machine. Copy it again with grep LIGHTOS_GATEWAY_TOKEN .env."],
  ["“No GPUs visible”", "The gateway container can't see the GPU. Check step 2's Docker test and that the NVIDIA Container Toolkit is installed."],
  ["“Upgrade required”", "The Free plan covers one GPU machine. Disconnect the current one or upgrade to add another."],
];

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="terminal-window rounded-xl overflow-hidden mt-4">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-card/50">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">bash</span>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" aria-label="Copy commands"
          onClick={() => { void navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
          {copied ? <Check className="h-3.5 w-3.5 text-lightrail" /> : <Copy className="h-3.5 w-3.5" />}{copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="p-4 font-mono text-[13px] leading-relaxed text-lightrail overflow-x-auto whitespace-pre">{code}</pre>
    </div>
  );
}

export default function FirstRunGuidePage() {
  const [active, setActive] = useState(steps[0].id);

  useEffect(() => {
    document.title = "First-run guide | LightOS";
    const io = new IntersectionObserver((entries) => {
      const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (hit) setActive(hit.target.id);
    }, { rootMargin: "-30% 0px -60% 0px" });
    steps.forEach((s) => { const el = document.getElementById(s.id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-32 sm:pt-40 pb-24">
        <section className="relative container mx-auto px-4 text-center">
          <div className="absolute left-1/2 -top-20 h-72 w-[720px] -translate-x-1/2 rounded-full bg-lightrail/[0.07] blur-[110px] pointer-events-none" />
          <span className="relative inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-4 py-1.5 font-mono text-xs sm:text-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-lightrail" />First-run guide · about 10 minutes
          </span>
          <h1 className="relative mt-6 font-mono font-bold tracking-tighter leading-[1.05] text-4xl sm:text-6xl">
            <span className="hero-fade-text">From zero to</span><br />live GPU readings
          </h1>
          <p className="relative mx-auto mt-5 max-w-xl text-muted-foreground">
            Connect one NVIDIA machine you own or rent and see its real utilization, memory, temperature and power in LightOS.
          </p>
          <div className="relative mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 font-mono text-xs text-muted-foreground">
            <span>Needs: NVIDIA GPU · Docker · NVIDIA Container Toolkit</span>
            <span>Free: 1 GPU · no card</span>
          </div>
        </section>

        <div className="container mx-auto px-4 mt-16 max-w-6xl grid lg:grid-cols-[220px_1fr] gap-10">
          <nav className="hidden lg:block" aria-label="Guide steps">
            <ol className="sticky top-28 space-y-1">
              {steps.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className={`flex gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${active === s.id ? "bg-lightrail/10 text-lightrail" : "text-muted-foreground hover:text-foreground"}`}>
                    <span className="font-mono text-xs opacity-60 mt-0.5">0{i + 1}</span>{s.title}
                  </a>
                </li>
              ))}
              <li><a href="#troubleshooting" className="flex gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground"><span className="font-mono text-xs opacity-60 mt-0.5">?</span>Troubleshooting</a></li>
            </ol>
          </nav>

          <div className="space-y-5 min-w-0">
            {steps.map((s, i) => (
              <motion.section key={s.id} id={s.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }}
                className="soft-card scroll-mt-28 p-6 sm:p-7">
                <div className="flex items-start gap-4">
                  <div className="h-11 w-11 shrink-0 rounded-xl border border-lightrail/30 bg-lightrail/10 flex items-center justify-center"><s.icon className="h-5 w-5 text-lightrail" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Step {i + 1} · {s.where}</p>
                    <h2 className="mt-1 font-mono text-xl font-bold">{s.title}</h2>
                    <p className="mt-2 text-sm sm:text-base text-muted-foreground leading-relaxed">{s.text}</p>
                    {s.code && <CodeBlock code={s.code} />}
                    {s.note && <p className="mt-3 flex gap-2 text-xs text-muted-foreground"><TriangleAlert className="h-3.5 w-3.5 shrink-0 mt-px text-lightrail" />{s.note}</p>}
                    {s.action && (
                      <Button asChild className="mt-4 rounded-xl bg-lightrail text-lightrail-foreground hover:bg-lightrail/90">
                        <Link to={s.action.to}>{s.action.label}<ArrowRight className="ml-2 h-4 w-4" /></Link>
                      </Button>
                    )}
                  </div>
                </div>
              </motion.section>
            ))}

            <section id="troubleshooting" className="soft-card scroll-mt-28 p-6 sm:p-7">
              <h2 className="font-mono text-xl font-bold">Troubleshooting</h2>
              <dl className="mt-4 divide-y divide-border">
                {problems.map(([q, a]) => (
                  <div key={q} className="py-3 grid sm:grid-cols-[200px_1fr] gap-1 sm:gap-4">
                    <dt className="font-mono text-sm">{q}</dt><dd className="text-sm text-muted-foreground">{a}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-sm text-muted-foreground">Still stuck? Use the chat bubble in the corner and choose “Talk to a person”.</p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
