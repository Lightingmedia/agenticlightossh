import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GatewayMonitoring {
  configured: boolean;
  error?: string;
  observed_at?: string;
  entitlement?: { tier: string; gpu_limit: number | null; detected_devices: number; upgrade_required: boolean };
  capacity?: { reason?: string; totals?: { devices?: number } };
  telemetry?: { reason?: string; devices?: {
    uuid: string; node?: string; model?: string;
    gpu_util_pct?: { avg?: number | null };
    power_w?: { avg?: number | null };
    gpu_temp_c?: { max?: number | null };
  }[] };
}

export function useGatewayMonitoring() {
  const [data, setData] = useState<GatewayMonitoring | null>(null);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data: result, error } = await supabase.functions.invoke("gateway-telemetry");
      if (!alive) return;
      if (error) {
        let body: GatewayMonitoring | undefined;
        try { body = await (error as { context?: Response }).context?.json(); } catch { /* generic error */ }
        setData(body ?? { configured: true, error: "GPU readings are unavailable. Check your connection and retry." });
      } else setData(result as GatewayMonitoring);
    };
    load();
    const timer = window.setInterval(load, 15000);
    window.addEventListener("lightos:runtime-connection", load);
    return () => { alive = false; window.clearInterval(timer); window.removeEventListener("lightos:runtime-connection", load); };
  }, []);
  return data;
}