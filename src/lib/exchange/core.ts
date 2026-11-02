// LightOS Compute Exchange — client-side contract helpers.
// No backend exchange contract exists yet, so every section resolves to
// "setup_required" unless the explicit demo flag is on. Demo records are
// always labeled and never call provisioning endpoints.

export type DataState = "live" | "cached" | "demo" | "unavailable" | "setup_required";
export type OfferKind = "live" | "cached" | "quote_required" | "reserved" | "unsupported";

export interface Offer {
  id: string;
  provider: string;
  region: string;
  accelerator: string;
  memoryGb: number;
  count: number;
  runtime: string;
  purchaseModel: "on_demand" | "spot" | "reserved";
  pricePerHour: number | null;
  currency: string;
  minCommitment: string;
  sourceAt: string;
  kind: OfferKind;
  compliance: string | null;
}

export interface WorkloadSpec {
  workloadType: "inference" | "fine_tune" | "batch";
  artifact: string;
  runtime: string;
  accelerator: string;
  count: number;
  minMemoryGb: number;
  allowedRegions: string[];
  budget: number;
  currency: string;
  interruptible: boolean;
  checkpoint: boolean;
  hours: number;
}

export interface Evaluation {
  offer: Offer;
  eligible: boolean;
  reasons: string[];
  estimate: { low: number; high: number } | null;
}

export interface Plan {
  id: string;
  version: number;
  offerId: string;
  maxSpend: number;
  currency: string;
  expiresAt: string;
  demo: boolean;
}

export const DEMO_FLAG_KEY = "lightos:exchange-demo";

export function evaluateOffer(spec: WorkloadSpec, offer: Offer): Evaluation {
  const reasons: string[] = [];
  if (offer.kind === "unsupported") reasons.push("Integration not supported yet");
  if (offer.kind === "quote_required") reasons.push("Price requires a provider quote");
  if (offer.accelerator !== spec.accelerator) reasons.push(`Accelerator ${offer.accelerator} ≠ requested ${spec.accelerator}`);
  if (offer.memoryGb < spec.minMemoryGb) reasons.push(`Memory ${offer.memoryGb} GB below required ${spec.minMemoryGb} GB`);
  if (offer.count < spec.count) reasons.push(`Only ${offer.count} accelerators available, need ${spec.count}`);
  if (spec.allowedRegions.length && !spec.allowedRegions.includes(offer.region)) reasons.push(`Region ${offer.region} not allowed`);
  if (offer.runtime !== spec.runtime) reasons.push(`Runtime ${offer.runtime} incompatible with ${spec.runtime}`);
  if (offer.purchaseModel === "spot" && !spec.interruptible) reasons.push("Spot capacity requires an interruptible workload");
  if (offer.currency !== spec.currency) reasons.push(`Priced in ${offer.currency}, budget in ${spec.currency}`);

  let estimate: Evaluation["estimate"] = null;
  if (offer.pricePerHour != null) {
    const base = offer.pricePerHour * spec.count * spec.hours;
    estimate = { low: round(base), high: round(base * 1.25) }; // +25% uncertainty: queueing, egress, billing lag
    if (reasons.length === 0 && estimate.high > spec.budget) reasons.push(`Upper estimate ${estimate.high} exceeds budget ${spec.budget}`);
  }
  return { offer, eligible: reasons.length === 0, reasons, estimate };
}

const round = (n: number) => Math.round(n * 100) / 100;

export function isPlanExpired(plan: Pick<Plan, "expiresAt">, now: Date = new Date()): boolean {
  return new Date(plan.expiresAt).getTime() <= now.getTime();
}

/** One stable key per plan id + version so retries can't create duplicate executions. */
export function idempotencyKey(plan: Pick<Plan, "id" | "version">): string {
  return `plan:${plan.id}:v${plan.version}`;
}

const SECRET_PATTERNS: RegExp[] = [
  /\b(sk|pk|rk)_(live|test)_[A-Za-z0-9]{8,}\b/g,
  /\bnvapi-[A-Za-z0-9_-]{10,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}\b/g,
  /\b(bearer)\s+[A-Za-z0-9._-]{12,}/gi,
  /\b(token|api[_-]?key|secret|password)(\s*[=:]\s*)\S+/gi,
];

/** Redact credentials before text reaches chat, logs, URLs, or analytics. */
export function redactSecrets(text: string): string {
  let out = text;
  for (const p of SECRET_PATTERNS) {
    out = out.replace(p, (m, a, b) => {
      if (/^(token|api[_-]?key|secret|password)$/i.test(a ?? "") && b) return `${a}${b}[REDACTED]`;
      if (/^bearer$/i.test(a ?? "")) return `${a} [REDACTED]`;
      return "[REDACTED]";
    });
  }
  return out;
}

export function stateLabel(s: DataState): string {
  return { live: "Live", cached: "Cached", demo: "Demo", unavailable: "Unavailable", setup_required: "Setup required" }[s];
}

export function offerLabel(k: OfferKind): string {
  return { live: "Live · provisionable", cached: "Cached offer", quote_required: "Quote required", reserved: "Reserved inventory", unsupported: "Unsupported integration" }[k];
}
