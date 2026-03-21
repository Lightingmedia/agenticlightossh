import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import {
  Send,
  Sparkles,
  RotateCcw,
  Terminal,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aurora-playground`;

type Msg = { role: "user" | "assistant"; content: string };

const samplePrompts = [
  "Optimize All-Reduce for a 512-GPU MoE training cluster",
  "Diagnose thermal throttling on photonic ring topology",
  "Plan a zero-downtime migration from electrical to optical interconnect",
  "Analyze congestion patterns in a fat-tree fabric with 128 nodes",
];

async function streamChat({
  messages,
  onDelta,
  onDone,
  signal,
}: {
  messages: Msg[];
  onDelta: (text: string) => void;
  onDone: () => void;
  signal?: AbortSignal;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages }),
    signal,
  });

  if (!resp.ok || !resp.body) {
    if (resp.status === 429) throw new Error("Rate limited — please wait a moment.");
    if (resp.status === 402) throw new Error("Usage limit reached.");
    throw new Error("Failed to connect to Aurora.");
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let done = false;

  while (!done) {
    const { done: rDone, value } = await reader.read();
    if (rDone) break;
    buf += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { done = true; break; }
      try {
        const parsed = JSON.parse(json);
        const c = parsed.choices?.[0]?.delta?.content;
        if (c) onDelta(c);
      } catch {
        buf = line + "\n" + buf;
        break;
      }
    }
  }
  onDone();
}

const AuroraPlayground = () => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    const controller = new AbortController();
    abortRef.current = controller;

    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      await streamChat({
        messages: newMsgs,
        onDelta: upsert,
        onDone: () => setIsLoading(false),
        signal: controller.signal,
      });
    } catch (e: any) {
      if (e.name !== "AbortError") {
        toast.error(e.message || "Connection failed");
      }
      setIsLoading(false);
    }
  };

  const reset = () => {
    abortRef.current?.abort();
    setMessages([]);
    setInput("");
    setIsLoading(false);
  };

  return (
    <section className="py-20 px-4 border-t border-border">
      <div className="container mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <Badge className="mb-4 bg-accent/10 text-accent border-accent/30 font-mono text-xs">
            <Terminal className="w-3 h-3 mr-1" /> INTERACTIVE
          </Badge>
          <h2 className="text-3xl font-bold font-mono mb-3">Playground</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Try Aurora Pro on real infrastructure prompts. Responses are powered by live inference.
          </p>
        </motion.div>

        {/* Sample prompts */}
        {messages.length === 0 && (
          <div className="grid sm:grid-cols-2 gap-3 mb-6">
            {samplePrompts.map((p, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => send(p)}
                className="text-left p-4 rounded-xl border border-border/60 bg-card/40 hover:border-primary/40 hover:bg-card/70 transition-all text-sm text-muted-foreground font-mono group"
              >
                <Sparkles className="w-4 h-4 text-primary mb-2 group-hover:text-accent transition-colors" />
                {p}
              </motion.button>
            ))}
          </div>
        )}

        {/* Chat area */}
        <Card className="bg-card/50 border-border/60 overflow-hidden">
          <CardContent className="p-0">
            {/* Messages */}
            <div
              ref={scrollRef}
              className="min-h-[200px] max-h-[400px] overflow-y-auto p-6 space-y-4"
            >
              {messages.length === 0 && (
                <div className="flex items-center justify-center h-[200px] text-muted-foreground/50 font-mono text-sm">
                  Select a prompt or type your own…
                </div>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground font-mono"
                        : "bg-secondary/60 text-foreground"
                    }`}
                  >
                    {m.role === "assistant" ? (
                      <div className="prose prose-sm prose-invert max-w-none [&_p]:my-1 [&_li]:my-0.5 [&_code]:text-accent [&_code]:bg-secondary/80 [&_code]:px-1 [&_code]:rounded font-mono text-xs leading-relaxed">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                        {isLoading && i === messages.length - 1 && (
                          <span className="inline-block w-2 h-4 bg-accent/70 animate-pulse ml-0.5" />
                        )}
                      </div>
                    ) : (
                      m.content
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="border-t border-border p-4 flex gap-3 items-end">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder="Ask Aurora about photonic infrastructure…"
                className="font-mono text-sm min-h-[44px] max-h-[120px] resize-none bg-secondary/30 border-border/60"
                rows={1}
              />
              <div className="flex gap-2">
                {messages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={reset}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  size="icon"
                  onClick={() => send(input)}
                  disabled={isLoading || !input.trim()}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default AuroraPlayground;
