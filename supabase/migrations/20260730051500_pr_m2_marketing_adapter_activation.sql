-- PR-M2 consolidated corrective — provider adapter contracts without live execution.
BEGIN;

ALTER TABLE public.tenant_marketing_connectors
  ADD COLUMN IF NOT EXISTS adapter_version integer,
  ADD COLUMN IF NOT EXISTS provider_contract_version integer,
  ADD COLUMN IF NOT EXISTS last_fixture_verified_at timestamptz;

ALTER TABLE public.tenant_marketing_connectors
  DROP CONSTRAINT IF EXISTS tenant_marketing_connectors_verification_state_check;
ALTER TABLE public.tenant_marketing_connectors
  ADD CONSTRAINT tenant_marketing_connectors_verification_state_check CHECK (
    verification_state IN (
      'not_required','verification_pending','verified','verification_failed',
      'adapter_not_implemented','not_live_verified'
    )
  );

UPDATE public.tenant_marketing_connectors
SET adapter_version = 1,
    provider_contract_version = 1,
    verification_state = 'not_live_verified',
    availability_state = 'credential_required',
    active = false,
    last_error_code = NULL,
    updated_at = now()
WHERE channel_key IN ('META_ADS','GOOGLE_ADS')
  AND EXISTS (
    SELECT 1 FROM prm2_rebaseline.authorized_tenant_ids() authorized
    WHERE authorized.tenant_id = tenant_marketing_connectors.tenant_id
  );

ALTER TABLE public.tenant_marketing_connectors
  DROP CONSTRAINT IF EXISTS tenant_marketing_adapter_contract;
ALTER TABLE public.tenant_marketing_connectors
  ADD CONSTRAINT tenant_marketing_adapter_contract CHECK (
    channel_key NOT IN ('META_ADS','GOOGLE_ADS')
    OR (
      adapter_version IS NOT NULL
      AND adapter_version > 0
      AND provider_contract_version IS NOT NULL
      AND provider_contract_version > 0
      AND verification_state IN ('not_live_verified','verification_pending','verified','verification_failed')
    )
  );

COMMIT;
