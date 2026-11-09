CREATE TABLE public.restaurant_tabs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  label text NOT NULL,
  covers int NOT NULL DEFAULT 0,
  cover_price numeric NOT NULL DEFAULT 0,
  waiter text NOT NULL DEFAULT '',
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  payment_method text,
  total numeric
);
GRANT ALL ON public.restaurant_tabs TO service_role;
ALTER TABLE public.restaurant_tabs ENABLE ROW LEVEL SECURITY;
CREATE INDEX restaurant_tabs_venue_open_idx ON public.restaurant_tabs(venue_id, closed_at);
ALTER TABLE public.orders ADD COLUMN tab_id uuid REFERENCES public.restaurant_tabs(id) ON DELETE SET NULL;