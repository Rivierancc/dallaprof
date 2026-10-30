CREATE TABLE public.menu_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_en text NOT NULL DEFAULT '',
  name_fr text NOT NULL DEFAULT '',
  name_es text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'salato' CHECK (kind IN ('dolce','salato')),
  price numeric NOT NULL DEFAULT 0,
  available boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.menu_ingredients TO anon, authenticated;
GRANT ALL ON public.menu_ingredients TO service_role;
ALTER TABLE public.menu_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kiosk read ingredients" ON public.menu_ingredients FOR SELECT TO anon, authenticated USING (true);
ALTER TABLE public.menu_categories ADD COLUMN custom_kind text NOT NULL DEFAULT 'none' CHECK (custom_kind IN ('none','dolce','salato','entrambi'));
ALTER TABLE public.menu_categories ADD COLUMN custom_price numeric NOT NULL DEFAULT 0;