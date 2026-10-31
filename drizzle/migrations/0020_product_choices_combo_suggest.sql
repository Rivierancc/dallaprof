ALTER TABLE public.menu_products
  ADD COLUMN IF NOT EXISTS max_extras integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS choice_groups jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS combo_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS suggest jsonb NOT NULL DEFAULT '{"on": false}'::jsonb;