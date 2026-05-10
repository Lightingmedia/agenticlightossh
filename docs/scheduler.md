# LightRail Fabric-Aware Scheduler

## Overview

The LightRail fabric-aware scheduler is a Kubernetes scheduler extender that scores node candidates based on photonic fabric locality, congestion, NCCL collective efficiency, and bandwidth reservation conflicts.

It integrates with the standard `kube-scheduler` via the extender API and also provides a Slurm SPANK plugin and Ray resource label adapter.

---

## Scoring Algorithm

For a candidate node set S (pod placement), the score is:

```
score(S) = α · fabric_locality(S)
         - β · congestion_penalty(S)
         + γ · nccl_efficiency(S, collective_type)
         - δ · bw_reservation_conflict(S)
```

### Default Weights

| Weight | Default | Description |
|--------|---------|-------------|
| α | 0.40 | Fabric locality preference |
| β | 0.30 | Congestion penalty |
| γ | 0.20 | NCCL collective efficiency |
| δ | 0.10 | Bandwidth reservation conflict |

Weights are configurable per `LightRailJob` via `spec.schedulerWeights`.

---

## Term Definitions

### fabric_locality(S)

Measures how close nodes in S are in the photonic fabric topology.

```
fabric_locality(S) = 1 - (max_hop_distance(S) / max_fabric_diameter)
```

- `max_hop_distance(S)`: maximum hop count between any two nodes in S (photonic hops, not IP hops)
- `max_fabric_diameter`: maximum possible diameter of the fabric (e.g. 2·layers for a mesh)
- Range: [0, 1] where 1 = all nodes on the same fabric layer segment

**Implementation:** the fabric driver exposes a `topology_distance(node_a, node_b)` RPC. The scheduler queries this for all node pairs in S using a pre-cached topology matrix (refreshed every 30 s).

---

### congestion_penalty(S)

Penalizes node sets where the fabric segments used are under high load.

```
congestion_penalty(S) = mean({ congestion_score(seg) for seg in segments(S) })
```

- `segments(S)`: set of fabric segments traversed by any collective operation across nodes in S
- `congestion_score(seg)`: current utilization of segment, range [0, 1], from telemetry
- Segments with `congestion_score > 0.85` are filtered out entirely (hard constraint)

---

### nccl_efficiency(S, collective_type)

Scores how well the fabric topology supports the NCCL collective pattern of the job.

```
nccl_efficiency(S, collective_type) = pattern_match(topology(S), collective_type)
```

**Pattern matching table:**

| Collective Type | Preferred Topology | Efficiency Heuristic |
|----------------|-------------------|----------------------|
| `all-reduce` | Full mesh or ring | 1 - (ring_deviation / ring_size) |
| `ring-allreduce` | Ring | Exact ring detection in fabric graph |
| `all-gather` | Star / fat-tree | Intra-layer segment utilization |
| `reduce-scatter` | Bisection bandwidth | min(bisection_bw_gbps / required_bw) |
| `point-to-point` | Direct link | direct_link_exists(src, dst) |
| `broadcast` | Tree topology | tree_depth(S) / log2(|S|) |

---

### bw_reservation_conflict(S)

Penalizes placements that conflict with existing bandwidth reservations from `LightRailFabricRoute` objects.

```
bw_reservation_conflict(S) = sum({ conflict_fraction(seg, S) for seg in reserved_segments })

conflict_fraction(seg, S) = max(0, (reserved_bw(seg) + required_bw(S, seg) - capacity_bw(seg)) / capacity_bw(seg))
```

---

## Hard Constraints (Filter Phase)

Before scoring, the scheduler filters out any node that fails these constraints:

1. **Fabric membership**: node must be enrolled in the target `LightRailCluster`
2. **GPU availability**: node must have sufficient free GPU slots
3. **Congestion gate**: no segment in `segments({node})` may have `congestion_score > 0.85`
4. **Attestation**: node's lrd attestation status must be `verified` (from Fleet API cache)
5. **OS version**: node must run `>= spec.minOSVersion` if specified

---

## Slurm SPANK Plugin

The `lightrail_fabric.so` SPANK plugin injects fabric-aware node constraints into Slurm jobs.

**Activation (slurm.conf):**
```
PlugStackConfig=/etc/slurm/plugstack.conf
```

**plugstack.conf:**
```
required /usr/lib/slurm/lightrail_fabric.so
```

**User-facing Slurm flags:**
```bash
sbatch --fabric-preference=locality \
       --fabric-collective=all-reduce \
       --fabric-min-bw=400 \
       myjob.sh
```

The plugin resolves these flags by calling the fabric scheduler's `/slurm/score` HTTP endpoint and sets `--nodelist` accordingly.

---

## Ray Integration

The fabric scheduler publishes custom resource labels on Ray nodes:

```
LightRailFabricId_<cluster>_<layer>_<segment>: 1.0
```

Ray jobs request fabric locality via:

```python
@ray.remote(resources={"LightRailFabricId_prod-cluster_0_0": 1.0})
def my_collective_task():
    ...
```

The `lrd` daemon on each node registers these labels with the Ray head node at startup and refreshes them every 60 s based on current fabric topology.

---

## Configuration

Scheduler configuration lives in a ConfigMap in `lightrail-system`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fabric-scheduler-config
  namespace: lightrail-system
data:
  config.yaml: |
    weights:
      alpha: 0.40   # fabric locality
      beta: 0.30    # congestion penalty
      gamma: 0.20   # nccl efficiency
      delta: 0.10   # bw reservation conflict
    topology_cache_ttl_s: 30
    congestion_hard_gate: 0.85
    attestation_required: true
    slurm_endpoint: http://localhost:9091
    ray_head: redis://10.0.1.11:6379
```

---

## Metrics

The scheduler exposes Prometheus metrics at `:9090/metrics`:

| Metric | Type | Description |
|--------|------|-------------|
| `lightrail_scheduler_score_latency_ms` | Histogram | Scoring latency per request |
| `lightrail_scheduler_filtered_nodes` | Counter | Nodes filtered per reason |
| `lightrail_scheduler_placed_jobs` | Counter | Successfully placed jobs |
| `lightrail_fabric_congestion_score` | Gauge | Per-segment congestion (label: segment) |
| `lightrail_fabric_locality_score` | Histogram | Locality scores for placed jobs |
