"""Oracle Cloud Infrastructure: RSA-signed requests (draft-cavage HTTP signatures) to the Identity and Core APIs.

The merged TypeScript catalog delegates OCI to the Aurora runtime gateway; this backend signs the (read-only GET)
requests itself, so it works without one. Only the root compartment (the tenancy) is searched for instances.
"""
from __future__ import annotations

import base64
import hashlib
import re
from email.utils import formatdate
from typing import Dict, List, Optional, Tuple
from urllib.parse import quote, urlsplit

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat, load_pem_private_key

from ..http import ProviderError
from .base import Adapter, AdapterContext, Creds, Item, Validation, make_item, need

_REGION = re.compile(r"^[a-z]{2}-[a-z]+-\d$")  # us-ashburn-1, uk-london-1, ...
_OCID = re.compile(r"^ocid1\.[A-Za-z0-9._\-]{5,200}$")
_FINGERPRINT = re.compile(r"^(?:[0-9a-fA-F]{2}:){15}[0-9a-fA-F]{2}$")
_LEGACY_GPU = {"GPU2": "P100", "GPU3": "V100", "GPU4": "A100"}


class _Signer:
    def __init__(self, creds: Creds):
        tenancy, user, fingerprint, pem = need(creds, "tenancyOcid", "userOcid", "fingerprint", "privateKeyPem")
        if not (_OCID.match(tenancy) and _OCID.match(user)):
            raise ProviderError("The tenancy / user OCID is not valid")
        if not _FINGERPRINT.match(fingerprint):
            raise ProviderError("The key fingerprint must look like aa:bb:cc:... (16 hex pairs)")
        try:
            key = load_pem_private_key(pem.encode("utf-8"), password=None)
        except (ValueError, TypeError) as exc:
            raise ProviderError("The private key could not be read (it must be an unencrypted RSA PEM key)") from exc
        if not isinstance(key, rsa.RSAPrivateKey):
            raise ProviderError("The private key must be an RSA key")
        public_der = key.public_key().public_bytes(Encoding.DER, PublicFormat.SubjectPublicKeyInfo)
        actual = hashlib.md5(public_der, usedforsecurity=False).hexdigest()  # noqa: S324 - OCI defines fingerprints as MD5
        if actual != fingerprint.replace(":", "").lower():
            raise ProviderError("The private key does not match the fingerprint")
        self.tenancy, self.user, self._key = tenancy, user, key
        self.key_id = f"{tenancy}/{user}/{fingerprint}"

    def headers(self, url: str) -> Dict[str, str]:
        parts = urlsplit(url)
        target = parts.path + (f"?{parts.query}" if parts.query else "")
        date = formatdate(usegmt=True)
        signing_string = "\n".join([f"date: {date}", f"(request-target): get {target}", f"host: {parts.hostname}"])
        signature = base64.b64encode(self._key.sign(signing_string.encode("utf-8"), padding.PKCS1v15(), hashes.SHA256())).decode("ascii")
        return {
            "date": date,
            "Accept": "application/json",
            "Authorization": (
                f'Signature version="1",keyId="{self.key_id}",algorithm="rsa-sha256",'
                f'headers="date (request-target) host",signature="{signature}"'
            ),
        }


def _region(creds: Creds) -> str:
    (region,) = need(creds, "region")
    region = region.strip()
    if not _REGION.match(region):
        raise ProviderError("The OCI region is not valid (expected something like us-ashburn-1)")
    return region


async def validate(ctx: AdapterContext, creds: Creds) -> Validation:
    region = _region(creds)
    signer = _Signer(creds)
    url = f"https://identity.{region}.oraclecloud.com/20160918/users/{quote(signer.user, safe='')}"
    user = await ctx.http.get_json(url, signer.headers(url)) or {}
    return Validation(f"OCI user {user.get('name') or user.get('email') or signer.user}")


def shape_accelerator(shape: str) -> Tuple[Optional[str], Optional[int]]:
    """BM.GPU.H100.8 -> (H100, 8); VM.GPU.A10.2 -> (A10, 2); BM.GPU4.8 -> (A100, 8); BM.GPU.A100-v2.8 -> (A100-v2, 8)."""
    parts = shape.split(".")
    if len(parts) < 3 or not parts[1].upper().startswith("GPU"):
        return None, None
    count = int(parts[-1]) if parts[-1].isdigit() else None
    generation = parts[1].upper()
    if generation in _LEGACY_GPU:
        return _LEGACY_GPU[generation], count
    return (parts[2] if len(parts) >= 4 else generation), count


async def inventory(ctx: AdapterContext, creds: Creds) -> List[Item]:
    region = _region(creds)
    signer = _Signer(creds)
    items: List[Item] = []
    page: Optional[str] = None
    for _ in range(5):
        url = f"https://iaas.{region}.oraclecloud.com/20160918/instances?compartmentId={quote(signer.tenancy, safe='')}&limit=200"
        if page:
            url += f"&page={quote(page, safe='')}"
        response = await ctx.http.request("GET", url, headers=signer.headers(url))
        for instance in response.json or []:
            shape = str(instance.get("shape") or "")
            if "GPU" not in shape.upper():
                continue
            model, count = shape_accelerator(shape)
            items.append(
                make_item("instance", instance.get("id"), instance.get("displayName"), accelerator=model or shape, count=count, region=instance.get("availabilityDomain") or instance.get("region") or region, status=instance.get("lifecycleState"))
            )
        page = response.headers.get("opc-next-page")
        if not page:
            break
    return items


ADAPTER = Adapter(validate=validate, inventory=inventory)
