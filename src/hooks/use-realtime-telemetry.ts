import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type GPUMetric = Tables<"gpu_metrics">;
export type Agent = Tables<"agents">;
export type ThermalZone = Tables<"thermal_zones">;
export type InferenceTask = Tables<"inference_tasks">;
export type SystemLog = Tables<"system_logs">;
export type TelemetryDataPoint = Tables<"telemetry_data">;

// Generic realtime hook
function useRealtimeTable<T extends { id: string }>(
  table: string,
  orderCol: string,
  ascending = true,
  limitCount?: number,
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initial fetch
    const fetchData = async () => {
      let q = supabase
        .from(table)
        .select("*")
        .order(orderCol, { ascending });

      if (limitCount) q = q.limit(limitCount);

      const { data: rows, error: err } = await q;
      if (err) {
        setError(err.message);
      } else {
        setData((rows ?? []) as T[]);
      }
      setLoading(false);
    };

    fetchData();

    // Realtime subscription
    const channel = supabase
      .channel(`realtime-${table}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          // Re-fetch on any change for simplicity
          fetchData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, orderCol, ascending, limitCount]);

  return { data, loading, error };
}

export function useRealtimeGPUs() {
  const { data, loading, error } = useRealtimeTable<GPUMetric>("gpu_metrics", "gpu_id");
  return { gpus: data, loading, error };
}

export function useRealtimeAgents() {
  const { data, loading, error } = useRealtimeTable<Agent>("agents", "name");
  return { agents: data, loading, error };
}

export function useRealtimeThermalZones() {
  const { data, loading, error } = useRealtimeTable<ThermalZone>("thermal_zones", "zone_id");
  return { zones: data, loading, error };
}

export function useRealtimeInferenceTasks() {
  const { data, loading, error } = useRealtimeTable<InferenceTask>("inference_tasks", "created_at", false, 20);
  return { tasks: data, loading, error };
}

export function useRealtimeSystemLogs() {
  const { data, loading, error } = useRealtimeTable<SystemLog>("system_logs", "created_at", false, 50);
  return { logs: data, loading, error };
}

export function useTelemetryData(metricType: string, limitCount = 60) {
  const [data, setData] = useState<TelemetryDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: rows } = await supabase
        .from("telemetry_data")
        .select("*")
        .eq("metric_type", metricType)
        .order("timestamp", { ascending: false })
        .limit(limitCount);

      setData(((rows ?? []) as TelemetryDataPoint[]).reverse());
      setLoading(false);
    };

    fetchData();

    const channel = supabase
      .channel(`realtime-telemetry-${metricType}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "telemetry_data" },
        () => fetchData(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [metricType, limitCount]);

  return { data, loading };
}
