import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  query,
  where,
  Timestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";

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
  // Simple health check - verify Firebase connection
  try {
    const testQuery = query(collection(db, "system_logs"));
    await getDocs(testQuery);
    return { status: "healthy", timestamp: new Date().toISOString() };
  } catch (error) {
    throw new Error("Firebase connection failed");
  }
}

export async function getSystemStats(): Promise<SystemStats> {
  try {
    // Fetch GPU metrics
    const gpuSnapshot = await getDocs(collection(db, "gpu_metrics"));
    const gpus = gpuSnapshot.docs.map(doc => doc.data());

    const gpuStats = {
      total: gpus.length,
      online: gpus.filter(g => g.status === "online" || g.status === "busy").length,
      avgUtilization: gpus.length > 0
        ? gpus.reduce((sum, g) => sum + (g.utilization || 0), 0) / gpus.length
        : 0,
      totalPower: gpus.reduce((sum, g) => sum + (g.power || 0), 0),
    };

    // Fetch agents
    const agentSnapshot = await getDocs(collection(db, "agents"));
    const agents = agentSnapshot.docs.map(doc => doc.data());

    const agentStats = {
      total: agents.length,
      online: agents.filter(a => a.status === "online").length,
      busy: agents.filter(a => a.status === "busy").length,
      idle: agents.filter(a => a.status === "idle").length,
      offline: agents.filter(a => a.status === "offline").length,
    };

    // Fetch inference tasks
    const taskSnapshot = await getDocs(collection(db, "inference_tasks"));
    const tasks = taskSnapshot.docs.map(doc => doc.data());

    const inferenceStats = {
      total: tasks.length,
      running: tasks.filter(t => t.status === "running").length,
      queued: tasks.filter(t => t.status === "queued").length,
      completed: tasks.filter(t => t.status === "completed").length,
      failed: tasks.filter(t => t.status === "failed").length,
    };

    return {
      gpus: gpuStats,
      agents: agentStats,
      inference: inferenceStats,
    };
  } catch (error) {
    throw new Error("Failed to fetch system stats");
  }
}

export async function registerAgent(name: string, type: string) {
  try {
    const agentData = {
      agent_id: `agent-${Date.now()}`,
      name,
      type,
      status: "online" as const,
      cpu: 0,
      memory: 0,
      tasks: 0,
      uptime: "0s",
      updated_at: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, "agents"), agentData);
    return { id: docRef.id, ...agentData };
  } catch (error) {
    throw new Error("Failed to register agent");
  }
}

export async function updateAgentStatus(agentId: string, updates: Record<string, unknown>) {
  try {
    const agentRef = doc(db, "agents", agentId);
    await updateDoc(agentRef, {
      ...updates,
      updated_at: new Date().toISOString(),
    });
    return { success: true };
  } catch (error) {
    throw new Error("Failed to update agent");
  }
}

export async function submitInferenceTask(model: string) {
  try {
    const taskData = {
      task_id: `task-${Date.now()}`,
      model,
      status: "queued" as const,
      progress: null,
      tokens: null,
      duration: null,
      created_at: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, "inference_tasks"), taskData);
    return { id: docRef.id, ...taskData };
  } catch (error) {
    throw new Error("Failed to submit task");
  }
}

export async function adjustThermal(zoneId: string, fanSpeed: number) {
  try {
    // Find the thermal zone by zone_id
    const q = query(collection(db, "thermal_zones"), where("zone_id", "==", zoneId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error("Thermal zone not found");
    }

    const zoneDoc = snapshot.docs[0];
    await updateDoc(doc(db, "thermal_zones", zoneDoc.id), {
      fan_speed: fanSpeed,
      updated_at: new Date().toISOString(),
    });

    return { success: true, zone_id: zoneId, fan_speed: fanSpeed };
  } catch (error) {
    throw new Error("Failed to adjust thermal settings");
  }
}

// Trigger telemetry simulation (for demo purposes)
export async function triggerTelemetryUpdate() {
  try {
    // Add a system log entry to indicate telemetry update
    await addDoc(collection(db, "system_logs"), {
      level: "INFO",
      service: "telemetry-simulator",
      message: "Telemetry update triggered",
      created_at: new Date().toISOString(),
    });
    return { success: true, message: "Telemetry update triggered" };
  } catch (error) {
    throw new Error("Failed to trigger telemetry update");
  }
}

// Fabric API - Photonic Mesh Topology

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

export async function getFabricTopology(): Promise<FabricTopology> {
  try {
    const nodesSnapshot = await getDocs(collection(db, "fabric_nodes"));
    const circuitsSnapshot = await getDocs(collection(db, "fabric_circuits"));

    const nodes = nodesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TopologyNode));
    const circuits = circuitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PhotonicCircuit));

    return {
      nodes,
      circuits,
      topology_type: "photonic-mesh",
      reconfiguration_time_us: 100,
    };
  } catch (error) {
    throw new Error("Failed to fetch fabric topology");
  }
}

export async function getFabricTelemetry(): Promise<FabricTelemetry> {
  try {
    const telemetrySnapshot = await getDocs(collection(db, "fabric_telemetry"));

    if (telemetrySnapshot.empty) {
      // Return default values if no telemetry data exists
      return {
        timestamp: new Date().toISOString(),
        cluster_utilization: 0,
        benchmark_utilization: 0,
        lightrail_utilization: 0,
        power_draw_watts: 0,
        thermal_margin_percent: 100,
        bandwidth_density_multiplier: 1,
        active_circuits: 0,
        reconfiguration_count_24h: 0,
        congestion_eliminated: false,
        training_speedup: 1,
      };
    }

    const latestDoc = telemetrySnapshot.docs[0];
    return latestDoc.data() as FabricTelemetry;
  } catch (error) {
    throw new Error("Failed to fetch fabric telemetry");
  }
}

export async function provisionCircuit(source: string, destination: string, bandwidth_gbps?: number) {
  try {
    const circuitData = {
      source,
      destination,
      bandwidth_gbps: bandwidth_gbps || 400,
      type: "photonic",
      latency_us: Math.random() * 10 + 5,
    };

    const docRef = await addDoc(collection(db, "fabric_circuits"), circuitData);
    return { id: docRef.id, ...circuitData };
  } catch (error) {
    throw new Error("Failed to provision circuit");
  }
}

export async function reconfigureTopology(pattern: string, workload_type?: string) {
  try {
    // Log the reconfiguration request
    await addDoc(collection(db, "system_logs"), {
      level: "INFO",
      service: "fabric-controller",
      message: `Topology reconfigured to ${pattern} for ${workload_type || 'general'} workload`,
      created_at: new Date().toISOString(),
    });

    return {
      success: true,
      pattern,
      workload_type,
      reconfiguration_time_us: 100
    };
  } catch (error) {
    throw new Error("Failed to reconfigure topology");
  }
}
