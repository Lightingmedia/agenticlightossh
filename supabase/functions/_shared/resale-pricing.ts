// GPU resale pricing and metering rules. Pure functions so both the edge
// function and the test suite use the exact same math.

/** LightOS adds this fraction on top of the provider's live hourly price. */
export const RESALE_MARKUP = 0.10;
/** A customer must hold at least this many hours of credit to start a machine. */
export const MIN_PREPAID_HOURS = 1;
export const MIN_TOPUP_CENTS = 1_000; // $10
export const MAX_TOPUP_CENTS = 100_000; // $1,000

/** Customer hourly price in dollars, rounded up to the next cent. */
export function customerPricePerHour(providerPerHour: number): number {
  if (!Number.isFinite(providerPerHour) || providerPerHour <= 0) throw new Error("Invalid provider price");
  return Math.ceil(providerPerHour * (1 + RESALE_MARKUP) * 100 - 1e-9) / 100;
}

/** Credit needed before a machine may start. */
export function requiredStartCents(customerPerHour: number): number {
  return Math.ceil(customerPerHour * 100 * MIN_PREPAID_HOURS - 1e-9);
}

/** Total cents owed for a rental from start until `now`, rounded up to a whole cent. */
export function owedCents(customerPerHour: number, startedAt: Date, now: Date): number {
  const ms = Math.max(0, now.getTime() - startedAt.getTime());
  return Math.ceil((customerPerHour * 100 * ms) / 3_600_000 - 1e-9);
}

/** New charge to post this metering pass (never negative). */
export function chargeDelta(customerPerHour: number, startedAt: Date, now: Date, alreadyCharged: number): number {
  return Math.max(0, owedCents(customerPerHour, startedAt, now) - alreadyCharged);
}

/** True when the machine must be stopped because the balance is used up. */
export function mustStopForBalance(balanceCents: number): boolean {
  return balanceCents <= 0;
}

export function validTopupCents(cents: number): boolean {
  return Number.isInteger(cents) && cents >= MIN_TOPUP_CENTS && cents <= MAX_TOPUP_CENTS;
}
