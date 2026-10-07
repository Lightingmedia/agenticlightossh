import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Copy, Loader2, AlertTriangle, CheckCircle2, XCircle, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Ver = { present: boolean; version: string | null };
type Report = {
  hostname: string;
  os: string;
  driver: Ver;
  nvcc: Ver;
  cudart: Ver;
  gpus: { index: number; name: string; memory_total_mib: number | null; compute_capability: string | null }[];
};
type Status = {
  status: "pending" | "reported";
  report: Report | null;
  gateway_status: "accepted" | "not_configured" | "error" | null;
  gateway_message: string | null;
  expires_at: string;
  gateway: "configured" | "not_configured";
};

export default function CudaPdkStep({ onComplete }: { onComplete: () => void }) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [enroll, setEnroll] = useState<{ id: string; code: string; expires_at: string; gateway: string } | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const completed = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  const createCode = async () => {
    setCreating(true);
    setError(null);
    setStatus(null);
    const { data, error } = await supabase.functions.invoke("node-enroll", { body: { action: "create" } });
    setCreating(false);
    if (error || data?.error) return setError(data?.error ?? "Could not create a setup code");
    setEnroll(data);
  };

  useEffect(() => {
    if (!enroll) return;
    let stop = false;
    const tick = async () => {
      const { data, error } = await supabase.functions.invoke("node-enroll", { body: { action: "status", id: enroll.id } });
      if (stop) return;
      if (error || data?.error) setError(data?.error ?? "Status check failed");
      else setStatus(data as Status);
    };
    tick();
    const t = setInterval(() => {
      if (status?.status === "reported") return;
      tick();
    }, 4000);
    return () => { stop = true; clearInterval(t); };
  }, [enroll, status?.status]);

  useEffect(() => {
    if (status?.gateway_status === "accepted" && !completed.current) {
      completed.current = true;
      onComplete();
    }
  }, [status, onComplete]);

  const command = enroll ? `lightos cuda --code ${enroll.code}` : "";
  const copy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (signedIn === false) {
    return (
      <div className="terminal-window p-6 text-sm text-muted-foreground">
        Sign in to get a setup code for your GPU machine.
        <div className="mt-4"><Link to="/auth"><Button className="font-mono">Sign in</Button></Link></div>
      </div>
    );
  }

  const expired = enroll && new Date(enroll.expires_at) < new Date() && status?.status !== "reported";
  const r = status?.report;

  return (
    <div className="space-y-4">
      {(status?.gateway ?? enroll?.gateway) === "not_configured" && (
        <div className="flex items-start gap-2 p-3 rounded-lg border border-yellow-500/40 bg-yellow-500/10 text-sm">
          <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
          <div>
            <span className="font-mono font-bold text-foreground">Gateway not connected.</span>{" "}
            <span className="text-muted-foreground">Your machine can still report what it found, but this step only completes once your runtime gateway accepts it. </span>
            <Link to="/dashboard/gateway-setup" className="text-primary underline">Gateway setup</Link>
          </div>
        </div>
      )}

      {!enroll || expired ? (
        <Button onClick={createCode} disabled={creating} className="font-mono">
          {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
          {expired ? "Code expired — get a new one" : "Get setup code"}
        </Button>
      ) : (
        <div className="terminal-window overflow-hidden">
          <div className="px-4 py-2 border-b border-border bg-card/50 font-mono text-xs text-muted-foreground">
            Run on your GPU machine · code valid 15 min, one use · add <span className="text-primary">--install-cuda</span> to install nvcc/cudart
          </div>
          <div className="px-4 py-3 flex items-center justify-between gap-4">
            <code className="font-mono text-sm text-cyan-300"><span className="text-muted-foreground mr-2">~</span>{command}</code>
            <button onClick={copy} aria-label="Copy command" className="text-muted-foreground hover:text-foreground p-1.5">
              {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {error && <div className="text-sm text-destructive font-mono">{error}</div>}

      {enroll && !expired && (
        <div className="terminal-window p-4 min-h-[180px] font-mono text-xs space-y-1">
          {status?.status !== "reported" ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" /> Waiting for node…
            </div>
          ) : r && (
            <>
              <div className="text-muted-foreground">{r.hostname} · {r.os}</div>
              <Line ok={r.driver.present} label={`NVIDIA driver ${r.driver.version ?? ""}`} miss="NVIDIA driver not found" />
              {r.gpus.map((g) => (
                <div key={g.index} className="text-foreground pl-5">[{g.index}] {g.name} · {g.memory_total_mib ?? "?"} MiB · cc {g.compute_capability ?? "?"}</div>
              ))}
              <Line ok={r.nvcc.present} label={`nvcc ${r.nvcc.version ?? ""}`} miss="nvcc not found" />
              <Line ok={r.cudart.present} label={`CUDA runtime ${r.cudart.version ?? ""}`} miss="CUDA runtime not found" />
              <div className="pt-2">
                {status.gateway_status === "accepted" && <span className="text-green-400">✓ Accepted by runtime gateway</span>}
                {status.gateway_status === "not_configured" && <span className="text-yellow-400">⚠ Not sent — gateway not connected</span>}
                {status.gateway_status === "error" && <span className="text-destructive">✗ Gateway error: {status.gateway_message}</span>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Line({ ok, label, miss }: { ok: boolean; label: string; miss: string }) {
  return ok
    ? <div className="flex items-center gap-2 text-green-400"><CheckCircle2 className="w-3 h-3" />{label}</div>
    : <div className="flex items-center gap-2 text-yellow-400"><XCircle className="w-3 h-3" />{miss}</div>;
}
