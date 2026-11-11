# Roadmap

- [ ] Lambda-style GPU Cloud features, admin signups, CEO welcome letter
  - [x] GPU Cloud page: GPU lineup with published prices, one-command environment check (now reports CUDA toolkit, PyTorch, cuDNN, TensorFlow), on-demand/cluster/private planning, working inference chat with token counts (verified signed in)
  - [x] CEO welcome letter shown once to every account, re-readable from the menu (verified signed in)
  - [x] Admin Signups page (counts, 30-day chart, search, CSV export) with admin-only access to all profiles
  - [x] Admin set to bola.olatunji@gmail.com; Signups page verified signed in as admin (fixed admin area hanging on load)
  - [ ] Replace draft CEO letter wording with the approved version (needs the CEO's text)

- [ ] No-GPU internal engine (user chose all three)
  - [ ] AI planning assistant on built-in Cloud AI models (signed-in, no hardware)
  - [ ] Own small model on a regular CPU server (gateway Compose profile, OpenAI-compatible)
  - [ ] In-browser model running on the visitor's device
- [ ] Build GPU engine on Brev, connect it in GPU Setup, confirm real RDMA Traces readings (blocked: Brev account has no credits — rental of Crusoe 8× A100 IB failed "Credits are exhausted"; nothing was charged)
- [ ] Free telemetry path: run the existing FastAPI gateway on a user-owned NVIDIA machine + free Cloudflare quick tunnel (waiting on user's own GPU machine; no paid rentals)
- [ ] Resell GPU compute: customers book and pay LightOS; LightOS rents on its own provider account (needs provider resale permission, markup/pricing, refund terms)
- [x] Remove the unwanted signup account and its records (deleted Nov 11)
- [ ] RDMA Traces dashboard page: deploy rdma-telemetry, page + navigation, signed-in test (real numbers need a connected RDMA host)

- [x] Compute Exchange backend: catalog table (published list prices, source-labeled), owner-scoped workload plans + events, exchange-api function (server-side eligibility, estimates, idempotent plan records, cancel; no provisioning). Verified signed-in: catalog → approve plan → workload listed → costs page.
- [ ] Host website and GPU services on Brev; keep accounts and billing on Cloud
  - [x] Explain safe command sharing using secret-name references and secure key entry
  - [ ] Review user-provided Brev commands without embedded credentials (waiting for commands)
  - [x] Prepare isolated static-website container and separate tunnel instructions
  - [ ] Verify authorized Brev VM execution access (API-key capability unverified)
  - [ ] Run deployment and confirm website plus measured GPU readings
  - [x] Package optional NVIDIA NIM endpoint with host-only NGC login, private networking, GPU preflight and readiness checks
  - [ ] Run NIM on the supported Brev GPU and verify readiness, a real inference response and measured readings (needs the user's host and NGC key)
  - [ ] Verify stable-origin auth/billing, Free limits, and domain cutover before launch

- [ ] Verify Brev readings before republishing the one-GPU Free release
  - [x] Reject additional Free GPU connections across connection/enrollment paths (runtime-connect refuses over-limit hosts before saving; node-enroll skips gateway forwarding with upgrade_required; 23 tests pass)
  - [ ] Confirm measured readings in the requesting user's dashboard (currently no GPU host is connected)
  - [ ] Check security scan and republish only after live readings and connection enforcement are verified

- [ ] Restore account-safe Agents, LLM Serving, and Thermal views
  - [x] Owner-scoped operational reads, linked-log access, and legacy privacy
  - [x] Clear empty/unavailable states and account gateway monitoring; no unsupported hardware success
  - [x] 22 regression tests and signed-in legacy read denial / deployment write denial
  - [ ] Full two-customer/admin ownership read-back (needs a test connection permitted to assume authenticated role or approved test accounts)
  - [ ] Real GPU action read-back (requires a running gateway supporting the action)

- [ ] Free-tier onboarding end to end: sign up → connect GPU → live dashboard → second-GPU upgrade prompt
  - [x] Build account signup → dedicated GPU connection form → measured dashboard; server one-GPU filtering and free execution denial
  - [x] Test owned-resource lookup, encrypted owner-bound credentials, second-GPU limits, and signed-in private-address rejection
  - [ ] Verify completed email-confirmed signup and successful real GPU connection (needs running Brev host)
  - [ ] Activate updated external MCP access safeguards (needs republish)
  - [ ] Connect the running Brev address/token securely and confirm measured dashboard numbers (needs running Brev GPU)

- [ ] Evidence-led early-access launch
  - [ ] Credential triage, honest public copy, working quickstart, CI
  - [ ] Real agent loop: capacity → plan → approval → inference → read-back (needs accessible GPU account/host and budget)
  - [ ] Server-side free-plan enforcement, account isolation, live billing verification
  - [ ] License, legal pages, support contact (needs founder-approved details)
  - [ ] Assisted pilots, real demo, versioned release (needs pilot users and release authorization)

- [ ] Real GPU usage on the dashboard via an NVIDIA Brev gateway
  - [x] Gateway source in `gateway/` (NVML/DCGM telemetry, auth, register, jobs, tests)
  - [x] Docker + Cloudflare tunnel packaging and Brev README
  - [x] Brev quick start + Test connection on Gateway Setup; telemetry source in live panel
  - [ ] Run `docker compose up -d` on a Brev instance (needs the user's Brev account)
  - [ ] Save the tunnel URL and token in Gateway Setup's account-specific connection form, then verify the live panel
- Modal gateway stays a CPU-only fallback (GPU billing declined)

- [ ] Advisor direction (Boardy, Nov 2026)
  - [x] One-command, no-root, no-vendor-account installer that works on a machine we don't own (`sidecar/install.sh`, served at /sidecar/install.sh)
  - [x] Baseline-first sidecar: prints utilization + stall record for any cluster, with config and versions hashed into the report (`sidecar/lightos-baseline.py`; tested no-GPU honesty + simulated 2-GPU report)
  - [x] Remove scheduling/routing positioning from home page hero animation (now Measure → Diagnose); remaining in-app demos untouched (competes with free NVIDIA Run:ai/KAI per advisor; claim unverified by us)
  - [ ] Fail-safe design: unmodelable collectives pass through untouched; kill switch restores original path mid-run
  - [ ] Named pilot: two rented 8-GPU InfiniBand nodes (16 GPUs), nccl-tests AllReduce + profiled 7B FSDP step, 2h planned window (not a measured runtime)
