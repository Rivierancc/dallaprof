ALTER TABLE public.menu_products ADD COLUMN is_featured boolean NOT NULL DEFAULT false;
ALTER TABLE public.menu_products ADD COLUMN featured_at timestamptz;