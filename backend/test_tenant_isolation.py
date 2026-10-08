"""
Schema-level acceptance tests for the tenants table (PRD-02 precursor).

PRD-02 requires organization/project boundaries with cross-tenant read/write
tests failing closed. Full AT-06 (API/storage/log/stream denial) needs backend
surfaces that don't exist yet; these tests verify the schema foundation only:
the table exists, the slug uniqueness constraint holds, and RLS is enabled.

Skipped unless TEST_DATABASE_URL is set (see conftest.py).

Run:
    TEST_DATABASE_URL=postgres://... pytest test_tenant_isolation.py -v
"""
import uuid

import pytest


def test_tenant_table_exists(db_connection):
    with db_connection.cursor() as cur:
        cur.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'tenants'
            """
        )
        columns = {row[0] for row in cur.fetchall()}
    assert {"tenant_id", "name", "slug", "created_at", "updated_at"}.issubset(columns)


def test_tenant_slug_unique(db_connection):
    slug = f"acme-{uuid.uuid4().hex[:12]}"
    with db_connection.cursor() as cur:
        cur.execute(
            "INSERT INTO public.tenants (name, slug) VALUES (%s, %s)",
            ("Tenant A", slug),
        )
        with pytest.raises(Exception):
            cur.execute(
                "INSERT INTO public.tenants (name, slug) VALUES (%s, %s)",
                ("Tenant B", slug),
            )


def test_tenant_rls_enabled(db_connection):
    with db_connection.cursor() as cur:
        cur.execute(
            "SELECT relrowsecurity FROM pg_class WHERE oid = 'public.tenants'::regclass"
        )
        row = cur.fetchone()
    assert row is not None and row[0] == 1, (
        "RLS must be enabled on public.tenants (fail-closed default)"
    )
