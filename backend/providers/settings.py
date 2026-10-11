"""Runtime configuration for the provider service, read from environment variables."""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Mapping, Optional, Tuple

BACKEND_DIR = Path(__file__).resolve().parent.parent


def _opt(value: Optional[str]) -> Optional[str]:
    value = (value or "").strip()
    return value or None


def _flag(value: Optional[str]) -> bool:
    return (value or "").strip().lower() in {"1", "true", "yes", "on"}


def _positive_int(value: Optional[str], default: int) -> int:
    try:
        parsed = int(value) if value and value.strip() else default
    except ValueError:
        return default
    return parsed if parsed > 0 else default


@dataclass(frozen=True)
class Settings:
    """All knobs of the provider service.

    ================================  =====================================================================
    Environment variable              Meaning
    ================================  =====================================================================
    LIGHTOS_ENV                       ``production`` makes a missing vault key a hard error (default: dev)
    LIGHTOS_DATA_DIR                  Where the SQLite file / dev vault key live (default: ``backend/data``)
    DATABASE_URL                      SQLAlchemy URL (default: SQLite file in the data dir)
    PROVIDER_VAULT_KEY                urlsafe-base64 32-byte key that encrypts stored credentials
    PROVIDER_VAULT_KEY_OLD            comma-separated previous keys, still accepted for decryption
    LIGHTOS_RUNTIME_GATEWAY_URL/TOKEN Aurora runtime gateway, used for providers validated by Aurora
    LIGHTRAIL_AWS_ACCESS_KEY_ID/SECRET_ACCESS_KEY  LightRail's own AWS principal for cross-account role connections
    PROVIDERS_ALLOW_PRIVATE_HOSTS     ``1`` lets user-supplied endpoints (Kubernetes) resolve to private addresses
    PROVIDERS_RATE_LIMIT_PER_MINUTE   per-user cap on connect/test/inventory calls (default 30)
    PROVIDERS_MAX_CONNECTIONS_PER_USER  default 50
    ================================  =====================================================================
    """

    environment: str = "development"
    data_dir: Path = BACKEND_DIR / "data"
    database_url: str = ""
    vault_key: Optional[str] = None
    vault_keys_old: Tuple[str, ...] = ()
    gateway_url: Optional[str] = None
    gateway_token: Optional[str] = None
    aws_platform_key_id: Optional[str] = None
    aws_platform_secret: Optional[str] = None
    allow_private_hosts: bool = False
    rate_limit_per_minute: int = 30
    max_connections_per_user: int = 50

    @property
    def is_production(self) -> bool:
        return self.environment.lower() in {"production", "prod"}

    @classmethod
    def from_env(cls, env: Optional[Mapping[str, str]] = None) -> "Settings":
        e = os.environ if env is None else env
        data_dir = Path(e.get("LIGHTOS_DATA_DIR") or BACKEND_DIR / "data")
        database_url = _opt(e.get("DATABASE_URL")) or f"sqlite:///{(data_dir / 'lightos.db').as_posix()}"
        old_keys = tuple(k.strip() for k in (e.get("PROVIDER_VAULT_KEY_OLD") or "").split(",") if k.strip())
        return cls(
            environment=_opt(e.get("LIGHTOS_ENV")) or "development",
            data_dir=data_dir,
            database_url=database_url,
            vault_key=_opt(e.get("PROVIDER_VAULT_KEY")),
            vault_keys_old=old_keys,
            gateway_url=_opt(e.get("LIGHTOS_RUNTIME_GATEWAY_URL")),
            gateway_token=_opt(e.get("LIGHTOS_RUNTIME_GATEWAY_TOKEN")),
            aws_platform_key_id=_opt(e.get("LIGHTRAIL_AWS_ACCESS_KEY_ID")),
            aws_platform_secret=_opt(e.get("LIGHTRAIL_AWS_SECRET_ACCESS_KEY")),
            allow_private_hosts=_flag(e.get("PROVIDERS_ALLOW_PRIVATE_HOSTS")),
            rate_limit_per_minute=_positive_int(e.get("PROVIDERS_RATE_LIMIT_PER_MINUTE"), 30),
            max_connections_per_user=_positive_int(e.get("PROVIDERS_MAX_CONNECTIONS_PER_USER"), 50),
        )
