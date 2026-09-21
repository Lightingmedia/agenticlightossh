# LightOS v2.0 — System Architecture

## Overview

LightOS is an AI Infrastructure Operating System built by LightRail AI. It is **not** a general-purpose Linux distribution. It is a purpose-built, secured, and managed OS layer purpose-designed to run large AI workloads on LightRail photonic interconnect fabrics.

---

## Layer Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 8 — Operator Interface (KDE Plasma / Wayland)            │
│  LightOS Desktop Shell · AI Control Center · Fleet Manager      │
│  Cluster Manager · Terminal · Browser · Settings                │
├─────────────────────────────────────────────────────────────────┤
│  Layer 7 — API Gateway (FastAPI · mTLS · JWT)                   │
│  /api/* · /fleet/* · /cluster/* · /inference/*                 │
├─────────────────────────────────────────────────────────────────┤
│  Layer 6 — LightRail Runtime Daemon (lrd)                       │
│  Enrollment Service · OTA Engine · Telemetry Collector          │
│  AppArmor Policy Engine · Attestation Verifier                  │
├─────────────────────────────────────────────────────────────────┤
│  Layer 5 — AI Cluster Control Plane                             │
│  Kubernetes Operator · Fabric-Aware Scheduler                   │
│  Slurm SPANK Plugin · Ray Resource Labels                       │
├─────────────────────────────────────────────────────────────────┤
│  Layer 4 — Container Runtime                                    │
│  containerd · OCI · gVisor (optional sandboxing)                │
├─────────────────────────────────────────────────────────────────┤
│  Layer 3 — OS Base                                              │
│  Ubuntu Server 24.04 LTS (riscv64) · Kernel 6.8-lightrail-rv64                 │
│  systemd · dm-verity · A/B partitions · TPM 2.0                 │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2 — Photonic Interconnect Driver                         │
│  LightRail Fabric Driver · WDM Channel Mgmt · RDMA Offload      │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1 — Hardware                                             │
│  LightRail Compute Blades · Photonic Switch Fabric              │
│  TPM 2.0 · Secure Boot ROM                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Map

### Boot & Trust Chain

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Secure Boot | UEFI + MOK | Only signed kernels boot |
| dm-verity | Linux kernel | Read-only rootfs integrity |
| A/B Partitions | systemd-boot | Atomic OTA with rollback |
| TPM 2.0 | TCG 2.0 | PCR measurements + key sealing |
| Attestation | TPM2_Quote | Remote proof of boot state |

### LightRail Runtime Daemon (lrd)

The `lrd` systemd service is the single process responsible for:
- **Enrollment**: generating CSR, receiving device cert, registering with Fleet Control Plane
- **OTA**: A/B slot management, dm-verity tag update, fallback watchdog
- **Telemetry**: streaming CPU/GPU/fabric metrics via gRPC to Fleet API
- **AppArmor**: loading and reloading profiles on policy update
- **Attestation**: responding to TPM quote challenges from Fleet Control Plane

### Desktop Shell (Phase 1)

React 18 + TypeScript + Vite + TailwindCSS + shadcn/ui desktop shell running inside a Wayland compositor window (or standalone browser for dev). Apps are windowed within an in-browser window manager (`WindowManager.tsx`).

**App Registry:**

| App ID | Title | Description |
|--------|-------|-------------|
| `control` | AI Control Center | Job queue, fabric map, node telemetry, LLM serving |
| `fleet` | Fleet Manager | Device inventory, OTA policies, certificates |
| `cluster` | Cluster Manager | K8s pods, Slurm queue, Ray cluster, CRDs |
| `terminal` | Terminal | SSH/local shell (Phase 2: PTY over WebSocket) |
| `files` | Files | Filebrowser (Phase 2) |
| `browser` | Browser | Embedded chromium (Phase 2) |
| `settings` | Settings | OS/user settings |
| `about` | About | Version info |

### Cluster Control Plane

| Component | Role |
|-----------|------|
| `lrd-controller` | Kubernetes operator managing LightRail CRDs |
| `fabric-scheduler` | Scheduler extender scoring pods for fabric locality |
| Slurm SPANK plugin | Injects fabric-aware constraint flags into Slurm jobs |
| Ray resource labels | Exposes `LightRailFabricId_*` custom resources for placement |

### Telemetry Pipeline

```
lrd (node) → gRPC → Telemetry Collector → Prometheus → Grafana
                                        ↓
                                  Fleet API SSE → Dashboard
```

### OTA Pipeline

```
Fleet Control Plane → OTA Policy → lrd OTA Engine
                                        ↓
                               download + verify (sha256 + sig)
                                        ↓
                               write to inactive A/B slot
                                        ↓
                               set boot flag → reboot
                                        ↓
                               boot watchdog: if boot fails → fallback
                                        ↓
                               attest new PCR values → Fleet marks "updated"
```

---

## Security Architecture

| Threat | Control | Mechanism |
|--------|---------|-----------|
| Unauthorized boot | Secure Boot + dm-verity | UEFI MOK, kernel hash |
| Rogue device enrollment | TPM PCR attestation | TPM2_Quote + EK cert chain |
| MITM fleet control | mTLS | TPM-backed device cert, mutual auth |
| Container escape | AppArmor LSM | Profiles per workload type |
| Rootfs tampering | dm-verity | Hash tree on read-only root |
| Supply chain | Signed OTA images | Ed25519 image signature |
| Key leakage | TPM key sealing | PCR policy binding |
| Lateral movement | Network segmentation | Per-fabric VLAN + BPF |

---

## Fabric-Aware Scheduling

The fabric-aware scheduler extends the Kubernetes default scheduler via the `filter` and `score` extender APIs.

**Scoring formula:**

```
score(S) = α · fabric_locality(S)
         - β · congestion_penalty(S)
         + γ · nccl_efficiency(S, collective_type)
         - δ · bw_reservation_conflict(S)
```

Default weights: α=0.40, β=0.30, γ=0.20, δ=0.10

See [docs/scheduler.md](docs/scheduler.md) for full specification.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Kernel fork maintenance burden | Medium | High | Minimize delta, upstream where possible |
| TPM vendor lock-in | Low | Medium | Abstract via TSS2 API |
| Photonic driver stability | Medium | High | Extensive CI on real hardware |
| Fleet CA compromise | Low | Critical | Offline root CA, HSM-backed intermediate |
| OTA brick risk | Low | High | A/B + watchdog + remote recovery mode |
| Regulatory (FIPS) | Medium | Medium | FIPS-validated crypto modules (Phase 4) |
