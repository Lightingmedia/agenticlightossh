import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
const invoke = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: (...args: unknown[]) => getSession(...args) },
    functions: { invoke: (...args: unknown[]) => invoke(...args) },
  },
}));

import { createRestApi, providerApi } from "@/lib/providers/client";

const fetchMock = vi.fn();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

beforeEach(() => {
  getSession.mockResolvedValue({ data: { session: { access_token: "jwt-123" } } });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("self-hosted REST transport", () => {
  const api = createRestApi("/api/providers");

  it("lists connections with the user's Supabase token", async () => {
    fetchMock.mockResolvedValue(json({ connections: [], gateway: "not_configured" }));
    expect(await api.list()).toEqual({ connections: [], gateway: "not_configured" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/providers/connections");
    expect(init.method).toBe("GET");
    expect(init.headers).toEqual({ Authorization: "Bearer jwt-123" });
    expect(init.body).toBeUndefined();
  });

  it("posts the connect request as JSON", async () => {
    const input = { providerId: "lambda", authMethod: "api_key", label: "primary", credentials: { apiKey: "k" } };
    fetchMock.mockResolvedValue(json({ connection: { id: "c1" } }, 201));
    expect(await api.connect(input)).toEqual({ connection: { id: "c1" } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/providers/connections");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ Authorization: "Bearer jwt-123", "Content-Type": "application/json" });
    expect(JSON.parse(init.body)).toEqual(input);
  });

  it("maps test / inventory / disconnect to their routes and encodes ids", async () => {
    fetchMock.mockImplementation(async () => json({ ok: true }));
    await api.test("a/b c");
    await api.inventory("id-2");
    await api.disconnect("id-3");
    expect(fetchMock.mock.calls.map(([url, init]) => `${init.method} ${url}`)).toEqual([
      "POST /api/providers/connections/a%2Fb%20c/test",
      "GET /api/providers/connections/id-2/inventory",
      "DELETE /api/providers/connections/id-3",
    ]);
  });

  it("tolerates trailing slashes and absolute base URLs", async () => {
    fetchMock.mockResolvedValue(json({ connections: [], gateway: "configured" }));
    await createRestApi("https://api.example.com/api/providers//").list();
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.example.com/api/providers/connections");
  });

  it("refuses to call the backend without a session", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    await expect(api.list()).rejects.toThrow("Please sign in first.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [400, { error: "Invalid request", fields: ["label"] }, "Invalid request (label invalid)"],
    [400, { error: "Missing or invalid fields", missing: ["apiKey"], invalid: ["region"] }, "Missing or invalid fields (apiKey required, region invalid)"],
    [422, { error: "api.groq.com returned 401: Invalid API Key", status: "error" }, "api.groq.com returned 401: Invalid API Key"],
    [409, { error: "A connection with this label already exists" }, "A connection with this label already exists"],
    [401, { error: "Missing bearer token" }, "Missing bearer token"],
    [403, { detail: "Admin role required" }, "Admin role required"],
    [429, { error: "Too many requests; try again in 12s" }, "Too many requests; try again in 12s"],
  ])("shows the backend's own message (%i)", async (status, body, message) => {
    fetchMock.mockResolvedValue(json(body, status));
    await expect(api.list()).rejects.toThrow(message);
  });

  it("copes with non-JSON failures and unreachable servers", async () => {
    fetchMock.mockResolvedValueOnce(new Response("<html>Bad gateway</html>", { status: 502 }));
    await expect(api.list()).rejects.toThrow("The provider backend returned 502");
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(api.list()).rejects.toThrow("Could not reach the provider backend. Is it running?");
  });
});

describe("transport selection", () => {
  it("defaults to the Supabase edge function", async () => {
    invoke.mockResolvedValue({ data: { connections: [], gateway: "not_configured" }, error: null });
    await providerApi.list();
    expect(invoke).toHaveBeenCalledWith("provider-connect", { body: { action: "list" } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps surfacing the edge function's own error message", async () => {
    invoke.mockResolvedValue({
      data: null,
      error: { message: "Edge Function returned a non-2xx status code", context: { json: async () => ({ error: "Missing or invalid fields", missing: ["externalId"] }) } },
    });
    await expect(providerApi.connect({ providerId: "aws", authMethod: "assume_role", label: "x", credentials: {} })).rejects.toThrow("Missing or invalid fields (externalId required)");
    invoke.mockResolvedValue({ data: null, error: { message: "Edge Function returned a non-2xx status code" } });
    await expect(providerApi.list()).rejects.toThrow("Edge Function returned a non-2xx status code");
  });

  it("switches to the self-hosted backend when VITE_PROVIDERS_API_URL is set", async () => {
    vi.stubEnv("VITE_PROVIDERS_API_URL", "https://api.lightos.example/api/providers/");
    vi.resetModules();
    const fresh = await import("@/lib/providers/client");
    fetchMock.mockResolvedValue(json({ connections: [], gateway: "not_configured" }));
    await fresh.providerApi.list();
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.lightos.example/api/providers/connections");
    expect(invoke).not.toHaveBeenCalled();
  });
});
