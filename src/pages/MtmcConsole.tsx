import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Activity, Zap, ArrowUpRight, DollarSign } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

type Call = {
  ts: number;
  text: string;
  escalated: boolean;
  primary_confidence: number;
  final_model: string;
  cost_usd: number;
  baseline_usd: number;
  latency_ms: number;
  reply: string;
  intent: string;
  domain: string;
};

const SAMPLES = [
  "Fabric utilization is spiking above 92% in rack B7 — reroute traffic.",
  "How much did inference cost me last week?",
  "Something feels off with the thermal readings, maybe.",
  "Deploy the Aurora Nano model to the edge cluster.",
];

export default function MtmcConsole() {
  const [text, setText] = useState(SAMPLES[0]);
  const [threshold, setThreshold] = useState(0.72);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calls, setCalls] = useState<Call[]>([]);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sign in to use MTMC.");
      const resp = await fetch(
        `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/mtmc`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ text, threshold }),
        },
      );
      const body = await resp.json();
      if (!resp.ok) throw new Error(body?.error ?? `HTTP ${resp.status}`);
      const c: Call = {
        ts: Date.now(),
        text,
        escalated: body.routing.escalated,
        primary_confidence: body.routing.primary_confidence,
        final_model: body.routing.final_model,
        cost_usd: body.cost.total_usd,
        baseline_usd: body.cost.baseline_always_fallback_usd,
        latency_ms: body.latency_ms,
        reply: body.result.reply,
        intent: body.result.intent,
        domain: body.result.domain,
      };
      setCalls((prev) => [c, ...prev].slice(0, 50));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const total = calls.length;
    const escalations = calls.filter((c) => c.escalated).length;
    const cost = calls.reduce((s, c) => s + c.cost_usd, 0);
    const baseline = calls.reduce((s, c) => s + c.baseline_usd, 0);
    const escalationRate = total ? escalations / total : 0;
    const savings = baseline - cost;
    const savingsPct = baseline > 0 ? savings / baseline : 0;
    return { total, escalations, escalationRate, cost, baseline, savings, savingsPct };
  }, [calls]);

  const pieData = [
    { name: "Flash Lite (cheap)", value: stats.total - stats.escalations, color: "#00FF88" },
    { name: "Escalated (Pro)", value: stats.escalations, color: "#F59E0B" },
  ];

  const barData = calls
    .slice(0, 20)
    .reverse()
    .map((c, i) => ({
      idx: i + 1,
      confidence: +(c.primary_confidence * 100).toFixed(1),
      escalated: c.escalated ? 100 : 0,
    }));

  return (
    <div className="min-h-screen bg-background text-foreground p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="font-mono text-2xl text-primary flex items-center gap-2">
          <Zap className="w-6 h-6" /> MTMC Console
        </h1>
        <p className="text-sm text-muted-foreground">
          Multi-Task Model Consolidation — one call returns intent + slots + actions. Cheap model first; escalate on low confidence.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 bg-card/50 border-border">
          <CardHeader><CardTitle className="font-mono text-base">Run request</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              className="font-mono text-sm"
              placeholder="Operator utterance…"
            />
            <div className="flex flex-wrap gap-2">
              {SAMPLES.map((s) => (
                <Button key={s} size="sm" variant="outline" onClick={() => setText(s)} className="text-xs">
                  {s.slice(0, 40)}…
                </Button>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-mono">Escalation threshold</span>
                <span className="font-mono text-primary">{threshold.toFixed(2)}</span>
              </div>
              <Slider
                min={0} max={1} step={0.01}
                value={[threshold]}
                onValueChange={(v) => setThreshold(v[0])}
              />
              <p className="text-xs text-muted-foreground">
                If Flash Lite's confidence is below this value, the request is escalated to Gemini 3.1 Pro.
                Lower it to save more; raise it to increase quality.
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={run} disabled={loading || !text.trim()} className="font-mono">
                {loading ? "Running…" : "Run MTMC"}
              </Button>
              <Button variant="ghost" onClick={() => setCalls([])} disabled={!calls.length}>
                Clear history
              </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border">
          <CardHeader><CardTitle className="font-mono text-base flex items-center gap-2">
            <Activity className="w-4 h-4" /> Session stats
          </CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Total calls" value={stats.total} />
            <Row label="Escalations" value={`${stats.escalations} (${(stats.escalationRate * 100).toFixed(0)}%)`} />
            <Row label="Actual cost" value={`$${stats.cost.toFixed(5)}`} icon={<DollarSign className="w-3 h-3" />} />
            <Row label="Baseline (all Pro)" value={`$${stats.baseline.toFixed(5)}`} />
            <Row
              label="Savings"
              value={`$${stats.savings.toFixed(5)} (${(stats.savingsPct * 100).toFixed(0)}%)`}
              highlight={stats.savings > 0}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card/50 border-border">
          <CardHeader><CardTitle className="font-mono text-base">Model routing mix</CardTitle></CardHeader>
          <CardContent style={{ height: 260 }}>
            {stats.total === 0 ? (
              <EmptyChart label="Run a request to see routing." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {pieData.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0b0f14", border: "1px solid #333" }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border">
          <CardHeader><CardTitle className="font-mono text-base">Per-request confidence & escalations</CardTitle></CardHeader>
          <CardContent style={{ height: 260 }}>
            {stats.total === 0 ? (
              <EmptyChart label="No data yet." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <XAxis dataKey="idx" stroke="#888" fontSize={11} />
                  <YAxis stroke="#888" fontSize={11} domain={[0, 100]} unit="%" />
                  <Tooltip contentStyle={{ background: "#0b0f14", border: "1px solid #333" }} />
                  <Bar dataKey="confidence" fill="#00FF88" name="Primary confidence %" />
                  <Bar dataKey="escalated" fill="#F59E0B" name="Escalated (100=yes)" />
                </BarChart>
              </ResponsiveContainer>
            )}
            <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
              <span>Threshold line at {(threshold * 100).toFixed(0)}%.</span>
              <span>Bars below it trigger escalation.</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 border-border">
        <CardHeader><CardTitle className="font-mono text-base">Recent calls</CardTitle></CardHeader>
        <CardContent>
          {calls.length === 0 ? (
            <p className="text-sm text-muted-foreground">No calls yet.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-auto">
              {calls.map((c) => (
                <div key={c.ts} className="border border-border rounded-md p-3 text-xs space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="font-mono">{c.intent}</Badge>
                    <Badge variant="secondary" className="font-mono">{c.domain}</Badge>
                    <Badge className={c.escalated ? "bg-amber-500/20 text-amber-400" : "bg-primary/20 text-primary"}>
                      {c.escalated ? <><ArrowUpRight className="w-3 h-3 mr-1" />escalated</> : "flash-lite"}
                    </Badge>
                    <span className="text-muted-foreground">
                      conf {(c.primary_confidence * 100).toFixed(0)}% · {c.latency_ms}ms · ${c.cost_usd.toFixed(5)}
                    </span>
                  </div>
                  <div className="text-muted-foreground truncate">"{c.text}"</div>
                  <div className="text-foreground">{c.reply}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, icon, highlight }: { label: string; value: React.ReactNode; icon?: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground flex items-center gap-1">{icon}{label}</span>
      <span className={`font-mono ${highlight ? "text-primary" : ""}`}>{value}</span>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return <div className="h-full flex items-center justify-center text-sm text-muted-foreground">{label}</div>;
}
