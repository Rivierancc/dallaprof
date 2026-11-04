ALTER TABLE public.menu_products ADD COLUMN IF NOT EXISTS combo_offer boolean NOT NULL DEFAULT false;
ALTER TABLE public.menu_products ADD COLUMN IF NOT EXISTS combo_name text NOT NULL DEFAULT '';
ALTER TABLE public.kiosk_banner ADD COLUMN IF NOT EXISTS offers_title text NOT NULL DEFAULT 'Menu in offerta';