import { canTrack } from "./consent";

const KLAVIYO_SRC = "https://static.klaviyo.com/onsite/js/UCC8EF/klaviyo.js?company_id=UCC8EF";

/** Loads Klaviyo onsite forms and tracking only after the visitor permits marketing/advertising. */
export async function loadKlaviyo(): Promise<boolean> {
  if (!(await canTrack("advertising"))) return false;
  if (document.querySelector("script[data-klaviyo]")) return true;
  const w = window as unknown as { klaviyo?: unknown; _klOnsite?: unknown[] };
  if (!w.klaviyo) {
    w._klOnsite = w._klOnsite || [];
    try {
      w.klaviyo = new Proxy(
        {},
        {
          get(_t, name) {
            if (name === "push") return (...args: unknown[]) => (w._klOnsite as unknown[]).push(...args);
            return (...args: unknown[]) => {
              const cb = typeof args[args.length - 1] === "function" ? (args.pop() as (v: unknown) => void) : undefined;
              return new Promise((resolve) => {
                (w._klOnsite as unknown[]).push([name, ...args, (v: unknown) => { cb?.(v); resolve(v); }]);
              });
            };
          },
        },
      );
    } catch {
      /* Proxy unsupported: Klaviyo's own script still loads */
    }
  }
  const script = document.createElement("script");
  script.async = true;
  script.src = KLAVIYO_SRC;
  script.dataset["klaviyo"] = "";
  document.head.appendChild(script);
  return true;
}
