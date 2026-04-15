import { supabase } from "@/integrations/supabase/client";

export interface SystemStats {
  gpus: {
    total: number;
    online: number;
    avgUtilization: number;
    totalPower: number;
  };
  agents: {
    total: number;
    online: number;
    busy: number;
    idle: number;
    offline: number;
  };
  inference: {
    total: number;
    running: number;
    queued: number;
    completed: number;
    failed: number;
  };
}

export async function getHealthStatus() {
  const { error } = await supabase.from("system_logs").select("id").limit(1);
  if (error) throw new Error("Backend connection failed");
  return { status: "healthy", timestamp: new Date().toISOString() };
}

export async function getSystemStats(): Promise<SystemStats> {
  const [gpuRes, agentRes, taskRes] = await Promise.all([
    supabase.from("gpu_metrics").select("*"),
    supabase.from("agents").select("*"),
    supabase.from("inference_tasks").select("*"),
  ]);

  const gpus = gpuRes.data ?? [];
  const agents = agentRes.data ?? [];
  const tasks = taskRes.data ?? [];

  return {
    gpus: {
      total: gpus.length,
      online: gpus.filter((g) => g.status === "online" || g.status === "busy").length,
      avgUtilization: gpus.length > 0 ? gpus.reduce((s, g) => s + Number(g.utilization), 0) / gpus.length : 0,
      totalPower: gpus.reduce((s, g) => s + Number(g.power), 0),
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
}

export async function registerAgent(name: string, type: string) {
  const agentData = {
    agent_id: `agent-${Date.now()}`,
    name,
    type,
    status: "online",
    cpu: 0,
    memory: 0,
    tasks: 0,
    uptime: "0s",
  };

  const { data, error } = await supabase.from("agents").insert(agentData).select().single();
  if (error) throw new Error("Failed to register agent");
  return data;
}

export async function updateAgentStatus(agentId: string, updates: Record<string, unknown>) {
  const { error } = await supabase.from("agents").update(updates).eq("id", agentId);
  if (error) throw new Error("Failed to update agent");
  return { success: true };
}

export async function submitInferenceTask(model: string) {
  const taskData = {
    task_id: `task-${Date.now()}`,
    model,
    status: "queued",
    progress: 0,
    tokens: null,
    duration: null,
  };

  const { data, error } = await supabase.from("inference_tasks").insert(taskData).select().single();
  if (error) throw new Error("Failed to submit task");
  return data;
}

export async function adjustThermal(zoneId: string, fanSpeed: number) {
  const { error } = await supabase
    .from("thermal_zones")
    .update({ fan_speed: fanSpeed })
    .eq("zone_id", zoneId);
  if (error) throw new Error("Failed to adjust thermal settings");
  return { success: true, zone_id: zoneId, fan_speed: fanSpeed };
}

export async function triggerTelemetryUpdate() {
  const { error } = await supabase.from("system_logs").insert({
    level: "INFO",
    service: "telemetry-simulator",
    message: "Telemetry update triggered",
  });
  if (error) throw new Error("Failed to trigger telemetry update");
  return { success: true, message: "Telemetry update triggered" };
}

// Fabric API

export interface TopologyNode {
  id: string;
  name: string;
  x: number;
  y: number;
  status: string;
  utilization: number;
  temperature: number;
}

export interface PhotonicCircuit {
  id: string;
  source: string;
  destination: string;
  bandwidth_gbps: number;
  type: string;
  latency_us: number;
}

export interface FabricTopology {
  nodes: TopologyNode[];
  circuits: PhotonicCircuit[];
  topology_type: string;
  reconfiguration_time_us: number;
}

export interface FabricTelemetry {
  timestamp: string;
  cluster_utilization: number;
  benchmark_utilization: number;
  lightrail_utilization: number;
  power_draw_watts: number;
  thermal_margin_percent: number;
  bandwidth_density_multiplier: number;
  active_circuits: number;
  reconfiguration_count_24h: number;
  congestion_eliminated: boolean;
  training_speedup: number;
}

const mockTopology: FabricTopology = {
  nodes: [
    { id: "node-1", name: "GPU Node 1", x: 100, y: 100, status: "online", utilization: 85.3, temperature: 72.5 },
    { id: "node-2", name: "GPU Node 2", x: 300, y: 100, status: "online", utilization: 91.2, temperature: 74.8 },
    { id: "node-3", name: "GPU Node 3", x: 500, y: 100, status: "online", utilization: 78.6, temperature: 69.3 },
    { id: "node-4", name: "GPU Node 4", x: 700, y: 100, status: "online", utilization: 88.9, temperature: 73.1 },
    { id: "node-5", name: "Switch 1", x: 200, y: 250, status: "online", utilization: 45.2, temperature: 55.0 },
    { id: "node-6", name: "Switch 2", x: 600, y: 250, status: "online", utilization: 52.1, temperature: 57.2 },
    { id: "node-7", name: "Storage 1", x: 100, y: 400, status: "online", utilization: 62.5, temperature: 48.3 },
    { id: "node-8", name: "Storage 2", x: 700, y: 400, status: "online", utilization: 58.7, temperature: 49.1 },
  ],
  circuits: [
    { id: "circuit-1", source: "node-1", destination: "node-5", bandwidth_gbps: 400, type: "photonic", latency_us: 8.2 },
    { id: "circuit-2", source: "node-2", destination: "node-5", bandwidth_gbps: 400, type: "photonic", latency_us: 7.9 },
    { id: "circuit-3", source: "node-3", destination: "node-6", bandwidth_gbps: 400, type: "photonic", latency_us: 8.5 },
    { id: "circuit-4", source: "node-4", destination: "node-6", bandwidth_gbps: 400, type: "photonic", latency_us: 8.1 },
    { id: "circuit-5", source: "node-5", destination: "node-6", bandwidth_gbps: 800, type: "photonic", latency_us: 6.3 },
    { id: "circuit-6", source: "node-5", destination: "node-7", bandwidth_gbps: 200, type: "photonic", latency_us: 9.7 },
    { id: "circuit-7", source: "node-6", destination: "node-8", bandwidth_gbps: 200, type: "photonic", latency_us: 9.4 },
  ],
  topology_type: "photonic-mesh",
  reconfiguration_time_us: 100,
};

export async function getFabricTopology(): Promise<FabricTopology> {
  return mockTopology;
}

export async function getFabricTelemetry(): Promise<FabricTelemetry> {
  return {
    timestamp: new Date().toISOString(),
    cluster_utilization: 82.4,
    benchmark_utilization: 76.1,
    lightrail_utilization: 88.5,
    power_draw_watts: 2840,
    thermal_margin_percent: 24.6,
    bandwidth_density_multiplier: 3.2,
    active_circuits: 7,
    reconfiguration_count_24h: 14,
    congestion_eliminated: true,
    training_speedup: 2.8,
  };
}

export async function provisionCircuit(source: string, destination: string, bandwidth_gbps?: number) {
  await supabase.from("system_logs").insert({
    level: "INFO",
    service: "fabric-controller",
    message: `Circuit provisioned: ${source} → ${destination} at ${bandwidth_gbps || 400} Gbps`,
  });
  return {
    id: `circuit-${Date.now()}`,
    source,
    destination,
    bandwidth_gbps: bandwidth_gbps || 400,
    type: "photonic",
    latency_us: Math.random() * 10 + 5,
  };
}

export async function reconfigureTopology(pattern: string, workload_type?: string) {
  await supabase.from("system_logs").insert({
    level: "INFO",
    service: "fabric-controller",
    message: `Topology reconfigured to ${pattern} for ${workload_type || "general"} workload`,
  });
  return { success: true, pattern, workload_type, reconfiguration_time_us: 100 };
}
