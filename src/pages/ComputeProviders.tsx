import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertTriangle, CheckCircle2, Clock, Cloud, ExternalLink, KeyRound, Loader2, Plug, RefreshCw, Search, Server, Trash2, XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CATEGORY_LABELS, PROVIDERS, type ComputeProvider, type InventoryItem, type ProviderCategory,
} from "@/lib/providers/catalog";
import { providerApi, type ProviderConnection } from "@/lib/providers/client";

const STATUS_STYLE: Record<ProviderConnection["status"], { label: string; icon: typeof CheckCircle2; className: string }> = {
  connected: { label: "Connected", icon: CheckCircle2, className: "text-emerald-400 border-emerald-400/40" },
  awaiting_gateway: { label: "Awaiting gateway", icon: Clock, className: "text-amber-400 border-amber-400/40" },
  pending: { label: "Pending", icon: Clock, className: "text-muted-foreground border-border" },
  error: { label: "Error", icon: XCircle, className: "text-destructive border-destructive/40" },
  revoked: { label: "Revoked", icon: XCircle, className: "text-muted-foreground border-border" },
};

const RUNTIME_LABEL: Record<string, string> = {
  cuda: "CUDA", rocm: "ROCm", tpu_xla: "TPU/XLA", oneapi_sycl: "oneAPI", neuron: "Neuron", asic: "ASIC",
};

function newExternalId() {
  return `lightos-${crypto.randomUUID()}`;
}

export default function ComputeProviders() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [connections, setConnections] = useState<ProviderConnection[]>([]);
  const [gateway, setGateway] = useState<"configured" | "not_configured">("not_configured");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [category, setCategory] = useState<ProviderCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [connecting, setConnecting] = useState<ComputeProvider | null>(null);
  const [inventoryFor, setInventoryFor] = useState<ProviderConnection | null>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await providerApi.list();
      setConnections(r.connections);
      setGateway(r.gateway);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const ok = !!data.session;
      setSignedIn(ok);
      if (ok) refresh(); else setLoading(false);
    });
  }, [refresh]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PROVIDERS.filter((p) =>
      (category === "all" || p.category === category) &&
      (!q || p.name.toLowerCase().includes(q) || p.accelerators.some((a) => a.toLowerCase().includes(q))),
    );
  }, [category, query]);

  const countByProvider = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of connections) m[c.provider_id] = (m[c.provider_id] ?? 0) + 1;
    return m;
  }, [connections]);

  const act = async (id: string, fn: () => Promise<unknown>, success: string) => {
    setBusy(id);
    try { await fn(); toast.success(success); await refresh(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-mono text-foreground">Compute Providers</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Connect hyperscalers, NVIDIA, GPU clouds and inference APIs so Aurora Fabric OS can see capacity and place
            workloads across all of them. Credentials are validated server-side, stored in an encrypted vault, and never sent back to this browser.
          </p>
        </div>
        <Badge variant="outline" className={gateway === "configured" ? "text-emerald-400 border-emerald-400/40" : "text-amber-400 border-amber-400/40"}>
          <Server className="h-3 w-3 mr-1" /> Runtime gateway: {gateway === "configured" ? "connected" : "not connected"}
        </Badge>
      </div>

      {signedIn === false && (
        <div className="rounded-lg border border-border bg-card p-5 text-sm">
          <Link to="/auth?next=/dashboard/providers" className="text-primary underline">Sign in</Link> to connect compute providers.
        </div>
      )}

      {signedIn && (
        <section className="space-y-3">
          <h2 className="font-mono text-sm uppercase tracking-wider text-primary">Your connections</h2>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          ) : connections.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
              No providers connected yet. Pick one below.
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Connection</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Identity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {connections.map((c) => {
                    const p = PROVIDERS.find((x) => x.id === c.provider_id);
                    const s = STATUS_STYLE[c.status];
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.label}</TableCell>
                        <TableCell className="text-muted-foreground">{p?.name ?? c.provider_id}</TableCell>
                        <TableCell className="font-mono text-xs max-w-[280px] truncate" title={c.identity ?? ""}>{c.identity ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={s.className} title={c.status_message ?? ""}>
                            <s.icon className="h-3 w-3 mr-1" /> {s.label}
                          </Badge>
                          {c.status_message && <p className="text-xs text-muted-foreground mt-1 max-w-[260px]">{c.status_message}</p>}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Button size="sm" variant="ghost" disabled={busy === c.id || c.status !== "connected"} onClick={() => setInventoryFor(c)}>
                            <Cloud className="h-4 w-4 mr-1" /> Inventory
                          </Button>
                          <Button size="sm" variant="ghost" disabled={busy === c.id} onClick={() => act(c.id, () => providerApi.test(c.id), "Re-validated")}>
                            {busy === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" disabled={busy === c.id}
                            onClick={() => { if (confirm(`Disconnect "${c.label}"? The stored credential will be deleted.`)) act(c.id, () => providerApi.disconnect(c.id), "Disconnected"); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      )}

      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
          <Tabs value={category} onValueChange={(v) => setCategory(v as ProviderCategory | "all")}>
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="all">All</TabsTrigger>
              {(Object.keys(CATEGORY_LABELS) as ProviderCategory[]).map((k) => (
                <TabsTrigger key={k} value={k}>{CATEGORY_LABELS[k]}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative md:w-72">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search provider or GPU (e.g. H200)" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map((p) => (
            <div key={p.id} className="rounded-lg border border-border bg-card p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-foreground">{p.name}</h3>
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wide">{CATEGORY_LABELS[p.category]} · Phase {p.phase}</p>
                </div>
                {countByProvider[p.id] ? <Badge variant="secondary">{countByProvider[p.id]} connected</Badge> : null}
              </div>
              <div className="flex flex-wrap gap-1">
                {p.runtimes.map((r) => <Badge key={r} variant="outline" className="text-[10px] font-mono">{RUNTIME_LABEL[r]}</Badge>)}
                {p.capabilities.kubernetes && <Badge variant="outline" className="text-[10px] font-mono">K8s</Badge>}
                {p.capabilities.slurm && <Badge variant="outline" className="text-[10px] font-mono">Slurm</Badge>}
                {p.capabilities.serverlessInference && <Badge variant="outline" className="text-[10px] font-mono">Serverless</Badge>}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{p.accelerators.join(" · ")}</p>
              {p.validation === "gateway" && (
                <p className="text-xs text-amber-400/90 flex gap-1"><AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" /> Validated by your Aurora runtime gateway</p>
              )}
              <div className="mt-auto flex gap-2 pt-1">
                {p.id === "lightos_gateway" ? (
                  <Button asChild size="sm" className="flex-1"><Link to="/onboard"><Plug className="h-4 w-4 mr-1" /> Enroll nodes</Link></Button>
                ) : (
                  <Button size="sm" className="flex-1" disabled={!signedIn} onClick={() => setConnecting(p)}>
                    <Plug className="h-4 w-4 mr-1" /> Connect
                  </Button>
                )}
                <Button asChild size="sm" variant="ghost">
                  <a href={p.docsUrl} target="_blank" rel="noreferrer" aria-label={`${p.name} docs`}><ExternalLink className="h-4 w-4" /></a>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {connecting && (
        <ConnectDialog provider={connecting} onClose={() => setConnecting(null)} onConnected={() => { setConnecting(null); refresh(); }} />
      )}
      <InventorySheet connection={inventoryFor} onClose={() => setInventoryFor(null)} />
    </div>
  );
}

function ConnectDialog({ provider, onClose, onConnected }: { provider: ComputeProvider; onClose: () => void; onConnected: () => void }) {
  const [methodId, setMethodId] = useState(provider.authMethods.find((m) => m.recommended)?.id ?? provider.authMethods[0].id);
  const method = provider.authMethods.find((m) => m.id === methodId)!;
  const [label, setLabel] = useState(`${provider.name.split(" (")[0]} – primary`);
  const [values, setValues] = useState<Record<string, string>>(() => (provider.id === "aws" ? { externalId: newExternalId() } : {}));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const credentials = Object.fromEntries(method.fields.map((f) => [f.key, values[f.key] ?? ""]));
      const r = await providerApi.connect({ providerId: provider.id, authMethod: method.id, label, credentials });
      setValues({}); // drop secrets from memory as soon as the server has them
      toast.success(r.connection.status === "connected" ? `Connected as ${r.connection.identity}` : "Stored — awaiting gateway validation");
      onConnected();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-primary" /> Connect {provider.name}</DialogTitle>
          <DialogDescription>
            Sent once over TLS to the LightOS backend, validated against {provider.name}, then stored in Supabase Vault. You can revoke it here at any time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {provider.authMethods.length > 1 && (
            <div className="grid gap-2">
              {provider.authMethods.map((m) => (
                <button key={m.id} type="button" onClick={() => setMethodId(m.id)}
                  className={`text-left rounded-md border px-3 py-2 text-sm transition-colors ${m.id === methodId ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                  {m.label} {m.recommended && <Badge variant="secondary" className="ml-1 text-[10px]">Recommended</Badge>}
                </button>
              ))}
            </div>
          )}

          <div className="rounded-md bg-muted/40 border border-border p-3 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Least privilege: </span>{method.permissions}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="label" className="text-xs font-mono uppercase tracking-wide text-muted-foreground">Connection name</Label>
            <Input id="label" maxLength={120} value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>

          {method.fields.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label htmlFor={f.key} className="text-xs font-mono uppercase tracking-wide text-muted-foreground">
                {f.label}{f.optional && " (optional)"}{f.secret && " 🔒"}
              </Label>
              {f.multiline ? (
                <Textarea id={f.key} rows={4} className="font-mono text-xs" placeholder={f.placeholder} autoComplete="off" spellCheck={false}
                  value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
              ) : (
                <Input id={f.key} type={f.secret ? "password" : "text"} placeholder={f.placeholder} autoComplete="off" spellCheck={false}
                  readOnly={provider.id === "aws" && f.key === "externalId"}
                  value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
              )}
              {f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}
              {provider.id === "aws" && f.key === "externalId" && (
                <p className="text-xs text-muted-foreground">Add this as <code className="font-mono">sts:ExternalId</code> in your role's trust policy before connecting.</p>
              )}
            </div>
          ))}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={submitting || !label.trim()}>
            {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plug className="h-4 w-4 mr-1" />}
            Validate & connect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InventorySheet({ connection, onClose }: { connection: ProviderConnection | null; onClose: () => void }) {
  const [items, setItems] = useState<InventoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!connection) return;
    setItems(null);
    setError(null);
    providerApi.inventory(connection.id).then((r) => setItems(r.items)).catch((e) => setError((e as Error).message));
  }, [connection]);

  const groups = useMemo(() => {
    const g: Record<string, InventoryItem[]> = {};
    for (const i of items ?? []) (g[i.kind] ??= []).push(i);
    return g;
  }, [items]);

  return (
    <Sheet open={!!connection} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{connection?.label}</SheetTitle>
          <SheetDescription>Live, read-only view from the provider. Placement and launches go through Aurora deployment plans.</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          {!items && !error && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Querying provider…</div>}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {items && items.length === 0 && <p className="text-sm text-muted-foreground">No GPU resources found for this connection.</p>}
          {Object.entries(groups).map(([kind, rows]) => (
            <div key={kind}>
              <h3 className="font-mono text-xs uppercase tracking-wider text-primary mb-2">{kind}s ({rows.length})</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Accelerator</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">$/hr</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 300).map((r) => (
                    <TableRow key={`${kind}-${r.id}`}>
                      <TableCell className="font-mono text-xs">{r.name}</TableCell>
                      <TableCell className="text-xs">{r.accelerator ?? "—"}{r.acceleratorCount ? ` ×${r.acceleratorCount}` : ""}</TableCell>
                      <TableCell className="text-xs">{r.region ?? "—"}</TableCell>
                      <TableCell className="text-xs">{r.status ?? "—"}</TableCell>
                      <TableCell className="text-xs text-right">{r.pricePerHourUsd != null ? r.pricePerHourUsd.toFixed(2) : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
