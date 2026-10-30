ALTER TABLE public.kiosk_banner ADD COLUMN divider jsonb;
COMMENT ON COLUMN public.kiosk_banner.divider IS 'Linea di separazione tra i piatti in Gestione menu: {on, color, style, width}';