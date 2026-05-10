"""
LightOS Fleet API
=================

Manages device enrollment, identity, OTA policies, and certificate lifecycle
for LightOS fleet nodes. In production, device certificates are TPM-backed
and all endpoints require mTLS. This module simulates the full lifecycle.

Endpoints
---------
GET  /fleet/devices                    — list all devices
GET  /fleet/devices/{id}               — device detail
POST /fleet/devices                    — provision a new device
POST /fleet/devices/{id}/enroll        — enroll (issue device cert)
POST /fleet/devices/{id}/decommission  — decommission a device

GET  /fleet/ota/policies               — list OTA policies
POST /fleet/ota/policies               — create OTA policy
POST /fleet/ota/policies/{id}/trigger  — force rollout now

GET  /fleet/certs                      — all certificate records
POST /fleet/certs/{device_id}/renew    — trigger cert renewal

GET  /fleet/telemetry/{device_id}      — latest telemetry snapshot
GET  /fleet/telemetry/stream           — SSE stream of fleet telemetry (all devices)

GET  /fleet/health                     — fleet API health
"""

import asyncio
import json
import random
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

router = APIRouter(prefix="/fleet", tags=["fleet"])

# ─── In-memory store (replace with PostgreSQL in production) ──────────────────

_now = datetime.now(timezone.utc)

DEVICES: dict[str, dict] = {
    "dev-001": {
        "id": "dev-001",
        "hostname": "lightos-ctrl-01",
        "serial": "LR-NCE-2024-0001",
        "sku": "LightRail Controller Gen2",
        "state": "active",
        "ota_status": "current",
        "image_version": "2.0.1-stable",
        "cert_status": "valid",
        "cert_expiry": (_now + timedelta(days=189)).isoformat(),
        "cert_serial": "0A:1B:2C:3D:4E:5F",
        "enrolled_at": (_now - timedelta(days=250)).isoformat(),
        "last_seen": _now.isoformat(),
        "ip": "10.10.0.1",
        "fabric_id": "photonic-mesh-20x64",
        "tpm_present": True,
        "attestation_ok": True,
        "pcr_quote": "a3f8c91d...",
        "location": "Rack A-01",
    },
    "dev-002": {
        "id": "dev-002",
        "hostname": "lightos-worker-01",
        "serial": "LR-NCE-2024-0002",
        "sku": "LightRail Worker Gen2",
        "state": "active",
        "ota_status": "update-available",
        "image_version": "2.0.0-stable",
        "cert_status": "valid",
        "cert_expiry": (_now + timedelta(days=189)).isoformat(),
        "cert_serial": "0A:1B:2C:3D:4E:60",
        "enrolled_at": (_now - timedelta(days=250)).isoformat(),
        "last_seen": (_now - timedelta(seconds=12)).isoformat(),
        "ip": "10.10.0.2",
        "fabric_id": "photonic-mesh-20x64",
        "tpm_present": True,
        "attestation_ok": True,
        "pcr_quote": "b7d1e043...",
        "location": "Rack A-01",
    },
    "dev-003": {
        "id": "dev-003",
        "hostname": "lightos-worker-02",
        "serial": "LR-NCE-2024-0003",
        "sku": "LightRail Worker Gen2",
        "state": "active",
        "ota_status": "update-available",
        "image_version": "2.0.0-stable",
        "cert_status": "expiring-soon",
        "cert_expiry": (_now + timedelta(days=24)).isoformat(),
        "cert_serial": "0A:1B:2C:3D:4E:61",
        "enrolled_at": (_now - timedelta(days=250)).isoformat(),
        "last_seen": (_now - timedelta(seconds=8)).isoformat(),
        "ip": "10.10.0.3",
        "fabric_id": "photonic-mesh-20x64",
        "tpm_present": True,
        "attestation_ok": True,
        "pcr_quote": "c2a5f87e...",
        "location": "Rack A-02",
    },
    "dev-006": {
        "id": "dev-006",
        "hostname": "lightos-worker-04",
        "serial": "LR-NCE-2024-0005",
        "sku": "LightRail Worker Gen2",
        "state": "provisioned",
        "ota_status": "unknown",
        "image_version": None,
        "cert_status": "pending",
        "cert_expiry": None,
        "cert_serial": None,
        "enrolled_at": None,
        "last_seen": None,
        "ip": "10.10.0.5",
        "fabric_id": None,
        "tpm_present": True,
        "attestation_ok": False,
        "pcr_quote": None,
        "location": "Rack A-02",
    },
}

OTA_POLICIES: dict[str, dict] = {
    "policy-001": {
        "id": "policy-001",
        "name": "Production Rolling",
        "channel": "stable",
        "strategy": "rolling",
        "maintenance_window": "Sun 02:00-06:00 UTC",
        "target_image": "2.0.1-stable",
        "target_devices": ["dev-002", "dev-003"],
        "applied_devices": [],
        "frozen": False,
        "created_at": (_now - timedelta(hours=2)).isoformat(),
    },
    "policy-002": {
        "id": "policy-002",
        "name": "Edge Canary",
        "channel": "beta",
        "strategy": "canary",
        "maintenance_window": "Daily 03:00-05:00 UTC",
        "target_image": "2.1.0-beta1",
        "target_devices": [],
        "applied_devices": [],
        "frozen": False,
        "created_at": (_now - timedelta(hours=1)).isoformat(),
    },
}

# ─── Models ───────────────────────────────────────────────────────────────────

class ProvisionRequest(BaseModel):
    hostname: str
    serial: str = Field(..., description="Device serial number")
    sku: str = Field(default="LightRail Worker Gen2")
    ip: str
    location: str = ""
    tpm_present: bool = True

class EnrollRequest(BaseModel):
    csr_pem: str = Field(..., description="PKCS#10 CSR PEM from TPM-backed key")
    pcr_quote: str = Field(..., description="TPM PCR[0-7] quote (hex)")
    pcr_signature: str = Field(default="", description="TPM signature over PCR quote")

class OTAPolicyRequest(BaseModel):
    name: str
    channel: str = Field(default="stable", pattern="^(stable|beta|canary)$")
    strategy: str = Field(default="rolling", pattern="^(rolling|canary|all-at-once|manual)$")
    maintenance_window: str = Field(default="Sun 02:00-06:00 UTC")
    target_image: str
    target_device_ids: list[str] = Field(default_factory=list)

# ─── Health ───────────────────────────────────────────────────────────────────

@router.get("/health")
async def fleet_health():
    return {
        "status": "ok",
        "service": "lightos-fleet-api",
        "version": "1.0.0",
        "device_count": len(DEVICES),
        "active_count": sum(1 for d in DEVICES.values() if d["state"] == "active"),
        "fleet_ca": "online",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

# ─── Devices ──────────────────────────────────────────────────────────────────

@router.get("/devices")
async def list_devices(
    state: Optional[str] = Query(None),
    ota_status: Optional[str] = Query(None),
):
    devices = list(DEVICES.values())
    if state:
        devices = [d for d in devices if d["state"] == state]
    if ota_status:
        devices = [d for d in devices if d["ota_status"] == ota_status]
    return {"devices": devices, "total": len(devices)}


@router.get("/devices/{device_id}")
async def get_device(device_id: str):
    if device_id not in DEVICES:
        raise HTTPException(status_code=404, detail=f"Device {device_id} not found")
    return DEVICES[device_id]


@router.post("/devices", status_code=201)
async def provision_device(req: ProvisionRequest):
    device_id = f"dev-{uuid.uuid4().hex[:6]}"
    now = datetime.now(timezone.utc).isoformat()
    device = {
        "id": device_id,
        "hostname": req.hostname,
        "serial": req.serial,
        "sku": req.sku,
        "state": "provisioned",
        "ota_status": "unknown",
        "image_version": None,
        "cert_status": "pending",
        "cert_expiry": None,
        "cert_serial": None,
        "enrolled_at": None,
        "last_seen": None,
        "ip": req.ip,
        "fabric_id": None,
        "tpm_present": req.tpm_present,
        "attestation_ok": False,
        "pcr_quote": None,
        "location": req.location,
        "created_at": now,
    }
    DEVICES[device_id] = device
    return {"device": device, "message": "Device provisioned. Complete enrollment to activate."}


@router.post("/devices/{device_id}/enroll")
async def enroll_device(device_id: str, req: EnrollRequest):
    if device_id not in DEVICES:
        raise HTTPException(status_code=404, detail=f"Device {device_id} not found")
    device = DEVICES[device_id]
    if device["state"] == "active":
        raise HTTPException(status_code=409, detail="Device already enrolled")

    # In production: verify PCR quote against known-good baseline,
    # validate CSR, have Fleet CA sign it, return signed cert PEM.
    # Here we simulate acceptance.
    known_good_pcrs = {"pcr0": "3a4b5c", "pcr1": "7e8f90", "pcr2": "a1b2c3"}
    if req.pcr_quote.startswith("FAIL"):
        raise HTTPException(status_code=403, detail="PCR attestation failed: PCR values do not match known-good baseline")

    now = datetime.now(timezone.utc)
    cert_serial = uuid.uuid4().hex[:12].upper()
    cert_serial_fmt = ":".join(cert_serial[i:i+2] for i in range(0, 12, 2))
    cert_expiry = (now + timedelta(days=365)).isoformat()

    device.update({
        "state": "enrolled",
        "cert_status": "valid",
        "cert_expiry": cert_expiry,
        "cert_serial": cert_serial_fmt,
        "enrolled_at": now.isoformat(),
        "last_seen": now.isoformat(),
        "attestation_ok": True,
        "pcr_quote": req.pcr_quote,
        "ota_status": "unknown",
    })

    # Simulate transitioning to active after enrollment
    device["state"] = "active"
    device["ota_status"] = "current"
    device["image_version"] = "2.0.1-stable"

    return {
        "device": device,
        "cert_pem": f"-----BEGIN CERTIFICATE-----\n[signed by LightRail Fleet CA]\nCN={device['hostname']}\nSN={cert_serial_fmt}\n-----END CERTIFICATE-----",
        "message": "Device enrolled successfully. Certificate issued.",
    }


@router.post("/devices/{device_id}/decommission")
async def decommission_device(device_id: str):
    if device_id not in DEVICES:
        raise HTTPException(status_code=404, detail=f"Device {device_id} not found")
    DEVICES[device_id]["state"] = "decommissioned"
    DEVICES[device_id]["cert_status"] = "expired"
    return {"message": f"Device {device_id} decommissioned and certificate revoked."}

# ─── OTA Policies ─────────────────────────────────────────────────────────────

@router.get("/ota/policies")
async def list_ota_policies():
    return {"policies": list(OTA_POLICIES.values())}


@router.post("/ota/policies", status_code=201)
async def create_ota_policy(req: OTAPolicyRequest):
    policy_id = f"policy-{uuid.uuid4().hex[:6]}"
    now = datetime.now(timezone.utc).isoformat()
    policy = {
        "id": policy_id,
        "name": req.name,
        "channel": req.channel,
        "strategy": req.strategy,
        "maintenance_window": req.maintenance_window,
        "target_image": req.target_image,
        "target_devices": req.target_device_ids,
        "applied_devices": [],
        "frozen": False,
        "created_at": now,
    }
    OTA_POLICIES[policy_id] = policy
    return {"policy": policy}


@router.post("/ota/policies/{policy_id}/trigger")
async def trigger_ota_policy(policy_id: str):
    if policy_id not in OTA_POLICIES:
        raise HTTPException(status_code=404, detail=f"Policy {policy_id} not found")
    policy = OTA_POLICIES[policy_id]
    if policy["frozen"]:
        raise HTTPException(status_code=409, detail="Policy is frozen. Unfreeze before triggering.")
    # In production: dispatch OTA agent tasks to target devices via lrd gRPC
    return {
        "message": f"OTA rollout triggered for policy '{policy['name']}'",
        "target_devices": policy["target_devices"],
        "target_image": policy["target_image"],
    }

# ─── Certificates ─────────────────────────────────────────────────────────────

@router.get("/certs")
async def list_certs():
    certs = [
        {
            "device_id": d["id"],
            "hostname": d["hostname"],
            "cert_status": d["cert_status"],
            "cert_expiry": d["cert_expiry"],
            "cert_serial": d["cert_serial"],
            "tpm_present": d["tpm_present"],
        }
        for d in DEVICES.values()
    ]
    return {"certs": certs}


@router.post("/certs/{device_id}/renew")
async def renew_cert(device_id: str):
    if device_id not in DEVICES:
        raise HTTPException(status_code=404, detail=f"Device {device_id} not found")
    device = DEVICES[device_id]
    if device["state"] not in ("active", "enrolled"):
        raise HTTPException(status_code=409, detail="Cannot renew cert on non-active device")

    now = datetime.now(timezone.utc)
    cert_serial = uuid.uuid4().hex[:12].upper()
    cert_serial_fmt = ":".join(cert_serial[i:i+2] for i in range(0, 12, 2))
    device["cert_expiry"] = (now + timedelta(days=365)).isoformat()
    device["cert_serial"] = cert_serial_fmt
    device["cert_status"] = "valid"

    return {
        "device_id": device_id,
        "cert_serial": cert_serial_fmt,
        "cert_expiry": device["cert_expiry"],
        "message": "Certificate renewed successfully.",
    }

# ─── Telemetry ────────────────────────────────────────────────────────────────

def _random_telemetry(device_id: str) -> dict:
    return {
        "device_id": device_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "fabric_bw_gbps": round(random.uniform(80, 400), 1),
        "thermal_c": round(random.uniform(38, 88), 1),
        "power_w": round(random.uniform(120, 450), 1),
        "utilization_pct": round(random.uniform(10, 99), 1),
        "congestion": round(random.uniform(0.0, 0.4), 3),
        "uptime_s": random.randint(3600, 864000),
    }


@router.get("/telemetry/{device_id}")
async def get_device_telemetry(device_id: str):
    if device_id not in DEVICES:
        raise HTTPException(status_code=404, detail=f"Device {device_id} not found")
    return _random_telemetry(device_id)


@router.get("/telemetry/stream")
async def stream_fleet_telemetry(interval_ms: int = Query(default=2000, ge=500, le=10000)):
    """SSE stream of telemetry snapshots for all active devices."""

    async def _gen():
        active_ids = [d["id"] for d in DEVICES.values() if d["state"] == "active"]
        while True:
            batch = {dev_id: _random_telemetry(dev_id) for dev_id in active_ids}
            payload = json.dumps(batch, ensure_ascii=False)
            yield f"data: {payload}\n\n"
            await asyncio.sleep(interval_ms / 1000)

    return StreamingResponse(
        _gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
