ALTER TABLE public.menu_products ADD COLUMN IF NOT EXISTS description_en text NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS description_fr text NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS description_es text NOT NULL DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method text;
