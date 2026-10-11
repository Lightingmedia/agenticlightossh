"""
Tests for the provider service layer: connect / test / inventory / disconnect semantics, credential handling,
isolation between users, rate limiting and delegation to the Aurora runtime gateway.

Run with:
  cd backend
  pytest test_providers_service.py -v
"""
import json
from typing import Optional

import httpx
import pytest

from providers.db import Database
from providers.ratelimit import RateLimiter
from providers.service import ApiError, ProviderService, User, effective_validation, public_catalog, reencrypt_all
from providers.settings import Settings
from providers.catalog import get_provider
from providers.vault import Vault, generate_key
from testsupport_providers import FakeAdapter, FakeInternet

U1 = User("user-1", "one@example.com")
U2 = User("user-2", "two@example.com")
SECRET = "lambda-secret-key-0123"
LAMBDA = ("lambda", "api_key")


@pytest.fixture
def make_service():
    def build(adapters=None, *, settings: Optional[Settings] = None, internet: Optional[FakeInternet] = None, limit: int = 1000, vault: Optional[Vault] = None) -> ProviderService:
        db = Database("sqlite://")
        db.create_schema()
        net = internet or FakeInternet()
        return ProviderService(
            db=db,
            vault=vault or Vault(generate_key()),
            settings=settings or Settings(),
            http=net.http(),
            adapters=adapters if adapters is not None else {"lambda": FakeAdapter().adapter},
            rate_limiter=RateLimiter(limit),
        )

    return build


async def connect(svc, user=U1, creds=None, label="primary", provider=LAMBDA):
    return await svc.connect(user, provider[0], provider[1], label, creds if creds is not None else {"apiKey": SECRET})


# ─── connect ──────────────────────────────────────────────────────────────────

class TestConnect:
    @pytest.mark.asyncio
    async def test_stores_the_connection_with_the_credential_encrypted(self, make_service):
        fake = FakeAdapter()
        svc = make_service({"lambda": fake.adapter})
        row = await connect(svc)
        assert row["status"] == "connected" and row["identity"] == "acct-1" and row["validation_mode"] == "direct"
        assert row["launch_enabled"] is False and row["account_ref"] == {} and row["last_validated_at"]
        assert "secret_blob" not in row and SECRET not in json.dumps(row)
        stored = svc.db.get_connection(U1.id, row["id"])
        assert SECRET not in stored["secret_blob"]
        assert json.loads(svc.vault.decrypt(stored["secret_blob"], aad=row["id"])) == {"apiKey": SECRET}
        assert fake.validate_calls == [{"apiKey": SECRET}]

    @pytest.mark.asyncio
    async def test_non_secret_fields_stay_readable_and_secrets_go_to_the_vault(self, make_service):
        svc = make_service({"azure": FakeAdapter().adapter})
        creds = {"tenantId": "11111111-2222-3333-4444-555555555555", "subscriptionId": "s-1", "clientId": "c-1", "clientSecret": "azure-client-secret"}
        row = await svc.connect(U1, "azure", "service_principal", "az", creds)
        assert row["account_ref"] == {"tenantId": creds["tenantId"], "subscriptionId": "s-1", "clientId": "c-1"}
        assert json.loads(svc.vault.decrypt(svc.db.get_connection(U1.id, row["id"])["secret_blob"], aad=row["id"])) == {"clientSecret": "azure-client-secret"}

    @pytest.mark.asyncio
    async def test_failed_validation_stores_nothing_and_scrubs_the_secret_from_the_message(self, make_service):
        svc = make_service({"lambda": FakeAdapter(error=f"cloud.lambda.ai returned 401: key {SECRET} is invalid").adapter})
        with pytest.raises(ApiError) as err:
            await connect(svc)
        assert err.value.status == 422 and err.value.body["status"] == "error"
        assert SECRET not in err.value.body["error"] and "***" in err.value.body["error"]
        assert svc.db.list_connections(U1.id) == []
        event = svc.db.list_events(U1.id)[0]
        assert (event["action"], event["ok"]) == ("connect", False) and SECRET not in (event["message"] or "")

    @pytest.mark.asyncio
    async def test_masked_echoes_of_the_key_are_scrubbed_too(self, make_service):
        # SambaNova answers "Incorrect API key provided: 9c6eb7*****b5f7" - a masked copy of what was typed
        key = "9c6eb7aa55d1f0e2c4b3a1b5f7"
        svc = make_service({"lambda": FakeAdapter(error="api.sambanova.ai returned 401: Incorrect API key provided: 9c6eb7*****b5f7.").adapter})
        with pytest.raises(ApiError) as err:
            await connect(svc, creds={"apiKey": key})
        message = err.value.body["error"]
        assert message.startswith("api.sambanova.ai returned 401: Incorrect API key provided: ")  # still useful
        assert "9c6eb7" not in message and "b5f7" not in message
        stored = svc.db.list_events(U1.id)[0]["message"] or ""
        assert "9c6eb7" not in stored and "b5f7" not in stored

    @pytest.mark.asyncio
    async def test_scrubbing_leaves_ordinary_words_alone(self, make_service):
        # the key starts with "lambda-" and ends in "0123", both of which are perfectly ordinary text elsewhere
        svc = make_service({"lambda": FakeAdapter(error="cloud.lambda.ai returned 401: lambda API key 0123 rejected").adapter})
        with pytest.raises(ApiError) as err:
            await connect(svc, creds={"apiKey": "lambda-secret-key-0123"})
        assert err.value.body["error"] == "cloud.lambda.ai returned 401: lambda API key 0123 rejected"

    @pytest.mark.parametrize(
        "message, expected",
        [
            ("echoed in full: tok_live_abcdef123456 end", "echoed in full: *** end"),
            ("masked: tok_li******3456.", "masked: ***" + "******" + "***."),  # head and tail replaced, the mask itself kept
            ("masked: tok_li••••3456", "masked: ***••••***"),
            ("nothing to hide here", "nothing to hide here"),
        ],
    )
    def test_scrub_unit(self, message, expected):
        from providers.service import _scrub

        assert _scrub(message, ["tok_live_abcdef123456"]) == expected

    def test_scrub_ignores_short_values_and_is_length_capped(self):
        from providers.service import _scrub

        assert _scrub("a b c", ["a", "b"]) == "a b c"  # too short to mask without wrecking the message
        assert len(_scrub("x" * 1000, [])) == 400

    @pytest.mark.asyncio
    async def test_unexpected_adapter_errors_never_leak_internals(self, make_service):
        svc = make_service({"lambda": FakeAdapter(boom=True).adapter})
        with pytest.raises(ApiError) as err:
            await connect(svc)
        assert err.value.status == 422 and err.value.body["error"] == "Unexpected response from the provider"

    @pytest.mark.asyncio
    async def test_duplicate_label_is_rejected_before_calling_the_provider(self, make_service):
        fake = FakeAdapter()
        svc = make_service({"lambda": fake.adapter})
        await connect(svc)
        with pytest.raises(ApiError) as err:
            await connect(svc)
        assert err.value.status == 409 and len(fake.validate_calls) == 1
        await connect(svc, label="secondary")  # different label is fine
        await connect(svc, user=U2)  # different user is fine

    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "provider_id, method, status",
        [("nope", "api_key", 400), ("lambda", "nope", 400), ("lightos_gateway", "node_enrollment", 400)],
    )
    async def test_unknown_providers_and_methods(self, make_service, provider_id, method, status):
        svc = make_service()
        with pytest.raises(ApiError) as err:
            await svc.connect(U1, provider_id, method, "x", {"clusterName": "a", "apiKey": "k"})
        assert err.value.status == status

    @pytest.mark.asyncio
    async def test_missing_and_invalid_fields_are_listed_without_calling_the_provider(self, make_service):
        fake = FakeAdapter()
        svc = make_service({"aws": fake.adapter})
        with pytest.raises(ApiError) as err:
            await svc.connect(U1, "aws", "assume_role", "aws", {"roleArn": "not-an-arn", "region": "us-east-1"})
        assert err.value.status == 400 and err.value.body["invalid"] == ["roleArn"] and err.value.body["missing"] == ["externalId"]
        assert fake.validate_calls == []

    @pytest.mark.asyncio
    async def test_connection_limit(self, make_service):
        svc = make_service(settings=Settings(max_connections_per_user=2))
        await connect(svc, label="a")
        await connect(svc, label="b")
        with pytest.raises(ApiError) as err:
            await connect(svc, label="c")
        assert err.value.status == 409 and "limit" in err.value.body["error"]
        await connect(svc, user=U2, label="a")  # the cap is per user

    @pytest.mark.asyncio
    async def test_rate_limit(self, make_service):
        svc = make_service(limit=2)
        await connect(svc, label="a")
        await connect(svc, label="b")
        with pytest.raises(ApiError) as err:
            await connect(svc, label="c")
        assert err.value.status == 429 and int(err.value.headers["Retry-After"]) >= 1
        await connect(svc, user=U2, label="a")  # per-user bucket

    @pytest.mark.asyncio
    async def test_message_from_the_adapter_is_kept(self, make_service):
        svc = make_service({"lambda": FakeAdapter(message="Key verified; organisation not checked.").adapter})
        assert (await connect(svc))["status_message"] == "Key verified; organisation not checked."

    @pytest.mark.asyncio
    async def test_kubernetes_keeps_the_endpoint_in_clear_and_the_token_in_the_vault(self, make_service):
        svc = make_service({"kubernetes": FakeAdapter().adapter})
        row = await svc.connect(U1, "kubernetes", "service_account_token", "k", {"apiServer": "https://k8s.example.com", "token": "k8s-token-value", "namespace": ""})
        assert row["account_ref"] == {"apiServer": "https://k8s.example.com"}  # empty optional fields are dropped
        blob = svc.db.get_connection(U1.id, row["id"])["secret_blob"]
        assert "k8s-token-value" not in blob and json.loads(svc.vault.decrypt(blob, aad=row["id"])) == {"token": "k8s-token-value"}


# ─── test / inventory / disconnect ────────────────────────────────────────────

class TestLifecycle:
    @pytest.mark.asyncio
    async def test_retest_revalidates_with_the_stored_credential(self, make_service):
        fake = FakeAdapter()
        svc = make_service({"lambda": fake.adapter})
        row = await connect(svc)
        fake.identity = "acct-renamed"
        again = await svc.test(U1, row["id"])
        assert again["status"] == "connected" and again["identity"] == "acct-renamed"
        assert fake.validate_calls[-1] == {"apiKey": SECRET}
        assert [e["action"] for e in svc.db.list_events(U1.id)] == ["test", "connect"]

    @pytest.mark.asyncio
    async def test_retest_failure_keeps_the_connection_but_marks_it_failed(self, make_service):
        fake = FakeAdapter()
        svc = make_service({"lambda": fake.adapter})
        row = await connect(svc)
        fake.error = f"lambda returned 401: {SECRET} revoked"
        failed = await svc.test(U1, row["id"])
        assert failed["status"] == "error" and SECRET not in failed["status_message"]
        assert failed["identity"] == "acct-1" and failed["last_validated_at"] == row["last_validated_at"]  # last good values kept
        assert svc.db.list_connections(U1.id)[0]["status"] == "error"

    @pytest.mark.asyncio
    async def test_inventory(self, make_service):
        svc = make_service({"lambda": FakeAdapter(items=[{"kind": "offer", "id": "x", "name": "x"}]).adapter})
        row = await connect(svc)
        result = await svc.inventory(U1, row["id"])
        assert result["items"] == [{"kind": "offer", "id": "x", "name": "x"}] and result["fetchedAt"].endswith("Z")
        assert svc.db.list_events(U1.id)[0]["message"] == "1 items"

    @pytest.mark.asyncio
    async def test_inventory_provider_errors_become_502_without_the_secret(self, make_service):
        fake = FakeAdapter()
        svc = make_service({"lambda": fake.adapter})
        row = await connect(svc)
        fake.inventory_error = f"lambda returned 500 for {SECRET}"
        with pytest.raises(ApiError) as err:
            await svc.inventory(U1, row["id"])
        assert err.value.status == 502 and SECRET not in err.value.body["error"]
        assert svc.db.list_events(U1.id)[0]["ok"] is False
        fake.boom = True
        with pytest.raises(ApiError) as err:
            await svc.inventory(U1, row["id"])
        assert err.value.status == 502 and err.value.body["error"] == "Unexpected response from the provider"

    @pytest.mark.asyncio
    async def test_disconnect_deletes_the_row_and_the_credential(self, make_service):
        svc = make_service()
        row = await connect(svc)
        assert await svc.disconnect(U1, row["id"]) == {"ok": True}
        assert svc.db.list_connections(U1.id) == [] and svc.db.get_connection(U1.id, row["id"]) is None
        with pytest.raises(ApiError) as err:
            await svc.disconnect(U1, row["id"])
        assert err.value.status == 404
        assert svc.db.list_events(U1.id)[0]["action"] == "disconnect"  # the audit trail outlives the connection

    @pytest.mark.asyncio
    async def test_users_cannot_reach_each_others_connections(self, make_service):
        svc = make_service()
        row = await connect(svc, user=U1)
        for call in (svc.test, svc.inventory, svc.disconnect):
            with pytest.raises(ApiError) as err:
                await call(U2, row["id"])
            assert err.value.status == 404 and err.value.body["error"] == "Not found"
        assert (await svc.list_connections(U2))["connections"] == []
        assert len((await svc.list_connections(U1))["connections"]) == 1
        assert svc.db.list_events(U2.id) == []

    @pytest.mark.asyncio
    async def test_unknown_ids_are_404(self, make_service):
        svc = make_service()
        with pytest.raises(ApiError) as err:
            await svc.test(U1, "00000000-0000-0000-0000-000000000000")
        assert err.value.status == 404

    @pytest.mark.asyncio
    async def test_listing_reports_the_gateway_state(self, make_service):
        assert (await make_service().list_connections(U1))["gateway"] == "not_configured"
        configured = make_service(settings=Settings(gateway_url="https://aurora.example.com", gateway_token="gw"))
        assert (await configured.list_connections(U1))["gateway"] == "configured"

    @pytest.mark.asyncio
    async def test_events_newest_first(self, make_service):
        svc = make_service()
        row = await connect(svc)
        await svc.test(U1, row["id"])
        assert [e["action"] for e in (await svc.events(U1))["events"]] == ["test", "connect"]


# ─── credential vault integration ─────────────────────────────────────────────

class TestVaultIntegration:
    @pytest.mark.asyncio
    async def test_a_tampered_or_moved_blob_is_refused(self, make_service):
        svc = make_service()
        a = await connect(svc, label="a")
        b = await connect(svc, label="b")
        # copy a's ciphertext onto b's row: the row id is bound in as associated data, so it must not decrypt
        svc.db.set_secret_blob(b["id"], svc.db.get_connection(U1.id, a["id"])["secret_blob"])
        with pytest.raises(ApiError) as err:
            await svc.test(U1, b["id"])
        assert err.value.status == 500 and err.value.body["error"] == "Stored credential could not be read"
        assert (await svc.test(U1, a["id"]))["status"] == "connected"

    @pytest.mark.asyncio
    async def test_a_different_vault_key_cannot_read_stored_credentials(self, make_service):
        svc = make_service()
        row = await connect(svc)
        svc.vault = Vault(generate_key())
        with pytest.raises(ApiError) as err:
            await svc.inventory(U1, row["id"])
        assert err.value.status == 500

    @pytest.mark.asyncio
    async def test_key_rotation_with_reencrypt(self, make_service):
        old_key, new_key = generate_key(), generate_key()
        svc = make_service(vault=Vault(old_key))
        row = await connect(svc)
        old_blob = svc.db.get_connection(U1.id, row["id"])["secret_blob"]

        rotated = Vault(new_key, [old_key])
        assert reencrypt_all(svc.db, rotated) == {"reencrypted": 1, "already_current": 0}
        assert reencrypt_all(svc.db, rotated) == {"reencrypted": 0, "already_current": 1}
        new_blob = svc.db.get_connection(U1.id, row["id"])["secret_blob"]
        assert new_blob != old_blob and rotated.is_current(new_blob)

        svc.vault = Vault(new_key)  # the old key is no longer needed
        assert (await svc.test(U1, row["id"]))["status"] == "connected"


# ─── Aurora runtime gateway ───────────────────────────────────────────────────

GATEWAY = Settings(gateway_url="https://aurora.example.com/", gateway_token="gw-token")
NEBIUS = ("nebius", "service_account_key")
NEBIUS_CREDS = {"projectId": "p", "serviceAccountId": "sa", "publicKeyId": "k", "privateKeyPem": "-----BEGIN PRIVATE KEY-----\nMIIE\n-----END PRIVATE KEY-----"}


class TestGateway:
    @pytest.mark.asyncio
    async def test_without_a_gateway_the_credentials_are_stored_as_awaiting(self, make_service):
        svc = make_service({})
        row = await connect(svc, creds=NEBIUS_CREDS, provider=NEBIUS)
        assert row["status"] == "awaiting_gateway" and row["validation_mode"] == "gateway" and row["last_validated_at"] is None
        assert "Aurora runtime gateway" in row["status_message"]
        assert NEBIUS_CREDS["privateKeyPem"] not in svc.db.get_connection(U1.id, row["id"])["secret_blob"]

    @pytest.mark.asyncio
    async def test_validation_is_delegated_to_aurora(self, make_service):
        seen = {}

        def validate(request):
            seen.update(headers=dict(request.headers), body=json.loads(request.content))
            return httpx.Response(200, json={"ok": True, "identity": "nebius-sa"})

        net = FakeInternet().on("POST", "https://aurora.example.com/v1/providers/validate", validate)
        svc = make_service({}, settings=GATEWAY, internet=net)
        row = await connect(svc, creds=NEBIUS_CREDS, provider=NEBIUS)
        assert row["status"] == "connected" and row["identity"] == "nebius-sa" and row["last_validated_at"]
        assert seen["headers"]["authorization"] == "Bearer gw-token" and seen["headers"]["x-lightos-user-id"] == "user-1"
        assert seen["body"] == {"connectionId": None, "providerId": "nebius", "authMethod": "service_account_key", "credentials": NEBIUS_CREDS}

    @pytest.mark.asyncio
    async def test_retest_sends_the_connection_id(self, make_service):
        bodies = []
        net = FakeInternet().on("POST", "https://aurora.example.com/v1/providers/validate", lambda r: (bodies.append(json.loads(r.content)), httpx.Response(200, json={"ok": True}))[1])
        svc = make_service({}, settings=GATEWAY, internet=net)
        row = await connect(svc, creds=NEBIUS_CREDS, provider=NEBIUS)
        await svc.test(U1, row["id"])
        assert bodies[1]["connectionId"] == row["id"] and bodies[1]["credentials"] == NEBIUS_CREDS

    @pytest.mark.asyncio
    async def test_rejections_and_gateway_outages_fail_the_connect(self, make_service):
        net = FakeInternet().on("POST", "https://aurora.example.com/v1/providers/validate", {"ok": False, "message": "service account not found"})
        with pytest.raises(ApiError, match="service account not found") as err:
            await connect(make_service({}, settings=GATEWAY, internet=net), creds=NEBIUS_CREDS, provider=NEBIUS)
        assert err.value.status == 422
        down = FakeInternet().on("POST", "https://aurora.example.com/v1/providers/validate", (503, {"message": "gateway starting"}))
        with pytest.raises(ApiError, match="gateway starting"):
            await connect(make_service({}, settings=GATEWAY, internet=down), creds=NEBIUS_CREDS, provider=NEBIUS)

    @pytest.mark.asyncio
    async def test_inventory_is_read_through_aurora(self, make_service):
        seen = {}

        def inventory(request):
            seen.update(path=request.url.path, body=json.loads(request.content))
            return httpx.Response(200, json={"items": [{"kind": "node", "id": "n1", "name": "n1", "accelerator": "H200"}]})

        net = FakeInternet().on("POST", "https://aurora.example.com/v1/providers/validate", {"ok": True}).on("POST", "https://aurora.example.com/v1/providers/", inventory)
        svc = make_service({}, settings=GATEWAY, internet=net)
        row = await connect(svc, creds=NEBIUS_CREDS, provider=NEBIUS)
        assert (await svc.inventory(U1, row["id"]))["items"][0]["accelerator"] == "H200"
        assert seen["path"] == f"/v1/providers/{row['id']}/inventory" and seen["body"]["providerId"] == "nebius"

    @pytest.mark.asyncio
    async def test_inventory_without_a_gateway_is_a_clear_502(self, make_service):
        svc = make_service({})
        row = await connect(svc, creds=NEBIUS_CREDS, provider=NEBIUS)
        with pytest.raises(ApiError) as err:
            await svc.inventory(U1, row["id"])
        assert err.value.status == 502 and "gateway is not configured" in err.value.body["error"]

    def test_gateway_must_use_https_unless_it_is_localhost(self, make_service):
        assert make_service(settings=Settings(gateway_url="http://aurora.example.com", gateway_token="t")).gateway is None
        assert make_service(settings=Settings(gateway_url="http://localhost:9000", gateway_token="t")).gateway is not None
        assert make_service(settings=Settings(gateway_url="https://aurora.example.com", gateway_token=None)).gateway is None


# ─── catalog presentation ─────────────────────────────────────────────────────

class TestCatalogPresentation:
    def test_validation_mode_reflects_what_this_backend_can_do(self):
        by_id = {p["id"]: p["validation"] for p in public_catalog()}
        assert {by_id[i] for i in ("aws", "gcp", "azure", "coreweave", "ibm", "oci", "nvidia_ngc", "nvidia_api_catalog", "sambanova")} == {"direct"}
        assert {by_id[i] for i in ("nvidia_dgx_cloud_lepton", "nebius", "lightos_gateway")} == {"gateway"}
        assert len(by_id) == 23

    def test_the_static_catalog_is_not_mutated(self):
        public_catalog()
        assert get_provider("ibm")["validation"] == "gateway"  # the TypeScript-derived data keeps its own value
        assert effective_validation(get_provider("ibm")) == "direct"
