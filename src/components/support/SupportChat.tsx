import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { MessageCircle, X, Send, UserRound, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };
type View = "chat" | "handoff" | "sent";

const GREETING: Msg = {
  role: "assistant",
  content: "Hi! I'm the LightOS assistant. Ask me about plans, connecting a GPU, or how LightOS works. Prefer a human? Press **Talk to a person**.",
};
const STORAGE_KEY = "lightos-support-chat";

async function errorMessage(error: unknown, fallback: string) {
  const ctx = (error as { context?: Response })?.context;
  if (ctx && typeof ctx.json === "function") {
    try { const b = await ctx.json(); if (b?.error) return String(b.error); } catch { /* ignore */ }
  }
  return fallback;
}

export function SupportChat() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("chat");
  const [messages, setMessages] = useState<Msg[]>(() => {
    try { const s = sessionStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s); } catch { /* ignore */ }
    return [GREETING];
  });
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30))); } catch { /* ignore */ } }, [messages]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [messages, busy, open, view]);
  useEffect(() => {
    if (!open || email) return;
    supabase.auth.getUser().then(({ data }) => { if (data.user?.email) setEmail(data.user.email); });
  }, [open, email]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user" as const, content: text.slice(0, 2000) }];
    setMessages(next); setInput(""); setBusy(true); setError(null);
    const history = next.filter((m) => m !== GREETING && !(m.role === "assistant" && m.content === GREETING.content)).slice(-16);
    const { data, error } = await supabase.functions.invoke("support-chat", { body: { action: "ask", messages: history } });
    setBusy(false);
    if (error || !data?.reply) { setError(await errorMessage(error, "The assistant is unavailable. You can still talk to a person.")); return; }
    setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
  };

  const openHandoff = () => {
    const lastQuestion = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    if (!note) setNote(lastQuestion);
    setError(null); setView("handoff");
  };

  const submitHandoff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError(null);
    const transcript = messages.filter((m) => m.content !== GREETING.content).slice(-30);
    const { error } = await supabase.functions.invoke("support-chat", {
      body: { action: "handoff", email: email.trim(), name: name.trim() || undefined, message: note.trim(), transcript, page: pathname },
    });
    setBusy(false);
    if (error) { setError(await errorMessage(error, "We couldn't send your message. Try again shortly.")); return; }
    setView("sent");
  };

  const onDesktop = pathname === "/os";

  return (
    <div className={cn("fixed right-4 z-[110] flex flex-col items-end gap-3 sm:right-6", onDesktop ? "bottom-20" : "bottom-4 sm:bottom-6")}>
      {open && (
        <section
          aria-label="Help chat"
          className="flex h-[min(560px,calc(100vh-7rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border border-primary/30 bg-card text-card-foreground shadow-[0_0_40px_-12px_hsl(var(--primary)/0.5)]"
        >
          <header className="flex items-center justify-between border-b border-border bg-background/60 px-4 py-3">
            <div className="flex items-center gap-2">
              {view !== "chat" && (
                <button type="button" onClick={() => { setView("chat"); setError(null); }} aria-label="Back to chat" className="text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
              <h2 className="font-mono text-sm font-bold">{view === "chat" ? "LightOS help" : "Talk to a person"}</h2>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close chat" className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </header>

          {view === "chat" && (
            <>
              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {messages.map((m, i) => (
                  <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed",
                      m.role === "user" ? "bg-primary text-primary-foreground" : "border border-border bg-muted/40 text-foreground",
                    )}>
                      {m.role === "assistant" ? (
                        <ReactMarkdown
                          components={{
                            p: (p) => <p className="mb-2 last:mb-0" {...p} />,
                            ul: (p) => <ul className="mb-2 list-disc space-y-1 pl-4 last:mb-0" {...p} />,
                            ol: (p) => <ol className="mb-2 list-decimal space-y-1 pl-4 last:mb-0" {...p} />,
                            a: (p) => <a className="text-primary underline underline-offset-2" {...p} />,
                            code: (p) => <code className="rounded bg-background px-1 font-mono text-xs" {...p} />,
                          }}
                        >{m.content}</ReactMarkdown>
                      ) : m.content}
                    </div>
                  </div>
                ))}
                {busy && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                    <Loader2 className="h-3 w-3 animate-spin" /> thinking…
                  </div>
                )}
                {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
              </div>
              <div className="border-t border-border p-3 space-y-2">
                <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask a question…"
                    maxLength={2000}
                    aria-label="Your question"
                    className="text-sm"
                  />
                  <Button type="submit" size="icon" disabled={busy || !input.trim()} aria-label="Send">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
                <Button type="button" variant="outline" size="sm" onClick={openHandoff} className="w-full font-mono text-xs">
                  <UserRound className="mr-2 h-3.5 w-3.5" /> Talk to a person
                </Button>
              </div>
            </>
          )}

          {view === "handoff" && (
            <form onSubmit={submitHandoff} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
              <p className="text-sm text-muted-foreground">Leave your email and question. The team will reply by email, and this chat will be included so you don't have to repeat yourself.</p>
              <label className="space-y-1 text-xs font-mono">
                <span>Email</span>
                <Input type="email" required maxLength={255} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
              </label>
              <label className="space-y-1 text-xs font-mono">
                <span>Name (optional)</span>
                <Input maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className="flex flex-1 flex-col space-y-1 text-xs font-mono">
                <span>Message</span>
                <Textarea required maxLength={4000} value={note} onChange={(e) => setNote(e.target.value)} className="min-h-[110px] flex-1 text-sm" />
              </label>
              {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
              <Button type="submit" disabled={busy || !email.trim() || !note.trim()} className="font-mono">
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Send to the team
              </Button>
            </form>
          )}

          {view === "sent" && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
              <CheckCircle2 className="h-10 w-10 text-primary" />
              <h3 className="font-mono font-bold">Message sent</h3>
              <p className="text-sm text-muted-foreground">Thanks! We'll reply to <span className="text-foreground">{email}</span>.</p>
              <Button variant="outline" size="sm" onClick={() => { setView("chat"); setNote(""); }} className="font-mono text-xs">Back to chat</Button>
            </div>
          )}
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close help chat" : "Open help chat"}
        aria-expanded={open}
        className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/50 bg-primary text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/0.55)] transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}
