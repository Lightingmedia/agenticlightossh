import { useEffect, useState } from "react";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  limit as firestoreLimit,
  where,
  QuerySnapshot,
  DocumentData
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface GPUMetric {
  id: string;
  gpu_id: string;
  gpu_name: string;
  utilization: number;
  temperature: number;
  power: number;
  memory_used: number;
  memory_total: number;
  status: "online" | "busy" | "idle" | "offline";
  updated_at: string;
}

export interface Agent {
  id: string;
  agent_id: string;
  name: string;
  type: string;
  status: "online" | "busy" | "idle" | "offline";
  cpu: number;
  memory: number;
  tasks: number;
  uptime: string;
  updated_at: string;
}

export interface ThermalZone {
  id: string;
  zone_id: string;
  name: string;
  temperature: number;
  fan_speed: number;
  throttling: boolean;
  updated_at: string;
}

export interface InferenceTask {
  id: string;
  task_id: string;
  model: string;
  status: "queued" | "running" | "completed" | "failed";
  progress: number | null;
  tokens: number | null;
  duration: string | null;
  created_at: string;
}

export interface SystemLog {
  id: string;
  level: "DEBUG" | "INFO" | "WARN" | "ERROR";
  service: string;
  message: string;
  created_at: string;
}

export interface TelemetryDataPoint {
  id: string;
  metric_type: string;
  value: number;
  timestamp: string;
}

// Helper function to convert Firestore snapshot to typed array
function snapshotToArray<T>(snapshot: QuerySnapshot<DocumentData>): T[] {
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
}

// Hook for real-time GPU metrics
export function useRealtimeGPUs() {
  const [gpus, setGpus] = useState<GPUMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const q = query(collection(db, "gpu_metrics"), orderBy("gpu_id"));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          setGpus(snapshotToArray<GPUMetric>(snapshot));
          setLoading(false);
        },
        (err) => {
          setError(err.message || "Failed to fetch GPUs");
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to setup GPU listener");
      setLoading(false);
    }
  }, []);

  return { gpus, loading, error };
}

// Hook for real-time agents
export function useRealtimeAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const q = query(collection(db, "agents"), orderBy("name"));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          setAgents(snapshotToArray<Agent>(snapshot));
          setLoading(false);
        },
        (err) => {
          setError(err.message || "Failed to fetch agents");
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to setup agents listener");
      setLoading(false);
    }
  }, []);

  return { agents, loading, error };
}

// Hook for real-time thermal zones
export function useRealtimeThermalZones() {
  const [zones, setZones] = useState<ThermalZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const q = query(collection(db, "thermal_zones"), orderBy("zone_id"));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          setZones(snapshotToArray<ThermalZone>(snapshot));
          setLoading(false);
        },
        (err) => {
          setError(err.message || "Failed to fetch thermal zones");
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to setup thermal zones listener");
      setLoading(false);
    }
  }, []);

  return { zones, loading, error };
}

// Hook for real-time inference tasks
export function useRealtimeInferenceTasks() {
  const [tasks, setTasks] = useState<InferenceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const q = query(
        collection(db, "inference_tasks"),
        orderBy("created_at", "desc"),
        firestoreLimit(20)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          setTasks(snapshotToArray<InferenceTask>(snapshot));
          setLoading(false);
        },
        (err) => {
          setError(err.message || "Failed to fetch tasks");
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to setup tasks listener");
      setLoading(false);
    }
  }, []);

  return { tasks, loading, error };
}

// Hook for real-time system logs
export function useRealtimeSystemLogs() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const q = query(
        collection(db, "system_logs"),
        orderBy("created_at", "desc"),
        firestoreLimit(50)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          setLogs(snapshotToArray<SystemLog>(snapshot));
          setLoading(false);
        },
        (err) => {
          setError(err.message || "Failed to fetch logs");
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to setup logs listener");
      setLoading(false);
    }
  }, []);

  return { logs, loading, error };
}

// Hook for telemetry data points
export function useTelemetryData(metricType: string, limitCount = 60) {
  const [data, setData] = useState<TelemetryDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const q = query(
        collection(db, "telemetry_data"),
        where("metric_type", "==", metricType),
        orderBy("timestamp", "desc"),
        firestoreLimit(limitCount)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          // Reverse to get chronological order
          const dataPoints = snapshotToArray<TelemetryDataPoint>(snapshot).reverse();
          setData(dataPoints);
          setLoading(false);
        },
        (err) => {
          console.error("Failed to fetch telemetry data:", err);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error("Failed to setup telemetry listener:", err);
      setLoading(false);
    }
  }, [metricType, limitCount]);

  return { data, loading };
}
