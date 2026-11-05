# NVIDIA NIM on the Brev GPU host

This optional deployment runs an NVIDIA NIM model server next to the LightOS
runtime gateway. NIM has **no published host port and no public tunnel**. The
only public service remains the bearer-authenticated gateway. Gateway inference
jobs call NIM over the private Docker network through its OpenAI-compatible API.

## Security boundary

- Enter the NGC key only in the hidden prompt on the GPU host. Never paste it in
  chat, the React app, `VITE_` variables, or Lovable Cloud secrets for this
  deployment: Cloud does not run the Brev Docker daemon and does not need this key.
- `setup-nim.sh` sends the key to `docker login` over stdin and writes it only to
  `gateway/.env.nim` with mode `0600`. That file is loaded by the NIM container,
  not by the gateway or website, and is excluded from source control.
- Docker stores registry login state under the host user's Docker configuration.
  Anyone with host root or Docker-group access can inspect container environment
  and credentials. Use a dedicated host, least-privilege NGC key, and rotate the
  key at NVIDIA if it is exposed.
- Model artifacts and container images can be large and Brev GPU charges continue
  while the instance runs. Starting the deployment is not evidence of a working
  model until readiness and a real inference response are verified.

## Prerequisites

- Authorized terminal access to the Linux/Brev VM; no root shell is used here.
- Working `nvidia-smi`, Docker accessible as the current user, Docker Compose
  2.24 or newer (for the optional NIM credential file), and NVIDIA Container Toolkit.
- An NGC API key with access to the selected image and model artifacts.
- A GPU model, GPU count, and memory configuration supported by the chosen NIM.
  Check NVIDIA's current support matrix before pulling. The default is NVIDIA's
  documented Llama 3.1 8B example, pinned for reproducibility; it is not a claim
  that your particular Brev GPU is supported.

Official references:
- [NIM installation and registry login](https://docs.nvidia.com/nim/large-language-models/latest/get-started/installation.html)
- [NIM environment variables and health ports](https://docs.nvidia.com/nim/large-language-models/latest/reference/environment-variables.html)
- [NIM GPU selection](https://docs.nvidia.com/nim/large-language-models/latest/configuration.html)

## Configure and start

Copy the project or at least the `gateway/` directory to the VM, then run:

```bash
cd gateway
bash setup-nim.sh
```

The script shows the visible GPUs and selected image, asks for confirmation,
prompts for the NGC key without echoing it, preserves the existing gateway token
(or generates one locally), disables the alternative vLLM profile, and starts the
enabled services. It does not print the key or put it in command arguments.

To select another supported model-specific NIM, supply public configuration only:

```bash
NIM_IMAGE='nvcr.io/nim/<org>/<image>:<exact-tag>' \
INFERENCE_MODEL='<OpenAI-compatible-model-name>' \
  bash setup-nim.sh
```

For a model-free NIM or other advanced settings, add the required non-secret NIM
settings to `.env.nim` after setup and before restarting. Refer to the selected
image's documentation; do not guess image tags or model names.

## Verify readiness and inference

NIM readiness is checked from the gateway container so no NIM port is published:

```bash
docker compose ps
docker compose logs --tail=100 nim
docker compose exec -T gateway curl -fsS http://nim:8001/v1/health/ready
```

A real inference request through NIM (still inside the private network):

```bash
docker compose exec -T gateway curl -fsS http://nim:8000/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{"model":"meta/llama-3.1-8b-instruct","messages":[{"role":"user","content":"Reply with OK"}],"max_tokens":8}'
```

If you overrode `INFERENCE_MODEL`, use that exact value in the request. Then use
LightOS GPU Setup to connect the **gateway's** HTTPS tunnel and gateway token.
Do not enter a NIM address or NGC key in GPU Setup.

## Operate

```bash
# Restart after configuration changes
docker compose up -d

# Stop NIM without stopping monitoring or the website
docker compose stop nim

# View GPU measurements on the host
nvidia-smi
```

The Compose file uses `gpus: all`. On a multi-GPU host, confirm that the NIM
profile supports that exact visible GPU count. Do not enable both `nim` and
`inference`: both request all GPUs. The setup script automatically removes the
`inference` profile when enabling NIM.

Quick-tunnel gateway URLs still change after tunnel restart. NIM readiness,
GPU telemetry, account entitlement, and end-to-end inference must be verified on
the real host before describing this deployment as live.
