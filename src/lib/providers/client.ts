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

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("provider-connect", { body });
  if (error) {
    // supabase-js wraps non-2xx responses; surface the function's own message.
    let message = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      const j = ctx ? await ctx.json() : null;
      if (j?.error) message = typeof j.error === "string" ? j.error : JSON.stringify(j.error);
      if (j?.missing?.length || j?.invalid?.length) {
        message += ` (${[...(j.missing ?? []).map((k: string) => `${k} required`), ...(j.invalid ?? []).map((k: string) => `${k} invalid`)].join(", ")})`;
      }
    } catch { /* keep generic message */ }
    throw new Error(message);
  }
  return data as T;
}

export const providerApi = {
  list: () => call<{ connections: ProviderConnection[]; gateway: "configured" | "not_configured" }>({ action: "list" }),
  connect: (input: { providerId: string; authMethod: string; label: string; credentials: Record<string, string> }) =>
    call<{ connection: ProviderConnection }>({ action: "connect", ...input }),
  test: (id: string) => call<{ connection: ProviderConnection }>({ action: "test", id }),
  inventory: (id: string) => call<{ items: InventoryItem[]; fetchedAt: string }>({ action: "inventory", id }),
  disconnect: (id: string) => call<{ ok: true }>({ action: "disconnect", id }),
};
