import type { ToolContext } from "@lovable.dev/mcp-js";

type RuntimeGlobals = typeof globalThis & {
  Deno?: { env?: { get?: (name: string) => string | undefined } };
  process?: { env?: Record<string, string | undefined> };
};

function runtimeEnv(name: string): string | undefined {
  const runtime = globalThis as RuntimeGlobals;
  return runtime.Deno?.env?.get?.(name) ?? runtime.process?.env?.[name];
}

function runtimeGatewayConfig() {
  const baseUrl = runtimeEnv("SUPABASE_URL");
  const key = runtimeEnv("SUPABASE_ANON_KEY");
  if (!baseUrl || !key) throw new Error("Runtime authorization unavailable");
  return { baseUrl, key };
}

export async function callRuntimeGateway(
  ctx: ToolContext,
  path: string,
  init: { method?: "GET" | "POST"; body?: unknown } = {},
) {
  if (!ctx.isAuthenticated()) throw new Error("Authenticated LightOS user required");
  const token = ctx.getToken();
  if (!token) throw new Error("Verified OAuth token required");
  const { baseUrl, key } = runtimeGatewayConfig();
  const response = await fetch(`${baseUrl}/functions/v1/runtime-proxy`, {
    method: "POST",
    signal: AbortSignal.timeout(20000),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: key,
    },
    body: JSON.stringify({ path, method: init.method ?? "GET", ...(init.body === undefined ? {} : { body: init.body }) }),
  });
  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }
  if (!response.ok) {
    const safeMessage = data && typeof data === "object" && "error" in data
      ? String(data.error)
      : `Runtime gateway returned ${response.status}`;
    throw new Error(safeMessage);
  }
  return data;
}

export function toolResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}