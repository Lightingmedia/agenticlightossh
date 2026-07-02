import { useEffect, useRef, useState } from "react";
import { Copy, Check, Send, ArrowRight, Zap, Cpu, Activity, Terminal as TerminalIcon } from "lucide-react";
import { TokenFactoryConsole } from "./TokenFactoryConsole";

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
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Please sign in to use the inference playground.");
      }
      const resp = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
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
        <div className="px-6 py-3 border-b border-[hsl(var(--terminal-border))] bg-[hsl(var(--terminal-bg))] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setView("start")}
              className="text-[10px] font-mono uppercase tracking-wider text-foreground/60 hover:text-[hsl(var(--lightrail))]"
            >
              ← get_started
            </button>
            <div className="h-4 w-px bg-border/60" />
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="bg-background border border-[hsl(var(--terminal-border))] rounded px-2 py-1 text-[11px] font-mono text-[hsl(var(--lightrail))]"
            >
              {MODELS.map((mm) => <option key={mm.id} value={mm.id}>{mm.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="text-foreground/50 uppercase tracking-wider">tps</span>
            <span className="text-[hsl(var(--lightrail))] font-bold tabular-nums glow-text">{tps || "—"}</span>
            <span className="text-foreground/30">·</span>
            <span className="text-foreground/50">{m.name}</span>
            <span className="w-2 h-2 rounded-full bg-[hsl(var(--lightrail))] animate-pulse glow-primary" />
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-3 grid-pattern">
          {messages.length === 0 && (
            <div className="h-full grid place-items-center text-center text-foreground/40 text-sm">
              <div>
                <Zap className="w-8 h-8 mx-auto mb-2 text-[hsl(var(--lightrail))] glow-text" />
                <div className="font-mono uppercase tracking-wider text-xs text-[hsl(var(--lightrail))]">// awaiting prompt</div>
                <div className="mt-1 text-[11px]">Streamed from LightOS · powered by wafer-scale silicon</div>
              </div>
            </div>
          )}
          {messages.map((mm, i) => (
            <div key={i} className={`flex ${mm.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm whitespace-pre-wrap font-mono ${
                mm.role === "user"
                  ? "bg-[hsl(var(--lightrail))]/10 border border-[hsl(var(--lightrail))]/40 text-foreground"
                  : "bg-[hsl(var(--terminal-bg))] border border-[hsl(var(--terminal-border))] text-foreground/90"
              }`}>
                {mm.content || (streaming && i === messages.length - 1 ? <span className="inline-block w-2 h-4 bg-[hsl(var(--lightrail))] animate-pulse" /> : null)}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-[hsl(var(--terminal-border))] bg-[hsl(var(--terminal-bg))]">
          <div className="flex gap-2 items-center">
            <span className="font-mono text-xs text-[hsl(var(--lightrail))]">lightos&gt;</span>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
              disabled={streaming}
              placeholder="prompt --stream"
              className="flex-1 bg-transparent border-none outline-none text-sm font-mono text-foreground placeholder:text-foreground/30"
            />
            <button
              onClick={send}
              disabled={streaming || !input.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded bg-[hsl(var(--lightrail))] text-[hsl(var(--lightrail-foreground))] text-xs font-mono font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-40 transition glow-primary"
            >
              <Send className="w-3 h-3" />
              {streaming ? "Streaming…" : "Run"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Start view (LightOS-branded)
  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-y-auto relative">
      <div className="absolute inset-0 grid-pattern opacity-40 pointer-events-none" />
      <div className="max-w-5xl mx-auto w-full px-8 py-8 relative">
        {/* Title */}
        <div className="mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[hsl(var(--lightrail))]/10 border border-[hsl(var(--lightrail))]/40 grid place-items-center glow-primary">
            <Zap className="w-5 h-5 text-[hsl(var(--lightrail))]" />
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--lightrail))]">// token factory · v1.0</div>
            <h1 className="text-2xl font-bold font-mono">
              LightOS <span className="text-gradient">Inference</span>
            </h1>
          </div>
        </div>
        <p className="text-sm text-foreground/60 mb-8 max-w-2xl">
          Mint tokens at wafer-scale speed. Photonic-routed inference, billed by the million.
          Grab your key — start streaming in seconds.
        </p>
        {/* API Keys · Usage · Program Credits console */}
        <TokenFactoryConsole />

        {/* Usage + API key card */}
        <div className="rounded-xl border border-[hsl(var(--terminal-border))] bg-[hsl(var(--terminal-bg))] p-1 mb-10">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-1">
            {/* Usage */}
            <div className="rounded-lg bg-card/40 p-6 border border-border/30">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[hsl(var(--lightrail))]" />
                  <h3 className="text-sm font-mono uppercase tracking-wider">Usage</h3>
                </div>
                <span className="text-[10px] font-mono text-foreground/50 border border-border/50 rounded px-2 py-0.5">all_models ▾</span>
              </div>
              <div className="space-y-5">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-foreground/50 mb-1">tokens_used / 30d</div>
                  <div className="text-3xl font-bold tabular-nums font-mono text-[hsl(var(--lightrail))]">{tokensUsed.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-foreground/50 mb-1">api_calls / 30d</div>
                  <div className="text-3xl font-bold tabular-nums font-mono">{apiCalls.toLocaleString()}</div>
                </div>
              </div>
              <div className="mt-6 text-right">
                <button className="text-[10px] font-mono uppercase tracking-wider text-[hsl(var(--lightrail))] hover:underline">$ explore_plans →</button>
              </div>
            </div>

            {/* API key */}
            <div className="rounded-lg bg-card/40 p-6 flex flex-col border border-border/30">
              <div className="flex items-center gap-2 mb-3">
                <TerminalIcon className="w-4 h-4 text-[hsl(var(--lightrail))]" />
                <h3 className="text-sm font-mono uppercase tracking-wider">API Key</h3>
              </div>
              <div className="flex-1 grid place-items-center my-3">
                <div className="w-28 h-28 rounded-xl bg-gradient-to-br from-[hsl(var(--lightrail))]/30 to-[hsl(var(--lightrail))]/5 border border-[hsl(var(--lightrail))]/40 grid place-items-center glow-primary">
                  <Zap className="w-10 h-10 text-[hsl(var(--lightrail))]" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="font-mono text-[11px] bg-background border border-[hsl(var(--terminal-border))] rounded px-2 py-1.5 text-center text-[hsl(var(--lightrail))] select-all">
                  {showKey ? fakeKey : "lro-•••••••••••••••••••••"}
                </div>
                <button
                  onClick={() => { setShowKey(true); copyKey(); }}
                  className="w-full flex items-center justify-center gap-1.5 bg-[hsl(var(--lightrail))] text-[hsl(var(--lightrail-foreground))] rounded px-3 py-2 text-[11px] font-mono uppercase tracking-wider font-bold hover:opacity-90 glow-primary transition"
                >
                  {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy Key</>}
                </button>
                <button className="w-full text-[10px] font-mono uppercase tracking-wider text-foreground/50 hover:text-[hsl(var(--lightrail))] py-1">
                  view_all_keys
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Models */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[hsl(var(--lightrail))]" />
              <h2 className="text-lg font-mono uppercase tracking-wider">Models</h2>
            </div>
            <button className="text-[10px] font-mono uppercase tracking-wider text-[hsl(var(--lightrail))] hover:underline">browse_all →</button>
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
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[hsl(var(--lightrail))]" />
              <h2 className="text-lg font-mono uppercase tracking-wider">Dedicated Endpoints</h2>
            </div>
            <button className="text-[10px] font-mono uppercase tracking-wider text-[hsl(var(--lightrail))] hover:underline">view_all →</button>
          </div>
          <p className="text-xs text-foreground/60 mb-4 max-w-3xl">
            Private, provisioned inference instances reserved exclusively for your organization.
            Predictable performance · custom fine-tuned weights · production SLAs.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DEDICATED.map((m) => (
              <div key={m.id} className="rounded-lg border border-[hsl(var(--terminal-border))] bg-[hsl(var(--terminal-bg))] p-5 hover:border-[hsl(var(--lightrail))]/40 transition">
                <div className="mb-2">
                  <div className="text-base font-bold font-mono">{m.name}</div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[hsl(var(--lightrail))]/80">{m.vendor}</div>
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
    <div className="rounded-lg border border-[hsl(var(--terminal-border))] bg-[hsl(var(--terminal-bg))] p-5 flex flex-col hover:border-[hsl(var(--lightrail))]/50 transition group">
      <div className="mb-2">
        <div className="text-base font-bold font-mono group-hover:text-[hsl(var(--lightrail))] transition">{m.name}</div>
        <div className="inline-block mt-1 font-mono text-[10px] text-[hsl(var(--lightrail))] bg-[hsl(var(--lightrail))]/10 border border-[hsl(var(--lightrail))]/30 rounded px-1.5 py-0.5">
          {m.id}
        </div>
      </div>
      <p className="text-xs text-foreground/70 leading-relaxed mb-4 line-clamp-4">{m.desc}</p>
      <div className="grid grid-cols-2 gap-3 mb-4 pt-3 border-t border-border/30">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-foreground/50">input</div>
          <div className="text-base font-bold font-mono tabular-nums text-[hsl(var(--lightrail))]">${m.input.toFixed(2)}</div>
          <div className="text-[10px] text-foreground/50">per 1M tokens</div>
        </div>
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-foreground/50">output</div>
          <div className="text-base font-bold font-mono tabular-nums text-[hsl(var(--lightrail))]">${m.output.toFixed(2)}</div>
          <div className="text-[10px] text-foreground/50">per 1M tokens</div>
        </div>
      </div>
      <button
        onClick={onTry}
        className="mt-auto flex items-center gap-1.5 bg-[hsl(var(--lightrail))] text-[hsl(var(--lightrail-foreground))] rounded px-3 py-2 text-[11px] font-mono uppercase tracking-wider font-bold hover:opacity-90 w-fit hover:glow-primary transition"
      >
        <ArrowRight className="w-3 h-3" />
        Try in Playground
      </button>
    </div>
  );
}
