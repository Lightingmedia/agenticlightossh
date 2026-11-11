import { describe, expect, it } from "vitest";
import {
  chargeDelta, customerPricePerHour, mustStopForBalance, owedCents, requiredStartCents, validTopupCents,
} from "../../supabase/functions/_shared/resale-pricing";

describe("GPU resale pricing", () => {
  it("adds a 10% markup to the provider's hourly price", () => {
    expect(customerPricePerHour(1.0)).toBe(1.1);
    expect(customerPricePerHour(2.5)).toBe(2.75);
  });

  it("rounds the customer price up to the next cent", () => {
    // 0.056 * 1.1 = 0.0616 -> $0.07
    expect(customerPricePerHour(0.056)).toBe(0.07);
  });

  it("requires one hour of prepaid credit to start", () => {
    expect(requiredStartCents(1.1)).toBe(110);
  });

  it("only accepts top-ups between $10 and $1,000", () => {
    expect(validTopupCents(999)).toBe(false);
    expect(validTopupCents(1000)).toBe(true);
    expect(validTopupCents(100000)).toBe(true);
    expect(validTopupCents(100001)).toBe(false);
  });
});

describe("GPU resale metering", () => {
  const start = new Date("2026-11-11T00:00:00Z");

  it("charges by elapsed time at the customer price", () => {
    expect(owedCents(1.1, start, new Date("2026-11-11T01:00:00Z"))).toBe(110);
    expect(owedCents(1.1, start, new Date("2026-11-11T00:30:00Z"))).toBe(55);
  });

  it("never charges the same minutes twice", () => {
    const now = new Date("2026-11-11T01:00:00Z");
    expect(chargeDelta(1.1, start, now, 55)).toBe(55);
    expect(chargeDelta(1.1, start, now, 110)).toBe(0);
  });

  it("stops the machine when the balance reaches zero", () => {
    expect(mustStopForBalance(0)).toBe(true);
    expect(mustStopForBalance(-5)).toBe(true);
    expect(mustStopForBalance(1)).toBe(false);
  });
});
