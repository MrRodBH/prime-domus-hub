-- BCR-01 — canonical billing event terminalization and reconciliation reservation.
-- Repository-first; do not apply before the dedicated BCR-P5 database gate.

BEGIN;

CREATE OR REPLACE FUNCTION public.bcr01_mark_billing_event_terminal(
  _event_id uuid,
  _to_status text,
  _reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_event public.billing_events;
BEGIN
  IF _event_id IS NULL
     OR _to_status NOT IN ('processed', 'ignored', 'failed', 'reconciled')
     OR _reason IS NULL OR length(btrim(_reason)) = 0 THEN
    RAISE EXCEPTION 'bcr01_terminal_event_input_invalid' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_event
    FROM public.billing_events
   WHERE id = _event_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'bcr01_terminal_event_missing' USING ERRCODE = '22023';
  END IF;

  IF v_event.processing_status IN ('processed', 'ignored', 'failed', 'reconciled') THEN
    IF v_event.processing_status = _to_status THEN
      RETURN jsonb_build_object(
        'changed', false,
        'eventId', v_event.id,
        'processingStatus', v_event.processing_status
      );
    END IF;
    RAISE EXCEPTION 'bcr01_terminal_event_transition_conflict' USING ERRCODE = '23514';
  END IF;

  IF v_event.processing_status NOT IN ('verified', 'normalized') THEN
    RAISE EXCEPTION 'bcr01_terminal_event_not_verified' USING ERRCODE = '23514';
  END IF;

  UPDATE public.billing_events
     SET processing_status = _to_status,
         processed_at = now(),
         error_code = CASE WHEN _to_status = 'failed' THEN _reason ELSE NULL END,
         error_message = NULL
   WHERE id = _event_id;

  INSERT INTO public.billing_event_transitions (
    billing_event_id, from_status, to_status, reason
  ) VALUES (
    _event_id, v_event.processing_status, _to_status, _reason
  );

  RETURN jsonb_build_object(
    'changed', true,
    'eventId', _event_id,
    'processingStatus', _to_status
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.bcr01_mark_billing_event_terminal(uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bcr01_mark_billing_event_terminal(uuid, text, text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.bcr01_reserve_reconciliation_event(
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
     OR _event_type NOT IN (
       'CheckoutCompleted','SubscriptionCreated','SubscriptionUpdated','SubscriptionCanceled',
       'InvoicePaid','InvoicePaymentFailed','TrialEnding','ChargeRefunded','Unknown'
     )
     OR _payload_hash IS NULL OR _payload_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'bcr01_reconciliation_event_identity_invalid' USING ERRCODE = '22023';
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
    payload_hash,
    metadata
  ) VALUES (
    _provider_code,
    _provider_event_id,
    _event_type,
    'verified',
    NULL,
    _occurred_at,
    _provider_code || ':' || _provider_event_id,
    coalesce(_payload_sanitized, '{}'::jsonb),
    _payload_hash,
    '{"source":"server_reconciliation"}'::jsonb
  )
  ON CONFLICT (provider_code, provider_event_id) DO NOTHING
  RETURNING id INTO v_inserted_id;

  IF v_inserted_id IS NOT NULL THEN
    INSERT INTO public.billing_event_transitions (
      billing_event_id, from_status, to_status, reason
    ) VALUES (
      v_inserted_id, NULL, 'verified', 'bcr01_provider_reconciliation_observed'
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
    RAISE EXCEPTION 'bcr01_reconciliation_event_payload_conflict' USING ERRCODE = '23505';
  END IF;

  RETURN jsonb_build_object(
    'reserved', false,
    'duplicate', true,
    'eventId', v_event.id,
    'processingStatus', v_event.processing_status
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.bcr01_reserve_reconciliation_event(text, text, text, text, jsonb, timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bcr01_reserve_reconciliation_event(text, text, text, text, jsonb, timestamptz)
  TO service_role;

COMMIT;
