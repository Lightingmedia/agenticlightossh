import { useMemo, useState } from "react";
import { KeyRound, Plus, RotateCw, Trash2, ShieldOff, AlertTriangle } from "lucide-react";

const TEAL = "#00FF88";
const AMBER = "#F5A524";
const PANEL_BG = "#0A0E1A";

interface ApiKey {
  id: string;
  name: string;
  scopes: string[];
  created: string;
  lastUsed: string;
  rate: string;
  status: "Active" | "Expired";
}

const INITIAL_KEYS: ApiKey[] = [
  { id: "k1", name: "prod-inference-key", scopes: ["inference", "agents"],   created: "Jun 12", lastUsed: "2 min ago",   rate: "1000/min", status: "Active"  },
  { id: "k2", name: "mlops-training",     scopes: ["mlops", "compute"],      created: "May 28", lastUsed: "1 hr ago",    rate: "500/min",  status: "Active"  },
  { id: "k3", name: "readonly-monitor",   scopes: ["telemetry"],             created: "Jun 20", lastUsed: "3 days ago",  rate: "100/min",  status: "Active"  },
  { id: "k4", name: "legacy-key-01",      scopes: ["all"],                   created: "Apr 3",  lastUsed: "30 days ago", rate: "200/min",  status: "Expired" },
];

function ScopeChip({ label }: { label: string }) {
  return (
    <span className="px-1.5 py-0.5 rounded border border-border/70 bg-card/50 text-[10px] font-mono text-foreground/80">
      {label}
    </span>
  );
}

function ApiKeysSection() {
  const [keys, setKeys] = useState<ApiKey[]>(INITIAL_KEYS);
  const [nextId, setNextId] = useState(5);

  const create = () => {
    const id = `k${nextId}`;
    setKeys((ks) => [
      ...ks,
      { id, name: `new-key-${nextId}`, scopes: ["inference"], created: "just now", lastUsed: "never", rate: "500/min", status: "Active" },
    ]);
    setNextId((n) => n + 1);
  };
  const rotate = (id: string) =>
    setKeys((ks) => ks.map((k) => (k.id === id ? { ...k, lastUsed: "just now" } : k)));
  const revoke = (id: string) =>
    setKeys((ks) => ks.map((k) => (k.id === id ? { ...k, status: "Expired" } : k)));
  const del = (id: string) => setKeys((ks) => ks.filter((k) => k.id !== id));

  return (
    <div className="rounded-xl border border-border overflow-hidden font-mono" style={{ background: PANEL_BG }}>
      <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-[#00FF88]" />
          <h3 className="text-sm text-foreground">API Keys</h3>
          <span className="text-[10px] text-foreground/50">{keys.length} keys</span>
        </div>
        <button
          onClick={create}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#00FF88]/50 bg-[#00FF88]/10 text-[#00FF88] text-xs hover:bg-[#00FF88]/20"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Key
        </button>
      </div>
      <table className="w-full text-left text-[12px]">
        <thead className="text-[10px] uppercase tracking-wider text-foreground/50">
          <tr className="border-b border-border/60">
            <th className="px-4 py-2 font-medium">Name</th>
            <th className="px-4 py-2 font-medium">Scopes</th>
            <th className="px-4 py-2 font-medium">Created</th>
            <th className="px-4 py-2 font-medium">Last Used</th>
            <th className="px-4 py-2 font-medium">Rate Limit</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40 text-foreground/85">
          {keys.map((k) => {
            const active = k.status === "Active";
            return (
              <tr key={k.id}>
                <td className="px-4 py-2">{k.name}</td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-1">
                    {k.scopes.map((s) => <ScopeChip key={s} label={s} />)}
                  </div>
                </td>
                <td className="px-4 py-2 text-foreground/70">{k.created}</td>
                <td className="px-4 py-2 text-foreground/70">{k.lastUsed}</td>
                <td className="px-4 py-2 text-foreground/70">{k.rate}</td>
                <td className="px-4 py-2">
                  <span className="inline-flex items-center gap-1.5" style={{ color: active ? TEAL : "#7A8AAA" }}>
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: active ? TEAL : "transparent",
                        border: active ? "none" : "1px solid #7A8AAA",
                        boxShadow: active ? `0 0 6px ${TEAL}` : "none",
                      }}
                    />
                    {k.status}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-1.5 justify-end">
                    {active ? (
                      <>
                        <button
                          onClick={() => rotate(k.id)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded border border-border/70 hover:border-[#00FF88]/60 hover:text-[#00FF88] text-[11px]"
                        >
                          <RotateCw className="w-3 h-3" />
                          Rotate
                        </button>
                        <button
                          onClick={() => revoke(k.id)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded border border-border/70 hover:border-red-400/60 hover:text-red-300 text-[11px]"
                        >
                          <ShieldOff className="w-3 h-3" />
                          Revoke
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => del(k.id)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded border border-border/70 hover:border-red-400/60 hover:text-red-300 text-[11px]"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function UsagePanel() {
  const spent = 1284.4;
  const budget = 2000;
  const pct = useMemo(() => (spent / budget) * 100, []);
  const rows = [
    { label: "Inference",       units: "48.2M tokens",     cost: "$916.20" },
    { label: "Agent Instances", units: "1.2M tokens",      cost: "$228.40" },
    { label: "LRCA Compute",    units: "842 NCE-hours",    cost: "$139.80" },
  ];
  return (
    <div className="rounded-xl border border-border p-4 font-mono" style={{ background: PANEL_BG }}>
      <h3 className="text-sm text-foreground mb-3">Usage This Month</h3>
      <div className="text-4xl text-[#00FF88] tracking-tight">${spent.toFixed(2)}</div>
      <div className="text-[11px] text-foreground/60 mt-1">
        of ${budget.toLocaleString()} budget ({pct.toFixed(1)}%)
      </div>
      <div className="mt-3 h-2 rounded-full bg-card/70 overflow-hidden border border-border/60">
        <div
          className="h-full"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${TEAL}, ${TEAL}aa)`, boxShadow: `0 0 12px ${TEAL}88` }}
        />
      </div>

      <table className="mt-4 w-full text-left text-[12px]">
        <tbody className="divide-y divide-border/40 text-foreground/85">
          {rows.map((r) => (
            <tr key={r.label}>
              <td className="py-1.5">{r.label}</td>
              <td className="py-1.5 text-foreground/60">{r.units}</td>
              <td className="py-1.5 text-right text-[#00FF88]">{r.cost}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div
        className="mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-[11px]"
        style={{ background: `${AMBER}18`, border: `1px solid ${AMBER}55`, color: AMBER }}
      >
        <AlertTriangle className="w-3.5 h-3.5" />
        Soft cap ($1,600) estimated in 3 days
      </div>
    </div>
  );
}

function CreditRow({ name, used, total, pct }: { name: string; used: number; total: number; pct: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-foreground/85">{name}</span>
        <span className="text-foreground/70">
          ${used.toLocaleString()} / ${total.toLocaleString()} · <span className="text-[#00FF88]">{pct}% used</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-card/70 overflow-hidden border border-border/60">
        <div
          className="h-full"
          style={{ width: `${pct}%`, background: TEAL, boxShadow: `0 0 8px ${TEAL}66` }}
        />
      </div>
    </div>
  );
}

function ProgramCreditsPanel() {
  return (
    <div className="rounded-xl border border-border p-4 font-mono flex flex-col gap-4" style={{ background: PANEL_BG }}>
      <h3 className="text-sm text-foreground">Program Credits</h3>
      <CreditRow name="DGX Cloud"    used={67420}  total={100000} pct={32} />
      <CreditRow name="AWS Activate" used={89100}  total={100000} pct={11} />
      <CreditRow name="Nebius"       used={142000} total={150000} pct={5}  />
      <div className="mt-1 text-[10px] text-foreground/50">
        Burn rate: ~$4,200/mo · Runway: ~71 months
      </div>
    </div>
  );
}

export function TokenFactoryConsole() {
  return (
    <div className="flex flex-col gap-4 mb-8">
      <ApiKeysSection />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UsagePanel />
        <ProgramCreditsPanel />
      </div>
    </div>
  );
}
