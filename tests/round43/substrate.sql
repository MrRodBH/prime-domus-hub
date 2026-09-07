-- Minimal fictional substrate, installed ONLY in the fresh Round 43 CI database.
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE TYPE public.tenant_role AS ENUM ('owner','admin','manager','broker','captador','secretaria','viewer');
CREATE TYPE public.membership_status AS ENUM ('active','invited','suspended','revoked');
CREATE TYPE public.rbac_action AS ENUM ('visualizar','criar','editar','excluir','exportar','importar','aprovar','gerenciar','publicar');
CREATE TABLE public.tenants(id uuid PRIMARY KEY);
CREATE TABLE public.user_roles(user_id uuid REFERENCES auth.users(id),role text);
CREATE TABLE public.tenant_members(
  tenant_id uuid REFERENCES public.tenants(id),user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_role public.tenant_role,membership_status public.membership_status,is_owner boolean,
  is_default boolean DEFAULT false,joined_at timestamptz DEFAULT now(),invited_at timestamptz,
  accepted_at timestamptz,updated_at timestamptz,suspended_at timestamptz,revoked_at timestamptz,
  PRIMARY KEY(tenant_id,user_id)
);
CREATE TABLE public.rbac_profiles(id uuid PRIMARY KEY,tenant_id uuid,sistema boolean);
CREATE TABLE public.rbac_modules(id uuid PRIMARY KEY,codigo text);
CREATE TABLE public.rbac_permissions(profile_id uuid,module_id uuid,action public.rbac_action,scope text);
CREATE TABLE public.user_profiles(tenant_id uuid,user_id uuid,profile_id uuid);
CREATE TABLE public.corretores(
  id uuid PRIMARY KEY,tenant_id uuid REFERENCES public.tenants(id),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  nome text,sobrenome text,cpf text,creci text,email text,telefone text,whatsapp text,
  cargo text,bio text,ativo boolean,status text,team_id uuid,slug text
);
CREATE UNIQUE INDEX corretores_user_id_uniq ON public.corretores(user_id) WHERE user_id IS NOT NULL;
CREATE TABLE public.audit_log(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid,user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,entity text,entity_id text,before jsonb,after jsonb
);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corretores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA public TO service_role,anon,authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
