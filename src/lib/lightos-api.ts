import type { Cluster, RunSummary, RunMetrics } from "@/types/lightos";

// Mock data for clusters
const MOCK_CLUSTERS: Cluster[] = [
  {
    id: "cluster-1",
    name: "Production Cluster",
    nodes: 8,
    gpus: 64,
    agentHealthy: 8,
    topology: "ring",
  },
  {
    id: "cluster-2",
    name: "Development Cluster",
    nodes: 4,
    gpus: 32,
    agentHealthy: 4,
    topology: "mesh",
  },
  {
    id: "cluster-3",
    name: "Training Cluster",
    nodes: 16,
    gpus: 128,
    agentHealthy: 15,
    topology: "tree",
  },
];

const MOCK_RUNS: RunSummary[] = [
  {
    runId: "run-001",
    clusterId: "cluster-1",
    model: "GPT-4-175B",
    mode: "optimized",
    startedAt: new Date(Date.now() - 3600000).toISOString(),
    durationSeconds: 847.3,
    stepTimeAvg: 23.4,
    utilizationAvg: 89.2,
  },
  {
    runId: "run-002",
    clusterId: "cluster-3",
    model: "LLaMA-3-70B",
    mode: "baseline",
    startedAt: new Date(Date.now() - 7200000).toISOString(),
    durationSeconds: 1243.7,
    stepTimeAvg: 45.1,
    utilizationAvg: 72.8,
  },
  {
    runId: "run-003",
    clusterId: "cluster-1",
    model: "Mistral-7B",
    mode: "telemetry",
    startedAt: new Date(Date.now() - 14400000).toISOString(),
    durationSeconds: 523.9,
    stepTimeAvg: 15.7,
    utilizationAvg: 91.5,
  },
  {
    runId: "run-004",
    clusterId: "cluster-2",
    model: "Falcon-40B",
    mode: "optimized",
    startedAt: new Date(Date.now() - 28800000).toISOString(),
    durationSeconds: 967.2,
    stepTimeAvg: 31.2,
    utilizationAvg: 85.3,
  },
  {
    runId: "run-005",
    clusterId: "cluster-3",
    model: "Claude-3.5-Sonnet",
    mode: "baseline",
    startedAt: new Date(Date.now() - 86400000).toISOString(),
    durationSeconds: 1834.5,
    stepTimeAvg: 52.3,
    utilizationAvg: 78.9,
  },
];

function generateMockMetrics(runId: string, steps = 100): RunMetrics {
  const stepTimeMs: number[] = [];
  const smUtilizationPct: number[] = [];
  const commTimeMs: number[] = [];
  const computeTimeMs: number[] = [];
  const timestamps: string[] = [];

  const baseStepTime = 20 + Math.random() * 30;
  const baseUtilization = 70 + Math.random() * 25;

  for (let i = 0; i < steps; i++) {
    const variance = (Math.random() - 0.5) * 5;
    const trend = (i / steps) * 2;

    const stepTime = baseStepTime + variance + trend;
    const utilization = Math.min(100, Math.max(0, baseUtilization + variance - trend));
    const commTime = stepTime * (0.15 + Math.random() * 0.1);
    const computeTime = stepTime - commTime;

    stepTimeMs.push(Number(stepTime.toFixed(2)));
    smUtilizationPct.push(Number(utilization.toFixed(1)));
    commTimeMs.push(Number(commTime.toFixed(2)));
    computeTimeMs.push(Number(computeTime.toFixed(2)));
    timestamps.push(new Date(Date.now() - (steps - i) * 1000).toISOString());
  }

  return { runId, stepTimeMs, smUtilizationPct, commTimeMs, computeTimeMs, timestamps };
}

export async function fetchClusters(): Promise<Cluster[]> {
  return MOCK_CLUSTERS;
}

export async function fetchRuns(clusterId?: string): Promise<RunSummary[]> {
  return clusterId ? MOCK_RUNS.filter((r) => r.clusterId === clusterId) : MOCK_RUNS;
}

export async function fetchRunMetrics(runId: string): Promise<RunMetrics> {
  return generateMockMetrics(runId);
}
