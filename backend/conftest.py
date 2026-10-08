"""
Shared fixtures for schema-level database tests.

DB-backed tests are opt-in: they run only when TEST_DATABASE_URL is set to a
database where migrations 0001_add_tenants and 0002_add_clusters have been
applied. Without it, every test using these fixtures skips — a skip is NOT
evidence that the tables exist.

Run:
    TEST_DATABASE_URL=postgres://... pytest test_tenant_isolation.py test_cluster_registration.py -v
"""
import os
import uuid

import pytest

TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", "")


@pytest.fixture
def db_connection():
    if not TEST_DATABASE_URL:
        pytest.skip("TEST_DATABASE_URL not set — DB schema tests are opt-in")
    import psycopg

    conn = psycopg.connect(TEST_DATABASE_URL)
    # Wrap in a transaction and roll back so seeded rows never persist.
    try:
        yield conn
        conn.rollback()
    finally:
        conn.close()


@pytest.fixture
def seeded_tenant(db_connection):
    """Insert a throwaway tenant; rolled back with db_connection."""
    slug = f"test-tenant-{uuid.uuid4().hex[:12]}"
    with db_connection.cursor() as cur:
        cur.execute(
            "INSERT INTO public.tenants (name, slug) VALUES (%s, %s) RETURNING tenant_id",
            (f"Test Tenant {slug}", slug),
        )
        tenant_id = cur.fetchone()[0]
    return tenant_id
