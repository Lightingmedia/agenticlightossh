import { canExecute, subscriptionTier, type LaunchTier } from "./launch-policy.ts";

type ReadEnv = (name: string) => string | undefined;
export class RuntimeAccessError extends Error {
  constructor(message: string, public status = 403) { super(message); }
}

// Customers use only their dedicated connection; deployment-wide fallback is
// restricted to protected administrators. Paid status never grants ownership.
export async function runtimeAccess(userId: string, env: ReadEnv): Promise<{ tier: LaunchTier; connection: { base_url: string; token_ciphertext: string } | null }> {
  const base = env("SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!base || !key) throw new RuntimeAccessError("Runtime authorization is unavailable", 503);
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const query = async (table: string, search: string) => {
    const response = await fetch(`${base}/rest/v1/${table}?${search}`, { headers });
    if (!response.ok) throw new RuntimeAccessError("Runtime authorization could not be verified", 503);
    return response.json();
  };
  const id = encodeURIComponent(userId);
  const connections = await query("runtime_connections", `select=base_url,token_ciphertext&user_id=eq.${id}`);
  if (!Array.isArray(connections)) throw new RuntimeAccessError("Connection ownership could not be verified", 503);
  const connection = connections[0] ?? null;
  if (!connection) {
    const roles = await query("user_roles", `select=role&user_id=eq.${id}&role=eq.admin`);
    if (!Array.isArray(roles) || !roles.some((r) => r.role === "admin")) {
      throw new RuntimeAccessError("Connect your own GPU host to start monitoring", 404);
    }
  }
  // Live entitlements only; sandbox subscriptions must never authorize production.
  const rows = await query("subscriptions", `select=price_id,status,current_period_end&user_id=eq.${id}&environment=eq.live`);
  if (!Array.isArray(rows)) throw new RuntimeAccessError("Subscription access could not be verified", 503);
  return { tier: subscriptionTier(rows), connection };
}

export function authorizeRuntimePath(path: string, method: string, tier: LaunchTier) {
  const pathname = path.split("?")[0];
  // Node enrollment is setup for monitoring, not workload execution.
  if (method === "POST" && pathname === "/v1/nodes/register") return;
  const monitor = method === "GET" && ["/v1/fabric/capacity", "/v1/fabric/telemetry"].includes(pathname);
  if (!monitor && !canExecute(tier)) throw new RuntimeAccessError("Free supports one GPU for monitoring only. Upgrade for agent execution or advanced runtime tools.");
}