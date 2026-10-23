import { afterEach, describe, expect, it, vi } from "vitest";
import { runtimeAccess, authorizeRuntimePath } from "../../supabase/functions/_shared/runtime-access";
import { runtimeConnectionUrl, encryptRuntimeToken, decryptRuntimeToken } from "../../supabase/functions/_shared/runtime-connection";

const env = (name: string) => ({ SUPABASE_URL: "https://cloud.invalid", SUPABASE_SERVICE_ROLE_KEY: "test-only", RUNTIME_CONNECTION_ENCRYPTION_KEY: "unit-test-only-encryption-fixture" })[name];
afterEach(() => vi.unstubAllGlobals());

describe("owned GPU runtime access", () => {
  it("new free users can monitor their own connected host without admin status or a card", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      calls.push(url);
      return Response.json(url.includes("runtime_connections") ? [{ base_url: "https://owned-host.trycloudflare.com", token_ciphertext: "opaque" }] : []);
    });
    const access = await runtimeAccess("user-a", env);
    expect(access.tier).toBe("free");
    expect(access.connection?.base_url).toBe("https://owned-host.trycloudflare.com");
    expect(calls.every((url) => url.includes("user_id=eq.user-a"))).toBe(true);
    expect(calls.some((url) => url.includes("user_roles"))).toBe(false);
    expect(() => authorizeRuntimePath("/v1/fabric/telemetry", "GET", access.tier)).not.toThrow();
  });
  it("a user without an owned connection cannot read the shared deployment gateway", async () => {
    vi.stubGlobal("fetch", async () => Response.json([]));
    await expect(runtimeAccess("user-b", env)).rejects.toMatchObject({ status: 404 });
  });
  it("failed ownership lookup denies access instead of falling back to shared telemetry", async () => {
    vi.stubGlobal("fetch", async () => new Response("", { status: 500 }));
    await expect(runtimeAccess("user-a", env)).rejects.toMatchObject({ status: 503 });
  });
  it("Free denies GPU job execution through all method variants", () => {
    for (const method of ["GET", "POST", "DELETE"]) expect(() => authorizeRuntimePath("/v1/jobs", method, "free")).toThrow("monitoring only");
  });
  it("Free cannot bypass monitoring restriction with alternate topology or planning endpoints", () => {
    for (const path of ["/v1/fabric/state", "/v1/intents/validate", "/v1/deployments/plan", "/v1/providers/id/inventory"]) {
      expect(() => authorizeRuntimePath(path, "GET", "free")).toThrow("monitoring only");
    }
  });
});

describe("safe GPU connection storage", () => {
  it("permits the supported HTTPS Brev quick-tunnel origin", () => {
    expect(runtimeConnectionUrl("https://owned-host.trycloudflare.com/")).toBe("https://owned-host.trycloudflare.com");
  });
  it("rejects private, arbitrary, credential-bearing, redirected and lookalike addresses", () => {
    for (const url of ["http://owned.trycloudflare.com", "https://127.0.0.1", "https://arbitrary.example", "https://owned.trycloudflare.com.evil.example", "https://user:password@owned.trycloudflare.com", "https://owned.trycloudflare.com/path", "https://owned.trycloudflare.com?next=evil", "https://owned.trycloudflare.com:444"]) {
      expect(() => runtimeConnectionUrl(url)).toThrow();
    }
  });
  it("encrypted credentials are bound to the authenticated owner", async () => {
    const ciphertext = await encryptRuntimeToken("synthetic-unit-test-value", "user-a", env);
    expect(await decryptRuntimeToken(ciphertext, "user-a", env)).toBe("synthetic-unit-test-value");
    await expect(decryptRuntimeToken(ciphertext, "user-b", env)).rejects.toThrow();
  });
});