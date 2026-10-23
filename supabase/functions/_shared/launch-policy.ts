// Pure rules shared by server enforcement and browser entitlement display.
export type LaunchTier = "free" | "starter" | "pro" | "enterprise";
export const MONITORING_LIMITS: Record<LaunchTier, number> = { free: 1, starter: 2, pro: Infinity, enterprise: Infinity };
export const PAID_PRICE_TIERS: Record<string, LaunchTier> = {
  starter_monthly: "starter", starter_yearly: "starter",
  pro_monthly: "pro", pro_yearly: "pro", enterprise_monthly: "enterprise",
};
export const CHECKOUT_TRIAL_DAYS = 0;

export function subscriptionTier(rows: { price_id: string; status: string; current_period_end?: string | null }[], now = Date.now()): LaunchTier {
  const levels: LaunchTier[] = ["free", "starter", "pro", "enterprise"];
  let tier: LaunchTier = "free";
  for (const row of rows) {
    const end = row.current_period_end ? Date.parse(row.current_period_end) : NaN;
    const valid = ["active", "trialing", "canceled"].includes(row.status) && Number.isFinite(end) && end > now;
    const candidate = valid ? PAID_PRICE_TIERS[row.price_id] : undefined;
    if (candidate && levels.indexOf(candidate) > levels.indexOf(tier)) tier = candidate;
  }
  return tier;
}

export function canExecute(tier: LaunchTier): boolean { return tier !== "free"; }
export function requiresUpgrade(detected: number, tier: LaunchTier): boolean { return detected > MONITORING_LIMITS[tier]; }

type CapacityDevice = { uuid: string; [key: string]: unknown };
type Capacity = { nodes?: { node?: string; devices: CapacityDevice[] }[]; totals?: { devices?: number; allocated?: number | null; free?: number | null }; [key: string]: unknown };
type MetricDevice = { uuid: string; gpu_util_pct?: { avg?: number | null }; power_w?: { avg?: number | null }; [key: string]: unknown };
type Telemetry = { devices?: MetricDevice[]; cluster?: Record<string, unknown>; [key: string]: unknown };

// Keep aggregate measurements consistent with entitled devices. Do not leak a full
// cluster aggregate while hiding only individual cards. GPU existence/count is
// exposed solely to explain the upgrade, not as unrestricted telemetry.
export function limitMonitoring(capacity: Capacity, telemetry: Telemetry, tier: LaunchTier) {
  const limit = MONITORING_LIMITS[tier];
  const all = (capacity.nodes ?? []).flatMap((n) => n.devices ?? []).sort((a, b) => a.uuid.localeCompare(b.uuid));
  const selected = new Set(all.slice(0, limit).map((d) => d.uuid));
  const nodes = (capacity.nodes ?? []).map((n) => ({ ...n, devices: n.devices.filter((d) => selected.has(d.uuid)) })).filter((n) => n.devices.length > 0);
  const devices = (telemetry.devices ?? []).filter((d) => selected.has(d.uuid));
  const detected = capacity.totals?.devices ?? all.length;
  const restricted = requiresUpgrade(detected, tier);
  const utils = devices.map((d) => d.gpu_util_pct?.avg).filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  const powers = devices.map((d) => d.power_w?.avg).filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  return {
    capacity: { ...capacity, nodes, totals: restricted ? { devices: selected.size, allocated: null, free: null } : capacity.totals },
    telemetry: { ...telemetry, devices, cluster: {
      gpu_util_pct_avg: utils.length ? utils.reduce((a, b) => a + b, 0) / utils.length : null,
      power_w_sum: powers.length ? powers.reduce((a, b) => a + b, 0) : null,
      gpus_reporting: devices.length,
    } },
    entitlement: { tier, gpu_limit: Number.isFinite(limit) ? limit : null, detected_devices: detected, upgrade_required: restricted },
  };
}