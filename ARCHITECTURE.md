# LightOS — System Architecture

**Version:** 2.0  
**Status:** Engineering Blueprint  
**Product:** LightOS — AI Infrastructure Operating System by LightRail AI

---

## Executive Architecture Summary

LightOS is an appliance-grade AI Infrastructure Operating System engineered for AI compute clusters, edge inference controllers, and heterogeneous hardware fabrics. It is not a general-purpose Linux distribution. It is a vertically integrated OS stack that fuses a hardened Ubuntu Server LTS base, a custom kernel tuned for AI fabric I/O, a LightRail Runtime layer, a KDE Plasma/Wayland operator desktop, and a Qt/QML-native AI Control Center into a single, fleet-managed, OTA-updatable appliance image.

The desktop surface is the operator's control plane — not the product. The product is the orchestration mesh: fabric-aware scheduling, GPU utilization optimization, photonic interconnect telemetry, immutable image lifecycle management, and secure device enrollment at scale.

LightOS ships as a single signed image per hardware SKU, boots measured, enrolls automatically into the fleet, reports telemetry continuously, and accepts OTA updates atomically. Every LightOS node is a managed fleet citizen from its first boot.

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    OPERATOR INTERFACE LAYER                     │
│  KDE Plasma / Wayland · Qt/QML AI Control Center               │
│  LightOS Desktop: TopPanel · Dock · WindowManager              │
│  Apps: ControlCenter · Fleet · Cluster · Terminal · Settings   │
├─────────────────────────────────────────────────────────────────┤
│                     LIGHTRAIL RUNTIME LAYER                     │
│  lrd (LightRail Daemon)  ·  Fabric Topology Engine             │
│  NCCL-Aware Scheduler    ·  Ray Cluster Manager                │
│  LLM Serving Controller  ·  Job Queue (Slurm bridge)          │
│  OTA Update Agent        ·  Telemetry Collector                │
├─────────────────────────────────────────────────────────────────┤
│                    KUBERNETES CONTROL PLANE                     │
│  K3s / Kubernetes  ·  LightRail Operator (CRD)                │
│  Slurm Integration Controller  ·  Ray Operator                 │
│  CSI: NVMe-oF / NFS  ·  CNI: Fabric-aware                     │
├─────────────────────────────────────────────────────────────────┤
│                       OS BASE LAYER                             │
│  Ubuntu Server 24.04 LTS  ·  Custom Kernel 6.8-lightrail      │
│  AppArmor LSM  ·  Wayland Stack  ·  systemd                   │
│  TPM 2.0 integration  ·  Measured Boot Chain                  │
├─────────────────────────────────────────────────────────────────┤
│                      HARDWARE FABRIC LAYER                      │
│  Photonic Mesh (LightRail NCE)  ·  PCIe Gen5/Gen6             │
│  NVMe-oF  ·  CXL Memory Fabric  ·  100GbE / InfiniBand        │
│  LightRail AI Labs NCE-700 and compatible heterogeneous AIUs   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component and Service Map

### 1. Boot and Trust

| Component | Implementation | Notes |
|---|---|---|
| Bootloader | GRUB2 + shim (Secure Boot) | EFI + UEFI Secure Boot chain |
| Measured Boot | tpm2-tools + IMA | Extend PCR[0–7]; attest at enrollment |
| Root of Trust | TPM 2.0 (discrete or firmware) | Required on all LightOS SKUs |
| dm-verity | Signed root filesystem hash | Applied to immutable OS partition |
| Initramfs | Dracut (custom lightrail profile) | Validates rootfs before pivot |
| Boot Attestation | lightrail-attest.service | Reports PCR quote to Fleet CA on first boot |

**Boot sequence:**
```
UEFI Secure Boot → GRUB shim → kernel + initramfs
  → TPM PCR measurement → dm-verity rootfs check
  → lightrail-attest.service → lrd.service starts
  → KDE Plasma session (operator nodes only)
```

### 2. OS Base

| Component | Implementation |
|---|---|
| Base OS | Ubuntu Server 24.04 LTS (minimal, headless-first) |
| Kernel | 6.8-lightrail: custom config, io_uring tuning, fabric drivers |
| Init | systemd 255+ with custom lightrail.target |
| Security LSM | AppArmor (profiles for lrd, k3s, Plasma) |
| Partitioning | A/B rootfs (512 MB EFI, 8 GB A, 8 GB B, 32 GB data, remainder storage) |
| Filesystem | ext4 rootfs (read-only mounted via dm-verity), tmpfs for /tmp |
| Package surface | Minimal: no apt on production images; updates via OTA only |
| NTP | chrony (fleet NTP pool enforced by lrd) |
| SSH | OpenSSH (fleet-key enrolled at provisioning; password auth disabled) |

**Kernel custom config targets:**
- Disable unused subsystems (Bluetooth stack, HDMI audio on headless nodes)
- Enable io_uring for fabric I/O paths
- VFIO passthrough for AI accelerator assignment
- CXL Type 3 memory device support
- WireGuard built-in (no module)
- Custom scheduler hooks for LightRail fabric-aware preemption

### 3. LightRail Runtime (lrd)

`lrd` is the core LightOS system daemon. It is the integration boundary between the OS, the fabric hardware, the Kubernetes control plane, and the fleet management backend.

**Responsibilities:**
- Device identity: generates and protects device certificate (TPM-backed private key)
- Fabric topology discovery: reads photonic mesh topology from NCE hardware registers
- Telemetry collection: CPU, fabric BW, thermal, power, job metrics → Prometheus pushgateway
- OTA coordination: fetches, verifies, and schedules A/B rootfs updates
- Enrollment: on first boot, posts device identity + PCR quote to Fleet CA
- Scheduler interface: exposes gRPC API to the fabric-aware scheduler
- Cluster enrollment: registers node into K3s/Kubernetes on provisioning

**Service boundaries:**
```
lrd.service
  ├── lightrail-fabric-agent     (fabric telemetry + topology)
  ├── lightrail-ota-agent        (A/B OTA update lifecycle)
  ├── lightrail-enrollment       (TPM attestation + cert enrollment)
  ├── lightrail-telemetry        (metric push to collector)
  └── lightrail-scheduler-api    (gRPC, port 7100)
```

### 4. Desktop and Operator Interface

The LightOS desktop is the operator surface. It runs on nodes designated as cluster controllers, workstations, or operator terminals. Headless cluster nodes run only `lrd` and the Kubernetes agent.

**Desktop stack:**
- Display: Wayland compositor (KWin under KDE Plasma)
- Session: SDDM login → KDE Plasma (custom LightOS theme, no upstream Plasma branding)
- UI: Custom LightOS shell components built in React/TypeScript (operator web interface) served via local Electron wrapper or native KDE panel widget
- Window management: LightOS WindowManager (cascade positioning, z-index stack, maximize/minimize)
- Applications:
  - **AI Control Center** — job scheduling, fabric telemetry, cluster status, LLM serving management
  - **Fleet Manager** — device inventory, enrollment, OTA history, certificate status
  - **Cluster App** — Kubernetes workloads, Slurm queues, Ray cluster overview
  - **Terminal** — xterm.js-based; connects to local shell via WebSocket
  - **Files** — Virtual filesystem + NVMe-oF mount browser
  - **Settings** — Hardware identity, network, power, security posture
  - **About** — Device identity, firmware, build fingerprint

### 5. Cluster Control (Kubernetes Operator)

LightOS ships a `LightRailCluster` CRD operator that manages:
- Node pool registration and labeling (fabric topology labels: `lightrail.ai/topology`, `lightrail.ai/fabric-id`)
- Workload placement constraints (fabric-locality, BW requirements)
- Slurm partition bridging (jobs submitted to Slurm appear as K8s Jobs)
- Ray cluster provisioning (RayCluster CRDs dispatched by lrd scheduler)
- Automatic node drain + cordon on OTA update cycle

**CRD surface:**
```yaml
# Core CRDs
LightRailCluster      # cluster-scope; owns node pools
LightRailNodePool     # node pool with fabric topology annotation
LightRailJob          # AI workload (training / inference / compile)
LightRailFabricRoute  # fabric-aware routing hint for a job
LightRailOTAPolicy    # update policy (canary, rolling, freeze)
```

### 6. Telemetry

| Layer | Collection | Transport | Storage |
|---|---|---|---|
| Hardware | lrd fabric agent, IPMI/Redfish | Prometheus pushgateway | Prometheus / VictoriaMetrics |
| OS | node_exporter | Prometheus scrape | Prometheus |
| Kubernetes | kube-state-metrics, cAdvisor | Prometheus scrape | Prometheus |
| AI workload | LightRail job metrics API | gRPC → Prometheus | Prometheus |
| Fleet | Device heartbeat + event log | HTTPS → Fleet API | PostgreSQL |
| Alerts | Alertmanager | PagerDuty / Slack / webhook | — |
| Dashboard | Grafana (operator desktop widget) | PromQL | — |

### 7. Update System (Immutable OTA)

LightOS uses an A/B partition scheme with atomic rootfs flips:

```
Partition layout (single disk):
  /dev/sda1   512 MB   EFI (FAT32)
  /dev/sda2   8 GB     Slot A (ext4, dm-verity signed)
  /dev/sda3   8 GB     Slot B (ext4, dm-verity signed)
  /dev/sda4   32 GB    Data (/var, persistent state)
  /dev/sda5   rest     Storage (NVMe-oF or local workload data)

Active slot is mounted read-only. Inactive slot receives new image.
GRUB boot variable flips atomically on successful update verification.
Rollback: reboot with GRUB pointing to previous slot.
```

**OTA update flow:**
1. `lightrail-ota-agent` polls Fleet API for new image manifest
2. Downloads signed image bundle to inactive slot (streamed, verified in-flight)
3. Verifies bundle signature against Fleet CA public key
4. Writes dm-verity hash tree to inactive slot
5. Marks inactive slot bootable (GRUB env write)
6. Signals lrd: "update staged, awaiting reboot window"
7. Operator approves (or policy triggers auto-reboot during maintenance window)
8. System reboots, GRUB boots new slot
9. `lightrail-ota-agent` confirms boot success; Fleet API marks node updated

### 8. Enrollment and Certificates

**Device lifecycle states:**
```
MANUFACTURED → PROVISIONED → ENROLLED → ACTIVE → DECOMMISSIONED
```

**Enrollment flow:**
1. Factory provisioning: device gets serial, base image, TPM ownership
2. First boot: `lightrail-enrollment` generates EC key pair (TPM-bound)
3. Generates CSR; posts to Fleet CA along with TPM PCR quote
4. Fleet CA verifies PCR values against known-good baseline
5. Fleet CA signs device certificate (max 1-year validity)
6. Certificate stored in TPM NVRAM + `/etc/lightrail/device.crt`
7. All subsequent fleet API calls use mTLS with device certificate

**Certificate hierarchy:**
```
LightRail Root CA (offline HSM)
  └── Fleet Intermediate CA (online, HSM-backed)
        ├── Device certificates (per-node)
        ├── Cluster service certificates (per-cluster)
        └── OTA signing key (separate, HSM-backed)
```

---

## Security Architecture Summary

| Control | Implementation | Status |
|---|---|---|
| Secure Boot | UEFI + shim + signed GRUB + signed kernel | Production |
| Measured Boot | TPM 2.0 IMA + PCR quotes | Production |
| Rootfs integrity | dm-verity (signed hash tree) | Production |
| OS hardening | AppArmor mandatory profiles, minimal package surface | Production |
| Network | WireGuard overlay for fleet control plane | Production |
| Device identity | TPM-backed EC key + Fleet CA cert | Production |
| mTLS | All lrd↔Fleet API calls require device cert | Production |
| OTA signing | Ed25519 signatures on image bundles | Production |
| Attestation | PCR quote on enrollment + periodic re-attestation | Phase 2 |
| SELinux | Optional; AppArmor is primary LSM | Phase 3 |
| FIPS 140-3 | Kernel crypto + OpenSSL FIPS module | Phase 3 |
| Air-gap support | Offline OTA bundle import, local Fleet CA | Phase 3 |

---

## Fabric-Aware Scheduler Architecture

The LightRail Scheduler (`lightrail-scheduler`) is a custom Kubernetes scheduler extender and a standalone Slurm job plugin. It makes placement decisions using:

1. **Fabric topology graph** — maintained by `lrd` from live NCE register reads; exposed as a gRPC topology service on port 7100
2. **Bandwidth matrix** — per-link current utilization sampled at 1-second intervals
3. **Congestion scores** — per-fabric-segment rolling average (last 30 seconds)
4. **NCCL communication pattern** — jobs annotate expected collective type (`all-reduce`, `all-gather`, `ring`, `tree`)
5. **Job locality preferences** — `LightRailFabricRoute` CRD specifies preferred fabric segments

**Placement algorithm (simplified):**
```
For each pending job J with N ranks:
  1. Query topology service → get current bandwidth matrix B
  2. For each candidate node-set S of size N:
     a. Compute fabric locality score: sum(BW[i,j] for i,j in S) / N²
     b. Compute congestion penalty: max(congestion[l] for l in links(S))
     c. Compute NCCL efficiency estimate: f(topology(S), collective_type(J))
  3. Rank candidates by: locality_score - α·congestion_penalty + β·nccl_efficiency
  4. Place J on top-ranked S
  5. Reserve BW allocation; update congestion model
```

This runs as a Kubernetes scheduler plugin (framework extension point: `Filter` + `Score`) and as a Slurm `select/cons_tres` plugin wrapper.

---

## Risks and Dependencies

| Risk | Severity | Mitigation |
|---|---|---|
| TPM not present on all target hardware | High | Detect at boot; degrade to software identity with warning; block enrollment |
| Fabric topology API instability across NCE generations | High | Abstract via lrd topology service; version-pin per NCE firmware |
| KDE Plasma session stability on operator nodes | Medium | Ship pinned Plasma version; disable unneeded Plasma applets |
| Kubernetes version churn | Medium | Pin K3s version per LightOS image; test upgrade path in CI |
| Slurm<>K8s job routing complexity | High | Phase 1: parallel (no shared job IDs); Phase 2: unified via CRD bridge |
| OTA rollback data compatibility | Medium | `/var` and data partitions are not touched by OTA; schema migrations only in lrd upgrades |
| AppArmor profile gaps | Medium | Ship deny-by-default profiles; audit with `aa-complain` before `aa-enforce` |
| Fleet CA key compromise | Critical | HSM-backed key; offline root CA; device cert revocation CRL distributed via Fleet API |

---

*This document is a living engineering blueprint. It is updated with each LightOS release cycle.*
