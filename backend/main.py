"""
LightOS — FastAPI backend
=========================

Endpoints
---------
GET  /api/fabrics                        — list all fabric presets
POST /api/compile                        — SSE stream of compilation log lines
GET  /api/compile/ping                   — health-check

GET  /inference/llm-serving              — list LLM deployments
POST /inference/llm-serving/deploy       — create a new deployment
POST /inference/llm-serving/scale        — scale replicas
POST /inference/llm-serving/restart      — restart a deployment
POST /inference/llm-serving/rollback     — rollback to previous config
GET  /inference/llm-serving/logs         — fetch deployment logs
GET  /inference/llm-serving/metrics      — fetch serving metrics

/fleet/*                                 — fleet management (enrollment, OTA, certs, telemetry)
/cluster/*                               — cluster management (k8s, slurm, ray, crds)

Run locally:
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000
"""
import json

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from compiler_sim import stream_compilation
from fabrics import FABRIC_PRESETS, get_fabric
from llm_serving import router as llm_serving_router
from fleet import router as fleet_router
from cluster import router as cluster_router

app = FastAPI(title="LightOS API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────

app.include_router(llm_serving_router)
app.include_router(fleet_router)
app.include_router(cluster_router)

# ─── Health ───────────────────────────────────────────────────────────────────

@app.get("/api/compile/ping")
async def ping():
    return {"status": "ok", "service": "lightrail-compiler", "version": "1.0.0"}


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "service": "lightos-api",
        "version": "1.0.0",
        "subsystems": {
            "compiler": "ok",
            "fabrics": "ok",
            "llm_serving": "ok",
            "fleet": "ok",
            "cluster": "ok",
        },
    }

# ─── Fabrics ──────────────────────────────────────────────────────────────────

@app.get("/api/fabrics")
async def list_fabrics():
    return [
        {
            "name": f.name,
            "display": f.display,
            "layers": f.layers,
            "wdm_channels": f.wdm_channels,
            "nodes": f.nodes,
            "topology": f.topology,
            "dispatch_ns": f.dispatch_ns,
            "bw_gbps": f.bw_gbps,
            "congestion_score": f.congestion_score,
            "tags": f.tags,
        }
        for f in FABRIC_PRESETS.values()
    ]

# ─── Compile (SSE stream) ─────────────────────────────────────────────────────

class CompileRequest(BaseModel):
    fabric: str = Field(default="photonic-mesh-20x64")
    function_name: str = Field(default="attention_kernel")
    cached: bool = Field(default=False)
    stream_delay_ms: int = Field(default=120, ge=0, le=2000)


async def _sse_generator(req: CompileRequest):
    async for line in stream_compilation(
        fabric_name=req.fabric,
        function_name=req.function_name,
        cached=req.cached,
        stream_delay_ms=req.stream_delay_ms,
    ):
        payload = json.dumps(line, ensure_ascii=False)
        yield f"data: {payload}\n\n"
    yield "data: [DONE]\n\n"


@app.post("/api/compile")
async def compile_kernel(req: CompileRequest):
    return StreamingResponse(
        _sse_generator(req),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
