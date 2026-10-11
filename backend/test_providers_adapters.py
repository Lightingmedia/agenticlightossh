"""
Tests for the provider adapters, against a fake internet (no network). They check what each adapter sends - URLs,
signatures, bodies - and how it maps provider responses, plus the input validation that keeps user-supplied values out
of hostnames.

Run with:
  cd backend
  pytest test_providers_adapters.py -v
"""
import base64
import hashlib
import hmac
import json
import re

import httpx
import pytest
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec, padding, rsa

from providers.adapters import ADAPTERS, aws, azure, clouds, gcp, ibm, kubernetes, oci
from providers.http import ProviderError
from providers.settings import Settings
from testsupport_providers import FakeInternet, form


def b64d(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def rsa_key(bits: int = 2048) -> rsa.RSAPrivateKey:
    return rsa.generate_private_key(public_exponent=65537, key_size=bits)


def pem(key, fmt=serialization.PrivateFormat.PKCS8) -> str:
    return key.private_bytes(serialization.Encoding.PEM, fmt, serialization.NoEncryption()).decode()


# ─── registry ─────────────────────────────────────────────────────────────────

class TestRegistry:
    def test_every_direct_catalog_provider_has_an_adapter(self):
        from providers.catalog import PROVIDERS

        direct = {p["id"] for p in PROVIDERS if p["validation"] == "direct"}
        assert direct <= set(ADAPTERS)

    def test_providers_delegated_to_aurora_have_no_adapter(self):
        assert "nvidia_dgx_cloud_lepton" not in ADAPTERS and "nebius" not in ADAPTERS and "lightos_gateway" not in ADAPTERS
        assert {"ibm", "oci", "nvidia_ngc"} <= set(ADAPTERS)  # validated natively here

    def test_adapters_tolerate_missing_credentials_without_a_request(self):
        import asyncio

        net = FakeInternet()
        for adapter in ADAPTERS.values():
            with pytest.raises(ProviderError):
                asyncio.run(adapter.validate(net.ctx(), {}))
        assert net.requests == []


# ─── AWS ──────────────────────────────────────────────────────────────────────

STS = "https://sts.amazonaws.com/"
CALLER_XML = "<GetCallerIdentityResponse><GetCallerIdentityResult><Arn>arn:aws:iam::123456789012:user/lightos</Arn></GetCallerIdentityResult></GetCallerIdentityResponse>"
ASSUMED_XML = (
    "<AssumeRoleResponse><AssumeRoleResult><Credentials><AccessKeyId>ASIATEMP</AccessKeyId>"
    "<SecretAccessKey>tempsecret</SecretAccessKey><SessionToken>tok/en+==</SessionToken></Credentials></AssumeRoleResult></AssumeRoleResponse>"
)
DESCRIBE_XML = """<DescribeInstancesResponse xmlns="http://ec2.amazonaws.com/doc/2016-11-15/"><reservationSet><item><instancesSet>
<item><instanceId>i-0aaa</instanceId><instanceType>p5.48xlarge</instanceType><placement><availabilityZone>us-west-2a</availabilityZone></placement><instanceState><code>16</code><name>running</name></instanceState><groupSet><item><groupId>sg-1</groupId></item></groupSet></item>
<item><instanceId>i-0bbb</instanceId><instanceType>g5.xlarge</instanceType><placement><availabilityZone>us-west-2b</availabilityZone></placement><instanceState><name>stopped</name></instanceState></item>
<item><instanceId>i-0ccc</instanceId><instanceType>trn1.32xlarge</instanceType><instanceState><name>running</name></instanceState></item>
</instancesSet></item></reservationSet></DescribeInstancesResponse>"""


class TestAws:
    @pytest.mark.asyncio
    async def test_access_key_validation_is_signed_and_returns_the_arn(self):
        net = FakeInternet().on("POST", STS, CALLER_XML)
        result = await aws.validate(net.ctx(), {"accessKeyId": "AKIDEXAMPLE", "secretAccessKey": "sekret", "region": "us-east-1"})
        assert result.identity == "arn:aws:iam::123456789012:user/lightos"
        request = net.requests[0]
        assert request.headers["authorization"].startswith("AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/")
        assert "sekret" not in str(request.headers) and "sts/aws4_request" in request.headers["authorization"]
        assert form(request) == {"Action": "GetCallerIdentity", "Version": "2011-06-15"}

    @pytest.mark.asyncio
    async def test_cross_account_role_uses_the_platform_principal_then_the_temporary_credentials(self):
        net = FakeInternet()
        seen = []

        def sts(request):
            body = form(request)
            seen.append((body["Action"], request.headers["authorization"], request.headers.get("x-amz-security-token")))
            return httpx.Response(200, text=ASSUMED_XML if body["Action"] == "AssumeRole" else CALLER_XML)

        net.on("POST", STS, sts)
        settings = Settings(aws_platform_key_id="AKIDPLATFORM", aws_platform_secret="platformsecret")
        result = await aws.validate(
            net.ctx(settings),
            {"roleArn": "arn:aws:iam::210987654321:role/LightOSControlPlane", "externalId": "lightos-ext-123", "region": "us-east-1"},
        )
        assert result.identity == "arn:aws:iam::123456789012:user/lightos"
        assert [action for action, _, _ in seen] == ["AssumeRole", "GetCallerIdentity"]
        assert "AKIDPLATFORM" in seen[0][1] and seen[0][2] is None
        assert "ASIATEMP" in seen[1][1] and seen[1][2] == "tok/en+=="
        assume = form(net.requests[0])
        assert assume["RoleArn"].endswith("role/LightOSControlPlane") and assume["ExternalId"] == "lightos-ext-123" and assume["DurationSeconds"] == "900"

    @pytest.mark.asyncio
    async def test_role_connections_need_the_platform_principal(self):
        net = FakeInternet()
        with pytest.raises(ProviderError, match="LIGHTRAIL_AWS_ACCESS_KEY_ID"):
            await aws.validate(net.ctx(Settings()), {"roleArn": "arn:aws:iam::210987654321:role/x", "externalId": "e"})
        assert net.requests == []

    @pytest.mark.asyncio
    async def test_inventory_lists_gpu_and_neuron_instances(self):
        net = FakeInternet().on("POST", "https://ec2.us-west-2.amazonaws.com/", DESCRIBE_XML)
        items = await aws.inventory(net.ctx(), {"accessKeyId": "AK", "secretAccessKey": "SK", "region": "us-west-2"})
        assert [(i["id"], i["accelerator"], i["region"], i["status"]) for i in items] == [
            ("i-0aaa", "H100", "us-west-2a", "running"),
            ("i-0bbb", "A10G", "us-west-2b", "stopped"),
            ("i-0ccc", "Trainium", "us-west-2", "running"),
        ]
        body = form(net.requests[0])
        assert body["Action"] == "DescribeInstances" and body["Filter.1.Value.1"] == "p*" and body["Filter.2.Value.2"] == "running"

    @pytest.mark.asyncio
    @pytest.mark.parametrize("region", ["evil.com/#", "us-east-1.attacker.net", "../x", "US-EAST-1", "us east 1", "x" * 80])
    async def test_region_cannot_redirect_the_request_to_another_host(self, region):
        net = FakeInternet()
        with pytest.raises(ProviderError, match="region"):
            await aws.inventory(net.ctx(), {"accessKeyId": "AK", "secretAccessKey": "SK", "region": region})
        assert net.requests == []

    @pytest.mark.asyncio
    async def test_aws_error_xml_message_is_surfaced(self):
        xml = "<ErrorResponse><Error><Code>InvalidClientTokenId</Code><Message>The security token included in the request is invalid.</Message></Error></ErrorResponse>"
        net = FakeInternet().on("POST", STS, (403, xml))
        with pytest.raises(ProviderError, match="security token included in the request is invalid") as err:
            await aws.validate(net.ctx(), {"accessKeyId": "AK", "secretAccessKey": "SK"})
        assert err.value.status == 403

    @pytest.mark.parametrize("instance_type, expected", [("p6e-gb200.36xlarge", "GB200"), ("p6-b200.48xlarge", "B200"), ("p5en.48xlarge", "H200"), ("p4d.24xlarge", "A100"), ("g6e.xlarge", "L40S"), ("g6.xlarge", "L4"), ("inf2.xlarge", "Inferentia2"), ("m5.large", None)])
    def test_accelerator_families(self, instance_type, expected):
        assert aws._accelerator(instance_type) == expected


# ─── Google Cloud ─────────────────────────────────────────────────────────────

class TestGcp:
    def _service_account(self):
        key = rsa_key()
        return key, json.dumps({"type": "service_account", "client_email": "lightos@proj.iam.gserviceaccount.com", "private_key": pem(key)})

    @pytest.mark.asyncio
    async def test_validate_signs_a_verifiable_jwt_and_reads_the_project(self):
        key, account = self._service_account()
        net = FakeInternet()
        issued = {}

        def token(request):
            assertion = form(request)["assertion"]
            header, claims, signature = assertion.split(".")
            key.public_key().verify(b64d(signature), f"{header}.{claims}".encode(), padding.PKCS1v15(), hashes.SHA256())  # raises if wrong
            issued.update(header=json.loads(b64d(header)), claims=json.loads(b64d(claims)), grant=form(request)["grant_type"])
            return httpx.Response(200, json={"access_token": "ya29.token"})

        net.on("POST", "https://oauth2.googleapis.com/token", token)
        net.on("GET", "https://compute.googleapis.com/compute/v1/projects/my-gpu-project", lambda r: httpx.Response(200, json={"name": "my-gpu-project"}) if r.headers["authorization"] == "Bearer ya29.token" else httpx.Response(401))
        result = await gcp.validate(net.ctx(), {"projectId": "my-gpu-project", "serviceAccountJson": account})
        assert result.identity == "lightos@proj.iam.gserviceaccount.com \u2192 my-gpu-project"
        assert issued["header"] == {"alg": "RS256", "typ": "JWT"} and issued["grant"] == "urn:ietf:params:oauth:grant-type:jwt-bearer"
        assert issued["claims"]["iss"] == "lightos@proj.iam.gserviceaccount.com" and issued["claims"]["scope"].endswith("cloud-platform.read-only")
        assert issued["claims"]["exp"] - issued["claims"]["iat"] == 600

    @pytest.mark.asyncio
    async def test_inventory_maps_gpu_vms_and_tpus(self):
        _key, account = self._service_account()
        base = "https://compute.googleapis.com/compute/v1/projects/gpu-proj-1/aggregated/instances"
        net = FakeInternet().on("POST", "https://oauth2.googleapis.com/token", {"access_token": "t"})
        net.on("GET", base, {
            "items": {
                "zones/us-central1-a": {"instances": [
                    {"id": 1, "name": "trainer", "machineType": "zones/us-central1-a/machineTypes/n1-standard-8", "guestAccelerators": [{"acceleratorType": "zones/us-central1-a/acceleratorTypes/nvidia-tesla-t4", "acceleratorCount": 2}], "status": "RUNNING"},
                    {"id": 2, "name": "big", "machineType": "zones/us-central1-a/machineTypes/a3-highgpu-8g", "status": "RUNNING"},
                    {"id": 3, "name": "cpu-only", "machineType": "zones/us-central1-a/machineTypes/e2-medium", "status": "RUNNING"},
                ]},
                "zones/us-east1-b": {"warning": {"code": "NO_RESULTS_ON_PAGE"}},
            }
        })
        net.on("GET", "https://tpu.googleapis.com/v2/projects/gpu-proj-1/locations/-/nodes", {"nodes": [{"name": "projects/gpu-proj-1/locations/us-central2-b/nodes/tpu-1", "acceleratorType": "v5litepod-8", "state": "READY"}]})
        items = await gcp.inventory(net.ctx(), {"projectId": "gpu-proj-1", "serviceAccountJson": account})
        assert [(i["name"], i["accelerator"], i.get("acceleratorCount"), i["region"]) for i in items] == [
            ("trainer", "nvidia-tesla-t4", 2, "us-central1-a"),
            ("big", "H100", None, "us-central1-a"),
            ("tpu-1", "v5litepod-8", None, "us-central2-b"),
        ]

    @pytest.mark.asyncio
    async def test_inventory_survives_a_project_without_the_tpu_api(self):
        _key, account = self._service_account()
        net = FakeInternet().on("POST", "https://oauth2.googleapis.com/token", {"access_token": "t"})
        net.on("GET", "https://compute.googleapis.com/", {"items": {}})
        net.on("GET", "https://tpu.googleapis.com/", (403, {"error": {"message": "Cloud TPU API has not been used"}}))
        assert await gcp.inventory(net.ctx(), {"projectId": "gpu-proj-1", "serviceAccountJson": account}) == []

    @pytest.mark.asyncio
    @pytest.mark.parametrize("account, message", [("{not json", "not valid JSON"), (json.dumps({"client_email": "a@b"}), "missing client_email or private_key"), (json.dumps({"client_email": "a@b", "private_key": "nope"}), "could not be read")])
    async def test_bad_service_account_keys_fail_before_any_request(self, account, message):
        net = FakeInternet()
        with pytest.raises(ProviderError, match=message):
            await gcp.validate(net.ctx(), {"projectId": "gpu-proj-1", "serviceAccountJson": account})
        assert net.requests == []

    @pytest.mark.asyncio
    async def test_only_rsa_keys_are_accepted(self):
        ec_key = ec.generate_private_key(ec.SECP256R1())
        net = FakeInternet()
        with pytest.raises(ProviderError, match="RSA"):
            await gcp.validate(net.ctx(), {"projectId": "gpu-proj-1", "serviceAccountJson": json.dumps({"client_email": "a@b", "private_key": pem(ec_key)})})

    @pytest.mark.asyncio
    @pytest.mark.parametrize("project", ["../../x", "gpu-proj-1/../../y", "a b", "x", "UPPER-case-id", "ends-with-hyphen-"])
    async def test_project_id_cannot_alter_the_request_path(self, project):
        _key, account = self._service_account()
        net = FakeInternet()
        with pytest.raises(ProviderError, match="project ID"):
            await gcp.validate(net.ctx(), {"projectId": project, "serviceAccountJson": account})
        assert net.requests == []


# ─── Azure ────────────────────────────────────────────────────────────────────

TENANT, SUB = "11111111-2222-3333-4444-555555555555", "66666666-7777-8888-9999-000000000000"
AZURE = {"tenantId": TENANT, "subscriptionId": SUB, "clientId": "app-id", "clientSecret": "azure-secret"}


class TestAzure:
    @pytest.mark.asyncio
    async def test_validate_uses_client_credentials_and_reads_the_subscription(self):
        net = FakeInternet()
        net.on("POST", f"https://login.microsoftonline.com/{TENANT}/oauth2/v2.0/token", lambda r: httpx.Response(200, json={"access_token": "az-token"}))
        net.on("GET", f"https://management.azure.com/subscriptions/{SUB}", {"displayName": "GPU Sub", "state": "Enabled"})
        result = await azure.validate(net.ctx(), AZURE)
        assert result.identity == "GPU Sub (Enabled)"
        assert form(net.requests[0]) == {"grant_type": "client_credentials", "client_id": "app-id", "client_secret": "azure-secret", "scope": "https://management.azure.com/.default"}

    @pytest.mark.asyncio
    async def test_inventory_filters_n_series_pages_and_ignores_foreign_next_links(self):
        net = FakeInternet().on("POST", "https://login.microsoftonline.com/", {"access_token": "t"})
        vms = f"https://management.azure.com/subscriptions/{SUB}/providers/Microsoft.Compute/virtualMachines"

        def page(request):
            if "page=2" in str(request.url):
                return httpx.Response(200, json={"value": [{"id": "/vm/c", "name": "c", "location": "eastus", "properties": {"hardwareProfile": {"vmSize": "Standard_ND96isr_H200_v5"}, "provisioningState": "Succeeded"}}], "nextLink": "https://evil.example.com/steal?page=3"})
            return httpx.Response(200, json={"value": [
                {"id": "/vm/a", "name": "a", "location": "eastus", "properties": {"hardwareProfile": {"vmSize": "Standard_ND96isr_H100_v5"}, "provisioningState": "Succeeded"}},
                {"id": "/vm/b", "name": "b", "location": "eastus", "properties": {"hardwareProfile": {"vmSize": "Standard_D4s_v5"}}},
            ], "nextLink": f"{vms}?api-version=2024-07-01&page=2"})

        net.on("GET", vms, page)
        items = await azure.inventory(net.ctx(), AZURE)
        assert [(i["name"], i["accelerator"]) for i in items] == [("a", "H100"), ("c", "H200")]
        assert not [r for r in net.requests if r.url.host == "evil.example.com"]

    @pytest.mark.asyncio
    @pytest.mark.parametrize("creds, message", [({**AZURE, "subscriptionId": "not-a-guid"}, "GUID"), ({**AZURE, "tenantId": "a/b?c"}, "tenant")])
    async def test_ids_are_validated_before_any_request(self, creds, message):
        net = FakeInternet()
        with pytest.raises(ProviderError, match=message):
            await azure.validate(net.ctx(), creds)
        assert net.requests == []


# ─── Kubernetes / CoreWeave ───────────────────────────────────────────────────

K8S = {"apiServer": "https://k8s.example.com:6443/", "token": "k8s-token"}
NODES = {"items": [
    {"metadata": {"uid": "u1", "name": "gpu-node-1", "labels": {"nvidia.com/gpu.product": "NVIDIA-H100-80GB-HBM3", "topology.kubernetes.io/region": "us-east"}},
     "status": {"capacity": {"nvidia.com/gpu": "8", "cpu": "96"}, "conditions": [{"type": "Ready", "status": "True"}]}},
    {"metadata": {"uid": "u2", "name": "cpu-node", "labels": {}}, "status": {"capacity": {"cpu": "8"}, "conditions": []}},
    {"metadata": {"uid": "u3", "name": "amd-node", "labels": {"topology.kubernetes.io/zone": "z1"}}, "status": {"capacity": {"amd.com/gpu": "4"}, "conditions": [{"type": "Ready", "status": "False"}]}},
], "metadata": {}}


class TestKubernetes:
    @pytest.mark.asyncio
    async def test_validate_with_self_subject_review_pins_the_connection(self):
        net = FakeInternet().on("POST", "https://k8s.example.com:6443/apis/authentication.k8s.io/v1/selfsubjectreviews", {"status": {"userInfo": {"username": "system:serviceaccount:default:lightos"}}})
        result = await kubernetes.validate(net.ctx(), K8S)
        assert result.identity == "system:serviceaccount:default:lightos"
        request = net.requests[0]
        assert request.headers["authorization"] == "Bearer k8s-token" and request.url.host == "93.184.216.34"
        assert json.loads(request.content) == {"apiVersion": "authentication.k8s.io/v1", "kind": "SelfSubjectReview"}

    @pytest.mark.asyncio
    async def test_old_clusters_fall_back_to_reading_nodes(self):
        net = FakeInternet()
        net.on("POST", "https://k8s.example.com:6443/apis/authentication.k8s.io", (404, {"message": "not found"}))
        net.on("GET", "https://k8s.example.com:6443/api/v1/nodes", {"items": []})
        assert (await kubernetes.validate(net.ctx(), K8S)).identity == "token accepted (cluster < 1.28)"

    @pytest.mark.asyncio
    async def test_other_errors_are_not_swallowed(self):
        net = FakeInternet().on("POST", "https://k8s.example.com:6443/", (401, {"message": "Unauthorized"}))
        with pytest.raises(ProviderError, match="401"):
            await kubernetes.validate(net.ctx(), K8S)

    @pytest.mark.asyncio
    async def test_inventory_reports_gpu_nodes_only_and_follows_continue_tokens(self):
        net = FakeInternet()

        def nodes(request):
            if "continue=tok2" in str(request.url):
                return httpx.Response(200, json={"items": NODES["items"][2:], "metadata": {}})
            return httpx.Response(200, json={"items": NODES["items"][:2], "metadata": {"continue": "tok2"}})

        net.on("GET", "https://k8s.example.com:6443/api/v1/nodes", nodes)
        items = await kubernetes.inventory(net.ctx(), K8S)
        assert [(i["name"], i["accelerator"], i["acceleratorCount"], i["region"], i["status"]) for i in items] == [
            ("gpu-node-1", "NVIDIA-H100-80GB-HBM3", 8, "us-east", "Ready"),
            ("amd-node", "amd.com/gpu", 4, "z1", "NotReady"),
        ]

    @pytest.mark.asyncio
    async def test_private_endpoints_are_refused_by_default(self):
        from providers.http import Http

        net = FakeInternet()

        async def private(host, port):
            return ["10.1.2.3"]

        ctx = net.ctx()
        ctx.http = Http(transport=httpx.MockTransport(net), resolver=private)
        with pytest.raises(ProviderError, match="private or reserved"):
            await kubernetes.validate(ctx, K8S)
        assert net.requests == []

    @pytest.mark.asyncio
    async def test_private_endpoints_work_when_the_operator_allows_them(self):
        from providers.http import Http

        net = FakeInternet().on("POST", "https://k8s.corp.local:6443/", {"status": {"userInfo": {"username": "admin"}}})

        async def private(host, port):
            return ["10.1.2.3"]

        ctx = net.ctx()
        ctx.http = Http(transport=httpx.MockTransport(net), resolver=private, allow_private_hosts=True)
        assert (await kubernetes.validate(ctx, {"apiServer": "https://k8s.corp.local:6443", "token": "t"})).identity == "admin"

    @pytest.mark.asyncio
    @pytest.mark.parametrize("server", ["http://k8s.example.com", "https://user:pw@k8s.example.com", "ftp://k8s.example.com", "k8s.example.com"])
    async def test_only_plain_https_endpoints(self, server):
        net = FakeInternet()
        with pytest.raises(ProviderError):
            await kubernetes.validate(net.ctx(), {"apiServer": server, "token": "t"})
        assert net.requests == []


# ─── Lambda / RunPod / Vast / DigitalOcean / Crusoe ───────────────────────────

class TestLambda:
    @pytest.mark.asyncio
    async def test_instances_and_offers(self):
        net = FakeInternet()
        net.on("GET", "https://cloud.lambda.ai/api/v1/instances", {"data": [{"id": "i-1", "name": "train-1", "status": "active", "region": {"name": "us-west-1"}, "instance_type": {"name": "gpu_8x_h100_sxm5", "gpu_description": "H100 (80 GB SXM5)", "specs": {"gpus": 8}}}]})
        net.on("GET", "https://cloud.lambda.ai/api/v1/instance-types", {"data": {
            "gpu_1x_a100": {"instance_type": {"name": "gpu_1x_a100", "description": "1x A100", "gpu_description": "A100 (40 GB)", "price_cents_per_hour": 129, "specs": {"gpus": 1}}, "regions_with_capacity_available": [{"name": "us-east-1"}, {"name": "us-west-2"}]},
            "gpu_8x_b200": {"instance_type": {"name": "gpu_8x_b200", "price_cents_per_hour": 4000, "specs": {"gpus": 8}}, "regions_with_capacity_available": []},
        }})
        assert (await clouds.LAMBDA.validate(net.ctx(), {"apiKey": "k"})).identity == "Lambda account (1 instances)"
        items = await clouds.LAMBDA.inventory(net.ctx(), {"apiKey": "k"})
        assert items[0] == {"kind": "instance", "id": "i-1", "name": "train-1", "accelerator": "H100 (80 GB SXM5)", "acceleratorCount": 8, "region": "us-west-1", "status": "active"}
        assert items[1] == {"kind": "offer", "id": "gpu_1x_a100", "name": "gpu_1x_a100", "accelerator": "A100 (40 GB)", "acceleratorCount": 1, "region": "us-east-1, us-west-2", "pricePerHourUsd": 1.29}
        assert len(items) == 2  # the sold-out type is not offered
        assert all(r.headers["authorization"] == "Bearer k" for r in net.requests)

    @pytest.mark.asyncio
    async def test_inventory_still_lists_instances_when_the_catalogue_call_fails(self):
        net = FakeInternet().on("GET", "https://cloud.lambda.ai/api/v1/instances", {"data": []}).on("GET", "https://cloud.lambda.ai/api/v1/instance-types", (500, "boom"))
        assert await clouds.LAMBDA.inventory(net.ctx(), {"apiKey": "k"}) == []


class TestRunPod:
    @pytest.mark.asyncio
    async def test_v2_pods_and_gpu_catalogue(self):
        net = FakeInternet()
        net.on("GET", "https://api.runpod.io/v2/pods", {"pods": [{"id": "p1", "name": "dev", "gpu": {"displayName": "H100 SXM", "count": 2}, "dataCenterId": "US-CA-2", "desiredStatus": "RUNNING", "costPerHr": 5.98}]})
        net.on("GET", "https://api.runpod.io/v2/catalog/gpus", {"gpus": [{"id": "NVIDIA H200", "displayName": "H200 SXM", "securePrice": 3.99}]})
        assert (await clouds.RUNPOD.validate(net.ctx(), {"apiKey": "k"})).identity == "RunPod account (1 pods)"
        items = await clouds.RUNPOD.inventory(net.ctx(), {"apiKey": "k"})
        assert items[0] == {"kind": "instance", "id": "p1", "name": "dev", "accelerator": "H100 SXM", "acceleratorCount": 2, "region": "US-CA-2", "status": "RUNNING", "pricePerHourUsd": 5.98}
        assert items[1] == {"kind": "offer", "id": "NVIDIA H200", "name": "H200 SXM", "accelerator": "H200 SXM", "pricePerHourUsd": 3.99}

    @pytest.mark.asyncio
    async def test_bare_array_responses_and_missing_catalogue_are_tolerated(self):
        net = FakeInternet().on("GET", "https://api.runpod.io/v2/pods", [{"id": "p1"}]).on("GET", "https://api.runpod.io/v2/catalog/gpus", (404, {"detail": "nope"}))
        assert [i["id"] for i in await clouds.RUNPOD.inventory(net.ctx(), {"apiKey": "k"})] == ["p1"]

    @pytest.mark.asyncio
    async def test_rfc9457_errors_are_readable(self):
        net = FakeInternet().on("GET", "https://api.runpod.io/v2/pods", (401, {"detail": "missing bearer token", "status": 401, "title": "Unauthorized"}))
        with pytest.raises(ProviderError, match="api.runpod.io returned 401: missing bearer token"):
            await clouds.RUNPOD.validate(net.ctx(), {"apiKey": "k"})


class TestVastAndDigitalOcean:
    @pytest.mark.asyncio
    async def test_vast(self):
        net = FakeInternet()
        net.on("GET", "https://console.vast.ai/api/v0/users/current/", {"id": 7, "email": "me@example.com"})
        net.on("GET", "https://console.vast.ai/api/v0/instances/", {"instances": [{"id": 42, "gpu_name": "RTX 4090", "num_gpus": 2, "geolocation": "Texas, US", "actual_status": "running", "dph_total": 0.8}]})
        assert (await clouds.VAST.validate(net.ctx(), {"apiKey": "k"})).identity == "me@example.com"
        assert await clouds.VAST.inventory(net.ctx(), {"apiKey": "k"}) == [{"kind": "instance", "id": "42", "name": "vast-42", "accelerator": "RTX 4090", "acceleratorCount": 2, "region": "Texas, US", "status": "running", "pricePerHourUsd": 0.8}]

    @pytest.mark.asyncio
    async def test_vast_login_errors(self):
        net = FakeInternet().on("GET", "https://console.vast.ai/api/v0/users/current/", (403, {"success": False, "error": "auth_error", "msg": "This action requires login."}))
        with pytest.raises(ProviderError, match="requires login"):
            await clouds.VAST.validate(net.ctx(), {"apiKey": "bad"})

    @pytest.mark.asyncio
    async def test_digitalocean_lists_gpu_droplets_only(self):
        net = FakeInternet()
        net.on("GET", "https://api.digitalocean.com/v2/account", {"account": {"email": "ops@example.com"}})
        net.on("GET", "https://api.digitalocean.com/v2/droplets", {"droplets": [
            {"id": 1, "name": "web", "size_slug": "s-2vcpu-4gb", "status": "active"},
            {"id": 2, "name": "gpu", "size_slug": "gpu-h100x8-640gb", "status": "active", "region": {"slug": "nyc2"}, "gpu_info": {"model": "NVIDIA H100", "count": 8}, "size": {"price_hourly": 23.92}},
        ]})
        assert (await clouds.DIGITALOCEAN.validate(net.ctx(), {"token": "t"})).identity == "ops@example.com"
        assert await clouds.DIGITALOCEAN.inventory(net.ctx(), {"token": "t"}) == [{"kind": "instance", "id": "2", "name": "gpu", "accelerator": "NVIDIA H100", "acceleratorCount": 8, "region": "nyc2", "status": "active", "pricePerHourUsd": 23.92}]


class TestCrusoe:
    SECRET = base64.urlsafe_b64encode(b"crusoe-secret-bytes-0123456789ab").rstrip(b"=").decode()

    @pytest.mark.asyncio
    async def test_requests_carry_a_valid_hmac_signature(self):
        net = FakeInternet().on("GET", "https://api.cloud.crusoe.ai/v1/capacities", [])
        await clouds.CRUSOE.validate(net.ctx(), {"accessKeyId": "AKCRUSOE1234", "secretKey": self.SECRET})
        headers = net.requests[0].headers
        timestamp = headers["x-crusoe-timestamp"]
        assert re.fullmatch(r"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ", timestamp)
        version, access_key, signature = headers["authorization"].removeprefix("Bearer ").split(":")
        expected = base64.urlsafe_b64encode(hmac.new(b64d(self.SECRET), f"/v1/capacities\n\nGET\n{timestamp}\n".encode(), hashlib.sha256).digest()).rstrip(b"=").decode()
        assert (version, access_key, signature) == ("1.0", "AKCRUSOE1234", expected)

    @pytest.mark.asyncio
    async def test_identity_and_inventory(self):
        net = FakeInternet().on("GET", "https://api.cloud.crusoe.ai/v1/capacities", {"items": [{"type": "h100-80gb-sxm-ib.8x", "location": "us-east1-a", "quantity": 12}]})
        creds = {"accessKeyId": "AKCRUSOE1234", "secretKey": self.SECRET}
        assert (await clouds.CRUSOE.validate(net.ctx(), creds)).identity == "Crusoe key \u20261234"
        assert await clouds.CRUSOE.inventory(net.ctx(), creds) == [{"kind": "offer", "id": "h100-80gb-sxm-ib.8x@us-east1-a", "name": "h100-80gb-sxm-ib.8x", "accelerator": "h100-80gb-sxm-ib.8x", "region": "us-east1-a", "status": "12 available"}]

    @pytest.mark.asyncio
    async def test_bad_secret_fails_before_any_request(self):
        net = FakeInternet()
        with pytest.raises(ProviderError, match="base64url"):
            await clouds.CRUSOE.validate(net.ctx(), {"accessKeyId": "AK", "secretKey": "***not base64***"})
        assert net.requests == []


# ─── Inference APIs ───────────────────────────────────────────────────────────

class TestOpenAiCompatible:
    @pytest.mark.asyncio
    @pytest.mark.parametrize("provider_id, host", [("groq", "api.groq.com"), ("cerebras", "api.cerebras.ai"), ("fireworks", "api.fireworks.ai"), ("general_compute", "api.generalcompute.com")])
    async def test_models_list_validates_the_key(self, provider_id, host):
        net = FakeInternet().on("GET", f"https://{host}/", {"object": "list", "data": [{"id": "m1", "owned_by": "x"}, {"id": "m2"}]})
        adapter = ADAPTERS[provider_id]
        assert (await adapter.validate(net.ctx(), {"apiKey": "k"})).identity == "2 models available"
        items = await adapter.inventory(net.ctx(), {"apiKey": "k"})
        assert items == [{"kind": "model", "id": "m1", "name": "m1", "status": "x"}, {"kind": "model", "id": "m2", "name": "m2"}]
        assert net.requests[0].headers["authorization"] == "Bearer k" and net.requests[0].url.path.endswith("/models")

    @pytest.mark.asyncio
    async def test_together_returns_a_bare_array(self):
        net = FakeInternet().on("GET", "https://api.together.xyz/v1/models", [{"id": "meta/llama", "display_name": "Llama"}])
        assert (await ADAPTERS["together_gpu_clusters"].validate(net.ctx(), {"apiKey": "k"})).identity == "1 models available"
        assert (await ADAPTERS["together_gpu_clusters"].inventory(net.ctx(), {"apiKey": "k"}))[0]["name"] == "Llama"

    @pytest.mark.asyncio
    async def test_wrong_keys_are_rejected_with_the_providers_message(self):
        net = FakeInternet().on("GET", "https://api.groq.com/", (401, {"error": {"message": "Invalid API Key", "type": "invalid_request_error"}}))
        with pytest.raises(ProviderError, match="api.groq.com returned 401: Invalid API Key"):
            await ADAPTERS["groq"].validate(net.ctx(), {"apiKey": "bad"})


NGC = "https://api.ngc.nvidia.com/v3/keys/get-caller-info"


class TestNvidia:
    @pytest.mark.asyncio
    async def test_api_catalog_keys_are_checked_with_the_ngc_key_service_not_the_public_model_list(self):
        net = FakeInternet().on("POST", NGC, {"user": {"name": "Ada Lovelace", "email": "ada@example.com"}})
        result = await ADAPTERS["nvidia_api_catalog"].validate(net.ctx(), {"apiKey": "nvapi-good"})
        assert result.identity == "NGC account Ada Lovelace"
        request = net.requests[0]
        assert form(request) == {"credentials": "nvapi-good"} and "nvapi-good" not in str(request.url)
        assert not net.calls("integrate.api.nvidia.com")  # the model list is public and proves nothing

    @pytest.mark.asyncio
    async def test_invalid_keys_are_rejected(self):
        net = FakeInternet().on("POST", NGC, (401, {"requestStatus": {"statusCode": "UNAUTHORIZED", "statusDescription": "Invalid API key."}}))
        with pytest.raises(ProviderError, match="api.ngc.nvidia.com returned 401: Invalid API key."):
            await ADAPTERS["nvidia_api_catalog"].validate(net.ctx(), {"apiKey": "nvapi-bad"})

    @pytest.mark.asyncio
    async def test_unknown_response_shapes_still_count_as_accepted(self):
        net = FakeInternet().on("POST", NGC, {"something": "else"})
        assert (await ADAPTERS["nvidia_api_catalog"].validate(net.ctx(), {"apiKey": "k"})).identity == "NGC API key accepted"

    @pytest.mark.asyncio
    async def test_inventory_is_the_public_model_list(self):
        net = FakeInternet().on("GET", "https://integrate.api.nvidia.com/v1/models", {"data": [{"id": "nvidia/llama-3.3-nemotron", "owned_by": "nvidia"}]})
        assert (await ADAPTERS["nvidia_api_catalog"].inventory(net.ctx(), {"apiKey": "k"}))[0]["id"] == "nvidia/llama-3.3-nemotron"

    @pytest.mark.asyncio
    async def test_ngc_includes_the_org_and_lists_nothing(self):
        net = FakeInternet().on("POST", NGC, {"user": {"email": "ada@example.com"}})
        result = await ADAPTERS["nvidia_ngc"].validate(net.ctx(), {"apiKey": "k", "orgName": "my-org"})
        assert result.identity == "NGC account ada@example.com \u00b7 org my-org" and "not checked" in result.message
        assert await ADAPTERS["nvidia_ngc"].inventory(net.ctx(), {"apiKey": "k"}) == []


class TestSambaNova:
    BASE = "https://api.sambanova.ai/v1"

    def _net(self, chat):
        return FakeInternet().on("GET", f"{self.BASE}/models", {"data": [{"id": "DeepSeek-V3.1"}, {"id": "E5-Mistral-7B-embed"}, {"id": "Meta-Llama-3.3-70B-Instruct"}, {"id": "Qwen3-32B"}]}).on("POST", f"{self.BASE}/chat/completions", chat)

    @pytest.mark.asyncio
    async def test_key_is_probed_with_a_one_token_chat_completion(self):
        sent = []
        net = self._net(lambda r: (sent.append(json.loads(r.content)), httpx.Response(200, json={"choices": []}))[1])
        result = await ADAPTERS["sambanova"].validate(net.ctx(), {"apiKey": "good"})
        assert result.identity == "4 models available"
        assert sent == [{"model": "DeepSeek-V3.1", "messages": [{"role": "user", "content": "ping"}], "max_tokens": 1}]

    @pytest.mark.asyncio
    async def test_wrong_key_is_rejected_even_though_the_model_list_is_public(self):
        net = self._net((401, {"error": {"message": "Incorrect API key provided: *****.", "code": "invalid_api_key"}}))
        with pytest.raises(ProviderError, match="401: Incorrect API key"):
            await ADAPTERS["sambanova"].validate(net.ctx(), {"apiKey": "bad"})

    @pytest.mark.asyncio
    async def test_rate_limited_keys_count_as_accepted(self):
        result = await ADAPTERS["sambanova"].validate(self._net((429, {"error": {"message": "slow down"}})).ctx(), {"apiKey": "k"})
        assert "rate limited" in result.message

    @pytest.mark.asyncio
    async def test_unavailable_models_are_skipped(self):
        attempts = []

        def chat(request):
            model = json.loads(request.content)["model"]
            attempts.append(model)
            return httpx.Response(404, json={"error": {"message": "model gone"}}) if model == "DeepSeek-V3.1" else httpx.Response(200, json={})

        net = self._net(chat)
        await ADAPTERS["sambanova"].validate(net.ctx(), {"apiKey": "k"})
        assert attempts == ["DeepSeek-V3.1", "Meta-Llama-3.3-70B-Instruct"]  # the embedding model is never used for chat

    @pytest.mark.asyncio
    async def test_gives_up_when_nothing_can_be_verified(self):
        with pytest.raises(ProviderError, match="Could not verify"):
            await ADAPTERS["sambanova"].validate(self._net((400, {"error": {"message": "bad request"}})).ctx(), {"apiKey": "k"})


# ─── IBM Cloud ────────────────────────────────────────────────────────────────

def _jwt(claims: dict) -> str:
    enc = lambda obj: base64.urlsafe_b64encode(json.dumps(obj).encode()).rstrip(b"=").decode()  # noqa: E731
    return f"{enc({'alg': 'RS256'})}.{enc(claims)}.sig"


class TestIbm:
    IAM = "https://iam.cloud.ibm.com/identity/token"
    VPC = "https://us-south.iaas.cloud.ibm.com/v1/instances"

    @pytest.mark.asyncio
    async def test_validate_exchanges_the_key_and_reads_vpc(self):
        net = FakeInternet()
        net.on("POST", self.IAM, {"access_token": _jwt({"name": "Ada", "iam_id": "iam-ServiceId-1"})})
        net.on("GET", self.VPC, lambda r: httpx.Response(200, json={"instances": []}) if r.headers["authorization"].startswith("Bearer ey") else httpx.Response(401))
        result = await ibm.validate(net.ctx(), {"apiKey": "ibm-key", "region": "us-south"})
        assert result.identity == "IBM Cloud Ada"
        assert form(net.requests[0]) == {"grant_type": "urn:ibm:params:oauth:grant-type:apikey", "apikey": "ibm-key"}
        assert "version=2025-06-10" in str(net.requests[1].url) and "generation=2" in str(net.requests[1].url)

    @pytest.mark.asyncio
    async def test_iam_errors_use_ibms_own_message(self):
        net = FakeInternet().on("POST", self.IAM, (400, {"errorCode": "BXNIM0415E", "errorMessage": "Provided API key could not be found."}))
        with pytest.raises(ProviderError, match="400: Provided API key could not be found."):
            await ibm.validate(net.ctx(), {"apiKey": "nope"})

    @pytest.mark.asyncio
    async def test_inventory_gpu_profiles_and_pagination(self):
        net = FakeInternet().on("POST", self.IAM, {"access_token": _jwt({})})

        def page(request):
            if "start=2" in str(request.url):
                return httpx.Response(200, json={"instances": [{"id": "3", "name": "old", "profile": {"name": "gx2-8x64x1v100"}, "zone": {"name": "us-south-3"}, "status": "stopped"}], "next": {"href": "https://evil.example.com/v1/instances?start=3"}})
            return httpx.Response(200, json={"instances": [
                {"id": "1", "name": "l4", "profile": {"name": "gx3-64x320x4l4"}, "zone": {"name": "us-south-1"}, "status": "running"},
                {"id": "x", "name": "web", "profile": {"name": "bx2-2x8"}},
                {"id": "2", "name": "h100", "profile": {"name": "gx3d-160x1792x8h100"}, "gpu": {"count": 8, "model": "H100"}, "zone": {"name": "us-south-2"}, "status": "running"},
            ], "next": {"href": f"{self.VPC}?version=2025-06-10&generation=2&limit=100&start=2"}})

        net.on("GET", self.VPC, page)
        items = await ibm.inventory(net.ctx(), {"apiKey": "k"})
        assert [(i["name"], i["accelerator"], i["acceleratorCount"], i["region"]) for i in items] == [("l4", "L4", 4, "us-south-1"), ("h100", "H100", 8, "us-south-2"), ("old", "V100", 1, "us-south-3")]
        assert not net.calls("evil.example.com")

    @pytest.mark.asyncio
    @pytest.mark.parametrize("region", ["us-south.evil.com/x", "US-SOUTH", "../x", "a-b"])
    async def test_region_cannot_alter_the_host(self, region):
        net = FakeInternet()
        with pytest.raises(ProviderError, match="region"):
            await ibm.validate(net.ctx(), {"apiKey": "k", "region": region})
        assert net.requests == []


# ─── Oracle Cloud ─────────────────────────────────────────────────────────────

def _fingerprint(key) -> str:
    der = key.public_key().public_bytes(serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)
    digest = hashlib.md5(der).hexdigest()
    return ":".join(digest[i : i + 2] for i in range(0, 32, 2))


TENANCY, USER = "ocid1.tenancy.oc1..aaaatenancy", "ocid1.user.oc1..aaaauser"


class TestOci:
    def _creds(self, key=None, **overrides):
        key = key or rsa_key()
        return key, {"tenancyOcid": TENANCY, "userOcid": USER, "fingerprint": _fingerprint(key), "region": "us-ashburn-1", "privateKeyPem": pem(key, serialization.PrivateFormat.TraditionalOpenSSL), **overrides}

    @pytest.mark.asyncio
    async def test_requests_are_signed_per_the_oci_http_signature_spec(self):
        key, creds = self._creds()
        captured = {}

        def users(request):
            captured["request"] = request
            return httpx.Response(200, json={"name": "ada", "email": "ada@example.com"})

        net = FakeInternet().on("GET", f"https://identity.us-ashburn-1.oraclecloud.com/20160918/users/{USER}", users)
        result = await oci.validate(net.ctx(), creds)
        assert result.identity == "OCI user ada"
        request = captured["request"]
        auth = request.headers["authorization"]
        fields = dict(re.findall(r'(\w+)="([^"]*)"', auth))
        assert fields["keyId"] == f"{TENANCY}/{USER}/{creds['fingerprint']}" and fields["algorithm"] == "rsa-sha256" and fields["headers"] == "date (request-target) host"
        signing_string = f"date: {request.headers['date']}\n(request-target): get /20160918/users/{USER}\nhost: identity.us-ashburn-1.oraclecloud.com"
        key.public_key().verify(base64.b64decode(fields["signature"]), signing_string.encode(), padding.PKCS1v15(), hashes.SHA256())  # raises if wrong

    @pytest.mark.asyncio
    async def test_inventory_filters_gpu_shapes_and_pages(self):
        key, creds = self._creds()
        base = "https://iaas.us-ashburn-1.oraclecloud.com/20160918/instances"

        def page(request):
            assert f"compartmentId={TENANCY}" in str(request.url)
            if "page=p2" in str(request.url):
                return httpx.Response(200, json=[{"id": "ocid1.instance.3", "displayName": "old", "shape": "BM.GPU4.8", "lifecycleState": "STOPPED", "region": "iad"}])
            return httpx.Response(200, json=[
                {"id": "ocid1.instance.1", "displayName": "h100", "shape": "BM.GPU.H100.8", "lifecycleState": "RUNNING", "availabilityDomain": "Uocm:US-ASHBURN-AD-1"},
                {"id": "ocid1.instance.2", "displayName": "web", "shape": "VM.Standard.E4.Flex", "lifecycleState": "RUNNING"},
            ], headers={"opc-next-page": "p2"})

        net = FakeInternet().on("GET", base, page)
        items = await oci.inventory(net.ctx(), creds)
        assert [(i["name"], i["accelerator"], i["acceleratorCount"], i["status"]) for i in items] == [("h100", "H100", 8, "RUNNING"), ("old", "A100", 8, "STOPPED")]

    @pytest.mark.parametrize("shape, expected", [("BM.GPU.H100.8", ("H100", 8)), ("BM.GPU.A100-v2.8", ("A100-v2", 8)), ("VM.GPU.A10.2", ("A10", 2)), ("BM.GPU4.8", ("A100", 8)), ("VM.GPU3.4", ("V100", 4)), ("BM.GPU2.2", ("P100", 2)), ("BM.GPU.MI300X.8", ("MI300X", 8)), ("VM.Standard.E4.Flex", (None, None))])
    def test_shape_parsing(self, shape, expected):
        assert oci.shape_accelerator(shape) == expected

    @pytest.mark.asyncio
    async def test_a_key_that_does_not_match_the_fingerprint_is_caught_locally(self):
        _key, creds = self._creds()
        creds["privateKeyPem"] = pem(rsa_key())
        net = FakeInternet()
        with pytest.raises(ProviderError, match="does not match the fingerprint"):
            await oci.validate(net.ctx(), creds)
        assert net.requests == []

    @pytest.mark.asyncio
    @pytest.mark.parametrize("override, message", [
        ({"region": "us-ashburn-1.evil.com/x"}, "region"), ({"region": "US-ASHBURN-1"}, "region"),
        ({"tenancyOcid": "not-an-ocid"}, "OCID"), ({"userOcid": "../etc"}, "OCID"),
        ({"fingerprint": "aa:bb"}, "fingerprint"), ({"privateKeyPem": "garbage"}, "could not be read"),
    ])
    async def test_inputs_are_validated_before_any_request(self, override, message):
        _key, creds = self._creds(**override)
        net = FakeInternet()
        with pytest.raises(ProviderError, match=message):
            await oci.validate(net.ctx(), creds)
        assert net.requests == []

    @pytest.mark.asyncio
    async def test_passphrase_protected_keys_are_refused_clearly(self):
        key, creds = self._creds()
        creds["privateKeyPem"] = key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.BestAvailableEncryption(b"pw")).decode()
        with pytest.raises(ProviderError, match="unencrypted"):
            await oci.validate(FakeInternet().ctx(), creds)
