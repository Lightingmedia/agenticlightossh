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

// ── Input guards ──

const AWS_REGION = /^[a-z]{2}(-gov|-iso[a-z]?)?-[a-z]+-\d{1,2}$/;

/** AWS regions end up in hostnames, so only accept the documented region shape. */
export function awsRegion(value: string | undefined): string {
  const region = (value || "us-east-1").trim().toLowerCase();
  if (!AWS_REGION.test(region)) throw new ProviderError("Invalid AWS region");
  return region;
}

function isPublicIp(ip: string): boolean {
  const v4 = ip.match(/^(?:::ffff:)?(\d+)\.(\d+)\.(\d+)\.(\d+)$/i);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && (b === 168 || b === 0)) return false;
    if (a === 198 && (b === 18 || b === 19)) return false;
    return true;
  }
  const s = ip.toLowerCase();
  if (s === "::" || s === "::1") return false;
  if (/^(fc|fd|fe[89ab]|ff)/.test(s)) return false;
  if (s.startsWith("64:ff9b:") || s.startsWith("2001:db8") || s.startsWith("::ffff:")) return false;
  return /^[23]/.test(s); // global unicast 2000::/3 only
}

/**
 * SSRF guard for user-supplied endpoints: https only, no credentials in the URL,
 * and every resolved address must be public. Returns the normalized base URL.
 */
export async function assertPublicHttps(raw: string): Promise<string> {
  let u: URL;
  try { u = new URL(raw.trim()); } catch { throw new ProviderError("The endpoint URL is invalid"); }
  if (u.protocol !== "https:") throw new ProviderError("Only https:// endpoints are allowed");
  if (u.username || u.password) throw new ProviderError("Credentials inside the endpoint URL are not allowed");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (!host) throw new ProviderError("The endpoint URL has no host");
  const literal = /^[\d.]+$/.test(host) || host.includes(":");
  let addresses: string[] = [];
  if (literal) addresses = [host];
  else {
    for (const type of ["A", "AAAA"] as const) {
      try { addresses.push(...(await Deno.resolveDns(host, type))); } catch { /* no records of this type */ }
    }
  }
  if (!addresses.length) throw new ProviderError(`Could not resolve ${host}`);
  if (!addresses.every(isPublicIp)) throw new ProviderError("The endpoint resolves to a private or reserved address");
  return `${u.origin}${u.pathname.replace(/\/+$/, "")}`;
}
