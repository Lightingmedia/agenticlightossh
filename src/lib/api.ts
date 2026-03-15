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

    // If no data in Firestore, return mock topology
    if (nodes.length === 0 || circuits.length === 0) {
      console.log("No fabric topology in Firestore, using mock data");
      return {
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
    }

    return {
      nodes,
      circuits,
      topology_type: "photonic-mesh",
      reconfiguration_time_us: 100,
    };
  } catch (error) {
    console.error("Failed to fetch fabric topology from Firestore, using mock data:", error);
    // Return mock topology on error
    return {
      nodes: [
        { id: "node-1", name: "GPU Node 1", x: 100, y: 100, status: "online", utilization: 85.3, temperature: 72.5 },
        { id: "node-2", name: "GPU Node 2", x: 300, y: 100, status: "online", utilization: 91.2, temperature: 74.8 },
        { id: "node-3", name: "GPU Node 3", x: 500, y: 100, status: "online", utilization: 78.6, temperature: 69.3 },
        { id: "node-4", name: "GPU Node 4", x: 700, y: 100, status: "online", utilization: 88.9, temperature: 73.1 },
      ],
      circuits: [
        { id: "circuit-1", source: "node-1", destination: "node-2", bandwidth_gbps: 400, type: "photonic", latency_us: 8.2 },
        { id: "circuit-2", source: "node-2", destination: "node-3", bandwidth_gbps: 400, type: "photonic", latency_us: 7.9 },
        { id: "circuit-3", source: "node-3", destination: "node-4", bandwidth_gbps: 400, type: "photonic", latency_us: 8.5 },
      ],
      topology_type: "photonic-mesh",
      reconfiguration_time_us: 100,
    };
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
