import { supabase } from "@/integrations/supabase/client";

const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api`;

async function getHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
}

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
  const headers = await getHeaders();
  const response = await fetch(`${API_BASE}/health`, { headers });
  if (!response.ok) throw new Error("API health check failed");
  return response.json();
}

export async function getSystemStats(): Promise<SystemStats> {
  const headers = await getHeaders();
  const response = await fetch(`${API_BASE}/stats`, { headers });
  if (!response.ok) throw new Error("Failed to fetch system stats");
  return response.json();
}

export async function registerAgent(name: string, type: string) {
  const headers = await getHeaders();
  const response = await fetch(`${API_BASE}/agents`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name, type }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to register agent");
  }
  return response.json();
}

export async function updateAgentStatus(agentId: string, updates: Record<string, unknown>) {
  const headers = await getHeaders();
  const response = await fetch(`${API_BASE}/agents/${agentId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update agent");
  }
  return response.json();
}

export async function submitInferenceTask(model: string) {
  const headers = await getHeaders();
  const response = await fetch(`${API_BASE}/tasks`, {
    method: "POST",
    headers,
    body: JSON.stringify({ model }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to submit task");
  }
  return response.json();
}

export async function adjustThermal(zoneId: string, fanSpeed: number) {
  const headers = await getHeaders();
  const response = await fetch(`${API_BASE}/thermal/adjust`, {
    method: "POST",
    headers,
    body: JSON.stringify({ zone_id: zoneId, fan_speed: fanSpeed }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to adjust thermal settings");
  }
  return response.json();
}

// Trigger telemetry simulation (for demo purposes)
export async function triggerTelemetryUpdate() {
  const headers = await getHeaders();
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telemetry-simulator`,
    {
      method: "POST",
      headers,
    }
  );
  if (!response.ok) throw new Error("Failed to trigger telemetry update");
  return response.json();
}
