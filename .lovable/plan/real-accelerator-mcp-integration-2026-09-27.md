# Real accelerator MCP integration

## Build
- Add an authenticated LightOS runtime-gateway client used only inside MCP handlers.
- Add a read-only capability tool that asks the gateway for verified CUDA, ROCm, TPU/XLA, and oneAPI/SYCL inventory.
- Add job tools to submit a portable workload, inspect status/results, and cancel it. Long accelerator runs remain asynchronous so MCP calls stay responsive.
- Forward the signed-in LightOS user identity, request ID, runtime target, and workload details; never expose the gateway credential.
- Return gateway failures and unavailable runtimes honestly, without mock devices, synthetic metrics, or automatic vendor substitution.

## Security
- Keep OAuth mandatory for every tool.
- Read the HTTPS gateway URL and bearer token only at request time from secure backend settings.
- Reject non-HTTPS gateway URLs, except localhost during development.
- Enforce bounded input sizes, runtime allowlists, and cancellation propagation.

## Product copy
- Update Universal Runtime Translation text to describe the implemented gateway adapters and avoid claiming automatic kernel rewriting.
- Make site title and sharing text platform-agnostic across CUDA, ROCm, TPU/XLA, and oneAPI/SYCL.

## Validation
- Regenerate the MCP catalogue.
- Check TypeScript and the preview build.
- Live runtime verification will remain blocked until the gateway URL and bearer token are configured and the gateway implements the documented endpoints.

## Technical contract
- `GET /v1/runtimes` returns verified capabilities and devices.
- `POST /v1/jobs` submits a workload and returns a job ID.
- `GET /v1/jobs/{id}` returns status and results.
- `DELETE /v1/jobs/{id}` requests cancellation.
