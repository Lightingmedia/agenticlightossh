"""Shared types for the provider adapters.

Each adapter validates credentials with the cheapest read-only call the provider offers and lists GPU inventory in a
normalised shape. Nothing here creates, modifies or deletes cloud resources: launching stays with Aurora Fabric OS
behind the runtime gateway.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Awaitable, Callable, Dict, List, Optional

from ..http import Http
from ..settings import Settings

Creds = Dict[str, str]
Item = Dict[str, Any]


@dataclass
class AdapterContext:
    http: Http
    settings: Settings


@dataclass
class Validation:
    identity: str
    message: Optional[str] = None


@dataclass(frozen=True)
class Adapter:
    validate: Callable[[AdapterContext, Creds], Awaitable[Validation]]
    inventory: Callable[[AdapterContext, Creds], Awaitable[List[Item]]]


def _number(value: Any) -> Optional[float]:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return value
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def make_item(
    kind: str,
    item_id: Any,
    name: Any = None,
    *,
    accelerator: Any = None,
    count: Any = None,
    region: Any = None,
    status: Any = None,
    price: Any = None,
) -> Item:
    """One normalised inventory row. Absent values are omitted, like undefined fields in the TypeScript API."""
    ident = "" if item_id is None else str(item_id)
    out: Item = {"kind": kind, "id": ident, "name": str(name) if name not in (None, "") else ident}
    if accelerator not in (None, ""):
        out["accelerator"] = str(accelerator)
    number = _number(count)
    if number is not None:
        out["acceleratorCount"] = int(number)
    if region not in (None, ""):
        out["region"] = str(region)
    if status not in (None, ""):
        out["status"] = str(status)
    cost = _number(price)
    if cost is not None:
        out["pricePerHourUsd"] = cost
    return out


def need(creds: Creds, *keys: str) -> List[str]:
    """Return the values for ``keys``; raises a friendly error naming whichever is missing."""
    from ..http import ProviderError

    missing = [k for k in keys if not creds.get(k)]
    if missing:
        raise ProviderError(f"Missing credential field(s): {', '.join(missing)}")
    return [creds[k] for k in keys]
