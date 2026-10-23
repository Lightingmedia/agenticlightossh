import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Copy, Loader2, PlugZap, XCircle } from "lucide-react";
import { toast } from "sonner";

const STEPS: { title: string; cmd: string }[] = [
  {
    title: "1. On your Brev GPU instance (VM mode), start the gateway",
    cmd: `cd gateway
docker compose up -d --build`,
  },
  {
    title: "2. Print the public URL and check it",
    cmd: `set -a; . ./.env; set +a
for i in $(seq 1 30); do URL=$(docker compose logs tunnel-quick 2>/dev/null | grep -o 'https://[a-z0-9-]*\\.trycloudflare\\.com' | tail -1); [ -n "$URL" ] && break; sleep 2; done
echo "Gateway URL: $URL"
curl -s -H "Authorization: Bearer $LIGHTOS_GATEWAY_TOKEN" "$URL/v1/fabric/capacity?runtime=cuda"`,
  },
];

type Result = { ok: boolean; title: string; detail: string };

function explain(body: any): Result {
  if (!body) return { ok: false, title: "No answer", detail: "The app's gateway check did not respond." };
  if (body.configured === false)
    return { ok: false, title: "Gateway not set up", detail: "Save the gateway URL and token in the app first." };
  if (body.cause === "token_mismatch")
    return { ok: false, title: "Token mismatch (401)", detail: "The token saved in the app differs from LIGHTOS_GATEWAY_TOKEN in the instance's .env." };
  if (body.cause === "unreachable")
    return { ok: false, title: "Gateway unreachable", detail: "The tunnel is down or its URL changed. Quick-tunnel URLs change on every restart." };
  if (body.error) return { ok: false, title: "Gateway error", detail: String(body.error) };
  const devices = body.capacity?.totals?.devices ?? 0;
  if (!devices)
    return { ok: false, title: "No GPUs visible", detail: `Gateway answered, but sees no GPUs (${body.capacity?.reason ?? "unknown reason"}).` };
  const src = body.telemetry?.collector ?? "unknown";
  return { ok: true, title: "Connected", detail: `${devices} GPU${devices > 1 ? "s" : ""} visible · telemetry via ${String(src).toUpperCase()}` };
}

export default function GatewayBrevSetup() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const test = async () => {
    setTesting(true);
    setResult(null);
    const { data, error } = await supabase.functions.invoke("gateway-telemetry");
    let body: any = data;
    if (error) {
      try { body = await (error as { context?: Response }).context?.json(); } catch { body = null; }
      if (!body) body = { configured: true, error: error.message };
    }
    setResult(explain(body));
    setTesting(false);
  };

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-mono font-bold text-foreground">NVIDIA Brev quick start</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Run the gateway on one Brev GPU instance. HTTPS comes from an outbound Cloudflare tunnel, so no ports need opening.
          </p>
        </div>
        <Button onClick={test} disabled={testing}>
          {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlugZap className="h-4 w-4 mr-2" />}
          Test connection
        </Button>
      </div>

      {result && (
        <div className={`flex items-start gap-2 text-sm rounded-md border p-3 ${result.ok ? "border-primary/40" : "border-destructive/40"}`}>
          {result.ok ? <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" /> : <XCircle className="h-4 w-4 text-destructive mt-0.5" />}
          <div>
            <div className={`font-mono ${result.ok ? "text-primary" : "text-destructive"}`}>{result.title}</div>
            <div className="text-muted-foreground">{result.detail}</div>
          </div>
        </div>
      )}

      {STEPS.map((s) => (
        <div key={s.title} className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wide text-muted-foreground">{s.title}</span>
            <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(s.cmd); toast.success("Copied"); }}>
              <Copy className="h-3.5 w-3.5 mr-1" /> Copy
            </Button>
          </div>
          <pre className="font-mono text-xs bg-background border border-border rounded-md p-3 overflow-x-auto text-foreground whitespace-pre">{s.cmd}</pre>
        </div>
      ))}

      <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
        <li>3. Enter the printed URL and your existing gateway token in the connection form above (never in chat).</li>
        <li>Quick-tunnel URLs <strong>change every time the tunnel restarts</strong>. When that happens, rerun step 2 and update the URL. Use a named Cloudflare tunnel for a stable address.</li>
        <li>No GPU readings are ever made up. If the gateway sees no GPUs, the test says so and gives the reason.</li>
      </ul>
    </div>
  );
}
