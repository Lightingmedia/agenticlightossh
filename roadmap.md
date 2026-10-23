# Roadmap

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
