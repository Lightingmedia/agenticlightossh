"""AWS Signature Version 4 (header based).

Just enough SigV4 for the AWS adapter: STS and EC2 query-API calls, which are POSTs of a form-encoded body to ``/``.
The caller must send exactly the headers that were signed (``host`` is added by the HTTP client; ``Content-Type`` is
signed when passed in). Verified against botocore and AWS's published ``get-vanilla`` test vector in the test suite.
"""
from __future__ import annotations

import hashlib
import hmac
from datetime import datetime, timezone
from typing import Dict, Mapping, Optional
from urllib.parse import parse_qsl, quote, urlsplit

_UNRESERVED = "-_.~"


def _sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _hmac(key: bytes, message: str) -> bytes:
    return hmac.new(key, message.encode("utf-8"), hashlib.sha256).digest()


def _canonical_query(query: str) -> str:
    pairs = sorted((quote(k, safe=_UNRESERVED), quote(v, safe=_UNRESERVED)) for k, v in parse_qsl(query, keep_blank_values=True))
    return "&".join(f"{k}={v}" for k, v in pairs)


def sign_v4(
    *,
    method: str,
    url: str,
    access_key: str,
    secret_key: str,
    region: str,
    service: str,
    session_token: Optional[str] = None,
    headers: Optional[Mapping[str, str]] = None,
    body: bytes = b"",
    now: Optional[datetime] = None,
) -> Dict[str, str]:
    """Return the headers to add to the request: ``Authorization``, ``x-amz-date`` and, with temporary credentials,
    ``x-amz-security-token``."""
    parts = urlsplit(url)
    host = parts.hostname or ""
    if parts.port and parts.port not in (80, 443):
        host = f"{host}:{parts.port}"

    amz_date = (now or datetime.now(timezone.utc)).strftime("%Y%m%dT%H%M%SZ")
    day = amz_date[:8]

    signed: Dict[str, str] = {"host": host, "x-amz-date": amz_date}
    if session_token:
        signed["x-amz-security-token"] = session_token
    for name, value in (headers or {}).items():
        if name.lower() == "content-type":
            signed["content-type"] = " ".join(value.split())

    names = sorted(signed)
    canonical_headers = "".join(f"{name}:{signed[name]}\n" for name in names)
    signed_headers = ";".join(names)
    canonical_request = "\n".join(
        [
            method.upper(),
            quote(parts.path or "/", safe="/" + _UNRESERVED),
            _canonical_query(parts.query),
            canonical_headers,
            signed_headers,
            _sha256_hex(body),
        ]
    )

    scope = f"{day}/{region}/{service}/aws4_request"
    string_to_sign = "\n".join(["AWS4-HMAC-SHA256", amz_date, scope, _sha256_hex(canonical_request.encode("utf-8"))])
    key = _hmac(("AWS4" + secret_key).encode("utf-8"), day)
    for part in (region, service, "aws4_request"):
        key = _hmac(key, part)
    signature = hmac.new(key, string_to_sign.encode("utf-8"), hashlib.sha256).hexdigest()

    out = {
        "x-amz-date": amz_date,
        "Authorization": f"AWS4-HMAC-SHA256 Credential={access_key}/{scope}, SignedHeaders={signed_headers}, Signature={signature}",
    }
    if session_token:
        out["x-amz-security-token"] = session_token
    return out
