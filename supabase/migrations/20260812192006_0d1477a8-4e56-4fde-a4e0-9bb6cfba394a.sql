-- BCA-01 — Billing & Commercial Activation
-- 1. Harness cleanup gate (determinístico, fail-closed)
-- 2. Autoridade de preço provider-agnostic
-- 3. Mapeamento de identidade de preço por provider (referência opaca)
-- 4. Catálogo do provider Stripe (não-secreto, idempotente, conflict-safe)
-- 5. RPCs de reserva idempotente de evento e lifecycle confirmado pelo provider
-- RLS habilitado deny-by-default nas novas tabelas; grants apenas service_role.

DO $bca01_cleanup$
DECLARE
  v_protected_tenant uuid := '9664d189-4a12-4caa-8243-dc73383447e6';
  v_plans_before integer;
  v_subs_before integer;
  v_ents_before integer;
  v_plan_ents_before integer;
  v_plans_after integer;
  v_subs_after integer;
  v_ents_after integer;
  v_plan_ents_after integer;
  v_ambiguous integer;
BEGIN
  SELECT count(*) INTO v_plans_before FROM public.commercial_plans;
  SELECT count(*) INTO v_subs_before FROM public.tenant_subscriptions;
  SELECT count(*) INTO v_ents_before FROM public.tenant_entitlements;
  SELECT count(*) INTO v_plan_ents_before FROM public.commercial_plan_entitlements;

  CREATE TEMP TABLE bca01_harness_tenants ON COMMIT DROP AS
    SELECT id
      FROM public.tenants
     WHERE nome = 'SCP-012.0.2.1 harness'
       AND slug ~ '^scp0121[-_][0-9a-f]{8,12}$';

  CREATE TEMP TABLE bca01_harness_plans ON COMMIT DROP AS
    SELECT id
      FROM public.commercial_plans
     WHERE name = 'harness'
       AND code ~ '^scp0121_plan_[0-9a-f]{12}$';

  IF EXISTS (SELECT 1 FROM bca01_harness_tenants WHERE id = v_protected_tenant) THEN
    RAISE EXCEPTION 'bca01_protected_tenant_classified_as_harness';
  END IF;

  SELECT count(*) INTO v_ambiguous
    FROM public.commercial_plans p
   WHERE p.id NOT IN (SELECT id FROM bca01_harness_plans);
  IF v_ambiguous > 0 THEN
    RAISE EXCEPTION 'bca01_non_harness_commercial_plan_present: %', v_ambiguous;
  END IF;

  SELECT count(*) INTO v_ambiguous
    FROM public.tenant_subscriptions s
   WHERE s.tenant_id NOT IN (SELECT id FROM bca01_harness_tenants);
  IF v_ambiguous > 0 THEN
    RAISE EXCEPTION 'bca01_non_harness_subscription_present: %', v_ambiguous;
  END IF;

  SELECT count(*) INTO v_ambiguous
    FROM public.tenant_entitlements e
   WHERE e.tenant_id NOT IN (SELECT id FROM bca01_harness_tenants);
  IF v_ambiguous > 0 THEN
    RAISE EXCEPTION 'bca01_non_harness_tenant_entitlement_present: %', v_ambiguous;
  END IF;

  SELECT count(*) INTO v_ambiguous
    FROM public.commercial_plan_entitlements pe
   WHERE pe.plan_id NOT IN (SELECT id FROM bca01_harness_plans);
  IF v_ambiguous > 0 THEN
    RAISE EXCEPTION 'bca01_non_harness_plan_entitlement_present: %', v_ambiguous;
  END IF;

  IF EXISTS (SELECT 1 FROM public.tenant_subscriptions WHERE tenant_id = v_protected_tenant) THEN
    RAISE EXCEPTION 'bca01_protected_tenant_unexpected_subscription';
  END IF;
  IF EXISTS (SELECT 1 FROM public.tenant_billing_provider_mappings WHERE tenant_id = v_protected_tenant) THEN
    RAISE EXCEPTION 'bca01_protected_tenant_unexpected_provider_mapping';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.billing_events be
     WHERE be.tenant_id IN (SELECT id FROM bca01_harness_tenants)
        OR be.subscription_id IN (
             SELECT id FROM public.tenant_subscriptions
              WHERE tenant_id IN (SELECT id FROM bca01_harness_tenants)
           )
  ) THEN
    RAISE EXCEPTION 'bca01_billing_event_depends_on_harness_fixture';
  END IF;

  DELETE FROM public.tenant_entitlements
   WHERE tenant_id IN (SELECT id FROM bca01_harness_tenants);
  DELETE FROM public.tenant_subscriptions
   WHERE tenant_id IN (SELECT id FROM bca01_harness_tenants);
  DELETE FROM public.commercial_plan_entitlements
   WHERE plan_id IN (SELECT id FROM bca01_harness_plans);
  DELETE FROM public.commercial_plans
   WHERE id IN (SELECT id FROM bca01_harness_plans);

  SELECT count(*) INTO v_plans_after FROM public.commercial_plans;
  SELECT count(*) INTO v_subs_after FROM public.tenant_subscriptions;
  SELECT count(*) INTO v_ents_after FROM public.tenant_entitlements;
  SELECT count(*) INTO v_plan_ents_after FROM public.commercial_plan_entitlements;

  IF v_plans_after <> 0 OR v_subs_after <> 0 OR v_ents_after <> 0 OR v_plan_ents_after <> 0 THEN
    RAISE EXCEPTION 'bca01_harness_cleanup_incomplete: plans=% subs=% ents=% plan_ents=%',
      v_plans_after, v_subs_after, v_ents_after, v_plan_ents_after;
  END IF;

  RAISE NOTICE 'bca01_harness_cleanup before: plans=% subs=% tenant_entitlements=% plan_entitlements=%',
    v_plans_before, v_subs_before, v_ents_before, v_plan_ents_before;
  RAISE NOTICE 'bca01_harness_cleanup after: plans=% subs=% tenant_entitlements=% plan_entitlements=%',
    v_plans_after, v_subs_after, v_ents_after, v_plan_ents_after;
END
$bca01_cleanup$;

CREATE TABLE IF NOT EXISTS public.commercial_plan_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.commercial_plans (id) ON DELETE CASCADE,
  code text NOT NULL,
  currency text NOT NULL,
  unit_amount_minor integer NOT NULL,
  billing_interval text NOT NULL,
  interval_count integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commercial_plan_prices_code_format_chk CHECK (code ~ '^[a-z][a-z0-9_.-]*$'),
  CONSTRAINT commercial_plan_prices_code_uq UNIQUE (code),
  CONSTRAINT commercial_plan_prices_currency_chk CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT commercial_plan_prices_amount_chk CHECK (unit_amount_minor > 0),
  CONSTRAINT commercial_plan_prices_interval_chk CHECK (billing_interval IN ('month', 'year')),
  CONSTRAINT commercial_plan_prices_interval_count_chk CHECK (interval_count > 0),
  CONSTRAINT commercial_plan_prices_status_chk CHECK (status IN ('draft', 'active', 'archived'))
);

COMMENT ON TABLE public.commercial_plan_prices IS
  'BCA-01: preço interno provider-agnostic de um plano comercial. Nenhuma coluna provider-specific.';

CREATE UNIQUE INDEX IF NOT EXISTS ux_commercial_plan_prices_active_shape
  ON public.commercial_plan_prices (plan_id, currency, billing_interval, interval_count)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS ix_commercial_plan_prices_plan
  ON public.commercial_plan_prices (plan_id, status);

CREATE TABLE IF NOT EXISTS public.billing_plan_provider_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_price_id uuid NOT NULL REFERENCES public.commercial_plan_prices (id) ON DELETE CASCADE,
  provider_code text NOT NULL REFERENCES public.billing_provider_definitions (code) ON DELETE RESTRICT,
  provider_price_ref text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billing_plan_provider_prices_ref_chk
    CHECK (length(btrim(provider_price_ref)) BETWEEN 3 AND 255),
  CONSTRAINT billing_plan_provider_prices_status_chk
    CHECK (status IN ('draft', 'enabled', 'disabled', 'archived')),
  CONSTRAINT billing_plan_provider_prices_provider_ref_uq
    UNIQUE (provider_code, provider_price_ref)
);

COMMENT ON TABLE public.billing_plan_provider_prices IS
  'BCA-01: mapeamento entre preço interno e referência externa OPACA do provider. Sem colunas provider-specific.';

CREATE UNIQUE INDEX IF NOT EXISTS ux_billing_plan_provider_prices_enabled
  ON public.billing_plan_provider_prices (plan_price_id, provider_code)
  WHERE status = 'enabled';

CREATE INDEX IF NOT EXISTS ix_billing_plan_provider_prices_provider
  ON public.billing_plan_provider_prices (provider_code, status);

DROP TRIGGER IF EXISTS set_updated_at_commercial_plan_prices ON public.commercial_plan_prices;
CREATE TRIGGER set_updated_at_commercial_plan_prices
  BEFORE UPDATE ON public.commercial_plan_prices
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_billing_plan_provider_prices ON public.billing_plan_provider_prices;
CREATE TRIGGER set_updated_at_billing_plan_provider_prices
  BEFORE UPDATE ON public.billing_plan_provider_prices
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.commercial_plan_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_plan_provider_prices ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.commercial_plan_prices FROM anon, authenticated;
REVOKE ALL ON TABLE public.billing_plan_provider_prices FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.commercial_plan_prices TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.billing_plan_provider_prices TO service_role;

DO $bca01_provider$
DECLARE
  v_existing public.billing_provider_definitions;
BEGIN
  SELECT * INTO v_existing
    FROM public.billing_provider_definitions
   WHERE code = 'stripe';

  IF NOT FOUND THEN
    INSERT INTO public.billing_provider_definitions
      (code, name, status, provider_type, capabilities, metadata)
    VALUES (
      'stripe',
      'Stripe',
      'enabled',
      'external',
      '{"hosted_checkout": true, "customer_portal": true, "signed_webhooks": true, "subscription_retrieval": true}'::jsonb,
      '{"activation_stage": "BCA-01", "authorized_mode": "test"}'::jsonb
    );
  ELSE
    IF v_existing.provider_type <> 'external'
       OR v_existing.status NOT IN ('candidate', 'enabled') THEN
      RAISE EXCEPTION 'bca01_provider_definition_conflict: status=% type=%',
        v_existing.status, v_existing.provider_type;
    END IF;

    UPDATE public.billing_provider_definitions
       SET status = 'enabled'
     WHERE code = 'stripe'
       AND status = 'candidate';
  END IF;
END
$bca01_provider$;

CREATE OR REPLACE FUNCTION public.bca01_reserve_billing_event(
  _provider_code text,
  _provider_event_id text,
  _event_type text,
  _payload_hash text,
  _payload_sanitized jsonb,
  _tenant_id uuid DEFAULT NULL,
  _occurred_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event public.billing_events;
  v_inserted_id uuid;
BEGIN
  IF _provider_code IS NULL OR length(btrim(_provider_code)) = 0
     OR _provider_event_id IS NULL OR length(btrim(_provider_event_id)) = 0
     OR _payload_hash IS NULL OR length(btrim(_payload_hash)) = 0 THEN
    RAISE EXCEPTION 'bca01_billing_event_identity_required';
  END IF;

  INSERT INTO public.billing_events (
    provider_code, provider_event_id, event_type, processing_status,
    tenant_id, occurred_at, idempotency_key, payload_sanitized, payload_hash
  ) VALUES (
    _provider_code, _provider_event_id, _event_type, 'verified',
    _tenant_id, _occurred_at, _provider_code || ':' || _provider_event_id,
    coalesce(_payload_sanitized, '{}'::jsonb), _payload_hash
  )
  ON CONFLICT (provider_code, provider_event_id) DO NOTHING
  RETURNING id INTO v_inserted_id;

  IF v_inserted_id IS NOT NULL THEN
    INSERT INTO public.billing_event_transitions (billing_event_id, from_status, to_status, reason)
    VALUES (v_inserted_id, NULL, 'verified', 'bca01_signature_verified');

    RETURN jsonb_build_object(
      'reserved', true,
      'duplicate', false,
      'eventId', v_inserted_id,
      'processingStatus', 'verified'
    );
  END IF;

  SELECT * INTO v_event
    FROM public.billing_events
   WHERE provider_code = _provider_code
     AND provider_event_id = _provider_event_id
   FOR UPDATE;

  IF v_event.payload_hash IS DISTINCT FROM _payload_hash THEN
    RAISE EXCEPTION 'bca01_billing_event_payload_conflict';
  END IF;

  RETURN jsonb_build_object(
    'reserved', false,
    'duplicate', true,
    'eventId', v_event.id,
    'processingStatus', v_event.processing_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.bca01_reserve_billing_event(text, text, text, text, jsonb, uuid, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bca01_reserve_billing_event(text, text, text, text, jsonb, uuid, timestamptz) TO service_role;

CREATE OR REPLACE FUNCTION public.bca01_apply_provider_subscription_state(
  _event_id uuid,
  _tenant_id uuid,
  _provider_code text,
  _provider_customer_ref text,
  _provider_subscription_ref text,
  _internal_status text,
  _requires_reconciliation boolean,
  _provider_observed_at timestamptz,
  _plan_id uuid DEFAULT NULL,
  _current_period_start timestamptz DEFAULT NULL,
  _current_period_end timestamptz DEFAULT NULL,
  _canceled_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event public.billing_events;
  v_mapping public.tenant_billing_provider_mappings;
  v_subscription public.tenant_subscriptions;
  v_previous_observation timestamptz;
  v_final_status text;
BEGIN
  IF _event_id IS NULL OR _tenant_id IS NULL OR _provider_code IS NULL
     OR _provider_subscription_ref IS NULL OR _internal_status IS NULL
     OR _provider_observed_at IS NULL THEN
    RAISE EXCEPTION 'bca01_lifecycle_input_required';
  END IF;

  SELECT * INTO v_event FROM public.billing_events WHERE id = _event_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'bca01_billing_event_not_reserved';
  END IF;
  IF v_event.processing_status IN ('processed', 'ignored') THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'already_processed');
  END IF;

  SELECT * INTO v_mapping
    FROM public.tenant_billing_provider_mappings
   WHERE tenant_id = _tenant_id
     AND provider_code = _provider_code
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'bca01_provider_mapping_absent';
  END IF;
  IF v_mapping.status NOT IN ('draft', 'linked') THEN
    RAISE EXCEPTION 'bca01_provider_mapping_not_operable';
  END IF;
  IF _provider_customer_ref IS NOT NULL
     AND v_mapping.provider_customer_ref IS DISTINCT FROM _provider_customer_ref THEN
    RAISE EXCEPTION 'bca01_provider_customer_ref_mismatch';
  END IF;
  IF v_mapping.provider_subscription_ref IS NOT NULL
     AND v_mapping.provider_subscription_ref IS DISTINCT FROM _provider_subscription_ref THEN
    RAISE EXCEPTION 'bca01_provider_subscription_ref_mismatch';
  END IF;

  IF v_mapping.subscription_id IS NOT NULL THEN
    SELECT * INTO v_subscription
      FROM public.tenant_subscriptions
     WHERE id = v_mapping.subscription_id
     FOR UPDATE;
  END IF;

  IF v_subscription.id IS NULL THEN
    INSERT INTO public.tenant_subscriptions (
      tenant_id, plan_id, status, status_reason, started_at,
      current_period_start, current_period_end, canceled_at, metadata
    ) VALUES (
      _tenant_id, _plan_id, _internal_status, 'bca01_provider_confirmed', now(),
      _current_period_start, _current_period_end, _canceled_at,
      jsonb_build_object(
        'provider_code', _provider_code,
        'provider_subscription_ref', _provider_subscription_ref,
        'provider_observed_at', _provider_observed_at
      )
    )
    RETURNING * INTO v_subscription;
  ELSE
    v_previous_observation :=
      nullif(v_subscription.metadata ->> 'provider_observed_at', '')::timestamptz;

    IF v_previous_observation IS NOT NULL AND v_previous_observation > _provider_observed_at THEN
      UPDATE public.billing_events
         SET processing_status = 'reconciled',
             processed_at = now()
       WHERE id = _event_id;
      INSERT INTO public.billing_event_transitions (billing_event_id, from_status, to_status, reason)
      VALUES (_event_id, v_event.processing_status, 'reconciled', 'bca01_stale_provider_observation');

      RETURN jsonb_build_object('applied', false, 'reason', 'stale_provider_observation');
    END IF;

    UPDATE public.tenant_subscriptions
       SET status = _internal_status,
           status_reason = 'bca01_provider_confirmed',
           plan_id = coalesce(_plan_id, plan_id),
           current_period_start = coalesce(_current_period_start, current_period_start),
           current_period_end = coalesce(_current_period_end, current_period_end),
           canceled_at = coalesce(_canceled_at, canceled_at),
           metadata = metadata
             || jsonb_build_object(
                  'provider_code', _provider_code,
                  'provider_subscription_ref', _provider_subscription_ref,
                  'provider_observed_at', _provider_observed_at
                )
     WHERE id = v_subscription.id
    RETURNING * INTO v_subscription;
  END IF;

  UPDATE public.tenant_billing_provider_mappings
     SET status = 'linked',
         subscription_id = v_subscription.id,
         provider_subscription_ref = _provider_subscription_ref,
         provider_customer_ref = coalesce(_provider_customer_ref, provider_customer_ref)
   WHERE id = v_mapping.id;

  v_final_status := CASE WHEN coalesce(_requires_reconciliation, false) THEN 'reconciled' ELSE 'processed' END;

  UPDATE public.billing_events
     SET processing_status = v_final_status,
         processed_at = now(),
         subscription_id = v_subscription.id,
         provider_mapping_id = v_mapping.id,
         tenant_id = coalesce(tenant_id, _tenant_id)
   WHERE id = _event_id;

  INSERT INTO public.billing_event_transitions (billing_event_id, from_status, to_status, reason)
  VALUES (_event_id, v_event.processing_status, v_final_status, 'bca01_lifecycle_applied');

  RETURN jsonb_build_object(
    'applied', true,
    'subscriptionId', v_subscription.id,
    'mappingId', v_mapping.id,
    'internalStatus', _internal_status,
    'eventStatus', v_final_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.bca01_apply_provider_subscription_state(uuid, uuid, text, text, text, text, boolean, timestamptz, uuid, timestamptz, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bca01_apply_provider_subscription_state(uuid, uuid, text, text, text, text, boolean, timestamptz, uuid, timestamptz, timestamptz, timestamptz) TO service_role;
