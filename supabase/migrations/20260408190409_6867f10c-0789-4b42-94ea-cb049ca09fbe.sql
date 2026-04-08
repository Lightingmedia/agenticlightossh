
CREATE TABLE public.testers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  linkedin_url TEXT,
  headline TEXT,
  location_full TEXT,
  location_country TEXT,
  connections_count INTEGER DEFAULT 0,
  followers_count INTEGER DEFAULT 0,
  company_name TEXT,
  company_linkedin_url TEXT,
  company_website TEXT,
  company_industry TEXT,
  active_title TEXT,
  department TEXT,
  management_level TEXT,
  company_hq_address TEXT,
  company_hq_country TEXT,
  external_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.testers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view testers" ON public.testers FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert testers" ON public.testers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update testers" ON public.testers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete testers" ON public.testers FOR DELETE TO authenticated USING (true);
