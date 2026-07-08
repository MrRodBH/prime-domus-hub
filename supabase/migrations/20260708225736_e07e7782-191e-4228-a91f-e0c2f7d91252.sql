-- SCP-002 — Billing Provider Abstraction Materialization
-- Provider-agnostic foundational persistence. No real integration.

-- ============================================================
-- 1) billing_provider_definitions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.billing_provider_definitions (
  code text PRIMARY KEY,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'candidate',
  provider_type text NOT NULL DEFAULT 'external',
  capabilities jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billing_provider_definitions_code_format_chk
    CHECK (code ~ '^[a-z][a-z0-9_]*$'),
  CONSTRAINT billing_provider_definitions_status_chk
    CHECK (status IN ('candidate', 'enabled', 'disabled', 'archived')),
  CONSTRAINT billing_provider_definitions_provider_type_chk
    CHECK (provider_type IN ('external', 'internal', 'manual'))
);

GRANT ALL ON public.billing_provider_definitions TO service_role;

ALTER TABLE public.billing_provider_definitions ENABLE ROW LEVEL SECURITY;
-- Deny-by-default: no policies created.

-- ============================================================
-- 2) tenant_billing_provider_mappings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tenant_billing_provider_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider_code text NOT NULL REFERENCES public.billing_provider_definitions(code) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'draft',
  provider_customer_ref text,
  provider_subscription_ref text,
  subscription_id uuid REFERENCES public.tenant_subscriptions(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tenant_billing_provider_mappings_status_chk
    CHECK (status IN ('draft', 'linked', 'disabled', 'archived')),
  CONSTRAINT tenant_billing_provider_mappings_unique_tenant_provider
    UNIQUE (tenant_id, provider_code)
);

CREATE UNIQUE INDEX IF NOT EXISTS tenant_billing_provider_mappings_customer_ref_unique_idx
  ON public.tenant_billing_provider_mappings (provider_code, provider_customer_ref)
  WHERE provider_customer_ref IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS tenant_billing_provider_mappings_subscription_ref_unique_idx
  ON public.tenant_billing_provider_mappings (provider_code, provider_subscription_ref)
  WHERE provider_subscription_ref IS NOT NULL;

GRANT ALL ON public.tenant_billing_provider_mappings TO service_role;

ALTER TABLE public.tenant_billing_provider_mappings ENABLE ROW LEVEL SECURITY;
-- Deny-by-default: no policies created.

-- ============================================================
-- 3) billing_events
-- ============================================================
CREATE TABLE IF NOT EXISTS public.billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_code text NOT NULL REFERENCES public.billing_provider_definitions(code) ON DELETE RESTRICT,
  provider_event_id text NOT NULL,
  event_type text NOT NULL,
  processing_status text NOT NULL DEFAULT 'received',
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  subscription_id uuid REFERENCES public.tenant_subscriptions(id) ON DELETE SET NULL,
  provider_mapping_id uuid REFERENCES public.tenant_billing_provider_mappings(id) ON DELETE SET NULL,
  occurred_at timestamptz,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  idempotency_key text NOT NULL,
  payload_sanitized jsonb NOT NULL DEFAULT '{}'::jsonb,
  payload_hash text,
  error_code text,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billing_events_unique_provider_event
    UNIQUE (provider_code, provider_event_id),
  CONSTRAINT billing_events_unique_idempotency_key
    UNIQUE (idempotency_key),
  CONSTRAINT billing_events_event_type_chk
    CHECK (event_type IN (
      'CheckoutCompleted','SubscriptionCreated','SubscriptionUpdated','SubscriptionCanceled',
      'InvoicePaid','InvoicePaymentFailed','TrialEnding','ChargeRefunded','Unknown'
    )),
  CONSTRAINT billing_events_processing_status_chk
    CHECK (processing_status IN (
      'received','verified','normalized','processed','ignored','failed','reconciled'
    )),
  CONSTRAINT billing_events_processed_at_chk
    CHECK (processed_at IS NULL OR processed_at >= received_at)
);

GRANT ALL ON public.billing_events TO service_role;

ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
-- Deny-by-default: no policies created.

-- ============================================================
-- 4) billing_event_transitions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.billing_event_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_event_id uuid NOT NULL REFERENCES public.billing_events(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billing_event_transitions_from_status_chk
    CHECK (from_status IS NULL OR from_status IN (
      'received','verified','normalized','processed','ignored','failed','reconciled'
    )),
  CONSTRAINT billing_event_transitions_to_status_chk
    CHECK (to_status IN (
      'received','verified','normalized','processed','ignored','failed','reconciled'
    ))
);

GRANT ALL ON public.billing_event_transitions TO service_role;

ALTER TABLE public.billing_event_transitions ENABLE ROW LEVEL SECURITY;
-- Deny-by-default: no policies created.

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS billing_provider_definitions_status_idx
  ON public.billing_provider_definitions (status);

CREATE INDEX IF NOT EXISTS tenant_billing_provider_mappings_tenant_id_idx
  ON public.tenant_billing_provider_mappings (tenant_id);
CREATE INDEX IF NOT EXISTS tenant_billing_provider_mappings_provider_code_idx
  ON public.tenant_billing_provider_mappings (provider_code);
CREATE INDEX IF NOT EXISTS tenant_billing_provider_mappings_subscription_id_idx
  ON public.tenant_billing_provider_mappings (subscription_id);

CREATE INDEX IF NOT EXISTS billing_events_provider_code_idx
  ON public.billing_events (provider_code);
CREATE INDEX IF NOT EXISTS billing_events_tenant_id_idx
  ON public.billing_events (tenant_id);
CREATE INDEX IF NOT EXISTS billing_events_subscription_id_idx
  ON public.billing_events (subscription_id);
CREATE INDEX IF NOT EXISTS billing_events_processing_status_idx
  ON public.billing_events (processing_status);
CREATE INDEX IF NOT EXISTS billing_events_event_type_idx
  ON public.billing_events (event_type);
CREATE INDEX IF NOT EXISTS billing_events_received_at_idx
  ON public.billing_events (received_at);

CREATE INDEX IF NOT EXISTS billing_event_transitions_event_id_idx
  ON public.billing_event_transitions (billing_event_id);

-- ============================================================
-- updated_at triggers (reuse existing function)
-- ============================================================
DROP TRIGGER IF EXISTS billing_provider_definitions_set_updated_at ON public.billing_provider_definitions;
CREATE TRIGGER billing_provider_definitions_set_updated_at
  BEFORE UPDATE ON public.billing_provider_definitions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS tenant_billing_provider_mappings_set_updated_at ON public.tenant_billing_provider_mappings;
CREATE TRIGGER tenant_billing_provider_mappings_set_updated_at
  BEFORE UPDATE ON public.tenant_billing_provider_mappings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS billing_events_set_updated_at ON public.billing_events;
CREATE TRIGGER billing_events_set_updated_at
  BEFORE UPDATE ON public.billing_events
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================
-- Comments
-- ============================================================
COMMENT ON TABLE public.billing_provider_definitions IS
  'SCP-002 provider catalog for billing abstraction. Provider-agnostic metadata only. No secrets, no SDK, no real integration.';

COMMENT ON TABLE public.tenant_billing_provider_mappings IS
  'SCP-002 tenant-to-provider mapping foundation. Opaque external references only. No provider-specific columns, no checkout, no real integration.';

COMMENT ON TABLE public.billing_events IS
  'SCP-002 normalized billing event ledger. Idempotency and sanitized payload storage only. No public webhook, no real processing engine.';

COMMENT ON TABLE public.billing_event_transitions IS
  'SCP-002 audit trail for billing event processing status transitions. Passive ledger only; no processing automation.';
