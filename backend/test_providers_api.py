"""
Tests for the provider REST API (``/api/providers``): authentication, request validation, error shapes, the full
connection lifecycle, startup behaviour, and how the sub-app is mounted in the real backend app.

Run with:
  cd backend
  pytest test_providers_api.py -v
"""
from types import SimpleNamespace

import pytest
from fastapi import HTTPException, Request
from fastapi.testclient import TestClient

from providers.adapters import ADAPTERS
from providers.api import create_providers_app
from providers.db import Database
from providers.ratelimit import RateLimiter
from providers.service import ProviderService
from providers.settings import Settings
from providers.vault import Vault, generate_key
from testsupport_providers import FakeAdapter, FakeInternet

AUTH1 = {"Authorization": "Bearer user-1"}
AUTH2 = {"Authorization": "Bearer user-2"}
CONNECT = {"providerId": "lambda", "authMethod": "api_key", "label": "primary", "credentials": {"apiKey": "lambda-secret-key-0123"}}


async def fake_user(request: Request):
    header = request.headers.get("authorization", "")
    if not header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    user_id = header.split(None, 1)[1]
    return SimpleNamespace(id=user_id, email=f"{user_id}@example.com")


def build(adapters=None, *, limit=1000, settings=None):
    db = Database("sqlite://")
    db.create_schema()
    service = ProviderService(
        db=db,
        vault=Vault(generate_key()),
        settings=settings or Settings(),
        http=FakeInternet().http(),
        adapters=adapters if adapters is not None else {"lambda": FakeAdapter().adapter},
        rate_limiter=RateLimiter(limit),
    )
    client = TestClient(create_providers_app(service=service, user_dependency=fake_user), raise_server_exceptions=False)
    return client, service


class TestPublicEndpoints:
    def test_catalog_needs_no_login_and_reports_what_this_backend_validates(self):
        client, _ = build(adapters=dict(ADAPTERS))  # the real registry: the catalog describes what this service can do
        body = client.get("/catalog").json()
        by_id = {p["id"]: p for p in body["providers"]}
        assert len(by_id) == 23 and by_id["ibm"]["validation"] == "direct" and by_id["nebius"]["validation"] == "gateway"
        assert "secret_blob" not in str(body) and by_id["aws"]["authMethods"][0]["fields"][0]["key"] == "roleArn"

    def test_health(self):
        client, _ = build()
        assert client.get("/health").json() == {"status": "ok", "database": True, "vault": True, "gateway": "not_configured"}


class TestAuthentication:
    @pytest.mark.parametrize("method, path", [("get", "/connections"), ("post", "/connections"), ("post", "/connections/x/test"), ("get", "/connections/x/inventory"), ("delete", "/connections/x"), ("get", "/events")])
    def test_everything_but_catalog_and_health_requires_a_session(self, method, path):
        client, _ = build()
        response = getattr(client, method)(path)
        assert response.status_code == 401 and response.json() == {"error": "Missing bearer token"}


class TestLifecycle:
    def test_connect_list_test_inventory_disconnect(self):
        client, _ = build()
        created = client.post("/connections", json=CONNECT, headers=AUTH1)
        assert created.status_code == 201
        connection = created.json()["connection"]
        assert connection["status"] == "connected" and connection["identity"] == "acct-1" and connection["label"] == "primary"
        assert "lambda-secret-key-0123" not in created.text and "secret_blob" not in created.text

        listing = client.get("/connections", headers=AUTH1).json()
        assert listing["gateway"] == "not_configured" and [c["id"] for c in listing["connections"]] == [connection["id"]]

        tested = client.post(f"/connections/{connection['id']}/test", headers=AUTH1)
        assert tested.status_code == 200 and tested.json()["connection"]["status"] == "connected"

        inventory = client.get(f"/connections/{connection['id']}/inventory", headers=AUTH1).json()
        assert inventory["items"][0]["accelerator"] == "H100" and inventory["fetchedAt"].endswith("Z")

        assert client.delete(f"/connections/{connection['id']}", headers=AUTH1).json() == {"ok": True}
        assert client.get("/connections", headers=AUTH1).json()["connections"] == []
        assert [e["action"] for e in client.get("/events", headers=AUTH1).json()["events"]] == ["disconnect", "inventory", "test", "connect"]

    def test_users_are_isolated(self):
        client, _ = build()
        mine = client.post("/connections", json=CONNECT, headers=AUTH1).json()["connection"]
        assert client.get("/connections", headers=AUTH2).json()["connections"] == []
        for response in (
            client.post(f"/connections/{mine['id']}/test", headers=AUTH2),
            client.get(f"/connections/{mine['id']}/inventory", headers=AUTH2),
            client.delete(f"/connections/{mine['id']}", headers=AUTH2),
        ):
            assert response.status_code == 404 and response.json() == {"error": "Not found"}
        assert client.get("/events", headers=AUTH2).json()["events"] == []
        assert len(client.get("/connections", headers=AUTH1).json()["connections"]) == 1

    def test_the_provider_rejecting_the_credentials_is_a_422_and_stores_nothing(self):
        client, service = build({"lambda": FakeAdapter(error="cloud.lambda.ai returned 401: Invalid API key").adapter})
        response = client.post("/connections", json=CONNECT, headers=AUTH1)
        assert response.status_code == 422 and response.json() == {"error": "cloud.lambda.ai returned 401: Invalid API key", "status": "error"}
        assert client.get("/connections", headers=AUTH1).json()["connections"] == []

    def test_conflicts_and_unknown_things(self):
        client, _ = build()
        assert client.post("/connections", json=CONNECT, headers=AUTH1).status_code == 201
        assert client.post("/connections", json=CONNECT, headers=AUTH1).status_code == 409
        assert client.post("/connections", json={**CONNECT, "providerId": "nope"}, headers=AUTH1).json() == {"error": "Unknown provider or auth method"}
        missing = client.post("/connections", json={**CONNECT, "credentials": {}}, headers=AUTH1)
        assert missing.status_code == 400 and missing.json()["missing"] == ["apiKey"]
        assert client.post("/connections/00000000-0000-0000-0000-000000000000/test", headers=AUTH1).status_code == 404

    def test_rate_limit_is_a_429_with_retry_after(self):
        client, _ = build(limit=1)
        assert client.post("/connections", json=CONNECT, headers=AUTH1).status_code == 201
        limited = client.post("/connections", json={**CONNECT, "label": "second"}, headers=AUTH1)
        assert limited.status_code == 429 and int(limited.headers["retry-after"]) >= 1 and "Too many requests" in limited.json()["error"]


class TestRequestValidation:
    @pytest.mark.parametrize(
        "body, fields",
        [
            ({**CONNECT, "label": "   "}, ["label"]),
            ({**CONNECT, "label": "x" * 121}, ["label"]),
            ({"authMethod": "api_key", "label": "l", "credentials": {}}, ["providerId"]),
            ({**CONNECT, "credentials": {"apiKey": 123}}, ["credentials.apiKey"]),
            ({**CONNECT, "credentials": {"apiKey": "x" * 20_001}}, ["credentials.apiKey"]),
            ({**CONNECT, "credentials": {f"f{i}": "v" for i in range(21)}}, ["credentials"]),
            ({**CONNECT, "providerId": ""}, ["providerId"]),
        ],
    )
    def test_bad_bodies_are_a_400_naming_the_fields(self, body, fields):
        client, _ = build()
        response = client.post("/connections", json=body, headers=AUTH1)
        assert response.status_code == 400 and response.json() == {"error": "Invalid request", "fields": fields}

    def test_malformed_json_is_a_400(self):
        client, _ = build()
        response = client.post("/connections", content=b"{not json", headers={**AUTH1, "Content-Type": "application/json"})
        assert response.status_code == 400 and response.json()["error"] == "Invalid request"

    def test_absurd_ids_are_rejected_without_touching_the_database(self):
        client, _ = build()
        assert client.delete("/connections/" + "a" * 65, headers=AUTH1).status_code == 400

    def test_label_whitespace_is_trimmed(self):
        client, _ = build()
        assert client.post("/connections", json={**CONNECT, "label": "  padded  "}, headers=AUTH1).json()["connection"]["label"] == "padded"


class TestFailureModes:
    def test_unexpected_errors_never_leak_internals(self):
        client, service = build()

        async def explode(user):
            raise RuntimeError("internal detail: password=hunter2")

        service.list_connections = explode
        response = client.get("/connections", headers=AUTH1)
        assert response.status_code == 500 and response.json() == {"error": "Internal error"}

    def test_production_without_a_vault_key_fails_closed_but_only_for_this_feature(self, tmp_path):
        settings = Settings(environment="production", data_dir=tmp_path, database_url=f"sqlite:///{(tmp_path / 'x.db').as_posix()}", vault_key=None)
        client = TestClient(create_providers_app(settings=settings, user_dependency=fake_user), raise_server_exceptions=False)
        assert client.get("/catalog").status_code == 200  # nothing secret needed
        unavailable = client.get("/connections", headers=AUTH1)
        assert unavailable.status_code == 503 and "PROVIDER_VAULT_KEY" in unavailable.json()["error"]
        health = client.get("/health")
        assert health.status_code == 503 and health.json()["status"] == "degraded" and "PROVIDER_VAULT_KEY" in health.json()["reason"]
        assert not (tmp_path / "vault.key").exists()  # production never invents a key

    def test_unreachable_database_is_a_503(self, tmp_path):
        blocker = tmp_path / "file-not-dir"
        blocker.write_text("x")
        settings = Settings(environment="development", data_dir=tmp_path, database_url=f"sqlite:///{(blocker / 'db.sqlite').as_posix()}", vault_key=generate_key())
        client = TestClient(create_providers_app(settings=settings, user_dependency=fake_user), raise_server_exceptions=False)
        response = client.get("/connections", headers=AUTH1)
        assert response.status_code == 503 and response.json() == {"error": "The provider database is not available"}

    def test_development_bootstraps_its_own_database_and_key(self, tmp_path):
        data = tmp_path / "data"
        settings = Settings(environment="development", data_dir=data, database_url=f"sqlite:///{(data / 'lightos.db').as_posix()}")
        client = TestClient(create_providers_app(settings=settings, user_dependency=fake_user), raise_server_exceptions=False)
        assert client.get("/connections", headers=AUTH1).json() == {"connections": [], "gateway": "not_configured"}
        assert (data / "lightos.db").exists() and (data / "vault.key").exists()


class TestMountedInTheBackend:
    """The real ``main.app``: the sub-app must sit outside the admin-only global guard, yet stay login-protected."""

    def test_signed_in_non_admins_manage_their_own_connections(self, tmp_path, monkeypatch):
        monkeypatch.setenv("LIGHTOS_DATA_DIR", str(tmp_path))
        monkeypatch.setenv("PROVIDER_VAULT_KEY", generate_key())
        import auth
        import main

        async def verified(token):
            return auth.AuthedUser(id="user-9", email="nine@example.com", token=token)

        async def not_admin(user):
            raise HTTPException(status_code=403, detail="Admin role required")

        monkeypatch.setattr(auth, "_verify_token", verified)
        monkeypatch.setattr(auth, "_require_admin", not_admin)
        client = TestClient(main.app, raise_server_exceptions=False)
        headers = {"Authorization": "Bearer any"}

        assert client.post("/api/compile", json={}, headers=headers).status_code == 403  # existing routes: still admin-only
        assert client.get("/api/providers/connections", headers=headers).json() == {"connections": [], "gateway": "not_configured"}
        rejected = client.post("/api/providers/connections", json={**CONNECT, "providerId": "nope"}, headers=headers)
        assert rejected.status_code == 400 and rejected.json() == {"error": "Unknown provider or auth method"}  # reached the service, no 403

        assert client.get("/api/providers/connections").status_code == 401  # but never anonymous
        assert client.get("/api/providers/catalog").status_code == 200
        assert "providers" in client.get("/api/health").json()["services"]

    def test_invalid_sessions_are_rejected(self, tmp_path, monkeypatch):
        monkeypatch.setenv("LIGHTOS_DATA_DIR", str(tmp_path))
        monkeypatch.setenv("PROVIDER_VAULT_KEY", generate_key())
        import auth
        import main

        async def invalid(token):
            raise HTTPException(status_code=401, detail="Invalid token")

        monkeypatch.setattr(auth, "_verify_token", invalid)
        response = TestClient(main.app, raise_server_exceptions=False).get("/api/providers/connections", headers={"Authorization": "Bearer forged"})
        assert response.status_code == 401 and response.json() == {"error": "Invalid token"}
