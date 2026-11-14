# Architecture Rules

- Brev self-hosting packages only the static website alongside the existing GPU runtime; Cloud retains accounts, billing, data, and authorization so hosting changes do not silently migrate or bypass those boundaries.

- Keep the landing workload illustration in its own presentation-only component, separate from live gateway state, so animated scheduling and deployment cannot be mistaken for verified execution.

- The browser submits constrained workload intent only; the LightOS runtime is the sole privileged execution authority because drivers, shells, containers, and cluster control must remain server-side.
- MCP accelerator tools call one authenticated LightOS runtime gateway and return only gateway-verified capacity, plans, and telemetry because Edge Functions cannot inspect accelerator hardware directly.- GPU nodes enroll via one-time, hashed, 15-minute setup codes through the node-enroll function, which alone forwards reports to the runtime gateway, so no gateway credential ever lives on nodes.

- The runtime gateway lives in gateway/ as one plain ASGI app (Docker + outbound tunnel for GPU hosts, thin Modal wrapper as fallback) and only reports measured GPU data, returning a reason instead of numbers when none is visible, so the dashboard can never show fabricated usage.
- Optional NVIDIA NIM runs as an internal Compose service behind the gateway, with its NGC key entered on the GPU host and scoped to NIM only; no public NIM port, frontend secret, or Cloud copy because inference must share the gateway's authenticated execution boundary.

- Keep the product explanation in `docs/product-brief.md` and setup prerequisites in the root README, so future work distinguishes source implementation from verified operation.

- Runtime access resolves one encrypted dedicated-host connection per authenticated user, with admin-only deployment fallback, and enforces entitlements in the shared server gateway wrapper; MCP forwards verified caller tokens to that boundary so no client can bypass the free monitoring limit.
- Initial user-supplied runtime addresses are Cloudflare quick-tunnel HTTPS origins only, with redirects disabled, to prevent arbitrary-host credential forwarding and SSRF until broader tunnel providers are verified.
- Operational records use nullable account ownership with owner-only customer reads and parent-derived deployment-log access; unowned legacy records stay admin-only. Measured monitoring remains on the entitlement-filtered account gateway, and unsupported hardware controls must not mutate database state as a substitute for execution.
- Compute Exchange sections show setup-required states until a backend exchange contract exists; sample offers live only behind the labeled demo flag and never call provisioning, so the console cannot imply real capacity or execution.

- Admin views of all accounts read `profiles`/`subscriptions` through admin-only RLS (`has_role`), never a browser-side service key, so signup data stays visible only to role-holders.
- GPU resale runs only through the `compute-resale` function: prices come from a live provider offer at request time with the markup applied server-side, customer credit is an append-only ledger with unique references, and the scheduled `compute-meter` charges by elapsed time and destroys machines at zero balance, so no client can set prices, skip charges, or keep a machine running unpaid.
- Plan lifecycle rules (trial length, which statuses keep access, proration mode) live as constants in `_shared/launch-policy.ts` and are shared by checkout, `change-plan`, server entitlements and the UI, so billing and feature access can't disagree.

- Ad and marketing tags (Google Ads, Klaviyo) load only through `src/lib/consent.ts` gating in `CookieConsent`, never as static `index.html` scripts, and the sign-up conversion fires only from confirmed account creation in `Auth.tsx` with the account id as transaction id, so consent regions and duplicate sign-ups stay correct.
- The site-wide help chat calls only the public, rate-limited `support-chat` function: answers come from a fixed product brief in that function, and "Talk to a person" messages are written server-side to `support_requests`, readable only by admins, so visitors never get direct table access.
- `public/downloads/lightos-gateway.tar.gz` (+ `.sha256`) is a generated copy of `gateway/` built by `scripts/package-gateway.sh`; rerun it after gateway changes so the First-run guide download matches the source.
