-- BCR-01 — Billing Commercial Recovery / forward hardening
--
-- Forward-only correction over the historical managed BCA-01 migration
-- 20260812192006_0d1477a8-4e56-4fde-a4e0-9bb6cfba394a.
--
-- Goals:
--   1. preserve immutable/versioned price identity once activated;
--   2. provide a service-role-only customer binding primitive;
--   3. reserve verified provider events without accepting tenant authority;
--   4. resolve webhook lifecycle tenant/plan authority from persisted mappings;
--   5. retire the rejected stage-specific bca01_* mutation RPC path.
--
-- This migration is authored repository-first. It MUST NOT be applied to the
-- Same-Backend before the dedicated BCR-P5 database-authority gate.

BEGIN;

-- ============================================================
-- 1) Price lifecycle / immutability
-- ============================================================
ALTER TABLE public.commercial_plan_prices
  ADD COLUMN IF NOT EXISTS retired_at timestamptz;

ALTER TABLE public.billing_plan_provider_prices
  ADD COLUMN IF NOT EXISTS retired_at timestamptz;

ALTER TABLE public.commercial_plan_prices
  DROP CONSTRAINT IF EXISTS commercial_plan_prices_retired_state_chk;
ALTER TABLE public.commercial_plan_prices
  ADD CONSTRAINT commercial_plan_prices_retired_state_chk CHECK (
    (status = 'archived' AND retired_at IS NOT NULL)
    OR (status <> 'archived' AND retired_at IS NULL)
  );

ALTER TABLE public.billing_plan_provider_prices
  DROP CONSTRAINT IF EXISTS billing_plan_provider_prices_retired_state_chk;
ALTER TABLE public.billing_plan_provider_prices
  ADD CONSTRAINT billing_plan_provider_prices_retired_state_chk CHECK (
    (status = 'archived' AND retired_at IS NOT NULL)
    OR (status <> 'archived' AND retired_at IS NULL)
  );

CREATE OR REPLACE FUNCTION public.bcr01_lock_commercial_plan_price_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $fn$
BEGIN
  IF OLD.status = 'active' AND (
    NEW.plan_id IS DISTINCT FROM OLD.plan_id
    OR NEW.code IS DISTINCT FROM OLD.code
    OR NEW.currency IS DISTINCT FROM OLD.currency
    OR NEW.unit_amount_minor IS DISTINCT FROM OLD.unit_amount_minor
    OR NEW.billing_interval IS DISTINCT FROM OLD.billing_interval
    OR NEW.interval_count IS DISTINCT FROM OLD.interval_count
  ) THEN
    RAISE EXCEPTION 'bcr01_active_plan_price_identity_immutable' USING ERRCODE = '23514';
  END IF;

  IF OLD.status = 'active' AND NEW.status = 'draft' THEN
    RAISE EXCEPTION 'bcr01_active_plan_price_cannot_return_to_draft' USING ERRCODE = '23514';
  END IF;

  IF NEW.status = 'archived' AND NEW.retired_at IS NULL THEN
    NEW.retired_at := now();
  ELSIF NEW.status <> 'archived' AND NEW.retired_at IS NOT NULL THEN
    RAISE EXCEPTION 'bcr01_non_archived_plan_price_cannot_be_retired' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS bcr01_lock_commercial_plan_price_identity
  ON public.commercial_plan_prices;
CREATE TRIGGER bcr01_lock_commercial_plan_price_identity
  BEFORE UPDATE ON public.commercial_plan_prices
  FOR EACH ROW EXECUTE FUNCTION public.bcr01_lock_commercial_plan_price_identity();

CREATE OR REPLACE FUNCTION public.bcr01_lock_provider_price_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $fn$
BEGIN
  IF OLD.status = 'enabled' AND (
    NEW.plan_price_id IS DISTINCT FROM OLD.plan_price_id
    OR NEW.provider_code IS DISTINCT FROM OLD.provider_code
    OR NEW.provider_price_ref IS DISTINCT FROM OLD.provider_price_ref
  ) THEN
    RAISE EXCEPTION 'bcr01_enabled_provider_price_identity_immutable' USING ERRCODE = '23514';
  END IF;

  IF OLD.status = 'enabled' AND NEW.status = 'draft' THEN
    RAISE EXCEPTION 'bcr01_enabled_provider_price_cannot_return_to_draft' USING ERRCODE = '23514';
  END IF;

  IF NEW.status = 'archived' AND NEW.retired_at IS NULL THEN
    NEW.retired_at := now();
  ELSIF NEW.status <> 'archived' AND NEW.retired_at IS NOT NULL THEN
    RAISE EXCEPTION 'bcr01_non_archived_provider_price_cannot_be_retired' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS bcr01_lock_provider_price_identity
  ON public.billing_plan_provider_prices;
CREATE TRIGGER bcr01_lock_provider_price_identity
  BEFORE UPDATE ON public.billing_plan_provider_prices
  FOR EACH ROW EXECUTE FUNCTION public.bcr01_lock_provider_price_identity();

-- ============================================================
-- 2) Server-owned provider customer binding
-- ============================================================
CREATE OR REPLACE FUNCTION public.bcr01_bind_provider_customer(
  _tenant_id uuid,
  _provider_code text,
  _provider_customer_ref text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_mapping public.tenant_billing_provider_mappings;
BEGIN
  IF _tenant_id IS NULL
     OR _provider_code IS NULL OR length(btrim(_provider_code)) = 0
     OR _provider_customer_ref IS NULL OR length(btrim(_provider_customer_ref)) = 0 THEN
    RAISE EXCEPTION 'bcr01_provider_customer_binding_input_required' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = _tenant_id) THEN
    RAISE EXCEPTION 'bcr01_provider_customer_tenant_missing' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.billing_provider_definitions
     WHERE code = _provider_code
       AND status = 'enabled'
  ) THEN
    RAISE EXCEPTION 'bcr01_provider_not_enabled' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_mapping
    FROM public.tenant_billing_provider_mappings
   WHERE tenant_id = _tenant_id
     AND provider_code = _provider_code
   FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.tenant_billing_provider_mappings (
      tenant_id,
      provider_code,
      status,
      provider_customer_ref
    ) VALUES (
      _tenant_id,
      _provider_code,
      'draft',
      _provider_customer_ref
    )
    RETURNING * INTO v_mapping;
  ELSE
    IF v_mapping.status NOT IN ('draft', 'linked') THEN
      RAISE EXCEPTION 'bcr01_provider_mapping_not_operable' USING ERRCODE = '23514';
    END IF;

    IF v_mapping.provider_customer_ref IS NOT NULL
       AND v_mapping.provider_customer_ref IS DISTINCT FROM _provider_customer_ref THEN
      RAISE EXCEPTION 'bcr01_provider_customer_ref_conflict' USING ERRCODE = '23505';
    END IF;

    UPDATE public.tenant_billing_provider_mappings
       SET provider_customer_ref = _provider_customer_ref
     WHERE id = v_mapping.id
    RETURNING * INTO v_mapping;
  END IF;

  RETURN jsonb_build_object(
    'mappingId', v_mapping.id,
    'tenantId', v_mapping.tenant_id,
    'providerCode', v_mapping.provider_code,
    'providerCustomerRef', v_mapping.provider_customer_ref,
    'status', v_mapping.status
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.bcr01_bind_provider_customer(uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bcr01_bind_provider_customer(uuid, text, text)
  TO service_role;

-- ============================================================
-- 3) Verified-event reservation — no tenant input
-- ============================================================
CREATE OR REPLACE FUNCTION public.bcr01_reserve_verified_billing_event(
  _provider_code text,
  _provider_event_id text,
  _event_type text,
  _payload_hash text,
  _payload_sanitized jsonb,
  _occurred_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_event public.billing_events;
  v_inserted_id uuid;
BEGIN
  IF _provider_code IS NULL OR length(btrim(_provider_code)) = 0
     OR _provider_event_id IS NULL OR length(btrim(_provider_event_id)) = 0
     OR _payload_hash IS NULL OR _payload_hash !~ '^[0-9a-f]{64}$'
     OR _event_type IS NULL OR length(btrim(_event_type)) = 0 THEN
    RAISE EXCEPTION 'bcr01_billing_event_identity_required' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.billing_provider_definitions
     WHERE code = _provider_code
       AND status = 'enabled'
  ) THEN
    RAISE EXCEPTION 'bcr01_provider_not_enabled' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.billing_events (
    provider_code,
    provider_event_id,
    event_type,
    processing_status,
    tenant_id,
    occurred_at,
    idempotency_key,
    payload_sanitized,
    payload_hash
  ) VALUES (
    _provider_code,
    _provider_event_id,
    _event_type,
    'verified',
    NULL,
    _occurred_at,
    _provider_code || ':' || _provider_event_id,
    coalesce(_payload_sanitized, '{}'::jsonb),
    _payload_hash
  )
  ON CONFLICT (provider_code, provider_event_id) DO NOTHING
  RETURNING id INTO v_inserted_id;

  IF v_inserted_id IS NOT NULL THEN
    INSERT INTO public.billing_event_transitions (
      billing_event_id,
      from_status,
      to_status,
      reason
    ) VALUES (
      v_inserted_id,
      NULL,
      'verified',
      'bcr01_provider_signature_verified'
    );

    RETURN jsonb_build_object(
      'reserved', true,
      'duplicate', false,
      'eventId', v_inserted_id,
      'processingStatus', 'verified'
    );
  END IF;

  SELECT * INTO STRICT v_event
    FROM public.billing_events
   WHERE provider_code = _provider_code
     AND provider_event_id = _provider_event_id
   FOR UPDATE;

  IF v_event.payload_hash IS DISTINCT FROM _payload_hash THEN
    RAISE EXCEPTION 'bcr01_billing_event_payload_conflict' USING ERRCODE = '23505';
  END IF;

  RETURN jsonb_build_object(
    'reserved', false,
    'duplicate', true,
    'eventId', v_event.id,
    'processingStatus', v_event.processing_status
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.bcr01_reserve_verified_billing_event(text, text, text, text, jsonb, timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bcr01_reserve_verified_billing_event(text, text, text, text, jsonb, timestamptz)
  TO service_role;

-- ============================================================
-- 4) Provider-confirmed subscription lifecycle
--
-- Critical authority rule:
-- tenant_id and plan_id are NOT inputs. They are derived from persisted,
-- server-owned provider-customer and provider-price mappings.
-- ============================================================
CREATE OR REPLACE FUNCTION public.bcr01_apply_provider_subscription_observation(
  _event_id uuid,
  _provider_code text,
  _provider_customer_ref text,
  _provider_subscription_ref text,
  _provider_price_ref text,
  _internal_status text,
  _requires_reconciliation boolean,
  _provider_observed_at timestamptz,
  _current_period_start timestamptz DEFAULT NULL,
  _current_period_end timestamptz DEFAULT NULL,
  _canceled_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_event public.billing_events;
  v_mapping public.tenant_billing_provider_mappings;
  v_plan_price public.commercial_plan_prices;
  v_subscription public.tenant_subscriptions;
  v_previous_observation timestamptz;
  v_final_event_status text;
  v_existing_current_count integer;
BEGIN
  IF _event_id IS NULL
     OR _provider_code IS NULL OR length(btrim(_provider_code)) = 0
     OR _provider_customer_ref IS NULL OR length(btrim(_provider_customer_ref)) = 0
     OR _provider_subscription_ref IS NULL OR length(btrim(_provider_subscription_ref)) = 0
     OR _provider_price_ref IS NULL OR length(btrim(_provider_price_ref)) = 0
     OR _internal_status NOT IN ('trialing', 'active', 'past_due', 'suspended', 'canceled')
     OR _provider_observed_at IS NULL THEN
    RAISE EXCEPTION 'bcr01_lifecycle_input_required_or_invalid' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_event
    FROM public.billing_events
   WHERE id = _event_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'bcr01_billing_event_not_reserved' USING ERRCODE = '22023';
  END IF;

  IF v_event.provider_code IS DISTINCT FROM _provider_code THEN
    RAISE EXCEPTION 'bcr01_billing_event_provider_mismatch' USING ERRCODE = '23514';
  END IF;

  IF v_event.processing_status IN ('processed', 'ignored', 'reconciled') THEN
    RETURN jsonb_build_object(
      'applied', false,
      'reason', 'already_terminal',
      'eventStatus', v_event.processing_status
    );
  END IF;

  IF v_event.processing_status NOT IN ('verified', 'normalized') THEN
    RAISE EXCEPTION 'bcr01_billing_event_not_verified' USING ERRCODE = '23514';
  END IF;

  -- Unique(provider_code, provider_customer_ref) guarantees at most one row.
  -- No ORDER BY/LIMIT heuristic is used; absence fails closed.
  SELECT * INTO v_mapping
    FROM public.tenant_billing_provider_mappings
   WHERE provider_code = _provider_code
     AND provider_customer_ref = _provider_customer_ref
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'bcr01_provider_customer_mapping_absent' USING ERRCODE = '22023';
  END IF;

  IF v_mapping.status NOT IN ('draft', 'linked') THEN
    RAISE EXCEPTION 'bcr01_provider_mapping_not_operable' USING ERRCODE = '23514';
  END IF;

  IF v_mapping.provider_subscription_ref IS NOT NULL
     AND v_mapping.provider_subscription_ref IS DISTINCT FROM _provider_subscription_ref THEN
    RAISE EXCEPTION 'bcr01_provider_subscription_ref_conflict' USING ERRCODE = '23505';
  END IF;

  -- Unique(provider_code, provider_price_ref) guarantees at most one mapping.
  -- The active internal price and plan are the only price/plan authority.
  SELECT cpp.* INTO v_plan_price
    FROM public.billing_plan_provider_prices bpp
    JOIN public.commercial_plan_prices cpp
      ON cpp.id = bpp.plan_price_id
    JOIN public.commercial_plans cp
      ON cp.id = cpp.plan_id
   WHERE bpp.provider_code = _provider_code
     AND bpp.provider_price_ref = _provider_price_ref
     AND bpp.status = 'enabled'
     AND bpp.retired_at IS NULL
     AND cpp.status = 'active'
     AND cpp.retired_at IS NULL
     AND cp.status = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'bcr01_provider_price_mapping_absent_or_inactive' USING ERRCODE = '22023';
  END IF;

  IF v_mapping.subscription_id IS NOT NULL THEN
    SELECT * INTO v_subscription
      FROM public.tenant_subscriptions
     WHERE id = v_mapping.subscription_id
       AND tenant_id = v_mapping.tenant_id
     FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'bcr01_mapping_subscription_missing_or_cross_tenant' USING ERRCODE = '23514';
    END IF;
  ELSE
    SELECT count(*) INTO v_existing_current_count
      FROM public.tenant_subscriptions
     WHERE tenant_id = v_mapping.tenant_id
       AND status IN ('trialing', 'active', 'past_due', 'suspended', 'internal', 'demo');

    IF v_existing_current_count > 0 THEN
      RAISE EXCEPTION 'bcr01_unmapped_current_subscription_present' USING ERRCODE = '23514';
    END IF;

    INSERT INTO public.tenant_subscriptions (
      tenant_id,
      plan_id,
      status,
      status_reason,
      started_at,
      current_period_start,
      current_period_end,
      canceled_at,
      suspended_at,
      metadata
    ) VALUES (
      v_mapping.tenant_id,
      v_plan_price.plan_id,
      _internal_status,
      'bcr01_provider_confirmed',
      coalesce(_current_period_start, now()),
      _current_period_start,
      _current_period_end,
      CASE WHEN _internal_status = 'canceled' THEN coalesce(_canceled_at, _provider_observed_at) ELSE _canceled_at END,
      CASE WHEN _internal_status = 'suspended' THEN _provider_observed_at ELSE NULL END,
      jsonb_build_object(
        'provider_code', _provider_code,
        'provider_subscription_ref', _provider_subscription_ref,
        'provider_price_ref', _provider_price_ref,
        'plan_price_id', v_plan_price.id,
        'provider_observed_at', _provider_observed_at
      )
    )
    RETURNING * INTO v_subscription;
  END IF;

  v_previous_observation :=
    nullif(v_subscription.metadata ->> 'provider_observed_at', '')::timestamptz;

  IF v_previous_observation IS NOT NULL
     AND v_previous_observation > _provider_observed_at THEN
    UPDATE public.billing_events
       SET processing_status = 'reconciled',
           processed_at = now(),
           tenant_id = v_mapping.tenant_id,
           provider_mapping_id = v_mapping.id,
           subscription_id = v_subscription.id
     WHERE id = _event_id;

    INSERT INTO public.billing_event_transitions (
      billing_event_id, from_status, to_status, reason
    ) VALUES (
      _event_id, v_event.processing_status, 'reconciled', 'bcr01_stale_provider_observation'
    );

    RETURN jsonb_build_object(
      'applied', false,
      'reason', 'stale_provider_observation',
      'tenantId', v_mapping.tenant_id,
      'subscriptionId', v_subscription.id,
      'mappingId', v_mapping.id,
      'eventStatus', 'reconciled'
    );
  END IF;

  UPDATE public.tenant_subscriptions
     SET plan_id = v_plan_price.plan_id,
         status = _internal_status,
         status_reason = 'bcr01_provider_confirmed',
         current_period_start = _current_period_start,
         current_period_end = _current_period_end,
         canceled_at = CASE
           WHEN _internal_status = 'canceled' THEN coalesce(_canceled_at, _provider_observed_at)
           ELSE NULL
         END,
         suspended_at = CASE
           WHEN _internal_status = 'suspended' THEN _provider_observed_at
           ELSE NULL
         END,
         metadata = metadata || jsonb_build_object(
           'provider_code', _provider_code,
           'provider_subscription_ref', _provider_subscription_ref,
           'provider_price_ref', _provider_price_ref,
           'plan_price_id', v_plan_price.id,
           'provider_observed_at', _provider_observed_at
         )
   WHERE id = v_subscription.id
  RETURNING * INTO v_subscription;

  UPDATE public.tenant_billing_provider_mappings
     SET status = 'linked',
         subscription_id = v_subscription.id,
         provider_subscription_ref = _provider_subscription_ref
   WHERE id = v_mapping.id
  RETURNING * INTO v_mapping;

  v_final_event_status := CASE
    WHEN coalesce(_requires_reconciliation, false) THEN 'reconciled'
    ELSE 'processed'
  END;

  UPDATE public.billing_events
     SET processing_status = v_final_event_status,
         processed_at = now(),
         tenant_id = v_mapping.tenant_id,
         provider_mapping_id = v_mapping.id,
         subscription_id = v_subscription.id
   WHERE id = _event_id;

  INSERT INTO public.billing_event_transitions (
    billing_event_id, from_status, to_status, reason
  ) VALUES (
    _event_id, v_event.processing_status, v_final_event_status, 'bcr01_provider_lifecycle_applied'
  );

  RETURN jsonb_build_object(
    'applied', true,
    'tenantId', v_mapping.tenant_id,
    'subscriptionId', v_subscription.id,
    'mappingId', v_mapping.id,
    'planId', v_plan_price.plan_id,
    'planPriceId', v_plan_price.id,
    'internalStatus', _internal_status,
    'eventStatus', v_final_event_status
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.bcr01_apply_provider_subscription_observation(
  uuid, text, text, text, text, text, boolean, timestamptz,
  timestamptz, timestamptz, timestamptz
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bcr01_apply_provider_subscription_observation(
  uuid, text, text, text, text, text, boolean, timestamptz,
  timestamptz, timestamptz, timestamptz
) TO service_role;

-- ============================================================
-- 5) Retire rejected BCA-01 runtime mutation primitives
-- ============================================================
DROP FUNCTION IF EXISTS public.bca01_reserve_billing_event(
  text, text, text, text, jsonb, uuid, timestamptz
);

DROP FUNCTION IF EXISTS public.bca01_apply_provider_subscription_state(
  uuid, uuid, text, text, text, text, boolean, timestamptz,
  uuid, timestamptz, timestamptz, timestamptz
);

COMMIT;
