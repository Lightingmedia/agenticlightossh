import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Cluster, RunSummary, RunMetrics } from "@/types/lightos";

// Mock data for when Firestore is empty
const MOCK_CLUSTERS: Cluster[] = [
    {
        id: "cluster-1",
        name: "Production Cluster",
        nodes: 8,
        gpus: 64,
        agentHealthy: 8,
        topology: "ring"
    },
    {
        id: "cluster-2",
        name: "Development Cluster",
        nodes: 4,
        gpus: 32,
        agentHealthy: 4,
        topology: "mesh"
    },
    {
        id: "cluster-3",
        name: "Training Cluster",
        nodes: 16,
        gpus: 128,
        agentHealthy: 15,
        topology: "tree"
    }
];

const MOCK_RUNS: RunSummary[] = [
    {
        runId: "run-001",
        clusterId: "cluster-1",
        model: "GPT-4-175B",
        mode: "optimized",
        startedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        durationSeconds: 847.3,
        stepTimeAvg: 23.4,
        utilizationAvg: 89.2
    },
    {
        runId: "run-002",
        clusterId: "cluster-3",
        model: "LLaMA-3-70B",
        mode: "baseline",
        startedAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        durationSeconds: 1243.7,
        stepTimeAvg: 45.1,
        utilizationAvg: 72.8
    },
    {
        runId: "run-003",
        clusterId: "cluster-1",
        model: "Mistral-7B",
        mode: "telemetry",
        startedAt: new Date(Date.now() - 14400000).toISOString(), // 4 hours ago
        durationSeconds: 523.9,
        stepTimeAvg: 15.7,
        utilizationAvg: 91.5
    },
    {
        runId: "run-004",
        clusterId: "cluster-2",
        model: "Falcon-40B",
        mode: "optimized",
        startedAt: new Date(Date.now() - 28800000).toISOString(), // 8 hours ago
        durationSeconds: 967.2,
        stepTimeAvg: 31.2,
        utilizationAvg: 85.3
    },
    {
        runId: "run-005",
        clusterId: "cluster-3",
        model: "Claude-3.5-Sonnet",
        mode: "baseline",
        startedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        durationSeconds: 1834.5,
        stepTimeAvg: 52.3,
        utilizationAvg: 78.9
    }
];

// Generate realistic mock metrics
function generateMockMetrics(runId: string, steps: number = 100): RunMetrics {
    const stepTimeMs: number[] = [];
    const smUtilizationPct: number[] = [];
    const commTimeMs: number[] = [];
    const computeTimeMs: number[] = [];
    const timestamps: string[] = [];
    
    const baseStepTime = 20 + Math.random() * 30; // 20-50ms
    const baseUtilization = 70 + Math.random() * 25; // 70-95%
    
    for (let i = 0; i < steps; i++) {
        // Add some variance and trend
        const variance = (Math.random() - 0.5) * 5;
        const trend = i / steps * 2; // Slight upward trend
        
        const stepTime = baseStepTime + variance + trend;
        const utilization = Math.min(100, Math.max(0, baseUtilization + variance - trend));
        const commTime = stepTime * (0.15 + Math.random() * 0.1); // 15-25% communication
        const computeTime = stepTime - commTime;
        
        stepTimeMs.push(Number(stepTime.toFixed(2)));
        smUtilizationPct.push(Number(utilization.toFixed(1)));
        commTimeMs.push(Number(commTime.toFixed(2)));
        computeTimeMs.push(Number(computeTime.toFixed(2)));
        timestamps.push(new Date(Date.now() - (steps - i) * 1000).toISOString());
    }
    
    return {
        runId,
        stepTimeMs,
        smUtilizationPct,
        commTimeMs,
        computeTimeMs,
        timestamps
    };
}

/**
 * Fetch all clusters from Firestore (with mock data fallback)
 */
export async function fetchClusters(): Promise<Cluster[]> {
    try {
        const clustersSnapshot = await getDocs(collection(db, "clusters"));
        const clusters = clustersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Cluster));
        
        // If no clusters in Firestore, return mock data
        if (clusters.length === 0) {
            console.log("No clusters in Firestore, using mock data");
            return MOCK_CLUSTERS;
        }
        
        return clusters;
    } catch (error) {
        console.error("Failed to fetch clusters from Firestore, using mock data:", error);
        // Return mock data on error
        return MOCK_CLUSTERS;
    }
}

/**
 * Fetch runs, optionally filtered by cluster ID (with mock data fallback)
 */
export async function fetchRuns(clusterId?: string): Promise<RunSummary[]> {
    try {
        let q;
        if (clusterId) {
            q = query(collection(db, "runs"), where("clusterId", "==", clusterId));
        } else {
            q = query(collection(db, "runs"));
        }

        const runsSnapshot = await getDocs(q);
        const runs = runsSnapshot.docs.map(d => {
            const data = d.data() as Record<string, unknown>;
            return {
                runId: d.id,
                ...data
            } as RunSummary;
        });
        
        // If no runs in Firestore, return mock data
        if (runs.length === 0) {
            console.log("No runs in Firestore, using mock data");
            return clusterId 
                ? MOCK_RUNS.filter(r => r.clusterId === clusterId)
                : MOCK_RUNS;
        }
        
        return runs;
    } catch (error) {
        console.error("Failed to fetch runs from Firestore, using mock data:", error);
        // Return mock data on error
        return clusterId 
            ? MOCK_RUNS.filter(r => r.clusterId === clusterId)
            : MOCK_RUNS;
    }
}

/**
 * Fetch detailed metrics for a specific run (with mock data fallback)
 */
export async function fetchRunMetrics(runId: string): Promise<RunMetrics> {
    try {
        const metricsDoc = await getDoc(doc(db, "run_metrics", runId));

        if (!metricsDoc.exists()) {
            console.log(`No metrics found for run ${runId} in Firestore, generating mock data`);
            return generateMockMetrics(runId);
        }

        const data = metricsDoc.data();
        if (!data) {
            console.log(`Empty metrics data for run ${runId}, generating mock data`);
            return generateMockMetrics(runId);
        }

        return {
            runId,
            ...data
        } as RunMetrics;
    } catch (error) {
        console.error(`Failed to fetch run metrics for ${runId}, generating mock data:`, error);
        // Return mock data on error
        return generateMockMetrics(runId);
    }
}
