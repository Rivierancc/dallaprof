CREATE OR REPLACE FUNCTION public.staff_next_order_number() RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$ SELECT (((CASE WHEN is_called THEN last_value ELSE last_value - 1 END) % 99) + 1)::integer FROM public.order_number_seq; $$;
REVOKE ALL ON FUNCTION public.staff_next_order_number() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.staff_next_order_number() TO service_role;
CREATE OR REPLACE FUNCTION public.staff_set_order_number(next_number integer) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF next_number IS NULL OR next_number < 1 OR next_number > 99 THEN RAISE EXCEPTION 'Il numero deve essere compreso tra 1 e 99'; END IF;
 LOCK TABLE public.orders IN SHARE ROW EXCLUSIVE MODE;
 IF EXISTS (SELECT 1 FROM public.orders WHERE order_number = next_number AND status IN ('awaiting_payment','preparing','ready')) THEN RAISE EXCEPTION 'Questo numero appartiene a un ordine ancora aperto: scegli un altro numero o attendi la consegna'; END IF;
 PERFORM pg_catalog.setval('public.order_number_seq'::regclass, next_number, false);
 RETURN next_number;
END; $$;
REVOKE ALL ON FUNCTION public.staff_set_order_number(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.staff_set_order_number(integer) TO service_role;