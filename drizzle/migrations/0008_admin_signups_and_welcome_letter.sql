ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS welcome_letter_seen_at timestamptz;

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;