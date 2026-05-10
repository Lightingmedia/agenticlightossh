# LightRail Kubernetes Operator

## Overview

The LightRail Kubernetes Operator (controller-runtime based) manages five Custom Resource Definitions (CRDs) that model the LightRail fabric, compute, and workload lifecycle. It runs as a Deployment in the `lightrail-system` namespace.

---

## CRD Reference

### 1. LightRailCluster

Represents a physical or logical LightRail photonic fabric cluster.

```yaml
apiVersion: lightrail.ai/v1alpha1
kind: LightRailCluster
metadata:
  name: prod-cluster
  namespace: lightrail-system
spec:
  topology: photonic-mesh
  layers: 20
  nodesPerLayer: 64
  wdmChannels: 96
  fabricBwGbps: 3200
  nodeSelector:
    matchLabels:
      lightrail.ai/cluster: prod-cluster
status:
  phase: Ready
  nodeCount: 64
  fabricUtilizationPct: 67
  congestionScore: 0.12
```

**Controller reconcile loop:**
1. Discover nodes matching `nodeSelector`
2. Validate fabric topology via driver API
3. Update `status.nodeCount`, `status.fabricUtilizationPct`, `status.congestionScore`
4. Emit Prometheus metrics: `lightrail_cluster_nodes`, `lightrail_fabric_utilization_pct`

---

### 2. LightRailJob

Represents an AI training or inference job that requires fabric-aware placement.

```yaml
apiVersion: lightrail.ai/v1alpha1
kind: LightRailJob
metadata:
  name: llama-train-001
  namespace: lightrail-system
spec:
  clusterRef: prod-cluster
  nodes: 4
  collective: all-reduce
  model: llama-3-70b
  image: lightrail/vllm:0.5.0
  fabricPreference: locality       # locality | throughput | balanced
  resources:
    gpuPerNode: 8
    memGbPerNode: 80
  env:
    - name: NCCL_DEBUG
      value: INFO
  command: ["torchrun", "--nproc_per_node=8", "train.py"]
status:
  phase: Running                   # Pending | Running | Succeeded | Failed
  startTime: "2024-10-15T06:00:00Z"
  podNames:
    - llama-train-001-0
    - llama-train-001-1
    - llama-train-001-2
    - llama-train-001-3
  fabricRoute: mesh-route-alpha
  epochsCompleted: 4
```

**Controller reconcile loop:**
1. Call fabric-aware scheduler to select nodes
2. Create a StatefulSet / Pod group with affinity rules for selected nodes
3. Inject `LIGHTRAIL_FABRIC_ROUTE` env from selected `LightRailFabricRoute`
4. Monitor pod phases → update `status.phase`
5. On completion: release fabric reservation, update telemetry

---

### 3. LightRailNodePool

A named pool of compute nodes with a shared fabric locality group.

```yaml
apiVersion: lightrail.ai/v1alpha1
kind: LightRailNodePool
metadata:
  name: gpu-pool-a
  namespace: lightrail-system
spec:
  clusterRef: prod-cluster
  nodeSelector:
    matchLabels:
      lightrail.ai/pool: gpu-pool-a
  tier: gpu                        # gpu | cpu | spine | edge
  fabricLayer: 0                   # preferred fabric layer
  maxNodes: 8
status:
  readyNodes: 4
  allocatedNodes: 4
  idleNodes: 0
```

**Controller reconcile loop:**
1. List nodes matching `nodeSelector`
2. Reconcile `maxNodes` limit
3. Update `status.readyNodes`, `status.allocatedNodes`

---

### 4. LightRailOTAPolicy

Declares an OTA update policy for a fleet of devices managed by lrd.

```yaml
apiVersion: lightrail.ai/v1alpha1
kind: LightRailOTAPolicy
metadata:
  name: prod-weekly
  namespace: lightrail-system
spec:
  targetVersion: lightos-2.0.1
  selector:
    matchLabels:
      lightrail.ai/role: gpu-node
  strategy: rolling                # rolling | canary | immediate
  maxUnavailable: 1
  schedule: "0 2 * * 0"           # cron: Sunday 02:00 UTC
  imageURL: https://updates.lightrail.ai/lightos/2.0.1/image.squashfs
  imageDigest: sha256:abc123...
  imageSignature: base64:...
status:
  phase: Active
  devicesTotal: 4
  devicesUpdated: 2
  devicesPending: 2
  lastRun: "2024-10-13T02:00:00Z"
```

**Controller reconcile loop:**
1. Watch for schedule trigger
2. Select devices via `selector`
3. Call Fleet API `POST /fleet/ota/deploy` with policy ID
4. Poll device statuses → update `status`

---

### 5. LightRailFabricRoute

A pre-computed fabric route for low-latency collective communication.

```yaml
apiVersion: lightrail.ai/v1alpha1
kind: LightRailFabricRoute
metadata:
  name: mesh-route-alpha
  namespace: lightrail-system
spec:
  clusterRef: prod-cluster
  layerRange: [0, 4]
  preferenceMode: locality         # locality | throughput
  wdmChannels: [0, 4, 8, 12]
  reservedBwGbps: 400
status:
  phase: Bound
  boundJobs:
    - embed-finetune-002
  actualBwGbps: 380
  congestionScore: 0.08
```

**Controller reconcile loop:**
1. Reserve WDM channels from fabric driver
2. Bind to requesting `LightRailJob` resources
3. Monitor actual bandwidth vs reserved → emit alert if delta > 10%
4. Release reservation on job completion

---

## Scheduler Extender

The fabric-aware scheduler extender registers with `kube-scheduler` via `KubeSchedulerConfiguration`:

```yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
profiles:
  - schedulerName: lightrail-scheduler
    plugins:
      filter:
        enabled:
          - name: LightRailFabricFilter
      score:
        enabled:
          - name: LightRailFabricScorer
            weight: 10
extenders:
  - urlPrefix: http://fabric-scheduler.lightrail-system:9090
    filterVerb: filter
    prioritizeVerb: prioritize
    weight: 10
    nodeCacheCapable: false
    managedResources:
      - name: lightrail.ai/fabric-slot
        ignoredByScheduler: false
```

See [scheduler.md](scheduler.md) for the scoring algorithm.

---

## RBAC

The operator requires the following ClusterRole permissions:

```yaml
rules:
  - apiGroups: ["lightrail.ai"]
    resources: ["lightrailclusters", "lightrailjobs", "lightrailnodepools", "lightrailotapolicies", "lightraifabricroutes"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: [""]
    resources: ["pods", "nodes", "events"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
  - apiGroups: ["apps"]
    resources: ["statefulsets", "deployments"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
```
