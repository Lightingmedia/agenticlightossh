import { describe, it, expect } from "vitest";
import { evaluateOffer, isPlanExpired, idempotencyKey, redactSecrets } from "./core";
import { DEMO_OFFERS, DEFAULT_SPEC } from "./demo-fixtures";

const byId = (id: string) => DEMO_OFFERS.find((o) => o.id === id)!;

describe("offer evaluation", () => {
  it("accepts a matching offer within budget", () => {
    const e = evaluateOffer(DEFAULT_SPEC, byId("demo-a"));
    expect(e.eligible).toBe(true);
    expect(e.estimate).toEqual({ low: 60, high: 75 });
  });
  it("rejects spot capacity for non-interruptible workloads", () => {
    const e = evaluateOffer(DEFAULT_SPEC, byId("demo-b"));
    expect(e.reasons).toContain("Spot capacity requires an interruptible workload");
  });
  it("rejects quote-required and unsupported offers with reasons", () => {
    expect(evaluateOffer(DEFAULT_SPEC, byId("demo-d")).reasons).toContain("Price requires a provider quote");
    expect(evaluateOffer(DEFAULT_SPEC, byId("demo-e")).reasons).toContain("Integration not supported yet");
  });
  it("rejects when the upper estimate exceeds budget", () => {
    const e = evaluateOffer({ ...DEFAULT_SPEC, budget: 70 }, byId("demo-a"));
    expect(e.eligible).toBe(false);
  });
});

describe("plans", () => {
  it("treats a plan at its expiry time as expired", () => {
    expect(isPlanExpired({ expiresAt: "2026-01-01T00:00:00Z" }, new Date("2026-01-01T00:00:00Z"))).toBe(true);
    expect(isPlanExpired({ expiresAt: "2026-01-01T00:00:01Z" }, new Date("2026-01-01T00:00:00Z"))).toBe(false);
  });
  it("uses the same idempotency key for repeated clicks on one plan version", () => {
    expect(idempotencyKey({ id: "p1", version: 2 })).toBe(idempotencyKey({ id: "p1", version: 2 }));
    expect(idempotencyKey({ id: "p1", version: 3 })).not.toBe(idempotencyKey({ id: "p1", version: 2 }));
  });
});

describe("secret redaction", () => {
  it("removes provider keys and tokens", () => {
    const out = redactSecrets("key nvapi-abcdefghijklmnop and AKIAABCDEFGHIJKLMNOP token=supersecret123 Bearer abcdefghijklmnopq");
    expect(out).not.toMatch(/nvapi-|AKIA|supersecret123|abcdefghijklmnopq/);
  });
});
