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
 * Fetch runs, optionally filtered by cluster ID
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
        return runsSnapshot.docs.map(doc => ({
            runId: doc.id,
            ...doc.data()
        } as RunSummary));
    } catch (error) {
        console.error("Failed to fetch runs:", error);
        throw new Error("Failed to fetch runs");
    }
}

/**
 * Fetch detailed metrics for a specific run
 */
export async function fetchRunMetrics(runId: string): Promise<RunMetrics> {
    try {
        const metricsDoc = await getDoc(doc(db, "run_metrics", runId));

        if (!metricsDoc.exists()) {
            throw new Error("Run metrics not found");
        }

        const data = metricsDoc.data();
        if (!data) {
            throw new Error("Run metrics data is empty");
        }

        return {
            runId,
            ...data
        } as RunMetrics;
    } catch (error) {
        console.error("Failed to fetch run metrics:", error);
        throw new Error("Failed to fetch run metrics");
    }
}
