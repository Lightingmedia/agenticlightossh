import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export function useAdminAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    let checkedFor: string | null = null;

    const check = async (u: User | null) => {
      if (!u) {
        navigate("/auth");
        return;
      }
      if (checkedFor === u.id) return;
      checkedFor = u.id;
      setUser(u);
      const { data } = await supabase.rpc("has_role", { _user_id: u.id, _role: "admin" });
      if (!active) return;
      setIsAdmin(!!data);
      setLoading(false);
    };

    // Never await other auth/database calls inside the auth callback: it can deadlock the client.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setTimeout(() => { void check(session?.user ?? null); }, 0);
    });
    supabase.auth.getSession().then(({ data: { session } }) => check(session?.user ?? null));

    return () => { active = false; subscription.unsubscribe(); };
  }, [navigate]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return { user, isAdmin, loading, signOut };
}
