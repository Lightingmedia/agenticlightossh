// Small open models that run entirely in the visitor's browser (no server, no GPU host).
export interface BrowserModel { id: string; label: string; downloadMb: number; note: string }

export const BROWSER_MODELS: BrowserModel[] = [
  { id: "HuggingFaceTB/SmolLM2-135M-Instruct", label: "SmolLM2 135M (fastest)", downloadMb: 120, note: "Very small; good for short answers only." },
  { id: "HuggingFaceTB/SmolLM2-360M-Instruct", label: "SmolLM2 360M (better)", downloadMb: 280, note: "Slower to load; more coherent answers." },
];

export type EngineDevice = "webgpu" | "wasm";

/** WebGPU when the browser exposes it, otherwise the CPU (WebAssembly) path. */
export function pickDevice(nav: { gpu?: unknown } | undefined): EngineDevice {
  return nav && typeof nav === "object" && "gpu" in nav && nav.gpu ? "webgpu" : "wasm";
}

/** Quantization per device: q4f16 needs WebGPU fp16; plain q4 works on CPU. */
export function dtypeFor(device: EngineDevice): "q4f16" | "q4" {
  return device === "webgpu" ? "q4f16" : "q4";
}

export function approxDownloadMb(model: BrowserModel, device: EngineDevice): number {
  return device === "webgpu" ? model.downloadMb : Math.round(model.downloadMb * 1.5);
}
