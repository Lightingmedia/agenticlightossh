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
  const rawUrl = runtimeEnv("LIGHTOS_RUNTIME_GATEWAY_URL")?.trim();
  const token = runtimeEnv("LIGHTOS_RUNTIME_GATEWAY_TOKEN")?.trim();
  if (!rawUrl || !token) {
    throw new Error("LightOS runtime gateway is not configured");
  }

  const url = new URL(rawUrl);
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(isLocal && url.protocol === "http:")) {
    throw new Error("LightOS runtime gateway must use HTTPS");
  }

  return { baseUrl: url.toString().replace(/\/$/, ""), token };
}

export async function callRuntimeGateway(
  ctx: ToolContext,
  path: string,
  init: { method?: "GET" | "POST"; body?: unknown } = {},
) {
  if (!ctx.isAuthenticated()) throw new Error("Authenticated LightOS user required");
  const { baseUrl, token } = runtimeGatewayConfig();
  const response = await fetch(`${baseUrl}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-LightOS-User-ID": ctx.getUserId() ?? "unknown",
      "X-LightOS-User-Email": ctx.getUserEmail() ?? "unknown",
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
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
    const safeMessage = data && typeof data === "object" && "message" in data
      ? String(data.message)
      : `Runtime gateway returned ${response.status}`;
    throw new Error(safeMessage);
  }
  return data;
}

export function toolResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}