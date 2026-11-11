import { useCallback, useEffect, useState } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { Copy, CreditCard, Power, RefreshCw, ShoppingCart, Wallet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Offer = {
  offer_id: number; gpu_name: string; num_gpus: number; gpu_ram_gb: number | null; cpu_cores: number | null;
  ram_gb: number | null; disk_gb: number | null; location: string | null; reliability: number | null; cuda: number | null;
  price_per_hour: number;
};
type Rental = {
  id: string; gpu_name: string; num_gpus: number; geolocation: string | null; price_per_hour: number | string;
  status: "starting" | "running" | "stopped" | "failed"; status_message: string | null; ssh_host: string | null;
  ssh_port: number | null; charged_cents: number; started_at: string; ended_at: string | null; created_at: string;
};
type Account = { balance_cents: number; rentals: Rental[]; ledger: { id: string; amount_cents: number; kind: string; note: string | null; created_at: string }[] };

const money = (cents: number) => `${cents < 0 ? "−" : ""}$${(Math.abs(cents) / 100).toFixed(2)}`;
const TOPUPS = [1000, 2500, 5000, 10000];
const SSH_KEY_STORE = "lightos.ssh_public_key";

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("compute-resale", { body });
  if (error) {
    let msg = error.message;
    if (error instanceof FunctionsHttpError) {
      try { msg = (await error.context.json())?.error ?? msg; } catch { /* keep message */ }
    }
    throw new Error(msg);
  }
  return data as T;
}

export default function RentGpuSection() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [offersError, setOffersError] = useState<string | null>(null);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [gpuFilter, setGpuFilter] = useState("");
  const [countFilter, setCountFilter] = useState("");
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [topupCents, setTopupCents] = useState<number | null>(null);
  const [renting, setRenting] = useState<Offer | null>(null);
  const [sshKey, setSshKey] = useState(() => localStorage.getItem(SSH_KEY_STORE) ?? "");
  const [busy, setBusy] = useState(false);

  const loadAccount = useCallback(async () => {
    try { setAccount(await call<Account>({ action: "account" })); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't load your GPU account"); }
  }, []);

  const loadOffers = useCallback(async () => {
    setLoadingOffers(true); setOffersError(null);
    try {
      const body: Record<string, unknown> = { action: "offers" };
      if (gpuFilter.trim()) body.gpu_name = gpuFilter.trim();
      if (countFilter) body.num_gpus = Number(countFilter);
      const r = await call<{ offers: Offer[]; fetched_at: string }>(body);
      setOffers(r.offers); setFetchedAt(r.fetched_at);
    } catch (e) { setOffersError(e instanceof Error ? e.message : "Couldn't load machines"); }
    finally { setLoadingOffers(false); }
  }, [gpuFilter, countFilter]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    loadAccount(); loadOffers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);

  // Returning from checkout: payment confirmation arrives a moment later.
  useEffect(() => {
    if (!signedIn) return;
    const params = new URLSearchParams(window.location.search);
    if (!params.get("topup_session")) return;
    toast.success("Payment received. Your credit will appear in a few seconds.");
    const t = setTimeout(loadAccount, 4000);
    params.delete("topup_session");
    window.history.replaceState({}, "", `${window.location.pathname}${params.size ? `?${params}` : ""}`);
    return () => clearTimeout(t);
  }, [signedIn, loadAccount]);

  const active = (account?.rentals ?? []).filter((r) => r.status === "starting" || r.status === "running");
  useEffect(() => {
    if (!active.length) return;
    const t = setInterval(loadAccount, 30_000);
    return () => clearInterval(t);
  }, [active.length, loadAccount]);

  const fetchTopupSecret = useCallback(async () => {
    const r = await call<{ clientSecret: string }>({
      action: "topup", amount_cents: topupCents, environment: getStripeEnvironment(),
      return_url: `${window.location.origin}${window.location.pathname}`,
    });
    return r.clientSecret;
  }, [topupCents]);

  const rent = async () => {
    if (!renting) return;
    setBusy(true);
    try {
      localStorage.setItem(SSH_KEY_STORE, sshKey.trim());
      await call({ action: "rent", offer_id: renting.offer_id, ssh_key: sshKey.trim() });
      toast.success("Machine requested. It usually boots in a few minutes.");
      setRenting(null);
      await Promise.all([loadAccount(), loadOffers()]);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't start the machine"); }
    finally { setBusy(false); }
  };

  const stop = async (r: Rental) => {
    setBusy(true);
    try { await call({ action: "stop", rental_id: r.id }); toast.success("Machine stopped. Billing has ended."); await loadAccount(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't stop the machine"); }
    finally { setBusy(false); }
  };

  const balance = account?.balance_cents ?? 0;

  if (signedIn === false) {
    return (
      <section className="rounded-lg border border-border bg-card p-4 text-sm">
        <p>Sign in to rent GPUs with prepaid credit.</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-primary" /><h2 className="font-mono text-lg font-bold">Rent a GPU</h2></div>
        <Badge variant="outline">Live offers · prepaid credit</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="space-y-3 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Wallet className="h-4 w-4" />Credit balance</div>
          <p className="font-mono text-3xl font-bold text-primary">{account ? money(balance) : "—"}</p>
          <p className="text-xs text-muted-foreground">Running machines draw from this balance by the minute and stop automatically when it reaches $0.</p>
          <div className="grid grid-cols-2 gap-2">
            {TOPUPS.map((c) => (
              <Button key={c} variant="outline" size="sm" onClick={() => setTopupCents(c)}><CreditCard className="mr-1 h-3 w-3" />{money(c)}</Button>
            ))}
          </div>
          {account && account.ledger.length > 0 && (
            <ul className="max-h-40 space-y-1 overflow-y-auto border-t border-border pt-2 text-xs">
              {account.ledger.map((l) => (
                <li key={l.id} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{new Date(l.created_at).toLocaleDateString()} · {l.note ?? l.kind}</span>
                  <span className={l.amount_cents < 0 ? "font-mono" : "font-mono text-primary"}>{money(l.amount_cents)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3 rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-40">
              <label className="text-xs text-muted-foreground" htmlFor="gpu-filter">GPU model</label>
              <Input id="gpu-filter" value={gpuFilter} onChange={(e) => setGpuFilter(e.target.value)} placeholder="e.g. RTX 4090, H100 SXM" />
            </div>
            <div className="w-28">
              <label className="text-xs text-muted-foreground" htmlFor="count-filter">GPUs</label>
              <select id="count-filter" value={countFilter} onChange={(e) => setCountFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Any</option>
                {[1, 2, 4, 8].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <Button onClick={loadOffers} disabled={loadingOffers}><RefreshCw className={loadingOffers ? "mr-1 h-4 w-4 animate-spin" : "mr-1 h-4 w-4"} />Search</Button>
          </div>
          {offersError && <p className="text-sm text-destructive">{offersError}</p>}
          {offers === null && !offersError && <p className="text-sm text-muted-foreground">Loading live machines…</p>}
          {offers && offers.length === 0 && <p className="text-sm text-muted-foreground">No machines match right now. Try another GPU model.</p>}
          {offers && offers.length > 0 && (
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card text-left text-muted-foreground">
                  <tr><th className="py-2 pr-2">GPU</th><th className="pr-2">Memory</th><th className="pr-2">CPU / RAM</th><th className="pr-2">Location</th><th className="pr-2">Reliability</th><th className="pr-2 text-right">Price</th><th /></tr>
                </thead>
                <tbody>
                  {offers.map((o) => (
                    <tr key={o.offer_id} className="border-t border-border">
                      <td className="py-2 pr-2 font-mono">{o.num_gpus}× {o.gpu_name}</td>
                      <td className="pr-2">{o.gpu_ram_gb ? `${o.gpu_ram_gb} GB` : "—"}</td>
                      <td className="pr-2">{o.cpu_cores ? `${Math.round(o.cpu_cores)} cores` : "—"}{o.ram_gb ? ` / ${o.ram_gb} GB` : ""}</td>
                      <td className="pr-2">{o.location ?? "—"}</td>
                      <td className="pr-2">{o.reliability == null ? "—" : `${(o.reliability * 100).toFixed(1)}%`}</td>
                      <td className="whitespace-nowrap pr-2 text-right font-mono text-primary">${o.price_per_hour.toFixed(2)}/hr</td>
                      <td className="text-right"><Button size="sm" variant="outline" onClick={() => setRenting(o)}>Rent</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {fetchedAt && <p className="text-xs text-muted-foreground">Live availability as of {new Date(fetchedAt).toLocaleTimeString()}. Machines can be taken by others at any moment.</p>}
        </div>
      </div>

      {account && account.rentals.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 font-mono font-bold">Your machines</h3>
          <ul className="space-y-3">
            {account.rentals.map((r) => {
              const ssh = r.ssh_host && r.ssh_port ? `ssh -p ${r.ssh_port} root@${r.ssh_host}` : null;
              const isActive = r.status === "starting" || r.status === "running";
              return (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 first:border-0 first:pt-0">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{r.num_gpus}× {r.gpu_name}</span>
                      <Badge variant={r.status === "running" ? "default" : "outline"}>{r.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      ${Number(r.price_per_hour).toFixed(2)}/hr · spent {money(r.charged_cents)} · started {new Date(r.started_at).toLocaleString()}
                      {r.status_message ? ` · ${r.status_message}` : ""}
                    </p>
                    {ssh && isActive && (
                      <div className="flex items-center gap-1 font-mono text-xs">
                        <code className="rounded bg-muted px-2 py-1">{ssh}</code>
                        <Button size="icon" variant="ghost" className="h-6 w-6" aria-label="Copy SSH command"
                          onClick={() => { navigator.clipboard.writeText(ssh); toast.success("Copied"); }}><Copy className="h-3 w-3" /></Button>
                      </div>
                    )}
                  </div>
                  {isActive && <Button size="sm" variant="destructive" disabled={busy} onClick={() => stop(r)}><Power className="mr-1 h-3 w-3" />Stop</Button>}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <Dialog open={!!renting} onOpenChange={(o) => !o && setRenting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rent {renting?.num_gpus}× {renting?.gpu_name}</DialogTitle>
            <DialogDescription>
              ${renting?.price_per_hour.toFixed(2)}/hr, charged by the minute from your credit. You need at least one hour of credit
              ({renting ? money(Math.ceil(renting.price_per_hour * 100 - 1e-9)) : ""}) to start. Stopping deletes the machine and its disk.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm" htmlFor="ssh-key">Your public SSH key</label>
            <Textarea id="ssh-key" rows={3} value={sshKey} onChange={(e) => setSshKey(e.target.value)} placeholder="ssh-ed25519 AAAA… you@laptop" className="font-mono text-xs" />
            <p className="text-xs text-muted-foreground">Only the public key (the .pub file). Never paste a private key.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenting(null)}>Cancel</Button>
            <Button onClick={rent} disabled={busy || !sshKey.trim()}>{busy ? "Starting…" : "Start machine"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={topupCents !== null} onOpenChange={(o) => !o && setTopupCents(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add {topupCents ? money(topupCents) : ""} of GPU credit</DialogTitle>
            <DialogDescription>Credit is used only for GPU time you rent here.</DialogDescription>
          </DialogHeader>
          {topupCents !== null && (
            <EmbeddedCheckoutProvider key={topupCents} stripe={getStripe()} options={{ fetchClientSecret: fetchTopupSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
