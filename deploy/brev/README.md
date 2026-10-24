# Brev website + GPU runtime, with accounts on Cloud

This deployment places the React website on the Brev VM alongside the existing
`gateway/` GPU service. Existing accounts, database, billing functions, MCP and
account authorization remain on Lovable Cloud. The Python `backend/` is not a
replacement for those Cloud services and is not launched by this configuration.

## Access and prerequisites

- A running NVIDIA Brev VM, Docker Compose and NVIDIA Container Toolkit.
- Authorized terminal access through the Brev CLI or SSH. A Brev API key has not
  been verified as sufficient for remote command execution.
- Transfer the project source to the VM without `.git`, `node_modules`, `dist`,
  private environment files or credentials. Do not paste keys into chat.
- Brev GPU charges continue while the VM runs. The website stops when it stops.

## Launch the website from the project root

Create `deploy/brev/.env` **on the VM** containing only the three public browser
configuration values from the project's managed configuration:
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.
These are public configuration, not service-role credentials. Never put a Brev,
gateway, AI, Stripe secret, or private SSH key in this file or build arguments.

```bash
docker compose --env-file deploy/brev/.env -f deploy/brev/compose.yml up -d --build
curl -f http://127.0.0.1:8081/healthz
docker compose --env-file deploy/brev/.env -f deploy/brev/compose.yml logs website-tunnel
```

The tunnel logs contain the temporary website HTTPS URL. This is a test address,
not a production domain; it changes on tunnel restart.

## Launch the GPU runtime separately

Follow `gateway/README.md`, running its Compose stack from `gateway/`. Keep its
gateway token on the VM and enter it only in the signed-in account's GPU Setup
form with the **GPU tunnel URL**, not the website tunnel URL. The two tunnels are
separate so static website visitors never gain privileged runtime access.

## Production cutover gate

Do not change `agentic.lightos.sh` yet. First verify both containers, real measured
GPU readings, signup/email confirmation, account isolation, the Free one-GPU
connection rule, and paid checkout/read-back. Register a stable website HTTPS
origin in Cloud auth redirects and the relevant billing-origin allowlists before
testing these flows. Cloud-hosted MCP remains on its current endpoint unless a
separate verified MCP deployment is made.

For production, replace the website quick tunnel with a named tunnel and stable
DNS after these checks. Keep the existing published website available for
rollback. No hosting deployment or DNS cutover is performed by adding these files.