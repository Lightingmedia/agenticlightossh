
-- LLM Deployments table
CREATE TABLE public.llm_deployments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'llama-3.1-405b',
  serving_mode TEXT NOT NULL DEFAULT 'standard',
  gpu_count INTEGER NOT NULL DEFAULT 8,
  data_parallel_size INTEGER NOT NULL DEFAULT 2,
  expert_parallelism BOOLEAN NOT NULL DEFAULT false,
  fault_tolerance BOOLEAN NOT NULL DEFAULT true,
  prometheus_enabled BOOLEAN NOT NULL DEFAULT true,
  tracing_enabled BOOLEAN NOT NULL DEFAULT true,
  log_level TEXT NOT NULL DEFAULT 'info',
  status TEXT NOT NULL DEFAULT 'pending',
  replicas INTEGER NOT NULL DEFAULT 1,
  revision INTEGER NOT NULL DEFAULT 1,
  latency_p50_ms NUMERIC,
  latency_p99_ms NUMERIC,
  throughput_tok_s NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.llm_deployments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view llm_deployments"
  ON public.llm_deployments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated can insert llm_deployments"
  ON public.llm_deployments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update llm_deployments"
  ON public.llm_deployments FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can delete llm_deployments"
  ON public.llm_deployments FOR DELETE
  TO authenticated
  USING (true);

CREATE TRIGGER update_llm_deployments_updated_at
  BEFORE UPDATE ON public.llm_deployments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- LLM Deployment Logs table
CREATE TABLE public.llm_deployment_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deployment_id UUID REFERENCES public.llm_deployments(id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.llm_deployment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view llm_deployment_logs"
  ON public.llm_deployment_logs FOR SELECT
  USING (true);

CREATE POLICY "Authenticated can insert llm_deployment_logs"
  ON public.llm_deployment_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.llm_deployments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.llm_deployment_logs;
