"""
LightOS Cluster API
===================

Provides read and control access to Kubernetes workloads, Slurm job queues,
Ray cluster state, and LightRail CRD objects. In production this module
proxies the real Kubernetes API server, Slurm REST API, and Ray dashboard API.
Here it simulates realistic cluster state for the Phase 1 operator shell.

Endpoints
---------
GET  /cluster/k8s/pods                     — list pods across namespaces
GET  /cluster/k8s/pods/{name}              — pod detail
POST /cluster/k8s/pods/{name}/restart      — delete pod (triggers restart)

GET  /cluster/slurm/jobs                   — Slurm job queue
POST /cluster/slurm/jobs                   — submit Slurm job
POST /cluster/slurm/jobs/{job_id}/cancel   — cancel job

GET  /cluster/ray/nodes                    — Ray cluster node list
GET  /cluster/ray/status                   — Ray head node status

GET  /cluster/crds                         — LightRail CRD objects
GET  /cluster/crds/{kind}/{name}           — CRD detail
POST /cluster/crds/jobs                    — submit LightRailJob CRD

GET  /cluster/health                       — control plane health
GET  /cluster/stream                       — SSE stream of cluster events
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

router = APIRouter(prefix="/cluster", tags=["cluster"])

_now = datetime.now(timezone.utc)

# ─── Static cluster state ─────────────────────────────────────────────────────

PODS = [
    {
        "name": "lrd-controller-0", "namespace": "lightrail-system",
        "phase": "Running", "node": "lightos-ctrl-01",
        "cpu_req": "500m", "mem_req": "512Mi", "age": "8d", "restarts": 0,
        "image": "lightrail/lrd:2.0.1",
        "started_at": (_now - timedelta(days=8)).isoformat(),
        "labels": {"app.kubernetes.io/name": "lrd"},
    },
    {
        "name": "llama3-70b-prod-0", "namespace": "lightrail-inference",
        "phase": "Running", "node": "lightos-worker-01",
        "cpu_req": "4", "mem_req": "32Gi", "age": "2d", "restarts": 0,
        "image": "lightrail/llm-serving:0.9.4",
        "started_at": (_now - timedelta(days=2)).isoformat(),
        "labels": {"lr/model": "llama3-70b"},
    },
    {
        "name": "ray-head-0", "namespace": "lightrail-ray",
        "phase": "Running", "node": "lightos-worker-01",
        "cpu_req": "2", "mem_req": "8Gi", "age": "5h", "restarts": 0,
        "image": "lightrail/ray:2.9.3-lightrail",
        "started_at": (_now - timedelta(hours=5)).isoformat(),
        "labels": {"ray.io/node-type": "head"},
    },
    {
        "name": "train-job-llama-0", "namespace": "lightrail-jobs",
        "phase": "Running", "node": "lightos-worker-03",
        "cpu_req": "8", "mem_req": "128Gi", "age": "2h", "restarts": 0,
        "image": "lightrail/train-runner:0.4.1",
        "started_at": (_now - timedelta(hours=2)).isoformat(),
        "labels": {"lr/job-type": "training"},
    },
    {
        "name": "sdxl-inference-0", "namespace": "lightrail-inference",
        "phase": "Failed", "node": "lightos-edge-01",
        "cpu_req": "2", "mem_req": "16Gi", "age": "1h", "restarts": 4,
        "image": "lightrail/llm-serving:0.9.3",
        "started_at": (_now - timedelta(hours=1)).isoformat(),
        "labels": {"lr/model": "sdxl"},
    },
]

_SLURM_JOB_COUNTER = 10045
SLURM_JOBS = [
    {
        "job_id": 10042, "name": "llama3-finetune", "partition": "gpu-fabric",
        "state": "RUNNING", "nodes": 4, "cpus": 128,
        "submit_time": (_now - timedelta(hours=2, minutes=22)).isoformat(),
        "start_time": (_now - timedelta(hours=2, minutes=22)).isoformat(),
        "elapsed": "2:22:18", "priority": 100,
        "fabric": "photonic-mesh-20x64",
        "nccl_collective": "all-reduce",
        "user": "operator",
    },
    {
        "job_id": 10043, "name": "all-reduce-bench", "partition": "bench",
        "state": "COMPLETED", "nodes": 8, "cpus": 256,
        "submit_time": (_now - timedelta(hours=4)).isoformat(),
        "start_time": (_now - timedelta(hours=4)).isoformat(),
        "elapsed": "0:42:11", "priority": 50,
        "fabric": "fat-tree-32x64",
        "nccl_collective": "all-reduce",
        "user": "operator",
    },
    {
        "job_id": 10044, "name": "diffusion-xl-train", "partition": "gpu-fabric",
        "state": "PENDING", "nodes": 2, "cpus": 64,
        "submit_time": (_now - timedelta(minutes=30)).isoformat(),
        "start_time": None, "elapsed": None, "priority": 75,
        "fabric": "ring-topology-16x128",
        "nccl_collective": "ring-allreduce",
        "user": "operator",
    },
]

RAY_NODES = [
    {
        "node_id": "ray-001", "hostname": "lightos-worker-01", "status": "ALIVE",
        "cpus": 32, "cpu_used": 18, "mem_gb": 128, "mem_used_gb": 72,
        "object_store_gb": 50, "node_type": "head",
        "alive_since": (_now - timedelta(hours=5)).isoformat(),
    },
    {
        "node_id": "ray-002", "hostname": "lightos-worker-02", "status": "ALIVE",
        "cpus": 32, "cpu_used": 24, "mem_gb": 128, "mem_used_gb": 98,
        "object_store_gb": 50, "node_type": "worker",
        "alive_since": (_now - timedelta(hours=5)).isoformat(),
    },
    {
        "node_id": "ray-003", "hostname": "lightos-worker-03", "status": "RESTARTING",
        "cpus": 32, "cpu_used": 0, "mem_gb": 128, "mem_used_gb": 0,
        "object_store_gb": 50, "node_type": "worker",
        "alive_since": None,
    },
]

CRDS = [
    {
        "name": "prod-cluster", "kind": "LightRailCluster",
        "namespace": "lightrail-system", "phase": "Ready",
        "fabric": "photonic-mesh-20x64", "ranks": 8,
        "created_at": (_now - timedelta(days=8)).isoformat(),
        "spec": {"nodePoolRef": "worker-pool-a", "fabricId": "photonic-mesh-20x64"},
    },
    {
        "name": "train-job-llama", "kind": "LightRailJob",
        "namespace": "lightrail-jobs", "phase": "Running",
        "fabric": "photonic-mesh-20x64", "ranks": 64,
        "created_at": (_now - timedelta(hours=2)).isoformat(),
        "spec": {"jobType": "training", "nccl_collective": "all-reduce", "ranks": 64},
    },
    {
        "name": "worker-pool-a", "kind": "LightRailNodePool",
        "namespace": "lightrail-system", "phase": "Ready",
        "fabric": "photonic-mesh-20x64", "ranks": 4,
        "created_at": (_now - timedelta(days=8)).isoformat(),
        "spec": {"nodeSelector": {"lightrail.ai/fabric-id": "photonic-mesh-20x64"}, "size": 4},
    },
    {
        "name": "rolling-2.0.1", "kind": "LightRailOTAPolicy",
        "namespace": "lightrail-system", "phase": "Progressing",
        "fabric": None, "ranks": 0,
        "created_at": (_now - timedelta(hours=1)).isoformat(),
        "spec": {"targetImage": "2.0.1-stable", "strategy": "rolling"},
    },
]

# ─── Models ───────────────────────────────────────────────────────────────────

class SlurmJobRequest(BaseModel):
    name: str
    partition: str = "gpu-fabric"
    nodes: int = Field(ge=1, le=512)
    cpus_per_node: int = Field(default=32, ge=1)
    fabric: str = "photonic-mesh-20x64"
    nccl_collective: str = Field(default="all-reduce")
    script: str = Field(default="#!/bin/bash\n# job script")

class LightRailJobRequest(BaseModel):
    name: str
    namespace: str = "lightrail-jobs"
    job_type: str = Field(default="training", pattern="^(training|inference|compile|benchmark)$")
    ranks: int = Field(ge=1, le=4096)
    fabric: str = "photonic-mesh-20x64"
    nccl_collective: str = Field(default="all-reduce")
    image: str = Field(default="lightrail/train-runner:0.4.1")

# ─── Health ───────────────────────────────────────────────────────────────────

@router.get("/health")
async def cluster_health():
    running_pods = sum(1 for p in PODS if p["phase"] == "Running")
    return {
        "status": "ok",
        "service": "lightos-cluster-api",
        "version": "1.0.0",
        "control_plane": {
            "k3s": "healthy",
            "lightrail_operator": "healthy",
            "scheduler_extender": "healthy",
            "slurm_bridge": "healthy",
        },
        "stats": {
            "pods_running": running_pods,
            "pods_total": len(PODS),
            "slurm_jobs": len(SLURM_JOBS),
            "ray_nodes_alive": sum(1 for n in RAY_NODES if n["status"] == "ALIVE"),
            "crds": len(CRDS),
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

# ─── Kubernetes ───────────────────────────────────────────────────────────────

@router.get("/k8s/pods")
async def list_pods(
    namespace: Optional[str] = Query(None),
    phase: Optional[str] = Query(None),
):
    pods = PODS
    if namespace:
        pods = [p for p in pods if p["namespace"] == namespace]
    if phase:
        pods = [p for p in pods if p["phase"] == phase]
    return {"pods": pods, "total": len(pods)}


@router.get("/k8s/pods/{pod_name}")
async def get_pod(pod_name: str):
    pod = next((p for p in PODS if p["name"] == pod_name), None)
    if not pod:
        raise HTTPException(status_code=404, detail=f"Pod {pod_name} not found")
    return pod


@router.post("/k8s/pods/{pod_name}/restart")
async def restart_pod(pod_name: str):
    pod = next((p for p in PODS if p["name"] == pod_name), None)
    if not pod:
        raise HTTPException(status_code=404, detail=f"Pod {pod_name} not found")
    if pod["phase"] not in ("Failed", "Running"):
        raise HTTPException(status_code=409, detail=f"Cannot restart pod in phase {pod['phase']}")
    pod["phase"] = "Pending"
    pod["restarts"] = pod.get("restarts", 0) + 1
    return {"message": f"Pod {pod_name} deletion triggered. Kubernetes will recreate it.", "pod": pod}

# ─── Slurm ────────────────────────────────────────────────────────────────────

@router.get("/slurm/jobs")
async def list_slurm_jobs(
    state: Optional[str] = Query(None),
    partition: Optional[str] = Query(None),
):
    jobs = SLURM_JOBS
    if state:
        jobs = [j for j in jobs if j["state"] == state.upper()]
    if partition:
        jobs = [j for j in jobs if j["partition"] == partition]
    return {"jobs": jobs, "total": len(jobs)}


@router.post("/slurm/jobs", status_code=201)
async def submit_slurm_job(req: SlurmJobRequest):
    global _SLURM_JOB_COUNTER
    _SLURM_JOB_COUNTER += 1
    now = datetime.now(timezone.utc).isoformat()
    job = {
        "job_id": _SLURM_JOB_COUNTER,
        "name": req.name,
        "partition": req.partition,
        "state": "PENDING",
        "nodes": req.nodes,
        "cpus": req.nodes * req.cpus_per_node,
        "submit_time": now,
        "start_time": None,
        "elapsed": None,
        "priority": 50,
        "fabric": req.fabric,
        "nccl_collective": req.nccl_collective,
        "user": "operator",
    }
    SLURM_JOBS.append(job)
    return {"job": job, "message": f"Job {_SLURM_JOB_COUNTER} submitted to partition {req.partition}"}


@router.post("/slurm/jobs/{job_id}/cancel")
async def cancel_slurm_job(job_id: int):
    job = next((j for j in SLURM_JOBS if j["job_id"] == job_id), None)
    if not job:
        raise HTTPException(status_code=404, detail=f"Slurm job {job_id} not found")
    if job["state"] in ("COMPLETED", "FAILED", "CANCELLED"):
        raise HTTPException(status_code=409, detail=f"Job {job_id} is already terminal (state={job['state']})")
    job["state"] = "CANCELLED"
    return {"message": f"Job {job_id} cancelled.", "job": job}

# ─── Ray ──────────────────────────────────────────────────────────────────────

@router.get("/ray/nodes")
async def list_ray_nodes():
    return {"nodes": RAY_NODES, "total": len(RAY_NODES)}


@router.get("/ray/status")
async def ray_status():
    alive = [n for n in RAY_NODES if n["status"] == "ALIVE"]
    total_cpus = sum(n["cpus"] for n in RAY_NODES)
    used_cpus = sum(n["cpu_used"] for n in RAY_NODES)
    total_mem = sum(n["mem_gb"] for n in RAY_NODES)
    used_mem = sum(n["mem_used_gb"] for n in RAY_NODES)
    return {
        "cluster_healthy": len(alive) == len(RAY_NODES),
        "nodes_alive": len(alive),
        "nodes_total": len(RAY_NODES),
        "total_cpus": total_cpus,
        "used_cpus": used_cpus,
        "total_mem_gb": total_mem,
        "used_mem_gb": used_mem,
        "head_node": next((n for n in RAY_NODES if n["node_type"] == "head"), None),
    }

# ─── LightRail CRDs ───────────────────────────────────────────────────────────

@router.get("/crds")
async def list_crds(kind: Optional[str] = Query(None)):
    crds = CRDS
    if kind:
        crds = [c for c in crds if c["kind"].lower() == kind.lower()]
    return {"crds": crds, "total": len(crds)}


@router.get("/crds/{kind}/{name}")
async def get_crd(kind: str, name: str):
    crd = next((c for c in CRDS if c["kind"].lower() == kind.lower() and c["name"] == name), None)
    if not crd:
        raise HTTPException(status_code=404, detail=f"{kind}/{name} not found")
    return crd


@router.post("/crds/jobs", status_code=201)
async def submit_lightrail_job(req: LightRailJobRequest):
    job_id = f"lr-job-{uuid.uuid4().hex[:6]}"
    now = datetime.now(timezone.utc).isoformat()
    crd = {
        "name": req.name,
        "kind": "LightRailJob",
        "namespace": req.namespace,
        "phase": "Pending",
        "fabric": req.fabric,
        "ranks": req.ranks,
        "created_at": now,
        "spec": {
            "jobType": req.job_type,
            "nccl_collective": req.nccl_collective,
            "ranks": req.ranks,
            "image": req.image,
        },
        "status": {
            "jobId": job_id,
            "fabricRoute": None,
            "scheduledNodes": [],
        },
    }
    CRDS.append(crd)
    return {"crd": crd, "message": f"LightRailJob {req.name} submitted. Fabric-aware scheduler will place it."}

# ─── Cluster event stream ─────────────────────────────────────────────────────

_EVENT_TEMPLATES = [
    ("info",    "Pod {name} scheduled on {node}"),
    ("info",    "Slurm job {job_id} started on {n} nodes"),
    ("warning", "Fabric segment {seg} congestion spike: {pct}%"),
    ("info",    "Ray worker {host} alive: {cpus} CPUs available"),
    ("info",    "LightRailJob {name} fabric route resolved: {fabric}"),
    ("warning", "OTA agent on {host}: staging image 2.0.1-stable"),
]

_NODES = ["lightos-worker-01", "lightos-worker-02", "lightos-worker-03"]
_SEGS = ["NCE-01→NCE-02", "NCE-02→NCE-03", "NCE-03→NCE-04"]


@router.get("/stream")
async def cluster_event_stream(interval_ms: int = Query(default=3000, ge=1000, le=10000)):
    """SSE stream of synthetic cluster events for live UI updates."""

    async def _gen():
        while True:
            tpl_level, tpl_msg = random.choice(_EVENT_TEMPLATES)
            msg = tpl_msg.format(
                name=random.choice(["train-job-llama-0", "codegen-0", "sdxl-0"]),
                node=random.choice(_NODES),
                job_id=random.randint(10040, 10060),
                n=random.choice([2, 4, 8]),
                seg=random.choice(_SEGS),
                pct=random.randint(70, 95),
                host=random.choice(_NODES),
                cpus=random.choice([16, 32]),
                fabric=random.choice(["photonic-mesh-20x64", "ring-topology-16x128"]),
            )
            event = {
                "id": uuid.uuid4().hex[:8],
                "level": tpl_level,
                "message": msg,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            yield f"data: {json.dumps(event)}\n\n"
            await asyncio.sleep(interval_ms / 1000)

    return StreamingResponse(
        _gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
