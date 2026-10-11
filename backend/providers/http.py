"""HTTP plumbing for the provider adapters.

Timeouts, bounded response bodies, error messages that never echo request headers or credentials, and an SSRF guard
for endpoints the *user* supplies (the Kubernetes API server): they must be https, must not carry credentials in the
URL, and must resolve to public addresses only. The connection is then pinned to the address that was checked (the
hostname stays in the ``Host`` header and in TLS SNI / certificate verification), so DNS rebinding between the check
and the request cannot redirect it. Redirects are never followed.
"""
from __future__ import annotations

import asyncio
import ipaddress
import json
import re
import socket
from dataclasses import dataclass
from typing import Any, Awaitable, Callable, Dict, List, Mapping, Optional
from urllib.parse import urlsplit, urlunsplit

import httpx

MAX_BODY_BYTES = 2_000_000
DEFAULT_TIMEOUT = 15.0


class ProviderError(Exception):
    """A provider call failed. ``message`` is safe to show to the user."""

    def __init__(self, message: str, status: Optional[int] = None):
        super().__init__(message)
        self.message = message
        self.status = status


@dataclass
class HttpResult:
    status: int
    text: str
    json: Any
    headers: Mapping[str, str]


Resolver = Callable[[str, int], Awaitable[List[str]]]


async def system_resolver(host: str, port: int) -> List[str]:
    loop = asyncio.get_running_loop()
    try:
        infos = await loop.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise ProviderError(f"Could not resolve {host}") from exc
    addresses: List[str] = []
    for _family, _type, _proto, _canon, sockaddr in sorted(infos, key=lambda i: i[0] != socket.AF_INET):  # IPv4 first
        if sockaddr[0] not in addresses:
            addresses.append(sockaddr[0])
    return addresses


def is_public_ip(ip: str) -> bool:
    try:
        address = ipaddress.ip_address(ip.split("%", 1)[0])
    except ValueError:
        return False
    if isinstance(address, ipaddress.IPv6Address) and address.ipv4_mapped is not None:
        address = address.ipv4_mapped
    return address.is_global


def _is_ip_literal(host: str) -> bool:
    try:
        ipaddress.ip_address(host)
    except ValueError:
        return False
    return True


def safe_host(url: str) -> str:
    try:
        return urlsplit(url).hostname or "provider"
    except ValueError:
        return "provider"


_WS = re.compile(r"\s+")


def describe(parsed: Any, text: str) -> str:
    """Pull the provider's own error message out of a failed response (kept short, whitespace collapsed)."""
    message: Optional[str] = None
    if isinstance(parsed, dict):
        error = parsed.get("error")
        status_block = parsed.get("requestStatus")
        errors = parsed.get("errors")
        candidates = [
            error.get("message") if isinstance(error, dict) else None,
            parsed.get("error_description"),
            parsed.get("message"),
            parsed.get("errorMessage"),  # IBM IAM
            parsed.get("msg"),  # Vast.ai
            status_block.get("statusDescription") if isinstance(status_block, dict) else None,  # NGC
            errors[0].get("message") if isinstance(errors, list) and errors and isinstance(errors[0], dict) else None,  # IBM VPC
            error if isinstance(error, str) else None,
            parsed.get("detail") if isinstance(parsed.get("detail"), str) else None,  # RFC 9457 (RunPod)
            parsed.get("title") if isinstance(parsed.get("title"), str) else None,
        ]
        message = next((c for c in candidates if isinstance(c, str) and c.strip()), None)
    if message is None:
        xml = re.search(r"<Message>(.*?)</Message>", text, re.S)  # AWS
        message = xml.group(1) if xml else None
    if not message:
        return ""
    return f": {_WS.sub(' ', message).strip()[:240]}"


def _try_json(text: str) -> Any:
    if not text:
        return None
    try:
        return json.loads(text)
    except ValueError:
        return None


class Http:
    """Thin wrapper over ``httpx`` shared by all adapters (swap ``transport`` in tests)."""

    def __init__(
        self,
        *,
        transport: Optional[httpx.AsyncBaseTransport] = None,
        timeout: float = DEFAULT_TIMEOUT,
        allow_private_hosts: bool = False,
        resolver: Resolver = system_resolver,
    ):
        self._transport = transport
        self._timeout = timeout
        self._allow_private_hosts = allow_private_hosts
        self._resolver = resolver

    async def request(
        self,
        method: str,
        url: str,
        *,
        headers: Optional[Mapping[str, str]] = None,
        data: Optional[Mapping[str, str]] = None,
        content: Optional[bytes] = None,
        json_body: Any = None,
        public_only: bool = False,
    ) -> HttpResult:
        shown = safe_host(url)
        request_headers: Dict[str, str] = dict(headers or {})
        extensions: Dict[str, Any] = {}
        if public_only:
            url, request_headers, extensions = await self._pin_public(url, request_headers)

        async def _send() -> HttpResult:
            async with httpx.AsyncClient(transport=self._transport, timeout=self._timeout, follow_redirects=False) as client:
                async with client.stream(
                    method, url, headers=request_headers, data=data, content=content, json=json_body, extensions=extensions
                ) as response:
                    body = await _read_limited(response, MAX_BODY_BYTES)
                    text = body.decode("utf-8", errors="replace")
                    return HttpResult(response.status_code, text, _try_json(text), dict(response.headers))

        try:
            result = await asyncio.wait_for(_send(), timeout=self._timeout * 2)
        except (httpx.TimeoutException, asyncio.TimeoutError) as exc:
            raise ProviderError(f"Timed out contacting {shown}") from exc
        except httpx.HTTPError as exc:
            raise ProviderError(f"Could not reach {shown}") from exc
        if not 200 <= result.status < 300:
            raise ProviderError(f"{shown} returned {result.status}{describe(result.json, result.text)}", result.status)
        return result

    async def get_json(self, url: str, headers: Optional[Mapping[str, str]] = None, **kwargs: Any) -> Any:
        merged = {"Accept": "application/json", **(headers or {})}
        return (await self.request("GET", url, headers=merged, **kwargs)).json

    async def _pin_public(self, url: str, headers: Dict[str, str]):
        parts = urlsplit(url)
        if parts.scheme != "https":
            raise ProviderError("Only https:// endpoints are allowed")
        if parts.username or parts.password:
            raise ProviderError("Credentials inside the endpoint URL are not allowed")
        host = parts.hostname
        if not host:
            raise ProviderError("The endpoint URL has no host")
        try:
            port = parts.port or 443
        except ValueError as exc:
            raise ProviderError("The endpoint URL has an invalid port") from exc
        addresses = await self._resolver(host, port)
        if not addresses:
            raise ProviderError(f"Could not resolve {host}")
        if not self._allow_private_hosts and not all(is_public_ip(a) for a in addresses):
            raise ProviderError("The endpoint resolves to a private or reserved address")
        ip = addresses[0]
        netloc = f"[{ip}]:{port}" if ":" in ip else f"{ip}:{port}"
        pinned = urlunsplit(("https", netloc, parts.path, parts.query, ""))
        pinned_headers = {**headers, "Host": host if port == 443 else f"{host}:{port}"}
        extensions = {} if _is_ip_literal(host) else {"sni_hostname": host}
        return pinned, pinned_headers, extensions


async def _read_limited(response: httpx.Response, limit: int) -> bytes:
    chunks: List[bytes] = []
    total = 0
    async for chunk in response.aiter_bytes():
        if total + len(chunk) > limit:
            chunks.append(chunk[: limit - total])
            break
        chunks.append(chunk)
        total += len(chunk)
    return b"".join(chunks)
