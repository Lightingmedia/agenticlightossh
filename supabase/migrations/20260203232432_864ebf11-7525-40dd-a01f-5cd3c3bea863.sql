-- Create table for GPU metrics (real-time telemetry)
CREATE TABLE public.gpu_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gpu_id TEXT NOT NULL,
  gpu_name TEXT NOT NULL,
  utilization NUMERIC NOT NULL DEFAULT 0,
  temperature NUMERIC NOT NULL DEFAULT 0,
  power NUMERIC NOT NULL DEFAULT 0,
  memory_used NUMERIC NOT NULL DEFAULT 0,
  memory_total NUMERIC NOT NULL DEFAULT 80,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'busy', 'idle', 'offline')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for agents
CREATE TABLE public.agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'busy', 'idle', 'offline')),
  cpu NUMERIC NOT NULL DEFAULT 0,
  memory NUMERIC NOT NULL DEFAULT 0,
  tasks INTEGER NOT NULL DEFAULT 0,
  uptime TEXT NOT NULL DEFAULT '0s',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for telemetry data points
CREATE TABLE public.telemetry_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_type TEXT NOT NULL, -- 'latency', 'throughput', 'error_rate', 'network_in', 'network_out'
  value NUMERIC NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for inference tasks
CREATE TABLE public.inference_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id TEXT NOT NULL UNIQUE,
  model TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  progress INTEGER DEFAULT 0,
  tokens INTEGER,
  duration TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for thermal zones
CREATE TABLE public.thermal_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  temperature NUMERIC NOT NULL DEFAULT 0,
  fan_speed NUMERIC NOT NULL DEFAULT 0,
  throttling BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for system logs
CREATE TABLE public.system_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level TEXT NOT NULL DEFAULT 'INFO' CHECK (level IN ('DEBUG', 'INFO', 'WARN', 'ERROR')),
  service TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables (public read access for dashboard)
ALTER TABLE public.gpu_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inference_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thermal_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (dashboard viewing)
CREATE POLICY "Anyone can view GPU metrics" ON public.gpu_metrics FOR SELECT USING (true);
CREATE POLICY "Anyone can view agents" ON public.agents FOR SELECT USING (true);
CREATE POLICY "Anyone can view telemetry data" ON public.telemetry_data FOR SELECT USING (true);
CREATE POLICY "Anyone can view inference tasks" ON public.inference_tasks FOR SELECT USING (true);
CREATE POLICY "Anyone can view thermal zones" ON public.thermal_zones FOR SELECT USING (true);
CREATE POLICY "Anyone can view system logs" ON public.system_logs FOR SELECT USING (true);

-- Create policies for insert/update via edge functions (using service role)
CREATE POLICY "Service can insert GPU metrics" ON public.gpu_metrics FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can update GPU metrics" ON public.gpu_metrics FOR UPDATE USING (true);
CREATE POLICY "Service can insert agents" ON public.agents FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can update agents" ON public.agents FOR UPDATE USING (true);
CREATE POLICY "Service can insert telemetry data" ON public.telemetry_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can insert inference tasks" ON public.inference_tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can update inference tasks" ON public.inference_tasks FOR UPDATE USING (true);
CREATE POLICY "Service can insert thermal zones" ON public.thermal_zones FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can update thermal zones" ON public.thermal_zones FOR UPDATE USING (true);
CREATE POLICY "Service can insert system logs" ON public.system_logs FOR INSERT WITH CHECK (true);

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.gpu_metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.telemetry_data;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inference_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.thermal_zones;
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_logs;

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_gpu_metrics_updated_at BEFORE UPDATE ON public.gpu_metrics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_inference_tasks_updated_at BEFORE UPDATE ON public.inference_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_thermal_zones_updated_at BEFORE UPDATE ON public.thermal_zones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert seed data for GPUs
INSERT INTO public.gpu_metrics (gpu_id, gpu_name, utilization, temperature, power, memory_used, memory_total, status) VALUES
  ('gpu-node-7', 'NVIDIA A100', 87, 72, 312, 68, 80, 'busy'),
  ('gpu-node-12', 'NVIDIA H100', 45, 58, 280, 45, 80, 'online'),
  ('gpu-node-3', 'NVIDIA A100', 92, 78, 350, 72, 80, 'busy'),
  ('gpu-edge-1', 'NVIDIA RTX 4090', 23, 45, 180, 8, 24, 'idle'),
  ('gpu-node-15', 'NVIDIA A100', 0, 35, 50, 0, 80, 'offline'),
  ('gpu-node-18', 'NVIDIA H100', 67, 65, 310, 58, 80, 'online');

-- Insert seed data for agents
INSERT INTO public.agents (agent_id, name, type, status, cpu, memory, tasks, uptime) VALUES
  ('agent-001-xyz', 'node-gpu-7', 'GPU Worker (A100)', 'online', 45, 78, 142, '7d 12h'),
  ('agent-002-abc', 'node-gpu-12', 'GPU Worker (H100)', 'busy', 92, 85, 89, '3d 8h'),
  ('agent-003-def', 'node-cpu-3', 'CPU Worker', 'online', 34, 45, 234, '14d 2h'),
  ('agent-004-ghi', 'edge-laptop-1', 'Edge Device (RTX 4090)', 'idle', 5, 23, 12, '1d 4h'),
  ('agent-005-jkl', 'node-gpu-15', 'GPU Worker (A100)', 'offline', 0, 0, 0, '—'),
  ('agent-006-mno', 'worker-east-12', 'GPU Worker (H100)', 'online', 67, 72, 78, '2d 18h'),
  ('agent-007-pqr', 'node-inference-1', 'Inference Node', 'busy', 88, 91, 456, '21d 6h'),
  ('agent-008-stu', 'edge-workstation-2', 'Edge Device (RTX 3090)', 'online', 28, 35, 45, '5d 14h');

-- Insert seed data for thermal zones
INSERT INTO public.thermal_zones (zone_id, name, temperature, fan_speed, throttling) VALUES
  ('zone-1', 'GPU Cluster A', 72, 75, false),
  ('zone-2', 'GPU Cluster B', 78, 85, false),
  ('zone-3', 'CPU Rack 1', 58, 45, false),
  ('zone-4', 'GPU Cluster C', 85, 100, true);

-- Insert seed data for inference tasks
INSERT INTO public.inference_tasks (task_id, model, status, progress, tokens, duration) VALUES
  ('task-001', 'llama-3.1-70b', 'running', 67, NULL, NULL),
  ('task-002', 'mistral-7b-v0.3', 'running', 23, NULL, NULL),
  ('task-003', 'codellama-34b', 'queued', 0, NULL, NULL),
  ('task-004', 'mixtral-8x7b', 'completed', 100, 1247, '1.2s'),
  ('task-005', 'llama-3.1-8b', 'completed', 100, 892, '0.8s');

-- Insert sample system logs
INSERT INTO public.system_logs (level, service, message) VALUES
  ('INFO', 'inference', 'Request completed in 34ms'),
  ('WARN', 'scheduler', 'Queue depth exceeding threshold'),
  ('INFO', 'agent-registry', 'Agent node-gpu-7 heartbeat received'),
  ('ERROR', 'model-loader', 'Failed to load model weights, retrying...'),
  ('INFO', 'inference', 'Batch processed: 24 requests'),
  ('DEBUG', 'thermal', 'Fan speed adjusted to 75%');