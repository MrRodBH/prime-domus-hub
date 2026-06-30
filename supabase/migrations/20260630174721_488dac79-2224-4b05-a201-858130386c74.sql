
CREATE OR REPLACE FUNCTION public.tg_user_roles_sync_profiles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE pid uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT id INTO pid FROM public.rbac_profiles WHERE codigo = NEW.role::text LIMIT 1;
    IF pid IS NOT NULL THEN
      INSERT INTO public.user_profiles (user_id, profile_id) VALUES (NEW.user_id, pid)
      ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT id INTO pid FROM public.rbac_profiles WHERE codigo = OLD.role::text LIMIT 1;
    IF pid IS NOT NULL THEN
      DELETE FROM public.user_profiles WHERE user_id = OLD.user_id AND profile_id = pid;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS user_roles_sync_profiles ON public.user_roles;
CREATE TRIGGER user_roles_sync_profiles
AFTER INSERT OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.tg_user_roles_sync_profiles();
