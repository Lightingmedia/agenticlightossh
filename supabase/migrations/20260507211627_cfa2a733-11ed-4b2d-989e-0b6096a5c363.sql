-- Tighten GRANTs on SECURITY DEFINER and helper functions to least privilege.

-- handle_new_user: trigger only. Revoke from everyone.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated, service_role;

-- update_updated_at_column: trigger only. Revoke from everyone.
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated, service_role;

-- has_role: used in RLS policies (runs as definer regardless) and may be called via rpc by authenticated users for their own checks.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- has_active_subscription: used in app to gate features for the logged-in user.
REVOKE ALL ON FUNCTION public.has_active_subscription(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) TO authenticated, service_role;