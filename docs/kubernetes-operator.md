# LightRail Kubernetes Operator Design

**Component:** `lightrail-operator`  
**Language:** Go (controller-runtime v0.17+)  
**Kubernetes target:** 1.29+ / K3s 1.29+

---

## Overview

The LightRail Operator is a Kubernetes operator that extends the cluster API with five Custom Resource Definitions (CRDs) specific to LightRail AI workloads, node topology, OTA policy, and fabric routing. It runs as a `Deployment` in the `lightrail-system` namespace with two replicas (leader-elected).

The operator is the bridge between LightOS fleet management (handled by `lrd`) and Kubernetes workload orchestration. Its primary responsibilities:

1. Reconcile `LightRailCluster` objects → manage node pool lifecycle and labeling
2. Reconcile `LightRailJob` objects → translate to native Kubernetes Jobs or PyTorchJobs, with fabric-aware placement
3. Enforce `LightRailOTAPolicy` → cordon nodes before update, uncordon after
4. Manage `LightRailNodePool` → watch node join/leave events and maintain fabric topology labels
5. Reconcile `LightRailFabricRoute` → push routing hints to the scheduler extender

---

## CRD Specifications

### LightRailCluster

```yaml
apiVersion: lightrail.ai/v1
kind: LightRailCluster
metadata:
  name: prod-cluster
  namespace: lightrail-system
spec:
  fabricId: photonic-mesh-20x64
  nodePools:
    - name: worker-pool-a
      size: 4
      nodeSelector:
        lightrail.ai/fabric-id: photonic-mesh-20x64
        lightrail.ai/role: worker
  controlPlane:
    endpoint: https://10.10.0.1:6443
  telemetry:
    prometheusEndpoint: http://prometheus.lightrail-monitoring:9090
status:
  phase: Ready        # Pending | Provisioning | Ready | Degraded
  readyNodes: 4
  totalNodes: 4
  fabricStatus:
    congestionScore: 0.12
    totalBwGbps: 1600
    activeSegments: 4
```

**Controller reconcile loop:**
1. List all nodes with `lightrail.ai/cluster: prod-cluster` label
2. Compare count vs `spec.nodePools[*].size` — trigger scale events if mismatched
3. Label all nodes with fabric topology: `lightrail.ai/fabric-id`, `lightrail.ai/topology`, `lightrail.ai/nce-layer`
4. Update `status.readyNodes` and `status.fabricStatus` from lrd topology gRPC
5. Emit Kubernetes events on state changes

### LightRailJob

```yaml
apiVersion: lightrail.ai/v1
kind: LightRailJob
metadata:
  name: train-job-llama
  namespace: lightrail-jobs
spec:
  jobType: training       # training | inference | compile | benchmark
  image: lightrail/train-runner:0.4.1
  ranks: 64               # total parallel ranks (processes)
  fabricId: photonic-mesh-20x64
  ncclCollective: all-reduce   # all-reduce | all-gather | ring | tree
  resources:
    cpuPerRank: "8"
    memPerRank: "128Gi"
  placement:
    fabricLocality: required    # required | preferred | none
    topologySpread: true        # spread ranks across NCE layers
  retryPolicy:
    maxRetries: 2
    backoffSeconds: 30
  env:
    - name: LIGHTRAIL_FABRIC_ID
      value: photonic-mesh-20x64
status:
  phase: Running          # Pending | Scheduled | Running | Succeeded | Failed
  startTime: "2026-05-09T09:14:22Z"
  completionTime: null
  fabricRoute:
    segmentIds: ["seg-A", "seg-B"]
    reservedBwGbps: 320
    placedNodes:
      - lightos-worker-01
      - lightos-worker-02
      - lightos-worker-03
      - lightos-worker-04
```

**Controller reconcile loop:**
1. On new `LightRailJob`: query scheduler extender for fabric-aware node placement
2. Generate a `Job` or `PyTorchJob` (if `jobType: training`) with node affinity rules
3. Inject `LIGHTRAIL_FABRIC_ID`, `LIGHTRAIL_ROUTE_ID`, and `RANK_WORLD_SIZE` env vars
4. Create `LightRailFabricRoute` to reserve BW on selected segments
5. Watch child `Job` → propagate phase to `LightRailJob.status.phase`
6. On completion: release BW reservation from `LightRailFabricRoute`

### LightRailNodePool

```yaml
apiVersion: lightrail.ai/v1
kind: LightRailNodePool
metadata:
  name: worker-pool-a
  namespace: lightrail-system
spec:
  clusterRef: prod-cluster
  size: 4
  fabricId: photonic-mesh-20x64
  topology: mesh
  nodeSelector:
    lightrail.ai/role: worker
  taints:
    - key: lightrail.ai/dedicated
      value: ai-workload
      effect: NoSchedule
status:
  phase: Ready
  readyNodes: 4
  nodeNames:
    - lightos-worker-01
    - lightos-worker-02
    - lightos-worker-03
    - lightos-worker-04
```

### LightRailOTAPolicy

```yaml
apiVersion: lightrail.ai/v1
kind: LightRailOTAPolicy
metadata:
  name: rolling-2.0.1
  namespace: lightrail-system
spec:
  targetImage: 2.0.1-stable
  strategy: rolling         # rolling | canary | all-at-once | manual
  maxUnavailable: 1
  maintenanceWindow: "Sun 02:00-06:00 UTC"
  targetNodeSelector:
    lightrail.ai/channel: stable
  frozen: false
status:
  phase: Progressing        # Pending | Progressing | Complete | Failed | Frozen
  updatedNodes: 2
  totalTargetNodes: 4
  failedNodes: []
```

**OTA controller behavior:**
1. Before updating a node: `kubectl cordon <node>`, drain non-critical pods
2. Signal `lrd` OTA agent on that node via gRPC: `TriggerUpdate(imageVersion)`
3. Watch node heartbeat via Fleet API: wait for `ota_status: current`
4. `kubectl uncordon <node>` when OTA confirmed
5. Respect `maxUnavailable` — never exceed the concurrency limit
6. Abort and set `status.phase: Failed` if OTA agent reports failure

### LightRailFabricRoute

```yaml
apiVersion: lightrail.ai/v1
kind: LightRailFabricRoute
metadata:
  name: route-train-job-llama
  namespace: lightrail-jobs
spec:
  jobRef: train-job-llama
  fabricId: photonic-mesh-20x64
  segments:
    - segmentId: seg-A
      reservedBwGbps: 160
    - segmentId: seg-B
      reservedBwGbps: 160
  ttlSeconds: 14400       # auto-release after 4h if job not active
status:
  active: true
  activeSince: "2026-05-09T09:14:30Z"
  expiresAt: "2026-05-09T13:14:30Z"
```

---

## Scheduler Extender Integration

The operator registers a Kubernetes scheduler extender at `/scheduler/filter` and `/scheduler/prioritize`. The extender is served by `lrd` on port 7100.

**KubeSchedulerConfiguration snippet:**
```yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
profiles:
  - schedulerName: lightrail-scheduler
    plugins:
      preFilter:
        enabled:
          - name: LightRailTopology
      filter:
        enabled:
          - name: LightRailTopology
      score:
        enabled:
          - name: LightRailFabricScore
            weight: 10
extenders:
  - urlPrefix: http://lightrail-scheduler.lightrail-system:7100
    filterVerb: filter
    prioritizeVerb: prioritize
    weight: 5
    enableHTTPS: false
    nodeCacheCapable: false
```

The extender's `filter` endpoint eliminates nodes that:
- Lack the required `lightrail.ai/fabric-id` label
- Are cordoned for OTA update
- Exceed the maximum congestion threshold for the requested BW

The `prioritize` endpoint scores remaining nodes using the fabric locality and NCCL efficiency algorithms described in `docs/scheduler.md`.

---

## Deployment Manifest

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lightrail-operator
  namespace: lightrail-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app.kubernetes.io/name: lightrail-operator
  template:
    metadata:
      labels:
        app.kubernetes.io/name: lightrail-operator
    spec:
      serviceAccountName: lightrail-operator
      containers:
        - name: operator
          image: lightrail/operator:1.0.0
          args:
            - --leader-elect
            - --metrics-bind-address=:8080
            - --health-probe-bind-address=:8081
            - --fleet-api=http://lightrail-fleet-api.lightrail-system:8000
            - --scheduler-api=http://lightrail-scheduler.lightrail-system:7100
          env:
            - name: LIGHTRAIL_FLEET_MTLS
              value: "true"
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8081
          readinessProbe:
            httpGet:
              path: /readyz
              port: 8081
      nodeSelector:
        lightrail.ai/role: controller
```

---

## RBAC

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: lightrail-operator
rules:
  - apiGroups: ["lightrail.ai"]
    resources: ["*"]
    verbs: ["*"]
  - apiGroups: [""]
    resources: ["nodes", "pods", "events", "configmaps", "secrets"]
    verbs: ["get", "list", "watch", "update", "patch"]
  - apiGroups: ["batch"]
    resources: ["jobs"]
    verbs: ["*"]
  - apiGroups: ["kubeflow.org"]
    resources: ["pytorchjobs"]
    verbs: ["*"]
```

---

## Implementation Timeline

| Milestone | Target |
|---|---|
| CRD schema v1 (all 5 kinds) | Phase 3, Week 1 |
| Controller scaffolding (controller-runtime) | Phase 3, Week 2 |
| LightRailCluster + LightRailNodePool reconciler | Phase 3, Week 3 |
| LightRailJob reconciler + scheduler extender | Phase 3, Week 4–5 |
| LightRailOTAPolicy controller | Phase 3, Week 6 |
| LightRailFabricRoute + BW reservation | Phase 3, Week 7–8 |
| Integration tests (envtest) | Phase 3, Week 8 |
| Production hardening + RBAC audit | Phase 4, Week 1 |
