REVOKE ALL ON public.spr02_managed_secret_ceremonies FROM PUBLIC;
REVOKE ALL ON public.spr02_managed_secret_ceremonies FROM anon;
REVOKE ALL ON public.spr02_managed_secret_ceremonies FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.spr02_managed_secret_ceremonies TO service_role;
ALTER TABLE public.spr02_managed_secret_ceremonies ENABLE ROW LEVEL SECURITY;