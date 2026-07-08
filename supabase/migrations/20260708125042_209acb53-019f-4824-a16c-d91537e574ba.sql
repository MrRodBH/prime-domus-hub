
-- F3.1 Membership Schema Foundation

-- 1) Enums
DO $$ BEGIN
  CREATE TYPE public.tenant_role AS ENUM ('owner','admin','manager','broker','captador','secretaria','viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.membership_status AS ENUM ('active','invited','suspended','revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Colunas novas (nullable inicialmente para backfill seguro)
ALTER TABLE public.tenant_members
  ADD COLUMN IF NOT EXISTS tenant_role public.tenant_role,
  ADD COLUMN IF NOT EXISTS membership_status public.membership_status,
  ADD COLUMN IF NOT EXISTS invited_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 3) Backfill conservador de dados existentes
UPDATE public.tenant_members
   SET tenant_role = CASE WHEN is_owner THEN 'owner'::public.tenant_role
                          ELSE 'admin'::public.tenant_role END
 WHERE tenant_role IS NULL;

UPDATE public.tenant_members
   SET membership_status = 'active'::public.membership_status
 WHERE membership_status IS NULL;

UPDATE public.tenant_members
   SET accepted_at = joined_at
 WHERE accepted_at IS NULL;

-- 4) Endurecer NOT NULL + defaults seguros
ALTER TABLE public.tenant_members
  ALTER COLUMN tenant_role SET NOT NULL,
  ALTER COLUMN tenant_role SET DEFAULT 'viewer'::public.tenant_role,
  ALTER COLUMN membership_status SET NOT NULL,
  ALTER COLUMN membership_status SET DEFAULT 'active'::public.membership_status;

-- 5) Índices auxiliares
CREATE INDEX IF NOT EXISTS tenant_members_tenant_idx
  ON public.tenant_members (tenant_id);

CREATE INDEX IF NOT EXISTS tenant_members_active_lookup_idx
  ON public.tenant_members (user_id, tenant_id, membership_status);

-- 6) Trigger de updated_at usando helper padrão do projeto
DROP TRIGGER IF EXISTS tg_tenant_members_set_updated_at ON public.tenant_members;
CREATE TRIGGER tg_tenant_members_set_updated_at
  BEFORE UPDATE ON public.tenant_members
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Nota: PK (tenant_id, user_id) já garante unicidade lógica; nenhuma constraint UNIQUE adicional necessária.
-- Nota: RLS de domínio, get_current_tenant_id(), impersonação e runtime NÃO foram alterados.
