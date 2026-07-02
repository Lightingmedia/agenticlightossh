"""
Authentication middleware for the LightOS FastAPI backend.

Every request must present a valid Supabase JWT in the `Authorization: Bearer <token>`
header. Mutating verbs (POST/PUT/PATCH/DELETE) additionally require the
`admin` role from the `user_roles` table.

The Supabase project URL and anon key are read from environment variables:
    SUPABASE_URL, SUPABASE_ANON_KEY

Open endpoints (health/ping) are listed in ``OPEN_PATHS`` and bypass auth.
"""
from __future__ import annotations

import os
from typing import Optional

import httpx
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

_SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
_SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")

OPEN_PATHS = {
    "/api/health",
    "/api/compile/ping",
    "/docs",
    "/openapi.json",
    "/redoc",
}

_MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

_bearer = HTTPBearer(auto_error=False)


class AuthedUser:
    __slots__ = ("id", "email", "token")

    def __init__(self, id: str, email: Optional[str], token: str):
        self.id = id
        self.email = email
        self.token = token


async def _verify_token(token: str) -> AuthedUser:
    if not _SUPABASE_URL or not _SUPABASE_ANON_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth backend not configured",
        )
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.get(
            f"{_SUPABASE_URL}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": _SUPABASE_ANON_KEY,
            },
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    body = resp.json()
    user_id = body.get("id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return AuthedUser(id=user_id, email=body.get("email"), token=token)


async def _require_admin(user: AuthedUser) -> None:
    """Verify the user has the `admin` role via PostgREST."""
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.get(
            f"{_SUPABASE_URL}/rest/v1/user_roles",
            params={"user_id": f"eq.{user.id}", "role": "eq.admin", "select": "role"},
            headers={
                "Authorization": f"Bearer {user.token}",
                "apikey": _SUPABASE_ANON_KEY,
            },
        )
    if resp.status_code != 200 or not resp.json():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")


async def auth_dependency(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> Optional[AuthedUser]:
    """Global auth guard.

    - Skips open paths (health/docs).
    - Requires a valid Supabase JWT on every other route.
    - Additionally requires the `admin` role for mutating verbs.
    """
    path = request.url.path
    if path in OPEN_PATHS or path.startswith("/static"):
        return None
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    user = await _verify_token(credentials.credentials)
    if request.method.upper() in _MUTATING_METHODS:
        await _require_admin(user)
    return user
