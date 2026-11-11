import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, UserPlus } from "lucide-react";
import { planForPrice, subscriptionTier } from "../../supabase/functions/_shared/launch-policy";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface Signup {
  user_id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  welcome_letter_seen_at: string | null;
  plan: string;
  billing: string;
}

const DAY = 86_400_000;

const AdminSignups = () => {
  const [rows, setRows] = useState<Signup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      const [p, s] = await Promise.all([
        supabase.from("profiles").select("user_id, email, display_name, created_at, welcome_letter_seen_at").order("created_at", { ascending: false }),
        supabase.from("subscriptions").select("user_id, status, price_id, current_period_end, cancel_at_period_end, environment, created_at").order("created_at", { ascending: false }),
      ]);
      if (p.error) { setError(p.error.message); setLoading(false); return; }
      // Newest subscription per account that still grants paid access.
      const plans = new Map<string, { plan: string; billing: string }>();
      for (const sub of s.data ?? []) {
        if (plans.has(sub.user_id) || subscriptionTier([sub]) === "free") continue;
        const end = sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : "—";
        const state = sub.status === "past_due" ? "payment overdue" : sub.status === "canceled" || sub.cancel_at_period_end ? `ends ${end}` : `renews ${end}`;
        plans.set(sub.user_id, { plan: planForPrice(sub.price_id) ?? "paid", billing: `${state}${sub.environment === "sandbox" ? " · test" : ""}` });
      }
      setRows((p.data ?? []).map((r) => ({ ...r, plan: plans.get(r.user_id)?.plan ?? "free", billing: plans.get(r.user_id)?.billing ?? "" })));
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? rows.filter((r) => `${r.email ?? ""} ${r.display_name ?? ""}`.toLowerCase().includes(q)) : rows;
  }, [rows, query]);

  const now = Date.now();
  const last7 = rows.filter((r) => now - new Date(r.created_at).getTime() < 7 * DAY).length;
  const last30 = rows.filter((r) => now - new Date(r.created_at).getTime() < 30 * DAY).length;
  const paid = rows.filter((r) => r.plan !== "free").length;

  const chart = useMemo(() => {
    const days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now - (29 - i) * DAY);
      return { key: d.toISOString().slice(0, 10), label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), signups: 0 };
    });
    const idx = new Map(days.map((d, i) => [d.key, i]));
    for (const r of rows) {
      const i = idx.get(r.created_at.slice(0, 10));
      if (i !== undefined) days[i].signups += 1;
    }
    return days;
  }, [rows, now]);

  const exportCsv = () => {
    const head = "email,name,signed_up,plan,billing,welcome_letter_read\n";
    const body = filtered.map((r) => [r.email ?? "", r.display_name ?? "", r.created_at, r.plan, r.billing, r.welcome_letter_seen_at ? "yes" : "no"]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([head + body], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "lightos-signups.csv" });
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = [
    { label: "Total signups", value: rows.length },
    { label: "Last 7 days", value: last7 },
    { label: "Last 30 days", value: last30 },
    { label: "Paid accounts", value: paid },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-mono text-foreground flex items-center gap-2"><UserPlus className="h-7 w-7 text-primary" />Signups</h1>
          <p className="text-muted-foreground mt-1">Every account created on LightOS, newest first.</p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={!filtered.length}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
      </div>

      {error && <p className="rounded border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">Couldn't load signups: {error}</p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="bg-card/50">
            <CardHeader className="pb-1"><CardTitle className="text-xs font-mono text-muted-foreground">{s.label}</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold font-mono">{loading ? "—" : s.value}</div></CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-card/50">
        <CardHeader><CardTitle className="font-mono text-sm">Signups per day · last 30 days</CardTitle></CardHeader>
        <CardContent className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval={4} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={28} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
              <Bar dataKey="signups" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-card/50">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="font-mono text-sm">All accounts ({filtered.length})</CardTitle>
          <Input placeholder="Search email or name" value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-xs" />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Signed up</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Welcome letter</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-muted-foreground">No signups found.</TableCell></TableRow>
              ) : filtered.map((r) => (
                <TableRow key={r.user_id}>
                  <TableCell className="font-mono text-xs">{r.email ?? "—"}</TableCell>
                  <TableCell>{r.display_name ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={r.plan === "free" ? "outline" : "default"} className="capitalize">{r.plan}</Badge>
                    {r.billing && <div className="mt-1 text-xs text-muted-foreground">{r.billing}</div>}
                  </TableCell>
                  <TableCell className="text-xs">{r.welcome_letter_seen_at ? "Read" : "Not yet"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSignups;
