"""Provider adapters and their registry.

``ADAPTERS`` lists every provider this backend can validate and read inventory for on its own. Catalog entries that are
not here (DGX Cloud Lepton, Nebius) are delegated to the Aurora runtime gateway instead - see ``service.py``.
"""
from __future__ import annotations

from typing import Dict

from . import aws, azure, clouds, gcp, ibm, inference, kubernetes, oci
from .base import Adapter, AdapterContext, Creds, Item, Validation, make_item

ADAPTERS: Dict[str, Adapter] = {
    "aws": aws.ADAPTER,
    "gcp": gcp.ADAPTER,
    "azure": azure.ADAPTER,
    "coreweave": kubernetes.ADAPTER,
    "kubernetes": kubernetes.ADAPTER,
    "lambda": clouds.LAMBDA,
    "runpod": clouds.RUNPOD,
    "vast": clouds.VAST,
    "digitalocean": clouds.DIGITALOCEAN,
    "crusoe": clouds.CRUSOE,
    "ibm": ibm.ADAPTER,
    "oci": oci.ADAPTER,
    **inference.ADAPTERS,
}

__all__ = ["ADAPTERS", "Adapter", "AdapterContext", "Creds", "Item", "Validation", "make_item"]
