CREATE TABLE public.master_passkeys (
  id text PRIMARY KEY,
  public_key text NOT NULL,
  counter bigint NOT NULL DEFAULT 0,
  transports text[] NOT NULL DEFAULT '{}',
  label text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.master_passkeys TO service_role;
ALTER TABLE public.master_passkeys ENABLE ROW LEVEL SECURITY;