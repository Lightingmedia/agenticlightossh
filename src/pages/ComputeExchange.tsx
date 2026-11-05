import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Clock, Lock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

/** Non-redirecting session check — demo mode must stay available signed-out. */
function useSession() {
  const [user, setUser] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);
  return { user, loading };
}
import {
  DEMO_FLAG_KEY, DataState, Offer, Plan, WorkloadSpec, evaluateOffer, idempotencyKey, isPlanExpired, offerLabel, stateLabel,
} from "@/lib/exchange/core";
import { DEFAULT_SPEC, DEMO_OFFERS } from "@/lib/exchange/demo-fixtures";
import { cancelWorkload, fetchCatalog, fetchWorkloads, submitPlan, toOffer, Workload } from "@/lib/exchange/api";

const SECTIONS = [
  ["overview", "Overview"], ["plan", "Plan a Workload"], ["catalog", "Compute Catalog"], ["workloads", "Workloads"],
  ["clusters", "Clusters & Fabric"], ["costs", "Costs & Budgets"], ["policies", "Policies & Approvals"],
  ["providers", "Provider Connections"], ["audit", "Audit Log"], ["settings", "Organization Settings"],
] as const;

const SETUP_HINT: Record<string, { text: string; link?: [string, string] }> = {
  clusters: { text: "Discovered topology appears once a runtime gateway reports it.", link: ["/dashboard/gateway-setup", "Connect a GPU"] },
  policies: { text: "Policy and approval rules beyond plan expiry are not available yet." },
  providers: { text: "Validated provider connections are managed on the Compute Providers page.", link: ["/dashboard/providers", "Compute Providers"] },
  audit: { text: "The audit log records plans, approvals and outcomes once execution exists. Plan approvals appear under Workloads." },
  settings: { text: "Organizations and roles are not available yet; your account is a single-user workspace." },
};

function StateBadge({ s }: { s: DataState }) {
  const tone = s === "live" ? "default" : s === "demo" ? "secondary" : "outline";
  return <Badge variant={tone} className="font-mono text-[10px] uppercase">{stateLabel(s)}</Badge>;
}

function SetupRequired({ id }: { id: string }) {
  const h = SETUP_HINT[id] ?? { text: "This section is not available yet." };
  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-3">
      <div className="flex items-center gap-2"><Lock className="w-4 h-4 text-muted-foreground" /><StateBadge s="setup_required" /></div>
      <p className="text-sm text-muted-foreground max-w-prose">{h.text}</p>
      {h.link && <Button asChild variant="outline" size="sm"><Link to={h.link[0]}>{h.link[1]}</Link></Button>}
    </div>
  );
}

function SignInRequired() {
  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-3">
      <StateBadge s="unavailable" />
      <p className="text-sm text-muted-foreground">Sign in to use the live exchange. Demo mode works without an account.</p>
      <Button asChild variant="outline" size="sm"><Link to="/auth">Sign in</Link></Button>
    </div>
  );
}

export default function ComputeExchange() {
  const { section = "overview" } = useParams();
  const { user, loading: authLoading } = useSession();
  const [demo, setDemo] = useState(() => localStorage.getItem(DEMO_FLAG_KEY) === "1");
  const toggleDemo = (v: boolean) => { setDemo(v); localStorage.setItem(DEMO_FLAG_KEY, v ? "1" : "0"); };
  const title = SECTIONS.find(([k]) => k === section)?.[1] ?? "Overview";
  const demoCapable = section === "plan" || section === "catalog";
  const liveCapable = ["overview", "plan", "catalog", "workloads", "costs"].includes(section);

  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [workloads, setWorkloads] = useState<Workload[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = () => {
    if (!user) return;
    setLoadError(null);
    fetchCatalog().then((r) => setOffers(r.offers.map(toOffer))).catch((e) => setLoadError(e.message));
    fetchWorkloads().then((r) => setWorkloads(r.workloads)).catch((e) => setLoadError(e.message));
  };
  useEffect(reload, [user]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-primary">LIGHTOS COMPUTE EXCHANGE</p>
          <h1 className="font-mono text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">Compare compatible capacity, approve a costed plan, and track it. Plans are estimates — no resources are provisioned.</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="demo" checked={demo} onCheckedChange={toggleDemo} />
          <Label htmlFor="demo" className="text-sm">Demo mode</Label>
        </div>
      </header>

      {demo && (
        <div role="status" className="flex items-center gap-2 rounded-md border border-accent bg-accent/10 px-4 py-2 text-sm">
          <AlertTriangle className="w-4 h-4" /> Demo data — no resources will be provisioned.
        </div>
      )}
      {loadError && <p role="alert" className="text-sm text-destructive">{loadError}</p>}

      <nav aria-label="Exchange sections" className="flex flex-wrap gap-1 border-b border-border pb-2">
        {SECTIONS.map(([k, label]) => (
          <NavLink key={k} to={`/dashboard/exchange/${k}`}
            className={({ isActive }) => `rounded px-3 py-1.5 text-xs font-mono focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${isActive || (k === "overview" && section === "overview") ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            {label}
          </NavLink>
        ))}
      </nav>

      {demoCapable && demo ? (section === "plan" ? <Planner offers={DEMO_OFFERS} demo /> : <Catalog offers={DEMO_OFFERS} state="demo" />)
        : !liveCapable ? <SetupRequired id={section} />
        : authLoading ? <p className="text-sm text-muted-foreground">Loading…</p>
        : !user ? <SignInRequired />
        : section === "catalog" ? (offers ? <Catalog offers={offers} state="live" /> : <p className="text-sm text-muted-foreground">Loading catalog…</p>)
        : section === "plan" ? (offers ? <Planner offers={offers} demo={false} onPlanned={reload} /> : <p className="text-sm text-muted-foreground">Loading catalog…</p>)
        : section === "workloads" ? <Workloads workloads={workloads} onChanged={reload} />
        : section === "costs" ? <Costs workloads={workloads} />
        : <Overview offers={offers} workloads={workloads} />}
    </div>
  );
}

function Overview({ offers, workloads }: { offers: Offer[] | null; workloads: Workload[] | null }) {
  const active = workloads?.filter((w) => w.status === "approved") ?? [];
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="font-mono text-xs text-muted-foreground">CATALOG OFFERS</p>
        <p className="font-mono text-3xl">{offers?.length ?? "—"}</p>
        <p className="text-xs text-muted-foreground">Published list prices, labeled with source and date.</p>
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="font-mono text-xs text-muted-foreground">APPROVED PLANS</p>
        <p className="font-mono text-3xl">{active.length}</p>
        <p className="text-xs text-muted-foreground">Cost-estimate records. Nothing has been provisioned.</p>
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="font-mono text-xs text-muted-foreground">MAX AUTHORIZED SPEND</p>
        <p className="font-mono text-3xl">{active.length ? `${active.reduce((a, w) => a + Number(w.max_spend), 0).toFixed(2)} ${active[0].currency}` : "—"}</p>
        <p className="text-xs text-muted-foreground">Sum of approved plan ceilings, not charges.</p>
      </div>
    </div>
  );
}

function Catalog({ offers, state }: { offers: Offer[]; state: DataState }) {
  return (
    <div className="rounded-lg border border-border overflow-x-auto">
      <Table>
        <TableHeader><TableRow>
          {["Provider", "Region", "Accelerator", "Mem", "Count", "Runtime", "Model", "Price", "Commitment", "Status", "Compliance", "Source"].map((h) => <TableHead key={h}>{h}</TableHead>)}
        </TableRow></TableHeader>
        <TableBody>
          {offers.map((o) => (
            <TableRow key={o.id}>
              <TableCell>{o.provider} <StateBadge s={state} /></TableCell>
              <TableCell>{o.region}</TableCell><TableCell>{o.accelerator}</TableCell><TableCell>{o.memoryGb} GB</TableCell>
              <TableCell>{o.count}</TableCell><TableCell>{o.runtime}</TableCell><TableCell>{o.purchaseModel}</TableCell>
              <TableCell className="font-mono">{o.pricePerHour == null ? "—" : `${o.pricePerHour} ${o.currency}/GPU·h`}</TableCell>
              <TableCell>{o.minCommitment}</TableCell><TableCell>{offerLabel(o.kind)}</TableCell>
              <TableCell>{o.compliance ?? "Not verified"}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{new Date(o.sourceAt).toLocaleDateString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function Workloads({ workloads, onChanged }: { workloads: Workload[] | null; onChanged: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!workloads) return <p className="text-sm text-muted-foreground">Loading workloads…</p>;
  if (workloads.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 space-y-3">
        <StateBadge s="live" />
        <p className="text-sm text-muted-foreground">No plans yet. Approve one in Plan a Workload and it will appear here.</p>
        <Button asChild variant="outline" size="sm"><Link to="/dashboard/exchange/plan">Plan a Workload</Link></Button>
      </div>
    );
  }
  const cancel = async (id: string) => {
    setBusy(id); setError(null);
    try { await cancelWorkload(id); onChanged(); } catch (e) { setError(e instanceof Error ? e.message : "Cancel failed"); } finally { setBusy(null); }
  };
  return (
    <div className="space-y-3">
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {workloads.map((w) => (
        <div key={w.id} className="rounded-lg border border-border bg-card p-4 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              {w.status === "approved" ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <XCircle className="w-4 h-4 text-muted-foreground" />}
              {w.spec.accelerator} × {w.spec.count} · {w.spec.workloadType} · {w.spec.hours}h
              <Badge variant={w.status === "approved" ? "default" : "outline"} className="font-mono text-[10px] uppercase">{w.status}</Badge>
            </div>
            {w.status === "approved" && (
              <Button size="sm" variant="outline" disabled={busy === w.id} onClick={() => cancel(w.id)}>
                {busy === w.id ? "Cancelling…" : "Cancel plan"}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            Estimate {Number(w.estimate_low).toFixed(2)}–{Number(w.estimate_high).toFixed(2)} {w.currency} · max spend {Number(w.max_spend).toFixed(2)} {w.currency} · planned {new Date(w.created_at).toLocaleString()}
          </p>
          {w.exchange_workload_events?.length > 0 && (
            <ul className="text-xs text-muted-foreground list-disc ml-5">
              {w.exchange_workload_events.map((ev, i) => <li key={i}>{ev.status} — {ev.note ?? ""} ({new Date(ev.created_at).toLocaleString()})</li>)}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

function Costs({ workloads }: { workloads: Workload[] | null }) {
  if (!workloads) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const active = workloads.filter((w) => w.status === "approved");
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4 space-y-1">
        <StateBadge s="live" />
        <p className="text-sm text-muted-foreground">
          These are <strong>estimates</strong> from published list prices. No provider has billed you and no accrued charges exist —
          execution is not available yet, so estimated, accrued and reconciled charges are shown separately and accrued is zero.
        </p>
      </div>
      <div className="rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            {["Plan", "Status", "Estimate low", "Estimate high", "Max authorized", "Accrued"].map((h) => <TableHead key={h}>{h}</TableHead>)}
          </TableRow></TableHeader>
          <TableBody>
            {workloads.length === 0 && <TableRow><TableCell colSpan={6} className="text-muted-foreground">No plans yet.</TableCell></TableRow>}
            {workloads.map((w) => (
              <TableRow key={w.id}>
                <TableCell className="font-mono text-xs">{w.spec.accelerator} × {w.spec.count} · {w.spec.hours}h</TableCell>
                <TableCell>{w.status}</TableCell>
                <TableCell className="font-mono">{Number(w.estimate_low).toFixed(2)} {w.currency}</TableCell>
                <TableCell className="font-mono">{Number(w.estimate_high).toFixed(2)} {w.currency}</TableCell>
                <TableCell className="font-mono">{Number(w.max_spend).toFixed(2)} {w.currency}</TableCell>
                <TableCell className="font-mono">0.00 {w.currency}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {active.length > 0 && (
        <p className="text-xs text-muted-foreground">Budget note: plan ceilings are records in LightOS — they do not stop provider billing.</p>
      )}
    </div>
  );
}

function Planner({ offers, demo, onPlanned }: { offers: Offer[]; demo: boolean; onPlanned?: () => void }) {
  const [spec, setSpec] = useState<WorkloadSpec>(DEFAULT_SPEC);
  const [selected, setSelected] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [status, setStatus] = useState<"idle" | "pending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const sent = useRef(new Set<string>());
  const evals = useMemo(() => offers.map((o) => evaluateOffer(spec, o)), [spec, offers]);
  const set = <K extends keyof WorkloadSpec>(k: K, v: WorkloadSpec[K]) => { setSpec((s) => ({ ...s, [k]: v })); setPlan(null); setStatus("idle"); setError(null); };

  const review = (offerId: string) => {
    const e = evals.find((x) => x.offer.id === offerId)!;
    setSelected(offerId);
    setPlan({ id: offerId, version: (plan?.version ?? 0) + 1, offerId, maxSpend: e.estimate!.high, currency: spec.currency, expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(), demo });
    setStatus("idle");
    setError(null);
  };

  const approve = async () => {
    if (!plan || status === "pending") return;
    const key = demo ? idempotencyKey(plan) : `plan:${crypto.randomUUID()}`;
    if (sent.current.has(key)) return;
    sent.current.add(key);
    setStatus("pending");
    setError(null);
    if (demo) {
      setTimeout(() => setStatus("done"), 800);
      return;
    }
    try {
      await submitPlan(plan.offerId, spec, key);
      setStatus("done");
      onPlanned?.();
    } catch (e) {
      sent.current.delete(key);
      setError(e instanceof Error ? e.message : "Plan submission failed");
      setStatus("idle");
    }
  };

  const offer = offers.find((o) => o.id === selected);
  const expired = plan ? isPlanExpired(plan) : false;

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <section aria-label="Workload specification" className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h2 className="font-mono text-sm">Specification</h2>
        {([["artifact", "Container / model"], ["runtime", "Runtime"], ["accelerator", "Accelerator"]] as const).map(([k, l]) => (
          <div key={k}><Label htmlFor={k}>{l}</Label><Input id={k} value={spec[k]} onChange={(e) => set(k, e.target.value)} /></div>
        ))}
        <div className="grid grid-cols-2 gap-2">
          {([["count", "Count"], ["minMemoryGb", "Min memory GB"], ["hours", "Hours"], ["budget", `Budget ${spec.currency}`]] as const).map(([k, l]) => (
            <div key={k}><Label htmlFor={k}>{l}</Label><Input id={k} type="number" min={0} value={spec[k]} onChange={(e) => set(k, Number(e.target.value))} /></div>
          ))}
        </div>
        <div><Label htmlFor="regions">Allowed regions (comma)</Label><Input id="regions" value={spec.allowedRegions.join(",")} onChange={(e) => set("allowedRegions", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} /></div>
        <div className="flex items-center gap-2"><Switch id="intr" checked={spec.interruptible} onCheckedChange={(v) => set("interruptible", v)} /><Label htmlFor="intr">Interruptible</Label></div>
      </section>

      <div className="space-y-4">
        <section aria-label="Offers" className="space-y-2">
          {evals.map((e) => (
            <div key={e.offer.id} className="rounded-lg border border-border bg-card p-3 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {e.eligible ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <XCircle className="w-4 h-4 text-destructive" />}
                  {e.offer.provider} · {e.offer.accelerator} · {e.offer.region} <StateBadge s={demo ? "demo" : "live"} />
                </div>
                {e.eligible
                  ? <p className="text-xs text-muted-foreground font-mono">Estimate {e.estimate!.low}–{e.estimate!.high} {spec.currency} (±25% for queueing, egress, billing lag)</p>
                  : <ul className="text-xs text-muted-foreground list-disc ml-5">{e.reasons.map((r) => <li key={r}>{r}</li>)}</ul>}
              </div>
              {e.eligible && <Button size="sm" variant="outline" onClick={() => review(e.offer.id)}>Review plan</Button>}
            </div>
          ))}
        </section>

        {plan && offer && (
          <section aria-label="Plan review" className="rounded-lg border border-primary/40 bg-card p-4 space-y-3">
            <h2 className="font-mono text-sm">Plan review · v{plan.version}</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Provider / region</dt><dd>{offer.provider} · {offer.region}</dd>
              <dt className="text-muted-foreground">Accelerators</dt><dd>{spec.count} × {offer.accelerator}</dd>
              <dt className="text-muted-foreground">Artifact</dt><dd className="font-mono text-xs break-all">{spec.artifact}</dd>
              <dt className="text-muted-foreground">Max authorized spend</dt><dd className="font-mono">{plan.maxSpend} {plan.currency}</dd>
              <dt className="text-muted-foreground">Planned actions</dt><dd>{demo ? "None — demo plan, nothing will be provisioned" : "Record the approved plan and its cost estimate. No resources are provisioned."}</dd>
              <dt className="text-muted-foreground">Expires</dt><dd className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(plan.expiresAt).toLocaleTimeString()}</dd>
            </dl>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            {expired ? (
              <p role="alert" className="text-sm text-destructive">This plan expired. Review a revised plan to approve again.</p>
            ) : (
              <Button onClick={approve} disabled={status !== "idle"} aria-busy={status === "pending"}>
                {status === "pending" ? "Submitting…" : status === "done" ? (demo ? "Approved (demo)" : "Plan recorded") : "Approve plan"}
              </Button>
            )}
            {status === "done" && (
              <p className="text-xs text-muted-foreground">
                {demo
                  ? <>Demo approval recorded locally with key <span className="font-mono">{idempotencyKey(plan)}</span>. No provider was contacted.</>
                  : "Saved to your account. Find it under Workloads — no provider was contacted and nothing was provisioned."}
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
