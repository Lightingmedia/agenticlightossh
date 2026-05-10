# LightOS v2.0 — Phased Roadmap

## Phase 0 — Prototype Shell (Complete)

**Duration:** Done  
**Team:** 1 engineer

- React desktop shell with window manager
- AI Control Center stub (iframe)
- Fabric compiler SSE demo
- LLM Serving mock API

---

## Phase 1 — Operator Shell (6 weeks)

**Team:** 2 engineers (1 frontend, 1 fullstack)  
**Goal:** Production-ready operator interface for early pilots

### Deliverables

| Item | Owner | Status |
|------|-------|--------|
| AI Control Center (full implementation) | Frontend | ✅ Done (this PR) |
| Fleet Manager UI | Frontend | ✅ Done (this PR) |
| Cluster Manager UI (K8s, Slurm, Ray, CRDs) | Frontend | ✅ Done (this PR) |
| Fleet backend API (fleet.py) | Fullstack | ✅ Done (this PR) |
| Cluster backend API (cluster.py) | Fullstack | ✅ Done (this PR) |
| Kubernetes CRD YAML + Operator deployment | Fullstack | ✅ Done (this PR) |
| Fabric topology live SVG visualization | Frontend | ✅ Done (this PR) |
| Node telemetry live gauges | Frontend | ✅ Done (this PR) |

---

## Phase 2 — Bootable OS Image (12 weeks)

**Team:** 4 engineers (1 kernel, 1 systems, 1 fullstack, 1 QA)  
**Goal:** Bootable LightOS image with core security stack

### Deliverables

- Ubuntu 24.04 LTS base image with custom kernel 6.8-lightrail
- dm-verity rootfs + A/B partition layout
- Secure Boot (UEFI MOK signing pipeline)
- TPM 2.0 measured boot + PCR register validation
- LightRail Runtime Daemon (lrd) v0.1
  - Enrollment service (TPM PCR quote → Fleet CA cert issuance)
  - OTA engine (download → verify → A/B write → boot flag)
  - AppArmor profile loader
- Fleet CA hierarchy: offline root → online intermediate → device certs
- EST server for device cert issuance (/simpleenroll)
- Basic PTY terminal over WebSocket in desktop shell
- CI: image build + boot test in QEMU

---

## Phase 3 — Fleet Ops + K8s Operator (16 weeks)

**Team:** 6 engineers (1 kernel, 2 systems, 2 fullstack, 1 SRE)  
**Goal:** Full fleet management + cluster orchestration for pilot customers

### Deliverables

- lrd v0.2 with full telemetry streaming (gRPC → Prometheus)
- Fleet Control Plane: device registry, OTA orchestration, cert management
- mTLS everywhere (fleet control plane ↔ lrd, operator API ↔ cluster)
- Kubernetes operator v1.0 with 5 CRDs
- Fabric-aware scheduler extender (filter + score)
- Slurm SPANK plugin for fabric-aware node selection
- Ray custom resource labels for placement
- LightRail Fabric Driver v0.1 (WDM channel enumeration, RDMA offload)
- Grafana dashboards: fabric bandwidth, congestion, per-job telemetry
- OTA policy engine with rolling + canary strategies
- End-to-end pilot deployment on 2-rack LightRail cluster

---

## Phase 4 — Production Appliance (Ongoing)

**Team:** 9–16 engineers across kernel, systems, platform, ML infra, security, SRE  
**Goal:** Full production-grade platform for commercial customers

### Deliverables

- NCCL-aware collective scheduling (annotated LightRailJob collectives)
- FIPS 140-3 validated crypto (OpenSSL 3.x FIPS module)
- HSM-backed Fleet CA intermediate key
- Multi-cluster federation (span jobs across racks / data centers)
- Billing and metering API
- Customer-facing SLA dashboards
- Disaster recovery: cross-AZ OTA rollback
- LightOS App Store (signed workload bundles)
- Full KDE Plasma desktop with Wayland compositor (replace browser shell)
- Hardware security key support (FIDO2 / PIV) for operator authentication

---

## Staffing Plan by Phase

| Role | P1 | P2 | P3 | P4 |
|------|----|----|----|----|
| Kernel / Driver | — | 1 | 1 | 2 |
| Systems (C/Rust) | — | 1 | 2 | 3 |
| Fullstack (Python/TS) | 2 | 1 | 2 | 3 |
| QA / Infra | — | 1 | 1 | 2 |
| SRE / DevOps | — | — | 1 | 2 |
| Security | — | — | — | 1 |
| PM | — | — | — | 1 |
| ML Infra | — | — | — | 2 |
| **Total** | **2** | **4** | **7** | **16** |

---

## Key Milestones

| Milestone | Target | Gate |
|-----------|--------|------|
| Phase 1 complete | Week 6 | Pilot demo with live fabric map |
| First bootable image | Week 18 | QEMU boot + dm-verity pass |
| TPM enrollment working | Week 24 | PCR attestation verified on real hardware |
| First pilot cluster | Week 38 | 8-node job on live fabric |
| FIPS certification | Week 72 | CMVP certificate issued |
