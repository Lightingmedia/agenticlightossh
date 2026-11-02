// DEMO DATA ONLY — illustrative, not real provider prices or capacity.
import type { Offer, WorkloadSpec } from "./core";

const t = "2026-01-01T00:00:00Z";
export const DEMO_OFFERS: Offer[] = [
  { id: "demo-a", provider: "Demo Cloud A", region: "us-east", accelerator: "H100", memoryGb: 80, count: 8, runtime: "CUDA 12", purchaseModel: "on_demand", pricePerHour: 3, currency: "USD", minCommitment: "None", sourceAt: t, kind: "cached", compliance: null },
  { id: "demo-b", provider: "Demo Cloud B", region: "eu-west", accelerator: "H100", memoryGb: 80, count: 4, runtime: "CUDA 12", purchaseModel: "spot", pricePerHour: 1.8, currency: "USD", minCommitment: "None", sourceAt: t, kind: "cached", compliance: null },
  { id: "demo-c", provider: "Demo Cloud C", region: "us-east", accelerator: "A100", memoryGb: 40, count: 8, runtime: "CUDA 12", purchaseModel: "on_demand", pricePerHour: 1.5, currency: "USD", minCommitment: "None", sourceAt: t, kind: "cached", compliance: null },
  { id: "demo-d", provider: "Demo Neocloud", region: "us-east", accelerator: "H100", memoryGb: 80, count: 16, runtime: "CUDA 12", purchaseModel: "reserved", pricePerHour: null, currency: "USD", minCommitment: "3 months", sourceAt: t, kind: "quote_required", compliance: null },
  { id: "demo-e", provider: "Demo ROCm Host", region: "us-east", accelerator: "MI300X", memoryGb: 192, count: 8, runtime: "ROCm 6", purchaseModel: "on_demand", pricePerHour: 2.5, currency: "USD", minCommitment: "None", sourceAt: t, kind: "unsupported", compliance: null },
];

export const DEFAULT_SPEC: WorkloadSpec = {
  workloadType: "inference", artifact: "ghcr.io/example/llama-serve:latest", runtime: "CUDA 12",
  accelerator: "H100", count: 2, minMemoryGb: 80, allowedRegions: ["us-east"], budget: 100,
  currency: "USD", interruptible: false, checkpoint: false, hours: 10,
};
