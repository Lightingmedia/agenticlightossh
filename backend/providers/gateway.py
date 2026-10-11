"""Client for the Aurora runtime gateway.

Providers this backend cannot validate itself (DGX Cloud Lepton, Nebius: no public REST contract to build on) are
handed to Aurora, which stays the single privileged authority. The contract, shared with the Supabase edge function:

* ``POST /v1/providers/validate``                  ``{connectionId, providerId, authMethod, credentials}`` -> ``{ok, identity?, message?}``
* ``POST /v1/providers/{connectionId}/inventory``  ``{providerId, authMethod, credentials}``               -> ``{items: [...]}``

Credentials travel over the bearer-authenticated HTTPS channel; the gateway must not log them.
"""
from __future__ import annotations

import logging
import uuid
from typing import Any, Optional, Protocol
from urllib.parse import urlsplit

from .http import Http
from .settings import Settings

log = logging.getLogger("lightos.providers.gateway")


class UserLike(Protocol):
    id: str
    email: Optional[str]


class Gateway:
    def __init__(self, base_url: str, token: str, http: Http):
        self._base = base_url.rstrip("/")
        self._token = token
        self._http = http

    @classmethod
    def from_settings(cls, settings: Settings, http: Http) -> Optional["Gateway"]:
        url, token = settings.gateway_url, settings.gateway_token
        if not url or not token:
            return None
        parts = urlsplit(url)
        local = parts.hostname in ("localhost", "127.0.0.1")
        if parts.scheme != "https" and not (local and parts.scheme == "http"):
            log.warning("LIGHTOS_RUNTIME_GATEWAY_URL must use https (http is only accepted for localhost); gateway disabled")
            return None
        return cls(url, token, http)

    async def fetch(self, path: str, user: UserLike, *, method: str = "GET", body: Any = None) -> Any:
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self._token}",
            "X-LightOS-User-ID": user.id,
            "X-LightOS-User-Email": user.email or "unknown",
            "X-Request-ID": str(uuid.uuid4()),
        }
        result = await self._http.request(method, f"{self._base}{path}", headers=headers, json_body=body)
        return result.json
