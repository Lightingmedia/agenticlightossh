DROP POLICY IF EXISTS "Authenticated can view gpu_metrics" ON public.gpu_metrics;
DROP POLICY IF EXISTS "Authenticated can view telemetry_data" ON public.telemetry_data;
DROP POLICY IF EXISTS "Authenticated can view system_logs" ON public.system_logs;
CREATE POLICY "Admins can view gpu_metrics" ON public.gpu_metrics FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view telemetry_data" ON public.telemetry_data FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view system_logs" ON public.system_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));