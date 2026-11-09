DROP POLICY IF EXISTS "kiosk insert" ON public.orders;
ALTER TABLE public.orders DROP COLUMN customer_name;
CREATE POLICY "kiosk insert" ON public.orders FOR INSERT TO anon, authenticated WITH CHECK (
  status = 'awaiting_payment' AND paid_at IS NULL AND dine_option = ANY (ARRAY['qui','asporto'])
  AND customer_id IS NULL AND discount >= 0 AND discount <= 1000
  AND license_allows_orders_v(venue_id));