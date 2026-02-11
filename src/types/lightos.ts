// LightOS/Fabric OS Type Definitions

export type Cluster = {
    id: string;
    name: string;
    nodes: number;
    gpus: number;
    agentHealthy: number;
    topology?: string;
    createdAt?: string;
};

export type RunMode = 'baseline' | 'telemetry' | 'optimized';

export type RunSummary = {
    runId: string;
    clusterId: string;
    model: string;
    mode: RunMode;
    startedAt: string;
    durationSeconds: number;
    stepTimeAvg?: number;
    utilizationAvg?: number;
};

export type RunMetrics = {
    runId: string;
    stepTimeMs: number[];
    smUtilizationPct: number[];
    commTimeMs: number[];
    computeTimeMs: number[];
    timestamps: string[];
};
