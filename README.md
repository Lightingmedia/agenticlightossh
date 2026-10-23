# LightOS — Aurora Fabric OS workspace

LightRail AI is building an infrastructure agent for compute you already own or rent. LightOS is the workspace for connecting supported provider accounts, inspecting capacity, and planning workloads through conversation.

**Status: early access.** The intended loop is intent → capacity → policy/budget → plan → approval → supported execution → outcome. Source code is not proof of a verified hosted GPU deployment. See [the product brief](docs/product-brief.md).

## First run: hosted workspace, no CLI required

1. Open [LightOS](https://agentic.lightos.sh), choose **Get Started Free**, and sign in or create an account. Complete required email confirmation.
2. Open **Dashboard → Compute Providers** (`/dashboard/providers`). Select a supported provider and authentication method; follow its field-specific credential guidance. Prefer least-privilege access. Enter credentials in the connection form, never in chat.
3. Give the connection a label and submit it. Rejected credentials show an error; `awaiting_gateway` means validation is not complete, not success.
4. Use **Test connection**, then **Inventory**. An empty inventory can mean no resources or a model-only catalog. Inventory is not live GPU utilization or proof a job ran.
5. For actual GPU usage, the deployment operator must configure a runtime gateway on an accessible GPU host. Follow [gateway setup](gateway/README.md), then open **Dashboard → Gateway Setup → Test connection** and the dashboard's **Live GPU usage & cost** panel. Missing hardware or a failed gateway must not become invented readings.

The Free offer is **one GPU, monitoring only, no card required**. Extra GPUs require an upgrade. GPU rental is billed separately by the compute provider. Server-side entitlement and ownership checks are public-launch gates; UI filtering alone is not enforcement.

### Real telemetry prerequisites

- An existing or funded NVIDIA GPU host accessible to its owner/operator.
- Working NVIDIA driver (`nvidia-smi`), Docker Compose, and NVIDIA Container Toolkit.
- Permission to run the gateway and save its HTTPS address and matching bearer token through secure server settings.
- For inference jobs: a configured local model server. Default gateway setup is monitoring only.

The hosted gateway configuration is deployment-wide, not a self-service private gateway per customer. Do not use shared gateway telemetry for public customer monitoring until ownership/isolation is verified. Hardware and model downloads may incur provider charges.

## Demo without GPU hardware

Open `/onboard` or `/os` to explore demonstrations. Photonic steps and the desktop shell are simulated: they do not provision a GPU, install Ubuntu, or deploy a worker. The CUDA enrollment step separately waits for an actual gateway-accepted report. CPU-only gateway hosting tests connectivity, not real GPU usage.

## Develop the workspace

Requires Node.js 20+ and Bun. From a source checkout:

```bash
bun install --frozen-lockfile
bun run dev
```

Use Vite's printed local URL. The hosted project receives public configuration from Lovable Cloud. A separate checkout needs its own provisioned backend and public connection settings; copying frontend source does not create auth, tables, functions, or secrets. **VITE_ values are public.** Never put AI/provider keys, gateway tokens, service-role keys, or encryption keys there.

The optional [self-hosted provider service](docs/provider-backend.md) is not required for the hosted Cloud transport and is not the GPU runtime gateway.

## Installer status and source review

The legacy installer is `public/agentic.lightos.sh`. It writes a CLI into the user's home directory, may change shell configuration, and may request elevated dependency installation. Review the full source; do not pipe a marketing URL into a shell. Native Windows installer support is not established. Inspect source on Linux/macOS or WSL.

From a trusted source checkout only:

```bash
bash -n public/agentic.lightos.sh
less public/agentic.lightos.sh
# Only after reviewing effects and prerequisites:
bash public/agentic.lightos.sh
```

This is not a signed/released package. A versioned release, approved license, and independently published checksums are pending. No verified pip or brew package is available to recommend.

## Tests

```bash
bun run test
python3 -m pip install -r gateway/requirements.txt pytest httpx
python3 -m pytest -q gateway/tests
python3 -m pip install -r backend/requirements.txt
python3 -m pytest -q backend/test_providers_core.py backend/test_providers_adapters.py backend/test_providers_service.py backend/test_providers_api.py
```

These tests use fixtures, not paid GPU accounts. Passing tests does not prove hardware, signed-in onboarding, or live payments. CI runs supported tests separately from operational acceptance.

## Troubleshooting

| Symptom | Next step |
|---|---|
| Credential rejected | Verify credential type and provider permissions; never post the credential in support messages. |
| Awaiting gateway | The adapter requires a configured gateway; it is not connected yet. |
| Empty inventory | Verify actual account resources and adapter support; model catalogs are not GPU measurements. |
| Gateway not connected/unreachable | Configure a running HTTPS gateway; temporary tunnel URLs change after restart. |
| Token mismatch | Save identical token values on host and app through secure settings, never chat. |
| No GPUs visible | Check driver, `nvidia-smi`, and container GPU access; CPU hosting cannot provide GPU telemetry. |
| Inference unavailable | Configure the local model-server profile; failed jobs are not successful execution. |

## Security and release boundary

Public environment configuration is platform-managed. Private credentials stay server-side. Audit history and rotate actual exposed credentials at the issuer: deleting a file does not undo exposure. See [security documentation](docs/security.md); documentation is not certification.

No SOC 2, utilization improvement, universal execution, or savings guarantee is asserted. Isolation, entitlements, revocation, and paid operation require verified acceptance before public paid launch. License, legal/support details, GPU access, and release authorization require the founder. Do not redistribute as licensed open source until a license is approved.
