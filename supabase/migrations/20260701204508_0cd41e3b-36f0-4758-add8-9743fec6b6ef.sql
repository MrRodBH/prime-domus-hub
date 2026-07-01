
-- ============ TENANTS ============
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  nome text NOT NULL,
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','suspenso','cancelado','trial')),
  dominio_principal text UNIQUE,
  plano_codigo text,
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_tenants_updated_at ON public.tenants;
CREATE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ TENANT_MEMBERS ============
CREATE TABLE IF NOT EXISTS public.tenant_members (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_owner boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT true,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS tenant_members_user_idx ON public.tenant_members(user_id);

GRANT SELECT ON public.tenant_members TO authenticated;
GRANT ALL ON public.tenant_members TO service_role;

ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

-- ============ FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tenant uuid;
  v_header text;
BEGIN
  IF v_uid IS NULL THEN
    BEGIN
      v_header := current_setting('request.headers', true)::jsonb ->> 'x-tenant-id';
      IF v_header IS NOT NULL AND v_header <> '' THEN
        RETURN v_header::uuid;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RETURN NULL;
    END;
    RETURN NULL;
  END IF;

  IF public.is_super_admin() THEN
    BEGIN
      v_header := current_setting('request.headers', true)::jsonb ->> 'x-tenant-id';
      IF v_header IS NOT NULL AND v_header <> '' THEN
        RETURN v_header::uuid;
      END IF;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  SELECT tenant_id INTO v_tenant
    FROM public.tenant_members
   WHERE user_id = v_uid
   ORDER BY is_default DESC, is_owner DESC, joined_at ASC
   LIMIT 1;

  RETURN v_tenant;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_current_tenant_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_current_tenant_id() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.user_belongs_to_tenant(_tenant uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE user_id = auth.uid() AND tenant_id = _tenant
  )
$$;
REVOKE EXECUTE ON FUNCTION public.user_belongs_to_tenant(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_tenant(uuid) TO authenticated, service_role;

-- ============ RLS: tenants ============
DROP POLICY IF EXISTS tenants_select ON public.tenants;
CREATE POLICY tenants_select ON public.tenants FOR SELECT TO authenticated
USING (public.is_super_admin() OR public.user_belongs_to_tenant(id));

DROP POLICY IF EXISTS tenants_write ON public.tenants;
CREATE POLICY tenants_write ON public.tenants FOR ALL TO authenticated
USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- ============ RLS: tenant_members ============
DROP POLICY IF EXISTS tm_select ON public.tenant_members;
CREATE POLICY tm_select ON public.tenant_members FOR SELECT TO authenticated
USING (public.is_super_admin() OR user_id = auth.uid() OR public.user_belongs_to_tenant(tenant_id));

DROP POLICY IF EXISTS tm_write ON public.tenant_members;
CREATE POLICY tm_write ON public.tenant_members FOR ALL TO authenticated
USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- ============ SEED: RM Prime ============
INSERT INTO public.tenants (slug, nome, status, dominio_principal, owner_user_id)
SELECT 'rm-prime', 'RM Prime Imóveis', 'ativo', 'rmprimeimoveis.com.br',
       (SELECT id FROM auth.users WHERE email = 'rodolfovaz882@gmail.com' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM public.tenants WHERE slug = 'rm-prime');

INSERT INTO public.tenant_members (tenant_id, user_id, is_owner, is_default)
SELECT t.id, u.id, (u.email = 'rodolfovaz882@gmail.com'), true
  FROM auth.users u
 CROSS JOIN (SELECT id FROM public.tenants WHERE slug = 'rm-prime') t
ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::public.app_role FROM auth.users WHERE email = 'rodolfovaz882@gmail.com'
ON CONFLICT DO NOTHING;
