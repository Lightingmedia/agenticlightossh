# LightOS runtime gateway (single GPU node)

A small HTTPS service that runs on your NVIDIA machine and tells the LightOS app what its GPUs are doing.

- `GET /healthz` (public): `{status, gpu_count, source}`
- `GET /v1/fabric/capacity?runtime=cuda`, `GET /v1/fabric/telemetry?window_seconds=10..3600`
- `GET /v1/fabric/topology`, `GET /v1/fabric/events`
- `POST /v1/intents/validate`, `POST /v1/deployments/plan`
- `POST /v1/jobs`, `GET|DELETE /v1/jobs/{id}` (MTMC; needs the `inference` profile, otherwise `501`)
- `POST /v1/nodes/register` (from `lightos cuda`)

Every route except `/healthz` needs `Authorization: Bearer $LIGHTOS_GATEWAY_TOKEN`.
The gateway samples the GPUs every 5 s and keeps one hour of history. It reads DCGM (dcgm-exporter) when that
profile runs, otherwise NVML. It never makes numbers up: with no GPU visible, `totals.devices` is `0` and the
response includes a `reason`.

## NVIDIA Brev quick start

1. Create a **VM mode** instance with any NVIDIA GPU (L4 is enough) on brev.nvidia.com, then open its terminal
   (`brev shell <name>` or the web console).
2. Get the gateway code onto the instance (clone this repository, or copy the `gateway/` folder), then:

```bash
cd gateway
cp .env.example .env
sed -i "s/^LIGHTOS_GATEWAY_TOKEN=.*/LIGHTOS_GATEWAY_TOKEN=$(openssl rand -hex 32)/" .env
docker compose up -d --build
```

3. Print the public URL and run a check:

```bash
set -a; . ./.env; set +a
for i in $(seq 1 30); do URL=$(docker compose logs tunnel-quick 2>/dev/null | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' | tail -1); [ -n "$URL" ] && break; sleep 2; done
echo "Gateway URL: $URL"
curl -s "$URL/healthz"; echo
curl -s -H "Authorization: Bearer $LIGHTOS_GATEWAY_TOKEN" "$URL/v1/fabric/capacity?runtime=cuda" | python3 -m json.tool | head -30
```

You should see `"gpu_count": 1` (or more) and `"totals": {"devices": 1, ...}`.

4. In the LightOS app, save the URL as **LIGHTOS_RUNTIME_GATEWAY_URL** and the token as
   **LIGHTOS_RUNTIME_GATEWAY_TOKEN** through the secure secret form. Print the token on the instance with
   `grep LIGHTOS_GATEWAY_TOKEN .env` and copy it straight into the form. Do not paste it into chat.
5. Open **Dashboard → Gateway Setup → Test connection**, then the dashboard's *Live GPU usage & cost* panel.

> **Quick-tunnel URLs change every time the tunnel restarts** (including instance reboots). When that happens,
> rerun step 3 and update `LIGHTOS_RUNTIME_GATEWAY_URL`. For a stable address, create a Cloudflare named tunnel
> pointing to `http://gateway:8080`, put its token in `CLOUDFLARE_TUNNEL_TOKEN` and set `COMPOSE_PROFILES=named`.

### Optional profiles

Set them in `.env`, then run `docker compose up -d` again:

- `COMPOSE_PROFILES=quick,dcgm` + `DCGM_EXPORTER_URL=http://dcgm-exporter:9400/metrics`: DCGM telemetry
- `COMPOSE_PROFILES=quick,inference` + `VLLM_URL=http://vllm:8000`: local model server so MTMC `/v1/jobs` runs on
  this GPU (the first start downloads the model)

### Make the numbers move

```bash
docker run --rm --gpus all nvcr.io/nvidia/k8s/cuda-sample:nbody nbody -gpu -benchmark -numbodies=2000000
```

### Register the node (`lightos cuda`)

Generate a setup code in the app's onboarding, then on the instance run `lightos cuda --code XXXX-XXXX`.
The gateway stores the report and the app shows **Accepted by runtime gateway**.

## Troubleshooting

| Symptom in the app | Cause |
|---|---|
| Gateway unreachable | tunnel is down or the URL changed: rerun step 3 |
| Token mismatch | app token differs from `.env`: re-save it in the secret form |
| No GPUs visible (`reason`) | `nvml_unavailable`: the container has no GPU access (check `gpus: all` and the NVIDIA Container Toolkit); `no_gpu_visible`: the driver reports no devices |

## Development

```bash
pip install -r requirements.txt fastapi httpx pytest
pytest -q tests        # fake NVML, no GPU or network needed
```

`modal_app.py` is a CPU-only Modal wrapper around the same app (`GPU_TYPE = None`).
