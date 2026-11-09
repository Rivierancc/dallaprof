CREATE TABLE public.venue_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  phone text NOT NULL,
  name text NOT NULL,
  birth_day smallint,
  birth_month smallint,
  consent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (venue_id, phone)
);
GRANT ALL ON public.venue_customers TO service_role;
ALTER TABLE public.venue_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ADD COLUMN customer_id uuid REFERENCES public.venue_customers(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN discount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN customer_name text NOT NULL DEFAULT '';
CREATE INDEX orders_customer_idx ON public.orders(customer_id);
ALTER TABLE public.kiosk_banner ADD COLUMN loyalty jsonb NOT NULL DEFAULT '{"on": false}'::jsonb;
DROP POLICY IF EXISTS "kiosk insert" ON public.orders;
CREATE POLICY "kiosk insert" ON public.orders FOR INSERT TO anon, authenticated WITH CHECK (
  status = 'awaiting_payment' AND paid_at IS NULL AND dine_option = ANY (ARRAY['qui','asporto'])
  AND customer_id IS NULL AND customer_name = '' AND discount >= 0 AND discount <= 1000
  AND license_allows_orders_v(venue_id));