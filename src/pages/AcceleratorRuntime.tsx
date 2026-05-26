import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cpu,
  Layers,
  Zap,
  MemoryStick,
  GitBranch,
  Play,
  Code2,
  Terminal,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Box,
  ArrowRight,
  ArrowDown,
  Wifi,
  HardDrive,
} from "lucide-react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";

// ─── Types ───────────────────────────────────────────────────────────────────
type Backend = "auto" | "cuda" | "hip";
type LogType = "info" | "success" | "warning" | "error";

interface KernelEvent {
  id: number;
  time: string;
  kernel: string;
  grid: string;
  block: string;
  stream: string;
  latencyUs: number;
  backend: "CUDA" | "HIP";
}

interface MemBuffer {
  id: string;
  label: string;
  sizeGb: number;
  type: "device" | "host-pinned" | "managed";
  backend: "CUDA" | "HIP";
}

interface EventLog {
  id: number;
  time: string;
  module: string;
  message: string;
  type: LogType;
}

// ─── Mock data ────────────────────────────────────────────────────────────────
const NVIDIA_DEVICE = {
  id: 0,
  name: "NVIDIA H100 SXM5",
  backend: "CUDA" as const,
  vramGb: 80,
  usedGb: 52.4,
  computeCap: "9.0",
  tflops: 3958,
  tempC: 74,
  clockMhz: 1980,
  status: "active" as const,
  color: "#10b981",
};

const AMD_DEVICE = {
  id: 1,
  name: "AMD Instinct MI300X",
  backend: "HIP" as const,
  vramGb: 192,
  usedGb: 118.2,
  computeCap: "gfx942",
  tflops: 5220,
  tempC: 68,
  clockMhz: 2100,
  status: "standby" as const,
  color: "#f59e0b",
};

const CODE_FILES: Record<string, { lang: string; code: string }> = {
  "gpu_backend.h": {
    lang: "cpp",
    code: `#pragma once
#include <cstddef>
#include <memory>
#include <string>
#include <vector>

enum class GpuKind { Auto, Cuda, Hip };

struct DeviceInfo {
    int id;
    std::string name;
    size_t total_memory;
    int major;
    int minor;
};

class IGpuBackend {
public:
    virtual ~IGpuBackend() = default;
    virtual std::vector<DeviceInfo> list_devices() = 0;
    virtual void set_device(int device_id) = 0;
    virtual void* malloc(size_t bytes) = 0;
    virtual void free(void* ptr) = 0;
    virtual void memcpy_host_to_device(
        void* dst, const void* src, size_t bytes) = 0;
    virtual void memcpy_device_to_host(
        void* dst, const void* src, size_t bytes) = 0;
    virtual void* create_stream() = 0;
    virtual void destroy_stream(void* stream) = 0;
    virtual void synchronize_stream(void* stream) = 0;
    virtual void launch_add_kernel(
        const float* a, const float* b,
        float* c, size_t n, void* stream) = 0;
};

std::unique_ptr<IGpuBackend> create_gpu_backend(GpuKind kind);`,
  },
  "gpu_kernels.h": {
    lang: "cpp",
    code: `#pragma once
#include <cstddef>

#if defined(USE_CUDA)
#include <cuda_runtime.h>
#define GPU_STREAM  cudaStream_t
#define GPU_LAUNCH(kernel, grid, block, shared, stream, ...)  \\
    kernel<<<grid, block, shared, stream>>>(__VA_ARGS__)
#define GPU_GET_LAST_ERROR  cudaGetLastError()
#define GPU_GLOBAL  __global__

#elif defined(USE_HIP)
#include <hip/hip_runtime.h>
#define GPU_STREAM  hipStream_t
#define GPU_LAUNCH(kernel, grid, block, shared, stream, ...)  \\
    hipLaunchKernelGGL(kernel, grid, block, shared, stream, __VA_ARGS__)
#define GPU_GET_LAST_ERROR  hipGetLastError()
#define GPU_GLOBAL  __global__

#else
#error "Define USE_CUDA or USE_HIP"
#endif

/* ── Shared kernel — compiled by both nvcc and hipcc ── */
GPU_GLOBAL void add_kernel(
    const float* a, const float* b, float* c, size_t n)
{
    size_t i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i < n) c[i] = a[i] + b[i];
}`,
  },
  "cuda_backend.cpp": {
    lang: "cpp",
    code: `#include "gpu_backend.h"
#define USE_CUDA
#include "gpu_kernels.h"
#include <cuda_runtime.h>
#include <stdexcept>

#define CHK(call, name) \\
    do { if (auto err = (call); err != cudaSuccess) \\
        throw std::runtime_error(std::string(name) + \\
            ": " + cudaGetErrorString(err)); } while(0)

class CudaBackend final : public IGpuBackend {
public:
    std::vector<DeviceInfo> list_devices() override {
        int n = 0;  CHK(cudaGetDeviceCount(&n), "GetCount");
        std::vector<DeviceInfo> out;
        for (int i = 0; i < n; ++i) {
            cudaDeviceProp p{};
            CHK(cudaGetDeviceProperties(&p, i), "GetProps");
            out.push_back({i, p.name, p.totalGlobalMem,
                           p.major, p.minor});
        }
        return out;
    }
    void set_device(int id) override {
        CHK(cudaSetDevice(id), "SetDevice");
    }
    void* malloc(size_t b) override {
        void* p = nullptr;
        CHK(cudaMalloc(&p, b), "Malloc");  return p;
    }
    void free(void* p) override { CHK(cudaFree(p), "Free"); }
    void memcpy_host_to_device(void* d, const void* s, size_t b) override {
        CHK(cudaMemcpy(d, s, b, cudaMemcpyHostToDevice), "H2D");
    }
    void memcpy_device_to_host(void* d, const void* s, size_t b) override {
        CHK(cudaMemcpy(d, s, b, cudaMemcpyDeviceToHost), "D2H");
    }
    void* create_stream() override {
        cudaStream_t s{};
        CHK(cudaStreamCreate(&s), "StreamCreate");
        return reinterpret_cast<void*>(s);
    }
    void destroy_stream(void* s) override {
        CHK(cudaStreamDestroy((cudaStream_t)s), "StreamDestroy");
    }
    void synchronize_stream(void* s) override {
        CHK(cudaStreamSynchronize((cudaStream_t)s), "StreamSync");
    }
    void launch_add_kernel(const float* a, const float* b,
                           float* c, size_t n, void* s) override {
        constexpr int blk = 256;
        int grd = (n + blk - 1) / blk;
        GPU_LAUNCH(add_kernel, dim3(grd), dim3(blk), 0,
                   (cudaStream_t)s, a, b, c, n);
        CHK(cudaGetLastError(), "KernelLaunch");
    }
};
std::unique_ptr<IGpuBackend> create_gpu_backend_cuda() {
    return std::make_unique<CudaBackend>();
}`,
  },
  "hip_backend.cpp": {
    lang: "cpp",
    code: `#include "gpu_backend.h"
#define USE_HIP
#include "gpu_kernels.h"
#include <hip/hip_runtime.h>
#include <stdexcept>

#define CHK(call, name) \\
    do { if (auto err = (call); err != hipSuccess) \\
        throw std::runtime_error(std::string(name) + \\
            ": " + hipGetErrorString(err)); } while(0)

class HipBackend final : public IGpuBackend {
public:
    std::vector<DeviceInfo> list_devices() override {
        int n = 0;  CHK(hipGetDeviceCount(&n), "GetCount");
        std::vector<DeviceInfo> out;
        for (int i = 0; i < n; ++i) {
            hipDeviceProp_t p{};
            CHK(hipGetDeviceProperties(&p, i), "GetProps");
            out.push_back({i, p.name, p.totalGlobalMem,
                           p.major, p.minor});
        }
        return out;
    }
    void set_device(int id) override {
        CHK(hipSetDevice(id), "SetDevice");
    }
    void* malloc(size_t b) override {
        void* p = nullptr;
        CHK(hipMalloc(&p, b), "Malloc");  return p;
    }
    void free(void* p) override { CHK(hipFree(p), "Free"); }
    void memcpy_host_to_device(void* d, const void* s, size_t b) override {
        CHK(hipMemcpy(d, s, b, hipMemcpyHostToDevice), "H2D");
    }
    void memcpy_device_to_host(void* d, const void* s, size_t b) override {
        CHK(hipMemcpy(d, s, b, hipMemcpyDeviceToHost), "D2H");
    }
    void* create_stream() override {
        hipStream_t s{};
        CHK(hipStreamCreate(&s), "StreamCreate");
        return reinterpret_cast<void*>(s);
    }
    void destroy_stream(void* s) override {
        CHK(hipStreamDestroy((hipStream_t)s), "StreamDestroy");
    }
    void synchronize_stream(void* s) override {
        CHK(hipStreamSynchronize((hipStream_t)s), "StreamSync");
    }
    void launch_add_kernel(const float* a, const float* b,
                           float* c, size_t n, void* s) override {
        constexpr int blk = 256;
        int grd = (n + blk - 1) / blk;
        GPU_LAUNCH(add_kernel, dim3(grd), dim3(blk), 0,
                   (hipStream_t)s, a, b, c, n);
        CHK(hipGetLastError(), "KernelLaunch");
    }
};
std::unique_ptr<IGpuBackend> create_gpu_backend_hip() {
    return std::make_unique<HipBackend>();
}`,
  },
  "CMakeLists.txt": {
    lang: "cmake",
    code: `cmake_minimum_required(VERSION 3.21)
project(lightos_gpu_hal LANGUAGES CXX)

option(USE_CUDA_BACKEND "Build CUDA backend"   ON)
option(USE_HIP_BACKEND  "Build HIP/ROCm backend" OFF)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_library(gpu_iface INTERFACE)
target_include_directories(gpu_iface INTERFACE
    \${CMAKE_SOURCE_DIR}/include)

# ── CUDA backend ─────────────────────────────────
if(USE_CUDA_BACKEND)
    enable_language(CUDA)
    find_package(CUDAToolkit REQUIRED)
    add_library(cuda_backend src/cuda_backend.cpp)
    target_link_libraries(cuda_backend PRIVATE
        gpu_iface CUDA::cudart)
    target_compile_definitions(cuda_backend PRIVATE USE_CUDA)
    set_target_properties(cuda_backend PROPERTIES
        CUDA_SEPARABLE_COMPILATION ON)
endif()

# ── HIP / ROCm backend ───────────────────────────
if(USE_HIP_BACKEND)
    enable_language(HIP)
    find_package(hip REQUIRED CONFIG)
    add_library(hip_backend src/hip_backend.cpp)
    target_link_libraries(hip_backend PRIVATE
        gpu_iface hip::host)
    target_compile_definitions(hip_backend PRIVATE USE_HIP)
    if(NOT DEFINED CMAKE_HIP_ARCHITECTURES)
        set(CMAKE_HIP_ARCHITECTURES "native" CACHE STRING "")
    endif()
endif()

# ── Main runtime executable ───────────────────────
add_executable(lightos_runtime src/main.cpp)
target_link_libraries(lightos_runtime PRIVATE gpu_iface)
if(USE_CUDA_BACKEND)
    target_compile_definitions(lightos_runtime PRIVATE
        USE_CUDA_BUILD)
    target_link_libraries(lightos_runtime PRIVATE cuda_backend)
endif()
if(USE_HIP_BACKEND)
    target_link_libraries(lightos_runtime PRIVATE hip_backend)
endif()`,
  },
  "python_wrapper.py": {
    lang: "python",
    code: `from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any
import ctypes, os, platform

# ── Public interface ──────────────────────────────────────────
@dataclass
class DeviceInfo:
    id: int
    name: str
    total_memory: int   # bytes
    major: int
    minor: int

class GpuBackend(ABC):
    @abstractmethod
    def list_devices(self) -> list[DeviceInfo]: ...

    @abstractmethod
    def set_device(self, device_id: int) -> None: ...

    @abstractmethod
    def malloc(self, nbytes: int) -> Any: ...

    @abstractmethod
    def free(self, ptr: Any) -> None: ...

    @abstractmethod
    def memcpy_h2d(self, dst: Any, src: Any,
                   nbytes: int) -> None: ...

    @abstractmethod
    def memcpy_d2h(self, dst: Any, src: Any,
                   nbytes: int) -> None: ...

    @abstractmethod
    def create_stream(self) -> Any: ...

    @abstractmethod
    def synchronize_stream(self, stream: Any) -> None: ...

    @abstractmethod
    def launch_add(self, a: Any, b: Any, c: Any,
                   n: int, stream: Any) -> None: ...

# ── Detection helpers ─────────────────────────────────────────
def _has_nvidia() -> bool:
    try:
        import pycuda.driver as cuda   # type: ignore
        cuda.init();  return cuda.Device.count() > 0
    except Exception:
        return False

def _has_amd() -> bool:
    try:
        import hip.hip as hip_rt       # type: ignore
        n = ctypes.c_int(0)
        hip_rt.hipGetDeviceCount(ctypes.byref(n))
        return n.value > 0
    except Exception:
        return False

# ── Factory ───────────────────────────────────────────────────
def create_backend(preferred: str = "auto") -> GpuBackend:
    """
    preferred: "cuda" | "hip" | "auto"
    """
    if preferred == "cuda":
        from .cuda_backend import CudaBackend
        return CudaBackend()
    if preferred == "hip":
        from .hip_backend import HipBackend
        return HipBackend()
    # Auto-detect
    if _has_nvidia():
        from .cuda_backend import CudaBackend
        return CudaBackend()
    if _has_amd():
        from .hip_backend import HipBackend
        return HipBackend()
    raise RuntimeError(
        "No supported GPU backend found. "
        "Install pycuda (NVIDIA) or hip-python (AMD).")

# ── Usage example ─────────────────────────────────────────────
if __name__ == "__main__":
    import numpy as np

    gpu = create_backend("auto")
    devs = gpu.list_devices()
    print(f"Detected: {devs[0].name}")
    gpu.set_device(0)

    n = 1 << 20
    a = np.ones(n, dtype=np.float32)
    b = np.full(n, 2.0, dtype=np.float32)
    c = np.zeros(n, dtype=np.float32)

    d_a = gpu.malloc(a.nbytes)
    d_b = gpu.malloc(b.nbytes)
    d_c = gpu.malloc(c.nbytes)

    gpu.memcpy_h2d(d_a, a.ctypes.data_as(ctypes.c_void_p), a.nbytes)
    gpu.memcpy_h2d(d_b, b.ctypes.data_as(ctypes.c_void_p), b.nbytes)

    stream = gpu.create_stream()
    gpu.launch_add(d_a, d_b, d_c, n, stream)
    gpu.synchronize_stream(stream)

    gpu.memcpy_d2h(c.ctypes.data_as(ctypes.c_void_p), d_c, c.nbytes)
    print(f"c[0] = {c[0]:.1f}")   # expected: 3.0

    gpu.free(d_a);  gpu.free(d_b);  gpu.free(d_c)`,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const now = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
};

let _kernelId = 0;
const KERNEL_NAMES = [
  "add_kernel", "matmul_fp16", "attention_fwd", "softmax_kernel",
  "layernorm_fwd", "gelu_kernel", "embedding_lookup", "reduce_sum",
];

function genKernel(backend: "CUDA" | "HIP"): KernelEvent {
  const name = KERNEL_NAMES[Math.floor(Math.random() * KERNEL_NAMES.length)];
  const grid = 2 ** Math.floor(Math.random() * 8 + 8);
  const block = [64, 128, 256, 512][Math.floor(Math.random() * 4)];
  return {
    id: ++_kernelId,
    time: now(),
    kernel: name,
    grid: `(${grid}, 1, 1)`,
    block: `(${block}, 1, 1)`,
    stream: `0x${(Math.random() * 0xffffff | 0).toString(16).padStart(6, "0")}`,
    latencyUs: Math.round(50 + Math.random() * 2800),
    backend,
  };
}

const INIT_LOGS: EventLog[] = [
  { id: 1, time: "00:00:00", module: "HAL", message: "IGpuBackend interface initialised. Scanning platform...", type: "info" },
  { id: 2, time: "00:00:01", module: "CUDA", message: "NVIDIA driver 545.29 detected. CUDAToolkit 12.3 linked.", type: "success" },
  { id: 3, time: "00:00:01", module: "CUDA", message: "Device 0: H100 SXM5 (9.0). TotalGMem: 80 GB. Active.", type: "success" },
  { id: 4, time: "00:00:02", module: "ROCm", message: "ROCm 6.1 runtime detected. HIP 6.1.40091 linked.", type: "success" },
  { id: 5, time: "00:00:02", module: "ROCm", message: "Device 1: MI300X (gfx942). TotalGMem: 192 GB. Standby.", type: "info" },
  { id: 6, time: "00:00:03", module: "HAL", message: "Auto-mode resolved → CUDA backend (primary NVIDIA device).", type: "success" },
];

const INIT_BUFFERS: MemBuffer[] = [
  { id: "buf-0", label: "Attention Key Cache",   sizeGb: 12.8, type: "device",      backend: "CUDA" },
  { id: "buf-1", label: "Embedding Table",       sizeGb: 3.2,  type: "device",      backend: "CUDA" },
  { id: "buf-2", label: "Pinned Host Staging",   sizeGb: 1.6,  type: "host-pinned", backend: "CUDA" },
  { id: "buf-3", label: "MI300X KV Store",       sizeGb: 24.0, type: "device",      backend: "HIP"  },
  { id: "buf-4", label: "Managed UVM Workspace", sizeGb: 8.0,  type: "managed",     backend: "CUDA" },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function AcceleratorRuntime() {
  const [backend, setBackend] = useState<Backend>("auto");
  const [detecting, setDetecting] = useState(false);
  const [activeFile, setActiveFile] = useState("gpu_backend.h");
  const [kernels, setKernels] = useState<KernelEvent[]>(() =>
    Array.from({ length: 6 }, (_, i) =>
      i % 2 === 0 ? genKernel("CUDA") : genKernel("HIP")
    )
  );
  const [logs, setLogs] = useState<EventLog[]>(INIT_LOGS);
  const [buffers] = useState<MemBuffer[]>(INIT_BUFFERS);
  const [allocKb, setAllocKb] = useState(256);
  const logEnd = useRef<HTMLDivElement>(null);

  // ── Auto-detection animation ─────────────────────────────────
  const runDetect = () => {
    setDetecting(true);
    setTimeout(() => {
      setDetecting(false);
      setBackend("auto");
      addLog("HAL", "Re-scan complete. Auto-mode confirmed → CUDA primary.", "success");
    }, 2200);
  };

  // ── Live kernel ticker ────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => {
      const b = backend === "hip" ? "HIP" : backend === "cuda" ? "CUDA" : Math.random() > 0.35 ? "CUDA" : "HIP";
      setKernels(prev => [genKernel(b), ...prev.slice(0, 9)]);
    }, 1800);
    return () => clearInterval(t);
  }, [backend]);

  // ── Live log ticker ──────────────────────────────────────────
  useEffect(() => {
    const msgs: Array<[string, string, LogType]> = [
      ["CUDA",  "cudaStreamSynchronize(0x4a2f00) — 0.8 µs", "info"],
      ["HIP",   "hipMemcpy D2H 3.2 GB — BW: 48.6 GB/s", "success"],
      ["CUDA",  "cudaMalloc 512 MB — OK (ptr: 0x7f2a00000000)", "success"],
      ["HAL",   "Backend health-check passed. Latency: 0.2 µs.", "info"],
      ["ROCm",  "hipLaunchKernelGGL attention_fwd <<4096,256>>", "info"],
      ["CUDA",  "add_kernel <<<8192,256,0,s0>>> launched — 142 µs", "success"],
      ["HAL",   "Stream pool: 8 active, 4 idle.", "info"],
    ];
    const t = setInterval(() => {
      const [module, message, type] = msgs[Math.floor(Math.random() * msgs.length)];
      addLog(module, message, type);
    }, 3500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    logEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const addLog = (module: string, message: string, type: LogType) => {
    setLogs(prev => [
      ...prev.slice(-30),
      { id: Date.now(), time: now(), module, message, type },
    ]);
  };

  // ── Derived ───────────────────────────────────────────────────
  const activeDevice = backend === "hip" ? AMD_DEVICE : NVIDIA_DEVICE;
  const standbyDevice = backend === "hip" ? NVIDIA_DEVICE : AMD_DEVICE;

  const logBadgeClass = (t: LogType) =>
    t === "success" ? "badge-neon-green" :
    t === "warning" ? "badge-neon-amber" :
    t === "error"   ? "badge-neon-red"   : "badge-neon-blue";

  const bufBadgeColor = (type: MemBuffer["type"]) =>
    type === "device"      ? "badge-neon-green" :
    type === "host-pinned" ? "badge-neon-blue"  : "badge-neon-amber";

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        title="Accelerator Runtime"
        subtitle="Platform-agnostic GPU HAL · CUDA & ROCm/HIP unified backend"
      />

      <div className="p-6 space-y-6">

        {/* ── STATUS BAR ───────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 rounded-lg glass-card-premium border border-primary/20"
        >
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-primary led-glow-green flex-shrink-0" />
            <span className="font-mono text-xs text-primary font-bold tracking-[0.2em] uppercase">
              IGpuBackend :: Unified HAL Active
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 font-mono text-[9px] text-muted-foreground/55 tracking-[0.15em] uppercase">
            <span>Devices: 2</span>
            <span className="text-primary/20">|</span>
            <span>CUDA 12.3</span>
            <span className="text-primary/20">|</span>
            <span>ROCm 6.1 / HIP 6.1</span>
            <span className="text-primary/20">|</span>
            <span className="text-primary/70">Mode: <span className="text-primary">{backend.toUpperCase()}</span></span>
          </div>
        </motion.div>

        {/* ── BACKEND SELECTOR ─────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-xl glass-card-premium cyber-corners border border-primary/15"
        >
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
            <div>
              <h3 className="font-mono font-bold text-foreground text-[11px] tracking-[0.2em] uppercase flex items-center gap-2 mb-1">
                <GitBranch className="w-4 h-4 text-primary" />
                Backend Selection
              </h3>
              <p className="text-[10px] text-muted-foreground/60 font-mono tracking-wide">
                Factory determines the active IGpuBackend impl at runtime. Isolated per process.
              </p>
            </div>

            {/* Selector buttons */}
            <div className="flex items-center gap-2 p-1.5 rounded-lg" style={{ background: "rgba(8,14,24,0.7)", border: "1px solid rgba(16,185,129,0.12)" }}>
              {(["auto", "cuda", "hip"] as Backend[]).map(b => (
                <button
                  key={b}
                  onClick={() => {
                    setBackend(b);
                    if (b === "auto") runDetect();
                    else addLog("HAL", `Backend overridden to ${b.toUpperCase()} by operator.`, "info");
                  }}
                  className={`px-4 py-2 rounded-md font-mono text-[10px] tracking-widest uppercase font-bold transition-all duration-200 ${
                    backend === b
                      ? b === "cuda"
                        ? "bg-primary/20 text-primary border border-primary/35 shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                        : b === "hip"
                        ? "bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.15)]"
                        : "bg-blue-500/15 text-blue-400 border border-blue-500/30 shadow-[0_0_10px_rgba(56,189,248,0.15)]"
                      : "text-muted-foreground/50 hover:text-muted-foreground border border-transparent hover:border-border/30"
                  }`}
                >
                  {b === "auto" ? "🔍 Auto" : b === "cuda" ? "⬛ CUDA" : "🔴 HIP"}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={runDetect}
              className="font-mono text-[10px] tracking-widest border-primary/25 text-primary hover:bg-primary/10 h-8 uppercase"
              disabled={detecting}
            >
              <RefreshCw className={`w-3 h-3 mr-2 ${detecting ? "animate-spin" : ""}`} />
              {detecting ? "Scanning..." : "Re-Detect"}
            </Button>
          </div>

          {/* Detection animation */}
          <AnimatePresence>
            {detecting && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 overflow-hidden"
              >
                <div className="p-3 rounded-lg font-mono text-[10px] space-y-1" style={{ background: "rgba(8,14,24,0.8)", border: "1px solid rgba(16,185,129,0.1)" }}>
                  {["Probing PCI bus for GPU devices...", "NVIDIA driver handshake OK (545.29)...", "ROCm runtime enumeration OK (6.1.0)...", "Selecting optimal primary backend..."].map((line, i) => (
                    <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.45 }} className="flex items-center gap-2 text-primary/60">
                      <span className="text-primary">›</span> {line}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── DEVICE CARDS ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[activeDevice, standbyDevice].map((dev, idx) => {
            const isActive = idx === 0;
            const isCuda = dev.backend === "CUDA";
            const accent = isCuda ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)";
            const border = isCuda ? "rgba(16,185,129,0.25)" : "rgba(245,158,11,0.25)";
            const dot = isCuda ? "led-glow-green bg-primary" : "led-glow-amber bg-amber-400";
            const valueCls = isCuda ? "text-primary" : "text-amber-400";
            return (
              <motion.div
                key={dev.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="p-5 rounded-xl cyber-corners relative overflow-hidden"
                style={{ background: "linear-gradient(135deg, rgba(8,12,20,0.85), rgba(13,20,36,0.6))", border: `1px solid ${border}`, backdropFilter: "blur(20px)", boxShadow: `0 0 24px ${accent}, inset 0 1px 1px rgba(255,255,255,0.04)` }}
              >
                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${isCuda ? "rgba(16,185,129,0.4)" : "rgba(245,158,11,0.4)"}, transparent)` }} />
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full ${dot}`} />
                      <span className={`font-mono text-[9px] tracking-widest uppercase ${isActive ? valueCls : "text-muted-foreground/50"}`}>
                        {isActive ? "● ACTIVE" : "○ STANDBY"}
                      </span>
                    </div>
                    <h4 className="font-mono font-bold text-foreground text-sm">{dev.name}</h4>
                    <p className="font-mono text-[9px] text-muted-foreground/50 tracking-widest mt-0.5">
                      Backend: <span className={valueCls}>{dev.backend}</span>
                      &nbsp;·&nbsp;Compute: <span className="text-foreground/70">{dev.computeCap}</span>
                    </p>
                  </div>
                  <div className="p-2 rounded-lg" style={{ background: accent, border: `1px solid ${border}` }}>
                    <Cpu className={`w-5 h-5 ${valueCls}`} />
                  </div>
                </div>

                {/* VRAM bar */}
                <div className="mb-4">
                  <div className="flex justify-between font-mono text-[9px] text-muted-foreground/60 mb-1.5 tracking-widest">
                    <span>VRAM UTILIZATION</span>
                    <span className={valueCls}>{dev.usedGb.toFixed(1)} / {dev.vramGb} GB</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary/50 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(dev.usedGb / dev.vramGb) * 100}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ background: isCuda ? "linear-gradient(90deg, #10b981, #34d399)" : "linear-gradient(90deg, #f59e0b, #fbbf24)", boxShadow: `0 0 6px ${isCuda ? "#10b981" : "#f59e0b"}` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "TFLOPs", value: dev.tflops.toLocaleString() },
                    { label: "Clock",  value: `${dev.clockMhz} MHz` },
                    { label: "Temp",   value: `${dev.tempC}°C` },
                  ].map(({ label, value }) => (
                    <div key={label} className="p-2 rounded-lg text-center" style={{ background: "rgba(8,14,24,0.5)", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <div className={`font-mono font-bold text-sm ${valueCls}`}>{value}</div>
                      <div className="font-mono text-[8px] text-muted-foreground/50 tracking-widest uppercase mt-0.5">{label}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ── ARCHITECTURE DIAGRAM ─────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-xl glass-card-premium cyber-corners terminal-scanlines border border-primary/15"
        >
          <h3 className="font-mono font-bold text-foreground text-[10px] tracking-[0.2em] uppercase flex items-center gap-2 mb-6">
            <Layers className="w-4 h-4 text-primary" />
            HAL Architecture
          </h3>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4 py-2 overflow-x-auto">
            {/* App layer */}
            <div className="flex-shrink-0 px-6 py-4 rounded-lg text-center" style={{ background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.25)", minWidth: 160 }}>
              <Box className="w-5 h-5 text-blue-400 mx-auto mb-2" />
              <div className="font-mono text-[10px] font-bold text-blue-400 tracking-widest">AGENT PLATFORM</div>
              <div className="font-mono text-[8px] text-muted-foreground/50 mt-1">agentic.lightos.sh</div>
            </div>

            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <ArrowRight className="w-4 h-4 text-primary/50 hidden md:block" />
              <ArrowDown className="w-4 h-4 text-primary/50 md:hidden" />
              <span className="font-mono text-[7px] text-muted-foreground/40 tracking-widest hidden md:block">calls</span>
            </div>

            {/* Interface */}
            <div className="flex-shrink-0 px-6 py-4 rounded-lg text-center" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.35)", minWidth: 180, boxShadow: "0 0 16px rgba(16,185,129,0.1)" }}>
              <Layers className="w-5 h-5 text-primary mx-auto mb-2 drop-shadow-[0_0_4px_rgba(16,185,129,0.6)]" />
              <div className="font-mono text-[10px] font-bold text-primary tracking-widest">IGpuBackend</div>
              <div className="font-mono text-[8px] text-muted-foreground/50 mt-1">pure virtual interface</div>
              <div className="mt-2 space-y-0.5">
                {["malloc() / free()", "memcpy_h2d/d2h()", "create_stream()", "launch_kernel()"].map(m => (
                  <div key={m} className="font-mono text-[7px] text-primary/50 tracking-wide">{m}</div>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <ArrowRight className="w-4 h-4 text-primary/50 hidden md:block" />
              <ArrowDown className="w-4 h-4 text-primary/50 md:hidden" />
              <span className="font-mono text-[7px] text-muted-foreground/40 tracking-widest hidden md:block">impl</span>
            </div>

            {/* Backends */}
            <div className="flex flex-col gap-3 flex-shrink-0">
              <div className="px-5 py-3 rounded-lg text-center" style={{ background: "rgba(16,185,129,0.1)", border: `2px solid ${backend === "cuda" || backend === "auto" ? "rgba(16,185,129,0.45)" : "rgba(16,185,129,0.15)"}`, minWidth: 152, opacity: backend === "hip" ? 0.45 : 1, transition: "all 0.3s" }}>
                <Cpu className="w-4 h-4 text-primary mx-auto mb-1" />
                <div className="font-mono text-[10px] font-bold text-primary tracking-widest">CudaBackend</div>
                <div className="font-mono text-[7px] text-muted-foreground/50 mt-1">cuda_runtime.h</div>
                <div className="font-mono text-[7px] text-primary/60 mt-0.5">nvcc · CUDA 12.x</div>
              </div>
              <div className="px-5 py-3 rounded-lg text-center" style={{ background: "rgba(245,158,11,0.1)", border: `2px solid ${backend === "hip" ? "rgba(245,158,11,0.45)" : "rgba(245,158,11,0.15)"}`, minWidth: 152, opacity: backend === "cuda" ? 0.45 : 1, transition: "all 0.3s" }}>
                <Cpu className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                <div className="font-mono text-[10px] font-bold text-amber-400 tracking-widest">HipBackend</div>
                <div className="font-mono text-[7px] text-muted-foreground/50 mt-1">hip/hip_runtime.h</div>
                <div className="font-mono text-[7px] text-amber-400/60 mt-0.5">hipcc · ROCm 6.x</div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <ArrowRight className="w-4 h-4 text-primary/50 hidden md:block" />
              <ArrowDown className="w-4 h-4 text-primary/50 md:hidden" />
              <span className="font-mono text-[7px] text-muted-foreground/40 tracking-widest hidden md:block">targets</span>
            </div>

            {/* Hardware */}
            <div className="flex flex-col gap-3 flex-shrink-0">
              <div className="px-4 py-2 rounded-lg text-center" style={{ background: "rgba(8,14,24,0.6)", border: "1px solid rgba(16,185,129,0.2)", minWidth: 132 }}>
                <div className="font-mono text-[9px] font-bold text-foreground tracking-wide">NVIDIA GPU</div>
                <div className="font-mono text-[7px] text-muted-foreground/40 mt-0.5">H100 · A100 · RTX 40x0</div>
              </div>
              <div className="px-4 py-2 rounded-lg text-center" style={{ background: "rgba(8,14,24,0.6)", border: "1px solid rgba(245,158,11,0.2)", minWidth: 132 }}>
                <div className="font-mono text-[9px] font-bold text-foreground tracking-wide">AMD GPU</div>
                <div className="font-mono text-[7px] text-muted-foreground/40 mt-0.5">MI300X · RX 7000</div>
              </div>
            </div>
          </div>

          {/* Shared kernel note */}
          <div className="mt-5 p-3 rounded-lg flex items-center gap-3" style={{ background: "rgba(8,14,24,0.6)", border: "1px solid rgba(16,185,129,0.08)" }}>
            <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
            <p className="font-mono text-[10px] text-muted-foreground/70 tracking-wide">
              Kernel code lives in <span className="text-primary">gpu_kernels.h</span> and is compiled once by both{" "}
              <span className="text-primary">nvcc</span> and <span className="text-amber-400">hipcc</span> via{" "}
              <span className="text-foreground">GPU_LAUNCH</span> macro — zero algorithm duplication.
            </p>
          </div>
        </motion.div>

        {/* ── MEMORY POOL + KERNEL DISPATCH ────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Memory Pool */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="p-5 rounded-xl glass-card-premium cyber-corners border border-primary/15"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono font-bold text-foreground text-[10px] tracking-[0.2em] uppercase flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-cyan-400" />
                Memory Pool
              </h3>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] text-muted-foreground/50 tracking-widest">Alloc size:</span>
                <span className="font-mono text-[9px] text-primary tracking-widest">{allocKb} KB</span>
              </div>
            </div>

            <div className="space-y-2.5 mb-4">
              {buffers.map(buf => {
                const pct = (buf.sizeGb / 30) * 100;
                const isCuda = buf.backend === "CUDA";
                return (
                  <div key={buf.id} className="p-3 rounded-lg" style={{ background: "rgba(8,14,24,0.5)", border: "1px solid rgba(16,185,129,0.08)" }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${bufBadgeColor(buf.type)}`}>{buf.type}</span>
                        <span className="font-mono text-[10px] text-foreground/80">{buf.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`font-mono text-[8px] ${isCuda ? "text-primary" : "text-amber-400"}`}>{buf.backend}</span>
                        <span className="font-mono text-[10px] text-muted-foreground/60">{buf.sizeGb} GB</span>
                      </div>
                    </div>
                    <div className="h-1 rounded-full bg-secondary/50 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: isCuda ? "linear-gradient(90deg, #10b981, #34d399)" : "linear-gradient(90deg, #f59e0b, #fbbf24)" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Manual alloc simulator */}
            <div className="p-3 rounded-lg" style={{ background: "rgba(8,14,24,0.7)", border: "1px solid rgba(16,185,129,0.1)" }}>
              <div className="font-mono text-[9px] text-muted-foreground/50 tracking-widest uppercase mb-2">Simulate malloc()</div>
              <Slider
                value={[allocKb]}
                min={64}
                max={4096}
                step={64}
                onValueChange={v => setAllocKb(v[0])}
                className="mb-2"
              />
              <div className="flex justify-between font-mono text-[8px] text-muted-foreground/40">
                <span>64 KB</span><span>{allocKb} KB selected</span><span>4096 KB</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 w-full font-mono text-[9px] tracking-widest border-primary/20 text-primary hover:bg-primary/10 h-7 uppercase"
                onClick={() => addLog(activeDevice.backend, `${activeDevice.backend === "CUDA" ? "cuda" : "hip"}Malloc(${allocKb * 1024}) — OK`, "success")}
              >
                <Play className="w-3 h-3 mr-1" /> malloc({allocKb} KB)
              </Button>
            </div>
          </motion.div>

          {/* Kernel Dispatch Queue */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-5 rounded-xl glass-card-premium cyber-corners terminal-scanlines border border-cyan-500/15"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono font-bold text-foreground text-[10px] tracking-[0.2em] uppercase flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                Kernel Dispatch
              </h3>
              <span className="font-mono text-[9px] text-cyan-400 flex items-center gap-1.5 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 led-glow-blue" />
                Live
              </span>
            </div>

            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              <AnimatePresence initial={false}>
                {kernels.map(k => (
                  <motion.div
                    key={k.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-2.5 rounded-lg flex items-center gap-3"
                    style={{ background: "rgba(8,14,24,0.55)", border: "1px solid rgba(16,185,129,0.07)" }}
                  >
                    <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded tracking-widest flex-shrink-0 ${k.backend === "CUDA" ? "badge-neon-green" : "badge-neon-amber"}`}>
                      {k.backend}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-[10px] text-foreground/90 truncate">{k.kernel}</div>
                      <div className="font-mono text-[8px] text-muted-foreground/40 tracking-wide">
                        grid{k.grid} blk{k.block}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={`font-mono text-[10px] font-bold ${k.latencyUs < 200 ? "text-primary" : k.latencyUs < 1000 ? "text-amber-400" : "text-red-400"}`}>
                        {k.latencyUs} µs
                      </div>
                      <div className="font-mono text-[8px] text-muted-foreground/40">{k.time}</div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* ── CODE VIEWER ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-xl glass-card-premium cyber-corners border border-primary/15"
        >
          <h3 className="font-mono font-bold text-foreground text-[10px] tracking-[0.2em] uppercase flex items-center gap-2 mb-4">
            <Code2 className="w-4 h-4 text-primary" />
            Source Files
          </h3>

          {/* File tabs */}
          <div className="flex flex-wrap gap-1 mb-4 p-1 rounded-lg" style={{ background: "rgba(8,14,24,0.7)", border: "1px solid rgba(16,185,129,0.08)" }}>
            {Object.keys(CODE_FILES).map(f => (
              <button
                key={f}
                onClick={() => setActiveFile(f)}
                className={`px-3 py-1.5 rounded font-mono text-[9px] tracking-wide transition-all ${
                  activeFile === f
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "text-muted-foreground/50 hover:text-muted-foreground/80"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Code block */}
          <div className="relative rounded-lg overflow-hidden" style={{ background: "rgba(4,8,16,0.9)", border: "1px solid rgba(16,185,129,0.1)" }}>
            <div className="flex items-center gap-2 px-4 py-2 border-b" style={{ borderColor: "rgba(16,185,129,0.08)", background: "rgba(8,14,24,0.6)" }}>
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-primary/60" />
              <span className="ml-2 font-mono text-[9px] text-muted-foreground/50 tracking-widest">{activeFile}</span>
            </div>
            <pre className="p-4 text-[10px] font-mono text-foreground/80 leading-relaxed overflow-x-auto max-h-80 scrollbar-thin">
              <code>{CODE_FILES[activeFile].code}</code>
            </pre>
          </div>
        </motion.div>

        {/* ── EVENT LOG ────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-xl glass-card-premium cyber-corners terminal-scanlines border border-primary/15"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-mono font-bold text-foreground text-[10px] tracking-[0.2em] uppercase flex items-center gap-2">
              <Terminal className="w-4 h-4 text-primary animate-pulse" />
              HAL Event Stream
            </h3>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary led-glow-green" />
              <span className="font-mono text-[9px] text-muted-foreground/50 tracking-widest">Live</span>
            </div>
          </div>

          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {logs.map(log => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-2.5 rounded-lg"
                style={{ background: "rgba(8,14,24,0.5)", border: "1px solid rgba(16,185,129,0.06)" }}
              >
                <span className="font-mono text-[8px] text-muted-foreground/40 flex-shrink-0 mt-0.5 w-16 tabular-nums">{log.time}</span>
                <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded tracking-widest flex-shrink-0 ${logBadgeClass(log.type)}`}>
                  {log.module}
                </span>
                <span className="font-mono text-[10px] text-foreground/75 leading-relaxed">{log.message}</span>
              </div>
            ))}
            <div ref={logEnd} />
          </div>
        </motion.div>

      </div>
    </div>
  );
}
