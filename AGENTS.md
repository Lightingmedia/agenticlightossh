# Architecture Rules

- The browser submits constrained workload intent only; Aurora Fabric OS is the sole privileged execution authority because drivers, shells, containers, and cluster control must remain server-side.
- MCP accelerator tools call one authenticated LightOS runtime gateway and return only gateway-verified capacity, plans, and telemetry because Edge Functions cannot inspect accelerator hardware directly.- GPU nodes enroll via one-time, hashed, 15-minute setup codes through the node-enroll function, which alone forwards reports to the runtime gateway, so no gateway credential ever lives on nodes.
