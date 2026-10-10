import { describe, expect, it } from "vitest";
import { getAuthMethod, PROVIDERS, splitCredentials } from "@/lib/providers/catalog";

describe("compute provider catalog", () => {
  it("has unique provider ids", () => {
    const ids = PROVIDERS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers the required providers", () => {
    const ids = PROVIDERS.map((p) => p.id);
    for (const id of ["aws", "gcp", "azure", "nvidia_api_catalog", "nvidia_dgx_cloud_lepton", "general_compute", "coreweave"]) {
      expect(ids).toContain(id);
    }
  });

  it("has well-formed auth methods", () => {
    for (const p of PROVIDERS) {
      expect(p.authMethods.length).toBeGreaterThan(0);
      for (const m of p.authMethods) {
        const keys = m.fields.map((f) => f.key);
        expect(new Set(keys).size, `${p.id}/${m.id}`).toBe(keys.length);
        for (const f of m.fields) if (f.pattern) expect(() => new RegExp(f.pattern!)).not.toThrow();
      }
    }
  });

  it("splits secrets from account references", () => {
    const m = getAuthMethod("azure", "service_principal")!;
    const r = splitCredentials(m, { tenantId: "t", subscriptionId: "s", clientId: "c", clientSecret: "shh" });
    expect(r.secret).toEqual({ clientSecret: "shh" });
    expect(r.accountRef).toEqual({ tenantId: "t", subscriptionId: "s", clientId: "c" });
    expect(r.missing).toEqual([]);
  });

  it("reports missing and pattern-invalid fields", () => {
    const m = getAuthMethod("aws", "assume_role")!;
    const r = splitCredentials(m, { roleArn: "not-an-arn", region: "us-east-1" });
    expect(r.invalid).toContain("roleArn");
    expect(r.missing).toContain("externalId");
  });
});
