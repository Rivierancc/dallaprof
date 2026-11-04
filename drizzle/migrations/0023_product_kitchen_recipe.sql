ALTER TABLE public.menu_products ADD COLUMN IF NOT EXISTS recipe_on boolean NOT NULL DEFAULT true;
ALTER TABLE public.menu_products ADD COLUMN IF NOT EXISTS recipe text NOT NULL DEFAULT '';