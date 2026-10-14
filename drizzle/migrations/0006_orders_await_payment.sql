ALTER TABLE public.orders ALTER COLUMN status SET DEFAULT 'awaiting_payment';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paid_at timestamptz;
DROP POLICY IF EXISTS "kiosk insert" ON public.orders;
CREATE POLICY "kiosk insert" ON public.orders FOR INSERT TO anon, authenticated WITH CHECK (status = 'awaiting_payment' AND paid_at IS NULL AND dine_option IN ('qui','asporto'));