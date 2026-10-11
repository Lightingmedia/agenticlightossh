"""Microsoft Azure: client-credentials token -> Azure Resource Manager (subscription + GPU virtual machines)."""
from __future__ import annotations

import re
from typing import List, Optional
from urllib.parse import quote, urlsplit

from ..http import ProviderError
from .base import Adapter, AdapterContext, Creds, Item, Validation, make_item, need

_TENANT = re.compile(r"^[0-9A-Za-z.\-]{1,255}$")  # GUID or verified domain
_GUID = re.compile(r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")
_ARM = "https://management.azure.com"


def _ids(creds: Creds):
    tenant, subscription = need(creds, "tenantId", "subscriptionId")
    if not _TENANT.match(tenant):
        raise ProviderError("The tenant ID is not valid")
    if not _GUID.match(subscription):
        raise ProviderError("The subscription ID must be a GUID")
    return quote(tenant, safe=""), quote(subscription, safe="")


async def _token(ctx: AdapterContext, creds: Creds) -> str:
    tenant, _subscription = _ids(creds)
    client_id, client_secret = need(creds, "clientId", "clientSecret")
    response = await ctx.http.request(
        "POST",
        f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token",
        data={"grant_type": "client_credentials", "client_id": client_id, "client_secret": client_secret, "scope": f"{_ARM}/.default"},
    )
    token = (response.json or {}).get("access_token")
    if not token:
        raise ProviderError("Azure did not return an access token")
    return token


def _accelerator(size: str) -> str:
    s = size.upper()
    for needle, label in (("GB200", "GB200"), ("H200", "H200"), ("H100", "H100"), ("MI300X", "MI300X"), ("A100", "A100"), ("A10", "A10"), ("T4", "T4")):
        if needle in s:
            return label
    return "NVIDIA (N-series)"


async def validate(ctx: AdapterContext, creds: Creds) -> Validation:
    _tenant, subscription = _ids(creds)
    token = await _token(ctx, creds)
    info = await ctx.http.get_json(f"{_ARM}/subscriptions/{subscription}?api-version=2022-12-01", {"Authorization": f"Bearer {token}"}) or {}
    return Validation(f"{info.get('displayName') or creds['subscriptionId']} ({info.get('state') or 'unknown state'})")


async def inventory(ctx: AdapterContext, creds: Creds) -> List[Item]:
    _tenant, subscription = _ids(creds)
    token = await _token(ctx, creds)
    auth = {"Authorization": f"Bearer {token}"}
    items: List[Item] = []
    url: Optional[str] = f"{_ARM}/subscriptions/{subscription}/providers/Microsoft.Compute/virtualMachines?api-version=2024-07-01"
    for _ in range(10):
        if not url:
            break
        data = await ctx.http.get_json(url, auth) or {}
        for vm in data.get("value") or []:
            size = ((vm.get("properties") or {}).get("hardwareProfile") or {}).get("vmSize") or ""
            if not re.match(r"^Standard_N", size, re.I):
                continue
            items.append(
                make_item("instance", vm.get("id"), vm.get("name"), accelerator=_accelerator(size), region=vm.get("location"), status=(vm.get("properties") or {}).get("provisioningState"))
            )
        next_link = data.get("nextLink")
        # Only ever follow pagination links that stay on Azure Resource Manager.
        url = next_link if next_link and urlsplit(next_link).hostname == "management.azure.com" else None
    return items


ADAPTER = Adapter(validate=validate, inventory=inventory)
