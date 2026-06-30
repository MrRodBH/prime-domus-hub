
-- ============================================================
-- ENUMs
-- ============================================================
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'gerente';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'captador';

DO $$ BEGIN
  CREATE TYPE public.rbac_action AS ENUM ('visualizar','criar','editar','excluir','exportar','importar','aprovar','gerenciar');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.rbac_scope AS ENUM ('proprio','equipe','global');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.user_status AS ENUM ('ativo','inativo','bloqueado','pendente');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- TEAMS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  descricao text,
  lider_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RBAC: modules, profiles, permissions, user_profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rbac_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  descricao text,
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rbac_modules TO authenticated;
GRANT ALL ON public.rbac_modules TO service_role;
ALTER TABLE public.rbac_modules ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.rbac_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  descricao text,
  sistema boolean NOT NULL DEFAULT false,
  codigo text UNIQUE,  -- ex.: 'admin','gerente','corretor','captador','secretaria'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rbac_profiles TO authenticated;
GRANT ALL ON public.rbac_profiles TO service_role;
ALTER TABLE public.rbac_profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.rbac_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.rbac_profiles(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.rbac_modules(id) ON DELETE CASCADE,
  action public.rbac_action NOT NULL,
  scope public.rbac_scope NOT NULL DEFAULT 'global',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, module_id, action)
);
GRANT SELECT ON public.rbac_permissions TO authenticated;
GRANT ALL ON public.rbac_permissions TO service_role;
ALTER TABLE public.rbac_permissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.rbac_profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, profile_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_profiles TO service_role;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- AUDIT LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,
  action text NOT NULL,
  entity text,
  entity_id text,
  ip text,
  user_agent text,
  before jsonb,
  after jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- CORRETORES: novos campos
-- ============================================================
ALTER TABLE public.corretores
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS status public.user_status NOT NULL DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _module_codigo text, _action public.rbac_action)
RETURNS public.rbac_scope
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.scope
    FROM public.user_profiles up
    JOIN public.rbac_permissions p ON p.profile_id = up.profile_id
    JOIN public.rbac_modules m ON m.id = p.module_id
   WHERE up.user_id = _user_id
     AND m.codigo = _module_codigo
     AND p.action = _action
   ORDER BY CASE p.scope WHEN 'global' THEN 3 WHEN 'equipe' THEN 2 ELSE 1 END DESC
   LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.has_any_permission(_user_id uuid, _module_codigo text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles up
      JOIN public.rbac_permissions p ON p.profile_id = up.profile_id
      JOIN public.rbac_modules m ON m.id = p.module_id
     WHERE up.user_id = _user_id AND m.codigo = _module_codigo
  )
$$;

CREATE OR REPLACE FUNCTION public.user_team_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT team_id FROM public.team_members WHERE user_id = _user_id $$;

-- ============================================================
-- RLS POLICIES (novas tabelas)
-- ============================================================
CREATE POLICY "teams admin all" ON public.teams FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "teams read auth" ON public.teams FOR SELECT TO authenticated USING (true);

CREATE POLICY "team_members admin all" ON public.team_members FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "team_members read auth" ON public.team_members FOR SELECT TO authenticated USING (true);

CREATE POLICY "rbac_modules read auth" ON public.rbac_modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "rbac_modules admin write" ON public.rbac_modules FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE POLICY "rbac_profiles read auth" ON public.rbac_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "rbac_profiles admin write" ON public.rbac_profiles FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE POLICY "rbac_permissions read auth" ON public.rbac_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "rbac_permissions admin write" ON public.rbac_permissions FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE POLICY "user_profiles self read" ON public.user_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE POLICY "user_profiles admin write" ON public.user_profiles FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE POLICY "audit_log self read" ON public.audit_log FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE POLICY "audit_log admin all" ON public.audit_log FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "audit_log insert auth" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- Triggers updated_at
DROP TRIGGER IF EXISTS teams_set_updated_at ON public.teams;
CREATE TRIGGER teams_set_updated_at BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
DROP TRIGGER IF EXISTS rbac_profiles_set_updated_at ON public.rbac_profiles;
CREATE TRIGGER rbac_profiles_set_updated_at BEFORE UPDATE ON public.rbac_profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================
-- SEED: módulos
-- ============================================================
INSERT INTO public.rbac_modules (codigo, nome, ordem) VALUES
  ('dashboard','Dashboard',10),
  ('leads','Leads',20),
  ('clientes','Clientes',30),
  ('imoveis','Imóveis',40),
  ('lancamentos','Lançamentos',50),
  ('captacao','Captação',60),
  ('agenda','Agenda',70),
  ('propostas','Propostas',80),
  ('funil','Funil',90),
  ('blog','Blog',100),
  ('relatorios','Relatórios',110),
  ('configuracoes','Configurações',120),
  ('usuarios','Usuários',130),
  ('permissoes','Permissões',140),
  ('financeiro','Financeiro',150),
  ('integracoes','Integrações',160),
  ('automacoes','Automações',170),
  ('ia_comercial','IA Comercial',180),
  ('auditoria','Auditoria',190),
  ('site','Site & Branding',200)
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================
-- SEED: perfis de sistema
-- ============================================================
INSERT INTO public.rbac_profiles (nome, descricao, sistema, codigo) VALUES
  ('Administrador','Acesso total ao sistema',true,'admin'),
  ('Gerente','Gestão de equipe e operação',true,'gerente'),
  ('Corretor','Operação comercial — seus próprios leads',true,'corretor'),
  ('Captador','Cadastro e gestão de imóveis',true,'captador'),
  ('Secretaria','Apoio administrativo e agenda',true,'secretaria')
ON CONFLICT (nome) DO NOTHING;

-- ============================================================
-- SEED: permissões padrão
-- ============================================================
-- Admin: tudo, global
INSERT INTO public.rbac_permissions (profile_id, module_id, action, scope)
SELECT p.id, m.id, a, 'global'
  FROM public.rbac_profiles p
  CROSS JOIN public.rbac_modules m
  CROSS JOIN unnest(enum_range(NULL::public.rbac_action)) a
 WHERE p.codigo='admin'
ON CONFLICT DO NOTHING;

-- Gerente: tudo exceto exclusão em configurações/permissões; escopo equipe em leads/propostas/funil
INSERT INTO public.rbac_permissions (profile_id, module_id, action, scope)
SELECT p.id, m.id, a,
  CASE WHEN m.codigo IN ('leads','clientes','propostas','funil','agenda','captacao') THEN 'equipe'::public.rbac_scope
       ELSE 'global'::public.rbac_scope END
  FROM public.rbac_profiles p
  CROSS JOIN public.rbac_modules m
  CROSS JOIN unnest(enum_range(NULL::public.rbac_action)) a
 WHERE p.codigo='gerente'
   AND NOT (m.codigo IN ('permissoes','configuracoes','integracoes','automacoes','site') AND a IN ('excluir','gerenciar'))
   AND NOT (m.codigo='usuarios' AND a='excluir')
ON CONFLICT DO NOTHING;

-- Corretor: leads/clientes/propostas/agenda/funil próprios (CRUD básico); imoveis e lancamentos só visualizar
INSERT INTO public.rbac_permissions (profile_id, module_id, action, scope)
SELECT p.id, m.id, a, 'proprio'
  FROM public.rbac_profiles p
  CROSS JOIN public.rbac_modules m
  CROSS JOIN unnest(ARRAY['visualizar','criar','editar']::public.rbac_action[]) a
 WHERE p.codigo='corretor'
   AND m.codigo IN ('dashboard','leads','clientes','propostas','agenda','funil')
ON CONFLICT DO NOTHING;
INSERT INTO public.rbac_permissions (profile_id, module_id, action, scope)
SELECT p.id, m.id, 'visualizar', 'global'
  FROM public.rbac_profiles p, public.rbac_modules m
 WHERE p.codigo='corretor' AND m.codigo IN ('imoveis','lancamentos','blog')
ON CONFLICT DO NOTHING;

-- Captador: imoveis/lancamentos/captacao CRUD global; dashboard view
INSERT INTO public.rbac_permissions (profile_id, module_id, action, scope)
SELECT p.id, m.id, a, 'global'
  FROM public.rbac_profiles p
  CROSS JOIN public.rbac_modules m
  CROSS JOIN unnest(ARRAY['visualizar','criar','editar']::public.rbac_action[]) a
 WHERE p.codigo='captador' AND m.codigo IN ('imoveis','lancamentos','captacao')
ON CONFLICT DO NOTHING;
INSERT INTO public.rbac_permissions (profile_id, module_id, action, scope)
SELECT p.id, m.id, 'visualizar', 'global'
  FROM public.rbac_profiles p, public.rbac_modules m
 WHERE p.codigo='captador' AND m.codigo IN ('dashboard','agenda')
ON CONFLICT DO NOTHING;

-- Secretaria: clientes/agenda CRUD; dashboard/imoveis/leads view
INSERT INTO public.rbac_permissions (profile_id, module_id, action, scope)
SELECT p.id, m.id, a, 'global'
  FROM public.rbac_profiles p
  CROSS JOIN public.rbac_modules m
  CROSS JOIN unnest(ARRAY['visualizar','criar','editar']::public.rbac_action[]) a
 WHERE p.codigo='secretaria' AND m.codigo IN ('clientes','agenda')
ON CONFLICT DO NOTHING;
INSERT INTO public.rbac_permissions (profile_id, module_id, action, scope)
SELECT p.id, m.id, 'visualizar', 'global'
  FROM public.rbac_profiles p, public.rbac_modules m
 WHERE p.codigo='secretaria' AND m.codigo IN ('dashboard','imoveis','leads')
ON CONFLICT DO NOTHING;

-- ============================================================
-- MIGRA usuários existentes user_roles → user_profiles
-- ============================================================
INSERT INTO public.user_profiles (user_id, profile_id)
SELECT ur.user_id, rp.id
  FROM public.user_roles ur
  JOIN public.rbac_profiles rp ON rp.codigo = ur.role::text
ON CONFLICT DO NOTHING;
