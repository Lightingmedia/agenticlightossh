"""
Tests for the provider service's foundations: catalog, vault, rate limiter, database, HTTP layer (incl. the SSRF
guard) and the AWS SigV4 signer.

Run with:
  cd backend
  pytest test_providers_core.py -v
"""
import base64
import json
from datetime import datetime, timezone

import httpx
import pytest

from providers import catalog
from providers.catalog import get_auth_method, split_credentials
from providers.db import Database, DuplicateLabelError, public_view
from providers.http import Http, ProviderError, describe, is_public_ip
from providers.ratelimit import RateLimiter
from providers.settings import Settings
from providers.sigv4 import sign_v4
from providers.vault import Vault, VaultError, generate_key


# ─── Catalog ──────────────────────────────────────────────────────────────────

class TestCatalog:
    def test_loaded_from_typescript_export(self):
        ids = [p["id"] for p in catalog.PROVIDERS]
        assert len(ids) == len(set(ids)) == 23
        for required in ("aws", "gcp", "azure", "coreweave", "nvidia_api_catalog", "oci", "ibm", "general_compute"):
            assert required in ids

    def test_get_auth_method(self):
        assert get_auth_method("aws", "assume_role")["recommended"] is True
        assert get_auth_method("aws", "nope") is None
        assert get_auth_method("nope", "x") is None

    def test_split_separates_secrets_from_account_refs(self):
        method = get_auth_method("azure", "service_principal")
        r = split_credentials(method, {"tenantId": "t", "subscriptionId": "s", "clientId": "c", "clientSecret": "shh"})
        assert r.secret == {"clientSecret": "shh"}
        assert r.account_ref == {"tenantId": "t", "subscriptionId": "s", "clientId": "c"}
        assert r.missing == [] and r.invalid == []

    def test_split_reports_missing_and_pattern_invalid(self):
        r = split_credentials(get_auth_method("aws", "assume_role"), {"roleArn": "not-an-arn", "region": "us-east-1"})
        assert "roleArn" in r.invalid
        assert "externalId" in r.missing

    def test_split_trims_skips_empty_optional_and_ignores_unknown_keys(self):
        method = get_auth_method("coreweave", "cks_token")
        r = split_credentials(method, {"apiServer": "  https://k8s.example.com  ", "token": " tok ", "namespace": "  ", "evil": "x"})
        assert r.account_ref == {"apiServer": "https://k8s.example.com"}
        assert r.secret == {"token": "tok"}
        assert r.missing == [] and r.invalid == []

    def test_split_rejects_overlong_values(self):
        r = split_credentials(get_auth_method("lambda", "api_key"), {"apiKey": "x" * (catalog.MAX_FIELD_LENGTH + 1)})
        assert r.invalid == ["apiKey"] and r.secret == {}


# ─── Vault ────────────────────────────────────────────────────────────────────

class TestVault:
    def test_roundtrip(self):
        vault = Vault(generate_key())
        blob = vault.encrypt('{"apiKey":"secret"}', aad="row-1")
        assert blob.startswith("v1.") and "secret" not in blob
        assert vault.decrypt(blob, aad="row-1") == '{"apiKey":"secret"}'

    def test_nonce_makes_every_blob_different(self):
        vault = Vault(generate_key())
        assert vault.encrypt("same", aad="a") != vault.encrypt("same", aad="a")

    def test_blob_is_bound_to_its_row(self):
        vault = Vault(generate_key())
        blob = vault.encrypt("x", aad="row-1")
        with pytest.raises(VaultError):
            vault.decrypt(blob, aad="row-2")

    def test_tampering_is_detected(self):
        vault = Vault(generate_key())
        version, key_id, payload = vault.encrypt("x", aad="r").split(".", 2)
        raw = bytearray(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
        raw[-1] ^= 1
        tampered = f"{version}.{key_id}.{base64.urlsafe_b64encode(bytes(raw)).rstrip(b'=').decode()}"
        with pytest.raises(VaultError):
            vault.decrypt(tampered, aad="r")

    @pytest.mark.parametrize("garbage", ["", "v1", "v1.abcd", "v2.abcd.AAAA", "not a blob at all"])
    def test_garbage_blobs_raise_vault_error(self, garbage):
        with pytest.raises(VaultError):
            Vault(generate_key()).decrypt(garbage, aad="r")

    def test_wrong_key_cannot_decrypt(self):
        blob = Vault(generate_key()).encrypt("x", aad="r")
        with pytest.raises(VaultError):
            Vault(generate_key()).decrypt(blob, aad="r")

    def test_rotation_old_key_stays_readable(self):
        old, new = generate_key(), generate_key()
        blob = Vault(old).encrypt("payload", aad="r")
        rotated = Vault(new, [old])
        assert rotated.decrypt(blob, aad="r") == "payload"
        assert not rotated.is_current(blob)
        fresh = rotated.encrypt("payload", aad="r")
        assert rotated.is_current(fresh) and Vault(new).decrypt(fresh, aad="r") == "payload"

    @pytest.mark.parametrize("bad", ["", "short", base64.urlsafe_b64encode(b"x" * 16).decode(), "!!!not-base64!!!"])
    def test_bad_keys_are_rejected(self, bad):
        with pytest.raises(VaultError):
            Vault(bad)

    def test_production_requires_a_configured_key(self, tmp_path):
        settings = Settings(environment="production", data_dir=tmp_path, vault_key=None)
        with pytest.raises(VaultError, match="PROVIDER_VAULT_KEY"):
            Vault.from_settings(settings)
        assert not (tmp_path / "vault.key").exists()

    def test_development_creates_and_reuses_a_key_file(self, tmp_path):
        settings = Settings(environment="development", data_dir=tmp_path / "data", vault_key=None)
        blob = Vault.from_settings(settings).encrypt("x", aad="r")
        assert (tmp_path / "data" / "vault.key").exists()
        assert Vault.from_settings(settings).decrypt(blob, aad="r") == "x"  # same key on the next start


# ─── Rate limiter ─────────────────────────────────────────────────────────────

class TestRateLimiter:
    def test_blocks_after_the_limit_and_recovers(self):
        now = [0.0]
        limiter = RateLimiter(3, window_seconds=60, clock=lambda: now[0])
        assert [limiter.check("u") for _ in range(3)] == [0.0, 0.0, 0.0]
        wait = limiter.check("u")
        assert 0 < wait <= 60
        assert limiter.check("other-user") == 0.0  # keyed per user
        now[0] = 61
        assert limiter.check("u") == 0.0


# ─── Database ─────────────────────────────────────────────────────────────────

def _row(db: Database, user="u1", provider="lambda", label="primary", **kw):
    from providers.db import new_id

    cid = kw.pop("connection_id", new_id())
    return db.insert_connection(
        connection_id=cid, user_id=user, provider_id=provider, auth_method="api_key", label=label,
        account_ref=kw.pop("account_ref", {}), identity=kw.pop("identity", "id"), status=kw.pop("status", "connected"),
        status_message=None, validation_mode="direct", secret_blob=kw.pop("secret_blob", "blob"), last_validated_at=None,
    )


class TestDatabase:
    def test_insert_list_get_update_delete(self):
        db = Database("sqlite://")
        db.create_schema()
        created = _row(db, account_ref={"region": "us-east-1"})
        assert created["account_ref"] == {"region": "us-east-1"} and created["launch_enabled"] is False
        assert "secret_blob" not in created
        assert [c["id"] for c in db.list_connections("u1")] == [created["id"]]
        assert db.get_connection("u1", created["id"])["secret_blob"] == "blob"
        updated = db.update_connection("u1", created["id"], status="error", status_message="boom")
        assert updated["status"] == "error" and updated["status_message"] == "boom"
        assert db.delete_connection("u1", created["id"]) is True
        assert db.delete_connection("u1", created["id"]) is False
        assert db.list_connections("u1") == []

    def test_users_cannot_see_or_touch_each_others_rows(self):
        db = Database("sqlite://")
        db.create_schema()
        mine = _row(db, user="alice")
        assert db.list_connections("bob") == []
        assert db.get_connection("bob", mine["id"]) is None
        assert db.update_connection("bob", mine["id"], status="error") is None
        assert db.delete_connection("bob", mine["id"]) is False
        assert db.count_connections("alice") == 1 and db.count_connections("bob") == 0

    def test_label_is_unique_per_user_and_provider(self):
        db = Database("sqlite://")
        db.create_schema()
        _row(db, label="prod")
        with pytest.raises(DuplicateLabelError):
            _row(db, label="prod")
        _row(db, label="prod", provider="runpod")  # different provider is fine
        _row(db, label="prod", user="u2")  # different user is fine

    def test_other_integrity_errors_are_not_mistaken_for_duplicates(self):
        db = Database("sqlite://")
        db.create_schema()
        with pytest.raises(Exception) as err:
            _row(db, status="bogus")
        assert not isinstance(err.value, DuplicateLabelError)

    def test_events_and_secret_iteration(self):
        db = Database("sqlite://")
        db.create_schema()
        row = _row(db)
        db.add_event(user_id="u1", provider_id="lambda", action="connect", ok=True, message="x" * 900, connection_id=row["id"])
        events = db.list_events("u1")
        assert len(events) == 1 and len(events[0]["message"]) == 400
        assert db.list_events("u2") == []
        assert list(db.iter_secrets()) == [(row["id"], "blob")]
        db.set_secret_blob(row["id"], "newblob")
        assert list(db.iter_secrets()) == [(row["id"], "newblob")]

    def test_public_view_never_exposes_the_secret(self):
        db = Database("sqlite://")
        db.create_schema()
        row = _row(db)
        assert "secret_blob" not in public_view(db.get_connection("u1", row["id"]))

    def test_file_database_creates_its_directory(self, tmp_path):
        db = Database(f"sqlite:///{(tmp_path / 'nested' / 'x.db').as_posix()}")
        db.create_schema()
        db.ping()
        assert (tmp_path / "nested" / "x.db").exists()


# ─── HTTP layer ───────────────────────────────────────────────────────────────

def _transport(handler):
    return httpx.MockTransport(handler)


class TestDescribe:
    @pytest.mark.parametrize(
        "body, expected",
        [
            ({"error": {"message": "Invalid API Key"}}, ": Invalid API Key"),
            ({"error": "auth_error", "msg": "This action requires login."}, ": This action requires login."),
            ({"errorMessage": "Provided API key could not be found."}, ": Provided API key could not be found."),
            ({"requestStatus": {"statusDescription": "Invalid API key."}}, ": Invalid API key."),
            ({"errors": [{"code": "missing_field", "message": "user token required"}]}, ": user token required"),
            ({"detail": "missing bearer token", "title": "Unauthorized"}, ": missing bearer token"),
            ({"error_description": "AADSTS7000215: Invalid client secret"}, ": AADSTS7000215: Invalid client secret"),
            ({"nothing": "useful"}, ""),
        ],
    )
    def test_extracts_provider_messages(self, body, expected):
        assert describe(body, json.dumps(body)) == expected

    def test_xml_message_and_truncation(self):
        assert describe(None, "<E><Message>The security token is invalid.</Message></E>") == ": The security token is invalid."
        assert len(describe({"message": "x" * 1000}, "")) == 2 + 240

    def test_whitespace_is_collapsed(self):
        assert describe({"message": "a\n\n  b\tc"}, "") == ": a b c"


class TestHttp:
    @pytest.mark.asyncio
    async def test_success_parses_json(self):
        http = Http(transport=_transport(lambda r: httpx.Response(200, json={"ok": 1})))
        result = await http.request("GET", "https://api.example.com/x")
        assert result.status == 200 and result.json == {"ok": 1}

    @pytest.mark.asyncio
    async def test_error_status_becomes_a_clean_provider_error(self):
        http = Http(transport=_transport(lambda r: httpx.Response(401, json={"error": {"message": "Invalid API Key"}})))
        with pytest.raises(ProviderError) as err:
            await http.request("GET", "https://api.groq.com/openai/v1/models", headers={"Authorization": "Bearer sekret"})
        assert err.value.status == 401
        assert err.value.message == "api.groq.com returned 401: Invalid API Key"
        assert "sekret" not in err.value.message

    @pytest.mark.asyncio
    async def test_network_failures_never_leak_details(self):
        def boom(request):
            raise httpx.ConnectError("secret detail from the socket layer", request=request)

        with pytest.raises(ProviderError) as err:
            await Http(transport=_transport(boom)).request("GET", "https://api.example.com/")
        assert err.value.message == "Could not reach api.example.com"

    @pytest.mark.asyncio
    async def test_timeouts_are_reported(self):
        def slow(request):
            raise httpx.ReadTimeout("slow", request=request)

        with pytest.raises(ProviderError, match="Timed out contacting api.example.com"):
            await Http(transport=_transport(slow)).request("GET", "https://api.example.com/")

    @pytest.mark.asyncio
    async def test_response_bodies_are_bounded(self, monkeypatch):
        monkeypatch.setattr("providers.http.MAX_BODY_BYTES", 1000)
        http = Http(transport=_transport(lambda r: httpx.Response(200, content=b"a" * 5000)))
        assert len((await http.request("GET", "https://api.example.com/")).text) == 1000

    @pytest.mark.asyncio
    async def test_redirects_are_not_followed(self):
        http = Http(transport=_transport(lambda r: httpx.Response(302, headers={"Location": "http://169.254.169.254/"})))
        with pytest.raises(ProviderError) as err:
            await http.request("GET", "https://api.example.com/")
        assert err.value.status == 302


def _resolver(*addresses):
    async def resolve(host, port):
        return list(addresses)

    return resolve


class TestSsrfGuard:
    @pytest.mark.parametrize("ip", ["127.0.0.1", "10.0.0.5", "172.16.3.4", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fe80::1", "fd00::1", "::ffff:10.0.0.1"])
    def test_non_public_addresses(self, ip):
        assert is_public_ip(ip) is False

    @pytest.mark.parametrize("ip", ["93.184.216.34", "8.8.8.8", "2606:4700:4700::1111"])
    def test_public_addresses(self, ip):
        assert is_public_ip(ip) is True

    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "url, addresses, message",
        [
            ("http://k8s.example.com/", ["93.184.216.34"], "Only https"),
            ("https://user:pw@k8s.example.com/", ["93.184.216.34"], "Credentials inside"),
            ("https://k8s.example.com:notaport/", ["93.184.216.34"], "invalid port"),
            ("https://k8s.example.com/", ["10.0.0.5"], "private or reserved"),
            ("https://k8s.example.com/", ["93.184.216.34", "169.254.169.254"], "private or reserved"),  # one bad record is enough
            ("https://metadata.internal/", ["127.0.0.1"], "private or reserved"),
            ("https://k8s.example.com/", [], "Could not resolve"),
        ],
    )
    async def test_rejected(self, url, addresses, message):
        http = Http(transport=_transport(lambda r: pytest.fail("must not be sent")), resolver=_resolver(*addresses))
        with pytest.raises(ProviderError, match=message):
            await http.request("GET", url, public_only=True)

    @pytest.mark.asyncio
    async def test_connection_is_pinned_to_the_checked_address(self):
        seen = {}

        def handler(request):
            seen.update(host=request.url.host, port=request.url.port, header=request.headers["host"], sni=request.extensions.get("sni_hostname"), path=request.url.raw_path.decode())
            return httpx.Response(200, json={})

        http = Http(transport=_transport(handler), resolver=_resolver("93.184.216.34"))
        await http.request("GET", "https://k8s.example.com:6443/api/v1/nodes?limit=1", public_only=True)
        assert seen == {"host": "93.184.216.34", "port": 6443, "header": "k8s.example.com:6443", "sni": "k8s.example.com", "path": "/api/v1/nodes?limit=1"}

    @pytest.mark.asyncio
    async def test_ipv6_is_bracketed_and_default_port_header_is_bare(self):
        seen = {}

        def handler(request):
            seen.update(host=request.url.host, header=request.headers["host"])
            return httpx.Response(200, json={})

        http = Http(transport=_transport(handler), resolver=_resolver("2606:4700:4700::1111"))
        await http.request("GET", "https://k8s.example.com/", public_only=True)
        assert seen == {"host": "2606:4700:4700::1111", "header": "k8s.example.com"}

    @pytest.mark.asyncio
    async def test_private_hosts_can_be_allowed_explicitly(self):
        http = Http(transport=_transport(lambda r: httpx.Response(200, json={"ok": True})), resolver=_resolver("10.0.0.5"), allow_private_hosts=True)
        assert (await http.request("GET", "https://k8s.corp.local/", public_only=True)).json == {"ok": True}

    @pytest.mark.asyncio
    async def test_ip_literal_endpoints_skip_sni_but_are_still_checked(self):
        seen = {}

        def handler(request):
            seen["sni"] = request.extensions.get("sni_hostname")
            return httpx.Response(200, json={})

        public = Http(transport=_transport(handler), resolver=_resolver("93.184.216.34"))
        await public.request("GET", "https://93.184.216.34/", public_only=True)
        assert seen["sni"] is None
        private = Http(transport=_transport(handler), resolver=_resolver("10.0.0.1"))
        with pytest.raises(ProviderError, match="private or reserved"):
            await private.request("GET", "https://10.0.0.1/", public_only=True)


# ─── SigV4 ────────────────────────────────────────────────────────────────────

class TestSigV4:
    def test_matches_the_aws_get_vanilla_test_vector(self):
        headers = sign_v4(
            method="GET", url="https://example.amazonaws.com/", access_key="AKIDEXAMPLE",
            secret_key="wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY", region="us-east-1", service="service",
            now=datetime(2015, 8, 30, 12, 36, 0, tzinfo=timezone.utc),
        )
        assert headers["x-amz-date"] == "20150830T123600Z"
        assert headers["Authorization"] == (
            "AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/service/aws4_request, "
            "SignedHeaders=host;x-amz-date, "
            "Signature=5fa00fa31553b73ebf1942676e86291e8372ff2a2260956d9b8aae1d763fbf31"
        )

    def test_session_token_is_signed_and_returned(self):
        headers = sign_v4(
            method="POST", url="https://sts.amazonaws.com/", access_key="AK", secret_key="SK", session_token="TOKEN",
            region="us-east-1", service="sts", headers={"Content-Type": "application/x-www-form-urlencoded; charset=utf-8"},
            body=b"Action=GetCallerIdentity", now=datetime(2026, 1, 2, 3, 4, 5, tzinfo=timezone.utc),
        )
        assert headers["x-amz-security-token"] == "TOKEN"
        assert "SignedHeaders=content-type;host;x-amz-date;x-amz-security-token" in headers["Authorization"]

    def test_agrees_with_botocore(self):
        pytest.importorskip("botocore")
        from botocore.auth import SigV4Auth
        from botocore.awsrequest import AWSRequest
        from botocore.credentials import Credentials

        body = b"Action=DescribeInstances&Version=2016-11-15&MaxResults=1000&Filter.1.Name=instance-type&Filter.1.Value.1=p%2A"
        content_type = "application/x-www-form-urlencoded; charset=utf-8"
        for token in (None, "FwoGZXIvYXdzEBYaDExampleSessionToken"):
            request = AWSRequest(method="POST", url="https://ec2.us-west-2.amazonaws.com/", data=body, headers={"Content-Type": content_type})
            auth = SigV4Auth(Credentials("AKIDEXAMPLE", "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY", token), "ec2", "us-west-2")
            auth.add_auth(request)
            # botocore stamps "now"; re-sign deterministically by pinning its clock
            ours = sign_v4(
                method="POST", url="https://ec2.us-west-2.amazonaws.com/", access_key="AKIDEXAMPLE",
                secret_key="wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY", session_token=token, region="us-west-2", service="ec2",
                headers={"Content-Type": content_type}, body=body, now=datetime.strptime(request.headers["X-Amz-Date"], "%Y%m%dT%H%M%SZ").replace(tzinfo=timezone.utc),
            )
            assert ours["Authorization"] == request.headers["Authorization"]
            assert ours["x-amz-date"] == request.headers["X-Amz-Date"]

    def test_query_string_is_canonicalised(self):
        a = sign_v4(method="GET", url="https://x.amazonaws.com/?b=2&a=1", access_key="A", secret_key="S", region="r", service="s", now=datetime(2026, 1, 1, tzinfo=timezone.utc))
        b = sign_v4(method="GET", url="https://x.amazonaws.com/?a=1&b=2", access_key="A", secret_key="S", region="r", service="s", now=datetime(2026, 1, 1, tzinfo=timezone.utc))
        assert a["Authorization"] == b["Authorization"]
