
-- Drop existing permissive write policies and replace with admin-only writes
DO $$
DECLARE
  t text;
  ops text[] := ARRAY['INSERT','UPDATE','DELETE'];
  op text;
  tables text[] := ARRAY['agents','gpu_metrics','inference_tasks','llm_deployments','llm_deployment_logs','system_logs','telemetry_data','thermal_zones','testers'];
  pol record;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    FOR pol IN
      SELECT policyname, cmd FROM pg_policies
      WHERE schemaname='public' AND tablename=t AND cmd IN ('INSERT','UPDATE','DELETE','ALL')
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY "Admins can insert %1$I" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), ''admin''::app_role))',
      t
    );
    EXECUTE format(
      'CREATE POLICY "Admins can update %1$I" ON public.%1$I FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), ''admin''::app_role)) WITH CHECK (public.has_role(auth.uid(), ''admin''::app_role))',
      t
    );
    EXECUTE format(
      'CREATE POLICY "Admins can delete %1$I" ON public.%1$I FOR DELETE TO authenticated USING (public.has_role(auth.uid(), ''admin''::app_role))',
      t
    );
  END LOOP;
END $$;

-- subscriptions: replace permissive ALL service-role policy with explicit INSERT/UPDATE/DELETE for service_role only
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscriptions;

CREATE POLICY "Service role can insert subscriptions"
  ON public.subscriptions FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update subscriptions"
  ON public.subscriptions FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete subscriptions"
  ON public.subscriptions FOR DELETE
  TO service_role
  USING (true);
