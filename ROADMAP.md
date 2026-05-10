# LightOS — Phased Roadmap

**Product:** LightOS AI Infrastructure OS  
**Updated:** 2026-Q2

---

## Phase 0 — Foundation (Current / In Progress)

**Goal:** Working desktop prototype demonstrating LightRail AI identity, fabric telemetry simulation, and operator UX shell.

**Duration:** Complete (shipped as agenticlightossh)

### What exists:
- LightOS desktop shell (React/TypeScript/Vite)
- WindowManager with cascade positioning, z-index, maximize/minimize
- TopPanel: Activities menu, app launcher, clock, tray
- Left Dock: 6 app launchers
- TerminalApp: Full xterm.js terminal emulator
- FilesApp: Virtual filesystem browser
- SettingsApp: Hardware identity panel (LightRail NCE-700, HBM3e, NVMe-oF)
- FastAPI backend: fabric presets, compiler simulation (SSE), LLM serving API
- Fabric topology models: mesh, ring, butterfly, fat-tree presets
- Supabase integration, Stripe payments

### What is missing:
- ControlCenterApp (stub: 191 bytes)
- Fleet management UI
- Cluster / Kubernetes orchestration UI
- Real telemetry (all values are simulated)
- OTA update agent
- Enrollment and device certificates
- Security hardening

---

## Phase 1 — Operator Shell Complete (Q3 2026)

**Goal:** Complete operator desktop with full Control Center, Fleet Manager, and Cluster app. All core UX flows working against simulated backends.

**Duration:** 6 weeks  
**Team:** 2 engineers (1 UI, 1 backend)

### Deliverables:

#### UI
- [ ] **ControlCenterApp** — AI job scheduling, fabric topology map, live telemetry (simulated), LLM serving management
- [ ] **FleetApp** — Device inventory table, enrollment status, OTA update history, certificate expiry
- [ ] **ClusterApp** — Kubernetes workload list, Slurm queue view, Ray cluster status
- [ ] Extended WindowManager: support for 8+ apps, taskbar active indicators
- [ ] Notification system: toast alerts for job completion, OTA available, enrollment errors

#### Backend
- [ ] `fleet.py`: Device CRUD, enrollment simulation, OTA policy, certificate tracking
- [ ] `cluster.py`: Kubernetes workload mock, Slurm queue mock, Ray cluster mock
- [ ] Extended telemetry: per-node fabric BW, thermal, power metrics (simulated but realistic)

#### Infrastructure
- [ ] Docker Compose dev environment (frontend + backend + mock fleet DB)
- [ ] Vitest test suite for all new components
- [ ] CI pipeline: lint + test + build

---

## Phase 2 — OS Image and Real Hardware (Q4 2026)

**Goal:** Bootable LightOS image on reference hardware. Real `lrd` daemon. TPM enrollment. Live fabric telemetry.

**Duration:** 12 weeks  
**Team:** 4 engineers (1 kernel, 1 systems, 1 UI, 1 DevOps)

### Deliverables:

#### OS Layer
- [ ] Ubuntu 24.04 LTS base image with custom Kernel 6.8-lightrail
- [ ] A/B partition layout with dm-verity
- [ ] UEFI Secure Boot chain (shim + signed GRUB + signed kernel)
- [ ] AppArmor profiles for all LightRail services
- [ ] systemd unit files for all lrd sub-services

#### LightRail Runtime (lrd v0.1)
- [ ] `lrd` daemon: Go or Rust binary, systemd service
- [ ] Fabric topology discovery: reads NCE hardware registers via PCIe MMIO
- [ ] Telemetry collector: Prometheus pushgateway integration
- [ ] OTA agent: download + verify + A/B flip (no auto-reboot yet)

#### Enrollment
- [ ] TPM 2.0 key generation + PCR quote at first boot
- [ ] Development Fleet CA (self-signed, local)
- [ ] Device certificate stored in TPM NVRAM
- [ ] Fleet API: POST /devices/enroll, GET /devices/{id}

#### Desktop Integration
- [ ] Electron wrapper for LightOS UI shell (replaces browser-based dev mode)
- [ ] lrd gRPC → React UI bridge (WebSocket relay)
- [ ] Real telemetry displayed in ControlCenterApp

#### Build System
- [ ] Packer image builder: produces .img for x86_64
- [ ] Automated image signing pipeline
- [ ] USB/PXE boot support

---

## Phase 3 — Fleet Operations (Q1 2027)

**Goal:** Multi-node fleet management. OTA rollouts. Kubernetes operator v1. Slurm integration.

**Duration:** 16 weeks  
**Team:** 6 engineers (1 kernel, 1 systems, 2 platform, 1 UI, 1 security)

### Deliverables:

#### Fleet Management
- [ ] Fleet API v1 (production): PostgreSQL backend, REST + gRPC
- [ ] Device inventory with fleet-wide OTA rollout policies
- [ ] mTLS with device certificates on all fleet API calls
- [ ] Fleet health dashboard (real Prometheus + Grafana integration)
- [ ] Alerting: Alertmanager + webhook delivery
- [ ] MAAS integration for bare-metal provisioning

#### Kubernetes Operator
- [ ] `LightRailCluster` CRD v1 and controller (Go, controller-runtime)
- [ ] `LightRailNodePool` with fabric topology labels
- [ ] `LightRailJob` for AI workload submission
- [ ] Fabric-aware scheduler extender (Kubernetes scheduler framework)
- [ ] K3s embedded control plane for single-node + small-cluster deployments

#### Slurm Integration
- [ ] Slurm `select` plugin for fabric-aware node selection
- [ ] `LightRailJob` → Slurm job submission bridge
- [ ] Job telemetry: Slurm SPANK plugin → lrd metrics
- [ ] Slurm accounting → Fleet API

#### Security
- [ ] AppArmor profiles audited and enforced for all services
- [ ] WireGuard overlay for fleet control plane
- [ ] OTA bundle Ed25519 signing pipeline (production key in HSM)
- [ ] Periodic TPM re-attestation (24h interval)
- [ ] Automated certificate rotation (30 days before expiry)

---

## Phase 4 — Production Appliance (Q2–Q3 2027)

**Goal:** Production-grade appliance image with full security posture, Ray support, NCCL-aware scheduler, and air-gap deployability.

**Duration:** 20 weeks  
**Team:** 12+ engineers

### Deliverables:

#### Runtime and Scheduler
- [ ] NCCL-aware job placement (collective pattern annotation + BW matrix optimization)
- [ ] Ray operator: automatic Ray cluster provisioning via `LightRailJob`
- [ ] Fabric-aware preemption: live bandwidth reclamation for priority jobs
- [ ] Multi-fabric support: heterogeneous hardware topology (mixed NCE generations)

#### Security and Compliance
- [ ] FIPS 140-3 kernel crypto + OpenSSL module
- [ ] SELinux policy (optional, alongside AppArmor)
- [ ] Air-gap OTA: signed bundle import via USB/NFS without internet
- [ ] Offline Fleet CA mode for classified/air-gapped deployments
- [ ] SOC 2 Type II alignment: audit logging, access control, retention

#### Scalability
- [ ] Fleet API: 10,000+ node support
- [ ] Prometheus federation for large-cluster telemetry
- [ ] Multi-cluster LightRailCluster federation

#### Hardware Support
- [ ] ARM64 image (for edge/gateway nodes)
- [ ] RISC-V evaluation image
- [ ] Additional AI accelerator driver stubs (non-NVIDIA)

#### Release Engineering
- [ ] Versioned OTA channels: stable / beta / canary
- [ ] OTA rollback SLA: < 5 minutes to previous slot
- [ ] Image signing audit trail
- [ ] Reproducible builds (bitwise identical images from same source)

---

## Component Readiness Matrix

| Component | Phase 0 | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|---|---|---|---|---|---|
| Desktop shell | ✓ | ✓ | ✓ | ✓ | ✓ |
| ControlCenterApp | stub | ✓ | ✓+real | ✓ | ✓ |
| FleetApp | — | ✓ | ✓+real | ✓ | ✓ |
| ClusterApp | — | ✓ | ✓+real | ✓ | ✓ |
| lrd daemon | — | — | v0.1 | v1.0 | v2.0 |
| OTA agent | — | sim | v0.1 | v1.0 | v1.0+airgap |
| Enrollment | — | sim | TPM v0.1 | mTLS v1.0 | HSM+FIPS |
| K8s operator | — | — | — | v1.0 | v2.0 |
| Slurm integration | — | — | — | v1.0 | v1.5 |
| Ray support | — | — | — | v0.1 | v1.0 |
| NCCL scheduler | — | — | — | — | v1.0 |
| Fabric scheduler | — | sim | sim | v0.1 | v1.0 |
| Telemetry | sim | sim | real | fleet | federated |
| AppArmor | — | — | draft | enforced | FIPS |
| Measured boot | — | — | v0.1 | v1.0 | + attest |
| Fleet API | — | sim | dev | prod | scale |

---

## First Implementation Sprint (Phase 1, Weeks 1–2)

**Priority:** Get the operator desktop complete so stakeholders can evaluate the full UX.

### Week 1
1. Implement `ControlCenterApp.tsx` — fabric topology panel, live job queue, telemetry gauges, LLM serving table
2. Implement `FleetApp.tsx` — device inventory table, enrollment status badges, OTA history
3. Implement `ClusterApp.tsx` — workload list (K8s pods), Slurm queue, Ray cluster panel
4. Extend `types.ts` with new AppIds: `"fleet"`, `"cluster"`
5. Add new app entries to `WindowManager.tsx` metadata map

### Week 2
6. Write `backend/fleet.py` — CRUD for devices, enrollment simulation, OTA policy
7. Write `backend/cluster.py` — workload mock, Slurm queue, Ray status
8. Wire frontend to backend (replace all hardcoded mock data with API calls)
9. Docker Compose dev environment
10. Vitest unit tests for new components

**Definition of done:** All three new apps open from Dock, display realistic data, and update in real-time (simulated SSE streams). No hardcoded test data in production code paths.
