CREATE TABLE public.venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL DEFAULT '',
  next_order integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT (id, slug, name) ON public.venues TO anon, authenticated;
GRANT ALL ON public.venues TO service_role;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Venues are public" ON public.venues FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.venues (id, slug, name, next_order)
SELECT '00000000-0000-0000-0000-000000000001', 'dallaprof', COALESCE(NULLIF((SELECT business_name FROM public.license WHERE id = 1), ''), 'Dalla Prof'),
  (SELECT (((CASE WHEN is_called THEN last_value ELSE last_value - 1 END) % 99) + 1)::integer FROM public.order_number_seq);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['kiosk_banner','kiosk_themes','license','menu_categories','menu_ingredients','menu_products','orders','staff_credentials'] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN venue_id uuid NOT NULL DEFAULT ''00000000-0000-0000-0000-000000000001'' REFERENCES public.venues(id) ON DELETE CASCADE', t);
    EXECUTE format('CREATE INDEX ON public.%I (venue_id)', t);
  END LOOP;
END $$;

ALTER TABLE public.kiosk_banner DROP CONSTRAINT kiosk_banner_id_check;
ALTER TABLE public.license DROP CONSTRAINT license_id_check;
ALTER TABLE public.staff_credentials DROP CONSTRAINT staff_credentials_id_check;
CREATE SEQUENCE public.singleton_id_seq START 2;
GRANT USAGE ON SEQUENCE public.singleton_id_seq TO service_role;
ALTER TABLE public.kiosk_banner ALTER COLUMN id SET DEFAULT nextval('public.singleton_id_seq');
ALTER TABLE public.license ALTER COLUMN id SET DEFAULT nextval('public.singleton_id_seq');
ALTER TABLE public.staff_credentials ALTER COLUMN id SET DEFAULT nextval('public.singleton_id_seq');
ALTER TABLE public.kiosk_banner ADD CONSTRAINT kiosk_banner_venue_key UNIQUE (venue_id);
ALTER TABLE public.license ADD CONSTRAINT license_venue_key UNIQUE (venue_id);
ALTER TABLE public.staff_credentials ADD CONSTRAINT staff_credentials_venue_key UNIQUE (venue_id);
ALTER TABLE public.menu_categories DROP CONSTRAINT menu_categories_slug_key;
ALTER TABLE public.menu_categories ADD CONSTRAINT menu_categories_venue_slug_key UNIQUE (venue_id, slug);

-- Numero ordine progressivo separato per ogni locale
CREATE OR REPLACE FUNCTION public.assign_order_number() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  UPDATE public.venues SET next_order = (next_order % 99) + 1 WHERE id = NEW.venue_id RETURNING CASE WHEN next_order = 1 THEN 99 ELSE next_order - 1 END INTO n;
  IF n IS NOT NULL THEN NEW.order_number := n; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER orders_assign_number BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.assign_order_number();

CREATE OR REPLACE FUNCTION public.staff_next_order_number_v(v uuid) RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT next_order FROM public.venues WHERE id = v $$;
CREATE OR REPLACE FUNCTION public.staff_set_order_number_v(v uuid, next_number integer) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF next_number IS NULL OR next_number < 1 OR next_number > 99 THEN RAISE EXCEPTION 'Il numero deve essere compreso tra 1 e 99'; END IF;
 IF EXISTS (SELECT 1 FROM public.orders WHERE venue_id = v AND order_number = next_number AND status IN ('awaiting_payment','preparing','ready')) THEN RAISE EXCEPTION 'Questo numero appartiene a un ordine ancora aperto: scegli un altro numero o attendi la consegna'; END IF;
 UPDATE public.venues SET next_order = next_number WHERE id = v;
 RETURN next_number;
END $$;
REVOKE EXECUTE ON FUNCTION public.staff_next_order_number_v(uuid), public.staff_set_order_number_v(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.staff_next_order_number_v(uuid), public.staff_set_order_number_v(uuid, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.license_state_v(v uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT jsonb_build_object(
    'state', CASE WHEN status = 'expired' OR (expires_at IS NOT NULL AND expires_at < current_date) THEN 'expired'
                  WHEN status = 'demo' THEN 'demo' ELSE 'active' END,
    'plan', plan, 'expires_at', expires_at, 'demo', demo, 'business_name', business_name)
    FROM public.license WHERE venue_id = v), '{"state":"expired","demo":{}}'::jsonb) $$;
CREATE OR REPLACE FUNCTION public.license_allows_orders_v(v uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE (public.license_state_v(v)->>'state')
    WHEN 'expired' THEN false
    WHEN 'demo' THEN COALESCE(public.license_state_v(v)->'demo'->>'orders', 'simulate') = 'real'
    ELSE true END $$;
GRANT EXECUTE ON FUNCTION public.license_state_v(uuid), public.license_allows_orders_v(uuid) TO anon, authenticated, service_role;

DROP POLICY "kiosk insert" ON public.orders;
CREATE POLICY "kiosk insert" ON public.orders FOR INSERT TO anon, authenticated WITH CHECK (
  status = 'awaiting_payment' AND paid_at IS NULL AND dine_option = ANY (ARRAY['qui','asporto']) AND public.license_allows_orders_v(venue_id));