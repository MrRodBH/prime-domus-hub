-- BCR-01 — explicit hybrid billing / non-recurring commercial charges
--
-- Forward-only extension over the accepted provider-agnostic billing recovery.
-- This migration is repository-first and MUST NOT be applied to Same-Backend
-- before the dedicated BCR-P5 DATABASE_DDL/DML gate.
--
-- Recurring MRR remains tenant_subscriptions + commercial_plan_prices.
-- Non-recurring setup/milestone/customization/on_demand charges are modeled
-- independently and converge on the same billing provider/event ledger.

BEGIN;

CREATE TABLE IF NOT EXISTS public.commercial_charge_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  charge_type text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  currency text NOT NULL,
  amount_total_minor bigint NOT NULL,
  idempotency_key text NOT NULL,
  correlation_ref text,
  metadata_sanitized jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  failed_at timestamptz,
  CONSTRAINT commercial_charge_intents_type_chk
    CHECK (charge_type IN ('setup', 'milestone', 'customization', 'on_demand')),
  CONSTRAINT commercial_charge_intents_status_chk
    CHECK (status IN ('draft', 'open', 'paid', 'failed', 'void', 'refunded')),
  CONSTRAINT commercial_charge_intents_currency_chk
    CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT commercial_charge_intents_amount_chk
    CHECK (amount_total_minor > 0),
  CONSTRAINT commercial_charge_intents_idempotency_chk
    CHECK (length(btrim(idempotency_key)) BETWEEN 8 AND 255),
  CONSTRAINT commercial_charge_intents_idempotency_uq UNIQUE (idempotency_key),
  CONSTRAINT commercial_charge_intents_correlation_chk
    CHECK (correlation_ref IS NULL OR length(btrim(correlation_ref)) BETWEEN 1 AND 255)
);

COMMENT ON TABLE public.commercial_charge_intents IS
  'BCR-01: provider-agnostic server-owned non-recurring charge authority. Distinct from plan/subscription/entitlement.';

CREATE INDEX IF NOT EXISTS ix_commercial_charge_intents_tenant_status
  ON public.commercial_charge_intents (tenant_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.commercial_charge_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_intent_id uuid NOT NULL REFERENCES public.commercial_charge_intents(id) ON DELETE CASCADE,
  line_position integer NOT NULL,
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_amount_minor bigint NOT NULL,
  amount_total_minor bigint NOT NULL,
  metadata_sanitized jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commercial_charge_items_position_chk CHECK (line_position > 0),
  CONSTRAINT commercial_charge_items_description_chk CHECK (length(btrim(description)) BETWEEN 1 AND 500),
  CONSTRAINT commercial_charge_items_quantity_chk CHECK (quantity > 0),
  CONSTRAINT commercial_charge_items_unit_amount_chk CHECK (unit_amount_minor > 0),
  CONSTRAINT commercial_charge_items_total_chk CHECK (amount_total_minor = quantity::bigint * unit_amount_minor),
  CONSTRAINT commercial_charge_items_position_uq UNIQUE (charge_intent_id, line_position)
);

COMMENT ON TABLE public.commercial_charge_items IS
  'BCR-01: immutable server-owned line items for a non-recurring commercial charge.';

CREATE INDEX IF NOT EXISTS ix_commercial_charge_items_intent
  ON public.commercial_charge_items (charge_intent_id, line_position);

CREATE TABLE IF NOT EXISTS public.billing_charge_provider_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_intent_id uuid NOT NULL REFERENCES public.commercial_charge_intents(id) ON DELETE RESTRICT,
  provider_code text NOT NULL REFERENCES public.billing_provider_definitions(code) ON DELETE RESTRICT,
  provider_customer_ref text NOT NULL,
  provider_invoice_ref text NOT NULL,
  provider_payment_ref text,
  status text NOT NULL DEFAULT 'open',
  provider_observed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billing_charge_provider_mappings_status_chk
    CHECK (status IN ('open', 'paid', 'failed', 'void', 'refunded')),
  CONSTRAINT billing_charge_provider_customer_ref_chk
    CHECK (length(btrim(provider_customer_ref)) BETWEEN 3 AND 255),
  CONSTRAINT billing_charge_provider_invoice_ref_chk
    CHECK (length(btrim(provider_invoice_ref)) BETWEEN 3 AND 255),
  CONSTRAINT billing_charge_provider_payment_ref_chk
    CHECK (provider_payment_ref IS NULL OR length(btrim(provider_payment_ref)) BETWEEN 3 AND 255),
  CONSTRAINT billing_charge_provider_mapping_charge_provider_uq
    UNIQUE (charge_intent_id, provider_code),
  CONSTRAINT billing_charge_provider_mapping_invoice_uq
    UNIQUE (provider_code, provider_invoice_ref)
);

COMMENT ON TABLE public.billing_charge_provider_mappings IS
  'BCR-01: exact opaque provider invoice/payment binding for one internal non-recurring charge. Provider refs are never tenant authority.';

CREATE INDEX IF NOT EXISTS ix_billing_charge_provider_mappings_charge
  ON public.billing_charge_provider_mappings (charge_intent_id, provider_code);

DROP TRIGGER IF EXISTS set_updated_at_commercial_charge_intents
  ON public.commercial_charge_intents;
CREATE TRIGGER set_updated_at_commercial_charge_intents
  BEFORE UPDATE ON public.commercial_charge_intents
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_billing_charge_provider_mappings
  ON public.billing_charge_provider_mappings;
CREATE TRIGGER set_updated_at_billing_charge_provider_mappings
  BEFORE UPDATE ON public.billing_charge_provider_mappings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.commercial_charge_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_charge_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_charge_provider_mappings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.commercial_charge_intents FROM anon, authenticated;
REVOKE ALL ON TABLE public.commercial_charge_items FROM anon, authenticated;
REVOKE ALL ON TABLE public.billing_charge_provider_mappings FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.commercial_charge_intents TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.commercial_charge_items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.billing_charge_provider_mappings TO service_role;

-- Transactionally materialize a server-owned charge and its exact items.
CREATE OR REPLACE FUNCTION public.bcr01_create_commercial_charge(
  _tenant_id uuid,
  _charge_type text,
  _currency text,
  _idempotency_key text,
  _correlation_ref text,
  _metadata_sanitized jsonb,
  _items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_existing public.commercial_charge_intents;
  v_charge public.commercial_charge_intents;
  v_item jsonb;
  v_position integer := 0;
  v_description text;
  v_quantity integer;
  v_unit bigint;
  v_total bigint := 0;
BEGIN
  IF _tenant_id IS NULL
     OR _charge_type NOT IN ('setup', 'milestone', 'customization', 'on_demand')
     OR _currency IS NULL OR _currency !~ '^[A-Z]{3}$'
     OR _idempotency_key IS NULL OR length(btrim(_idempotency_key)) < 8
     OR _items IS NULL OR jsonb_typeof(_items) <> 'array'
     OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'bcr01_charge_input_invalid' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = _tenant_id) THEN
    RAISE EXCEPTION 'bcr01_charge_tenant_missing' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_existing
    FROM public.commercial_charge_intents
   WHERE idempotency_key = _idempotency_key;
  IF FOUND THEN
    IF v_existing.tenant_id IS DISTINCT FROM _tenant_id
       OR v_existing.charge_type IS DISTINCT FROM _charge_type
       OR v_existing.currency IS DISTINCT FROM _currency THEN
      RAISE EXCEPTION 'bcr01_charge_idempotency_conflict' USING ERRCODE = '23505';
    END IF;
    RETURN jsonb_build_object(
      'created', false,
      'duplicate', true,
      'chargeIntentId', v_existing.id,
      'status', v_existing.status,
      'amountTotalMinor', v_existing.amount_total_minor,
      'currency', v_existing.currency
    );
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(_items)
  LOOP
    v_position := v_position + 1;
    v_description := nullif(btrim(v_item ->> 'description'), '');
    v_quantity := coalesce((v_item ->> 'quantity')::integer, 1);
    v_unit := (v_item ->> 'unitAmountMinor')::bigint;

    IF v_description IS NULL OR length(v_description) > 500
       OR v_quantity <= 0 OR v_unit <= 0 THEN
      RAISE EXCEPTION 'bcr01_charge_item_invalid' USING ERRCODE = '22023';
    END IF;
    v_total := v_total + (v_quantity::bigint * v_unit);
  END LOOP;

  IF v_total <= 0 THEN
    RAISE EXCEPTION 'bcr01_charge_total_invalid' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.commercial_charge_intents (
    tenant_id, charge_type, status, currency, amount_total_minor,
    idempotency_key, correlation_ref, metadata_sanitized
  ) VALUES (
    _tenant_id, _charge_type, 'draft', _currency, v_total,
    _idempotency_key, nullif(btrim(_correlation_ref), ''),
    coalesce(_metadata_sanitized, '{}'::jsonb)
  ) RETURNING * INTO v_charge;

  v_position := 0;
  FOR v_item IN SELECT value FROM jsonb_array_elements(_items)
  LOOP
    v_position := v_position + 1;
    v_description := btrim(v_item ->> 'description');
    v_quantity := coalesce((v_item ->> 'quantity')::integer, 1);
    v_unit := (v_item ->> 'unitAmountMinor')::bigint;

    INSERT INTO public.commercial_charge_items (
      charge_intent_id, line_position, description, quantity,
      unit_amount_minor, amount_total_minor, metadata_sanitized
    ) VALUES (
      v_charge.id, v_position, v_description, v_quantity,
      v_unit, v_quantity::bigint * v_unit,
      coalesce(v_item -> 'metadataSanitized', '{}'::jsonb)
    );
  END LOOP;

  RETURN jsonb_build_object(
    'created', true,
    'duplicate', false,
    'chargeIntentId', v_charge.id,
    'status', v_charge.status,
    'amountTotalMinor', v_charge.amount_total_minor,
    'currency', v_charge.currency
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.bcr01_create_commercial_charge(uuid, text, text, text, text, jsonb, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bcr01_create_commercial_charge(uuid, text, text, text, text, jsonb, jsonb)
  TO service_role;

-- Bind a provider invoice only after proving the provider customer belongs to
-- the same tenant through the accepted tenant/provider mapping.
CREATE OR REPLACE FUNCTION public.bcr01_bind_charge_provider_invoice(
  _charge_intent_id uuid,
  _provider_code text,
  _provider_customer_ref text,
  _provider_invoice_ref text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_charge public.commercial_charge_intents;
  v_tenant_mapping public.tenant_billing_provider_mappings;
  v_mapping public.billing_charge_provider_mappings;
BEGIN
  IF _charge_intent_id IS NULL
     OR _provider_code IS NULL OR length(btrim(_provider_code)) = 0
     OR _provider_customer_ref IS NULL OR length(btrim(_provider_customer_ref)) = 0
     OR _provider_invoice_ref IS NULL OR length(btrim(_provider_invoice_ref)) = 0 THEN
    RAISE EXCEPTION 'bcr01_charge_provider_binding_input_required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_charge
    FROM public.commercial_charge_intents
   WHERE id = _charge_intent_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'bcr01_charge_not_found' USING ERRCODE = '22023';
  END IF;
  IF v_charge.status NOT IN ('draft', 'open') THEN
    RAISE EXCEPTION 'bcr01_charge_not_invoiceable' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_tenant_mapping
    FROM public.tenant_billing_provider_mappings
   WHERE tenant_id = v_charge.tenant_id
     AND provider_code = _provider_code
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'bcr01_charge_tenant_provider_mapping_absent' USING ERRCODE = '23514';
  END IF;
  IF v_tenant_mapping.status NOT IN ('draft', 'linked')
     OR v_tenant_mapping.provider_customer_ref IS DISTINCT FROM _provider_customer_ref THEN
    RAISE EXCEPTION 'bcr01_charge_provider_customer_mismatch' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_mapping
    FROM public.billing_charge_provider_mappings
   WHERE charge_intent_id = _charge_intent_id
     AND provider_code = _provider_code
   FOR UPDATE;

  IF FOUND THEN
    IF v_mapping.provider_customer_ref IS DISTINCT FROM _provider_customer_ref
       OR v_mapping.provider_invoice_ref IS DISTINCT FROM _provider_invoice_ref THEN
      RAISE EXCEPTION 'bcr01_charge_provider_binding_conflict' USING ERRCODE = '23505';
    END IF;
  ELSE
    INSERT INTO public.billing_charge_provider_mappings (
      charge_intent_id, provider_code, provider_customer_ref,
      provider_invoice_ref, status
    ) VALUES (
      _charge_intent_id, _provider_code, _provider_customer_ref,
      _provider_invoice_ref, 'open'
    ) RETURNING * INTO v_mapping;
  END IF;

  UPDATE public.commercial_charge_intents
     SET status = 'open'
   WHERE id = _charge_intent_id
     AND status = 'draft';

  RETURN jsonb_build_object(
    'mappingId', v_mapping.id,
    'chargeIntentId', v_mapping.charge_intent_id,
    'providerCode', v_mapping.provider_code,
    'providerInvoiceRef', v_mapping.provider_invoice_ref,
    'status', v_mapping.status
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.bcr01_bind_charge_provider_invoice(uuid, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bcr01_bind_charge_provider_invoice(uuid, text, text, text)
  TO service_role;

-- Provider invoice lifecycle resolution accepts no tenant input. Tenant identity
-- is derived exclusively from the persisted charge -> tenant relation and exact
-- provider invoice mapping.
CREATE OR REPLACE FUNCTION public.bcr01_apply_provider_invoice_observation(
  _event_id uuid,
  _provider_code text,
  _provider_invoice_ref text,
  _provider_payment_ref text,
  _target_status text,
  _provider_observed_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_event public.billing_events;
  v_mapping public.billing_charge_provider_mappings;
  v_charge public.commercial_charge_intents;
  v_from_status text;
BEGIN
  IF _event_id IS NULL
     OR _provider_code IS NULL OR length(btrim(_provider_code)) = 0
     OR _provider_invoice_ref IS NULL OR length(btrim(_provider_invoice_ref)) = 0
     OR _target_status NOT IN ('open', 'paid', 'failed', 'void', 'refunded')
     OR _provider_observed_at IS NULL THEN
    RAISE EXCEPTION 'bcr01_invoice_observation_input_required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_event
    FROM public.billing_events
   WHERE id = _event_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'bcr01_billing_event_not_reserved' USING ERRCODE = '23514';
  END IF;
  IF v_event.provider_code IS DISTINCT FROM _provider_code THEN
    RAISE EXCEPTION 'bcr01_invoice_event_provider_mismatch' USING ERRCODE = '23514';
  END IF;
  IF v_event.processing_status IN ('processed', 'ignored', 'reconciled') THEN
    RETURN jsonb_build_object(
      'applied', false,
      'reason', 'already_terminal',
      'eventStatus', v_event.processing_status
    );
  END IF;

  SELECT * INTO v_mapping
    FROM public.billing_charge_provider_mappings
   WHERE provider_code = _provider_code
     AND provider_invoice_ref = _provider_invoice_ref
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'bcr01_provider_invoice_mapping_absent' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_charge
    FROM public.commercial_charge_intents
   WHERE id = v_mapping.charge_intent_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'bcr01_charge_not_found' USING ERRCODE = '23514';
  END IF;

  IF v_mapping.provider_observed_at IS NOT NULL
     AND v_mapping.provider_observed_at > _provider_observed_at THEN
    UPDATE public.billing_events
       SET processing_status = 'reconciled', processed_at = now(),
           tenant_id = coalesce(tenant_id, v_charge.tenant_id)
     WHERE id = _event_id;
    INSERT INTO public.billing_event_transitions (billing_event_id, from_status, to_status, reason)
    VALUES (_event_id, v_event.processing_status, 'reconciled', 'bcr01_stale_invoice_observation');
    RETURN jsonb_build_object('applied', false, 'reason', 'stale_provider_observation', 'eventStatus', 'reconciled');
  END IF;

  -- Paid may only advance to refunded; refunded is terminal. A failed/open
  -- observation can never regress a paid/refunded charge.
  IF v_charge.status = 'refunded' AND _target_status <> 'refunded' THEN
    RAISE EXCEPTION 'bcr01_refunded_charge_status_regression' USING ERRCODE = '23514';
  END IF;
  IF v_charge.status = 'paid' AND _target_status NOT IN ('paid', 'refunded') THEN
    RAISE EXCEPTION 'bcr01_paid_charge_status_regression' USING ERRCODE = '23514';
  END IF;

  v_from_status := v_charge.status;

  UPDATE public.commercial_charge_intents
     SET status = _target_status,
         paid_at = CASE WHEN _target_status = 'paid' THEN coalesce(paid_at, _provider_observed_at) ELSE paid_at END,
         failed_at = CASE WHEN _target_status = 'failed' THEN coalesce(failed_at, _provider_observed_at) ELSE failed_at END
   WHERE id = v_charge.id;

  UPDATE public.billing_charge_provider_mappings
     SET status = _target_status,
         provider_payment_ref = coalesce(_provider_payment_ref, provider_payment_ref),
         provider_observed_at = _provider_observed_at
   WHERE id = v_mapping.id;

  UPDATE public.billing_events
     SET processing_status = 'processed',
         processed_at = now(),
         tenant_id = coalesce(tenant_id, v_charge.tenant_id)
   WHERE id = _event_id;

  INSERT INTO public.billing_event_transitions (billing_event_id, from_status, to_status, reason)
  VALUES (_event_id, v_event.processing_status, 'processed', 'bcr01_non_recurring_invoice_observation_applied');

  RETURN jsonb_build_object(
    'applied', true,
    'chargeIntentId', v_charge.id,
    'tenantId', v_charge.tenant_id,
    'fromChargeStatus', v_from_status,
    'chargeStatus', _target_status,
    'eventStatus', 'processed'
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.bcr01_apply_provider_invoice_observation(uuid, text, text, text, text, timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bcr01_apply_provider_invoice_observation(uuid, text, text, text, text, timestamptz)
  TO service_role;

COMMIT;
