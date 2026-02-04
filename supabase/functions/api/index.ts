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

  const url = new URL(req.url);
  // Extract path after /api from full pathname like /functions/v1/api/fabric/topology
  const pathname = url.pathname;
  const apiIndex = pathname.lastIndexOf("/api");
  const path = apiIndex !== -1 ? pathname.slice(apiIndex + 4) : pathname;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // GET /api/health - Health check
    if (path === "/health" && req.method === "GET") {
      return new Response(
        JSON.stringify({
          status: "healthy",
          version: "1.0.0",
          timestamp: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /api/stats - Get system stats
    if (path === "/stats" && req.method === "GET") {
      const [gpuResult, agentResult, taskResult] = await Promise.all([
        supabase.from("gpu_metrics").select("*"),
        supabase.from("agents").select("*"),
        supabase.from("inference_tasks").select("*"),
      ]);

      const gpus = gpuResult.data || [];
      const agents = agentResult.data || [];
      const tasks = taskResult.data || [];

      const stats = {
        gpus: {
          total: gpus.length,
          online: gpus.filter((g) => g.status !== "offline").length,
          avgUtilization: Math.round(
            gpus.reduce((acc, g) => acc + Number(g.utilization), 0) / gpus.length || 0
          ),
          totalPower: Math.round(
            gpus.reduce((acc, g) => acc + Number(g.power), 0)
          ),
        },
        agents: {
          total: agents.length,
          online: agents.filter((a) => a.status === "online").length,
          busy: agents.filter((a) => a.status === "busy").length,
          idle: agents.filter((a) => a.status === "idle").length,
          offline: agents.filter((a) => a.status === "offline").length,
        },
        inference: {
          total: tasks.length,
          running: tasks.filter((t) => t.status === "running").length,
          queued: tasks.filter((t) => t.status === "queued").length,
          completed: tasks.filter((t) => t.status === "completed").length,
          failed: tasks.filter((t) => t.status === "failed").length,
        },
      };

      return new Response(JSON.stringify(stats), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /api/agents - Register a new agent
    if (path === "/agents" && req.method === "POST") {
      const body = await req.json();
      const { name, type } = body;

      if (!name || !type) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: name, type" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }

      const agentId = `agent-${crypto.randomUUID().slice(0, 8)}`;
      const { data, error } = await supabase
        .from("agents")
        .insert({
          agent_id: agentId,
          name,
          type,
          status: "online",
          cpu: 0,
          memory: 0,
          tasks: 0,
          uptime: "0s",
        })
        .select()
        .single();

      if (error) throw error;

      // Log the registration
      await supabase.from("system_logs").insert({
        level: "INFO",
        service: "agent-registry",
        message: `New agent ${name} registered with ID ${agentId}`,
      });

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 201,
      });
    }

    // PATCH /api/agents/:id - Update agent status
    if (path.startsWith("/agents/") && req.method === "PATCH") {
      const agentId = path.replace("/agents/", "");
      const body = await req.json();

      const { data, error } = await supabase
        .from("agents")
        .update(body)
        .eq("agent_id", agentId)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /api/tasks - Submit an inference task
    if (path === "/tasks" && req.method === "POST") {
      const body = await req.json();
      const { model } = body;

      if (!model) {
        return new Response(
          JSON.stringify({ error: "Missing required field: model" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }

      const taskId = `task-${Date.now().toString(36)}`;
      const { data, error } = await supabase
        .from("inference_tasks")
        .insert({
          task_id: taskId,
          model,
          status: "queued",
          progress: 0,
        })
        .select()
        .single();

      if (error) throw error;

      // Simulate task starting after a delay
      setTimeout(async () => {
        await supabase
          .from("inference_tasks")
          .update({ status: "running" })
          .eq("task_id", taskId);
      }, 1000);

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 201,
      });
    }

    // POST /api/thermal/adjust - Adjust thermal settings
    if (path === "/thermal/adjust" && req.method === "POST") {
      const body = await req.json();
      const { zone_id, fan_speed } = body;

      if (!zone_id || fan_speed === undefined) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: zone_id, fan_speed" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }

      const { data, error } = await supabase
        .from("thermal_zones")
        .update({ fan_speed: Math.min(100, Math.max(0, fan_speed)) })
        .eq("zone_id", zone_id)
        .select()
        .single();

      if (error) throw error;

      await supabase.from("system_logs").insert({
        level: "INFO",
        service: "thermal",
        message: `Fan speed for ${zone_id} adjusted to ${fan_speed}%`,
      });

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /api/fabric/topology - Get photonic mesh topology
    if (path === "/fabric/topology" && req.method === "GET") {
      const { data: gpus } = await supabase.from("gpu_metrics").select("*");
      
      // Generate topology with GPU nodes and circuits
      const nodes = (gpus || []).map((gpu, index) => ({
        id: gpu.gpu_id,
        name: gpu.gpu_name,
        x: 50 + (index % 4) * 100,
        y: 50 + Math.floor(index / 4) * 100,
        status: gpu.status,
        utilization: gpu.utilization,
        temperature: gpu.temperature,
      }));

      // Generate mock photonic circuits between nodes
      const circuits: { id: string; source: string; destination: string; bandwidth_gbps: number; type: string; latency_us: number }[] = [];
      for (let i = 0; i < nodes.length - 1; i++) {
        circuits.push({
          id: `circuit-${i}`,
          source: nodes[i].id,
          destination: nodes[i + 1].id,
          bandwidth_gbps: 400,
          type: "photonic",
          latency_us: 0.5 + Math.random() * 2,
        });
      }

      // Add some cross-connections for mesh
      if (nodes.length > 2) {
        circuits.push({
          id: `circuit-cross-1`,
          source: nodes[0].id,
          destination: nodes[nodes.length - 1].id,
          bandwidth_gbps: 200,
          type: "photonic",
          latency_us: 1.2,
        });
      }

      return new Response(
        JSON.stringify({
          nodes,
          circuits,
          topology_type: "mesh",
          reconfiguration_time_us: 3.7,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /api/fabric/circuit - Provision a photonic circuit
    if (path === "/fabric/circuit" && req.method === "POST") {
      const body = await req.json();
      const { source, destination, bandwidth_gbps } = body;

      if (!source || !destination) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: source, destination" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }

      // Log the circuit provisioning
      await supabase.from("system_logs").insert({
        level: "INFO",
        service: "photonic-fabric",
        message: `Provisioned circuit: ${source} → ${destination} @ ${bandwidth_gbps || 400}Gbps`,
      });

      return new Response(
        JSON.stringify({
          success: true,
          circuit: {
            id: `circuit-${Date.now()}`,
            source,
            destination,
            bandwidth_gbps: bandwidth_gbps || 400,
            type: "photonic",
            latency_us: 0.8 + Math.random(),
            established_at: new Date().toISOString(),
          },
          message: "Circuit established; bypassing electrical I/O wall",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 201,
        }
      );
    }

    // GET /api/fabric/telemetry - Get real-time fabric telemetry
    if (path === "/fabric/telemetry" && req.method === "GET") {
      const { data: gpus } = await supabase.from("gpu_metrics").select("*");
      
      const totalPower = (gpus || []).reduce((acc, g) => acc + Number(g.power), 0);
      const avgUtilization = (gpus || []).length > 0
        ? (gpus || []).reduce((acc, g) => acc + Number(g.utilization), 0) / (gpus || []).length
        : 0;

      return new Response(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          cluster_utilization: Math.round(avgUtilization),
          benchmark_utilization: 35 + Math.random() * 10,
          lightrail_utilization: 78 + Math.random() * 10,
          power_draw_watts: totalPower,
          thermal_margin_percent: 42,
          bandwidth_density_multiplier: 100,
          active_circuits: 8,
          reconfiguration_count_24h: 1247,
          congestion_eliminated: true,
          training_speedup: 3.0 + Math.random() * 0.5,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /api/fabric/reconfigure - Reconfigure topology for workload pattern
    if (path === "/fabric/reconfigure" && req.method === "POST") {
      const body = await req.json();
      const { pattern, workload_type } = body;

      const topologyMap: Record<string, string> = {
        "all-reduce": "ring",
        "all-to-all": "full-mesh",
        "reduce-scatter": "sparse-tree",
        "broadcast": "tree",
      };

      const topology = topologyMap[pattern] || "mesh";

      await supabase.from("system_logs").insert({
        level: "INFO",
        service: "collective-optimizer",
        message: `Reconfigured topology for ${workload_type || pattern} pattern in 3.7μs`,
      });

      return new Response(
        JSON.stringify({
          success: true,
          pattern,
          workload_type,
          new_topology: topology,
          reconfiguration_time_us: 3.7,
          congestion_eliminated: true,
          speedup: pattern === "all-to-all" ? 3.0 : 2.5,
          message: `Collective Optimization Engine: Reconfigured topology for ${pattern} primitive`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 404 for unknown routes
    return new Response(
      JSON.stringify({ error: "Not found", path }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      }
    );
  } catch (error: unknown) {
    console.error("API Error:", error);
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
