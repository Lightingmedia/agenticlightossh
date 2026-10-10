"""Kubernetes (CoreWeave CKS and any other cluster): ServiceAccount bearer token against the API server.

The API server URL is supplied by the user, so every request goes through the SSRF guard (``public_only``): https
only, public addresses only, connection pinned to the address that was checked. Clusters behind private addresses
should be enrolled through the Aurora gateway / node enrollment instead (or set PROVIDERS_ALLOW_PRIVATE_HOSTS=1 on a
trusted deployment).
"""
from __future__ import annotations

from typing import List, Optional
from urllib.parse import quote

from ..http import ProviderError
from .base import Adapter, AdapterContext, Creds, Item, Validation, make_item, need

_GPU_RESOURCES = ("nvidia.com/gpu", "amd.com/gpu", "gpu.intel.com/xe")


def _server(creds: Creds) -> str:
    (url,) = need(creds, "apiServer")
    return url.strip().rstrip("/")


def _auth(creds: Creds) -> dict:
    (token,) = need(creds, "token")
    return {"Authorization": f"Bearer {token}", "Accept": "application/json"}


async def validate(ctx: AdapterContext, creds: Creds) -> Validation:
    base, headers = _server(creds), _auth(creds)
    try:
        response = await ctx.http.request(
            "POST",
            f"{base}/apis/authentication.k8s.io/v1/selfsubjectreviews",
            headers={**headers, "Content-Type": "application/json"},
            json_body={"apiVersion": "authentication.k8s.io/v1", "kind": "SelfSubjectReview"},
            public_only=True,
        )
        user = ((response.json or {}).get("status") or {}).get("userInfo") or {}
        return Validation(user.get("username") or "authenticated")
    except ProviderError as error:
        if error.status != 404:
            raise
    # Clusters older than 1.28 have no SelfSubjectReview: a successful read proves the token works.
    await ctx.http.get_json(f"{base}/api/v1/nodes?limit=1", headers, public_only=True)
    return Validation("token accepted (cluster < 1.28)")


def _gpu_count(capacity: dict) -> int:
    for resource in _GPU_RESOURCES:
        try:
            count = int(capacity.get(resource) or 0)
        except (TypeError, ValueError):
            continue
        if count:
            return count
    return 0


async def inventory(ctx: AdapterContext, creds: Creds) -> List[Item]:
    base, headers = _server(creds), _auth(creds)
    items: List[Item] = []
    token: Optional[str] = None
    for _ in range(10):
        url = f"{base}/api/v1/nodes?limit=500" + (f"&continue={quote(token, safe='')}" if token else "")
        data = await ctx.http.get_json(url, headers, public_only=True) or {}
        for node in data.get("items") or []:
            status, metadata = node.get("status") or {}, node.get("metadata") or {}
            capacity, labels = status.get("capacity") or {}, metadata.get("labels") or {}
            count = _gpu_count(capacity)
            if not count:
                continue
            ready = any(c.get("type") == "Ready" and c.get("status") == "True" for c in status.get("conditions") or [])
            accelerator = (
                labels.get("nvidia.com/gpu.product")
                or labels.get("gpu.nvidia.com/class")
                or labels.get("amd.com/gpu.product-name")
                or next((k for k in capacity if k.endswith("/gpu")), None)
            )
            items.append(
                make_item(
                    "node",
                    metadata.get("uid"),
                    metadata.get("name"),
                    accelerator=accelerator,
                    count=count,
                    region=labels.get("topology.kubernetes.io/region") or labels.get("topology.kubernetes.io/zone"),
                    status="Ready" if ready else "NotReady",
                )
            )
        token = (data.get("metadata") or {}).get("continue")
        if not token:
            break
    return items


ADAPTER = Adapter(validate=validate, inventory=inventory)
