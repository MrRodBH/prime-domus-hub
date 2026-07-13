
-- SCP-012.0.2 — Transaction-Safe Commercial Authority Materialization
-- Read-only resolver for CommercialLimitDecision(users.seats).
-- SECURITY DEFINER + service_role-only. Revalidates Trusted Actor Context.

CREATE OR REPLACE FUNCTION public.resolve_commercial_seat_decision(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _requested_increment integer
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_feature_key CONSTANT text := 'users.seats';
  v_is_super boolean;
  v_sub_id uuid;
  v_sub_status text;
  v_sub_plan_id uuid;
  v_sub_started_at timestamptz;
  v_ent_source text := NULL;
  v_ent_value_bool boolean;
  v_ent_value_int integer;
  v_ent_value_decimal numeric;
  v_ent_value_text text;
  v_ent_effective boolean := false;
  v_ent_found boolean := false;
  v_limit integer := NULL;
  v_source text := 'none';
  v_billing_status text := 'unknown';
  v_has_provider_mapping boolean := false;
  v_feature_allowed boolean;
  v_feature_reason text;
  v_feature_source text;
  v_used integer;
  v_value_effective_disabled boolean := false;
BEGIN
  -- (1) Parameter validation
  IF _actor_user_id IS NULL THEN RAISE EXCEPTION 'Invalid actor' USING ERRCODE = '22023'; END IF;
  IF _tenant_id IS NULL THEN RAISE EXCEPTION 'Invalid tenant' USING ERRCODE = '22023'; END IF;
  IF _requested_increment IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'Invalid requestedIncrement' USING ERRCODE = '22023';
  END IF;
  IF _tenant_origin IS NULL OR _tenant_origin NOT IN ('impersonation','selection','single-membership') THEN
    RAISE EXCEPTION 'Invalid tenant origin' USING ERRCODE = '22023';
  END IF;

  -- (2) Actor + tenant must exist
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _actor_user_id) THEN
    RAISE EXCEPTION 'Actor not found' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = _tenant_id) THEN
    RAISE EXCEPTION 'Tenant not found' USING ERRCODE = '22023';
  END IF;

  -- (3) Trusted Actor Context revalidation
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = _actor_user_id AND role = 'super_admin'
  ) INTO v_is_super;

  IF v_is_super THEN
    IF _tenant_origin <> 'impersonation' THEN
      RAISE EXCEPTION 'Super admin requires impersonation origin' USING ERRCODE = '22023';
    END IF;
  ELSE
    IF _tenant_origin NOT IN ('selection','single-membership') THEN
      RAISE EXCEPTION 'Regular user cannot use impersonation origin' USING ERRCODE = '22023';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.tenant_members
       WHERE tenant_id = _tenant_id
         AND user_id = _actor_user_id
         AND membership_status = 'active'
    ) THEN
      RAISE EXCEPTION 'No active membership' USING ERRCODE = '22023';
    END IF;
  END IF;

  -- (4) featureKey is fixed server-side to 'users.seats' (cataloged; no catalog short-circuit)

  -- (5) Deterministic subscription selection (priority + tie-breaker)
  SELECT id, status, plan_id, started_at
    INTO v_sub_id, v_sub_status, v_sub_plan_id, v_sub_started_at
    FROM public.tenant_subscriptions
   WHERE tenant_id = _tenant_id
   ORDER BY
     CASE status
       WHEN 'active'    THEN 0
       WHEN 'trialing'  THEN 1
       WHEN 'past_due'  THEN 2
       WHEN 'grace'     THEN 3
       WHEN 'suspended' THEN 4
       WHEN 'canceled'  THEN 5
       WHEN 'unpaid'    THEN 6
       ELSE 7
     END ASC,
     started_at DESC NULLS LAST,
     id ASC
   LIMIT 1;

  -- (6) Resolve entitlement: tenant > plan > none
  SELECT source, value_bool, value_int, value_decimal, value_text,
         (now() >= effective_from AND (effective_until IS NULL OR now() <= effective_until))
    INTO v_ent_source, v_ent_value_bool, v_ent_value_int, v_ent_value_decimal, v_ent_value_text, v_ent_effective
    FROM public.tenant_entitlements
   WHERE tenant_id = _tenant_id
     AND entitlement_key = v_feature_key
   ORDER BY effective_from DESC, id ASC
   LIMIT 1;

  IF FOUND THEN
    v_ent_found := true;
    v_source := 'tenant';
  ELSIF v_sub_plan_id IS NOT NULL THEN
    SELECT value_bool, value_int, value_decimal, value_text
      INTO v_ent_value_bool, v_ent_value_int, v_ent_value_decimal, v_ent_value_text
      FROM public.commercial_plan_entitlements
     WHERE plan_id = v_sub_plan_id
       AND entitlement_key = v_feature_key
     ORDER BY id ASC
     LIMIT 1;
    IF FOUND THEN
      v_ent_found := true;
      v_ent_effective := true; -- plan-level entries have no effective window
      v_source := 'plan';
    END IF;
  END IF;

  -- Extract numeric limit (pickValue precedence: bool > int > decimal > text)
  IF v_ent_found THEN
    IF v_ent_value_bool IS NOT NULL THEN
      -- boolean value at users.seats acts as explicit disable when false
      v_value_effective_disabled := (v_ent_value_bool = false);
      v_limit := NULL;
    ELSIF v_ent_value_int IS NOT NULL THEN
      v_limit := v_ent_value_int;
    ELSIF v_ent_value_decimal IS NOT NULL THEN
      IF v_ent_value_decimal = floor(v_ent_value_decimal)
         AND v_ent_value_decimal >= 0
         AND v_ent_value_decimal <= 9007199254740991 THEN
        v_limit := v_ent_value_decimal::integer;
      ELSE
        v_limit := NULL;
      END IF;
    ELSE
      v_limit := NULL;
    END IF;
  END IF;

  -- (7) Billing health
  SELECT EXISTS (SELECT 1 FROM public.tenant_billing_provider_mappings WHERE tenant_id = _tenant_id)
    INTO v_has_provider_mapping;

  IF v_sub_id IS NULL THEN
    v_billing_status := 'unknown';
  ELSIF v_sub_status IN ('active','trialing') THEN
    v_billing_status := 'healthy';
  ELSIF v_sub_status IN ('past_due','grace') THEN
    v_billing_status := 'attention_required';
  ELSIF v_sub_status IN ('suspended','canceled','unpaid') THEN
    v_billing_status := 'blocked';
  ELSE
    v_billing_status := 'unknown';
  END IF;

  -- (8) Feature-gate decision (mirrors decideCommercialFeature precedence)
  IF v_billing_status = 'blocked' THEN
    v_feature_allowed := false; v_feature_reason := 'billing_blocked';
    v_feature_source := CASE WHEN v_ent_found THEN v_source ELSE 'none' END;
  ELSIF v_billing_status = 'attention_required' THEN
    v_feature_allowed := false; v_feature_reason := 'billing_attention_required';
    v_feature_source := CASE WHEN v_ent_found THEN v_source ELSE 'none' END;
  ELSIF v_ent_found AND v_ent_effective THEN
    IF v_value_effective_disabled THEN
      v_feature_allowed := false; v_feature_reason := 'not_entitled'; v_feature_source := v_source;
    ELSE
      v_feature_allowed := true; v_feature_reason := 'entitled'; v_feature_source := v_source;
    END IF;
  ELSIF v_ent_found AND NOT v_ent_effective THEN
    v_feature_allowed := false; v_feature_reason := 'not_entitled'; v_feature_source := v_source;
  ELSIF v_billing_status = 'unknown' THEN
    v_feature_allowed := false; v_feature_reason := 'billing_unknown'; v_feature_source := 'none';
  ELSE
    v_feature_allowed := false; v_feature_reason := 'not_entitled'; v_feature_source := 'none';
  END IF;

  -- (9) Negative feature decision short-circuit — no tenant_members read
  IF NOT v_feature_allowed THEN
    RETURN jsonb_build_object(
      'tenantId', _tenant_id::text,
      'featureKey', v_feature_key,
      'allowed', false,
      'reason', v_feature_reason,
      'source', v_feature_source,
      'limit', NULL,
      'used', NULL,
      'requestedIncrement', _requested_increment,
      'remaining', NULL
    );
  END IF;

  -- (10) Extract limit — invalid/absent → not_evaluated / none
  IF v_limit IS NULL OR v_limit < 0 THEN
    RETURN jsonb_build_object(
      'tenantId', _tenant_id::text,
      'featureKey', v_feature_key,
      'allowed', false,
      'reason', 'not_evaluated',
      'source', 'none',
      'limit', NULL,
      'used', NULL,
      'requestedIncrement', _requested_increment,
      'remaining', NULL
    );
  END IF;

  -- (11) Count seats: tenant_members where status IN ('active','invited')
  BEGIN
    SELECT COUNT(*)::integer INTO v_used
      FROM public.tenant_members
     WHERE tenant_id = _tenant_id
       AND membership_status IN ('active','invited');
  EXCEPTION WHEN OTHERS THEN
    v_used := NULL;
  END;

  IF v_used IS NULL OR v_used < 0 THEN
    RETURN jsonb_build_object(
      'tenantId', _tenant_id::text,
      'featureKey', v_feature_key,
      'allowed', false,
      'reason', 'not_evaluated',
      'source', v_source,
      'limit', v_limit,
      'used', NULL,
      'requestedIncrement', _requested_increment,
      'remaining', NULL
    );
  END IF;

  -- (12) Final decision
  IF v_used + _requested_increment <= v_limit THEN
    RETURN jsonb_build_object(
      'tenantId', _tenant_id::text,
      'featureKey', v_feature_key,
      'allowed', true,
      'reason', 'entitled',
      'source', v_source,
      'limit', v_limit,
      'used', v_used,
      'requestedIncrement', _requested_increment,
      'remaining', GREATEST(v_limit - v_used, 0)
    );
  ELSE
    RETURN jsonb_build_object(
      'tenantId', _tenant_id::text,
      'featureKey', v_feature_key,
      'allowed', false,
      'reason', 'limit_reached',
      'source', v_source,
      'limit', v_limit,
      'used', v_used,
      'requestedIncrement', _requested_increment,
      'remaining', 0
    );
  END IF;
END;
$fn$;

-- Hard grants: service_role only
REVOKE ALL ON FUNCTION public.resolve_commercial_seat_decision(uuid, uuid, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_commercial_seat_decision(uuid, uuid, text, integer) FROM anon;
REVOKE ALL ON FUNCTION public.resolve_commercial_seat_decision(uuid, uuid, text, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_commercial_seat_decision(uuid, uuid, text, integer) TO service_role;

COMMENT ON FUNCTION public.resolve_commercial_seat_decision(uuid, uuid, text, integer) IS
'SCP-012.0.2 — Transaction-safe commercial authority for CommercialLimitDecision(users.seats). Read-only resolver. SECURITY DEFINER, service_role EXECUTE only. Revalidates Trusted Actor Context (actor, tenant, origin, membership) and returns the canonical DTO. No mutation, no lock, no reservation, no enforcement — that scope belongs to SCP-012.0.3 (membership mutation boundary) and SCP-012 (atomic enforcement).';
