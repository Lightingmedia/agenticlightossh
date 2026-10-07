DROP POLICY IF EXISTS "Authenticated can view inference_tasks" ON public.inference_tasks;
DROP POLICY IF EXISTS "Authenticated can view llm_deployments" ON public.llm_deployments;
DROP POLICY IF EXISTS "Authenticated can view thermal_zones" ON public.thermal_zones;
CREATE POLICY "Admins can view inference_tasks" ON public.inference_tasks FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view llm_deployments" ON public.llm_deployments FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view thermal_zones" ON public.thermal_zones FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));