"""GPU clouds with plain REST APIs: Lambda, RunPod (API v2), Vast.ai, DigitalOcean GPU Droplets and Crusoe (HMAC-signed).

Field names that the providers' docs do not pin down are read defensively (several alternatives, ignore what is
absent); they should be confirmed against a real account response.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from urllib.parse import quote

from ..http import ProviderError
from .base import Adapter, AdapterContext, Creds, Item, Validation, make_item, need


def _bearer(token: str) -> Dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


# ─── Lambda ───────────────────────────────────────────────────────────────────

_LAMBDA = "https://cloud.lambda.ai/api/v1"


async def _lambda_validate(ctx: AdapterContext, creds: Creds) -> Validation:
    (key,) = need(creds, "apiKey")
    data = await ctx.http.get_json(f"{_LAMBDA}/instances", _bearer(key)) or {}
    return Validation(f"Lambda account ({len(data.get('data') or [])} instances)")


async def _lambda_inventory(ctx: AdapterContext, creds: Creds) -> List[Item]:
    (key,) = need(creds, "apiKey")
    auth = _bearer(key)
    instances = await ctx.http.get_json(f"{_LAMBDA}/instances", auth) or {}
    try:
        types = await ctx.http.get_json(f"{_LAMBDA}/instance-types", auth) or {}
    except ProviderError:
        types = {}
    items: List[Item] = []
    for instance in instances.get("data") or []:
        itype = instance.get("instance_type") or {}
        items.append(
            make_item(
                "instance",
                instance.get("id"),
                instance.get("name") or itype.get("name"),
                accelerator=itype.get("gpu_description") or itype.get("description"),
                count=(itype.get("specs") or {}).get("gpus"),
                region=(instance.get("region") or {}).get("name"),
                status=instance.get("status"),
            )
        )
    for entry in (types.get("data") or {}).values():
        regions = entry.get("regions_with_capacity_available") or []
        if not regions:
            continue
        itype = entry.get("instance_type") or {}
        cents = itype.get("price_cents_per_hour")
        items.append(
            make_item(
                "offer",
                itype.get("name"),
                itype.get("name"),
                accelerator=itype.get("gpu_description") or itype.get("description"),
                count=(itype.get("specs") or {}).get("gpus"),
                region=", ".join(str(r.get("name")) for r in regions),
                price=cents / 100 if isinstance(cents, (int, float)) else None,
            )
        )
    return items


LAMBDA = Adapter(validate=_lambda_validate, inventory=_lambda_inventory)


# ─── RunPod (REST API v2) ─────────────────────────────────────────────────────

_RUNPOD = "https://api.runpod.io/v2"


def _runpod_pods(data: Any) -> List[Dict[str, Any]]:
    # v2 wraps the list ({"pods": [...]}); v1 returned a bare array.
    return (data.get("pods") if isinstance(data, dict) else data) or []


async def _runpod_validate(ctx: AdapterContext, creds: Creds) -> Validation:
    (key,) = need(creds, "apiKey")
    pods = _runpod_pods(await ctx.http.get_json(f"{_RUNPOD}/pods", _bearer(key)))
    return Validation(f"RunPod account ({len(pods)} pods)")


async def _runpod_inventory(ctx: AdapterContext, creds: Creds) -> List[Item]:
    (key,) = need(creds, "apiKey")
    auth = _bearer(key)
    pods = _runpod_pods(await ctx.http.get_json(f"{_RUNPOD}/pods", auth))
    try:
        catalog = await ctx.http.get_json(f"{_RUNPOD}/catalog/gpus", auth)
    except ProviderError:
        catalog = None
    gpus = catalog if isinstance(catalog, list) else ((catalog or {}).get("gpus") or (catalog or {}).get("data") or [])
    items: List[Item] = []
    for pod in pods:
        gpu, machine = pod.get("gpu") or {}, pod.get("machine") or {}
        items.append(
            make_item(
                "instance",
                pod.get("id"),
                pod.get("name") or pod.get("id"),
                accelerator=gpu.get("displayName") or pod.get("gpuTypeId") or machine.get("gpuTypeId"),
                count=pod.get("gpuCount") or gpu.get("count"),
                region=pod.get("dataCenterId") or machine.get("dataCenterId"),
                status=pod.get("desiredStatus") or pod.get("status"),
                price=pod.get("costPerHr") or pod.get("adjustedCostPerHr"),
            )
        )
    for gpu in gpus[:200]:
        gpu_id = gpu.get("id") or gpu.get("gpuTypeId")
        items.append(
            make_item(
                "offer",
                gpu_id,
                gpu.get("displayName") or gpu_id,
                accelerator=gpu.get("displayName") or gpu_id,
                price=gpu.get("securePrice") or gpu.get("communityPrice") or gpu.get("price"),
            )
        )
    return items


RUNPOD = Adapter(validate=_runpod_validate, inventory=_runpod_inventory)


# ─── Vast.ai ──────────────────────────────────────────────────────────────────

_VAST = "https://console.vast.ai/api/v0"


async def _vast_validate(ctx: AdapterContext, creds: Creds) -> Validation:
    (key,) = need(creds, "apiKey")
    user = await ctx.http.get_json(f"{_VAST}/users/current/", _bearer(key)) or {}
    return Validation(user.get("email") or user.get("username") or f"user {user.get('id', '')}".strip())


async def _vast_inventory(ctx: AdapterContext, creds: Creds) -> List[Item]:
    (key,) = need(creds, "apiKey")
    data = await ctx.http.get_json(f"{_VAST}/instances/", _bearer(key)) or {}
    return [
        make_item(
            "instance",
            i.get("id"),
            i.get("label") or f"vast-{i.get('id')}",
            accelerator=i.get("gpu_name"),
            count=i.get("num_gpus"),
            region=i.get("geolocation"),
            status=i.get("actual_status"),
            price=i.get("dph_total"),
        )
        for i in data.get("instances") or []
    ]


VAST = Adapter(validate=_vast_validate, inventory=_vast_inventory)


# ─── DigitalOcean GPU Droplets ────────────────────────────────────────────────

_DO = "https://api.digitalocean.com/v2"


async def _do_validate(ctx: AdapterContext, creds: Creds) -> Validation:
    (token,) = need(creds, "token")
    data = await ctx.http.get_json(f"{_DO}/account", _bearer(token)) or {}
    return Validation((data.get("account") or {}).get("email") or "DigitalOcean account")


async def _do_inventory(ctx: AdapterContext, creds: Creds) -> List[Item]:
    (token,) = need(creds, "token")
    data = await ctx.http.get_json(f"{_DO}/droplets?per_page=200", _bearer(token)) or {}
    items: List[Item] = []
    for droplet in data.get("droplets") or []:
        if not str(droplet.get("size_slug") or "").startswith("gpu-"):
            continue
        gpu = droplet.get("gpu_info") or {}
        items.append(
            make_item(
                "instance",
                droplet.get("id"),
                droplet.get("name"),
                accelerator=gpu.get("model") or droplet.get("size_slug"),
                count=gpu.get("count"),
                region=(droplet.get("region") or {}).get("slug"),
                status=droplet.get("status"),
                price=(droplet.get("size") or {}).get("price_hourly"),
            )
        )
    return items


DIGITALOCEAN = Adapter(validate=_do_validate, inventory=_do_inventory)


# ─── Crusoe Cloud (HMAC-signed requests) ──────────────────────────────────────

_CRUSOE = "https://api.cloud.crusoe.ai"


def _b64url_decode(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def _crusoe_headers(creds: Creds, path: str, query: Optional[Dict[str, str]] = None) -> Dict[str, str]:
    access_key, secret = need(creds, "accessKeyId", "secretKey")
    try:
        key = _b64url_decode(secret.strip())
    except Exception as exc:  # noqa: BLE001
        raise ProviderError("The Crusoe secret key is not valid base64url") from exc
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    query = query or {}
    canonical_query = "&".join(f"{quote(k, safe='')}={quote(query[k], safe='')}" for k in sorted(query))
    payload = f"{path}\n{canonical_query}\nGET\n{timestamp}\n"
    signature = base64.urlsafe_b64encode(hmac.new(key, payload.encode("utf-8"), hashlib.sha256).digest()).rstrip(b"=").decode("ascii")
    return {"X-Crusoe-Timestamp": timestamp, "Authorization": f"Bearer 1.0:{access_key}:{signature}"}


async def _crusoe_get(ctx: AdapterContext, creds: Creds, path: str) -> Any:
    return await ctx.http.get_json(f"{_CRUSOE}{path}", _crusoe_headers(creds, path))


async def _crusoe_validate(ctx: AdapterContext, creds: Creds) -> Validation:
    await _crusoe_get(ctx, creds, "/v1/capacities")
    return Validation(f"Crusoe key …{creds['accessKeyId'][-4:]}")


async def _crusoe_inventory(ctx: AdapterContext, creds: Creds) -> List[Item]:
    data = await _crusoe_get(ctx, creds, "/v1/capacities")
    rows = data if isinstance(data, list) else ((data or {}).get("items") or (data or {}).get("capacities") or [])
    items: List[Item] = []
    for row in rows:
        product = row.get("type") or row.get("product_name")
        quantity = row.get("quantity")
        items.append(
            make_item(
                "offer",
                f"{product}@{row.get('location')}",
                product,
                accelerator=product,
                region=row.get("location"),
                status=f"{quantity} available" if quantity is not None else None,
            )
        )
    return items


CRUSOE = Adapter(validate=_crusoe_validate, inventory=_crusoe_inventory)
