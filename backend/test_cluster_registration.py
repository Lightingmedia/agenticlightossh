"""
Schema-level acceptance tests for the clusters table (PRD-04 precursor).

PRD-04 requires scoped cluster enrollment whose inventory and health appear
without exposing cluster credentials in the browser. The schema enforces the
latter by construction: no credential column exists on the table. These tests
verify the schema foundation only: the table exists, tenant FK is enforced,
and cluster names are unique per tenant (PRD's uq_tenant_cluster_name).

Skipped unless TEST_DATABASE_URL is set (see conftest.py).

Run:
    TEST_DATABASE_URL=postgres://... pytest test_cluster_registration.py -v
"""
import uuid

import pytest


def test_cluster_table_exists(db_connection):
    with db_connection.cursor() as cur:
        cur.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'clusters'
            """
        )
        columns = {row[0] for row in cur.fetchall()}
    assert {
        "cluster_id",
        "tenant_id",
        "name",
        "ownership_mode",
        "agent_version",
        "last_heartbeat_at",
        "is_active",
        "created_at",
    }.issubset(columns)


def test_cluster_has_no_credential_columns(db_connection):
    """PRD-04: credentials must never live on the inventory table."""
    with db_connection.cursor() as cur:
        cur.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'clusters'
              AND (column_name ILIKE '%secret%'
                OR column_name ILIKE '%credential%'
                OR column_name ILIKE '%token%'
                OR column_name ILIKE '%password%'
                OR column_name ILIKE '%key%')
            """
        )
        rows = cur.fetchall()
    assert rows == [], f"Unexpected credential-like columns on clusters: {rows}"


def test_cluster_requires_existing_tenant(db_connection):
    """FK enforcement: a cluster cannot be created for a non-existent tenant."""
    with db_connection.cursor() as cur:
        with pytest.raises(Exception):
            cur.execute(
                "INSERT INTO public.clusters (tenant_id, name) VALUES (%s, %s)",
                (uuid.uuid4(), "ghost-cluster"),
            )


def test_cluster_name_unique_per_tenant(db_connection, seeded_tenant):
    with db_connection.cursor() as cur:
        cur.execute(
            "INSERT INTO public.clusters (tenant_id, name) VALUES (%s, %s)",
            (seeded_tenant, "cluster-a"),
        )
        with pytest.raises(Exception):
            cur.execute(
                "INSERT INTO public.clusters (tenant_id, name) VALUES (%s, %s)",
                (seeded_tenant, "cluster-a"),
            )


def test_cluster_name_reusable_across_tenants(db_connection, seeded_tenant):
    """uq_tenant_cluster_name is per-tenant: same name, different tenant, OK."""
    other_slug = f"other-{uuid.uuid4().hex[:12]}"
    with db_connection.cursor() as cur:
        cur.execute(
            "INSERT INTO public.tenants (name, slug) VALUES (%s, %s) RETURNING tenant_id",
            (f"Other {other_slug}", other_slug),
        )
        other_tenant = cur.fetchone()[0]
        cur.execute(
            "INSERT INTO public.clusters (tenant_id, name) VALUES (%s, %s)",
            (seeded_tenant, "cluster-a"),
        )
        cur.execute(
            "INSERT INTO public.clusters (tenant_id, name) VALUES (%s, %s)",
            (other_tenant, "cluster-a"),
        )


def test_cluster_rls_enabled(db_connection):
    with db_connection.cursor() as cur:
        cur.execute(
            "SELECT relrowsecurity FROM pg_class WHERE oid = 'public.clusters'::regclass"
        )
        row = cur.fetchone()
    assert row is not None and row[0] == 1, (
        "RLS must be enabled on public.clusters (fail-closed default)"
    )
