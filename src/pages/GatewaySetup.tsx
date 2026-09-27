import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Sparkles, Square, Copy } from "lucide-react";
import { toast } from "sonner";

type Env = { gpus: string; nodes: string; os: string; scheduler: string; network: string; serving: string; notes: string };

const FIELDS: { key: keyof Env; label: string; placeholder: string; long?: boolean }[] = [
  { key: "gpus", label: "GPU models & count", placeholder: "e.g. 32× H100 SXM 80GB, 8× L40S" },
  { key: "nodes", label: "Nodes", placeholder: "e.g. 4× DGX H100, bare metal" },
  { key: "os", label: "OS & driver", placeholder: "e.g. Ubuntu 22.04, driver 550, CUDA 12.4" },
  { key: "scheduler", label: "Scheduler", placeholder: "e.g. Kubernetes 1.29 with GPU Operator / Slurm / Ray" },
  { key: "network", label: "Network & access", placeholder: "e.g. InfiniBand NDR, private VPC, outbound HTTPS only" },
  { key: "serving", label: "Inference stack", placeholder: "e.g. Triton + TensorRT-LLM, NIM, vLLM, or none yet" },
  { key: "notes", label: "Anything else", placeholder: "Compliance needs, existing monitoring, constraints…", long: true },
];

type Item = { kind: "h" | "task" | "text"; text: string };

function parse(md: string): Item[] {
  return md.split("\n").flatMap<Item>((l) => {
    const t = l.trim();
    if (!t) return [];
    if (t.startsWith("#")) return [{ kind: "h", text: t.replace(/^#+\s*/, "") }];
    const m = t.match(/^[-*]\s*\[[ xX]?\]\s*(.*)$/);
    if (m) return [{ kind: "task", text: m[1] }];
    return [{ kind: "text", text: t.replace(/^[-*]\s+/, "") }];
  });
}

function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((p, i) =>
        p.startsWith("`") ? (
          <code key={i} className="font-mono text-xs px-1 py-0.5 rounded bg-muted text-primary">{p.slice(1, -1)}</code>
        ) : p.startsWith("**") ? (
          <strong key={i}>{p.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export default function GatewaySetup() {
  const [env, setEnv] = useState<Env>({ gpus: "", nodes: "", os: "", scheduler: "", network: "", serving: "", notes: "" });
  const [output, setOutput] = useState("");
  const [thinking, setThinking] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Record<number, boolean>>({});
  const abortRef = useRef<AbortController | null>(null);

  const generate = async () => {
    if (!Object.values(env).some((v) => v.trim())) {
      setError("Describe at least one part of your environment.");
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError("Please sign in to generate a checklist.");
      return;
    }
    setError(null); setOutput(""); setThinking(""); setDone({}); setLoading(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let text = "";
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gateway-checklist`, {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify(env),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Request failed (${res.status})`);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += dec.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 1);
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const ev = JSON.parse(payload);
            if (ev.type === "response.output_text.delta") { text += ev.delta; setOutput(text); }
            else if (ev.type === "response.reasoning_summary_text.delta") setThinking((t) => t + ev.delta);
            else if (ev.type === "error" || ev.type === "response.failed")
              throw new Error(ev.error?.message || ev.response?.error?.message || "Generation failed.");
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }
      if (!text.trim()) throw new Error("The model returned no checklist. Please try again later.");
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const items = parse(output);
  const tasks = items.filter((i) => i.kind === "task").length;
  const completed = Object.values(done).filter(Boolean).length;

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold font-mono text-foreground">Gateway Setup Assistant</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Describe your GPU environment and get a step-by-step checklist for deploying the LightOS runtime gateway and NVIDIA inference serving.
        </p>
      </div>

      <div className="grid lg:grid-cols-[380px_1fr] gap-6">
        <div className="rounded-lg border border-border bg-card p-5 space-y-4 h-fit">
          {FIELDS.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label htmlFor={f.key} className="text-xs font-mono uppercase tracking-wide text-muted-foreground">{f.label}</Label>
              {f.long ? (
                <Textarea id={f.key} maxLength={2000} rows={3} placeholder={f.placeholder} value={env[f.key]}
                  onChange={(e) => setEnv({ ...env, [f.key]: e.target.value })} />
              ) : (
                <Input id={f.key} maxLength={2000} placeholder={f.placeholder} value={env[f.key]}
                  onChange={(e) => setEnv({ ...env, [f.key]: e.target.value })} />
              )}
            </div>
          ))}
          {loading ? (
            <Button variant="outline" className="w-full" onClick={() => abortRef.current?.abort()}>
              <Square className="h-4 w-4 mr-2" /> Stop
            </Button>
          ) : (
            <Button className="w-full" onClick={generate}>
              <Sparkles className="h-4 w-4 mr-2" /> Generate checklist
            </Button>
          )}
          {error && (
            <p className="text-sm text-destructive">
              {error}{" "}
              {error.includes("sign in") && <Link to="/auth?next=/dashboard/gateway-setup" className="underline">Sign in</Link>}
            </p>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-5 min-h-[400px]">
          <div className="flex items-center justify-between mb-4">
            <div className="font-mono text-sm text-muted-foreground">
              {tasks > 0 ? <span className="text-primary">{completed}/{tasks} done</span> : "Your checklist will appear here"}
            </div>
            {output && !loading && (
              <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(output); toast.success("Copied"); }}>
                <Copy className="h-4 w-4 mr-1" /> Copy
              </Button>
            )}
          </div>

          {loading && !output && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mt-0.5 shrink-0" />
              <span className="line-clamp-4">{thinking || "Analyzing your environment…"}</span>
            </div>
          )}

          <div className="space-y-2">
            {items.map((it, i) =>
              it.kind === "h" ? (
                <h2 key={i} className="font-mono text-primary text-sm uppercase tracking-wider pt-4 first:pt-0">{it.text}</h2>
              ) : it.kind === "task" ? (
                <label key={i} className="flex items-start gap-3 text-sm cursor-pointer">
                  <Checkbox className="mt-0.5" checked={!!done[i]} onCheckedChange={(v) => setDone({ ...done, [i]: !!v })} />
                  <span className={done[i] ? "line-through text-muted-foreground" : "text-foreground"}><Inline text={it.text} /></span>
                </label>
              ) : (
                <p key={i} className="text-sm text-muted-foreground"><Inline text={it.text} /></p>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
