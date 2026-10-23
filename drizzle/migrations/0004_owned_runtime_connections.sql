CREATE TABLE public.runtime_connections (
  user_id uuid PRIMARY KEY,
  base_url text NOT NULL,
  token_ciphertext text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.runtime_connections TO service_role;
ALTER TABLE public.runtime_connections ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.runtime_connections IS 'Server-only encrypted runtime credentials; one dedicated GPU host per authenticated account. Browser access denied.';