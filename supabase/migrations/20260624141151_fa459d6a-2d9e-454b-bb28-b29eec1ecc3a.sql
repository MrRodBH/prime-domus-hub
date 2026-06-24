-- Hierarquia de perfis (item 12):
-- Secretaria nunca pode coexistir com Admin ou Corretor.
-- Combinações válidas: {admin}, {corretor}, {secretaria}, {admin, corretor}.

CREATE OR REPLACE FUNCTION public.tg_user_roles_enforce_hierarchy()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  has_sec boolean;
  has_other boolean;
BEGIN
  v_user := COALESCE(NEW.user_id, OLD.user_id);
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user AND role = 'secretaria')
    INTO has_sec;
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user AND role IN ('admin','corretor'))
    INTO has_other;
  IF has_sec AND has_other THEN
    RAISE EXCEPTION 'Hierarquia inválida: Secretaria não pode ser combinada com Admin ou Corretor.';
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS user_roles_enforce_hierarchy ON public.user_roles;
CREATE CONSTRAINT TRIGGER user_roles_enforce_hierarchy
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.tg_user_roles_enforce_hierarchy();

-- Limpeza preventiva: se algum usuário hoje tiver 'secretaria' + outro papel,
-- mantém apenas {secretaria} (mais restritivo) para não quebrar inserções futuras.
WITH conflitos AS (
  SELECT user_id
  FROM public.user_roles
  GROUP BY user_id
  HAVING bool_or(role = 'secretaria') AND bool_or(role IN ('admin','corretor'))
)
DELETE FROM public.user_roles
WHERE user_id IN (SELECT user_id FROM conflitos)
  AND role IN ('admin','corretor');