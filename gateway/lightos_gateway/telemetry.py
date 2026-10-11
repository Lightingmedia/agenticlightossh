"""GPU readers and the 1-hour sample ring buffer.

Readers return measured values only. When nothing can be measured they return an empty list
and expose a machine-readable ``reason``; callers must never fill the gap with invented numbers.
"""
from __future__ import annotations

import os
import threading
import time
import urllib.request
from collections import deque
from dataclasses import dataclass, field
from typing import Deque, Dict, List, Optional, Protocol, Tuple

SAMPLE_INTERVAL_S = 5.0
RING_SECONDS = 3600


@dataclass
class GpuSample:
    uuid: str
    name: str
    util: Optional[float] = None       # %
    power: Optional[float] = None      # W
    mem_used: Optional[float] = None   # MiB
    mem_total: Optional[float] = None  # MiB
    temp: Optional[float] = None       # C
    has_process: bool = False


@dataclass
class StaticInfo:
    driver: Optional[str] = None
    cuda: Optional[str] = None
    extra: Dict[str, str] = field(default_factory=dict)


class Provider(Protocol):
    source: str                 # "dcgm" | "nvml" | "none"
    reason: Optional[str]       # set when no GPU data is available

    def sample(self) -> List[GpuSample]: ...
    def static(self) -> StaticInfo: ...


class NoGpuProvider:
    source = "none"

    def __init__(self, reason: str):
        self.reason = reason

    def sample(self) -> List[GpuSample]:
        return []

    def static(self) -> StaticInfo:
        return StaticInfo()


def _num(fn, *a):
    try:
        return float(fn(*a))
    except Exception:
        return None


class NvmlProvider:
    """NVIDIA Management Library via ``nvidia-ml-py`` (module ``pynvml``)."""

    source = "nvml"

    def __init__(self, nvml=None):
        if nvml is None:
            import pynvml as nvml  # type: ignore
        self.nv = nvml
        self.nv.nvmlInit()
        self.reason: Optional[str] = None
        if self.nv.nvmlDeviceGetCount() == 0:
            self.reason = "no_gpu_visible"

    @staticmethod
    def _s(v) -> str:
        return v.decode() if isinstance(v, bytes) else str(v)

    def sample(self) -> List[GpuSample]:
        nv = self.nv
        out: List[GpuSample] = []
        for i in range(nv.nvmlDeviceGetCount()):
            h = nv.nvmlDeviceGetHandleByIndex(i)
            mem = None
            try:
                mem = nv.nvmlDeviceGetMemoryInfo(h)
            except Exception:
                pass
            util = None
            try:
                util = float(nv.nvmlDeviceGetUtilizationRates(h).gpu)
            except Exception:
                pass
            power = _num(nv.nvmlDeviceGetPowerUsage, h)
            procs = False
            try:
                procs = len(nv.nvmlDeviceGetComputeRunningProcesses(h)) > 0
            except Exception:
                pass
            out.append(GpuSample(
                uuid=self._s(nv.nvmlDeviceGetUUID(h)),
                name=self._s(nv.nvmlDeviceGetName(h)),
                util=util,
                power=power / 1000.0 if power is not None else None,  # mW -> W
                mem_used=mem.used / 1048576 if mem else None,
                mem_total=mem.total / 1048576 if mem else None,
                temp=_num(nv.nvmlDeviceGetTemperature, h, getattr(nv, "NVML_TEMPERATURE_GPU", 0)),
                has_process=procs,
            ))
        self.reason = None if out else "no_gpu_visible"
        return out

    def static(self) -> StaticInfo:
        info = StaticInfo()
        try:
            info.driver = self._s(self.nv.nvmlSystemGetDriverVersion())
        except Exception:
            pass
        try:
            v = int(self.nv.nvmlSystemGetCudaDriverVersion())
            info.cuda = f"{v // 1000}.{(v % 1000) // 10}"
        except Exception:
            pass
        return info


def parse_prometheus(text: str) -> List[Tuple[str, Dict[str, str], float]]:
    rows = []
    for line in text.splitlines():
        if not line or line.startswith("#"):
            continue
        try:
            head, value = line.rsplit(" ", 1)
            val = float(value)
        except ValueError:
            continue
        labels: Dict[str, str] = {}
        name = head
        if "{" in head:
            name, rest = head.split("{", 1)
            for part in rest.rstrip("}").split('",'):
                if "=" in part:
                    k, v = part.split("=", 1)
                    labels[k.strip()] = v.strip().strip('"')
        rows.append((name, labels, val))
    return rows


class DcgmExporterProvider:
    """Scrapes a dcgm-exporter ``/metrics`` endpoint. NVML (if given) adds the running-process check."""

    source = "dcgm"
    FIELDS = {
        "DCGM_FI_DEV_GPU_UTIL": "util", "DCGM_FI_DEV_POWER_USAGE": "power",
        "DCGM_FI_DEV_FB_USED": "mem_used", "DCGM_FI_DEV_GPU_TEMP": "temp",
    }

    def __init__(self, url: str, nvml: Optional[NvmlProvider] = None, fetch=None):
        self.url = url
        self.nvml = nvml
        self.reason: Optional[str] = None
        self._fetch = fetch or (lambda u: urllib.request.urlopen(u, timeout=3).read().decode())
        self.sample()  # raises if the exporter is unreachable -> caller falls back to NVML

    def sample(self) -> List[GpuSample]:
        rows = parse_prometheus(self._fetch(self.url))
        by: Dict[str, GpuSample] = {}
        free: Dict[str, float] = {}
        for name, labels, val in rows:
            uid = labels.get("UUID")
            if not uid:
                continue
            g = by.setdefault(uid, GpuSample(uuid=uid, name=labels.get("modelName", "GPU")))
            if name in self.FIELDS:
                setattr(g, self.FIELDS[name], val)
            elif name == "DCGM_FI_DEV_FB_FREE":
                free[uid] = val
        for uid, g in by.items():
            if g.mem_used is not None and uid in free:
                g.mem_total = g.mem_used + free[uid]
        if self.nvml:
            try:
                procs = {s.uuid: s for s in self.nvml.sample()}
                for uid, g in by.items():
                    if uid in procs:
                        g.has_process = procs[uid].has_process
                        g.mem_total = g.mem_total or procs[uid].mem_total
            except Exception:
                pass
        out = list(by.values())
        self.reason = None if out else "no_gpu_visible"
        return out

    def static(self) -> StaticInfo:
        return self.nvml.static() if self.nvml else StaticInfo()


def detect_provider() -> Provider:
    nvml: Optional[NvmlProvider] = None
    nvml_error = "nvml_unavailable"
    try:
        nvml = NvmlProvider()
    except Exception:
        nvml = None
    url = os.environ.get("DCGM_EXPORTER_URL", "").strip()
    if url:
        try:
            return DcgmExporterProvider(url, nvml)
        except Exception:
            pass  # exporter not up: use NVML
    if nvml is not None:
        return nvml
    return NoGpuProvider(nvml_error)


class Sampler:
    """Background sampler with a fixed-size ring buffer (1 h at 5 s)."""

    def __init__(self, provider: Provider, interval: float = SAMPLE_INTERVAL_S, clock=time.time):
        self.provider = provider
        self.interval = interval
        self.clock = clock
        self.buf: Deque[Tuple[float, List[GpuSample]]] = deque(maxlen=int(RING_SECONDS / interval))
        self.errors: Deque[dict] = deque(maxlen=200)
        self._stop = threading.Event()

    def tick(self) -> None:
        try:
            self.buf.append((self.clock(), self.provider.sample()))
        except Exception as e:  # keep running; record the failure as an event
            self.errors.append({"ts": self.clock(), "type": "telemetry_error", "message": str(e)[:200]})

    def start(self) -> None:
        self.tick()
        threading.Thread(target=self._run, daemon=True).start()

    def _run(self) -> None:
        while not self._stop.wait(self.interval):
            self.tick()

    def stop(self) -> None:
        self._stop.set()

    def window(self, seconds: int) -> List[Tuple[float, List[GpuSample]]]:
        cutoff = self.clock() - seconds
        win = [s for s in self.buf if s[0] >= cutoff]
        return win or list(self.buf)[-1:]

    def latest(self) -> List[GpuSample]:
        return self.buf[-1][1] if self.buf else []
