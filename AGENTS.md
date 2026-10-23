# Architecture Rules

- The browser submits constrained workload intent only; Aurora Fabric OS is the sole privileged execution authority because drivers, shells, containers, and cluster control must remain server-side.
- MCP accelerator tools call one authenticated LightOS runtime gateway and return only gateway-verified capacity, plans, and telemetry because Edge Functions cannot inspect accelerator hardware directly.- GPU nodes enroll via one-time, hashed, 15-minute setup codes through the node-enroll function, which alone forwards reports to the runtime gateway, so no gateway credential ever lives on nodes.

- The runtime gateway lives in gateway/ as one plain ASGI app (Docker + outbound tunnel for GPU hosts, thin Modal wrapper as fallback) and only reports measured GPU data, returning a reason instead of numbers when none is visible, so the dashboard can never show fabricated usage.

- Keep the product explanation in `docs/product-brief.md` and setup prerequisites in the root README, so future work distinguishes source implementation from verified operation.
