DROP POLICY "kitchen update" ON public.orders;
REVOKE UPDATE ON public.orders FROM anon, authenticated;