CREATE TABLE public.kiosk_banner (id int PRIMARY KEY DEFAULT 1 CHECK (id = 1), settings jsonb NOT NULL DEFAULT '{}'::jsonb, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.kiosk_banner TO anon, authenticated;
GRANT ALL ON public.kiosk_banner TO service_role;
ALTER TABLE public.kiosk_banner ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Banner is public" ON public.kiosk_banner FOR SELECT TO anon, authenticated USING (true);
INSERT INTO public.kiosk_banner (id) VALUES (1);