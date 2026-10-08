-- PRD Section 5 (Control Plane Database Schema), table 2: clusters
-- Foundation for PRD-04 (scoped cluster enrollment). Depends on 0001_add_tenants.
--
-- NOTE: not applied to any environment yet. Requires a confirmed migration
-- database URL from the project owner before `drizzle-kit migrate` runs.
--
-- Deliberate omission: no enrollment-credential column exists on this table.
-- PRD-04 requires that cluster credentials never reach the browser; short-
-- lived scoped enrollment credentials belong in a separate secrets store,
-- not in the inventory table.

CREATE TYPE public.cluster_ownership_mode AS ENUM ('observe', 'workload_management', 'approved_infrastructure');

CREATE TABLE public.clusters (
    cluster_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(tenant_id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    ownership_mode public.cluster_ownership_mode NOT NULL DEFAULT 'workload_management',
    agent_version VARCHAR(64),
    last_heartbeat_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_cluster_name UNIQUE (tenant_id, name)
);

-- PRD Section 5: tenant-isolation index for scoped retrieval.
CREATE INDEX idx_clusters_tenant ON public.clusters(tenant_id);

-- RLS: fail-closed, same posture and caveats as public.tenants in 0001.
-- Applies to PostgREST / Supabase client paths only; the FastAPI backend
-- bypasses RLS and must scope queries by tenant_id itself (future work,
-- blocked on the user->tenant membership model).
ALTER TABLE public.clusters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view clusters" ON public.clusters;
CREATE POLICY "Admins can view clusters" ON public.clusters
    FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));
