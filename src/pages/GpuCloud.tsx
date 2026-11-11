import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Boxes, Check, Copy, Cpu, Layers, Rocket, Send, Server, Sparkles } from "lucide-react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { fetchCatalog, type DbOffer } from "@/lib/exchange/api";
import { toast } from "sonner";
import RentGpuSection from "@/components/gpu-cloud/RentGpuSection";

const GPU_LINEUP = [
  { model: "B200", memory: "192 GB HBM3e", use: "Frontier training, very large inference" },
  { model: "GH200", memory: "96 GB HBM3 + Grace CPU", use: "Memory-heavy training and inference" },
  { model: "H100", memory: "80 GB HBM3", use: "Training and fine-tuning at scale" },
  { model: "A100", memory: "40/80 GB HBM2e", use: "Fine-tuning and cost-efficient inference" },
];

const COMPUTE_OPTIONS = [
  { icon: Cpu, title: "On-demand GPU", body: "One GPU for a quick experiment or fine-tune. Plan it against published prices and connect it in minutes.", gpus: "1–8 GPUs", cta: "Plan a single GPU" },
  { icon: Layers, title: "Multi-node cluster", body: "Interconnected nodes (InfiniBand/RoCE) for distributed training. LightOS measures the fabric before you scale.", gpus: "16–512 GPUs", cta: "Plan a cluster" },
  { icon: Server, title: "Private cloud", body: "Reserved capacity for long-term programs. Providers quote these directly; LightOS tracks the plan and spend.", gpus: "1,000+ GPUs", cta: "Request a quote plan" },
];

const INSTALL_CMD = "curl -fsSL https://agentic.lightos.sh/sidecar/install.sh | bash";

type Msg = { role: "user" | "assistant"; content: string };

const priceOf = (o: DbOffer) => (o.price_per_hour == null ? "Quote required" : `$${o.price_per_hour.toFixed(2)}/hr`);

const GpuCloud = () => {
  const [offers, setOffers] = useState<DbOffer[] | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [tokens, setTokens] = useState({ input: 0, output: 0, calls: 0 });
  const [lastLatency, setLastLatency] = useState<number | null>(null);

  useEffect(() => {
    fetchCatalog().then((r) => setOffers(r.offers)).catch((e) => setCatalogError(e.message));
  }, []);

  const byModel = useMemo(() => {
    const m = new Map<string, DbOffer[]>();
    for (const o of offers ?? []) {
      const key = o.accelerator.toUpperCase();
      m.set(key, [...(m.get(key) ?? []), o]);
    }
    return m;
  }, [offers]);

  const copyCmd = async () => {
    await navigator.clipboard.writeText(INSTALL_CMD);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const send = async () => {
    const text = prompt.trim();
    if (!text || busy) return;
    const next: Msg[] = [...msgs, { role: "user" as const, content: text }].slice(-20);
    setMsgs(next);
    setPrompt("");
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("serverless-inference", { body: { messages: next } });
      if (error || data?.error) throw new Error(data?.error ?? error?.message ?? "Inference failed");
      setMsgs([...next, { role: "assistant", content: data.reply }]);
      setLastLatency(data.latency_ms ?? null);
      setTokens((t) => ({
        input: t.input + (data.usage?.input_tokens ?? 0),
        output: t.output + (data.usage?.output_tokens ?? 0),
        calls: t.calls + 1,
      }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Inference failed");
      setMsgs(msgs);
      setPrompt(text);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <DashboardHeader title="GPU Cloud" subtitle="Find GPUs, get a ready AI environment, scale out, and call models by API" />
      <div className="p-6 space-y-10">
        <p className="max-w-3xl text-sm text-muted-foreground">
          Rent a GPU right here with prepaid credit, or bring your own from Lambda, RunPod, AWS or CoreWeave. Either way, LightOS
          checks the environment, plans the workload and measures what actually runs.
        </p>

        <RentGpuSection />

        {/* 1. GPUs */}
        <section className="space-y-4">
          <div className="flex items-center gap-2"><Cpu className="h-5 w-5 text-primary" /><h2 className="font-mono text-lg font-bold">Leading NVIDIA GPUs</h2></div>
          {catalogError && <p className="text-sm text-destructive">Couldn't load prices: {catalogError}</p>}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {GPU_LINEUP.map((g) => {
              const list = byModel.get(g.model) ?? [];
              const cheapest = list.filter((o) => o.price_per_hour != null).sort((a, b) => a.price_per_hour! - b.price_per_hour!)[0];
              return (
                <div key={g.model} className="rounded-lg border border-border bg-card p-4 space-y-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                    <h3 className="font-mono text-xl font-bold text-primary">{g.model}</h3>
                    <span className="text-xs text-muted-foreground">{g.memory}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{g.use}</p>
                  {offers === null && !catalogError ? (
                    <p className="text-xs text-muted-foreground">Loading prices…</p>
                  ) : list.length === 0 ? (
                    <Badge variant="outline">Not in catalog yet · ask a provider for a quote</Badge>
                  ) : (
                    <ul className="space-y-1 text-xs">
                      {list.map((o) => (
                        <li key={o.id} className="flex justify-between gap-2">
                          <span>{o.provider} · {o.purchase_model.replace("_", "-")}</span>
                          <span className={o === cheapest ? "whitespace-nowrap font-mono text-primary" : "whitespace-nowrap font-mono"}>{priceOf(o)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">Published list prices, dated by source. Live availability isn't checked. <Link className="text-primary underline" to="/dashboard/exchange/catalog">Full catalog →</Link></p>
        </section>

        {/* 2. Environment */}
        <section className="space-y-4">
          <div className="flex items-center gap-2"><Boxes className="h-5 w-5 text-primary" /><h2 className="font-mono text-lg font-bold">Instantly productive AI environment</h2></div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <p className="text-sm">Run one command on any GPU machine — no root, no account. It checks the stack and takes a 60-second baseline:</p>
              <div className="flex items-center gap-2 rounded bg-muted p-3 font-mono text-xs">
                <code className="flex-1 break-all">{INSTALL_CMD}</code>
                <Button size="icon" variant="ghost" onClick={copyCmd} aria-label="Copy command">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</Button>
              </div>
              <p className="text-xs text-muted-foreground">It only reads. It never installs drivers or sends data anywhere.</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="mb-3 text-sm">What the check reports:</p>
              <ul className="grid grid-cols-2 gap-2 text-xs">
                {["NVIDIA driver", "CUDA version", "nvcc toolkit", "PyTorch + its CUDA", "cuDNN (via PyTorch)", "TensorFlow", "GPU model & memory", "Utilization & stalls"].map((x) => (
                  <li key={x} className="flex items-center gap-2"><Check className="h-3 w-3 text-primary" />{x}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">Lambda instances come with Lambda Stack preinstalled; the check confirms what's actually there.</p>
            </div>
          </div>
        </section>

        {/* 3. Flexible compute */}
        <section className="space-y-4">
          <div className="flex items-center gap-2"><Rocket className="h-5 w-5 text-primary" /><h2 className="font-mono text-lg font-bold">Flexible compute, scaled to your needs</h2></div>
          <div className="grid gap-4 md:grid-cols-3">
            {COMPUTE_OPTIONS.map((c) => (
              <div key={c.title} className="flex flex-col rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40">
                <c.icon className="mb-3 h-5 w-5 text-primary" />
                <h3 className="font-mono font-bold">{c.title}</h3>
                <p className="mb-1 font-mono text-xs text-primary">{c.gpus}</p>
                <p className="flex-1 text-sm text-muted-foreground">{c.body}</p>
                <Button asChild variant="outline" size="sm" className="mt-4"><Link to="/dashboard/exchange/plan">{c.cta}</Link></Button>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Plans are cost estimates you approve. To start a machine now, use Rent a GPU above.</p>
        </section>

        {/* 4. Inference API */}
        <section className="space-y-4">
          <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /><h2 className="font-mono text-lg font-bold">Serverless inference API</h2></div>
          <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="max-h-80 min-h-32 space-y-3 overflow-y-auto">
                {msgs.length === 0 && <p className="text-sm text-muted-foreground">Send a prompt — no GPU or setup needed. Token usage for each request shows on the right.</p>}
                {msgs.map((m, i) => (
                  <div key={i} className={m.role === "user" ? "ml-auto max-w-[85%] rounded-lg bg-primary/10 p-3 text-sm" : "max-w-[85%] whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm"}>
                    {m.content}
                  </div>
                ))}
                {busy && <p className="text-xs text-muted-foreground">Thinking…</p>}
              </div>
              <div className="flex gap-2">
                <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ask anything…" rows={2}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
                <Button onClick={send} disabled={busy || !prompt.trim()} aria-label="Send"><Send className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 space-y-2 font-mono text-xs">
              <p className="text-muted-foreground">This session</p>
              <div className="flex justify-between"><span>Requests</span><span>{tokens.calls}</span></div>
              <div className="flex justify-between"><span>Input tokens</span><span>{tokens.input || "—"}</span></div>
              <div className="flex justify-between"><span>Output tokens</span><span>{tokens.output || "—"}</span></div>
              <div className="flex justify-between"><span>Last latency</span><span>{lastLatency == null ? "—" : `${(lastLatency / 1000).toFixed(1)}s`}</span></div>
              <p className="pt-2 font-sans text-muted-foreground">Open models like Llama or DeepSeek run on your own GPU through NVIDIA NIM behind the LightOS gateway. <Link className="text-primary underline" to="/dashboard/gateway-setup">Set up →</Link></p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default GpuCloud;
