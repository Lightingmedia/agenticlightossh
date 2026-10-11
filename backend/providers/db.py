"""The provider service's own database.

SQLAlchemy Core, so the same code runs on SQLite (default, zero setup) and Postgres (set ``DATABASE_URL``). Two
tables mirror the Supabase migration: ``provider_connections`` (one row per connection; the credential lives in
``secret_blob``, encrypted by ``vault.py``, and is never returned to clients) and ``provider_events`` (append-only
audit trail). Every query is scoped by ``user_id``.
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional, Tuple

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Index,
    Integer,
    MetaData,
    String,
    Table,
    Text,
    UniqueConstraint,
    create_engine,
    delete,
    event,
    func,
    insert,
    select,
    update,
)
from sqlalchemy.engine import Engine, make_url
from sqlalchemy.exc import IntegrityError
from sqlalchemy.pool import StaticPool

STATUSES = ("pending", "connected", "awaiting_gateway", "error", "revoked")

metadata = MetaData()

provider_connections = Table(
    "provider_connections",
    metadata,
    Column("id", String(36), primary_key=True),
    Column("user_id", String(64), nullable=False),
    Column("provider_id", String(64), nullable=False),
    Column("auth_method", String(64), nullable=False),
    Column("label", String(120), nullable=False),
    Column("account_ref", Text, nullable=False, default="{}"),
    Column("identity", Text),
    Column("status", String(32), nullable=False, default="pending"),
    Column("status_message", Text),
    Column("validation_mode", String(16), nullable=False),
    Column("launch_enabled", Boolean, nullable=False, default=False),
    Column("secret_blob", Text),  # AES-GCM envelope from vault.py; never leaves the backend
    Column("last_validated_at", String(40)),
    Column("created_at", String(40), nullable=False),
    Column("updated_at", String(40), nullable=False),
    UniqueConstraint("user_id", "provider_id", "label", name="uq_provider_connections_label"),
    CheckConstraint("status IN ('" + "', '".join(STATUSES) + "')", name="ck_provider_connections_status"),
    CheckConstraint("validation_mode IN ('direct', 'gateway')", name="ck_provider_connections_mode"),
    Index("provider_connections_user_idx", "user_id"),
)

provider_events = Table(
    "provider_events",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("connection_id", String(36)),  # kept after the connection is deleted, like ON DELETE SET NULL
    Column("user_id", String(64), nullable=False),
    Column("provider_id", String(64), nullable=False),
    Column("action", String(16), nullable=False),
    Column("ok", Boolean, nullable=False),
    Column("message", Text),
    Column("created_at", String(40), nullable=False),
    CheckConstraint("action IN ('connect', 'test', 'inventory', 'disconnect')", name="ck_provider_events_action"),
    Index("provider_events_user_idx", "user_id", "created_at"),
)

#: Columns clients may see (everything except ``secret_blob``).
PUBLIC_COLUMNS = (
    "id",
    "provider_id",
    "auth_method",
    "label",
    "account_ref",
    "identity",
    "status",
    "status_message",
    "validation_mode",
    "launch_enabled",
    "last_validated_at",
    "created_at",
    "updated_at",
)


class DuplicateLabelError(Exception):
    """The user already has a connection with this provider and label."""


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def new_id() -> str:
    return str(uuid.uuid4())


def _make_engine(url: str) -> Engine:
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://") :]
    parsed = make_url(url)
    if parsed.get_backend_name() != "sqlite":
        return create_engine(url, pool_pre_ping=True)

    in_memory = parsed.database in (None, "", ":memory:")
    if not in_memory:
        Path(parsed.database).expanduser().parent.mkdir(parents=True, exist_ok=True)
    engine = create_engine(
        url,
        connect_args={"check_same_thread": False},
        **({"poolclass": StaticPool} if in_memory else {}),
    )

    @event.listens_for(engine, "connect")
    def _sqlite_pragmas(dbapi_connection, _record):  # noqa: ANN001
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.close()

    return engine


def _is_unique_violation(exc: IntegrityError) -> bool:
    orig = exc.orig
    code = getattr(orig, "pgcode", None) or getattr(orig, "sqlstate", None)
    return code == "23505" or "unique" in str(orig).lower()


def _public(row: Dict[str, Any]) -> Dict[str, Any]:
    out = {k: row[k] for k in PUBLIC_COLUMNS}
    out["account_ref"] = json.loads(out["account_ref"] or "{}")
    out["launch_enabled"] = bool(out["launch_enabled"])
    return out


class Database:
    def __init__(self, url: str):
        self.engine = _make_engine(url)

    def create_schema(self) -> None:
        metadata.create_all(self.engine)

    def ping(self) -> None:
        with self.engine.connect() as conn:
            conn.execute(select(1))

    # ── connections ────────────────────────────────────────────────────────────────────────────────────

    def count_connections(self, user_id: str) -> int:
        with self.engine.connect() as conn:
            return conn.execute(
                select(func.count()).select_from(provider_connections).where(provider_connections.c.user_id == user_id)
            ).scalar_one()

    def insert_connection(
        self,
        *,
        connection_id: str,
        user_id: str,
        provider_id: str,
        auth_method: str,
        label: str,
        account_ref: Dict[str, str],
        identity: Optional[str],
        status: str,
        status_message: Optional[str],
        validation_mode: str,
        secret_blob: Optional[str],
        last_validated_at: Optional[str],
    ) -> Dict[str, Any]:
        now = now_iso()
        try:
            with self.engine.begin() as conn:
                conn.execute(
                    insert(provider_connections).values(
                        id=connection_id,
                        user_id=user_id,
                        provider_id=provider_id,
                        auth_method=auth_method,
                        label=label,
                        account_ref=json.dumps(account_ref, sort_keys=True),
                        identity=identity,
                        status=status,
                        status_message=status_message,
                        validation_mode=validation_mode,
                        launch_enabled=False,
                        secret_blob=secret_blob,
                        last_validated_at=last_validated_at,
                        created_at=now,
                        updated_at=now,
                    )
                )
        except IntegrityError as exc:
            if not _is_unique_violation(exc):
                raise
            raise DuplicateLabelError() from exc
        row = self.get_connection(user_id, connection_id)
        assert row is not None
        return _public(row)

    def label_exists(self, user_id: str, provider_id: str, label: str) -> bool:
        with self.engine.connect() as conn:
            return (
                conn.execute(
                    select(provider_connections.c.id).where(
                        provider_connections.c.user_id == user_id,
                        provider_connections.c.provider_id == provider_id,
                        provider_connections.c.label == label,
                    )
                ).first()
                is not None
            )

    def list_connections(self, user_id: str) -> List[Dict[str, Any]]:
        with self.engine.connect() as conn:
            rows = conn.execute(
                select(provider_connections)
                .where(provider_connections.c.user_id == user_id)
                .order_by(provider_connections.c.created_at, provider_connections.c.id)
            ).mappings()
            return [_public(dict(r)) for r in rows]

    def get_connection(self, user_id: str, connection_id: str) -> Optional[Dict[str, Any]]:
        """Full row including ``secret_blob`` - internal use only; run it through ``public_view`` before returning."""
        with self.engine.connect() as conn:
            row = conn.execute(
                select(provider_connections).where(
                    provider_connections.c.id == connection_id, provider_connections.c.user_id == user_id
                )
            ).mappings().first()
            return dict(row) if row else None

    def update_connection(self, user_id: str, connection_id: str, **values: Any) -> Optional[Dict[str, Any]]:
        with self.engine.begin() as conn:
            result = conn.execute(
                update(provider_connections)
                .where(provider_connections.c.id == connection_id, provider_connections.c.user_id == user_id)
                .values(updated_at=now_iso(), **values)
            )
            if result.rowcount == 0:
                return None
        row = self.get_connection(user_id, connection_id)
        return _public(row) if row else None

    def delete_connection(self, user_id: str, connection_id: str) -> bool:
        with self.engine.begin() as conn:
            result = conn.execute(
                delete(provider_connections).where(
                    provider_connections.c.id == connection_id, provider_connections.c.user_id == user_id
                )
            )
            return result.rowcount > 0

    # ── audit trail ────────────────────────────────────────────────────────────────────────────────────

    def add_event(
        self,
        *,
        user_id: str,
        provider_id: str,
        action: str,
        ok: bool,
        message: Optional[str],
        connection_id: Optional[str] = None,
    ) -> None:
        with self.engine.begin() as conn:
            conn.execute(
                insert(provider_events).values(
                    connection_id=connection_id,
                    user_id=user_id,
                    provider_id=provider_id,
                    action=action,
                    ok=ok,
                    message=(message or None) and message[:400],
                    created_at=now_iso(),
                )
            )

    def list_events(self, user_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        with self.engine.connect() as conn:
            rows = conn.execute(
                select(provider_events)
                .where(provider_events.c.user_id == user_id)
                .order_by(provider_events.c.id.desc())
                .limit(limit)
            ).mappings()
            return [dict(r) for r in rows]

    # ── maintenance (key rotation) ─────────────────────────────────────────────────────────────────────

    def iter_secrets(self) -> Iterator[Tuple[str, str]]:
        """(connection id, secret blob) for every stored credential."""
        with self.engine.connect() as conn:
            rows = conn.execute(
                select(provider_connections.c.id, provider_connections.c.secret_blob).where(
                    provider_connections.c.secret_blob.is_not(None)
                )
            ).all()
        for connection_id, blob in rows:
            yield connection_id, blob

    def set_secret_blob(self, connection_id: str, blob: str) -> None:
        with self.engine.begin() as conn:
            conn.execute(update(provider_connections).where(provider_connections.c.id == connection_id).values(secret_blob=blob))


def public_view(row: Dict[str, Any]) -> Dict[str, Any]:
    """Strip a full row (from ``get_connection``) down to what clients may see."""
    return _public(row)
