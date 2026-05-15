import { useEffect, useRef, useState } from "react";
import { Coins, Zap, Copy, Check, Send, Sparkles, Terminal, Code2, Gauge } from "lucide-react";

const MODELS = [
  { id: "llama-3.3-70b", label: "Llama 3.3 70B", tps: "~2,200 t/s", price: "$0.85 / 1M" },
  { id: "llama3.1-8b", label: "Llama 3.1 8B", tps: "~2,600 t/s", price: "$0.10 / 1M" },
  { id: "llama-4-scout-17b-16e-instruct", label: "Llama 4 Scout 17B", tps: "~2,600 t/s", price: "$0.65 / 1M" },
  { id: "qwen-3-32b", label: "Qwen 3 32B", tps: "~2,100 t/s", price: "$0.40 / 1M" },
];

type Msg = { role: "user" | "assistant" | "system"; content: string };

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cerebras-inference`;

export function TokenFactoryApp() {
  const [tab, setTab] = useState<"playground" | "code">("playground");
  const [model, setModel] = useState(MODELS[0].id);
  const [input, setInput] = useState("Explain photonic interconnects in one paragraph.");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [tps, setTps] = useState(0);
  const [tokens, setTokens] = useState(0);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || streaming) return;
    const userMsg: Msg = { role: "user", content: input };
    const next = [...messages, userMsg];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);
    setTokens(0);
    const start = performance.now();
    let assistantSoFar = "";
    let tokenCount = 0;

    try {
      const resp = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ model, messages: next }),
      });
      if (!resp.ok || !resp.body) {
        const err = await resp.text();
        throw new Error(err || `HTTP ${resp.status}`);
      }

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
              assistantSoFar += c;
              tokenCount += Math.max(1, Math.round(c.length / 4));
              setTokens(tokenCount);
              const elapsed = (performance.now() - start) / 1000;
              setTps(Math.round(tokenCount / Math.max(0.1, elapsed)));
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: assistantSoFar };
                return copy;
              });
            }
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
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

  const codeSample = `import { Cerebras } from "@cerebras/cerebras_cloud_sdk";

const client = new Cerebras({ apiKey: process.env.CEREBRAS_API_KEY });

const stream = await client.chat.completions.create({
  model: "${model}",
  stream: true,
  messages: [
    { role: "user", content: "Hello from LightOS" }
  ],
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || "");
}`;

  const copy = async () => {
    await navigator.clipboard.writeText(codeSample);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground font-mono overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/40 bg-gradient-to-br from-primary/10 via-card/20 to-transparent">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-[10px] uppercase tracking-widest text-foreground/50">Token Factory · Get Started</span>
            </div>
            <h1 className="text-2xl font-bold">Inference from LightOS — <span className="text-primary">cheaper & faster</span></h1>
            <p className="text-xs text-foreground/60 mt-1">Powered by Cerebras Wafer-Scale. Sub-second responses on frontier models.</p>
          </div>
          <div className="flex gap-2">
            <div className="rounded-lg border border-border/40 bg-card/40 px-3 py-2 text-right">
              <div className="text-[9px] uppercase text-foreground/40">Live TPS</div>
              <div className="text-lg font-bold text-emerald-400 tabular-nums">{tps || "—"}</div>
            </div>
            <div className="rounded-lg border border-border/40 bg-card/40 px-3 py-2 text-right">
              <div className="text-[9px] uppercase text-foreground/40">Tokens</div>
              <div className="text-lg font-bold text-primary tabular-nums">{tokens}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Model picker */}
      <div className="px-6 py-3 border-b border-border/40 bg-card/20">
        <div className="text-[9px] uppercase tracking-widest text-foreground/40 mb-2">Choose a model</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {MODELS.map((m) => (
            <button
              key={m.id}
              onClick={() => setModel(m.id)}
              className={`text-left rounded-lg border p-2 transition ${
                model === m.id
                  ? "border-primary/60 bg-primary/10 ring-1 ring-primary/40"
                  : "border-border/40 bg-card/40 hover:border-border"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Zap className="w-3 h-3 text-primary" />
                <span className="text-xs font-bold">{m.label}</span>
              </div>
              <div className="flex items-center justify-between text-[9px] text-foreground/50">
                <span className="text-emerald-400">{m.tps}</span>
                <span>{m.price}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/40 bg-card/10">
        {[
          { id: "playground", label: "Playground", icon: Terminal },
          { id: "code", label: "Code Sample", icon: Code2 },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs border-b-2 transition ${
              tab === t.id ? "border-primary text-primary" : "border-transparent text-foreground/50 hover:text-foreground"
            }`}
          >
            <t.icon className="w-3 h-3" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Body */}
      {tab === "playground" ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="h-full grid place-items-center text-center text-foreground/40 text-xs">
                <div>
                  <Coins className="w-8 h-8 mx-auto mb-2 text-primary/40" />
                  <div>Send a prompt to mint your first tokens</div>
                  <div className="mt-1 text-[10px]">Streamed at wafer-scale speed</div>
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-xs whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-primary/15 border border-primary/30 text-foreground"
                      : "bg-card/60 border border-border/40 text-foreground/90"
                  }`}
                >
                  <div className="text-[9px] uppercase opacity-50 mb-1">{m.role}</div>
                  {m.content || (streaming && i === messages.length - 1 ? <span className="inline-block w-2 h-3 bg-primary animate-pulse" /> : null)}
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-border/40 bg-card/30">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
                disabled={streaming}
                placeholder="Ask anything…"
                className="flex-1 bg-background/60 border border-border/40 rounded px-3 py-2 text-xs focus:outline-none focus:border-primary/60"
              />
              <button
                onClick={send}
                disabled={streaming || !input.trim()}
                className="flex items-center gap-1 px-4 py-2 rounded bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 disabled:opacity-40 transition"
              >
                <Send className="w-3 h-3" />
                {streaming ? "Streaming…" : "Send"}
              </button>
            </div>
            <div className="flex items-center gap-3 mt-2 text-[9px] text-foreground/40">
              <span className="flex items-center gap-1"><Gauge className="w-3 h-3" /> {model}</span>
              <span>· secure proxy via LightOS edge</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="rounded-lg border border-border/40 bg-card/60 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 bg-card/40">
              <span className="text-[10px] uppercase text-foreground/50">Node.js · streaming</span>
              <button onClick={copy} className="flex items-center gap-1 text-[10px] text-foreground/60 hover:text-primary">
                {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
              </button>
            </div>
            <pre className="p-4 text-[11px] leading-relaxed text-foreground/80 overflow-x-auto"><code>{codeSample}</code></pre>
          </div>
          <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-[11px] text-foreground/70">
            <div className="font-bold text-primary mb-1">💡 Tip</div>
            Your API key is securely stored in LightOS and proxied through an edge function — never expose it client-side.
          </div>
        </div>
      )}
    </div>
  );
}
