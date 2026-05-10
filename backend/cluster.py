"""
Cluster Management API
======================

Endpoints
---------
GET  /cluster/k8s/pods              — list pods across namespaces
POST /cluster/k8s/pods/{ns}/{name}/restart  — restart pod
GET  /cluster/k8s/events            — SSE stream of K8s-style events

GET  /cluster/slurm/jobs            — list Slurm queue
POST /cluster/slurm/jobs/submit     — submit a Slurm batch job
POST /cluster/slurm/jobs/{id}/cancel — cancel Slurm job
GET  /cluster/slurm/nodes           — Slurm node list

GET  /cluster/ray/status            — Ray cluster status
GET  /cluster/ray/jobs              — Ray job list

GET  /cluster/crds                  — list LightRail CRD instances
POST /cluster/crds/jobs             — submit a LightRailJob CRD
GET  /cluster/events                — SSE event stream (all subsystems)
"""
import asyncio
import json
import random
import secrets
from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

router = APIRouter(prefix="/cluster", tags=["cluster"])

# ─── In-memory stores ────────────────────────────────────────────────────────

K8S_PODS: list[dict] = [
    {"namespace": "lightrail-system", "name": "lrd-controller-7d9f8c-x4kpq", "status": "Running", "ready": "1/1", "restarts": 0, "node": "node-01", "age": "12d", "image": "lightrail/lrd:v0.3.0"},
    {"namespace": "lightrail-system", "name": "fabric-scheduler-5bc9d-m8nzr", "status": "Running", "ready": "1/1", "restarts": 0, "node": "node-02", "age": "12d", "image": "lightrail/fabric-scheduler:v0.3.0"},
    {"namespace": "lightrail-system", "name": "telemetry-collector-6fg2h-p1qws", "status": "Running", "ready": "1/1", "restarts": 2, "node": "node-01", "age": "12d", "image": "lightrail/telemetry:v0.2.1"},
    {"namespace": "inference", "name": "llama-3-70b-serving-0", "status": "Running", "ready": "1/1", "restarts": 0, "node": "node-03", "age": "3d", "image": "lightrail/vllm:0.5.0"},
    {"namespace": "inference", "name": "llama-3-70b-serving-1", "status": "Running", "ready": "1/1", "restarts": 0, "node": "node-04", "age": "3d", "image": "lightrail/vllm:0.5.0"},
    {"namespace": "inference", "name": "embedding-svc-84d9c-r7tlv", "status": "Pending", "ready": "0/1", "restarts": 0, "node": "<none>", "age": "2m", "image": "lightrail/embedding:v1.2.0"},
    {"namespace": "monitoring", "name": "prometheus-0", "status": "Running", "ready": "1/1", "restarts": 0, "node": "node-02", "age": "30d", "image": "prom/prometheus:v2.47.0"},
    {"namespace": "monitoring", "name": "grafana-6c7d9-k2pnt", "status": "Running", "ready": "1/1", "restarts": 0, "node": "node-02", "age": "30d", "image": "grafana/grafana:10.2.0"},
]

SLURM_JOBS: list[dict] = [
    {"id": "1042", "name": "attention_train_v3", "state": "RUNNING", "user": "researcher", "partition": "gpu", "nodes": 4, "time_limit": "4:00:00", "time_used": "1:23:11", "priority": 1000},
    {"id": "1043", "name": "embedding_finetune", "state": "PENDING", "user": "mlops", "partition": "gpu", "nodes": 2, "time_limit": "2:00:00", "time_used": "0:00:00", "priority": 800},
    {"id": "1044", "name": "bench_fabric_bw", "state": "PENDING", "user": "sysadmin", "partition": "fabric", "nodes": 8, "time_limit": "0:30:00", "time_used": "0:00:00", "priority": 500},
    {"id": "1040", "name": "llm_eval_mmlu", "state": "COMPLETED", "user": "researcher", "partition": "gpu", "nodes": 1, "time_limit": "1:00:00", "time_used": "0:51:22", "priority": 0},
    {"id": "1041", "name": "data_preprocess", "state": "FAILED", "user": "mlops", "partition": "cpu", "nodes": 2, "time_limit": "0:20:00", "time_used": "0:04:09", "priority": 0},
]

SLURM_NODES: list[dict] = [
    {"name": "node-01", "state": "alloc", "cpus": 128, "cpus_used": 96, "mem_mb": 512000, "mem_used_mb": 420000, "gpus": 8, "gpus_used": 8},
    {"name": "node-02", "state": "alloc", "cpus": 128, "cpus_used": 64, "mem_mb": 512000, "mem_used_mb": 280000, "gpus": 8, "gpus_used": 4},
    {"name": "node-03", "state": "alloc", "cpus": 128, "cpus_used": 128, "mem_mb": 512000, "mem_used_mb": 498000, "gpus": 8, "gpus_used": 8},
    {"name": "node-04", "state": "alloc", "cpus": 128, "cpus_used": 128, "mem_mb": 512000, "mem_used_mb": 490000, "gpus": 8, "gpus_used": 8},
    {"name": "node-05", "state": "idle", "cpus": 128, "cpus_used": 0, "mem_mb": 512000, "mem_used_mb": 12000, "gpus": 8, "gpus_used": 0},
    {"name": "node-06", "state": "down", "cpus": 128, "cpus_used": 0, "mem_mb": 512000, "mem_used_mb": 0, "gpus": 8, "gpus_used": 0},
]

RAY_STATUS = {
    "head_node": "10.0.1.11:6379",
    "dashboard": "http://10.0.1.11:8265",
    "total_nodes": 4,
    "alive_nodes": 4,
    "total_cpus": 512,
    "used_cpus": 344,
    "total_gpus": 32,
    "used_gpus": 28,
    "total_memory_gb": 2048,
    "used_memory_gb": 1420,
    "object_store_gb": 400,
    "jobs_running": 2,
    "jobs_pending": 1,
}

RAY_JOBS: list[dict] = [
    {"id": "raysubmit_aBcDeF", "name": "vllm-serve", "status": "RUNNING", "runtime_s": 72883, "entrypoint": "python serve.py --model llama-3-70b"},
    {"id": "raysubmit_GhIjKl", "name": "data-pipeline", "status": "RUNNING", "runtime_s": 3601, "entrypoint": "python pipeline.py --shards 32"},
    {"id": "raysubmit_MnOpQr", "name": "eval-harness", "status": "PENDING", "runtime_s": 0, "entrypoint": "python eval.py --benchmark mmlu"},
]

LIGHTRAIL_CRDS: list[dict] = [
    {"kind": "LightRailCluster", "name": "prod-cluster", "namespace": "lightrail-system", "status": "Ready", "age": "30d", "spec_summary": "20-layer mesh, 64 nodes/layer"},
    {"kind": "LightRailJob", "name": "llama-train-001", "namespace": "lightrail-system", "status": "Succeeded", "age": "2d", "spec_summary": "4 nodes, all-reduce, llama-3-70b"},
    {"kind": "LightRailJob", "name": "embed-finetune-002", "namespace": "lightrail-system", "status": "Running", "age": "3h", "spec_summary": "2 nodes, ring-allreduce"},
    {"kind": "LightRailNodePool", "name": "gpu-pool-a", "namespace": "lightrail-system", "status": "Ready", "age": "30d", "spec_summary": "4 nodes, GPU tier"},
    {"kind": "LightRailOTAPolicy", "name": "prod-weekly", "namespace": "lightrail-system", "status": "Active", "age": "10d", "spec_summary": "rolling, lightos-2.0.1"},
    {"kind": "LightRailFabricRoute", "name": "mesh-route-alpha", "namespace": "lightrail-system", "status": "Bound", "age": "30d", "spec_summary": "layer 0-4 locality preference"},
]

# ─── Models ───────────────────────────────────────────────────────────────────

class SlurmSubmitRequest(BaseModel):
    name: str
    partition: Literal["gpu", "cpu", "fabric"] = "gpu"
    nodes: int = Field(default=1, ge=1, le=64)
    time_limit: str = "1:00:00"
    script: str = Field(description="Batch script body (sbatch script)")
    priority: int = Field(default=500, ge=0, le=9999)


class LightRailJobRequest(BaseModel):
    name: str
    namespace: str = "lightrail-system"
    nodes: int = Field(default=2, ge=1)
    collective: Literal["all-reduce", "ring-allreduce", "all-gather", "point-to-point"] = "all-reduce"
    model: str = ""
    image: str = "lightrail/vllm:0.5.0"
    fabric_preference: str = "locality"


# ─── Kubernetes ───────────────────────────────────────────────────────────────

@router.get("/k8s/pods")
async def list_pods(namespace: Optional[str] = None):
    pods = K8S_PODS
    if namespace:
        pods = [p for p in pods if p["namespace"] == namespace]
    return pods


@router.post("/k8s/pods/{namespace}/{name}/restart")
async def restart_pod(namespace: str, name: str):
    for pod in K8S_PODS:
        if pod["namespace"] == namespace and pod["name"] == name:
            pod["restarts"] += 1
            pod["age"] = "0s"
            pod["status"] = "Terminating"
            return {"status": "restarting", "pod": name}
    raise HTTPException(status_code=404, detail="Pod not found")


@router.get("/k8s/events")
async def k8s_events():
    async def _gen():
        events = [
            {"type": "Normal", "reason": "Pulled", "object": "pod/lrd-controller-7d9f8c-x4kpq", "message": "Image pulled successfully"},
            {"type": "Normal", "reason": "Scheduled", "object": "pod/embedding-svc-84d9c-r7tlv", "message": "Assigned to node-05"},
            {"type": "Warning", "reason": "BackOff", "object": "pod/embedding-svc-84d9c-r7tlv", "message": "Back-off pulling image"},
        ]
        for evt in events:
            evt["ts"] = datetime.now(timezone.utc).isoformat()
            yield f"data: {json.dumps(evt)}\n\n"
            await asyncio.sleep(0.5)
        yield "data: [DONE]\n\n"
    return StreamingResponse(_gen(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# ─── Slurm ────────────────────────────────────────────────────────────────────

@router.get("/slurm/jobs")
async def list_slurm_jobs(state: Optional[str] = None):
    jobs = SLURM_JOBS
    if state:
        jobs = [j for j in jobs if j["state"].upper() == state.upper()]
    return jobs


@router.post("/slurm/jobs/submit", status_code=201)
async def submit_slurm_job(req: SlurmSubmitRequest):
    job_id = str(random.randint(1050, 9999))
    job = {
        "id": job_id,
        "name": req.name,
        "state": "PENDING",
        "user": "api",
        "partition": req.partition,
        "nodes": req.nodes,
        "time_limit": req.time_limit,
        "time_used": "0:00:00",
        "priority": req.priority,
    }
    SLURM_JOBS.insert(0, job)
    return {"job_id": job_id, "status": "PENDING"}


@router.post("/slurm/jobs/{job_id}/cancel")
async def cancel_slurm_job(job_id: str):
    for job in SLURM_JOBS:
        if job["id"] == job_id:
            if job["state"] in ("COMPLETED", "FAILED", "CANCELLED"):
                raise HTTPException(status_code=409, detail=f"Job already in terminal state: {job['state']}")
            job["state"] = "CANCELLED"
            return {"status": "cancelled", "job_id": job_id}
    raise HTTPException(status_code=404, detail="Job not found")


@router.get("/slurm/nodes")
async def list_slurm_nodes():
    return SLURM_NODES


# ─── Ray ──────────────────────────────────────────────────────────────────────

@router.get("/ray/status")
async def ray_status():
    return RAY_STATUS


@router.get("/ray/jobs")
async def list_ray_jobs():
    return RAY_JOBS


# ─── LightRail CRDs ───────────────────────────────────────────────────────────

@router.get("/crds")
async def list_crds(kind: Optional[str] = None):
    crds = LIGHTRAIL_CRDS
    if kind:
        crds = [c for c in crds if c["kind"] == kind]
    return crds


@router.post("/crds/jobs", status_code=201)
async def submit_lightrail_job(req: LightRailJobRequest):
    job = {
        "kind": "LightRailJob",
        "name": req.name,
        "namespace": req.namespace,
        "status": "Pending",
        "age": "0s",
        "spec_summary": f"{req.nodes} nodes, {req.collective}, {req.model or req.image}",
    }
    LIGHTRAIL_CRDS.append(job)
    return {"status": "created", "job": job}


# ─── Unified event stream ─────────────────────────────────────────────────────

@router.get("/events")
async def cluster_events():
    async def _gen():
        sources = ["k8s", "slurm", "ray", "lrd"]
        for i in range(20):
            evt = {
                "ts": datetime.now(timezone.utc).isoformat(),
                "source": random.choice(sources),
                "level": random.choice(["info", "info", "info", "warn", "error"]),
                "message": random.choice([
                    "Pod scheduled on node-03",
                    "Slurm job 1042: checkpoint saved",
                    "Ray actor pool scaled to 16",
                    "Fabric congestion on layer-3 segment 7",
                    "OTA download complete on dev-003",
                    "PCR attestation verified for dev-001",
                    "LightRailJob embed-finetune-002: epoch 4/10",
                ]),
            }
            yield f"data: {json.dumps(evt)}\n\n"
            await asyncio.sleep(0.3)
        yield "data: [DONE]\n\n"
    return StreamingResponse(_gen(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
