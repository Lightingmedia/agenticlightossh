import { useEffect, useRef, useState } from "react";
import { Copy, Check, Send, ArrowRight, Sparkles } from "lucide-react";

type Model = {
  id: string;
  name: string;
  vendor?: string;
  desc: string;
  input: number;
  output: number;
  dedicated?: boolean;
};

const MODELS: Model[] = [
  {
    id: "llama-3.3-70b",
    name: "Llama 3.3 70B",
    desc: "Frontier-class general reasoning. Strong at coding, agentic workflows, and long-context tasks at wafer-scale speed.",
    input: 0.85, output: 1.20,
  },
  {
    id: "llama3.1-8b",
    name: "Llama 3.1 8B",
    desc: "Excels in speed-critical scenarios like real-time chat, gaming, and live content. Perfect for high-throughput batch jobs.",
    input: 0.10, output: 0.10,
  },
  {
    id: "llama-4-scout-17b-16e-instruct",
    name: "Llama 4 Scout 17B",
    desc: "Multimodal-ready instruct model with strong reasoning across documents, code, and structured outputs.",
    input: 0.65, output: 0.85,
  },
  {
    id: "qwen-3-32b",
    name: "Qwen 3 32B",
    desc: "Multilingual generalist with strong tool-use and coding. Excellent price/performance for production agents.",
    input: 0.40, output: 0.80,
  },
];

const DEDICATED: Model[] = [
  { id: "kimi-k2", name: "Kimi K2.6", vendor: "Moonshot AI", desc: "Advanced reasoning with strong knowledge-intensive performance and long-context support.", input: 0, output: 0, dedicated: true },
  { id: "glm-5.1", name: "GLM 5.1", vendor: "Z.AI", desc: "High-capability bilingual model excelling at instruction following, code, and analysis.", input: 0, output: 0, dedicated: true },
  { id: "deepseek-v3.2", name: "DeepSeek V3.2", vendor: "DeepSeek", desc: "Latest DeepSeek frontier model optimized for coding, mathematics, and structured reasoning.", input: 0, output: 0, dedicated: true },
];

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cerebras-inference`;

export function TokenFactoryApp() {
  const [view, setView] = useState<"start" | "playground">("start");
  const [model, setModel] = useState(MODELS[0].id);

  // usage stats (mocked – live look)
  const [tokensUsed, setTokensUsed] = useState(0);
  const [apiCalls, setApiCalls] = useState(0);

  // api key reveal
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const fakeKey = "csk-9nfhex56vr·············5dhe2j9fvkr";

  // playground state
  const [input, setInput] = useState("Explain photonic interconnects in one paragraph.");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [tps, setTps] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const tryModel = (id: string) => {
    setModel(id);
    setView("playground");
  };

  const copyKey = async () => {
    await navigator.clipboard.writeText("Stored securely in LightOS — proxied via edge function.");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const send = async () => {
    if (!input.trim() || streaming) return;
    const userMsg = { role: "user" as const, content: input };
    const next = [...messages, userMsg];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);
    const start = performance.now();
    let acc = "";
    let count = 0;

    try {
      const resp = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ model, messages: next }),
      });
      if (!resp.ok || !resp.body) throw new Error(await resp.text() || `HTTP ${resp.status}`);
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let done = false;
      while (!done) {
        const { value, done: d } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const p = JSON.parse(json);
            const c = p.choices?.[0]?.delta?.content;
            if (c) {
              acc += c;
              count += Math.max(1, Math.round(c.length / 4));
              const elapsed = (performance.now() - start) / 1000;
              setTps(Math.round(count / Math.max(0.1, elapsed)));
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: acc };
                return copy;
              });
            }
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
      setTokensUsed((t) => t + count);
      setApiCalls((c) => c + 1);
    } catch (e) {
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: "assistant", content: `⚠️ ${e instanceof Error ? e.message : String(e)}` };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  };

  if (view === "playground") {
    const m = MODELS.find((x) => x.id === model) ?? MODELS[0];
    return (
      <div className="flex flex-col h-full bg-background text-foreground overflow-hidden">
        <div className="px-6 py-3 border-b border-border/40 bg-card/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setView("start")}
              className="text-xs text-foreground/60 hover:text-primary"
            >
              ← Get started
            </button>
            <div className="h-4 w-px bg-border/60" />
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="bg-background/60 border border-border/40 rounded px-2 py-1 text-xs"
            >
              {MODELS.map((mm) => <option key={mm.id} value={mm.id}>{mm.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="text-foreground/50">Live TPS</span>
            <span className="text-emerald-400 font-bold tabular-nums">{tps || "—"}</span>
            <span className="text-foreground/50">·</span>
            <span className="text-foreground/50">{m.name}</span>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="h-full grid place-items-center text-center text-foreground/40 text-sm">
              <div>
                <Sparkles className="w-8 h-8 mx-auto mb-2 text-primary/40" />
                <div>Send a prompt to mint your first tokens</div>
                <div className="mt-1 text-[11px]">Streamed from LightOS · powered by wafer-scale silicon</div>
              </div>
            </div>
          )}
          {messages.map((mm, i) => (
            <div key={i} className={`flex ${mm.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                mm.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border/40 text-foreground/90"
              }`}>
                {mm.content || (streaming && i === messages.length - 1 ? <span className="inline-block w-2 h-4 bg-foreground/60 animate-pulse" /> : null)}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-border/40 bg-card/20">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
              disabled={streaming}
              placeholder="Ask anything…"
              className="flex-1 bg-background/60 border border-border/40 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/60"
            />
            <button
              onClick={send}
              disabled={streaming || !input.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 disabled:opacity-40 transition"
            >
              <Send className="w-3.5 h-3.5" />
              {streaming ? "Streaming…" : "Send"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Start view (Cerebras-style)
  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-y-auto">
      <div className="max-w-5xl mx-auto w-full px-8 py-8">
        {/* Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">
            Get started with <span className="text-primary">LightOS Inference</span>
          </h1>
          <p className="text-sm text-foreground/60 mt-1">
            Grab your API key and start building for free — cheaper inference, wafer-scale speed.
          </p>
        </div>

        {/* Usage + API key card */}
        <div className="rounded-2xl border border-border/50 bg-card/40 p-1 mb-10">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-1">
            {/* Usage */}
            <div className="rounded-xl bg-card/60 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-bold">Usage</h3>
                <span className="text-[11px] text-foreground/50 border border-border/50 rounded px-2 py-0.5">All models ▾</span>
              </div>
              <div className="space-y-5">
                <div>
                  <div className="text-[11px] text-foreground/50 mb-1">Tokens used (last month)</div>
                  <div className="text-3xl font-bold tabular-nums">{tokensUsed.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[11px] text-foreground/50 mb-1">API calls (last month)</div>
                  <div className="text-3xl font-bold tabular-nums">{apiCalls.toLocaleString()}</div>
                </div>
              </div>
              <div className="mt-6 text-right">
                <button className="text-[11px] uppercase tracking-wider text-primary hover:underline">Explore plans</button>
              </div>
            </div>

            {/* API key */}
            <div className="rounded-xl bg-card/60 p-6 flex flex-col">
              <h3 className="text-base font-bold mb-3">API key</h3>
              <div className="flex-1 grid place-items-center my-3">
                <div className="w-28 h-28 rounded-xl bg-gradient-to-br from-primary/30 to-primary/5 border border-primary/40 grid place-items-center">
                  <Sparkles className="w-10 h-10 text-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="font-mono text-[11px] bg-background/60 border border-border/40 rounded px-2 py-1.5 text-center text-foreground/80 select-all">
                  {showKey ? fakeKey : "csk-•••••••••••••••••••••"}
                </div>
                <button
                  onClick={() => { setShowKey(true); copyKey(); }}
                  className="w-full flex items-center justify-center gap-1.5 bg-primary text-primary-foreground rounded px-3 py-2 text-[11px] uppercase tracking-wider font-bold hover:opacity-90"
                >
                  {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy API Key</>}
                </button>
                <button className="w-full text-[10px] uppercase tracking-wider text-foreground/50 hover:text-primary py-1">
                  View all API keys
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Models */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Models</h2>
            <button className="text-xs text-primary hover:underline">Browse all</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {MODELS.slice(0, 3).map((m) => (
              <ModelCard key={m.id} m={m} onTry={() => tryModel(m.id)} />
            ))}
          </div>
        </div>

        {/* Dedicated Endpoints */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold">Dedicated Endpoints</h2>
            <button className="text-xs text-primary hover:underline">View All Models</button>
          </div>
          <p className="text-xs text-foreground/60 mb-4 max-w-3xl">
            Private, provisioned inference instances reserved exclusively for your organization. Get predictable
            performance and deploy custom fine-tuned weights for production workloads.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DEDICATED.map((m) => (
              <div key={m.id} className="rounded-xl border border-border/50 bg-card/40 p-5">
                <div className="mb-2">
                  <div className="text-base font-bold">{m.name}</div>
                  <div className="text-[11px] text-foreground/50">{m.vendor}</div>
                </div>
                <p className="text-xs text-foreground/70 leading-relaxed line-clamp-3">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ModelCard({ m, onTry }: { m: Model; onTry: () => void }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/40 p-5 flex flex-col">
      <div className="mb-2">
        <div className="text-base font-bold">{m.name}</div>
        <div className="inline-block mt-1 font-mono text-[10px] text-primary bg-primary/10 border border-primary/30 rounded px-1.5 py-0.5">
          {m.id}
        </div>
      </div>
      <p className="text-xs text-foreground/70 leading-relaxed mb-4 line-clamp-4">{m.desc}</p>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-foreground/50">Input</div>
          <div className="text-base font-bold tabular-nums">${m.input.toFixed(2)}</div>
          <div className="text-[10px] text-foreground/50">per 1M tokens</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-foreground/50">Output</div>
          <div className="text-base font-bold tabular-nums">${m.output.toFixed(2)}</div>
          <div className="text-[10px] text-foreground/50">per 1M tokens</div>
        </div>
      </div>
      <button
        onClick={onTry}
        className="mt-auto flex items-center gap-1.5 bg-primary text-primary-foreground rounded px-3 py-2 text-[11px] uppercase tracking-wider font-bold hover:opacity-90 w-fit"
      >
        <ArrowRight className="w-3 h-3" />
        Try in Playground
      </button>
    </div>
  );
}
