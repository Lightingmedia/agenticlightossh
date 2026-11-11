CREATE TABLE public.compute_credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount_cents integer NOT NULL,
  kind text NOT NULL CHECK (kind IN ('topup', 'usage', 'refund', 'adjustment')),
  reference text NOT NULL UNIQUE,
  rental_id uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX compute_credit_ledger_user_idx ON public.compute_credit_ledger (user_id, created_at DESC);

GRANT SELECT ON public.compute_credit_ledger TO authenticated;
GRANT ALL ON public.compute_credit_ledger TO service_role;
ALTER TABLE public.compute_credit_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read their credit ledger" ON public.compute_credit_ledger
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all credit ledgers" ON public.compute_credit_ledger
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.compute_rentals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'vast',
  offer_id bigint NOT NULL,
  instance_id bigint,
  gpu_name text NOT NULL,
  num_gpus integer NOT NULL,
  geolocation text,
  provider_price_per_hour numeric(10,4) NOT NULL,
  price_per_hour numeric(10,4) NOT NULL,
  status text NOT NULL DEFAULT 'starting' CHECK (status IN ('starting', 'running', 'stopped', 'failed')),
  status_message text,
  ssh_host text,
  ssh_port integer,
  charged_cents integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX compute_rentals_user_idx ON public.compute_rentals (user_id, created_at DESC);
CREATE INDEX compute_rentals_active_idx ON public.compute_rentals (status) WHERE status IN ('starting', 'running');

GRANT SELECT ON public.compute_rentals TO authenticated;
GRANT ALL ON public.compute_rentals TO service_role;
ALTER TABLE public.compute_rentals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read their rentals" ON public.compute_rentals
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all rentals" ON public.compute_rentals
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));