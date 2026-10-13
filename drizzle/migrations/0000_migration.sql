CREATE SEQUENCE public.order_number_seq;
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number int NOT NULL DEFAULT ((nextval('public.order_number_seq') - 1) % 99) + 1,
  dine_option text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'preparing',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT USAGE ON SEQUENCE public.order_number_seq TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.orders TO anon, authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kiosk read" ON public.orders FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "kiosk insert" ON public.orders FOR INSERT TO anon, authenticated WITH CHECK (status = 'preparing' AND dine_option IN ('qui','asporto'));
CREATE POLICY "kitchen update" ON public.orders FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (status IN ('preparing','ready','done'));
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;