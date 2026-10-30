CREATE TABLE public.staff_credentials (
  id integer PRIMARY KEY CHECK (id = 1),
  pin_hash text NOT NULL,
  version uuid NOT NULL DEFAULT gen_random_uuid(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.staff_credentials FROM anon, authenticated;
GRANT ALL ON public.staff_credentials TO service_role;
ALTER TABLE public.staff_credentials ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.staff_credentials IS 'Private hashed staff PIN; only PIN-verified server functions may read or update it. No browser access.';