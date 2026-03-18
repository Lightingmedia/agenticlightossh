"""
Fabric presets — each defines the physical photonic mesh topology parameters
that the compiler simulation uses to produce realistic, fabric-specific output.
"""
import random
from dataclasses import dataclass, field
from typing import List

@dataclass
class FabricPreset:
    name: str               # canonical key
    display: str            # human label
    layers: int             # NCE layers (rows)
    wdm_channels: int       # WDM channels per layer (columns)
    nodes: int              # total graph nodes (layers × channels)
    topology: str           # ring | mesh | butterfly | fat-tree | custom
    dispatch_ns: int        # Fabric OS optical dispatch budget (ns)
    bw_gbps: int            # per-link bandwidth (Gbps)
    fingerprint_prefix: str # hex prefix for topology SHA-256 (for realism)
    congestion_score: float # 0.0–1.0 (lower = less congested)
    tags: List[str] = field(default_factory=list)

FABRIC_PRESETS: dict[str, FabricPreset] = {
    "photonic-mesh-20x64": FabricPreset(
        name="photonic-mesh-20x64",
        display="Photonic Mesh 20×64 (default)",
        layers=20, wdm_channels=64, nodes=1280,
        topology="mesh", dispatch_ns=98,
        bw_gbps=400,
        fingerprint_prefix="a3f8c91d",
        congestion_score=0.12,
        tags=["default", "production"],
    ),
    "photonic-mesh-40x32": FabricPreset(
        name="photonic-mesh-40x32",
        display="Photonic Mesh 40×32",
        layers=40, wdm_channels=32, nodes=1280,
        topology="mesh", dispatch_ns=112,
        bw_gbps=400,
        fingerprint_prefix="b7d1e043",
        congestion_score=0.18,
        tags=["high-depth"],
    ),
    "ring-topology-16x128": FabricPreset(
        name="ring-topology-16x128",
        display="Ring 16×128",
        layers=16, wdm_channels=128, nodes=2048,
        topology="ring", dispatch_ns=87,
        bw_gbps=800,
        fingerprint_prefix="c2a5f87e",
        congestion_score=0.08,
        tags=["high-bandwidth", "llm"],
    ),
    "butterfly-8x256": FabricPreset(
        name="butterfly-8x256",
        display="Butterfly 8×256",
        layers=8, wdm_channels=256, nodes=2048,
        topology="butterfly", dispatch_ns=72,
        bw_gbps=1600,
        fingerprint_prefix="d9b3c561",
        congestion_score=0.05,
        tags=["ultra-wide", "inference"],
    ),
    "fat-tree-32x64": FabricPreset(
        name="fat-tree-32x64",
        display="Fat-Tree 32×64",
        layers=32, wdm_channels=64, nodes=2048,
        topology="fat-tree", dispatch_ns=95,
        bw_gbps=400,
        fingerprint_prefix="e4f72a09",
        congestion_score=0.22,
        tags=["training", "all-reduce"],
    ),
    "custom": FabricPreset(
        name="custom",
        display="Custom Fabric",
        layers=20, wdm_channels=64, nodes=1280,
        topology="custom", dispatch_ns=100,
        bw_gbps=400,
        fingerprint_prefix="f1d8b240",
        congestion_score=0.15,
        tags=["custom"],
    ),
}

def get_fabric(name: str) -> FabricPreset:
    """Return a preset by name, falling back to 'custom' with derived params."""
    if name in FABRIC_PRESETS:
        return FABRIC_PRESETS[name]
    # Parse NxM pattern like "photonic-mesh-12x96"
    import re
    m = re.search(r"(\d+)[x×](\d+)", name, re.IGNORECASE)
    if m:
        L, W = int(m.group(1)), int(m.group(2))
        return FabricPreset(
            name=name,
            display=f"Custom Fabric {L}×{W}",
            layers=L, wdm_channels=W, nodes=L*W,
            topology="mesh", dispatch_ns=90 + random.randint(-10, 20),
            bw_gbps=400,
            fingerprint_prefix=f"{random.randint(0, 0xFFFFFFFF):08x}",
            congestion_score=round(random.uniform(0.05, 0.35), 2),
            tags=["custom"],
        )
    # Unknown name — treat as custom
    preset = FABRIC_PRESETS["custom"]
    preset.display = f'Custom Fabric "{name}"'
    return preset
