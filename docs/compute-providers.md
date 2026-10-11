# Compute Provider Integrations — Plan & Requirements

Goal: a LightOS user connects every cloud they buy accelerators from — hyperscalers, NVIDIA, GPU
clouds, inference APIs, and their own metal — and manages workloads across all of them from one
place, with Aurora Fabric OS deciding placement.

## How it fits the existing architecture

```
Browser (/dashboard/providers)          MCP clients (Claude, agents)
   │ credentials once, over TLS             │ list_compute_providers
   ▼                                        │ plan_deployment {allowedProviders}
provider-connect edge function              ▼
   ├─ validates (direct adapter) ───► provider API (read-only)
   ├─ stores secret ───► Supabase Vault (secret_id only in provider_connections)
   ├─ audit ───► provider_events
   └─ gateway-mode providers ───► Aurora runtime gateway /v1/providers/*
                                         │
                                         ▼
                       Aurora = sole execution authority (launch / scale / terminate)
```

Rules preserved from `AGENTS.md`:
- The browser never holds or re-reads credentials and never issues launch/terminate calls.
- The edge function does **read-only** validation and inventory. Anything that creates or
  destroys resources is executed by Aurora through the runtime gateway.
- `launch_enabled` stays `false` until the user explicitly opts in per connection (Phase 2).

## What was built (branch `feat/compute-providers`)

| Piece | Path |
|---|---|
| Provider catalog (shared by UI + server) | `supabase/functions/_shared/provider-catalog.ts`, re-exported at `src/lib/providers/catalog.ts` |
| DB tables + Vault helpers + RLS | `supabase/migrations/20261010000000_compute_provider_connections.sql` |
| Edge function: catalog / list / connect / test / inventory / disconnect | `supabase/functions/provider-connect/index.ts` |
| Direct adapters (AWS, GCP, Azure, CoreWeave/K8s, Lambda, Crusoe, RunPod, Vast, DigitalOcean, OpenAI-compatible APIs) | `supabase/functions/_shared/providers/adapters.ts` |
| Dashboard page | `src/pages/ComputeProviders.tsx` → `/dashboard/providers` (sidebar: LightOS → Compute Providers) |
| MCP tool + plan filter | `src/lib/mcp/tools/list-compute-providers.ts`, `plan_deployment.allowedProviders` |
| Tests | `src/test/provider-catalog.test.ts` |

## Provider matrix

| Provider | Category | Accelerators | Validation | Phase |
|---|---|---|---|---|
| AWS | Hyperscaler | H100/H200/B200/A100/L40S/L4, Trainium2, Inferentia2 | Direct (STS + EC2) | 1 |
| Google Cloud | Hyperscaler | TPU v5e/v5p/v6e/7x, H100/H200/B200/A100/L4 | Direct (Compute + TPU API) | 1 |
| Microsoft Azure | Hyperscaler | H100/H200/GB200/A100, MI300X | Direct (ARM) | 1 |
| Oracle Cloud (OCI) | Hyperscaler | H100/H200/B200/GB200, MI300X | Gateway (RSA request signing) | 2 |
| IBM Cloud | Hyperscaler | H100/H200/L40S, Gaudi 3 | Gateway | 3 |
| NVIDIA API Catalog (NIM) | NVIDIA | Hosted NIM endpoints | Direct (`/v1/models`) | 1 |
| NVIDIA DGX Cloud Lepton | NVIDIA | H100/H200/B200/GB200 via partner clouds | Gateway | 1 |
| NVIDIA NGC | NVIDIA | Image/model registry for every cluster | Gateway | 1 |
| CoreWeave (CKS, SUNK) | GPU cloud | GB300/GB200/B200/H200/H100/L40S | Direct (K8s API) | 1 |
| Lambda | GPU cloud | B200/H200/H100/A100/GH200 | Direct | 1 |
| Crusoe | GPU cloud | GB200/B200/H200/H100, MI300X | Direct (HMAC) | 1 |
| Nebius | GPU cloud | GB200/B200/H200/H100 | Gateway (gRPC) | 2 |
| RunPod | GPU cloud | H200/H100/B200/A100, MI300X | Direct (REST v2) | 2 |
| Vast.ai | GPU cloud | H100/A100/RTX 4090/5090 | Direct | 2 |
| DigitalOcean GPU Droplets | GPU cloud | H100/H200, MI300X/MI325X, L40S | Direct | 2 |
| Together AI | GPU cloud / inference | GB200/B200/H200/H100 | Direct (`/v1/models`) | 2 |
| General Compute | Inference API (ASIC) | Cerebras CS-3, SambaNova SN50, Positron, d-Matrix, B300 prefill | Direct (`api.generalcompute.com/v1`) | 1 |
| Cerebras | Inference API | CS-3 | Direct | 1 |
| Groq | Inference API | LPU | Direct | 2 |
| SambaNova Cloud | Inference API | RDU | Direct | 2 |
| Fireworks AI | Inference API | H100/H200/B200, MI300X | Direct | 3 |
| Any Kubernetes | Self-managed | Whatever the GPU Operator exposes | Direct (public TLS) | 1 |
| On-prem via LightOS gateway | Self-managed | NVIDIA, AMD, Intel, LightRail NCE | Existing node-enroll flow | 1 |

**Not yet in the catalog (candidates):** Alibaba Cloud, Tencent Cloud, Hyperstack, Voltage Park,
TensorWave (AMD), Vultr, Scaleway, OVHcloud, Modal, Baseten, Replicate, Paperspace (now part of
DigitalOcean), Fluidstack, Lambda 1-Click Clusters (covered via K8s/Slurm), SF Compute.
Adding one is a catalog entry plus, for direct mode, a ~30-line adapter.

## Phases

1. **Connect & see (this branch).** Validate credentials, store in Vault, show live GPU
   inventory/offers/models per provider, expose the catalog to MCP.
2. **Plan across providers.** Aurora's `/v1/deployments/plan` consumes the user's connected
   providers + `allowedProviders`, returns placement with cost per provider. Add OCI/Nebius
   validation in the gateway. Price normalization across providers.
3. **Execute.** Per-connection `launch_enabled` opt-in; Aurora launches/terminates through the
   provider API using the vaulted credential, with spend caps from `maxCostPerHourUsd`.
4. **Federate.** Burst from on-prem NCE fabric to cloud when the fabric is saturated; move
   inference endpoints between General Compute / NIM / self-hosted by latency and cost SLOs.

## Runtime gateway contract (new endpoints Aurora must implement)

| Method & path | Body | Returns |
|---|---|---|
| `POST /v1/providers/validate` | `{connectionId, providerId, authMethod, credentials}` | `{ok, identity?, message?}` |
| `POST /v1/providers/{connectionId}/inventory` | `{providerId, authMethod, credentials}` | `{items: InventoryItem[]}` |

Credentials arrive over the existing bearer-authenticated HTTPS channel; the gateway must not log them.

## What you (LightRail) need to provide before deploy

Edge function secrets (Supabase → Edge Functions → Secrets):

| Secret | Why | Required |
|---|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Already present for other functions | Yes |
| `LIGHTRAIL_AWS_ACCESS_KEY_ID`, `LIGHTRAIL_AWS_SECRET_ACCESS_KEY` | LightRail's own AWS principal that customers' IAM roles trust (role-based AWS connections). Use a dedicated IAM user with only `sts:AssumeRole`. | For AWS role option |
| `LIGHTOS_RUNTIME_GATEWAY_URL`, `LIGHTOS_RUNTIME_GATEWAY_TOKEN` | Already used; required for gateway-mode providers | For OCI, IBM, Nebius, Lepton, NGC |

Database: run the migration (requires the `supabase_vault` extension, enabled by default on Supabase).

## What each customer provides (shown in the Connect dialog)

| Provider | Customer supplies | Least-privilege scope |
|---|---|---|
| AWS (recommended) | IAM role ARN trusting LightRail's account + External ID (generated by LightOS) + region | `ec2:Describe*`, `eks:List*/Describe*`, `servicequotas:Get*` |
| AWS (alt) | Access key ID + secret + region | Same, on a dedicated IAM user |
| GCP | Project ID + service account JSON key | `compute.viewer`, `container.viewer`, `tpu.viewer` |
| Azure | Tenant ID, subscription ID, client ID, client secret | Reader on subscription |
| OCI | Tenancy OCID, user OCID, fingerprint, region, private key PEM | `read all-resources` |
| IBM | IAM API key + region | Viewer on VPC Infrastructure |
| NVIDIA API Catalog | `nvapi-…` key | Inference only |
| DGX Cloud Lepton | Workspace ID + service-account token | Read-only role |
| NGC | Org name + API key | NGC Catalog pull |
| CoreWeave | Cluster API server URL + access-token secret (+ namespace) | Read-only ClusterRole |
| Lambda | API key | Dedicated key |
| Crusoe | Access key ID + secret (+ project ID) | Dedicated key |
| Nebius | Project ID, service account ID, key ID, private key PEM | viewers group |
| RunPod | API key | Read |
| Vast.ai | API key | Instance read |
| DigitalOcean | Personal access token | `droplet:read`, `sizes:read`, `kubernetes:read`, `account:read` |
| Together / General Compute / Cerebras / Groq / SambaNova / Fireworks | API key | Inference only |
| Any Kubernetes | API server URL + ServiceAccount token | Read nodes/pods |

## Known limits / follow-ups

- Direct Kubernetes validation needs a publicly trusted API-server certificate (CoreWeave CKS
  qualifies); private clusters should enroll through the gateway instead.
- RunPod REST v1 retires 2026-11-15; this adapter already targets v2.
- Inventory field mappings for RunPod v2, Crusoe capacities and Vast are defensive and should be
  confirmed against a real account response.
- `npm ci` currently fails because `package-lock.json` is out of sync with `package.json`
  (`drizzle-kit`), unrelated to this change.
- A self-hosted alternative to the edge function + Supabase tables (FastAPI with its own database and encrypted
  vault) is described in [provider-backend.md](provider-backend.md).
