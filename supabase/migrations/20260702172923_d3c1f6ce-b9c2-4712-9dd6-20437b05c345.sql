
-- Restrict testers SELECT to admins only
DROP POLICY IF EXISTS "Authenticated can view testers" ON public.testers;
CREATE POLICY "Admins can view testers"
  ON public.testers
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Tighten SECURITY DEFINER function exposure via the Data API.
-- has_role stays executable by authenticated because RLS policies invoke it.
REVOKE ALL ON FUNCTION public.has_active_subscription(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) TO service_role;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role, supabase_auth_admin;
