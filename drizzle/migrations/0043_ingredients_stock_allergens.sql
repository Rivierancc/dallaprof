ALTER TABLE public.menu_ingredients ADD COLUMN allergens jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.menu_ingredients ADD COLUMN frozen boolean NOT NULL DEFAULT false;
ALTER TABLE public.menu_ingredients ADD COLUMN stock_mode text NOT NULL DEFAULT 'vista';
ALTER TABLE public.menu_ingredients ADD COLUMN stock_qty integer NOT NULL DEFAULT 0;
ALTER TABLE public.menu_ingredients ADD COLUMN stock_min integer NOT NULL DEFAULT 0;
ALTER TABLE public.menu_ingredients ADD COLUMN stock_state text NOT NULL DEFAULT 'ok';