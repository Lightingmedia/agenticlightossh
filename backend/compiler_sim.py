"""
LightRail compiler simulation engine.

Produces a realistic, streaming sequence of log lines for each of the 6
compilation stages.  All timings and values are deterministically seeded
from the (fabric, function_name) pair so the demo is repeatable.
"""
import asyncio
import hashlib
import math
import random
import time
from typing import AsyncIterator

from fabrics import FabricPreset, get_fabric


# ─── Kernel profiles ─────────────────────────────────────────────────────────
KERNEL_PROFILES = {
    "attention_kernel": {
        "instrs": 6, "blocks": 3, "ssa_vals": 4,
        "fma_fusions": 1, "dce_removed": 0,
        "prefetch_dist": 2, "tiles": 1,
        "lrbs_bytes": 64, "sections": 1,
        "parse_ms": 0.22,
    },
    "conv_layer": {
        "instrs": 12, "blocks": 5, "ssa_vals": 8,
        "fma_fusions": 3, "dce_removed": 1,
        "prefetch_dist": 4, "tiles": 4,
        "lrbs_bytes": 256, "sections": 4,
        "parse_ms": 0.31,
    },
    "linear_layer": {
        "instrs": 4, "blocks": 2, "ssa_vals": 3,
        "fma_fusions": 1, "dce_removed": 0,
        "prefetch_dist": 1, "tiles": 1,
        "lrbs_bytes": 48, "sections": 1,
        "parse_ms": 0.15,
    },
    "gpt_block": {
        "instrs": 48, "blocks": 18, "ssa_vals": 32,
        "fma_fusions": 9, "dce_removed": 3,
        "prefetch_dist": 8, "tiles": 12,
        "lrbs_bytes": 1024, "sections": 12,
        "parse_ms": 0.87,
    },
    "transformer_encoder": {
        "instrs": 36, "blocks": 14, "ssa_vals": 24,
        "fma_fusions": 7, "dce_removed": 2,
        "prefetch_dist": 6, "tiles": 8,
        "lrbs_bytes": 768, "sections": 8,
        "parse_ms": 0.64,
    },
    "softmax": {
        "instrs": 5, "blocks": 2, "ssa_vals": 4,
        "fma_fusions": 0, "dce_removed": 0,
        "prefetch_dist": 1, "tiles": 1,
        "lrbs_bytes": 40, "sections": 1,
        "parse_ms": 0.12,
    },
    "matmul": {
        "instrs": 3, "blocks": 1, "ssa_vals": 3,
        "fma_fusions": 1, "dce_removed": 0,
        "prefetch_dist": 1, "tiles": 1,
        "lrbs_bytes": 32, "sections": 1,
        "parse_ms": 0.10,
    },
}

def _profile(fn: str) -> dict:
    """Return profile for fn, generating one for unknown names."""
    key = fn.lower().replace("-", "_").replace(" ", "_")
    if key in KERNEL_PROFILES:
        return dict(KERNEL_PROFILES[key])
    # Derive plausible values from the name hash
    h = int(hashlib.md5(fn.encode()).hexdigest(), 16)
    r = random.Random(h)
    instrs = r.randint(4, 32)
    return {
        "instrs": instrs,
        "blocks": max(1, instrs // 3),
        "ssa_vals": max(2, instrs // 2),
        "fma_fusions": r.randint(0, instrs // 4),
        "dce_removed": r.randint(0, 2),
        "prefetch_dist": r.choice([1, 2, 4, 8]),
        "tiles": max(1, instrs // 6),
        "lrbs_bytes": instrs * 16,
        "sections": max(1, instrs // 6),
        "parse_ms": round(r.uniform(0.1, 0.9), 2),
    }


def _fingerprint(fabric_name: str, fn: str) -> str:
    digest = hashlib.sha256(f"{fabric_name}:{fn}".encode()).hexdigest()
    return digest[:8] + "…" + digest[-8:]


def _compile_time(profile: dict, fabric: FabricPreset) -> float:
    base = (
        profile["parse_ms"]
        + profile["instrs"] * 0.04
        + math.log(fabric.nodes + 1) * 0.3
        + profile["tiles"] * 0.12
        + fabric.congestion_score * 2.0
    )
    return round(base + random.uniform(-0.05, 0.15), 2)


# ─── Line generators per stage ───────────────────────────────────────────────

def _stage1_lines(p: dict, fn: str) -> list[dict]:
    return [
        {"type": "step", "text": f"[1/6] AST Parsing & IR"},
        {"type": "info", "text": f"  parsing  {fn}…"},
        {"type": "ok",   "text": f"  ✓  {p['instrs']} instructions, {p['blocks']} basic blocks, {p['ssa_vals']} SSA values"},
        {"type": "ok",   "text": f"  ✓  SSA uniquified · phi nodes inserted · typed IR emitted"},
        {"type": "ok",   "text": f"  ✓  parse time: {p['parse_ms']} ms"},
    ]

def _stage2_lines(p: dict) -> list[dict]:
    dce_msg = f"  ✓  DCE: {p['dce_removed']} op{'s' if p['dce_removed']!=1 else ''} removed" if p['dce_removed'] else "  ✓  DCE: 0 ops removed"
    return [
        {"type": "step", "text": "[2/6] Type Inference & Lowering"},
        {"type": "ok",   "text": "  ✓  FP32[…] propagated via forward dataflow"},
        {"type": "ok",   "text": "  ✓  TERNARY/ANALOG types resolved"},
        {"type": "ok",   "text": dce_msg},
        {"type": "ok",   "text": "  ✓  Cast lowering complete"},
    ]

def _stage3_lines(p: dict) -> list[dict]:
    lines = [{"type": "step", "text": "[3/6] Photonic Optimisation"}]
    if p["fma_fusions"]:
        lines.append({"type": "ok", "text": f"  ✓  FMA fusion: {p['fma_fusions']} FMUL+FADD → FMA"})
    else:
        lines.append({"type": "info", "text": "  -  no FMA candidates"})
    lines += [
        {"type": "ok", "text": f"  ✓  Loop split: PREFETCH distance={p['prefetch_dist']}"},
        {"type": "ok", "text": "  ✓  Anderson alias analysis: no unsafe aliasing"},
    ]
    return lines

def _stage4_lines(p: dict, fabric: FabricPreset, fp: str) -> list[dict]:
    ch_list = list(range(min(p["instrs"], fabric.wdm_channels)))[:8]
    ch_str  = str(ch_list) if len(ch_list) < 8 else f"[0…{min(p['instrs'],fabric.wdm_channels)-1}]"
    solver  = "HungarianSolver" if p["instrs"] <= 64 else "CriticalPathSolver"
    return [
        {"type": "step", "text": f"[4/6] WDM & Wavelength Mapping  [TAR + MathSched]"},
        {"type": "ok",   "text": f"  ✓  Topology fingerprint: {fp}"},
        {"type": "ok",   "text": f"  ✓  Congestion score: {fabric.congestion_score:.3f}"},
        {"type": "ok",   "text": f"  ✓  Dijkstra solved — {fabric.nodes} nodes ({fabric.topology} topology)"},
        {"type": "ok",   "text": f"  ✓  {solver} n={p['instrs']} → channels {ch_str}"},
        {"type": "ok",   "text": f"  ✓  WDM channels available: {fabric.wdm_channels}"},
    ]

def _stage5_lines(p: dict, fabric: FabricPreset) -> list[dict]:
    tile_layers = min(p["tiles"], fabric.layers)
    fat_kb = round(p["lrbs_bytes"] * p["sections"] / 1024, 1)
    return [
        {"type": "step", "text": "[5/6] Tile Bytecode & Fat Binary"},
        {"type": "ok",   "text": f"  ✓  Partitioned: {p['instrs']} ops → {tile_layers} tile{'s' if tile_layers!=1 else ''}"},
        {"type": "ok",   "text": f"  ✓  .lrbs: {p['lrbs_bytes']} B  |  .lrfat: {p['sections']} section{'s' if p['sections']!=1 else ''}  ({fat_kb} KB)"},
        {"type": "ok",   "text": "  ✓  CRC32 integrity stamp applied"},
        {"type": "ok",   "text": "  ✓  JSON manifest written"},
    ]

def _stage6_lines(fabric: FabricPreset) -> list[dict]:
    return [
        {"type": "step", "text": "[6/6] Fabric OS Handoff"},
        {"type": "ok",   "text": f"  ✓  KernelDescriptor dispatched (<{fabric.dispatch_ns} ns)"},
        {"type": "ok",   "text": f"  ✓  UNIX socket IPC with fabric daemon — ACK received"},
        {"type": "ok",   "text": f"  ✓  GlobalScheduler queued on {fabric.topology} fabric"},
    ]

def _banner_lines(compile_ms: float, fp: str, fabric: FabricPreset, cached: bool) -> list[dict]:
    cache_str = "HIT  (<200 ns overhead)" if cached else "MISS → stored"
    return [
        {"type": "banner", "text": ""},
        {"type": "banner", "text": f"  compile time          : {compile_ms} ms  |  cache: {cache_str}"},
        {"type": "banner", "text": f"  wdm_channels          : {fabric.wdm_channels}  |  mathematically_optimal: True"},
        {"type": "banner", "text": f"  topology_fingerprint  : {fp}"},
        {"type": "banner", "text": f"  fabric                : {fabric.display}"},
        {"type": "banner", "text": f"  dispatch_latency      : <{fabric.dispatch_ns} ns  |  bw: {fabric.bw_gbps} Gbps/link"},
    ]


# ─── Public streaming API ─────────────────────────────────────────────────────

STAGE_DELAYS_MS = [280, 220, 300, 380, 250, 200, 0]  # delay before each stage / banner

async def stream_compilation(
    fabric_name: str,
    function_name: str,
    cached: bool = False,
    stream_delay_ms: int = 120,
) -> AsyncIterator[dict]:
    """
    Async generator that yields log-line dicts one at a time.
    Each dict: { "type": str, "text": str, "stage": int|None }
    """
    fabric = get_fabric(fabric_name)
    p = _profile(function_name)
    fp = _fingerprint(fabric_name, function_name)
    compile_ms = _compile_time(p, fabric)

    # Header
    yield {"type": "cmd", "text": f"@lightrail.jit — compiling {function_name}…", "stage": None}
    yield {"type": "info","text": f"  fabric  : {fabric.display}", "stage": None}
    yield {"type": "info","text": f"  nodes   : {fabric.nodes}  ({fabric.layers}×{fabric.wdm_channels})", "stage": None}
    await asyncio.sleep(STAGE_DELAYS_MS[0] / 1000)

    stages = [
        (1, _stage1_lines(p, function_name)),
        (2, _stage2_lines(p)),
        (3, _stage3_lines(p)),
        (4, _stage4_lines(p, fabric, fp)),
        (5, _stage5_lines(p, fabric)),
        (6, _stage6_lines(fabric)),
    ]

    for stage_num, lines in stages:
        for line in lines:
            line["stage"] = stage_num
            yield line
            await asyncio.sleep(stream_delay_ms / 1000)
        await asyncio.sleep(STAGE_DELAYS_MS[stage_num] / 1000)

    for line in _banner_lines(compile_ms, fp, fabric, cached):
        line["stage"] = None
        yield line
        await asyncio.sleep(stream_delay_ms / 1000)

    # Terminal sentinel
    yield {"type": "done", "text": "", "stage": None,
           "meta": {
               "compile_ms": compile_ms,
               "cached": cached,
               "wdm_channels": fabric.wdm_channels,
               "dispatch_ns": fabric.dispatch_ns,
               "fingerprint": fp,
               "fabric": fabric.name,
           }}
