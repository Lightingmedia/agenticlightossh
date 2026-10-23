import { describe, expect, it } from "vitest";
import { CHECKOUT_TRIAL_DAYS, MONITORING_LIMITS, canExecute, limitMonitoring, requiresUpgrade, subscriptionTier } from "../../supabase/functions/_shared/launch-policy";
import { authorizeRuntimePath, runtimeAccess } from "../../supabase/functions/_shared/runtime-access";

describe("launch entitlements", () => {
  it("Free monitors exactly one GPU", () => { expect(MONITORING_LIMITS.free).toBe(1); });
  it("second GPU requires an upgrade", () => { expect(requiresUpgrade(1, "free")).toBe(false); expect(requiresUpgrade(2, "free")).toBe(true); });
  it("Free is monitoring only", () => { expect(canExecute("free")).toBe(false); expect(() => authorizeRuntimePath("/v1/jobs", "POST", "free")).toThrow("monitoring only"); });
  it("paid subscription allows the execution entitlement but not admin identity", () => { expect(canExecute("starter")).toBe(true); expect(() => authorizeRuntimePath("/v1/jobs", "POST", "starter")).not.toThrow(); });
  it("no seven-day card trial is attached to paid checkout", () => { expect(CHECKOUT_TRIAL_DAYS).toBe(0); });
  it("unknown prices fail closed", () => { expect(subscriptionTier([{ price_id: "price_unknown", status: "active", current_period_end: "2030-01-01" }], Date.parse("2026-10-23"))).toBe("free"); });
  it("expired subscriptions cannot grant access", () => { expect(subscriptionTier([{ price_id: "pro_monthly", status: "active", current_period_end: "2026-10-22" }], Date.parse("2026-10-23"))).toBe("free"); });
  it("restricted aggregates exclude the second GPU", () => {
    const result = limitMonitoring({ nodes: [{ devices: [{ uuid: "GPU-2" }, { uuid: "GPU-1" }] }], totals: { devices: 2, allocated: 2, free: 0 } }, { devices: [{ uuid: "GPU-1", gpu_util_pct: { avg: 10 }, power_w: { avg: 20 } }, { uuid: "GPU-2", gpu_util_pct: { avg: 90 }, power_w: { avg: 100 } }] }, "free");
    expect(result.telemetry.devices.map((d) => d.uuid)).toEqual(["GPU-1"]);
    expect(result.telemetry.cluster).toEqual({ gpu_util_pct_avg: 10, power_w_sum: 20, gpus_reporting: 1 });
    expect(result.capacity.totals).toEqual({ devices: 1, allocated: null, free: null });
    expect(result.entitlement.upgrade_required).toBe(true);
  });
  it("missing runtime authorization denies access", async () => { await expect(runtimeAccess("user-a", () => undefined)).rejects.toThrow("unavailable"); });
});