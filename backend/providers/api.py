"""REST API of the provider service, mounted by ``main.py`` at ``/api/providers``.

GET    /catalog                         provider catalog (public; no secrets)
GET    /health                          readiness of the database / vault / gateway (public; no secrets)
GET    /connections                     the caller's connections
POST   /connections                     connect: {providerId, authMethod, label, credentials}
POST   /connections/{id}/test           re-validate the stored credential
GET    /connections/{id}/inventory      live GPU inventory / offers / models from the provider
DELETE /connections/{id}                disconnect and delete the stored credential
GET    /events                          the caller's audit trail

It is a separate ASGI app on purpose: the backend's global guard (``auth.auth_dependency``) demands the *admin* role
for every mutating verb, while connections belong to ordinary signed-in users. Here every route except catalog/health
requires a valid Supabase session and only ever touches the caller's own rows. Responses use the same JSON shapes as
the ``provider-connect`` edge function, so the dashboard works against either.
"""
from __future__ import annotations

import logging
import threading
from typing import Any, Annotated, Callable, Dict, Optional

from fastapi import Depends, FastAPI, Path, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, StringConstraints, field_validator
from sqlalchemy.exc import SQLAlchemyError
from starlette.concurrency import run_in_threadpool
from starlette.exceptions import HTTPException as StarletteHTTPException

from .adapters import ADAPTERS
from .catalog import MAX_FIELD_LENGTH
from .db import Database
from .http import Http
from .service import ApiError, ProviderService, User, public_catalog
from .settings import Settings
from .vault import Vault, VaultError

log = logging.getLogger("lightos.providers")

ConnectionId = Annotated[str, Path(min_length=1, max_length=64)]


class ConnectBody(BaseModel):
    providerId: Annotated[str, StringConstraints(min_length=1, max_length=64)]
    authMethod: Annotated[str, StringConstraints(min_length=1, max_length=64)]
    label: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
    credentials: Dict[str, Annotated[str, StringConstraints(max_length=MAX_FIELD_LENGTH)]] = Field(default_factory=dict)

    @field_validator("credentials")
    @classmethod
    def _few_fields(cls, value: Dict[str, str]) -> Dict[str, str]:
        if len(value) > 20:
            raise ValueError("too many credential fields")
        return value


def create_providers_app(
    *,
    settings: Optional[Settings] = None,
    http: Optional[Http] = None,
    user_dependency: Optional[Callable[..., Any]] = None,
    service: Optional[ProviderService] = None,
) -> FastAPI:
    """Build the sub-app. Everything is injectable for tests; production uses the environment and ``auth.current_user``."""
    if user_dependency is None:
        from auth import current_user as user_dependency  # imported lazily: only needed when actually serving

    app = FastAPI(title="LightOS compute providers", version="0.1.0")
    state: Dict[str, Any] = {"service": service}
    lock = threading.Lock()

    def _service() -> ProviderService:
        with lock:
            if state["service"] is None:
                cfg = settings or Settings.from_env()
                try:
                    vault = Vault.from_settings(cfg)
                    db = Database(cfg.database_url)
                    db.create_schema()
                except VaultError as exc:
                    log.error("provider vault unavailable: %s", exc)
                    raise ApiError(503, "The credential vault is not configured on this server (set PROVIDER_VAULT_KEY)") from exc
                except (SQLAlchemyError, OSError) as exc:
                    log.error("provider database unavailable: %s", exc)
                    raise ApiError(503, "The provider database is not available") from exc
                state["service"] = ProviderService(
                    db=db, vault=vault, settings=cfg, http=http or Http(allow_private_hosts=cfg.allow_private_hosts)
                )
            return state["service"]

    async def get_service() -> ProviderService:
        return await run_in_threadpool(_service)

    async def get_user(authed: Any = Depends(user_dependency)) -> User:
        return User(id=str(authed.id), email=getattr(authed, "email", None))

    # ── errors: one JSON shape ({"error": ...}) for every failure, like the edge function ──────────────

    @app.exception_handler(ApiError)
    async def _api_error(_: Request, exc: ApiError) -> JSONResponse:
        return JSONResponse(exc.body, status_code=exc.status, headers=exc.headers)

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        return JSONResponse({"error": str(exc.detail)}, status_code=exc.status_code, headers=getattr(exc, "headers", None))

    @app.exception_handler(RequestValidationError)
    async def _invalid(_: Request, exc: RequestValidationError) -> JSONResponse:
        fields = sorted({".".join(str(p) for p in e["loc"][1:]) or str(e["loc"][0]) for e in exc.errors()})
        return JSONResponse({"error": "Invalid request", "fields": fields}, status_code=400)

    @app.exception_handler(Exception)
    async def _unexpected(_: Request, exc: Exception) -> JSONResponse:
        log.exception("unhandled error in provider API")
        return JSONResponse({"error": "Internal error"}, status_code=500)

    # ── public ─────────────────────────────────────────────────────────────────────────────────────────

    @app.get("/catalog")
    async def catalog() -> Dict[str, Any]:
        adapters = service.adapters if service is not None else ADAPTERS
        return {"providers": public_catalog(adapters)}

    @app.get("/health")
    async def health() -> Dict[str, Any]:
        try:
            svc = await get_service()
            await run_in_threadpool(svc.db.ping)
            return {"status": "ok", "database": True, "vault": True, "gateway": svc.gateway_state()}
        except ApiError as exc:
            return JSONResponse({"status": "degraded", "reason": exc.body["error"]}, status_code=503)  # type: ignore[return-value]
        except SQLAlchemyError:
            return JSONResponse({"status": "degraded", "reason": "database unreachable"}, status_code=503)  # type: ignore[return-value]

    # ── authenticated, scoped to the caller ────────────────────────────────────────────────────────────

    @app.get("/connections")
    async def list_connections(user: User = Depends(get_user), svc: ProviderService = Depends(get_service)) -> Dict[str, Any]:
        return await svc.list_connections(user)

    @app.post("/connections", status_code=201)
    async def connect(body: ConnectBody, user: User = Depends(get_user), svc: ProviderService = Depends(get_service)) -> Dict[str, Any]:
        return {"connection": await svc.connect(user, body.providerId, body.authMethod, body.label, body.credentials)}

    @app.post("/connections/{connection_id}/test")
    async def test_connection(connection_id: ConnectionId, user: User = Depends(get_user), svc: ProviderService = Depends(get_service)) -> Dict[str, Any]:
        return {"connection": await svc.test(user, connection_id)}

    @app.get("/connections/{connection_id}/inventory")
    async def inventory(connection_id: ConnectionId, user: User = Depends(get_user), svc: ProviderService = Depends(get_service)) -> Dict[str, Any]:
        return await svc.inventory(user, connection_id)

    @app.delete("/connections/{connection_id}")
    async def disconnect(connection_id: ConnectionId, user: User = Depends(get_user), svc: ProviderService = Depends(get_service)) -> Dict[str, Any]:
        return await svc.disconnect(user, connection_id)

    @app.get("/events")
    async def events(limit: int = 100, user: User = Depends(get_user), svc: ProviderService = Depends(get_service)) -> Dict[str, Any]:
        return await svc.events(user, max(1, min(limit, 500)))

    return app
