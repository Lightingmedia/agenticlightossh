-- PRD Section 5 (Control Plane Database Schema), table 1: tenants
-- Foundation for PRD-02 (organization/project boundaries).
--
-- NOTE: not applied to any environment yet. Requires a confirmed migration
-- database URL from the project owner before `drizzle-kit migrate` runs.

CREATE TABLE public.tenants (
    tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Keep updated_at in sync, matching the public.profiles convention.
CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON public.tenants
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: fail-closed. With RLS enabled and only the admin SELECT policy below,
-- authenticated users without the admin role read zero rows, and all writes
-- are denied (no INSERT/UPDATE/DELETE policies exist).
--
-- Scope of enforcement: applies to PostgREST / Supabase client paths only.
-- The FastAPI backend connects with privileged credentials and bypasses RLS;
-- tenant scoping there must be enforced in query predicates (future work,
-- blocked on the user->tenant membership model — PRD defines no membership
-- table). This policy is defense-in-depth, not complete tenant isolation.
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view tenants" ON public.tenants;
CREATE POLICY "Admins can view tenants" ON public.tenants
    FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));
