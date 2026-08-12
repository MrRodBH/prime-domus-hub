-- DCA-01 consolidated corrective: repair PostgreSQL 42702 in provider registration.
-- Historical DCA-01 migrations remain immutable.

create or replace function public.register_domain_provider_account(
  _account_identifier text,
  _credential_reference text,
  _zones jsonb,
  _actor_user_id uuid,
  _authority_origin text
) returns table (
  id uuid,
  provider_code text,
  account_identifier text,
  enabled boolean,
  capabilities jsonb,
  health_status text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  _account public.domain_provider_accounts%rowtype;
begin
  if _credential_reference !~ '^env:[A-Z][A-Z0-9_]{2,127}$'
     or coalesce(jsonb_typeof(_zones), 'null') <> 'object' or _zones = '{}'::jsonb then
    raise exception using errcode = '22023', message = 'dca01_provider_account_input_invalid';
  end if;
  if exists (
    select 1 from jsonb_each_text(_zones) z
    where z.key !~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$'
       or z.value !~ '^[A-Za-z0-9_-]{8,64}$'
  ) then
    raise exception using errcode = '22023', message = 'dca01_provider_zone_binding_invalid';
  end if;

  insert into public.domain_provider_accounts (
    provider_code, account_identifier, credential_reference, enabled,
    capabilities, health_status, health_detail_sanitized, updated_at
  ) values (
    'cloudflare', _account_identifier, _credential_reference, true,
    jsonb_build_object('zones', _zones, 'custom_hostnames', true, 'ssl_observation', true),
    'unknown', jsonb_build_object('reason', 'provider_account_registered'), now()
  ) on conflict on constraint domain_provider_accounts_provider_account_uq do update
    set credential_reference = excluded.credential_reference,
        enabled = true,
        capabilities = excluded.capabilities,
        health_status = 'unknown',
        health_detail_sanitized = excluded.health_detail_sanitized,
        updated_at = now()
  returning domain_provider_accounts.* into _account;

  insert into public.domain_audit_events (
    tenant_id, domain_id, generation, actor_user_id, authority_origin,
    event_type, detail_sanitized
  ) values (
    null, null, null, _actor_user_id, _authority_origin,
    'provider_account_registered',
    jsonb_build_object('provider_account_id', _account.id, 'provider_code', _account.provider_code,
      'account_identifier', _account.account_identifier, 'credential_reference', '[redacted]')
  );

  return query select _account.id, _account.provider_code, _account.account_identifier,
    _account.enabled, _account.capabilities, _account.health_status;
end;
$$;

revoke all on function public.register_domain_provider_account(text,text,jsonb,uuid,text) from public, anon, authenticated;
grant execute on function public.register_domain_provider_account(text,text,jsonb,uuid,text) to service_role;
