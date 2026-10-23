import { authorizeRuntimePath, runtimeAccess, RuntimeAccessError } from "./runtime-access.ts";
import { decryptRuntimeToken, runtimeConnectionUrl } from "./runtime-connection.ts";
import { limitMonitoring } from "./launch-policy.ts";

// Deployment-wide fallback is resolved ONLY after protected admin authorization.
export function gatewayConfig(): { baseUrl: string; token: string } | null {
  const raw = Deno.env.get("LIGHTOS_RUNTIME_GATEWAY_URL")?.trim();
  const token = Deno.env.get("LIGHTOS_RUNTIME_GATEWAY_TOKEN")?.trim();
  if (!raw || !token) return null;
  const url = new URL(raw);
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new Error("LightOS runtime gateway must use HTTPS");
  }
  return { baseUrl: url.toString().replace(/\/$/, ""), token };
}

export async function gatewayFetch(
  path: string,
  user: { id: string; email?: string },
  init: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<any> {
  const env = (name: string) => Deno.env.get(name);
  const access = await runtimeAccess(user.id, env);
  authorizeRuntimePath(path, init.method ?? "GET", access.tier);
  const cfg = access.connection ? {
    baseUrl: runtimeConnectionUrl(access.connection.base_url),
    token: await decryptRuntimeToken(access.connection.token_ciphertext, user.id, env),
  } : gatewayConfig();
  if (!cfg) throw new Error("LightOS runtime gateway is not configured");
  const rawFetch = async (target: string) => {
  const res = await fetch(`${cfg.baseUrl}${target}`, {
    method: init.method ?? "GET",
    redirect: "error",
    signal: AbortSignal.timeout(15000),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.token}`,
      "X-LightOS-User-ID": user.id,
      "X-LightOS-User-Email": user.email ?? "unknown",
      "X-Request-ID": crypto.randomUUID(),
      ...(init.headers?.["Idempotency-Key"] ? { "Idempotency-Key": init.headers["Idempotency-Key"] } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  // Upstream bodies may contain secrets; never echo errors or log them.
  if (!res.ok) throw new RuntimeAccessError(res.status === 401 ? "Invalid gateway token" : `Runtime gateway returned ${res.status}`, 502);
  return res.json();
  };
  const pathname = path.split("?")[0];
  if ((init.method ?? "GET") === "GET" && ["/v1/fabric/capacity", "/v1/fabric/telemetry"].includes(pathname)) {
    const [capacity, telemetry] = await Promise.all([
      rawFetch("/v1/fabric/capacity?runtime=cuda"),
      rawFetch(pathname === "/v1/fabric/telemetry" ? path : "/v1/fabric/telemetry?window_seconds=60"),
    ]);
    const limited = limitMonitoring(capacity, telemetry, access.tier);
    return { ...(pathname === "/v1/fabric/capacity" ? limited.capacity : limited.telemetry), entitlement: limited.entitlement };
  }
  return rawFetch(path);
}
