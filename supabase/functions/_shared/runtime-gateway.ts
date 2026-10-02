// Server-only client for the LightOS runtime gateway (see gateway spec).
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
  const cfg = gatewayConfig();
  if (!cfg) throw new Error("LightOS runtime gateway is not configured");
  const res = await fetch(`${cfg.baseUrl}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.token}`,
      "X-LightOS-User-ID": user.id,
      "X-LightOS-User-Email": user.email ?? "unknown",
      "X-Request-ID": crypto.randomUUID(),
      ...(init.headers ?? {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { message: text.slice(0, 300) }; }
  if (!res.ok) throw new Error(data?.message ?? `Runtime gateway returned ${res.status}`);
  return data;
}
