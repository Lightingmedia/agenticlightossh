"""Inference APIs (GPU and ASIC): General Compute, NVIDIA API Catalog, Cerebras, Groq, SambaNova, Fireworks, Together,
plus NVIDIA NGC.

Most of them speak the OpenAI dialect and reject a wrong key on ``GET /v1/models``, which is the cheapest check. Two do
not, and a model list alone would "validate" any garbage key for them:

* **NVIDIA API Catalog** (and NGC): ``/v1/models`` is public. Keys are NGC keys, so they are checked against NGC's key
  service (``POST /v3/keys/get-caller-info``), which answers a bad key with 401 "Invalid API key.".
* **SambaNova**: ``/v1/models`` is public too; the key is checked with a one-token chat completion instead.
"""
from __future__ import annotations

import re
from typing import Any, Dict, List

from ..http import ProviderError
from .base import Adapter, AdapterContext, Creds, Item, Validation, make_item, need

BASES: Dict[str, str] = {
    "general_compute": "https://api.generalcompute.com/v1",
    "nvidia_api_catalog": "https://integrate.api.nvidia.com/v1",
    "cerebras": "https://api.cerebras.ai/v1",
    "groq": "https://api.groq.com/openai/v1",
    "sambanova": "https://api.sambanova.ai/v1",
    "fireworks": "https://api.fireworks.ai/inference/v1",
    "together_gpu_clusters": "https://api.together.xyz/v1",
}

_NGC_KEY_SERVICE = "https://api.ngc.nvidia.com/v3/keys/get-caller-info"
_NOT_CHAT = re.compile(r"embed|whisper|tts|rerank|guard|vision|ocr|image", re.I)


def _bearer(key: str) -> Dict[str, str]:
    return {"Authorization": f"Bearer {key}"}


async def _models(ctx: AdapterContext, provider_id: str, key: str) -> List[Dict[str, Any]]:
    data = await ctx.http.get_json(f"{BASES[provider_id]}/models", _bearer(key))
    rows = data if isinstance(data, list) else ((data or {}).get("data") or [])
    return [m for m in rows if isinstance(m, dict)]


def _model_items(models: List[Dict[str, Any]]) -> List[Item]:
    return [make_item("model", m.get("id"), m.get("display_name") or m.get("id"), status=m.get("owned_by") or m.get("type")) for m in models[:500]]


def _models_adapter(provider_id: str) -> Adapter:
    async def validate(ctx: AdapterContext, creds: Creds) -> Validation:
        (key,) = need(creds, "apiKey")
        return Validation(f"{len(await _models(ctx, provider_id, key))} models available")

    async def inventory(ctx: AdapterContext, creds: Creds) -> List[Item]:
        (key,) = need(creds, "apiKey")
        return _model_items(await _models(ctx, provider_id, key))

    return Adapter(validate=validate, inventory=inventory)


# ─── NVIDIA: keys are NGC keys ────────────────────────────────────────────────

async def ngc_check_key(ctx: AdapterContext, key: str) -> str:
    """Verify an NGC / NVIDIA API Catalog key with NGC's key service; returns a short description of the owner."""
    response = await ctx.http.request(
        "POST",
        _NGC_KEY_SERVICE,
        headers={"Accept": "application/json", "Content-Type": "application/x-www-form-urlencoded"},
        data={"credentials": key},
    )
    info = response.json if isinstance(response.json, dict) else {}
    user = info.get("user") if isinstance(info.get("user"), dict) else {}
    who = user.get("name") or user.get("email") or info.get("name") or info.get("email")
    return f"NGC account {who}" if who else "NGC API key accepted"


async def _nvidia_validate(ctx: AdapterContext, creds: Creds) -> Validation:
    (key,) = need(creds, "apiKey")
    return Validation(await ngc_check_key(ctx, key))


async def _ngc_validate(ctx: AdapterContext, creds: Creds) -> Validation:
    (key,) = need(creds, "apiKey")
    who = await ngc_check_key(ctx, key)
    org = creds.get("orgName")
    return Validation(f"{who} · org {org}" if org else who, "Key verified with NGC; the organisation name is not checked.")


async def _no_inventory(ctx: AdapterContext, creds: Creds) -> List[Item]:
    return []  # NGC is a container / model registry: nothing to list per account


# ─── SambaNova: public model list, so probe the key with a 1-token completion ─

async def _sambanova_validate(ctx: AdapterContext, creds: Creds) -> Validation:
    (key,) = need(creds, "apiKey")
    base = BASES["sambanova"]
    models = await _models(ctx, "sambanova", key)
    candidates = [m["id"] for m in models if isinstance(m.get("id"), str) and not _NOT_CHAT.search(m["id"])][:3]
    if not candidates:
        raise ProviderError("SambaNova returned no chat models to verify the key with")
    last_error = "no usable model"
    for model in candidates:
        try:
            await ctx.http.request(
                "POST",
                f"{base}/chat/completions",
                headers={**_bearer(key), "Content-Type": "application/json"},
                json_body={"model": model, "messages": [{"role": "user", "content": "ping"}], "max_tokens": 1},
            )
        except ProviderError as error:
            if error.status in (401, 403):
                raise
            if error.status == 429:  # rate limited, but the key was accepted
                return Validation(f"{len(models)} models available", "Key accepted (rate limited at the moment).")
            last_error = error.message
            continue
        return Validation(f"{len(models)} models available")
    raise ProviderError(f"Could not verify the SambaNova key: {last_error}")


async def _sambanova_inventory(ctx: AdapterContext, creds: Creds) -> List[Item]:
    (key,) = need(creds, "apiKey")
    return _model_items(await _models(ctx, "sambanova", key))


async def _nvidia_inventory(ctx: AdapterContext, creds: Creds) -> List[Item]:
    (key,) = need(creds, "apiKey")
    return _model_items(await _models(ctx, "nvidia_api_catalog", key))


ADAPTERS: Dict[str, Adapter] = {
    "general_compute": _models_adapter("general_compute"),
    "cerebras": _models_adapter("cerebras"),
    "groq": _models_adapter("groq"),
    "fireworks": _models_adapter("fireworks"),
    "together_gpu_clusters": _models_adapter("together_gpu_clusters"),
    "nvidia_api_catalog": Adapter(validate=_nvidia_validate, inventory=_nvidia_inventory),
    "sambanova": Adapter(validate=_sambanova_validate, inventory=_sambanova_inventory),
    "nvidia_ngc": Adapter(validate=_ngc_validate, inventory=_no_inventory),
}
