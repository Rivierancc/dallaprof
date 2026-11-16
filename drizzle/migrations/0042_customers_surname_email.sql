ALTER TABLE public.venue_customers ADD COLUMN surname text NOT NULL DEFAULT '';
ALTER TABLE public.venue_customers ADD COLUMN email text NOT NULL DEFAULT '';
CREATE UNIQUE INDEX venue_customers_email_uq ON public.venue_customers (venue_id, lower(email)) WHERE email <> '';