// Small fetch helpers for provider adapters: timeouts, bounded bodies, and
// error messages that never echo request headers or credentials.

export class ProviderError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

const TIMEOUT_MS = 15_000;

export async function request(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<{ status: number; text: string; json: any }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), init.timeoutMs ?? TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: ctrl.signal });
  } catch (e) {
    const host = safeHost(url);
    if ((e as Error).name === "AbortError") throw new ProviderError(`Timed out contacting ${host}`);
    throw new ProviderError(`Could not reach ${host}`);
  } finally {
    clearTimeout(timer);
  }
  const text = (await res.text()).slice(0, 2_000_000);
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* XML or plain text */ }
  if (!res.ok) {
    throw new ProviderError(`${safeHost(url)} returned ${res.status}${describe(json, text)}`, res.status);
  }
  return { status: res.status, text, json };
}

export async function getJson(url: string, headers: Record<string, string>) {
  return (await request(url, { headers: { Accept: "application/json", ...headers } })).json;
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

function safeHost(url: string) {
  try { return new URL(url).host; } catch { return "provider"; }
}

function describe(json: any, text: string): string {
  const msg =
    json?.error?.message ?? json?.error_description ?? json?.message ?? json?.error ??
    (typeof json?.detail === "string" ? json.detail : undefined) ??
    text.match(/<Message>(.*?)<\/Message>/)?.[1];
  return msg && typeof msg === "string" ? `: ${msg.slice(0, 240)}` : "";
}

export function xmlAll(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "g");
  return [...xml.matchAll(re)].map((m) => m[1]);
}

export function xmlFirst(xml: string, tag: string): string | undefined {
  return xmlAll(xml, tag)[0];
}

export function b64url(bytes: ArrayBuffer | Uint8Array | string): string {
  const u8 = typeof bytes === "string" ? new TextEncoder().encode(bytes) : new Uint8Array(bytes);
  let s = "";
  for (const b of u8) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function b64urlDecode(s: string): Uint8Array<ArrayBuffer> {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  return Uint8Array.from(atob(pad), (c) => c.charCodeAt(0));
}

export function pemToPkcs8(pem: string): ArrayBuffer {
  const body = pem.replace(/-----(BEGIN|END) [A-Z ]+-----/g, "").replace(/\s+/g, "");
  return Uint8Array.from(atob(body), (c) => c.charCodeAt(0)).buffer;
}
