# Self-hosted provider backend

The Compute Providers page ([compute-providers.md](compute-providers.md)) can run against two backends:

| | Supabase (default) | Self-hosted (this document) |
|---|---|---|
| API | `provider-connect` edge function | FastAPI sub-app, `/api/providers` (`backend/providers/`) |
| Data | Postgres tables + Supabase Vault | its **own database** (SQLite file, or Postgres) |
| Credentials | Vault secret per connection | AES-256-GCM envelope per connection, key outside the DB |
| Needs | migration applied, function deployed, secrets set | a vault key and somewhere to run `uvicorn` |

Both expose the same operations and JSON shapes, so the dashboard works unchanged; one env var picks the backend.
Login still comes from Supabase (the API verifies the same session token as the rest of `backend/`).

## Run it locally

```bash
cd backend
python -m venv .venv && . .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
export SUPABASE_URL=https://<project-ref>.supabase.co  # used to verify the user's session token
export SUPABASE_ANON_KEY=<publishable key>
uvicorn main:app --reload --port 8000
```

Then point the frontend at it (`.env.local`; the Vite dev server already proxies `/api` to port 8000):

```bash
VITE_PROVIDERS_API_URL=/api/providers
```

The first request creates `backend/data/lightos.db` and, in development only, a key file `backend/data/vault.key`
(`backend/data/` is git-ignored — never commit it). Check the setup with `python -m providers check`.
Unset `VITE_PROVIDERS_API_URL` to go back to the Supabase path.

## Run it for real

| Variable | Purpose |
|---|---|
| `LIGHTOS_ENV=production` | Refuses to start the vault without an explicit key (it never invents one) |
| `PROVIDER_VAULT_KEY` | 32-byte urlsafe-base64 key. Create one with `python -m providers keygen`; keep it in your secret manager |
| `DATABASE_URL` | SQLAlchemy URL. Default: SQLite file in `LIGHTOS_DATA_DIR` (default `backend/data`) |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Session verification (already required by the rest of `backend/`) |
| `ALLOWED_ORIGINS` | Comma-separated browser origins allowed by CORS (the backend already lists the app's own) |
| `LIGHTOS_RUNTIME_GATEWAY_URL`, `LIGHTOS_RUNTIME_GATEWAY_TOKEN` | Aurora gateway, for the providers it validates (below) |
| `LIGHTRAIL_AWS_ACCESS_KEY_ID`, `LIGHTRAIL_AWS_SECRET_ACCESS_KEY` | LightRail's AWS principal for cross-account role connections (grant it only `sts:AssumeRole`) |
| `PROVIDERS_ALLOW_PRIVATE_HOSTS=1` | Let Kubernetes endpoints resolve to private addresses (trusted deployments only) |
| `PROVIDERS_RATE_LIMIT_PER_MINUTE` / `PROVIDERS_MAX_CONNECTIONS_PER_USER` | Per-user caps (default 30 / 50) |

Build the frontend with `VITE_PROVIDERS_API_URL=https://<your-api-host>/api/providers`.
Postgres: `pip install "psycopg[binary]"` and `DATABASE_URL=postgresql+psycopg://user:pass@host/db`. Tables are created
on first use; there is no migration tool yet, so later schema changes need one (Alembic). Only SQLite is covered by the
automated tests.

## How credentials are protected

* **At rest:** each connection's secret fields are encrypted with AES-256-GCM, with the row id bound in as associated
  data (a ciphertext copied to another row will not decrypt). The key is never stored in the database. Back up the key
  with the database: without it stored credentials are unrecoverable and users have to reconnect.
* **Rotation:** set the new key as `PROVIDER_VAULT_KEY`, keep the old one in `PROVIDER_VAULT_KEY_OLD`, run
  `python -m providers reencrypt`, then drop the old key.
* **In flight:** credentials are decrypted only for the duration of one call. They are never returned to the browser,
  never logged, and scrubbed (including masked echoes such as `9c6eb7*****b5f7`) from provider error text before it is
  shown or stored in the audit trail.
* **Outbound requests:** values that end up in hostnames (AWS/IBM/OCI regions, project and tenant ids) are validated
  strictly. The Kubernetes API server URL is user-supplied, so it must be `https`, contain no credentials and resolve
  to public addresses only; the connection is pinned to the address that was checked (DNS rebinding cannot swap it) and
  redirects are never followed. Responses are size-capped and every call has a timeout.
* **Access:** every route except `catalog`/`health` needs a valid Supabase session and only touches the caller's own
  rows (another user's id is a plain 404). `connect`/`test`/`inventory` are rate limited. Unlike the rest of
  `backend/`, mutating calls do **not** require the `admin` role — the sub-app is mounted outside that guard on purpose
  because connections belong to ordinary users.

## API

| Method & path | Body → result |
|---|---|
| `GET /api/providers/catalog` | public; the catalog, with `validation` = what *this backend* does (`direct` or `gateway`) |
| `GET /api/providers/health` | public; `{status, database, vault, gateway}` |
| `GET /api/providers/connections` | `{connections, gateway}` |
| `POST /api/providers/connections` | `{providerId, authMethod, label, credentials}` → `201 {connection}`; `422 {error, status:"error"}` when the provider rejects the credentials (nothing is stored) |
| `POST /api/providers/connections/{id}/test` | re-validate → `{connection}` |
| `GET /api/providers/connections/{id}/inventory` | `{items, fetchedAt}` |
| `DELETE /api/providers/connections/{id}` | `{ok: true}` and the credential is deleted |
| `GET /api/providers/events` | the caller's audit trail |

Errors are always `{"error": "..."}` (plus `missing`/`invalid`/`fields` where relevant): 400 bad input, 401 no/invalid
session, 404 not yours, 409 duplicate label or limit, 422 provider said no, 429 slow down (`Retry-After`), 502 provider
unreachable, 503 vault/database not configured.

## What is validated, and how

| Provider | Check | Notes |
|---|---|---|
| AWS | STS `GetCallerIdentity` (SigV4), EC2 `DescribeInstances` | cross-account role or access key |
| Google Cloud | service-account JWT → Compute + TPU APIs | |
| Azure | client-credentials token → ARM | |
| CoreWeave, any Kubernetes | `SelfSubjectReview` / nodes | SSRF-guarded, public TLS only |
| Lambda, RunPod (API v2), Vast.ai, DigitalOcean, Crusoe | their REST APIs | Crusoe requests are HMAC-signed |
| Groq, Cerebras, Fireworks, Together, General Compute | `GET /models` | these reject wrong keys |
| **NVIDIA API Catalog, NVIDIA NGC** | NGC key service (`/v3/keys/get-caller-info`) | `/v1/models` is public and accepts *any* key, so it proves nothing |
| **SambaNova** | one-token chat completion | its model list is public too |
| **IBM Cloud** | IAM token exchange + VPC read | validated here instead of by Aurora |
| **Oracle Cloud** | RSA-signed Identity/Core requests | validated here; only the root compartment is listed; key/fingerprint match is checked locally |
| DGX Cloud Lepton, Nebius | **delegated to the Aurora gateway** | no public REST contract to build on; without a gateway they are stored as `awaiting_gateway` |

The adapters follow the providers' public docs and were checked against the real endpoints with deliberately
**fake** credentials (each is rejected with the provider's own message). They have not been run against real
accounts: inventory field mappings that the docs leave open (RunPod, Crusoe, DigitalOcean GPU info) are read
defensively and should be confirmed with a real response.

## Tests

```bash
cd backend && pytest test_providers_core.py test_providers_adapters.py test_providers_service.py test_providers_api.py
npm test        # includes the frontend client and a check that backend/providers/catalog.json is current
```

The provider catalog is defined once, in TypeScript. After editing `supabase/functions/_shared/provider-catalog.ts`
run `npm run export:provider-catalog` to refresh the JSON the backend reads (the frontend test fails if you forget).
