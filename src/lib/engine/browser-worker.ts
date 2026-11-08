/// <reference lib="webworker" />
// Runs a small language model inside a Web Worker on the visitor's own device.
import { pipeline, TextStreamer, type TextGenerationPipeline } from "@huggingface/transformers";
import { dtypeFor, type EngineDevice } from "./browser-models";

type InMsg =
  | { type: "load"; model: string; device: EngineDevice }
  | { type: "generate"; messages: { role: string; content: string }[] };

let generator: TextGenerationPipeline | null = null;
let busy = false;
const post = (m: unknown) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(m);

self.onmessage = async (ev: MessageEvent<InMsg>) => {
  const msg = ev.data;
  try {
    if (msg.type === "load") {
      const files: Record<string, { loaded: number; total: number }> = {};
      const load = (device: EngineDevice) => pipeline("text-generation", msg.model, {
        device, dtype: dtypeFor(device),
        progress_callback: (p: { status: string; file?: string; loaded?: number; total?: number }) => {
          if (p.status === "progress" && p.file && p.total) {
            files[p.file] = { loaded: p.loaded ?? 0, total: p.total };
            const loaded = Object.values(files).reduce((a, f) => a + f.loaded, 0);
            const total = Object.values(files).reduce((a, f) => a + f.total, 0);
            post({ type: "progress", loaded, total });
          }
        },
      }) as Promise<TextGenerationPipeline>;
      let device = msg.device;
      try { generator = await load(device); }
      catch (e) {
        if (device !== "webgpu") throw e;
        device = "wasm";
        post({ type: "fallback", reason: "WebGPU failed; using the CPU instead." });
        generator = await load(device);
      }
      post({ type: "ready", device });
      return;
    }
    if (msg.type === "generate") {
      if (!generator) throw new Error("Model is not loaded yet.");
      if (busy) return;
      busy = true;
      const started = performance.now();
      let tokens = 0;
      const streamer = new TextStreamer(generator.tokenizer, {
        skip_prompt: true, skip_special_tokens: true,
        callback_function: (text: string) => { tokens++; post({ type: "token", text }); },
      });
      await generator(msg.messages, { max_new_tokens: 256, do_sample: false, streamer });
      const seconds = (performance.now() - started) / 1000;
      post({ type: "done", tokens, seconds });
      busy = false;
    }
  } catch (e) {
    busy = false;
    post({ type: "error", message: e instanceof Error ? e.message : String(e) });
  }
};
