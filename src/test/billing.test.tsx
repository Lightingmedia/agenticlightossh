import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@stripe/stripe-js", () => ({ loadStripe: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: vi.fn() } } }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/hooks/use-subscription", () => ({
  useSubscription: () => ({
    subscription: null,
    tier: "free",
    isActive: false,
    isTrial: false,
    isCanceled: false,
    expiresAt: null,
    loading: false,
  }),
}));

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Billing", () => {
  it("shows the current plan when payments are not configured", async () => {
    vi.stubEnv("VITE_PAYMENTS_CLIENT_TOKEN", "");
    const { default: Billing } = await import("@/pages/Billing");

    render(<MemoryRouter><Billing /></MemoryRouter>);

    expect(screen.getByRole("heading", { name: "Billing & Subscription" })).toBeInTheDocument();
    expect(screen.getByText("Free Tier")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View Plans & Subscribe" })).toBeInTheDocument();
  });
});
