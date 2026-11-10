#!/usr/bin/env python3
"""LightOS Baseline Sidecar — measure before optimize.

One file, Python 3 standard library only, no root, no vendor account.
Samples every GPU visible to nvidia-smi and prints a baseline utilization
and stall record with the config and versions hashed into the report.

Usage:
  python3 lightos-baseline.py                 # 60s baseline, 1s interval
  python3 lightos-baseline.py --seconds 300   # longer window
  python3 lightos-baseline.py --json out.json # also write machine-readable report

The tool only reads. It never installs drivers, never escalates privileges,
and never sends data anywhere. The printed SHA-256 fingerprint lets a buyer
prove which config produced which numbers.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import platform
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone

TOOL_VERSION = "0.1.0"


def run(cmd: list[str], timeout: int = 15) -> str | None:
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return out.stdout if out.returncode == 0 else None
    except (OSError, subprocess.TimeoutExpired):
        return None


def gpu_inventory() -> list[dict]:
    q = run([
        "nvidia-smi",
        "--query-gpu=index,name,driver_version,memory.total,pci.bus_id",
        "--format=csv,noheader,nounits",
    ])
    if not q:
        return []
    gpus = []
    for line in q.strip().splitlines():
        parts = [p.strip() for p in line.split(",")]
        if len(parts) >= 5:
            gpus.append({
                "index": parts[0],
                "name": parts[1],
                "driver_version": parts[2],
                "memory_total_mib": parts[3],
                "pci_bus_id": parts[4],
            })
    return gpus


def cuda_version() -> str | None:
    out = run(["nvidia-smi"])
    if out:
        for line in out.splitlines():
            if "CUDA Version:" in line:
                return line.split("CUDA Version:")[1].split("|")[0].strip()
    return None


STACK_PROBE = r"""
import json
out = {}
try:
    import torch
    out["pytorch"] = torch.__version__
    out["pytorch_cuda"] = getattr(torch.version, "cuda", None)
    out["pytorch_cuda_available"] = bool(torch.cuda.is_available())
    try:
        v = torch.backends.cudnn.version()
        out["cudnn"] = str(v) if v else None
    except Exception:
        out["cudnn"] = None
except Exception:
    out["pytorch"] = None
try:
    import tensorflow as tf
    out["tensorflow"] = tf.__version__
except Exception:
    out["tensorflow"] = None
print(json.dumps(out))
"""


def software_stack() -> dict:
    """Read-only check of the AI software stack. Missing pieces are reported as null."""
    stack: dict = {"nvcc": None}
    nvcc = run(["nvcc", "--version"]) if shutil.which("nvcc") else None
    if nvcc:
        for line in nvcc.splitlines():
            if "release" in line:
                stack["nvcc"] = line.split("release")[1].split(",")[0].strip()
    probe = run([sys.executable, "-c", STACK_PROBE], timeout=60)
    try:
        stack.update(json.loads(probe.strip().splitlines()[-1]) if probe else {})
    except (ValueError, IndexError):
        pass
    for key in ("pytorch", "pytorch_cuda", "cudnn", "tensorflow"):
        stack.setdefault(key, None)
    return stack


def sample_once() -> list[dict] | None:
    q = run([
        "nvidia-smi",
        "--query-gpu=index,utilization.gpu,utilization.memory,memory.used,"
        "power.draw,temperature.gpu,clocks.sm,clocks.mem",
        "--format=csv,noheader,nounits",
    ])
    if not q:
        return None
    rows = []
    for line in q.strip().splitlines():
        parts = [p.strip() for p in line.split(",")]
        if len(parts) >= 8:
            rows.append({
                "index": parts[0],
                "gpu_util_pct": float(parts[1]),
                "mem_util_pct": float(parts[2]),
                "mem_used_mib": float(parts[3]),
                "power_w": float(parts[4]),
                "temp_c": float(parts[5]),
                "sm_clock_mhz": float(parts[6]),
                "mem_clock_mhz": float(parts[7]),
            })
    return rows


def throttle_snapshot() -> dict[str, list[str]]:
    """Active clock-throttle (stall) reasons per GPU, via nvidia-smi -q."""
    out = run(["nvidia-smi", "-q", "-d", "PERFORMANCE"])
    reasons: dict[str, list[str]] = {}
    if not out:
        return reasons
    current_gpu = None
    in_throttle = False
    for line in out.splitlines():
        s = line.strip()
        if s.startswith("GPU ") and ":" in s:
            current_gpu = s[len("GPU "):].strip()
            in_throttle = False
        elif "Clocks Event Reasons" in s or "Clocks Throttle Reasons" in s:
            in_throttle = True
        elif in_throttle and current_gpu is not None:
            if s.endswith(": Active"):
                reasons.setdefault(current_gpu, []).append(s.split(":")[0].strip())
            elif s and not s.startswith(("SW Power Cap", "HW ", "Sync Boost")) and ":" not in s:
                in_throttle = False
    return reasons


def percentile(values: list[float], pct: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    k = (len(ordered) - 1) * (pct / 100.0)
    lo, hi = int(k), min(int(k) + 1, len(ordered) - 1)
    return ordered[lo] + (ordered[hi] - ordered[lo]) * (k - lo)


def summarize(samples: list[list[dict]]) -> list[dict]:
    by_gpu: dict[str, list[dict]] = {}
    for snap in samples:
        for row in snap:
            by_gpu.setdefault(row["index"], []).append(row)
    summary = []
    for idx, rows in sorted(by_gpu.items()):
        def col(name: str) -> list[float]:
            return [r[name] for r in rows]

        gpu_util = col("gpu_util_pct")
        mem_used = col("mem_used_mib")
        summary.append({
            "index": idx,
            "samples": len(rows),
            "gpu_util_avg_pct": round(sum(gpu_util) / len(gpu_util), 1),
            "gpu_util_p95_pct": round(percentile(gpu_util, 95), 1),
            "mem_util_avg_pct": round(sum(col("mem_util_pct")) / len(rows), 1),
            "mem_used_peak_mib": round(max(mem_used), 1),
            "power_avg_w": round(sum(col("power_w")) / len(rows), 1),
            "temp_max_c": round(max(col("temp_c")), 1),
            "sm_clock_min_mhz": round(min(col("sm_clock_mhz")), 1),
        })
    return summary


def build_report(args: argparse.Namespace) -> dict:
    gpus = gpu_inventory()
    report: dict = {
        "tool": "lightos-baseline",
        "tool_version": TOOL_VERSION,
        "started_utc": datetime.now(timezone.utc).isoformat(),
        "host": {
            "platform": platform.platform(),
            "kernel": platform.release(),
            "python": platform.python_version(),
        },
        "gpus": gpus,
        "cuda_version": cuda_version(),
        "software_stack": software_stack(),
    }
    if not gpus:
        report["status"] = "no_gpu_visible"
        report["reason"] = (
            "nvidia-smi reported no GPUs. Run this on a GPU host with the "
            "NVIDIA driver installed; the report never fabricates numbers."
        )
        return report

    samples: list[list[dict]] = []
    stall_events: dict[str, set[str]] = {}
    deadline = time.monotonic() + args.seconds
    while True:
        snap = sample_once()
        if snap:
            samples.append(snap)
        for idx, reasons in throttle_snapshot().items():
            stall_events.setdefault(idx, set()).update(reasons)
        if time.monotonic() >= deadline:
            break
        time.sleep(args.interval)

    report["window"] = {
        "requested_seconds": args.seconds,
        "interval_seconds": args.interval,
        "samples_taken": len(samples),
    }
    report["utilization"] = summarize(samples)
    report["stall_record"] = {
        idx: sorted(reasons) for idx, reasons in sorted(stall_events.items())
    }
    report["status"] = "ok" if samples else "sampling_failed"

    fingerprint_src = json.dumps({
        "tool_version": TOOL_VERSION,
        "gpus": gpus,
        "cuda_version": report["cuda_version"],
        "software_stack": report["software_stack"],
        "host": report["host"],
        "window": report["window"],
    }, sort_keys=True)
    report["config_sha256"] = hashlib.sha256(fingerprint_src.encode()).hexdigest()
    return report


def print_human(report: dict) -> None:
    print("=" * 64)
    print(f"LightOS Baseline v{report['tool_version']} — {report['started_utc']}")
    print("=" * 64)
    s = report.get("software_stack") or {}
    fmt = lambda v: v if v else "not found"
    print(f"Stack: CUDA toolkit (nvcc) {fmt(s.get('nvcc'))} | PyTorch {fmt(s.get('pytorch'))}"
          f" (CUDA {fmt(s.get('pytorch_cuda'))}) | cuDNN {fmt(s.get('cudnn'))} | TensorFlow {fmt(s.get('tensorflow'))}")
    if report["status"] != "ok":
        print(f"STATUS: {report['status']}")
        if report.get("reason"):
            print(report["reason"])
        return
    print(f"GPUs: {len(report['gpus'])}  CUDA: {report.get('cuda_version') or 'unknown'}")
    for g in report["gpus"]:
        print(f"  [{g['index']}] {g['name']}  {g['memory_total_mib']} MiB  driver {g['driver_version']}")
    w = report["window"]
    print(f"\nWindow: {w['samples_taken']} samples over ~{w['requested_seconds']}s\n")
    print(f"{'GPU':<5}{'util avg':>9}{'util p95':>10}{'mem peak MiB':>14}{'power avg W':>13}{'temp max C':>12}")
    for u in report["utilization"]:
        print(f"{u['index']:<5}{u['gpu_util_avg_pct']:>9}{u['gpu_util_p95_pct']:>10}"
              f"{u['mem_used_peak_mib']:>14}{u['power_avg_w']:>13}{u['temp_max_c']:>12}")
    stalls = report.get("stall_record", {})
    print("\nStall record (clock-throttle reasons seen):")
    if stalls:
        for idx, reasons in stalls.items():
            print(f"  GPU {idx}: {', '.join(reasons)}")
    else:
        print("  none observed")
    print(f"\nConfig fingerprint (SHA-256): {report['config_sha256']}")
    print("Share this fingerprint with any numbers you quote from this report.")


def main() -> int:
    parser = argparse.ArgumentParser(description="LightOS baseline sidecar")
    parser.add_argument("--seconds", type=int, default=60, help="sampling window (default 60)")
    parser.add_argument("--interval", type=float, default=1.0, help="seconds between samples")
    parser.add_argument("--json", metavar="PATH", help="also write the report as JSON")
    args = parser.parse_args()

    if not shutil.which("nvidia-smi"):
        print("STATUS: no_nvidia_smi")
        print("nvidia-smi is not on PATH. Install the NVIDIA driver first; "
              "this tool never installs anything itself.")
        return 2

    report = build_report(args)
    print_human(report)
    if args.json:
        with open(args.json, "w") as f:
            json.dump(report, f, indent=2)
        print(f"\nJSON report written to {args.json}")
    return 0 if report["status"] == "ok" else 1


if __name__ == "__main__":
    sys.exit(main())
