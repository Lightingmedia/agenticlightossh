"""Self-hosted compute-provider service.

Keeps each user's cloud / GPU-provider connections in a database owned by this backend, with the credentials
encrypted at rest, and validates them / reads live inventory from the providers' own APIs. It is the self-hosted
counterpart of the ``provider-connect`` Supabase edge function and exposes the same operations over REST under
``/api/providers`` (see ``api.py``).

Nothing here creates, changes or deletes cloud resources: launching stays with Aurora Fabric OS behind the runtime
gateway. The provider catalog (``catalog.json``) is generated from the TypeScript source of truth with
``npm run export:provider-catalog``.
"""
