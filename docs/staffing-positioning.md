# LightOS — Staffing Plan & Product Positioning

## Product Positioning

### One-line

> LightOS is the AI Infrastructure OS that makes LightRail photonic fabrics first-class citizens in Kubernetes, Slurm, and Ray — shipping secure, attestable, zero-trust compute infrastructure in a single bootable image.

### Differentiation

| Dimension | LightOS | Generic Linux + K8s |
|-----------|---------|-------------------|
| Fabric awareness | Native photonic topology in scheduler | None (flat Ethernet) |
| Device trust | TPM measured boot + PCR attestation at enrollment | Manual SSH key distribution |
| OTA updates | Signed A/B atomic OTA with dm-verity rollback | Manual, risky |
| Operator UX | Unified desktop shell (Control Center, Fleet, Cluster) | Disparate tools (kubectl, Grafana, shell) |
| NCCL integration | Collective-type-aware placement scoring | Manual `--nodelist` tuning |
| Security baseline | AppArmor + mTLS + TPM out of the box | Opt-in, inconsistent |

### Target Buyers

1. **AI Infrastructure Teams** at hyperscalers and large enterprises deploying LightRail clusters (>16 nodes)
2. **MLOps Teams** running large training jobs who need reproducible, fabric-optimized placement
3. **Security-conscious enterprises** (financial services, defense, healthcare) requiring attestable, FIPS-capable AI compute

### Competitive Context

- **NVIDIA DGX OS**: GPU-centric, InfiniBand fabric, no photonic support, proprietary
- **CoreOS / Flatcar**: general-purpose immutable OS, no AI/fabric awareness
- **AWS Neuron OS**: AWS-only, proprietary, Trainium-specific
- **LightOS**: fabric-native, open standards (TPM, AppArmor, Kubernetes), LightRail-optimized

---

## Staffing Plan

### Phase 1 (Weeks 1–6): Operator Shell

**Headcount: 2**

| Role | Responsibilities |
|------|----------------|
| Senior Frontend Engineer | AI Control Center, Fleet Manager, Cluster Manager UIs; live telemetry visualization |
| Senior Fullstack Engineer | Fleet backend API, Cluster backend API, K8s CRD YAML, backend integration |

**Hiring profile:**
- Frontend: React 18, TypeScript, TailwindCSS, WebSockets/SSE, data visualization (D3 or SVG)
- Fullstack: FastAPI, Python, Kubernetes (kubectl/client-go), REST API design

---

### Phase 2 (Weeks 7–18): Bootable OS Image

**Headcount: 4** (+2 from Phase 1)

| Role | Responsibilities |
|------|----------------|
| Senior Kernel Engineer | Kernel 6.8-lightrail fork, dm-verity setup, TPM driver integration, IMA |
| Senior Systems Engineer (C/Rust) | lrd daemon v0.1: enrollment service, OTA engine, AppArmor loader |
| Senior Fullstack Engineer | EST server, Fleet CA tooling, PTY WebSocket terminal |
| QA / Infrastructure Engineer | Image build pipeline, QEMU boot CI, dm-verity test suite |

**Hiring profile:**
- Kernel: Linux kernel internals, TPM 2.0 (TPM2-TSS), dm-verity, IMA/EVM, Secure Boot
- Systems: Rust or C, systemd services, TPM2-TSS, libssl/libcrypto, POSIX
- QA: QEMU, Packer, GitHub Actions, integration testing

---

### Phase 3 (Weeks 19–34): Fleet Ops + Cluster Orchestration

**Headcount: 7** (+3 from Phase 2)

| Role | Responsibilities |
|------|----------------|
| Senior Kernel Engineer | Photonic fabric driver v0.1, WDM channel enumeration, RDMA offload |
| Systems Engineer (C/Rust) | lrd v0.2: gRPC telemetry, attestation responder, mTLS client |
| Systems Engineer | Fleet Control Plane service: device registry, OTA orchestration |
| Platform Engineer | Kubernetes operator (controller-runtime), 5 CRDs, fabric scheduler extender |
| Platform Engineer | Slurm SPANK plugin, Ray resource label adapter |
| Fullstack Engineer | Grafana dashboards, Prometheus alerting, Fleet API expansion |
| SRE / DevOps | Pilot deployment (2-rack cluster), CI/CD pipelines, runbooks |

---

### Phase 4 (Weeks 35+): Production Appliance

**Headcount: 16** (+9 from Phase 3)

| Role | Count | Key Focus |
|------|-------|-----------|
| Kernel / Driver | 2 | NCCL-aware collective scheduler, fabric driver v1.0 |
| Systems (Rust) | 3 | lrd v1.0 production hardening, FIPS integration |
| Platform | 3 | Multi-cluster federation, billing metering API |
| ML Infra | 2 | NCCL plugin, distributed training optimization |
| Security | 1 | FIPS 140-3 certification, HSM integration, pen-test program |
| SRE | 2 | Production oncall, HA Fleet Control Plane, DR |
| PM | 1 | Customer roadmap, pilot program management |
| QA | 2 | Reliability testing, hardware-in-the-loop CI |

---

## Headcount Timeline

```
Week:    1    6    12   18   24   30   36   42+
         │    │    │    │    │    │    │    │
Staff:   2    2    4    4    7    7   16   16+
         │         │         │         │
         P1        P2        P3        P4
```

---

## Compensation Benchmarks (US Market, 2024)

| Role | Level | Base Range |
|------|-------|------------|
| Senior Frontend Engineer | L5 | $180–220K |
| Senior Fullstack Engineer | L5 | $180–220K |
| Senior Kernel Engineer | L6 | $220–280K |
| Senior Systems Engineer | L5–6 | $200–260K |
| Platform Engineer | L5 | $180–230K |
| ML Infra Engineer | L5–6 | $200–260K |
| Security Engineer | L6 | $220–270K |
| SRE | L5 | $180–230K |
| QA / Infra | L4 | $140–180K |
| PM | L5 | $160–200K |

*All roles include equity. Offshore/remote can reduce base 30–50% without sacrificing quality for some roles (QA, Fullstack).*

---

## Key Hiring Risks

| Risk | Mitigation |
|------|-----------|
| TPM / Secure Boot kernel engineers are rare | Partner with university research groups; target ex-CoreOS/Flatcar engineers |
| Photonic fabric driver expertise near-zero externally | Train from LightRail hardware team; hire photonics PhDs |
| FIPS certification requires specific tool chains | Engage NVLAP-accredited lab early (12–18 month lead time) |
| Competitive market for AI infra engineers | Strong equity story, differentiated technical problem, remote-friendly |
