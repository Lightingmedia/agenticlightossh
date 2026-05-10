"""
Fleet Management API
====================

Endpoints
---------
GET    /fleet/devices                  — list enrolled devices
POST   /fleet/devices/enroll           — enroll a new device (TPM PCR quote)
GET    /fleet/devices/{id}             — get device detail
DELETE /fleet/devices/{id}             — revoke device enrollment
POST   /fleet/devices/{id}/attest      — trigger fresh TPM attestation
GET    /fleet/devices/{id}/telemetry   — SSE stream of live telemetry

GET    /fleet/ota/policies             — list OTA policies
POST   /fleet/ota/policies             — create OTA policy
PUT    /fleet/ota/policies/{id}        — update OTA policy
DELETE /fleet/ota/policies/{id}        — delete OTA policy
POST   /fleet/ota/deploy               — trigger OTA to device group

GET    /fleet/certs                    — list device certificates
POST   /fleet/certs/renew/{device_id}  — renew device certificate
POST   /fleet/certs/revoke/{device_id} — revoke device certificate
"""
import asyncio
import json
import secrets
import time
from datetime import datetime, timezone
from typing import Literal, Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

router = APIRouter(prefix="/fleet", tags=["fleet"])

# ─── In-memory stores (replace with DB in production) ────────────────────────

DEVICES: dict[str, dict] = {
    "dev-001": {
        "id": "dev-001",
        "hostname": "lightos-node-01",
        "serial": "LR2024-001",
        "model": "LightRail Edge X1",
        "ip": "10.0.1.11",
        "status": "online",
        "os_version": "lightos-2.0.1",
        "attestation": "verified",
        "pcr_digest": "sha256:4a9f2b3c...",
        "cert_expires": "2025-11-01",
        "last_seen": "2024-10-15T08:23:11Z",
        "enrolled_at": "2024-01-10T09:00:00Z",
        "tags": ["gpu-node", "prod"],
    },
    "dev-002": {
        "id": "dev-002",
        "hostname": "lightos-node-02",
        "serial": "LR2024-002",
        "model": "LightRail Edge X1",
        "ip": "10.0.1.12",
        "status": "online",
        "os_version": "lightos-2.0.1",
        "attestation": "verified",
        "pcr_digest": "sha256:7c1d4e8a...",
        "cert_expires": "2025-11-01",
        "last_seen": "2024-10-15T08:23:09Z",
        "enrolled_at": "2024-01-10T09:00:00Z",
        "tags": ["gpu-node", "prod"],
    },
    "dev-003": {
        "id": "dev-003",
        "hostname": "lightos-edge-03",
        "serial": "LR2024-003",
        "model": "LightRail Edge E1",
        "ip": "10.0.2.11",
        "status": "updating",
        "os_version": "lightos-1.9.8",
        "attestation": "pending",
        "pcr_digest": None,
        "cert_expires": "2025-08-15",
        "last_seen": "2024-10-15T08:22:55Z",
        "enrolled_at": "2024-03-22T14:00:00Z",
        "tags": ["edge", "staging"],
    },
    "dev-004": {
        "id": "dev-004",
        "hostname": "lightos-node-04",
        "serial": "LR2024-004",
        "model": "LightRail Spine S1",
        "ip": "10.0.1.14",
        "status": "offline",
        "os_version": "lightos-2.0.0",
        "attestation": "verified",
        "pcr_digest": "sha256:2e8b1f5d...",
        "cert_expires": "2025-11-01",
        "last_seen": "2024-10-14T22:11:03Z",
        "enrolled_at": "2024-01-10T09:00:00Z",
        "tags": ["spine", "prod"],
    },
}

OTA_POLICIES: dict[str, dict] = {
    "policy-001": {
        "id": "policy-001",
        "name": "Prod Weekly Rollout",
        "target_version": "lightos-2.0.1",
        "selector": {"tags": ["prod"]},
        "strategy": "rolling",
        "max_unavailable": 1,
        "schedule": "sun 02:00 UTC",
        "enabled": True,
        "created_at": "2024-09-01T00:00:00Z",
    },
    "policy-002": {
        "id": "policy-002",
        "name": "Edge Canary",
        "target_version": "lightos-2.1.0-rc1",
        "selector": {"tags": ["staging"]},
        "strategy": "canary",
        "max_unavailable": 1,
        "schedule": "manual",
        "enabled": True,
        "created_at": "2024-10-01T00:00:00Z",
    },
}

# ─── Models ───────────────────────────────────────────────────────────────────

class EnrollRequest(BaseModel):
    hostname: str
    serial: str
    model: str
    pcr_quote: str = Field(description="Base64-encoded TPM2_Quote blob")
    pcr_signature: str = Field(description="TPM2_Quote ECDSA signature over nonce")
    nonce: str = Field(description="Server-issued enrollment nonce")
    ek_cert: str = Field(description="PEM-encoded TPM Endorsement Key certificate")


class OTAPolicyCreate(BaseModel):
    name: str
    target_version: str
    selector: dict
    strategy: Literal["rolling", "canary", "immediate"] = "rolling"
    max_unavailable: int = Field(default=1, ge=1)
    schedule: str = "manual"
    enabled: bool = True


class OTADeployRequest(BaseModel):
    policy_id: str
    device_ids: Optional[list[str]] = None  # None = all matching selector


# ─── Devices ──────────────────────────────────────────────────────────────────

@router.get("/devices")
async def list_devices(status: Optional[str] = None, tag: Optional[str] = None):
    devices = list(DEVICES.values())
    if status:
        devices = [d for d in devices if d["status"] == status]
    if tag:
        devices = [d for d in devices if tag in d.get("tags", [])]
    return devices


@router.post("/devices/enroll", status_code=201)
async def enroll_device(req: EnrollRequest):
    # In production: validate PCR quote against known-good PCR values,
    # verify EK cert chain against TPM manufacturer CA,
    # check nonce matches a recently issued server nonce.
    # Here we simulate a successful attestation.
    device_id = f"dev-{secrets.token_hex(3)}"
    now = datetime.now(timezone.utc).isoformat()
    device = {
        "id": device_id,
        "hostname": req.hostname,
        "serial": req.serial,
        "model": req.model,
        "ip": "0.0.0.0",  # set post-enrollment via DHCP registration
        "status": "pending",
        "os_version": "unknown",
        "attestation": "verified",
        "pcr_digest": f"sha256:{req.pcr_quote[:16]}...",
        "cert_expires": "2025-11-01",
        "last_seen": now,
        "enrolled_at": now,
        "tags": [],
    }
    DEVICES[device_id] = device
    return {"device": device, "message": "Enrollment successful. Device cert will be issued via EST /simpleenroll."}


@router.get("/devices/{device_id}")
async def get_device(device_id: str):
    if device_id not in DEVICES:
        raise HTTPException(status_code=404, detail="Device not found")
    return DEVICES[device_id]


@router.delete("/devices/{device_id}", status_code=204)
async def revoke_device(device_id: str):
    if device_id not in DEVICES:
        raise HTTPException(status_code=404, detail="Device not found")
    del DEVICES[device_id]


@router.post("/devices/{device_id}/attest")
async def attest_device(device_id: str):
    if device_id not in DEVICES:
        raise HTTPException(status_code=404, detail="Device not found")
    DEVICES[device_id]["attestation"] = "verified"
    DEVICES[device_id]["last_seen"] = datetime.now(timezone.utc).isoformat()
    return {"status": "verified", "device_id": device_id}


# ─── Telemetry SSE ────────────────────────────────────────────────────────────

async def _telemetry_generator(device_id: str):
    import random
    for _ in range(60):  # stream up to 60 samples (~60 s at 1 Hz)
        sample = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "device_id": device_id,
            "cpu_pct": round(random.uniform(20, 95), 1),
            "mem_pct": round(random.uniform(40, 85), 1),
            "gpu_pct": round(random.uniform(60, 100), 1),
            "gpu_temp_c": round(random.uniform(55, 82), 1),
            "power_w": round(random.uniform(180, 400), 1),
            "fabric_rx_gbps": round(random.uniform(10, 80), 2),
            "fabric_tx_gbps": round(random.uniform(10, 80), 2),
        }
        yield f"data: {json.dumps(sample)}\n\n"
        await asyncio.sleep(1.0)
    yield "data: [DONE]\n\n"


@router.get("/devices/{device_id}/telemetry")
async def device_telemetry(device_id: str):
    if device_id not in DEVICES:
        raise HTTPException(status_code=404, detail="Device not found")
    return StreamingResponse(
        _telemetry_generator(device_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ─── OTA Policies ─────────────────────────────────────────────────────────────

@router.get("/ota/policies")
async def list_ota_policies():
    return list(OTA_POLICIES.values())


@router.post("/ota/policies", status_code=201)
async def create_ota_policy(req: OTAPolicyCreate):
    policy_id = f"policy-{secrets.token_hex(4)}"
    policy = {
        "id": policy_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        **req.model_dump(),
    }
    OTA_POLICIES[policy_id] = policy
    return policy


@router.put("/ota/policies/{policy_id}")
async def update_ota_policy(policy_id: str, req: OTAPolicyCreate):
    if policy_id not in OTA_POLICIES:
        raise HTTPException(status_code=404, detail="Policy not found")
    OTA_POLICIES[policy_id].update(req.model_dump())
    return OTA_POLICIES[policy_id]


@router.delete("/ota/policies/{policy_id}", status_code=204)
async def delete_ota_policy(policy_id: str):
    if policy_id not in OTA_POLICIES:
        raise HTTPException(status_code=404, detail="Policy not found")
    del OTA_POLICIES[policy_id]


@router.post("/ota/deploy")
async def deploy_ota(req: OTADeployRequest):
    if req.policy_id not in OTA_POLICIES:
        raise HTTPException(status_code=404, detail="Policy not found")
    policy = OTA_POLICIES[req.policy_id]
    targets = req.device_ids or [d["id"] for d in DEVICES.values()]
    for did in targets:
        if did in DEVICES:
            DEVICES[did]["status"] = "updating"
    return {
        "message": f"OTA deployment triggered for {len(targets)} device(s)",
        "policy": policy["name"],
        "target_version": policy["target_version"],
        "device_ids": targets,
    }


# ─── Certificates ─────────────────────────────────────────────────────────────

@router.get("/certs")
async def list_certs():
    return [
        {
            "device_id": d["id"],
            "hostname": d["hostname"],
            "cert_expires": d["cert_expires"],
            "serial": d["serial"],
            "issuer": "LightRail Fleet CA — Intermediate G1",
        }
        for d in DEVICES.values()
    ]


@router.post("/certs/renew/{device_id}")
async def renew_cert(device_id: str):
    if device_id not in DEVICES:
        raise HTTPException(status_code=404, detail="Device not found")
    DEVICES[device_id]["cert_expires"] = "2026-11-01"
    return {"status": "renewed", "device_id": device_id, "new_expiry": "2026-11-01"}


@router.post("/certs/revoke/{device_id}")
async def revoke_cert(device_id: str):
    if device_id not in DEVICES:
        raise HTTPException(status_code=404, detail="Device not found")
    DEVICES[device_id]["attestation"] = "revoked"
    DEVICES[device_id]["status"] = "offline"
    return {"status": "revoked", "device_id": device_id}
