"""Google Cloud: service-account JWT -> read-only access token -> Compute Engine (GPU VMs) and Cloud TPU nodes."""
from __future__ import annotations

import base64
import json
import re
import time
from typing import List, Optional, Tuple
from urllib.parse import quote

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.primitives.serialization import load_pem_private_key

from ..http import ProviderError
from .base import Adapter, AdapterContext, Creds, Item, Validation, make_item, need

_TOKEN_URL = "https://oauth2.googleapis.com/token"
_SCOPE = "https://www.googleapis.com/auth/cloud-platform.read-only"
# Project IDs are 6-30 chars (lowercase letters, digits, hyphens; start with a letter; no trailing hyphen); legacy
# domain-scoped projects look like example.com:my-project. The ID is interpolated into URL paths, so be strict.
_PROJECT_ID = r"[a-z][a-z0-9\-]{4,28}[a-z0-9]"
_PROJECT = re.compile(rf"^(?:{_PROJECT_ID}|[a-z0-9.\-]{{1,100}}:{_PROJECT_ID})$")


def _b64url(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _compact(obj: dict) -> bytes:
    return json.dumps(obj, separators=(",", ":")).encode("utf-8")


def _project(creds: Creds) -> str:
    (project,) = need(creds, "projectId")
    if not _PROJECT.match(project):
        raise ProviderError("The project ID is not valid")
    return quote(project, safe="")


async def _token(ctx: AdapterContext, creds: Creds) -> Tuple[str, str]:
    (raw,) = need(creds, "serviceAccountJson")
    try:
        account = json.loads(raw)
    except ValueError as exc:
        raise ProviderError("Service account key is not valid JSON") from exc
    email, pem = account.get("client_email"), account.get("private_key")
    if not email or not pem:
        raise ProviderError("Service account key is missing client_email or private_key")
    try:
        key = load_pem_private_key(pem.encode("utf-8"), password=None)
    except (ValueError, TypeError) as exc:
        raise ProviderError("The service account private key could not be read") from exc
    if not isinstance(key, rsa.RSAPrivateKey):
        raise ProviderError("The service account private key must be an RSA key")
    now = int(time.time())
    signing_input = (
        _b64url(_compact({"alg": "RS256", "typ": "JWT"}))
        + "."
        + _b64url(_compact({"iss": email, "aud": _TOKEN_URL, "iat": now, "exp": now + 600, "scope": _SCOPE}))
    )
    signature = key.sign(signing_input.encode("ascii"), padding.PKCS1v15(), hashes.SHA256())
    response = await ctx.http.request(
        "POST",
        _TOKEN_URL,
        data={"grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer", "assertion": f"{signing_input}.{_b64url(signature)}"},
    )
    token = (response.json or {}).get("access_token")
    if not token:
        raise ProviderError("Google did not return an access token")
    return token, email


async def validate(ctx: AdapterContext, creds: Creds) -> Validation:
    project = _project(creds)
    token, email = await _token(ctx, creds)
    info = await ctx.http.get_json(f"https://compute.googleapis.com/compute/v1/projects/{project}", {"Authorization": f"Bearer {token}"})
    return Validation(f"{email} → {(info or {}).get('name') or creds['projectId']}")


def _builtin_accelerator(machine: str) -> Optional[str]:
    if machine.startswith("a4"):
        return "B200"
    if machine.startswith("a3-ultra"):
        return "H200"
    if machine.startswith("a3"):
        return "H100"
    if machine.startswith("a2"):
        return "A100"
    if machine.startswith("g2"):
        return "L4"
    return None


async def inventory(ctx: AdapterContext, creds: Creds) -> List[Item]:
    project = _project(creds)
    token, _email = await _token(ctx, creds)
    auth = {"Authorization": f"Bearer {token}"}
    items: List[Item] = []

    page_token: Optional[str] = None
    for _ in range(5):
        url = f"https://compute.googleapis.com/compute/v1/projects/{project}/aggregated/instances?maxResults=500"
        if page_token:
            url += f"&pageToken={quote(page_token, safe='')}"
        data = await ctx.http.get_json(url, auth) or {}
        for zone_key, scoped in (data.get("items") or {}).items():
            for vm in (scoped or {}).get("instances") or []:
                machine = str(vm.get("machineType") or "").rsplit("/", 1)[-1]
                accelerators = vm.get("guestAccelerators") or []
                attached = accelerators[0] if accelerators else None
                builtin = _builtin_accelerator(machine)
                if not attached and not builtin:
                    continue
                items.append(
                    make_item(
                        "instance",
                        vm.get("id"),
                        vm.get("name"),
                        accelerator=str(attached["acceleratorType"]).rsplit("/", 1)[-1] if attached else builtin,
                        count=attached.get("acceleratorCount") if attached else None,
                        region=zone_key.replace("zones/", ""),
                        status=vm.get("status"),
                    )
                )
        page_token = data.get("nextPageToken")
        if not page_token:
            break

    try:  # the TPU API is not enabled on every project
        tpu = await ctx.http.get_json(f"https://tpu.googleapis.com/v2/projects/{project}/locations/-/nodes", auth) or {}
        for node in tpu.get("nodes") or []:
            parts = str(node.get("name") or "").split("/")
            items.append(
                make_item("node", node.get("name"), parts[-1], accelerator=node.get("acceleratorType"), region=parts[3] if len(parts) > 3 else None, status=node.get("state"))
            )
    except ProviderError:
        pass
    return items


ADAPTER = Adapter(validate=validate, inventory=inventory)
