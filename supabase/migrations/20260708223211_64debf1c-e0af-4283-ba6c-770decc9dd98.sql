
-- SCP-001 — Commercial Domain Model
-- Foundational schema for commercial domain (plans, entitlements, subscriptions).
-- No provider integration, no webhooks, no checkout, no commercial authorization.
-- RLS enabled deny-by-default; no permissive policies for end users.

CREATE TABLE IF NOT EXISTS public.commercial_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft',
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commercial_plans_code_format_chk CHECK (code ~ '^[a-z][a-z0-9_]*$'),
  CONSTRAINT commercial_plans_status_chk CHECK (status IN ('draft','active','archived'))
);

CREATE TABLE IF NOT EXISTS public.commercial_entitlement_definitions (
  key text PRIMARY KEY,
  name text NOT NULL,
  description text,
  value_type text NOT NULL,
  unit text,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commercial_entitlement_definitions_key_format_chk CHECK (key ~ '^[a-z][a-z0-9_]*$'),
  CONSTRAINT commercial_entitlement_definitions_value_type_chk CHECK (value_type IN ('boolean','integer','decimal','text'))
);

CREATE TABLE IF NOT EXISTS public.commercial_plan_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.commercial_plans(id) ON DELETE CASCADE,
  entitlement_key text NOT NULL REFERENCES public.commercial_entitlement_definitions(key) ON DELETE RESTRICT,
  value_bool boolean,
  value_int integer,
  value_decimal numeric(14,2),
  value_text text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commercial_plan_entitlements_unique_plan_key UNIQUE (plan_id, entitlement_key),
  CONSTRAINT commercial_plan_entitlements_int_non_negative_chk CHECK (value_int IS NULL OR value_int >= 0),
  CONSTRAINT commercial_plan_entitlements_decimal_non_negative_chk CHECK (value_decimal IS NULL OR value_decimal >= 0),
  CONSTRAINT commercial_plan_entitlements_single_value_chk CHECK (num_nonnulls(value_bool, value_int, value_decimal, value_text) <= 1)
);

CREATE TABLE IF NOT EXISTS public.tenant_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.commercial_plans(id) ON DELETE RESTRICT,
  status text NOT NULL,
  status_reason text,
  started_at timestamptz,
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  canceled_at timestamptz,
  suspended_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tenant_subscriptions_status_chk CHECK (status IN ('trialing','active','past_due','suspended','canceled','internal','demo')),
  CONSTRAINT tenant_subscriptions_period_chk CHECK (
    current_period_start IS NULL OR current_period_end IS NULL OR current_period_end >= current_period_start
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS tenant_subscriptions_one_current_per_tenant_idx
  ON public.tenant_subscriptions (tenant_id)
  WHERE status IN ('trialing','active','past_due','suspended','internal','demo');

CREATE TABLE IF NOT EXISTS public.tenant_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.tenant_subscriptions(id) ON DELETE SET NULL,
  entitlement_key text NOT NULL REFERENCES public.commercial_entitlement_definitions(key) ON DELETE RESTRICT,
  source text NOT NULL DEFAULT 'plan',
  value_bool boolean,
  value_int integer,
  value_decimal numeric(14,2),
  value_text text,
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_until timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tenant_entitlements_unique_tenant_key UNIQUE (tenant_id, entitlement_key),
  CONSTRAINT tenant_entitlements_source_chk CHECK (source IN ('plan','override','system')),
  CONSTRAINT tenant_entitlements_int_non_negative_chk CHECK (value_int IS NULL OR value_int >= 0),
  CONSTRAINT tenant_entitlements_decimal_non_negative_chk CHECK (value_decimal IS NULL OR value_decimal >= 0),
  CONSTRAINT tenant_entitlements_single_value_chk CHECK (num_nonnulls(value_bool, value_int, value_decimal, value_text) <= 1),
  CONSTRAINT tenant_entitlements_effective_period_chk CHECK (effective_until IS NULL OR effective_until >= effective_from)
);

CREATE INDEX IF NOT EXISTS commercial_plans_status_idx ON public.commercial_plans (status);
CREATE INDEX IF NOT EXISTS commercial_plan_entitlements_plan_id_idx ON public.commercial_plan_entitlements (plan_id);
CREATE INDEX IF NOT EXISTS commercial_plan_entitlements_key_idx ON public.commercial_plan_entitlements (entitlement_key);
CREATE INDEX IF NOT EXISTS tenant_subscriptions_tenant_id_idx ON public.tenant_subscriptions (tenant_id);
CREATE INDEX IF NOT EXISTS tenant_subscriptions_status_idx ON public.tenant_subscriptions (status);
CREATE INDEX IF NOT EXISTS tenant_entitlements_tenant_id_idx ON public.tenant_entitlements (tenant_id);
CREATE INDEX IF NOT EXISTS tenant_entitlements_key_idx ON public.tenant_entitlements (entitlement_key);

-- Grants: service_role only. SCP-001 is deny-by-default for anon/authenticated.
-- Functional access will be designed in future approved steps (SCP-002+).
GRANT ALL ON public.commercial_plans TO service_role;
GRANT ALL ON public.commercial_entitlement_definitions TO service_role;
GRANT ALL ON public.commercial_plan_entitlements TO service_role;
GRANT ALL ON public.tenant_subscriptions TO service_role;
GRANT ALL ON public.tenant_entitlements TO service_role;

-- RLS enabled deny-by-default. No permissive policies in SCP-001.
ALTER TABLE public.commercial_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_entitlement_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_plan_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_entitlements ENABLE ROW LEVEL SECURITY;

-- updated_at triggers reuse existing public.tg_set_updated_at()
CREATE TRIGGER commercial_plans_set_updated_at BEFORE UPDATE ON public.commercial_plans
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER commercial_entitlement_definitions_set_updated_at BEFORE UPDATE ON public.commercial_entitlement_definitions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER commercial_plan_entitlements_set_updated_at BEFORE UPDATE ON public.commercial_plan_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER tenant_subscriptions_set_updated_at BEFORE UPDATE ON public.tenant_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER tenant_entitlements_set_updated_at BEFORE UPDATE ON public.tenant_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

COMMENT ON TABLE public.commercial_plans IS
  'SCP-001 commercial plan catalog. Global commercial metadata only. No provider integration, no checkout, no commercial authorization.';
COMMENT ON TABLE public.commercial_entitlement_definitions IS
  'SCP-001 entitlement definitions catalog. Defines possible commercial capabilities; does not enforce access.';
COMMENT ON TABLE public.commercial_plan_entitlements IS
  'SCP-001 plan-to-entitlement mapping. Declarative catalog only; no runtime enforcement.';
COMMENT ON TABLE public.tenant_subscriptions IS
  'SCP-001 tenant-scoped commercial subscription state. Subscription belongs to tenant, not user. No provider-specific columns in SCP-001.';
COMMENT ON TABLE public.tenant_entitlements IS
  'SCP-001 effective tenant entitlement model. Server-side enforcement must be implemented only in future approved steps.';
