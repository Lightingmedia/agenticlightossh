
-- Restrict SELECT on operational tables to authenticated users only
DO $$
DECLARE
  t text;
  tables text[] := ARRAY['agents','gpu_metrics','inference_tasks','llm_deployments','llm_deployment_logs','system_logs','telemetry_data','thermal_zones','testers'];
  pol record;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname='public' AND tablename=t AND cmd='SELECT'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;
    EXECUTE format('CREATE POLICY "Authenticated can view %I" ON public.%I FOR SELECT TO authenticated USING (true)', t, t);
  END LOOP;
END $$;
