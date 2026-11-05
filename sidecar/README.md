# LightOS Baseline Sidecar

Measure before optimize. One command, no root, no vendor account, works on a
machine you don't own. The sidecar only **reads** GPU state — it never
installs drivers, never escalates privileges, and never sends data anywhere.

## One-command install

```bash
curl -fsSL https://agentic.lightos.sh/sidecar/install.sh | bash
```

This drops a single Python file into `~/.lightos/bin` (user-writable) and runs
a 60-second baseline immediately.

## What you get

A printed baseline for every GPU on the host:

- utilization average and p95, memory peak, average power, max temperature
- a **stall record**: clock-throttle reasons observed during the window
- a **SHA-256 config fingerprint** over GPU model/count, driver, CUDA
  version, OS kernel, tool version, and sampling window — so any number you
  quote is provably tied to the config that produced it

A machine-readable copy is written to `~/.lightos/bin/last-baseline.json`.

## Options

```bash
python3 ~/.lightos/bin/lightos-baseline --seconds 300 --interval 1 --json report.json
LIGHTOS_BASELINE_SECONDS=300 curl -fsSL .../install.sh | bash
```

## Honest failure

If no GPU or driver is visible, the report says so (`no_gpu_visible` /
`no_nvidia_smi`) and exits non-zero. It never fabricates numbers.

## Multi-node (e.g. the 16-GPU InfiniBand pilot)

Run the same one command on each node. Each node produces its own
fingerprinted report; compare fingerprints to confirm both nodes ran the same
config before comparing numbers.
