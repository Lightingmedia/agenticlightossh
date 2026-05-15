import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = auth.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) return json({ error: "unauthorized" }, 401);
    const userId = userData.user.id;

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("profiles")
        .select("desktop_page")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) return json({ error: error.message }, 500);
      return json({ desktop_page: data?.desktop_page ?? 0 });
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const page = Number(body?.desktop_page);
      if (!Number.isInteger(page) || page < 0 || page > 10) {
        return json({ error: "invalid desktop_page" }, 400);
      }
      const { error } = await supabase
        .from("profiles")
        .update({ desktop_page: page })
        .eq("user_id", userId);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, desktop_page: page });
    }

    return json({ error: "method not allowed" }, 405);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
