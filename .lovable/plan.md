# LightOS: product definition and launch action plan

## 1. Make the product understandable

**LightRail AI is the company. Aurora Fabric OS is the agentic product. LightOS is its user-facing workspace.**

The product thesis is: **an infrastructure agent that understands a team's intent, checks available compute and policy, proposes an action, executes authorized work, and verifies the result.** The dashboard is how users inspect and control that agent—not the product's main purpose.

Suggested public description:

> LightOS helps small AI teams manage their own GPU infrastructure through conversation. Connect your compute account, inspect available capacity, and approve supported actions from one workspace.

Until execution is verified, describe the available release as **an early-access GPU monitoring and agent-planning workspace**, not a fully autonomous operating system.

### Explanation to give another AI

> We are building Aurora Fabric OS, exposed through the LightOS workspace. It is an agentic control plane for infrastructure users already own or rent, not a GPU cloud, a replacement for Ubuntu, or a chip product. Users express intent; the agent gathers verified capacity, checks permissions and budgets, proposes a plan, asks for approval when needed, executes only supported actions through an authenticated runtime gateway, and reads back the result. MCP provides agent tools; MTMC routes intent/model calls; the gateway is the privileged execution boundary. Dashboards display agent state and measured infrastructure data. The launch wedge is small AI teams connecting one compute account and getting one useful, verifiable result. Broader accelerator translation, photonic fabric, custom silicon, and autonomous optimization remain roadmap items unless demonstrated on real hardware. Missing hardware must show unavailable, never invented telemetry or success.

## 2. Answer Boardy's question

**Start with the truthful landing-page correction, then the working quickstart in the same first milestone.** Sending users to an installation guide while the site overclaims is risky; rewriting marketing without a working first run is equally insufficient. Credential exposure triage precedes both.

Boardy correctly identifies an achievable entry point: bring-your-own compute credentials, inventory, and a useful result. That is the first commercial use case—not a reason to abandon the agent thesis.

Do not accept the attachment's factual assertions without checking them:

- Tracked environment files are confirmed. Their presence alone does not prove a private credential leak: browser configuration and publishable keys are intentionally public. Audit and rotate actual private credentials, including previously exposed provider credentials; do not blindly rotate public configuration.
- Provider integrations exist, but a catalog entry does not prove working inventory or execution across every provider.
- No real-GPU end-to-end result has been verified in this work. Checkout code exists, but live payment behavior is unverified.
- SOC 2 status and utilization improvements are not established. Remove unsupported claims. Do not replace 70–85% with 70–80%, or claim “controls in progress,” without evidence.
- This local inspection does not establish remote repository statistics or the status of an open PR.

## 3. Choose one launch scope

**Audience:** independent AI developers and 2–10-person AI teams that already rent or own GPUs.

**First outcome:** connect one supported compute account or existing GPU host, see verified inventory and usage, then use the agent to plan a bounded inference task. A paid pilot may approve and run that task once the execution path passes the launch gates.

Choose the first provider based on the account/GPU access we can actually test—not catalog size. Use an existing host if available; otherwise the founder supplies a funded GPU account. Do not continue cycling through hosting services without confirmed access.

### Include

- Sign-in and a guided, supported connection path.
- Real inventory and available telemetry, with source and freshness.
- A prominent conversational agent entry point.
- A structured plan showing target GPU, expected operation, budget, and approval requirement.
- For the paid pilot: explicit approval, one bounded inference job, status, measured outcome, and an audit trail.
- Honest unavailable/error states and a separate, clearly labeled demo experience.
- Free-plan enforcement and a clear upgrade path.

### Defer; preserve existing code

- Photonic controls without connected hardware, custom silicon, and RISC-V kernel work.
- Claims of universal runtime translation or full execution support across all providers.
- Arbitrary host-shell access, unrestricted model-generated commands, and autonomous destructive actions.
- More desktop apps, charts, or simulated setup steps as launch priorities.
- Self-training/data-moat claims before consent, data policy, and operational proof.

The browser terminal remains a simulation, not an Ubuntu shell on the customer's host. No new UI-facing GitHub references or links are introduced; repository release hygiene is a separate distribution task.

## 4. Commercial motion

Keep the user's chosen **Free plan: one GPU, monitoring only, no card required**.

- A second detected GPU triggers an upgrade prompt. Enforce the one-GPU data entitlement server-side, not only by hiding cards.
- Free users cannot execute privileged agent actions. Apply the same entitlement checks to web requests, MCP tools, and gateway-backed paths.
- Keep a clearly labeled demo outside live customer telemetry; never use demo state to imply a connected GPU.
- Start paid access as a small, assisted early-access pilot. Existing paid price points remain unchanged during this plan; validate willingness to pay before adding more tiers.
- GPU rental is billed by the customer's compute provider; a LightOS subscription does not include GPU credits.
- Proposed simplification: remove blanket 7-day trial messaging from launch pages and use Free → paid early access consistently. Review checkout settings so displayed terms match actual billing behavior.

## 5. Fourteen-day execution target

This is a target with evidence gates, not a promise to launch in fourteen days. Start the real-GPU gate as soon as access is available. If access or security is blocked, delay the affected release rather than substitute simulated success.

### Days 1–2 — Trust and first-run instructions

**Builder:** audit tracked credential locations without printing values; remove private client-side credentials; improve example configuration and ignore rules; correct unsupported certification/performance claims and distinguish live, demo, and roadmap features.

**Founder:** rotate exposed third-party credentials in the issuing services; approve the software license and provide accurate company/contact/legal details. Historical exposure cannot be undone by deleting a current file.

**Deliverables:** truthful landing copy; a real README with prerequisites, supported paths, account requirements, exact commands, expected output, limitations, and troubleshooting; verified install-source instructions. Choose and prepare a versioned release with checksums. Do not invent a pip or brew package that does not exist.

**Gate:** no private credentials delivered to the browser; no unsupported public claims; a new tester can identify exactly what to install and what it does.

### Days 3–5 — Verify the agent's first closed loop

**Builder:** connect the chosen real provider/host; finish the path from intent → measured capacity → validated plan → approval → bounded inference execution → read-back. Validate model input, allowed actions, cancellation, timeout, retry safety, and audit records. Keep free monitoring separate from paid execution.

**Founder:** provide an accessible GPU account/host and a bounded test budget through secure connection/setup forms, not chat.

**Gate:** a real signed-in pilot user runs a supported task and sees its actual output and GPU telemetry. Job cost is calculated from documented billing inputs; if it is estimated, label it estimated. Usage alone is not evidence of financial savings.

CPU/demo mode must show its limitations and never pass this real-GPU gate.

### Days 6–8 — Billing, isolation, and operational readiness

**Builder:** enforce free monitoring limits and paid execution permissions across all access paths; test account isolation, secret protection, setup-code expiry, and failed/expired connections. Verify subscription-to-entitlement mapping without permissive defaults. Exercise checkout, webhook handling, cancellation, and entitlement read-back; confirm live settings before accepting money.

**Founder:** approve paid pilot terms, privacy policy, and terms of service; disclose credential handling and data retention. No model training on customer prompts or telemetry by default.

**Deliverables:** account deletion/disconnection path with credential revocation behavior, useful support contact, operational error alerts, and a rollback/runbook for the gateway and release.

**Gate:** two users cannot read or act on one another's resources; free users cannot bypass limits; an authorized payment updates access correctly. A customer can revoke a connection without its credentials being exposed.

### Days 9–11 — Assisted pilots

Recruit 3–5 small AI teams with existing GPUs. Observe onboarding rather than give them a scripted tour. Record connection failures, time to first verified result, approved jobs, errors, repeat usage, and actual willingness to pay.

**Gate:** three independent teams complete onboarding and see a real result; at least one confirms paid-pilot interest. Initial target: first verified inventory within ten minutes after prerequisites are met. Keep this an internal target, not a public guarantee.

### Days 12–14 — Evidence-led launch

Record a 90-second demo using real results. Prepare one launch post, supported-provider list, limitations, pricing, and support instructions. Publish a versioned release only after the applicable gates pass. Share with targeted AI/provider communities, Show HN, and X in accordance with community rules.

**Launch label:** early access. Do not announce universal support, certified compliance, or utilization/savings percentages without supporting evidence.

## 6. Technical implementation and verification

- Preserve the authenticated gateway as the only privileged execution authority. Do not place gateway credentials on nodes or in browser code.
- Scope capacity, plans, jobs, telemetry, and provider connections to the requesting user/workspace. Do not assume gateway-wide metrics are safe to expose to every customer.
- Treat provider inventory validation, GPU telemetry, and job execution as separate capabilities; expose only those tested for the selected launch integration.
- Review synthetic telemetry/static agents and ensure they cannot appear as live customer state.
- Add focused tests for one free GPU, upgrade behavior on the second GPU, free execution denial, paid authorization, cross-user denial, and expired one-time enrollment codes.
- Run existing provider and gateway tests, add CI for supported paths, then verify the signed-in first-run and payment flows through the UI. Source inspection or a green build alone is not acceptance.
- Retain plan/job IDs, approvals, state transitions, outcomes, and metric timestamps so the agent's claims can be audited.

## 7. Decision and immediate next step

**Launch the smallest honest agent-assisted product, not the entire photonic vision.**

First implementation milestone: credential triage, truthful public copy, and a working quickstart. In parallel, secure access to one real GPU so the agent loop can be proven. No infrastructure deployment or public publishing is performed by approving this planning document alone.

**Current external blockers:** a testable GPU/provider account and budget; issuer-side credential rotations where needed; founder-approved license/legal details; successful live billing verification before paid public launch.