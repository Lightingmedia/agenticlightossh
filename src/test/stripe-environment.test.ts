import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@stripe/stripe-js", () => ({ loadStripe: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: vi.fn() } } }));

async function importStripeModule(token?: string) {
  vi.resetModules();
  vi.stubEnv("VITE_PAYMENTS_CLIENT_TOKEN", token ?? "");
  return import("@/lib/stripe");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("Stripe environment configuration", () => {
  it("allows billing to render when payments are not configured", async () => {
    const stripe = await importStripeModule();

    expect(stripe.getConfiguredStripeEnvironment()).toBeNull();
    expect(() => stripe.getStripeEnvironment()).toThrow("Payments are not configured for this build yet.");
  });

  it("still rejects an unrecognized payment key for payment actions", async () => {
    const stripe = await importStripeModule("not-a-stripe-key");

    expect(stripe.getConfiguredStripeEnvironment()).toBeNull();
    expect(() => stripe.getStripeEnvironment()).toThrow("Payments are not configured for this build yet.");
  });

  it.each([
    ["pk_test_example", "sandbox"],
    ["pk_live_example", "live"],
  ] as const)("maps %s to %s", async (token, environment) => {
    const stripe = await importStripeModule(token);

    expect(stripe.getConfiguredStripeEnvironment()).toBe(environment);
    expect(stripe.getStripeEnvironment()).toBe(environment);
  });
});
