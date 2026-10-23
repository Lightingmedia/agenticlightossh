// Server-only, authenticated account -> dedicated host. Never expose ciphertext.
import { RuntimeAccessError } from "./runtime-access.ts";

type ReadEnv = (name: string) => string | undefined;
export function runtimeConnectionUrl(raw: string): string {
  let url: URL;
  try { url = new URL(raw.trim()); } catch { throw new RuntimeAccessError("Enter a valid HTTPS tunnel address", 400); }
  // Initial supported path is Brev + Cloudflare quick tunnel. A fixed provider
  // domain prevents arbitrary destinations, private IPs and DNS rebinding.
  if (url.protocol !== "https:" || !/^[a-z0-9]+(?:-[a-z0-9]+)*\.trycloudflare\.com$/.test(url.hostname) ||
      url.username || url.password || url.port || url.pathname !== "/" || url.search || url.hash) {
    throw new RuntimeAccessError("Use the https://…trycloudflare.com address printed by your Brev gateway", 400);
  }
  return url.origin;
}

async function encryptionKey(env: ReadEnv) {
  const secret = env("RUNTIME_CONNECTION_ENCRYPTION_KEY");
  if (!secret) throw new RuntimeAccessError("Secure connection storage is unavailable", 503);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}
export async function encryptRuntimeToken(token: string, userId: string, env: ReadEnv): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: new TextEncoder().encode(userId) }, await encryptionKey(env), new TextEncoder().encode(token),
  ));
  const bytes = new Uint8Array(iv.length + encrypted.length);
  bytes.set(iv); bytes.set(encrypted, iv.length);
  return btoa(String.fromCharCode(...bytes));
}
export async function decryptRuntimeToken(ciphertext: string, userId: string, env: ReadEnv): Promise<string> {
  const bytes = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: bytes.subarray(0, 12), additionalData: new TextEncoder().encode(userId) },
    await encryptionKey(env), bytes.subarray(12),
  );
  return new TextDecoder().decode(decrypted);
}