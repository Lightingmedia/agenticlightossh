# LightOS — Staffing Plan and Product Positioning

---

## Engineering Staffing Model

### Phase 1 Prototype Team (6 Weeks)

Minimum viable team to complete the operator desktop and stub APIs:

| Role | Headcount | Responsibilities |
|---|---|---|
| UI Engineer | 1 | ControlCenterApp, FleetApp, ClusterApp, Dock extension, WindowManager updates |
| Backend Engineer | 1 | fleet.py, cluster.py, API integration, Docker Compose dev env |

**Cost:** 2 engineers × 6 weeks. Output: complete operator shell, all Phase 1 UI flows, simulated backend APIs, Docker Compose dev environment.

---

### Phase 2 OS Image Team (12 Weeks)

Bringing LightOS to real bootable hardware:

| Role | Headcount | Responsibilities |
|---|---|---|
| Linux Kernel Engineer | 1 | Custom kernel config, io_uring tuning, NCE driver stubs, PCIe MMIO access |
| Systems Engineer | 1 | lrd daemon v0.1 (Go/Rust), systemd units, A/B partition tooling, OTA agent v0.1 |
| UI Engineer | 1 | Electron wrapper for desktop shell, lrd→UI WebSocket bridge, real telemetry wiring |
| DevOps/Platform Engineer | 1 | Packer image builder, image signing pipeline, CI/CD, USB/PXE boot support |

**Total Phase 2:** 4 engineers × 12 weeks.

**Key output:** Bootable `.img` for x86_64 reference hardware, TPM enrollment, live fabric telemetry in Control Center, A/B OTA flip.

---

### Phase 3 Fleet Operations Team (16 Weeks)

Multi-node fleet, Kubernetes operator, Slurm integration:

| Role | Headcount | Responsibilities |
|---|---|---|
| Linux Kernel Engineer | 1 | Kernel fabric drivers, Slurm SPANK plugin, scheduler hooks |
| Systems Engineer | 1 | lrd v1.0, mTLS fleet API, Fleet CA production setup |
| Platform Engineer (Kubernetes) | 1 | LightRail operator CRDs and controllers (Go, controller-runtime) |
| Platform Engineer (Infra) | 1 | Fleet API v1 (PostgreSQL), Prometheus federation, MAAS integration |
| Security Engineer | 1 | AppArmor enforcement, WireGuard overlay, OTA HSM key ceremony |
| UI Engineer | 1 | Real-data integration for all apps, Grafana embed, alert surfaces |

**Total Phase 3:** 6 engineers × 16 weeks.

**Key output:** Production-grade fleet API, mTLS enrollment, Kubernetes operator v1, Slurm bridge, AppArmor enforced.

---

### Phase 4 Production Appliance Team (Ongoing)

Stable appliance OS with full security posture, Ray, NCCL scheduler, and scale:

| Role | Headcount | Responsibilities |
|---|---|---|
| Kernel Engineers | 2–3 | Fabric driver depth, CXL support, ARM64 image, perf tuning |
| Driver/Runtime Engineers | 2–4 | NCE hardware library, lrd v2.0, Ray operator, NCCL scheduler |
| Platform Engineers | 2–3 | Fleet API scale (10k nodes), K8s operator v2, multi-cluster |
| Security Engineers | 1–2 | FIPS 140-3, air-gap CA, SOC 2 alignment, CVE triage |
| UI/UX Engineers | 1–2 | Full Grafana integration, appliance kiosk mode, mobile fleet view |
| Release Engineers | 1–2 | OTA channels (stable/beta/canary), reproducible builds, image signing audit |

**Total Phase 4:** 9–16 engineers (scale with product maturity and customer commitments).

---

### Team Summary by Phase

| Phase | Duration | Engineers | Key Milestone |
|---|---|---|---|
| Phase 0 | Done | 1–2 | Prototype desktop shell |
| Phase 1 | 6 weeks | 2 | Complete operator UX |
| Phase 2 | 12 weeks | 4 | Bootable OS on hardware |
| Phase 3 | 16 weeks | 6 | Fleet + K8s operator |
| Phase 4 | Ongoing | 9–16 | Production appliance |

---

### Hiring Priorities (Phase 1 → 2 transition)

If starting Phase 2 immediately after Phase 1:

1. **Linux Kernel Engineer** — hardest to hire, longest ramp time. Start sourcing immediately.
2. **Systems Engineer (Go/Rust, systemd, TPM)** — lrd is the critical path for all hardware integration.
3. **DevOps/Platform Engineer** — unblocks reproducible image builds and CI.
4. **UI Engineer** — can continue from Phase 1 or be a new hire.

The kernel and systems engineers are the long-pole items. Budget 3–4 months to hire experienced candidates.

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Kernel engineer availability | High | Critical | Contract with embedded Linux consultancies (e.g. Bootlin, Collabora) for Phase 2 |
| NCE hardware register documentation incomplete | Medium | High | Engage LightRail AI Labs hardware team early; develop emulator for CI |
| TPM not present on early dev hardware | Medium | Medium | Use TPM emulator (swtpm) for development; ship real TPM on production SKUs |
| KDE Plasma session crashes in Wayland | Low | Medium | Pin Plasma version; ship only tested addons; maintain automated session startup test |
| Kubernetes operator API instability | Low | Medium | Pin controller-runtime version; own CRD schema; version upgrade in integration test |
| Slurm plugin ABI changes | Medium | Medium | Build against Slurm 23.x LTS; document supported versions |
| OTA rollback data compatibility | Low | High | Never touch `/var`; all state migrations are lrd-managed with version guards |
| Fleet CA key compromise | Very Low | Critical | Offline HSM root CA; quarterly key ceremony; device cert revocation CRL |
| Open-source supply chain | Medium | High | Hermetic builds; vendored dependencies; SBOMs for every image release |

---

## Product Positioning Statement

LightOS is the **AI Infrastructure Operating System** from LightRail AI — a vertically integrated, appliance-grade OS stack designed for photonic AI fabrics, heterogeneous AI compute clusters, and distributed AI control surfaces.

Unlike general-purpose operating systems assembled from commodity parts, LightOS is purpose-built from the boot chain to the operator desktop: a hardened Ubuntu Server LTS foundation, a custom Linux kernel tuned for fabric I/O, the LightRail Runtime daemon providing live topology telemetry and fabric-aware workload scheduling, and a KDE Plasma/Wayland operator surface that gives fleet teams direct, real-time visibility into cluster health, job queues, and interconnect utilization — all without a third-party management plane.

LightOS ships as a signed, immutable appliance image. Every node enrolls with a TPM-backed device identity, attests its boot state to the LightRail Fleet CA, and participates in atomic OTA updates with instant rollback. Fleet operations — provisioning, enrollment, certificate lifecycle, OTA policy, and telemetry — are first-class OS primitives, not afterthoughts bolted on top of a desktop OS.

**LightOS is not a Linux distribution. It is the operating layer that turns heterogeneous AI hardware into a managed, secure, observable, and fleet-operable AI infrastructure platform.**

---

## Competitive Differentiation

| Capability | LightOS | Ubuntu Pro | RHEL AI | CoreOS |
|---|---|---|---|---|
| AI fabric-aware scheduling | Native (lrd) | None | None | None |
| Photonic interconnect telemetry | Native | None | None | None |
| LightRail CRD operator | Native | None | None | None |
| TPM-backed device identity | Native | Add-on | Add-on | Partial |
| Immutable A/B OTA | Native | Livepatch only | None | Native |
| Appliance operator desktop | Native | None | None | None |
| NCCL-aware placement | Native | None | None | None |
| Slurm + K8s unified scheduling | Native | None | Partial | None |

LightOS is purpose-built for this stack. No other OS product delivers AI fabric telemetry, NCCL-aware placement, TPM-enrolled fleet management, and an appliance operator desktop as a single integrated product.
