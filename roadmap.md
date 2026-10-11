# Roadmap

- [ ] Real GPU usage on the dashboard via an NVIDIA Brev gateway
  - [x] Gateway source in `gateway/` (NVML/DCGM telemetry, auth, register, jobs, tests)
  - [x] Docker + Cloudflare tunnel packaging and Brev README
  - [x] Brev quick start + Test connection on Gateway Setup; telemetry source in live panel
  - [ ] Run `docker compose up -d` on a Brev instance (needs the user's Brev account)
  - [ ] Save the tunnel URL and token in the app's secret form, then verify the live panel
- Modal gateway stays a CPU-only fallback (GPU billing declined)
