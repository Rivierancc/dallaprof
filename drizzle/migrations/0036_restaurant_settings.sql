ALTER TABLE public.kiosk_banner ADD COLUMN IF NOT EXISTS restaurant jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE TABLE public.restaurant_tablets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  label text NOT NULL,
  waiter text NOT NULL DEFAULT '',
  pin_hash text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.restaurant_tablets TO service_role;
ALTER TABLE public.restaurant_tablets ENABLE ROW LEVEL SECURITY;
CREATE INDEX restaurant_tablets_venue_idx ON public.restaurant_tablets(venue_id);