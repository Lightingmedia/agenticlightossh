import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Cluster, RunSummary, RunMetrics } from "@/types/lightos";

/**
 * Fetch all clusters from Firestore
 */
export async function fetchClusters(): Promise<Cluster[]> {
    try {
        const clustersSnapshot = await getDocs(collection(db, "clusters"));
        return clustersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Cluster));
    } catch (error) {
        console.error("Failed to fetch clusters:", error);
        throw new Error("Failed to fetch clusters");
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
