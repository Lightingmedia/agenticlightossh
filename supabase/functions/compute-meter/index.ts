// Scheduled meter: charges running GPU rentals for time used and stops any
// whose owner has run out of prepaid credit. Only the managed scheduler may call it.
import { createClient } from "npm:@supabase/supabase-js@2";
import { authenticateCronRequest } from "../_shared/cron-auth.ts";
import { meterRentals } from "../_shared/vast.ts";

Deno.serve(async (req) => {
  const denied = authenticateCronRequest(req);
  if (denied) return denied;
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const result = await meterRentals(admin);
    return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error("compute-meter error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
