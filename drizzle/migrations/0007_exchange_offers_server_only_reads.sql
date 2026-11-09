DROP POLICY IF EXISTS "Anyone can read the catalog" ON public.exchange_offers;
REVOKE ALL ON public.exchange_offers FROM anon, authenticated;
GRANT ALL ON public.exchange_offers TO service_role;