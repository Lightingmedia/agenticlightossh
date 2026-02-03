import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

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

// Hook for real-time GPU metrics
export function useRealtimeGPUs() {
  const [gpus, setGpus] = useState<GPUMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let channel: RealtimeChannel;

    const fetchGPUs = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from("gpu_metrics")
          .select("*")
          .order("gpu_id");

        if (fetchError) throw fetchError;
        setGpus(data as GPUMetric[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch GPUs");
      } finally {
        setLoading(false);
      }
    };

    fetchGPUs();

    // Subscribe to real-time updates
    channel = supabase
      .channel("gpu_metrics_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gpu_metrics" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setGpus((prev) => [...prev, payload.new as GPUMetric]);
          } else if (payload.eventType === "UPDATE") {
            setGpus((prev) =>
              prev.map((gpu) =>
                gpu.id === (payload.new as GPUMetric).id
                  ? (payload.new as GPUMetric)
                  : gpu
              )
            );
          } else if (payload.eventType === "DELETE") {
            setGpus((prev) =>
              prev.filter((gpu) => gpu.id !== (payload.old as GPUMetric).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      channel?.unsubscribe();
    };
  }, []);

  return { gpus, loading, error };
}

// Hook for real-time agents
export function useRealtimeAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let channel: RealtimeChannel;

    const fetchAgents = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from("agents")
          .select("*")
          .order("name");

        if (fetchError) throw fetchError;
        setAgents(data as Agent[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch agents");
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();

    channel = supabase
      .channel("agents_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agents" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setAgents((prev) => [...prev, payload.new as Agent]);
          } else if (payload.eventType === "UPDATE") {
            setAgents((prev) =>
              prev.map((agent) =>
                agent.id === (payload.new as Agent).id
                  ? (payload.new as Agent)
                  : agent
              )
            );
          } else if (payload.eventType === "DELETE") {
            setAgents((prev) =>
              prev.filter((agent) => agent.id !== (payload.old as Agent).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      channel?.unsubscribe();
    };
  }, []);

  return { agents, loading, error };
}

// Hook for real-time thermal zones
export function useRealtimeThermalZones() {
  const [zones, setZones] = useState<ThermalZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let channel: RealtimeChannel;

    const fetchZones = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from("thermal_zones")
          .select("*")
          .order("zone_id");

        if (fetchError) throw fetchError;
        setZones(data as ThermalZone[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch thermal zones");
      } finally {
        setLoading(false);
      }
    };

    fetchZones();

    channel = supabase
      .channel("thermal_zones_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "thermal_zones" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setZones((prev) => [...prev, payload.new as ThermalZone]);
          } else if (payload.eventType === "UPDATE") {
            setZones((prev) =>
              prev.map((zone) =>
                zone.id === (payload.new as ThermalZone).id
                  ? (payload.new as ThermalZone)
                  : zone
              )
            );
          } else if (payload.eventType === "DELETE") {
            setZones((prev) =>
              prev.filter((zone) => zone.id !== (payload.old as ThermalZone).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      channel?.unsubscribe();
    };
  }, []);

  return { zones, loading, error };
}

// Hook for real-time inference tasks
export function useRealtimeInferenceTasks() {
  const [tasks, setTasks] = useState<InferenceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let channel: RealtimeChannel;

    const fetchTasks = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from("inference_tasks")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(20);

        if (fetchError) throw fetchError;
        setTasks(data as InferenceTask[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch tasks");
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();

    channel = supabase
      .channel("inference_tasks_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inference_tasks" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setTasks((prev) => [payload.new as InferenceTask, ...prev].slice(0, 20));
          } else if (payload.eventType === "UPDATE") {
            setTasks((prev) =>
              prev.map((task) =>
                task.id === (payload.new as InferenceTask).id
                  ? (payload.new as InferenceTask)
                  : task
              )
            );
          } else if (payload.eventType === "DELETE") {
            setTasks((prev) =>
              prev.filter((task) => task.id !== (payload.old as InferenceTask).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      channel?.unsubscribe();
    };
  }, []);

  return { tasks, loading, error };
}

// Hook for real-time system logs
export function useRealtimeSystemLogs() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let channel: RealtimeChannel;

    const fetchLogs = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from("system_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);

        if (fetchError) throw fetchError;
        setLogs(data as SystemLog[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch logs");
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();

    channel = supabase
      .channel("system_logs_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "system_logs" },
        (payload) => {
          setLogs((prev) => [payload.new as SystemLog, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    return () => {
      channel?.unsubscribe();
    };
  }, []);

  return { logs, loading, error };
}

// Hook for telemetry data points
export function useTelemetryData(metricType: string, limit = 60) {
  const [data, setData] = useState<TelemetryDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let channel: RealtimeChannel;

    const fetchData = async () => {
      try {
        const { data: fetchedData, error } = await supabase
          .from("telemetry_data")
          .select("*")
          .eq("metric_type", metricType)
          .order("timestamp", { ascending: false })
          .limit(limit);

        if (error) throw error;
        setData((fetchedData as TelemetryDataPoint[]).reverse());
      } catch {
        console.error("Failed to fetch telemetry data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    channel = supabase
      .channel(`telemetry_${metricType}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "telemetry_data",
          filter: `metric_type=eq.${metricType}`,
        },
        (payload) => {
          setData((prev) => [...prev, payload.new as TelemetryDataPoint].slice(-limit));
        }
      )
      .subscribe();

    return () => {
      channel?.unsubscribe();
    };
  }, [metricType, limit]);

  return { data, loading };
}
