import { beforeEach, describe, expect, it, vi } from "vitest";
import { isFreshAccount, reportSignup, SIGNUP_SEND_TO } from "@/lib/google-ads";
import { saveChoices } from "@/lib/consent";

function traceFrom(country: string) {
  return vi.fn().mockResolvedValue({ ok: true, text: async () => `h=${location.hostname}\nloc=${country}\n` });
}

describe("Free plan sign-up conversion", () => {
  beforeEach(() => {
    localStorage.clear();
    document.head.querySelectorAll("script[data-google-ads]").forEach((s) => s.remove());
    window.dataLayer = [];
    window.gtag = vi.fn();
  });

  it("treats an account created within 15 minutes as a new sign-up", () => {
    const now = Date.parse("2026-11-13T22:00:00Z");
    expect(isFreshAccount("2026-11-13T21:50:00Z", now)).toBe(true);
    expect(isFreshAccount("2026-11-13T21:40:00Z", now)).toBe(false);
    expect(isFreshAccount(undefined, now)).toBe(false);
  });

  it("does not report a UK sign-up before the visitor accepts advertising", async () => {
    vi.stubGlobal("fetch", traceFrom("GB"));
    vi.resetModules();
    const { reportSignup: report } = await import("@/lib/google-ads");
    expect(await report("user-uk")).toBe(false);
    expect(window.gtag).not.toHaveBeenCalledWith("event", "conversion", expect.anything());
    vi.unstubAllGlobals();
  });

  it("reports one conversion per account, using the account id as the reference", async () => {
    saveChoices({ advertising: "granted" });
    expect(await reportSignup("user-1")).toBe(true);
    expect(await reportSignup("user-1")).toBe(false);
    const conversions = (window.gtag as ReturnType<typeof vi.fn>).mock.calls.filter((c) => c[1] === "conversion");
    expect(conversions).toEqual([["event", "conversion", { send_to: SIGNUP_SEND_TO, transaction_id: "user-1" }]]);
  });

  it("does not report after the visitor rejects advertising", async () => {
    saveChoices({ advertising: "denied" });
    expect(await reportSignup("user-2")).toBe(false);
  });
});
