
-- Fix function search path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Tighten INSERT policies to require authentication
DROP POLICY IF EXISTS "Service can insert agents" ON public.agents;
CREATE POLICY "Authenticated can insert agents"
  ON public.agents FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service can insert GPU metrics" ON public.gpu_metrics;
CREATE POLICY "Authenticated can insert GPU metrics"
  ON public.gpu_metrics FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service can insert inference tasks" ON public.inference_tasks;
CREATE POLICY "Authenticated can insert inference tasks"
  ON public.inference_tasks FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service can insert system logs" ON public.system_logs;
CREATE POLICY "Authenticated can insert system logs"
  ON public.system_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service can insert telemetry data" ON public.telemetry_data;
CREATE POLICY "Authenticated can insert telemetry data"
  ON public.telemetry_data FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Tighten UPDATE policies to require authentication
DROP POLICY IF EXISTS "Service can update agents" ON public.agents;
CREATE POLICY "Authenticated can update agents"
  ON public.agents FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Service can update GPU metrics" ON public.gpu_metrics;
CREATE POLICY "Authenticated can update GPU metrics"
  ON public.gpu_metrics FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Service can update inference tasks" ON public.inference_tasks;
CREATE POLICY "Authenticated can update inference tasks"
  ON public.inference_tasks FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Service can update thermal zones" ON public.thermal_zones;
CREATE POLICY "Authenticated can update thermal zones"
  ON public.thermal_zones FOR UPDATE
  TO authenticated
  USING (true);
