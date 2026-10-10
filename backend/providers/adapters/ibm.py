"""IBM Cloud: IAM API key -> access token (IAM identity service) -> VPC infrastructure (GPU instance profiles).

The merged TypeScript catalog delegates IBM to the Aurora runtime gateway; this backend validates it directly, so it
works without one.
"""
from __future__ import annotations

import base64
import json
import re
from typing import Any, Dict, List, Optional
from urllib.parse import urlsplit

from ..http import ProviderError
from .base import Adapter, AdapterContext, Creds, Item, Validation, make_item, need

_IAM = "https://iam.cloud.ibm.com/identity/token"
_API_VERSION = "2025-06-10"
_REGION = re.compile(r"^[a-z]{2}-[a-z]{2,6}$")  # us-south, eu-de, jp-tok, ...
# Profile names end in <gpu count><gpu model>: gx3-64x320x4l4 -> 4x L4, gx3d-160x1792x8h100 -> 8x H100, gx2-8x64x1v100 -> 1x V100
_PROFILE_GPUS = re.compile(r"(?P<count>\d+)(?P<model>[a-z]+\d*[a-z]*\d*)", re.I)


def _region(creds: Creds) -> str:
    region = (creds.get("region") or "us-south").strip()
    if not _REGION.match(region):
        raise ProviderError("The IBM Cloud region is not valid (expected something like us-south)")
    return region


async def _token(ctx: AdapterContext, creds: Creds) -> str:
    (api_key,) = need(creds, "apiKey")
    response = await ctx.http.request(
        "POST",
        _IAM,
        headers={"Accept": "application/json"},
        data={"grant_type": "urn:ibm:params:oauth:grant-type:apikey", "apikey": api_key},
    )
    token = (response.json or {}).get("access_token")
    if not token:
        raise ProviderError("IBM Cloud did not return an access token")
    return token


def _claims(token: str) -> Dict[str, Any]:
    try:
        payload = token.split(".")[1]
        return json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
    except Exception:  # noqa: BLE001 - claims are informational only
        return {}


def _instances_url(region: str, limit: int) -> str:
    return f"https://{region}.iaas.cloud.ibm.com/v1/instances?version={_API_VERSION}&generation=2&limit={limit}"


async def validate(ctx: AdapterContext, creds: Creds) -> Validation:
    region = _region(creds)
    token = await _token(ctx, creds)
    # A cheap VPC read proves the key also has the Viewer role on VPC Infrastructure the inventory needs.
    await ctx.http.get_json(_instances_url(region, 1), {"Authorization": f"Bearer {token}"})
    claims = _claims(token)
    who = claims.get("name") or claims.get("email") or claims.get("iam_id") or claims.get("sub")
    return Validation(f"IBM Cloud {who}" if who else "IBM Cloud API key accepted")


def _accelerator(instance: Dict[str, Any]):
    gpu = instance.get("gpu") if isinstance(instance.get("gpu"), dict) else {}
    profile = (instance.get("profile") or {}).get("name") or ""
    if gpu.get("model") or gpu.get("count"):
        return gpu.get("model"), gpu.get("count")
    match = _PROFILE_GPUS.fullmatch(profile.rsplit("x", 1)[-1])  # the last "x"-separated part holds count + model
    return (match.group("model").upper(), int(match.group("count"))) if match else (None, None)


async def inventory(ctx: AdapterContext, creds: Creds) -> List[Item]:
    region = _region(creds)
    token = await _token(ctx, creds)
    auth = {"Authorization": f"Bearer {token}"}
    items: List[Item] = []
    url: Optional[str] = _instances_url(region, 100)
    for _ in range(5):
        if not url:
            break
        data = await ctx.http.get_json(url, auth) or {}
        for instance in data.get("instances") or []:
            profile = (instance.get("profile") or {}).get("name") or ""
            if not profile.startswith("gx"):  # GPU profile families: gx2, gx3, gx3d, ...
                continue
            model, count = _accelerator(instance)
            items.append(
                make_item("instance", instance.get("id"), instance.get("name"), accelerator=model or profile, count=count, region=(instance.get("zone") or {}).get("name"), status=instance.get("status"))
            )
        next_href = (data.get("next") or {}).get("href")
        url = next_href if next_href and (urlsplit(next_href).hostname or "").endswith(".iaas.cloud.ibm.com") else None
    return items


ADAPTER = Adapter(validate=validate, inventory=inventory)
