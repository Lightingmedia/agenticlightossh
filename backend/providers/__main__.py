"""Operator CLI for the provider service.

    python -m providers keygen      print a new vault key (urlsafe base64, 32 bytes) for PROVIDER_VAULT_KEY
    python -m providers check       report whether the database, vault and gateway are ready
    python -m providers reencrypt   move every stored credential onto the active key (after rotating the key)

Key rotation: set the new key as PROVIDER_VAULT_KEY, keep the previous one in PROVIDER_VAULT_KEY_OLD, run
``reencrypt``, then drop the old key.
"""
from __future__ import annotations

import sys

from .db import Database
from .gateway import Gateway
from .http import Http
from .service import reencrypt_all
from .settings import Settings
from .vault import Vault, VaultError, generate_key


def main(argv=None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    command = args[0] if args else ""

    if command == "keygen":
        print(generate_key())
        return 0

    if command in {"check", "reencrypt"}:
        settings = Settings.from_env()
        try:
            vault = Vault.from_settings(settings)
        except VaultError as exc:
            print(f"vault:    NOT READY - {exc}")
            return 1
        db = Database(settings.database_url)
        db.create_schema()
        db.ping()
        if command == "reencrypt":
            result = reencrypt_all(db, vault)
            print(f"re-encrypted {result['reencrypted']} credential(s); {result['already_current']} already on the active key")
            return 0
        print(f"environment: {settings.environment}")
        url = db.engine.url
        where = url.database if url.get_backend_name() == "sqlite" else url.render_as_string(hide_password=True)
        print(f"database:    ok ({url.get_backend_name()}: {where})")
        print(f"vault:       ok (active key id {vault.active_key_id}{', from PROVIDER_VAULT_KEY' if settings.vault_key else ', development key file'})")
        print(f"gateway:     {'configured' if Gateway.from_settings(settings, Http()) else 'not configured (providers that need Aurora stay awaiting_gateway)'}")
        print(f"aws roles:   {'configured' if settings.aws_platform_key_id and settings.aws_platform_secret else 'not configured (cross-account role connections unavailable)'}")
        return 0

    print(__doc__)
    return 2 if command else 0


if __name__ == "__main__":
    raise SystemExit(main())
