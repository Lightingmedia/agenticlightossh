CREATE TABLE public.exchange_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  region text NOT NULL,
  accelerator text NOT NULL,
  memory_gb integer NOT NULL,
  count integer NOT NULL,
  runtime text NOT NULL,
  purchase_model text NOT NULL,
  price_per_hour numeric,
  currency text NOT NULL DEFAULT 'USD',
  min_commitment text NOT NULL DEFAULT 'None',
  kind text NOT NULL DEFAULT 'cached',
  compliance text,
  source text NOT NULL,
  source_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT ON public.exchange_offers TO anon, authenticated;
GRANT ALL ON public.exchange_offers TO service_role;
ALTER TABLE public.exchange_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read the catalog" ON public.exchange_offers FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.exchange_workloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  offer_id uuid NOT NULL REFERENCES public.exchange_offers(id),
  spec jsonb NOT NULL,
  estimate_low numeric NOT NULL,
  estimate_high numeric NOT NULL,
  max_spend numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'approved',
  idempotency_key text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.exchange_workloads TO authenticated;
GRANT ALL ON public.exchange_workloads TO service_role;
ALTER TABLE public.exchange_workloads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own workloads" ON public.exchange_workloads FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own workloads" ON public.exchange_workloads FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own workloads" ON public.exchange_workloads FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.exchange_workload_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workload_id uuid NOT NULL REFERENCES public.exchange_workloads(id) ON DELETE CASCADE,
  status text NOT NULL,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.exchange_workload_events TO authenticated;
GRANT ALL ON public.exchange_workload_events TO service_role;
ALTER TABLE public.exchange_workload_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own workload events" ON public.exchange_workload_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.exchange_workloads w WHERE w.id = workload_id AND w.user_id = auth.uid()));
CREATE POLICY "Users insert own workload events" ON public.exchange_workload_events FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.exchange_workloads w WHERE w.id = workload_id AND w.user_id = auth.uid()));

INSERT INTO public.exchange_offers (provider, region, accelerator, memory_gb, count, runtime, purchase_model, price_per_hour, currency, min_commitment, kind, compliance, source, source_at) VALUES
  ('Lambda', 'us-east', 'H100', 80, 8, 'CUDA 12', 'on_demand', 2.49, 'USD', 'None', 'cached', null, 'Published list price (lambda.ai)', '2026-11-05T00:00:00Z'),
  ('Lambda', 'us-west', 'A100', 40, 8, 'CUDA 12', 'on_demand', 1.29, 'USD', 'None', 'cached', null, 'Published list price (lambda.ai)', '2026-11-05T00:00:00Z'),
  ('RunPod', 'us-east', 'H100', 80, 8, 'CUDA 12', 'on_demand', 2.79, 'USD', 'None', 'cached', null, 'Published list price (runpod.io)', '2026-11-05T00:00:00Z'),
  ('RunPod', 'eu-west', 'A100', 80, 4, 'CUDA 12', 'spot', 1.89, 'USD', 'None', 'cached', null, 'Published list price (runpod.io)', '2026-11-05T00:00:00Z'),
  ('AWS', 'us-east', 'H100', 80, 8, 'CUDA 12', 'on_demand', 12.29, 'USD', 'None', 'cached', null, 'Published list price (p5.48xlarge, aws.amazon.com)', '2026-11-05T00:00:00Z'),
  ('CoreWeave', 'us-east', 'H100', 80, 16, 'CUDA 12', 'reserved', null, 'USD', 'Contact sales', 'quote_required', null, 'Quote required (coreweave.com)', '2026-11-05T00:00:00Z'),
  ('Vast.ai', 'marketplace', 'A100', 80, 8, 'CUDA 12', 'spot', null, 'USD', 'None', 'quote_required', null, 'Marketplace pricing varies (vast.ai)', '2026-11-05T00:00:00Z');