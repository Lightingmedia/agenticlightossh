DROP POLICY IF EXISTS "Authenticated can view agents" ON public.agents;
CREATE POLICY "Admins can view agents" ON public.agents FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.node_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  report jsonb,
  gateway_status text,
  gateway_message text,
  reported_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.node_enrollments TO authenticated;
GRANT ALL ON public.node_enrollments TO service_role;
ALTER TABLE public.node_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own enrollments" ON public.node_enrollments FOR SELECT TO authenticated USING (auth.uid() = user_id);