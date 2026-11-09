CREATE TABLE public.license (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  business_name text NOT NULL DEFAULT '',
  owner_email text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  plan text NOT NULL DEFAULT 'annuale',
  expires_at date,
  company_name text NOT NULL DEFAULT '',
  vat text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  sdi text NOT NULL DEFAULT '',
  pec text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  demo jsonb NOT NULL DEFAULT '{"max_products": 6, "orders": "simulate", "badge": true}'::jsonb,
  master_hash text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.license TO service_role;
ALTER TABLE public.license ENABLE ROW LEVEL SECURITY;
INSERT INTO public.license (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.license_state()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT jsonb_build_object(
    'state', CASE WHEN status = 'expired' OR (expires_at IS NOT NULL AND expires_at < current_date) THEN 'expired'
                  WHEN status = 'demo' THEN 'demo' ELSE 'active' END,
    'plan', plan, 'expires_at', expires_at, 'demo', demo, 'business_name', business_name)
    FROM public.license WHERE id = 1), '{"state":"active","demo":{}}'::jsonb)
$$;
GRANT EXECUTE ON FUNCTION public.license_state() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.license_allows_orders()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE (public.license_state()->>'state')
    WHEN 'expired' THEN false
    WHEN 'demo' THEN COALESCE(public.license_state()->'demo'->>'orders', 'simulate') = 'real'
    ELSE true END
$$;
GRANT EXECUTE ON FUNCTION public.license_allows_orders() TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "kiosk insert" ON public.orders;
CREATE POLICY "kiosk insert" ON public.orders FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'awaiting_payment' AND paid_at IS NULL AND dine_option = ANY (ARRAY['qui','asporto']) AND public.license_allows_orders());