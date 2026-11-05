// Client for the exchange-api edge function. All calls are authenticated;
// the server re-validates eligibility and computes cost estimates.
import { supabase } from "@/integrations/supabase/client";
import type { Offer, WorkloadSpec } from "./core";

export interface DbOffer {
  id: string;
  provider: string;
  region: string;
  accelerator: string;
  memory_gb: number;
  count: number;
  runtime: string;
  purchase_model: "on_demand" | "spot" | "reserved";
  price_per_hour: number | null;
  currency: string;
  min_commitment: string;
  kind: Offer["kind"];
  compliance: string | null;
  source: string;
  source_at: string;
}

export interface WorkloadEvent {
  status: string;
  note: string | null;
  created_at: string;
}

export interface Workload {
  id: string;
  offer_id: string;
  spec: WorkloadSpec;
  estimate_low: number;
  estimate_high: number;
  max_spend: number;
  currency: string;
  status: string;
  idempotency_key: string;
  expires_at: string;
  created_at: string;
  exchange_workload_events: WorkloadEvent[];
}

export function toOffer(row: DbOffer): Offer {
  return {
    id: row.id,
    provider: row.provider,
    region: row.region,
    accelerator: row.accelerator,
    memoryGb: row.memory_gb,
    count: row.count,
    runtime: row.runtime,
    purchaseModel: row.purchase_model,
    pricePerHour: row.price_per_hour == null ? null : Number(row.price_per_hour),
    currency: row.currency,
    minCommitment: row.min_commitment,
    sourceAt: row.source_at,
    kind: row.kind,
    compliance: row.compliance,
  };
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("exchange-api", { body });
  if (error) throw new Error(data?.error ?? error.message ?? "Exchange request failed");
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export const fetchCatalog = () => call<{ offers: DbOffer[] }>({ action: "catalog" });
export const fetchWorkloads = () => call<{ workloads: Workload[] }>({ action: "list" });
export const submitPlan = (offerId: string, spec: WorkloadSpec, idempotencyKey: string) =>
  call<{ workload: Pick<Workload, "id" | "status" | "estimate_low" | "estimate_high" | "max_spend" | "currency" | "expires_at">; note: string }>(
    { action: "plan", offer_id: offerId, spec, idempotency_key: idempotencyKey },
  );
export const cancelWorkload = (workloadId: string) =>
  call<{ status: string }>({ action: "cancel", workload_id: workloadId });
