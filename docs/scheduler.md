# LightRail Fabric-Aware + NCCL-Aware Scheduler

**Component:** `lightrail-scheduler`  
**Integration:** Kubernetes scheduler extender + Slurm `select` plugin  
**gRPC service:** port 7100 (served by `lrd`)

---

## Problem Statement

Standard Kubernetes and Slurm schedulers place AI workloads without knowledge of:
1. Photonic fabric topology — which nodes share high-bandwidth NCE links
2. Current link utilization — congested links degrade collective performance
3. NCCL communication pattern — `all-reduce`, `ring`, `all-gather` have different topology requirements
4. BW reservation state — concurrent jobs competing for the same fabric segments

A poorly placed 64-rank all-reduce job running across fabric-segment boundaries with 30% congestion can be 3–5× slower than the same job placed on topologically adjacent nodes with clear links.

The LightRail scheduler solves this by making placement decisions from live fabric telemetry and NCCL pattern analysis.

---

## Data Sources

### Topology Graph

`lrd` maintains an in-memory topology graph `G = (V, E)` where:
- `V` = nodes (workers, controllers, edge nodes)
- `E` = fabric links between nodes (annotated with `bw_gbps`, `latency_ns`, `topology_type`)

The graph is rebuilt every 30 seconds from NCE hardware register reads via PCIe MMIO. Changes (node join/leave, link failures) trigger immediate partial updates.

The topology is exposed via gRPC:

```protobuf
service FabricTopology {
  rpc GetTopology (TopologyRequest) returns (TopologyResponse);
  rpc GetBandwidthMatrix (BWMatrixRequest) returns (BWMatrixResponse);
  rpc GetCongestionMap (CongestionRequest) returns (CongestionResponse);
  rpc ReserveBandwidth (BWReservationRequest) returns (BWReservationResponse);
  rpc ReleaseBandwidth (BWReleaseRequest) returns (BWReleaseResponse);
}
```

### Bandwidth Matrix

`B[i][j]` = available bandwidth (Gbps) between node `i` and node `j` at the time of the query.

Sampled every 1 second per fabric segment. Rolling 30-second average used for scheduling decisions (avoids reacting to transient spikes).

### Congestion Map

`C[l]` = congestion score [0.0, 1.0] on link `l`. Derived from:
- NCE optical power monitor readings
- Per-link packet drop counters
- ECMP load balance distribution

A score of `C[l] > 0.25` is considered elevated; `> 0.5` is high congestion; `> 0.75` triggers a scheduler backpressure flag.

### NCCL Collective Type

Jobs annotate their expected communication pattern:

```yaml
metadata:
  annotations:
    lightrail.ai/nccl-collective: all-reduce   # all-reduce | all-gather | reduce-scatter | ring | tree | p2p
    lightrail.ai/bw-demand-gbps: "320"         # total expected fabric demand
```

---

## Placement Algorithm

### Step 1: Candidate Generation

For a job requesting `N` ranks:

1. Query topology service → get current nodes `V_active` (those with `lightrail.ai/role: worker` and not cordoned)
2. Filter by hard constraints:
   - Node has required fabric label: `lightrail.ai/fabric-id == job.fabricId`
   - Node is not at max pod density
   - `C[all links to node] < 0.75` (not in high congestion)
3. Enumerate candidate node sets `S ⊆ V_active`, `|S| = N`
   - For `N ≤ 8`: full enumeration
   - For `N > 8`: greedy seed-and-expand using a fabric-locality greedy algorithm

### Step 2: Scoring

Each candidate set `S` receives a composite score:

```
score(S) = α·fabric_locality(S)
         - β·congestion_penalty(S)
         + γ·nccl_efficiency(S, collective_type)
         - δ·bw_reservation_conflict(S)
```

**fabric_locality(S):**
```
Σ B[i,j] for all (i,j) ∈ S × S, i ≠ j
─────────────────────────────────────────
N · (N - 1)
```
Higher = more internal bandwidth among selected nodes.

**congestion_penalty(S):**
```
max(C[l] for l in all links on paths between nodes in S)
```
Single highest-congestion link on critical paths.

**nccl_efficiency(S, collective_type):**

| Collective | Optimal topology | Efficiency formula |
|---|---|---|
| `all-reduce` | Ring or fat-tree | Penalize long ring diameter |
| `all-gather` | Fat-tree | Prefer balanced fan-out |
| `ring-allreduce` | Ring | Reward ring topology segments |
| `reduce-scatter` | Fat-tree or mesh | Prefer low bisection BW ratio |
| `p2p` | Any | Prefer direct links |

For `ring-allreduce` on a ring topology segment:
```
efficiency = min(B[i, (i+1) % N] for i in 0..N-1) / max_link_bw
```
(bottleneck link determines ring bandwidth)

**bw_reservation_conflict(S):**
Sum of already-reserved BW on links used by `S`, normalized to max link capacity. Penalizes placing new jobs on segments already heavily reserved.

### Step 3: Coefficients

Default coefficients (tunable via `lrd` config):

```toml
[scheduler.placement]
alpha = 0.40   # fabric locality weight
beta  = 0.30   # congestion penalty weight
gamma = 0.20   # NCCL efficiency weight
delta = 0.10   # BW reservation conflict weight
```

### Step 4: Selection and Reservation

1. Select highest-scoring candidate set `S*`
2. Call `ReserveBandwidth` gRPC: reserves `job.bw_demand_gbps` on all links covering `S*`
3. Returns reservation token (TTL = max(job.eta, 1h))
4. Write `LightRailFabricRoute` CRD with the reservation token and selected nodes
5. Pass node names as affinity rules to the Kubernetes scheduler or Slurm node list

---

## Kubernetes Integration

Implemented as a Kubernetes scheduler extender (see `docs/kubernetes-operator.md`).

**Filter endpoint** (`POST /scheduler/filter`):
- Input: `NodeList`, `Pod`
- Eliminates nodes not in candidate set (wrong fabric, high congestion, OTA cordoned)
- Returns filtered `NodeList`

**Prioritize endpoint** (`POST /scheduler/prioritize`):
- Input: `NodeList`, `Pod`
- Returns `HostPriorityList` with scores [0, 10] derived from the placement algorithm
- Scores are applied additively with the standard scheduler's scores

---

## Slurm Integration

### SPANK Plugin (`lr_fabric_select`)

A Slurm SPANK plugin intercepts job scheduling:

1. `slurm_spank_job_prolog`: extracts `LIGHTRAIL_FABRIC_ID`, `LIGHTRAIL_NCCL_COLLECTIVE`, `LIGHTRAIL_BW_DEMAND` from job env
2. Calls `lrd` scheduler gRPC `GetPlacement(ranks, fabricId, collective, bwDemand)`
3. Returns ordered node list to Slurm `select/cons_tres` plugin
4. Slurm schedules the job on the returned nodes (if available; falls back to standard scheduling if gRPC fails)
5. `slurm_spank_job_epilog`: calls `lrd` `ReleaseBandwidth(reservationToken)`

### Slurm Job Submission with Fabric Hints

```bash
sbatch \
  --partition=gpu-fabric \
  --nodes=4 \
  --ntasks-per-node=16 \
  --env=LIGHTRAIL_FABRIC_ID=photonic-mesh-20x64 \
  --env=LIGHTRAIL_NCCL_COLLECTIVE=all-reduce \
  --env=LIGHTRAIL_BW_DEMAND=320 \
  train.sh
```

---

## Ray Support Strategy

Ray's internal scheduler does not expose external plugin hooks. The LightRail integration uses a different approach:

1. **Ray cluster topology configuration**: When `lrd` provisions a Ray cluster (via `LightRailJob` with `jobType: ray-cluster`), it sets node labels and resource annotations:
   ```python
   # Each Ray node reports custom resources
   RAY_START_PARAMS = {
     "resources": '{"LightRailFabricBW": 400, "LightRailFabricId_mesh_20x64": 1}'
   }
   ```
2. **Task placement**: Ray tasks that need fabric-local placement request:
   ```python
   @ray.remote(resources={"LightRailFabricId_mesh_20x64": 0.01})
   def train_step(...): ...
   ```
3. **Actor group placement**: `PlacementGroup` with `STRICT_PACK` strategy, constrained to nodes with the required fabric resource label
4. **BW reservation**: `lrd` scheduler pre-reserves BW for the Ray cluster at startup; Ray actors run within that reservation

This approach avoids patching Ray internals while still achieving fabric-aware placement.

---

## Preemption

High-priority jobs (`priority >= 90`) can trigger preemption:

1. Scheduler detects no feasible placement for high-priority job `J_high`
2. Identifies the lowest-priority running job `J_low` that occupies needed nodes
3. If `priority(J_high) > priority(J_low) + preemption_threshold` (default: 20):
   - Sends SIGTERM to `J_low` (graceful checkpoint if supported)
   - After `graceful_shutdown_s` (default: 30): releases BW reservation
   - Places `J_high` on freed nodes
4. `J_low` re-queues as PENDING (restores from checkpoint if available)

Preemption is disabled by default and enabled via `lrd` config or `LightRailCluster.spec.preemption.enabled: true`.

---

## Observability

The scheduler emits Prometheus metrics:

```
lightrail_scheduler_placements_total{status="success"|"failed"}
lightrail_scheduler_placement_duration_seconds (histogram)
lightrail_scheduler_fabric_locality_score (gauge per job)
lightrail_scheduler_congestion_penalty (gauge per job)
lightrail_scheduler_bw_reserved_gbps (gauge per fabric segment)
lightrail_scheduler_preemptions_total
```

These feed the Grafana dashboard in the ControlCenterApp.
