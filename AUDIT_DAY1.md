# AUDIT_DAY1.md

## 1. Routes found

All routes from App.tsx (React Router):

- /
- /os
- /onboard
- /light-compiler
- /transformer-explainer
- /benchmark
- /pricing
- /checkout/return
- /docs
- /auth
- /reset-password
- /.lovable/oauth/consent
- /mtmc
- /admin
- /admin/testers
- /admin/analytics
- /examples
- /dashboard
- /dashboard/agents
- /dashboard/gpu
- /dashboard/telemetry
- /dashboard/thermal
- /dashboard/governor
- /dashboard/inference
- /dashboard/llm-serving
- /dashboard/models
- /dashboard/training
- /dashboard/benchmark
- /dashboard/photonic
- /dashboard/clusters
- /dashboard/runs
- /dashboard/runs/:runId
- /dashboard/studio
- /dashboard/templates
- /dashboard/agent/new
- /dashboard/data-sources
- /dashboard/rules
- /dashboard/actions
- /dashboard/deploy
- /dashboard/monitor
- /dashboard/billing
- /dashboard/accelerator
- /dashboard/gateway-setup
- *

Also note: DesktopOS (LightOS) has many app windows via WindowManager (Control Center, Fleet Manager, Cluster Manager, Terminal, Agentic AI, MLOps, Datacenter, Token Factory, Inference, Compute Cloud, Photonic Fabric, NCE Monitor, Telemetry, Thermal Control, etc.) that can open as app windows or route windows.

## 2. Backend: real vs mock vs empty

| File | Classification (REAL/MOCK/EMPTY) | Rationale |
|---|---|---|
| backend/main.py | REAL (routing + integration) | FastAPI app with routers, CORS, auth dependency, SSE compile endpoint, fabric listing - functional API structure with real endpoint logic |
| backend/auth.py | REAL (integration logic, external deps) | Validates Supabase JWT, checks admin role via PostgREST, env-based config - real auth integration logic (requires external Supabase) |
| backend/fabrics.py | REAL (data model + logic) | FabricPreset dataclasses, presets, parsing NxM patterns, get_fabric with fallback - working domain logic |
| backend/compiler_sim.py | MOCK (simulation) | Deterministic streaming compiler simulation with seeded timing - not a real compiler backend, explicitly simulated |
| backend/fleet.py | MOCK (in-memory) | DEVICES, OTA_POLICIES in-memory dicts; all endpoints return simulated data/SSE, enrollment simulates attestation - mock data store |
| backend/cluster.py | MOCK (in-memory) | In-memory K8S_PODS, SLURM_JOBS, SLURM_NODES, RAY_STATUS, RAY_JOBS, LIGHTRAIL_CRDS - fully simulated cluster state |
| backend/llm_serving.py | MOCK (in-memory) | _deployments, _logs in-memory with seeded demo state - mock persistence |
| backend/test_llm_serving.py | REAL (tests) | Pytest tests exercising llm_serving router - actual test code (3 tests are order-dependent and fail in full-file runs; pass in isolation) |
| backend/requirements.txt | REAL (deps) | Python dependencies for FastAPI backend |

**Summary:** main/auth/fabrics are structural/integration logic (real code). compiler_sim, fleet, cluster, llm_serving are simulation/mock backends with in-memory state (not connected to real DB/K8s/Slurm/Ray). test_llm_serving is real tests. No EMPTY (stub-only) files found.

## 3. Schema gap vs PRD

PRD Section 5 ("Control Plane Database Schema (PostgreSQL DDL)") defines **9 tables, 4 enums, and 5 indexes** (corrected from the initial 5-table reading):

| # | Table | PRD requirement |
|---|---|---|
| 1 | tenants | PRD-02 foundation (tenant_id, name, slug UNIQUE, created_at, updated_at) |
| 2 | clusters | PRD-04 foundation (FK→tenants RESTRICT, ownership_mode enum, agent_version, last_heartbeat_at, is_active, UNIQUE(tenant_id, name)) |
| 3 | cluster_capability_snapshots | Inventory/capability records (supported_backends enum[], raw_capabilities JSONB, snapshot_digest) |
| 4 | workloads | FK→tenants RESTRICT, UNIQUE(tenant_id, name) |
| 5 | workload_revisions | Immutable specs (canonical_spec JSONB, spec_digest, UNIQUE(workload_id, revision_number)) |
| 6 | deployment_plans | Deterministic contracts (plan_status enum, plan_payload/plan_digest, expires_at) |
| 7 | plan_approvals | Immutable approval binding (verified_plan_digest, signature BYTEA) |
| 8 | executions | execution_status enum, idempotency_key UNIQUE, rollback_revision_id |
| 9 | execution_journal | Append-only operation log (sequence_index, UNIQUE(execution_id, sequence_index)) |

Enums: backend_type, plan_status, execution_status, cluster_ownership_mode.
Indexes: idx_clusters_tenant, idx_workloads_tenant, idx_plans_tenant_status, idx_executions_plan, idx_snapshots_cluster.

| Aspect | Current Schema (Drizzle) | PRD Proposed | Gap |
|---|---|---|---|
| schema.ts | Empty/placeholder ("// auto-generated and intentionally left blank, do not edit") | 9 tables above | **Massive gap** - no tables defined in Drizzle schema |
| Migrations (pre-branch) | 1 custom SQL migration (RLS policy change on public.gpu_metrics, public.telemetry_data, public.system_logs) | Core domain tables | **No domain tables existed** - only policy changes on existing telemetry tables |
| Migrations (feat/tenant-clusters-schema branch) | +0001_add_tenants, +0002_add_clusters (PRD Section 5 tables 1-2, verbatim DDL + RLS + indexes) | 9 tables | 7 domain tables still missing (snapshots, workloads, revisions, plans, approvals, executions, journal) |
| Membership model | Does not exist | PRD-02 requires org/project boundaries; user→tenant mapping is needed to scope anything per user | **PRD-internal gap**: Section 5 defines no membership/roles-per-tenant table; must be designed with product owner |
| Tenant isolation acceptance | Not testable without applied migrations + membership model | PRD acceptance test AT-06: "Access another tenant's resources → APIs, storage, logs, and event streams deny access" | Full AT-06 needs backend API/storage/log surfaces that don't exist yet; schema-level precursor tests exist (opt-in via TEST_DATABASE_URL) |
| Enforcement surfaces | RLS enabled on tenants/clusters with admin-only SELECT (fail-closed for PostgREST paths); FastAPI backend bypasses RLS entirely | Tenant scoping everywhere | RLS covers Supabase client paths only; FastAPI must scope queries in predicates once endpoints exist |

**Conclusion:** The Drizzle/Supabase schema did NOT cover the PRD's 9 domain tables. The feat/tenant-clusters-schema branch adds tables 1-2 (tenants, clusters) as custom SQL migrations with fail-closed RLS, plus opt-in schema tests. Remaining blockers before more tables matter: (1) migrations not applied to any database (no confirmed migration URL); (2) user→tenant membership model undefined in the PRD; (3) backend has no DB client at all.
