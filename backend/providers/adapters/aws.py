"""Amazon Web Services: STS for identity, EC2 DescribeInstances for GPU / Trainium / Inferentia instances.

Two ways in: a cross-account IAM role (recommended; LightRail's own principal assumes it with the customer's external
id) or a dedicated IAM user's access key. Requests are signed with SigV4 (``sigv4.py``).
"""
from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from typing import Dict, List, Optional
from urllib.parse import urlencode
from xml.sax.saxutils import unescape

from ..http import ProviderError
from ..sigv4 import sign_v4
from .base import Adapter, AdapterContext, Creds, Item, Validation, make_item, need

# The region ends up inside a hostname (ec2.<region>.amazonaws.com), so it must be strictly shaped: anything else
# could point the signed request at another host.
_REGION = re.compile(r"^[a-z]{2}(?:-[a-z]+)+-\d$")
_FORM = "application/x-www-form-urlencoded; charset=utf-8"

_GPU_FAMILIES = [
    (re.compile(r"^p6e?-gb200"), "GB200"),
    (re.compile(r"^p6-b200"), "B200"),
    (re.compile(r"^p6-b300"), "B300"),
    (re.compile(r"^p5en?\."), "H200"),
    (re.compile(r"^p5\."), "H100"),
    (re.compile(r"^p4de?\."), "A100"),
    (re.compile(r"^g6e\."), "L40S"),
    (re.compile(r"^g6\."), "L4"),
    (re.compile(r"^g5\."), "A10G"),
    (re.compile(r"^g4dn\."), "T4"),
    (re.compile(r"^trn2"), "Trainium2"),
    (re.compile(r"^trn1"), "Trainium"),
    (re.compile(r"^inf2"), "Inferentia2"),
]


@dataclass(frozen=True)
class _Keys:
    access_key_id: str
    secret_access_key: str
    session_token: Optional[str] = None


def _region(creds: Creds) -> str:
    region = (creds.get("region") or "us-east-1").strip()
    if not _REGION.match(region):
        raise ProviderError("The AWS region is not valid (expected something like us-east-1)")
    return region


def _xml_first(xml: str, tag: str) -> Optional[str]:
    match = re.search(rf"<{tag}>(.*?)</{tag}>", xml, re.S)
    return unescape(match.group(1)).strip() if match else None


async def _query(ctx: AdapterContext, keys: _Keys, service: str, region: str, params: Dict[str, str]) -> str:
    host = "sts.amazonaws.com" if service == "sts" else f"{service}.{region}.amazonaws.com"
    url = f"https://{host}/"
    body = urlencode(params).encode("utf-8")
    headers = {"Content-Type": _FORM}
    headers.update(
        sign_v4(
            method="POST",
            url=url,
            headers=headers,
            body=body,
            access_key=keys.access_key_id,
            secret_key=keys.secret_access_key,
            session_token=keys.session_token,
            region="us-east-1" if service == "sts" else region,
            service=service,
        )
    )
    return (await ctx.http.request("POST", url, headers=headers, content=body)).text


async def _keys_for(ctx: AdapterContext, creds: Creds) -> _Keys:
    role_arn = creds.get("roleArn")
    if role_arn:
        platform_id, platform_secret = ctx.settings.aws_platform_key_id, ctx.settings.aws_platform_secret
        if not platform_id or not platform_secret:
            raise ProviderError(
                "Role connections need LightRail's AWS principal (LIGHTRAIL_AWS_ACCESS_KEY_ID / "
                "LIGHTRAIL_AWS_SECRET_ACCESS_KEY) configured on this server"
            )
        params = {
            "Action": "AssumeRole",
            "Version": "2011-06-15",
            "RoleArn": role_arn,
            "RoleSessionName": "lightos-control-plane",
            "DurationSeconds": "900",
        }
        if creds.get("externalId"):
            params["ExternalId"] = creds["externalId"]
        xml = await _query(ctx, _Keys(platform_id, platform_secret), "sts", "us-east-1", params)
        access, secret, token = (_xml_first(xml, t) for t in ("AccessKeyId", "SecretAccessKey", "SessionToken"))
        if not (access and secret and token):
            raise ProviderError("AWS returned an unexpected AssumeRole response")
        return _Keys(access, secret, token)
    access, secret = need(creds, "accessKeyId", "secretAccessKey")
    return _Keys(access, secret)


def _accelerator(instance_type: str) -> Optional[str]:
    return next((label for pattern, label in _GPU_FAMILIES if pattern.search(instance_type)), None)


async def validate(ctx: AdapterContext, creds: Creds) -> Validation:
    keys = await _keys_for(ctx, creds)
    xml = await _query(ctx, keys, "sts", "us-east-1", {"Action": "GetCallerIdentity", "Version": "2011-06-15"})
    return Validation(_xml_first(xml, "Arn") or "AWS principal")


async def inventory(ctx: AdapterContext, creds: Creds) -> List[Item]:
    region = _region(creds)
    keys = await _keys_for(ctx, creds)
    params = {
        "Action": "DescribeInstances",
        "Version": "2016-11-15",
        "MaxResults": "1000",
        "Filter.1.Name": "instance-type",
        "Filter.1.Value.1": "p*",
        "Filter.1.Value.2": "g*",
        "Filter.1.Value.3": "trn*",
        "Filter.1.Value.4": "inf*",
        "Filter.2.Name": "instance-state-name",
        "Filter.2.Value.1": "pending",
        "Filter.2.Value.2": "running",
        "Filter.2.Value.3": "stopping",
        "Filter.2.Value.4": "stopped",
    }
    xml = await _query(ctx, keys, "ec2", region, params)
    try:
        root = ET.fromstring(xml)
    except ET.ParseError as exc:
        raise ProviderError("AWS returned an unexpected response") from exc
    items: List[Item] = []
    for node in root.iterfind(".//{*}instancesSet/{*}item"):

        def text(path: str, node=node) -> Optional[str]:
            element = node.find(path)
            return element.text if element is not None else None

        instance_type = text("{*}instanceType") or ""
        items.append(
            make_item(
                "instance",
                text("{*}instanceId"),
                instance_type,
                accelerator=_accelerator(instance_type),
                region=text("{*}placement/{*}availabilityZone") or region,
                status=text("{*}instanceState/{*}name"),
            )
        )
    return items


ADAPTER = Adapter(validate=validate, inventory=inventory)
