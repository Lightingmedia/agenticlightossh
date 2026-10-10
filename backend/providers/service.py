"""The provider service: connect, re-test, read inventory and disconnect, per user.

Behaviour matches the ``provider-connect`` Supabase edge function (same statuses, same error semantics), with the
credential stored encrypted in this backend's own database instead of Supabase Vault:

* ``connect`` validates the credentials against the provider *before* anything is stored; a failed validation stores
  nothing. Providers this backend cannot validate itself are handed to the Aurora runtime gateway; without one the
  connection is stored as ``awaiting_gateway``.
* Credentials are only ever decrypted in memory for a single call; they are never returned to clients and are scrubbed
  from any error text that might echo them.
"""
from __future__ import annotations

import json
import logging
import math
import re
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Mapping, Optional
from urllib.parse import quote

from starlette.concurrency import run_in_threadpool

from .adapters import ADAPTERS, Adapter, AdapterContext
from .catalog import PROVIDERS, get_auth_method, get_provider, split_credentials
from .db import Database, DuplicateLabelError, new_id, now_iso
from .gateway import Gateway
from .http import Http, ProviderError
from .ratelimit import RateLimiter
from .settings import Settings
from .vault import Vault, VaultError

log = logging.getLogger("lightos.providers")

_AWAITING_GATEWAY = "Credentials stored. Validation runs once your Aurora runtime gateway is connected."


@dataclass(frozen=True)
class User:
    id: str
    email: Optional[str] = None


class ApiError(Exception):
    """An error with an HTTP status and a JSON body (``{"error": ..., ...}``) for the client."""

    def __init__(self, http_status: int, message: str, headers: Optional[Dict[str, str]] = None, **extra: Any):
        super().__init__(message)
        self.status = http_status  # HTTP status; ``extra`` may itself carry a ``status`` field (e.g. "error") for the body
        self.body: Dict[str, Any] = {"error": message, **extra}
        self.headers = headers or {}


@dataclass
class Outcome:
    status: str  # connected | awaiting_gateway | error
    identity: Optional[str] = None
    message: Optional[str] = None


def effective_validation(provider: Mapping[str, Any], adapters: Mapping[str, Adapter] = ADAPTERS) -> str:
    """``direct`` when this backend validates the provider itself, ``gateway`` when Aurora must."""
    return "direct" if provider["id"] in adapters else "gateway"


def public_catalog(adapters: Mapping[str, Adapter] = ADAPTERS) -> List[Dict[str, Any]]:
    return [{**p, "validation": effective_validation(p, adapters)} for p in PROVIDERS]


_MASK_CHARS = "*•·…"  # what providers use to hide the middle of an echoed key: * • · …


def _scrub(message: str, secrets: Iterable[str]) -> str:
    """Remove credential values from provider error text before it is shown or stored.

    Some providers echo the key in full, others a masked form (``9c6eb7*****b5f7``). The whole value is always
    removed; for longer secrets the first six / last four characters are removed too, but only where they sit right
    next to mask characters, so ordinary words that happen to match a key prefix (``cloud.lambda.ai``) survive.
    """
    for secret in sorted(set(secrets), key=len, reverse=True):
        if len(secret) < 6:
            continue
        message = message.replace(secret, "***")
        if len(secret) >= 12:
            head, tail = re.escape(secret[:6]), re.escape(secret[-4:])
            message = re.sub(f"{head}(?=[{_MASK_CHARS}])", "***", message)
            message = re.sub(f"(?<=[{_MASK_CHARS}]){tail}", "***", message)
    return message[:400]


class ProviderService:
    def __init__(
        self,
        *,
        db: Database,
        vault: Vault,
        settings: Settings,
        http: Http,
        adapters: Optional[Mapping[str, Adapter]] = None,
        rate_limiter: Optional[RateLimiter] = None,
    ):
        self.db = db
        self.vault = vault
        self.settings = settings
        self.adapters = dict(ADAPTERS if adapters is None else adapters)
        self.ctx = AdapterContext(http=http, settings=settings)
        self.gateway = Gateway.from_settings(settings, http)
        self.limiter = rate_limiter or RateLimiter(settings.rate_limit_per_minute)

    # ── helpers ────────────────────────────────────────────────────────────────────────────────────────

    def gateway_state(self) -> str:
        return "configured" if self.gateway else "not_configured"

    def _throttle(self, user: User) -> None:
        wait = self.limiter.check(user.id)
        if wait > 0:
            seconds = max(1, math.ceil(wait))
            raise ApiError(429, f"Too many requests; try again in {seconds}s", headers={"Retry-After": str(seconds)})

    async def _audit(self, user: User, provider_id: str, action: str, ok: bool, message: Optional[str], connection_id: Optional[str] = None) -> None:
        try:
            await run_in_threadpool(
                self.db.add_event, user_id=user.id, provider_id=provider_id, action=action, ok=ok, message=message, connection_id=connection_id
            )
        except Exception:  # noqa: BLE001 - the audit trail must never break the request it describes
            log.exception("could not write provider audit event")

    async def _owned(self, user: User, connection_id: str) -> Dict[str, Any]:
        row = await run_in_threadpool(self.db.get_connection, user.id, connection_id)
        if row is None:
            raise ApiError(404, "Not found")
        return row

    def _decrypt(self, row: Mapping[str, Any]) -> Dict[str, str]:
        blob = row.get("secret_blob")
        if not blob:
            return {}
        try:
            return json.loads(self.vault.decrypt(blob, aad=row["id"]))
        except (VaultError, ValueError):
            log.error("stored credential for connection %s could not be decrypted (wrong or missing vault key?)", row["id"])
            raise ApiError(500, "Stored credential could not be read") from None

    async def _validate(
        self,
        user: User,
        provider: Mapping[str, Any],
        auth_method: str,
        creds: Dict[str, str],
        secrets: Iterable[str],
        connection_id: Optional[str],
    ) -> Outcome:
        secrets = list(secrets)
        adapter = self.adapters.get(provider["id"])
        if adapter is not None:
            try:
                verdict = await adapter.validate(self.ctx, creds)
            except ProviderError as error:
                return Outcome("error", message=_scrub(error.message, secrets))
            except Exception:  # noqa: BLE001 - e.g. an unexpected response shape; never leak internals
                log.exception("unexpected error validating %s", provider["id"])
                return Outcome("error", message="Unexpected response from the provider")
            return Outcome("connected", verdict.identity, verdict.message)
        if self.gateway is None:
            return Outcome("awaiting_gateway", message=_AWAITING_GATEWAY)
        try:
            reply = await self.gateway.fetch(
                "/v1/providers/validate",
                user,
                method="POST",
                body={"connectionId": connection_id, "providerId": provider["id"], "authMethod": auth_method, "credentials": creds},
            )
        except ProviderError as error:
            return Outcome("error", message=_scrub(error.message, secrets))
        if isinstance(reply, dict) and reply.get("ok"):
            return Outcome("connected", reply.get("identity"))
        message = str((reply or {}).get("message") or "Gateway rejected the credentials") if isinstance(reply, dict) else "Gateway rejected the credentials"
        return Outcome("error", message=_scrub(message, secrets))

    # ── operations ─────────────────────────────────────────────────────────────────────────────────────

    async def list_connections(self, user: User) -> Dict[str, Any]:
        return {"connections": await run_in_threadpool(self.db.list_connections, user.id), "gateway": self.gateway_state()}

    async def connect(self, user: User, provider_id: str, auth_method: str, label: str, credentials: Mapping[str, str]) -> Dict[str, Any]:
        provider, method = get_provider(provider_id), get_auth_method(provider_id, auth_method)
        if not provider or not method:
            raise ApiError(400, "Unknown provider or auth method")
        if provider_id == "lightos_gateway":
            raise ApiError(400, "On-prem clusters are enrolled with a node enrollment code (Onboard), not with credentials")
        self._throttle(user)
        if await run_in_threadpool(self.db.count_connections, user.id) >= self.settings.max_connections_per_user:
            raise ApiError(409, "Connection limit reached")
        parts = split_credentials(method, credentials)
        if parts.missing or parts.invalid:
            raise ApiError(400, "Missing or invalid fields", missing=parts.missing, invalid=parts.invalid)
        if await run_in_threadpool(self.db.label_exists, user.id, provider_id, label):
            raise ApiError(409, "A connection with this label already exists")

        creds = {**parts.account_ref, **parts.secret}
        outcome = await self._validate(user, provider, auth_method, creds, parts.secret.values(), connection_id=None)
        if outcome.status == "error":
            await self._audit(user, provider_id, "connect", False, outcome.message)
            raise ApiError(422, outcome.message or "Validation failed", status="error")

        connection_id = new_id()
        blob = self.vault.encrypt(json.dumps(parts.secret, separators=(",", ":")), aad=connection_id) if parts.secret else None
        try:
            row = await run_in_threadpool(
                lambda: self.db.insert_connection(
                    connection_id=connection_id,
                    user_id=user.id,
                    provider_id=provider_id,
                    auth_method=auth_method,
                    label=label,
                    account_ref=parts.account_ref,
                    identity=outcome.identity,
                    status=outcome.status,
                    status_message=outcome.message,
                    validation_mode=effective_validation(provider, self.adapters),
                    secret_blob=blob,
                    last_validated_at=now_iso() if outcome.status == "connected" else None,
                )
            )
        except DuplicateLabelError:
            raise ApiError(409, "A connection with this label already exists") from None
        await self._audit(user, provider_id, "connect", True, outcome.identity, row["id"])
        return row

    async def test(self, user: User, connection_id: str) -> Dict[str, Any]:
        self._throttle(user)
        row = await self._owned(user, connection_id)
        provider = get_provider(row["provider_id"])
        if provider is None:
            raise ApiError(409, "This provider is no longer supported")
        secret = self._decrypt(row)
        creds = {**json.loads(row["account_ref"] or "{}"), **secret}
        outcome = await self._validate(user, provider, row["auth_method"], creds, secret.values(), connection_id=row["id"])
        updated = await run_in_threadpool(
            lambda: self.db.update_connection(
                user.id,
                row["id"],
                status=outcome.status,
                identity=outcome.identity or row["identity"],
                status_message=outcome.message,
                validation_mode=effective_validation(provider, self.adapters),
                last_validated_at=now_iso() if outcome.status == "connected" else row["last_validated_at"],
            )
        )
        await self._audit(user, row["provider_id"], "test", outcome.status != "error", outcome.message or outcome.identity, row["id"])
        if updated is None:
            raise ApiError(404, "Not found")
        return updated

    async def inventory(self, user: User, connection_id: str) -> Dict[str, Any]:
        self._throttle(user)
        row = await self._owned(user, connection_id)
        secret = self._decrypt(row)
        creds = {**json.loads(row["account_ref"] or "{}"), **secret}
        adapter = self.adapters.get(row["provider_id"])
        try:
            if adapter is not None:
                items = await adapter.inventory(self.ctx, creds)
            else:
                if self.gateway is None:
                    raise ProviderError("The Aurora runtime gateway is not configured, so this provider cannot be read yet")
                reply = await self.gateway.fetch(
                    f"/v1/providers/{quote(row['id'], safe='')}/inventory",
                    user,
                    method="POST",
                    body={"providerId": row["provider_id"], "authMethod": row["auth_method"], "credentials": creds},
                )
                items = (reply or {}).get("items") or [] if isinstance(reply, dict) else []
        except ProviderError as error:
            message = _scrub(error.message, secret.values())
            await self._audit(user, row["provider_id"], "inventory", False, message, row["id"])
            raise ApiError(502, message) from error
        except Exception:  # noqa: BLE001
            log.exception("unexpected error reading inventory for %s", row["provider_id"])
            await self._audit(user, row["provider_id"], "inventory", False, "Unexpected response from the provider", row["id"])
            raise ApiError(502, "Unexpected response from the provider") from None
        await self._audit(user, row["provider_id"], "inventory", True, f"{len(items)} items", row["id"])
        return {"items": items, "fetchedAt": now_iso()}

    async def disconnect(self, user: User, connection_id: str) -> Dict[str, Any]:
        row = await self._owned(user, connection_id)
        await run_in_threadpool(self.db.delete_connection, user.id, row["id"])
        await self._audit(user, row["provider_id"], "disconnect", True, row["label"], row["id"])
        return {"ok": True}

    async def events(self, user: User, limit: int = 100) -> Dict[str, Any]:
        return {"events": await run_in_threadpool(self.db.list_events, user.id, limit)}


def reencrypt_all(db: Database, vault: Vault) -> Dict[str, int]:
    """Move every stored credential onto the vault's active key (run after rotating ``PROVIDER_VAULT_KEY``)."""
    moved = skipped = 0
    for connection_id, blob in list(db.iter_secrets()):
        if vault.is_current(blob):
            skipped += 1
            continue
        db.set_secret_blob(connection_id, vault.encrypt(vault.decrypt(blob, aad=connection_id), aad=connection_id))
        moved += 1
    return {"reencrypted": moved, "already_current": skipped}
