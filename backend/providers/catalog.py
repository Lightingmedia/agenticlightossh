"""Provider catalog, loaded from ``catalog.json``.

The JSON is generated from ``supabase/functions/_shared/provider-catalog.ts`` (the single source of truth shared by
the browser and the Supabase edge function) with ``npm run export:provider-catalog``; a vitest test fails when the
committed JSON is stale. ``split_credentials`` is the Python twin of the TypeScript function of the same name.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Mapping, Optional

_DATA = json.loads(Path(__file__).with_name("catalog.json").read_text(encoding="utf-8"))

PROVIDERS: List[Dict[str, Any]] = _DATA["providers"]
CATEGORY_LABELS: Dict[str, str] = _DATA["categoryLabels"]
_BY_ID: Dict[str, Dict[str, Any]] = {p["id"]: p for p in PROVIDERS}

#: Longest value accepted for any single credential field (service-account JSON and PEM keys are the big ones).
MAX_FIELD_LENGTH = 20_000


def get_provider(provider_id: str) -> Optional[Dict[str, Any]]:
    return _BY_ID.get(provider_id)


def get_auth_method(provider_id: str, method_id: str) -> Optional[Dict[str, Any]]:
    provider = get_provider(provider_id)
    if not provider:
        return None
    return next((m for m in provider["authMethods"] if m["id"] == method_id), None)


@dataclass
class SplitCredentials:
    secret: Dict[str, str] = field(default_factory=dict)       # encrypted into the vault
    account_ref: Dict[str, str] = field(default_factory=dict)  # non-secret identifiers, stored in clear
    missing: List[str] = field(default_factory=list)
    invalid: List[str] = field(default_factory=list)


def split_credentials(method: Mapping[str, Any], values: Mapping[str, str]) -> SplitCredentials:
    """Split submitted credentials into vaulted secrets and a non-secret account reference.

    Mirrors the TypeScript implementation: values are trimmed, empty optional fields are skipped, empty required
    fields are reported as ``missing``, and over-long or pattern-violating values as ``invalid``. Keys that are not
    part of the auth method are ignored.
    """
    out = SplitCredentials()
    for f in method["fields"]:
        key = f["key"]
        value = (values.get(key) or "").strip()
        if not value:
            if not f.get("optional"):
                out.missing.append(key)
            continue
        if len(value) > MAX_FIELD_LENGTH:
            out.invalid.append(key)
            continue
        pattern = f.get("pattern")
        if pattern and not re.search(pattern, value):
            out.invalid.append(key)
            continue
        (out.secret if f.get("secret") else out.account_ref)[key] = value
    return out
