"""Thin Modal wrapper (CPU-only fallback). Deploy: python -m modal deploy gateway/modal_app.py

Modal secret `lightos-gateway` must contain LIGHTOS_GATEWAY_TOKEN (>= 32 chars).
"""
import modal

GPU_TYPE = None  # Modal declined GPU billing; Brev is the GPU target (see README.md)

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install_from_requirements("requirements.txt")
    .add_local_python_source("lightos_gateway")
)
app = modal.App("lightos-gateway", image=image)


@app.function(gpu=GPU_TYPE, secrets=[modal.Secret.from_name("lightos-gateway")], min_containers=0)
@modal.concurrent(max_inputs=50)
@modal.asgi_app()
def serve():
    import os
    from lightos_gateway.app import create_app, load_token

    os.environ.setdefault("GATEWAY_DB_PATH", "/tmp/gateway.db")
    os.environ.setdefault("GATEWAY_NODE_NAME", "modal-cpu")
    return create_app(load_token())
