#!/usr/bin/env bash
# Configure and start an internal NVIDIA NIM beside the LightOS gateway.
# Run on the authorized Linux GPU host. No root or API key in shell history.
set -euo pipefail
umask 077

cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

NIM_IMAGE="${NIM_IMAGE:-nvcr.io/nim/meta/llama-3.1-8b-instruct:2.1.5}"
INFERENCE_MODEL="${INFERENCE_MODEL:-meta/llama-3.1-8b-instruct}"

fail() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

for cmd in docker nvidia-smi python3; do
  command -v "$cmd" >/dev/null 2>&1 || fail "$cmd is required on the GPU host"
done

docker compose version >/dev/null 2>&1 || fail "the Docker Compose plugin is required"
docker info >/dev/null 2>&1 || fail "Docker is not accessible as this user; fix host permissions rather than running this script with sudo"
nvidia-smi >/dev/null 2>&1 || fail "nvidia-smi failed; install or repair the NVIDIA driver first"

case "$NIM_IMAGE" in
  nvcr.io/nim/*) ;;
  *) fail "NIM_IMAGE must be an nvcr.io/nim/ image with an explicit tag" ;;
esac
case "$NIM_IMAGE$INFERENCE_MODEL" in
  *$'\n'*|*$'\r'*) fail "image and model names must be single-line values" ;;
esac

printf 'Visible NVIDIA devices:\n'
nvidia-smi --query-gpu=index,name,memory.total --format=csv,noheader
printf '\nNIM image: %s\nOpenAI model name: %s\n' "$NIM_IMAGE" "$INFERENCE_MODEL"
printf 'Confirm this image and its GPU requirements in NVIDIA\'s support matrix.\n'
printf 'This pulls a large image, downloads model artifacts, and starts GPU services.\n'
read -r -p 'Continue? [y/N] ' answer
case "$answer" in
  y|Y|yes|YES) ;;
  *) printf 'Cancelled before reading credentials or changing services.\n'; exit 0 ;;
esac

NGC_API_KEY=""
trap 'unset NGC_API_KEY' EXIT
read -r -s -p 'NGC API key (input hidden): ' NGC_API_KEY
printf '\n'
[ -n "$NGC_API_KEY" ] || fail "an NGC API key is required"

# The literal username is $oauthtoken. The key travels only over stdin.
printf '%s' "$NGC_API_KEY" | docker login nvcr.io --username '$oauthtoken' --password-stdin

# Keep the NGC credential out of the gateway, website, shell history and logs.
printf 'NGC_API_KEY=%s\n' "$NGC_API_KEY" > .env.nim.tmp
chmod 600 .env.nim.tmp
mv .env.nim.tmp .env.nim
unset NGC_API_KEY

[ -f .env ] || cp .env.example .env
python3 - "$NIM_IMAGE" "$INFERENCE_MODEL" <<'PY'
from pathlib import Path
import secrets
import sys

image, model = sys.argv[1:]
path = Path(".env")
lines = path.read_text().splitlines()
values = {}
for line in lines:
    if line and not line.lstrip().startswith("#") and "=" in line:
        key, value = line.split("=", 1)
        values[key] = value

profiles = [p.strip() for p in values.get("COMPOSE_PROFILES", "quick").split(",") if p.strip()]
# vLLM and NIM must not contend for all GPUs on the same host.
profiles = [p for p in profiles if p not in {"inference", "nim"}]
profiles.append("nim")
if not {"quick", "named"}.intersection(profiles):
    profiles.insert(0, "quick")

updates = {
    "LIGHTOS_GATEWAY_TOKEN": values.get("LIGHTOS_GATEWAY_TOKEN") or secrets.token_hex(32),
    "COMPOSE_PROFILES": ",".join(profiles),
    "INFERENCE_URL": "http://nim:8000",
    "INFERENCE_MODEL": model,
    "NIM_IMAGE": image,
}
for key, value in updates.items():
    prefix = f"{key}="
    for index, line in enumerate(lines):
        if line.startswith(prefix):
            lines[index] = prefix + value
            break
    else:
        lines.append(prefix + value)

path.write_text("\n".join(lines) + "\n")
path.chmod(0o600)
PY

docker compose config --quiet
docker compose pull nim
docker compose up -d --build
docker compose ps

cat <<'EOF'

NIM is starting on the private container network. Model download and engine
preparation can take a while. Check readiness without exposing a public NIM port:
  docker compose exec -T gateway curl -fsS http://nim:8001/v1/health/ready

Follow startup logs:
  docker compose logs -f nim

The public HTTPS endpoint remains the authenticated LightOS gateway, not NIM.
EOF
