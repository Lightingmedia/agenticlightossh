import { supabase } from "@/integrations/supabase/client";
import type { InventoryItem } from "./catalog";

export type ProviderConnection = {
  id: string;
  provider_id: string;
  auth_method: string;
  label: string;
  account_ref: Record<string, string>;
  identity: string | null;
  status: "pending" | "connected" | "awaiting_gateway" | "error" | "revoked";
  status_message: string | null;
  validation_mode: "direct" | "gateway";
  launch_enabled: boolean;
  last_validated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProviderApi = {
  list: () => Promise<{ connections: ProviderConnection[]; gateway: "configured" | "not_configured" }>;
  connect: (input: { providerId: string; authMethod: string; label: string; credentials: Record<string, string> }) => Promise<{ connection: ProviderConnection }>;
  test: (id: string) => Promise<{ connection: ProviderConnection }>;
  inventory: (id: string) => Promise<{ items: InventoryItem[]; fetchedAt: string }>;
  disconnect: (id: string) => Promise<{ ok: true }>;
};

/** One readable message from an error body of either backend: `{ error | detail, missing?, invalid?, fields? }`. */
function describeFailure(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const b = body as { error?: unknown; detail?: unknown; missing?: unknown; invalid?: unknown; fields?: unknown };
  let message = fallback;
  if (typeof b.error === "string") message = b.error;
  else if (typeof b.detail === "string") message = b.detail;
  else if (b.error) message = JSON.stringify(b.error);
  const notes = [
    ...(Array.isArray(b.missing) ? b.missing.map((k) => `${String(k)} required`) : []),
    ...(Array.isArray(b.invalid) ? b.invalid.map((k) => `${String(k)} invalid`) : []),
    ...(Array.isArray(b.fields) ? b.fields.map((k) => `${String(k)} invalid`) : []),
  ];
  return notes.length ? `${message} (${notes.join(", ")})` : message;
}

// ── Transport 1 (default): the `provider-connect` Supabase edge function ──────────────────────────

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("provider-connect", { body });
  if (error) {
    // supabase-js wraps non-2xx responses; surface the function's own message.
    let message = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      message = describeFailure(ctx ? await ctx.json() : null, message);
    } catch { /* keep generic message */ }
    throw new Error(message);
  }
  return data as T;
}

const edgeApi: ProviderApi = {
  list: () => call({ action: "list" }),
  connect: (input) => call({ action: "connect", ...input }),
  test: (id) => call({ action: "test", id }),
  inventory: (id) => call({ action: "inventory", id }),
  disconnect: (id) => call({ action: "disconnect", id }),
};

// ── Transport 2: the self-hosted FastAPI backend (backend/providers, its own database + encrypted vault) ──

async function rest<T>(base: string, method: string, path: string, body?: unknown): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Please sign in first.");

  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Could not reach the provider backend. Is it running?");
  }
  const text = await response.text();
  let json: unknown = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* a non-JSON error page from a proxy */ }
  if (!response.ok) throw new Error(describeFailure(json, `The provider backend returned ${response.status}`));
  return json as T;
}

/** API client for the self-hosted backend; `base` is e.g. "/api/providers" (dev proxy) or "https://api.example.com/api/providers". */
export function createRestApi(base: string): ProviderApi {
  const root = base.trim().replace(/\/+$/, "");
  const item = (id: string) => `/connections/${encodeURIComponent(id)}`;
  return {
    list: () => rest(root, "GET", "/connections"),
    connect: (input) => rest(root, "POST", "/connections", input),
    test: (id) => rest(root, "POST", `${item(id)}/test`),
    inventory: (id) => rest(root, "GET", `${item(id)}/inventory`),
    disconnect: (id) => rest(root, "DELETE", item(id)),
  };
}

// Set VITE_PROVIDERS_API_URL to use the self-hosted backend instead of the edge function (see docs/provider-backend.md).
const restBase = (import.meta.env.VITE_PROVIDERS_API_URL as string | undefined)?.trim();

export const providerApi: ProviderApi = restBase ? createRestApi(restBase) : edgeApi;
