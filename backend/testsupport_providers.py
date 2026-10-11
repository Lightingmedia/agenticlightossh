"""Shared fakes for the provider-service tests (not a test module)."""
from __future__ import annotations

from typing import Any, List, Optional, Tuple
from urllib.parse import urlsplit

import httpx

from providers.adapters.base import Adapter, AdapterContext, Validation
from providers.http import Http, ProviderError
from providers.settings import Settings

PUBLIC_IP = "93.184.216.34"


async def public_resolver(host: str, port: int) -> List[str]:
    return [PUBLIC_IP]


class FakeInternet:
    """Routes mocked provider calls and records every request.

    ``on(method, "https://host[:port]/path-prefix", response)`` matches on the method, the ``Host`` header (so it also
    matches connections pinned to an IP by the SSRF guard) and a path prefix. ``response`` is an ``httpx.Response``, a
    JSON-able body (200), a ``(status, body)`` tuple, or a callable taking the request. Unrouted requests fail the test.
    """

    def __init__(self) -> None:
        self._routes: List[Tuple[str, str, str, Any]] = []
        self.requests: List[httpx.Request] = []

    def on(self, method: str, url: str, response: Any) -> "FakeInternet":
        parts = urlsplit(url)
        self._routes.append((method.upper(), parts.netloc, parts.path + (f"?{parts.query}" if parts.query else ""), response))
        return self

    def __call__(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        host = request.headers.get("host") or request.url.host
        target = request.url.raw_path.decode()
        for method, netloc, prefix, response in self._routes:
            if request.method == method and host == netloc and target.startswith(prefix):
                if callable(response):
                    return response(request)
                if isinstance(response, httpx.Response):
                    return response
                if isinstance(response, tuple):
                    status, body = response
                    return _respond(status, body)
                return _respond(200, response)
        raise AssertionError(f"unexpected request: {request.method} {request.url} (Host: {host})")

    def http(self, **kwargs: Any) -> Http:
        return Http(transport=httpx.MockTransport(self), resolver=public_resolver, **kwargs)

    def ctx(self, settings: Optional[Settings] = None, **http_kwargs: Any) -> AdapterContext:
        return AdapterContext(http=self.http(**http_kwargs), settings=settings or Settings())

    def calls(self, host: str, path_prefix: str = "") -> List[httpx.Request]:
        return [r for r in self.requests if (r.headers.get("host") or r.url.host) == host and r.url.path.startswith(path_prefix)]


def _respond(status: int, body: Any) -> httpx.Response:
    if isinstance(body, (dict, list)):
        return httpx.Response(status, json=body)
    return httpx.Response(status, text=str(body))


def form(request: httpx.Request) -> dict:
    """Decode an application/x-www-form-urlencoded request body."""
    from urllib.parse import parse_qsl

    return dict(parse_qsl(request.content.decode(), keep_blank_values=True))


class FakeAdapter:
    """Scriptable adapter that records the credentials it was called with."""

    def __init__(self, identity: str = "acct-1", message: Optional[str] = None, error: Optional[str] = None, boom: bool = False, items: Optional[List[dict]] = None, inventory_error: Optional[str] = None):
        self.identity, self.message, self.error, self.boom = identity, message, error, boom
        self.items = items if items is not None else [{"kind": "instance", "id": "i-1", "name": "gpu", "accelerator": "H100"}]
        self.inventory_error = inventory_error
        self.validate_calls: List[dict] = []
        self.inventory_calls: List[dict] = []

    async def _validate(self, ctx, creds):
        self.validate_calls.append(dict(creds))
        if self.boom:
            raise KeyError("unexpected provider response shape")
        if self.error:
            raise ProviderError(self.error, 401)
        return Validation(self.identity, self.message)

    async def _inventory(self, ctx, creds):
        self.inventory_calls.append(dict(creds))
        if self.boom:
            raise KeyError("unexpected provider response shape")
        if self.inventory_error:
            raise ProviderError(self.inventory_error, 500)
        return self.items

    @property
    def adapter(self) -> Adapter:
        return Adapter(validate=self._validate, inventory=self._inventory)
