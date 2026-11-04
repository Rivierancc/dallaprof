ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS partial_notes jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS checked_items jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.kiosk_banner ADD COLUMN IF NOT EXISTS kitchen jsonb NOT NULL DEFAULT '{"partial": true, "history": true, "checklist": true}'::jsonb;