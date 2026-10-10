"""Encryption of stored provider credentials (AES-256-GCM).

Each secret blob is ``v1.<key id>.<base64url(nonce || ciphertext+tag)>``. The row id is bound in as associated data,
so a ciphertext copied onto another row (or another user's) fails to decrypt. The key id is a short fingerprint of the
key, which lets a rotated-out key stay readable (``PROVIDER_VAULT_KEY_OLD``) until ``python -m providers reencrypt``
has moved every row onto the new key.

The key itself never touches the database. In production it must come from the environment / a secret manager; in
development a key file is generated next to the SQLite file on first use.
"""
from __future__ import annotations

import base64
import hashlib
import logging
import os
import secrets
from pathlib import Path
from typing import Iterable

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from .settings import Settings

log = logging.getLogger("lightos.providers.vault")

_VERSION = "v1"


class VaultError(Exception):
    """Raised for missing / malformed keys and for blobs that cannot be decrypted."""


def _b64e(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _b64d(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def generate_key() -> str:
    """A fresh random vault key (urlsafe base64, 32 bytes)."""
    return _b64e(secrets.token_bytes(32))


def _parse_key(value: str) -> bytes:
    try:
        raw = _b64d(value.strip())
    except Exception as exc:  # noqa: BLE001 - any decoding problem is a configuration error
        raise VaultError("Vault key is not valid base64") from exc
    if len(raw) != 32:
        raise VaultError("Vault key must decode to exactly 32 bytes (create one with: python -m providers keygen)")
    return raw


def _key_id(key: bytes) -> str:
    return hashlib.sha256(b"lightos-provider-vault:" + key).hexdigest()[:8]


class Vault:
    def __init__(self, active_key: str, old_keys: Iterable[str] = ()):
        keys = [_parse_key(active_key)] + [_parse_key(k) for k in old_keys if k and k.strip()]
        self._active = keys[0]
        self._by_id = {_key_id(k): k for k in keys}

    @property
    def active_key_id(self) -> str:
        return _key_id(self._active)

    def encrypt(self, plaintext: str, *, aad: str) -> str:
        nonce = os.urandom(12)
        ciphertext = AESGCM(self._active).encrypt(nonce, plaintext.encode("utf-8"), aad.encode("utf-8"))
        return f"{_VERSION}.{self.active_key_id}.{_b64e(nonce + ciphertext)}"

    def decrypt(self, blob: str, *, aad: str) -> str:
        try:
            version, key_id, payload = blob.split(".", 2)
            key = self._by_id[key_id]
            raw = _b64d(payload)
            if version != _VERSION or len(raw) < 12 + 16:
                raise ValueError("unsupported blob")
            plaintext = AESGCM(key).decrypt(raw[:12], raw[12:], aad.encode("utf-8"))
        except (KeyError, ValueError, InvalidTag) as exc:
            # Deliberately vague: never hint at which part failed.
            raise VaultError("Stored credential could not be decrypted") from exc
        return plaintext.decode("utf-8")

    def is_current(self, blob: str) -> bool:
        """True when the blob is already encrypted under the active key."""
        parts = blob.split(".", 2)
        return len(parts) == 3 and parts[1] == self.active_key_id

    @classmethod
    def from_settings(cls, settings: Settings) -> "Vault":
        key = settings.vault_key
        if not key:
            if settings.is_production:
                raise VaultError("PROVIDER_VAULT_KEY is required when LIGHTOS_ENV=production")
            key = _load_or_create_dev_key(settings.data_dir)
        return cls(key, settings.vault_keys_old)


def _load_or_create_dev_key(data_dir: Path) -> str:
    path = data_dir / "vault.key"
    if not path.exists():
        data_dir.mkdir(parents=True, exist_ok=True)
        try:
            fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        except FileExistsError:  # another worker won the race
            pass
        else:
            with os.fdopen(fd, "w", encoding="ascii") as handle:
                handle.write(generate_key() + "\n")
            log.warning(
                "PROVIDER_VAULT_KEY is not set: generated a development key at %s. "
                "Set PROVIDER_VAULT_KEY (and LIGHTOS_ENV=production) for real deployments.",
                path,
            )
    return path.read_text(encoding="ascii").strip()
