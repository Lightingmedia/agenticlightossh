import { permitsOrdinaryAds, updateGoogleAdConsent } from "./ad-consent";

// Verified from the LightOS Google Ads account (conversion action "Free plan sign-up").
export const GOOGLE_ADS_TRACKING_ID = "AW-18571848794";
export const SIGNUP_SEND_TO = "AW-18571848794/IsY1CJeLgrgdENrY35dF";

const REPORTED_PREFIX = "lightos:signup-reported:";
// A session for an account created this recently counts as a fresh sign-up (OAuth or email confirmation).
const FRESH_ACCOUNT_MS = 15 * 60 * 1000;

function gpc(): boolean {
  return (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
}

/** Loads the Google tag only when advertising tracking is permitted (basic consent route). */
export async function loadGoogleAds(): Promise<boolean> {
  if (gpc()) return false;
  const allowed = await permitsOrdinaryAds();
  if (!allowed) return false;
  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function () {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer.push(arguments);
    };
  updateGoogleAdConsent("granted");
  if (document.querySelector("script[data-google-ads]")) return true;
  window.gtag("set", "developer_id.dZjgwMW", true);
  window.gtag("js", new Date());
  window.gtag("config", GOOGLE_ADS_TRACKING_ID);
  const script = document.createElement("script");
  script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GOOGLE_ADS_TRACKING_ID);
  script.async = true;
  script.dataset["googleAds"] = "";
  document.head.appendChild(script);
  return true;
}

function alreadyReported(userId: string): boolean {
  try {
    return localStorage.getItem(REPORTED_PREFIX + userId) !== null;
  } catch {
    return false;
  }
}

function markReported(userId: string) {
  try {
    localStorage.setItem(REPORTED_PREFIX + userId, String(Date.now()));
  } catch {
    /* storage unavailable: Google still dedupes on transaction_id */
  }
}

/**
 * Reports one Free plan sign-up after the account was actually created.
 * The account id is the transaction id, so Google counts each account once.
 */
export async function reportSignup(userId: string): Promise<boolean> {
  if (!userId || alreadyReported(userId)) return false;
  const loaded = await loadGoogleAds();
  if (!loaded || !(await permitsOrdinaryAds())) return false;
  window.gtag?.("event", "conversion", { send_to: SIGNUP_SEND_TO, transaction_id: userId });
  markReported(userId);
  return true;
}

/** True when a session belongs to an account created within the fresh-signup window. */
export function isFreshAccount(createdAt: string | undefined, now = Date.now()): boolean {
  if (!createdAt) return false;
  const created = Date.parse(createdAt);
  return Number.isFinite(created) && now - created >= 0 && now - created <= FRESH_ACCOUNT_MS;
}
