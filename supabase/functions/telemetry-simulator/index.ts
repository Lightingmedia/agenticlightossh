import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Simulate GPU metric updates
    const { data: gpus } = await supabase.from("gpu_metrics").select("id, gpu_id, status");

    if (gpus) {
      for (const gpu of gpus) {
        if (gpu.status !== "offline") {
          const newUtilization = Math.min(100, Math.max(0, 50 + Math.random() * 50));
          const baseTemp = gpu.status === "busy" ? 70 : 55;
          const newTemp = baseTemp + Math.random() * 15;
          const newPower = 200 + Math.random() * 150;
          const newMemory = 30 + Math.random() * 40;

          await supabase
            .from("gpu_metrics")
            .update({
              utilization: Math.round(newUtilization),
              temperature: Math.round(newTemp),
              power: Math.round(newPower),
              memory_used: Math.round(newMemory),
            })
            .eq("id", gpu.id);
        }
      }
    }

    // Simulate agent updates
    const { data: agents } = await supabase.from("agents").select("id, agent_id, status");

    if (agents) {
      for (const agent of agents) {
        if (agent.status !== "offline") {
          const newCpu = Math.round(20 + Math.random() * 70);
          const newMemory = Math.round(30 + Math.random() * 60);
          const newTasks = Math.round(Math.random() * 10);

          await supabase
            .from("agents")
            .update({
              cpu: newCpu,
              memory: newMemory,
              tasks: newTasks,
            })
            .eq("id", agent.id);
        }
      }
    }

    // Simulate thermal zone updates
    const { data: zones } = await supabase.from("thermal_zones").select("id, zone_id");

    if (zones) {
      for (const zone of zones) {
        const newTemp = 50 + Math.random() * 40;
        const throttling = newTemp > 80;
        const fanSpeed = Math.min(100, Math.round(newTemp * 1.2));

        await supabase
          .from("thermal_zones")
          .update({
            temperature: Math.round(newTemp),
            fan_speed: fanSpeed,
            throttling,
          })
          .eq("id", zone.id);
      }
    }

    // Insert new telemetry data points
    const metrics = ["latency", "throughput", "error_rate", "network_in", "network_out"];
    const telemetryInserts = metrics.map((metricType) => ({
      metric_type: metricType,
      value:
        metricType === "latency"
          ? 20 + Math.random() * 40
          : metricType === "throughput"
          ? 1000 + Math.random() * 2000
          : metricType === "error_rate"
          ? Math.random() * 2
          : 50 + Math.random() * 200,
    }));

    await supabase.from("telemetry_data").insert(telemetryInserts);

    // Add a system log
    const logLevels = ["INFO", "DEBUG", "WARN"] as const;
    const services = ["inference", "scheduler", "agent-registry", "thermal", "model-loader"];
    const messages = [
      "Request processed successfully",
      "Heartbeat received from agent",
      "Batch inference completed",
      "Cache hit ratio improved",
      "Memory optimized for new workload",
    ];

    await supabase.from("system_logs").insert({
      level: logLevels[Math.floor(Math.random() * logLevels.length)],
      service: services[Math.floor(Math.random() * services.length)],
      message: messages[Math.floor(Math.random() * messages.length)],
    });

    // Update inference task progress
    const { data: runningTasks } = await supabase
      .from("inference_tasks")
      .select("id, progress")
      .eq("status", "running");

    if (runningTasks) {
      for (const task of runningTasks) {
        const currentProgress = task.progress || 0;
        const newProgress = Math.min(100, currentProgress + Math.round(Math.random() * 15));

        if (newProgress >= 100) {
          await supabase
            .from("inference_tasks")
            .update({
              progress: 100,
              status: "completed",
              tokens: Math.round(800 + Math.random() * 1000),
              duration: `${(0.5 + Math.random() * 2).toFixed(1)}s`,
            })
            .eq("id", task.id);
        } else {
          await supabase
            .from("inference_tasks")
            .update({ progress: newProgress })
            .eq("id", task.id);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Telemetry updated" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
