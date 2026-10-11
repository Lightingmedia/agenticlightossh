"""Local model server for /v1/jobs (MTMC). OpenAI-compatible vLLM on the same GPU host.

If no model server is configured the gateway answers 501 instead of pretending to run the job.
"""
from __future__ import annotations

import json
import os
import urllib.request
from typing import Optional


class InferenceBackend:
    def __init__(self, url: Optional[str], model: Optional[str]):
        self.url = (url or "").rstrip("/")
        self.model = model or ""

    def configured(self) -> bool:
        return bool(self.url and self.model)

    def chat(self, payload: dict, timeout: int = 60) -> dict:
        body = {
            "model": self.model,
            "messages": payload.get("messages", []),
            "max_tokens": int(payload.get("max_tokens", 512)),
        }
        if payload.get("response_format") == "json":
            body["response_format"] = {"type": "json_object"}
        req = urllib.request.Request(
            f"{self.url}/v1/chat/completions", data=json.dumps(body).encode(),
            headers={"Content-Type": "application/json"}, method="POST",
        )
        with urllib.request.urlopen(req, timeout=timeout) as r:
            d = json.loads(r.read().decode())
        return {"output": d["choices"][0]["message"]["content"], "usage": d.get("usage", {})}


def from_env() -> InferenceBackend:
    return InferenceBackend(os.environ.get("VLLM_URL"), os.environ.get("MODEL"))
