import { useMemo, useRef, useState } from "react";
import { Link, NavLink, useParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Clock, Lock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DEMO_FLAG_KEY, DataState, Plan, WorkloadSpec, evaluateOffer, idempotencyKey, isPlanExpired, offerLabel, stateLabel,
} from "@/lib/exchange/core";
import { DEFAULT_SPEC, DEMO_OFFERS } from "@/lib/exchange/demo-fixtures";

const SECTIONS = [
  ["overview", "Overview"], ["plan", "Plan a Workload"], ["catalog", "Compute Catalog"], ["workloads", "Workloads"],
  ["clusters", "Clusters & Fabric"], ["costs", "Costs & Budgets"], ["policies", "Policies & Approvals"],
  ["providers", "Provider Connections"], ["audit", "Audit Log"], ["settings", "Organization Settings"],
] as const;

const SETUP_HINT: Record<string, { text: string; link?: [string, string] }> = {
  overview: { text: "No exchange backend is connected yet, so there are no providers, workloads, spend or approvals to show." },
  workloads: { text: "Workload execution needs the exchange backend. Nothing has been provisioned." },
  clusters: { text: "Discovered topology appears once a runtime gateway reports it.", link: ["/dashboard/gateway-setup", "Connect a GPU"] },
  costs: { text: "Estimated, accrued, provider-reconciled and subscription charges will be shown separately once billing data exists. Budget policies may not stop provider billing instantly.", link: ["/dashboard/billing", "LightOS subscription"] },
  policies: { text: "Policy and approval rules need the exchange backend." },
  providers: { text: "Validated provider connections are managed on the Compute Providers page.", link: ["/dashboard/providers", "Compute Providers"] },
  audit: { text: "The audit log records plans, approvals and outcomes once the exchange backend is live." },
  settings: { text: "Organizations and roles are not available yet; your account is a single-user workspace." },
};

function StateBadge({ s }: { s: DataState }) {
  const tone = s === "live" ? "default" : s === "demo" ? "secondary" : "outline";
  return <Badge variant={tone} className="font-mono text-[10px] uppercase">{stateLabel(s)}</Badge>;
}

function SetupRequired({ id }: { id: string }) {
  const h = SETUP_HINT[id] ?? { text: "This section needs the exchange backend." };
  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-3">
      <div className="flex items-center gap-2"><Lock className="w-4 h-4 text-muted-foreground" /><StateBadge s="setup_required" /></div>
      <p className="text-sm text-muted-foreground max-w-prose">{h.text}</p>
      {h.link && <Button asChild variant="outline" size="sm"><Link to={h.link[0]}>{h.link[1]}</Link></Button>}
    </div>
  );
}

export default function ComputeExchange() {
  const { section = "overview" } = useParams();
  const [demo, setDemo] = useState(() => localStorage.getItem(DEMO_FLAG_KEY) === "1");
  const toggleDemo = (v: boolean) => { setDemo(v); localStorage.setItem(DEMO_FLAG_KEY, v ? "1" : "0"); };
  const title = SECTIONS.find(([k]) => k === section)?.[1] ?? "Overview";
  const demoCapable = section === "plan" || section === "catalog";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-primary">LIGHTOS COMPUTE EXCHANGE</p>
          <h1 className="font-mono text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">Compare compatible capacity, approve a plan, and manage workloads across connected providers.</p>
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

      <nav aria-label="Exchange sections" className="flex flex-wrap gap-1 border-b border-border pb-2">
        {SECTIONS.map(([k, label]) => (
          <NavLink key={k} to={`/dashboard/exchange/${k}`}
            className={({ isActive }) => `rounded px-3 py-1.5 text-xs font-mono focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${isActive || (k === "overview" && section === "overview") ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            {label}
          </NavLink>
        ))}
      </nav>

      {demoCapable && demo ? (section === "plan" ? <Planner /> : <Catalog />)
        : demoCapable ? (
          <div className="rounded-lg border border-border bg-card p-6 space-y-3">
            <StateBadge s="setup_required" />
            <p className="text-sm text-muted-foreground">No provider catalog is connected, so there are no real offers to compare. Turn on Demo mode to explore the flow with labeled sample data.</p>
          </div>
        ) : <SetupRequired id={section} />}
    </div>
  );
}

function Catalog() {
  return (
    <div className="rounded-lg border border-border overflow-x-auto">
      <Table>
        <TableHeader><TableRow>
          {["Provider", "Region", "Accelerator", "Mem", "Count", "Runtime", "Model", "Price", "Commitment", "Status", "Compliance", "Source"].map((h) => <TableHead key={h}>{h}</TableHead>)}
        </TableRow></TableHeader>
        <TableBody>
          {DEMO_OFFERS.map((o) => (
            <TableRow key={o.id}>
              <TableCell>{o.provider} <StateBadge s="demo" /></TableCell>
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

function Planner() {
  const [spec, setSpec] = useState<WorkloadSpec>(DEFAULT_SPEC);
  const [selected, setSelected] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [status, setStatus] = useState<"idle" | "pending" | "done">("idle");
  const sent = useRef(new Set<string>());
  const evals = useMemo(() => DEMO_OFFERS.map((o) => evaluateOffer(spec, o)), [spec]);
  const set = <K extends keyof WorkloadSpec>(k: K, v: WorkloadSpec[K]) => { setSpec((s) => ({ ...s, [k]: v })); setPlan(null); setStatus("idle"); };

  const review = (offerId: string) => {
    const e = evals.find((x) => x.offer.id === offerId)!;
    setSelected(offerId);
    setPlan({ id: `demo-${offerId}`, version: (plan?.version ?? 0) + 1, offerId, maxSpend: e.estimate!.high, currency: spec.currency, expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(), demo: true });
    setStatus("idle");
  };

  const approve = () => {
    if (!plan || status === "pending") return;
    const key = idempotencyKey(plan);
    if (sent.current.has(key)) return;
    sent.current.add(key);
    setStatus("pending");
    // Demo: never calls provisioning endpoints.
    setTimeout(() => setStatus("done"), 800);
  };

  const offer = DEMO_OFFERS.find((o) => o.id === selected);
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
                  {e.offer.provider} · {e.offer.accelerator} · {e.offer.region} <StateBadge s="demo" />
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
              <dt className="text-muted-foreground">Planned actions</dt><dd>None — demo plan, nothing will be provisioned</dd>
              <dt className="text-muted-foreground">Expires</dt><dd className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(plan.expiresAt).toLocaleTimeString()}</dd>
            </dl>
            {expired ? (
              <p role="alert" className="text-sm text-destructive">This plan expired. Review a revised plan to approve again.</p>
            ) : (
              <Button onClick={approve} disabled={status !== "idle"} aria-busy={status === "pending"}>
                {status === "pending" ? "Submitting…" : status === "done" ? "Approved (demo)" : "Approve plan"}
              </Button>
            )}
            {status === "done" && <p className="text-xs text-muted-foreground">Demo approval recorded locally with key <span className="font-mono">{idempotencyKey(plan)}</span>. No provider was contacted.</p>}
          </section>
        )}
      </div>
    </div>
  );
}
