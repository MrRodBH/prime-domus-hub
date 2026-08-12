-- DCA-02 — Cloudflare Custom Metadata Independence & Provider Object Identity Binding
-- Forward-only hardening. Server-owned claim serialization, bind-once identity, fail-closed ambiguity.

alter table public.domain_provider_bindings
  add column binding_state text,
  add column provisioning_key text,
  add column identity_bound_at timestamptz;

update public.domain_provider_bindings
set binding_state = case when custom_hostname_id is null then 'ambiguous' else 'bound' end,
    provisioning_key = encode(
      extensions.digest(convert_to('dca02-legacy:' || id::text, 'UTF8'), 'sha256'),
      'hex'
    ),
    identity_bound_at = case
      when custom_hostname_id is not null then coalesce(observed_at, created_at)
      else null
    end;

alter table public.domain_provider_bindings
  alter column binding_state set not null,
  alter column provisioning_key set not null,
  add constraint domain_provider_bindings_state_valid
    check (binding_state in ('claimed', 'bound', 'ambiguous')),
  add constraint domain_provider_bindings_provisioning_key_valid
    check (provisioning_key ~ '^[0-9a-f]{64}$'),
  add constraint domain_provider_bindings_state_shape
    check (
      (binding_state = 'claimed' and custom_hostname_id is null and identity_bound_at is null)
      or (binding_state = 'ambiguous' and custom_hostname_id is null and identity_bound_at is null)
      or (binding_state = 'bound' and custom_hostname_id is not null and identity_bound_at is not null)
    );

create or replace function public.dca02_guard_provider_binding_write()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if coalesce(current_setting('app.dca02_provider_binding_write', true), '') <> 'on' then
    raise exception using errcode = '42501', message = 'dca02_direct_provider_binding_mutation_prohibited';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger dca02_guard_provider_binding_write
before insert or update or delete on public.domain_provider_bindings
for each row execute function public.dca02_guard_provider_binding_write();

create or replace function public.dca02_claim_domain_provider_binding(
  _tenant_id uuid,
  _domain_id uuid,
  _expected_generation bigint,
  _expected_lock_version bigint,
  _provider_account_id uuid,
  _zone_id text,
  _provisioning_key text
) returns setof public.domain_provider_bindings
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  _domain public.tenant_domains%rowtype;
  _provider public.domain_provider_accounts%rowtype;
  _binding public.domain_provider_bindings%rowtype;
begin
  if _provisioning_key !~ '^[0-9a-f]{64}$' or _zone_id !~ '^[A-Za-z0-9_-]{8,64}$' then
    raise exception using errcode = '22023', message = 'dca02_provider_claim_input_invalid';
  end if;

  select * into _domain
  from public.tenant_domains
  where id = _domain_id and tenant_id = _tenant_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'dca02_domain_not_found';
  end if;
  if _domain.generation <> _expected_generation
     or _domain.lock_version <> _expected_lock_version
     or _domain.status <> 'pending_cloudflare_provisioning'
     or not public.dca01_hostname_reservation_valid(_domain.id) then
    raise exception using errcode = '40001', message = 'dca02_provider_claim_domain_state_conflict';
  end if;

  select * into _provider
  from public.domain_provider_accounts
  where id = _provider_account_id and provider_code = 'cloudflare' and enabled
  for share;
  if not found
     or (_provider.capabilities -> 'zones' ->> _domain.registrable_domain) is distinct from _zone_id then
    raise exception using errcode = '22023', message = 'dca02_provider_claim_context_invalid';
  end if;

  select * into _binding
  from public.domain_provider_bindings
  where domain_id = _domain.id and tenant_id = _domain.tenant_id and generation = _domain.generation
  for update;

  if found then
    if _binding.provider_account_id <> _provider_account_id
       or _binding.zone_id is distinct from _zone_id then
      raise exception using errcode = '22023', message = 'dca02_provider_claim_identity_conflict';
    end if;
    if _binding.binding_state = 'ambiguous' then
      raise exception using errcode = '22023', message = 'dca02_provider_claim_ambiguous';
    end if;
    if _binding.binding_state = 'claimed' and _binding.provisioning_key <> _provisioning_key then
      raise exception using errcode = '40001', message = 'dca02_provider_claim_competing_operation';
    end if;
    if _binding.binding_state = 'bound' and _binding.custom_hostname_id is null then
      raise exception using errcode = '22023', message = 'dca02_provider_binding_shape_invalid';
    end if;
    return next _binding;
    return;
  end if;

  perform set_config('app.dca02_provider_binding_write', 'on', true);
  insert into public.domain_provider_bindings (
    tenant_id, domain_id, generation, provider_account_id, zone_id,
    custom_hostname_id, provider_status, ssl_status, provider_version,
    provider_detail_sanitized, observed_at, binding_state, provisioning_key, identity_bound_at
  ) values (
    _domain.tenant_id, _domain.id, _domain.generation, _provider_account_id, _zone_id,
    null, null, null, null,
    jsonb_build_object('reason', 'provider_identity_claimed'), null,
    'claimed', _provisioning_key, null
  ) returning * into _binding;

  insert into public.domain_audit_events (
    tenant_id, domain_id, generation, actor_user_id, authority_origin,
    event_type, before_status, after_status, detail_sanitized
  ) values (
    _domain.tenant_id, _domain.id, _domain.generation, _domain.requested_by, 'platform',
    'provider_binding_claimed', _domain.status, _domain.status,
    jsonb_build_object('provider_account_id', _provider_account_id, 'zone_id', _zone_id)
  );

  return next _binding;
end;
$$;

create or replace function public.dca02_bind_domain_provider_object_identity(
  _tenant_id uuid,
  _domain_id uuid,
  _expected_generation bigint,
  _expected_lock_version bigint,
  _provider_account_id uuid,
  _zone_id text,
  _provisioning_key text,
  _custom_hostname_id text,
  _provider_status text,
  _ssl_status text,
  _provider_version text,
  _provider_detail_sanitized jsonb
) returns setof public.domain_provider_bindings
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  _domain public.tenant_domains%rowtype;
  _provider public.domain_provider_accounts%rowtype;
  _binding public.domain_provider_bindings%rowtype;
begin
  if _provisioning_key !~ '^[0-9a-f]{64}$'
     or _zone_id !~ '^[A-Za-z0-9_-]{8,64}$'
     or _custom_hostname_id !~ '^[A-Za-z0-9_-]{8,64}$' then
    raise exception using errcode = '22023', message = 'dca02_provider_bind_input_invalid';
  end if;

  select * into _domain
  from public.tenant_domains
  where id = _domain_id and tenant_id = _tenant_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'dca02_domain_not_found';
  end if;
  if _domain.generation <> _expected_generation
     or _domain.lock_version <> _expected_lock_version
     or _domain.status <> 'pending_cloudflare_provisioning'
     or not public.dca01_hostname_reservation_valid(_domain.id) then
    raise exception using errcode = '40001', message = 'dca02_provider_bind_domain_state_conflict';
  end if;

  select * into _provider
  from public.domain_provider_accounts
  where id = _provider_account_id and provider_code = 'cloudflare' and enabled
  for share;
  if not found
     or (_provider.capabilities -> 'zones' ->> _domain.registrable_domain) is distinct from _zone_id then
    raise exception using errcode = '22023', message = 'dca02_provider_bind_context_invalid';
  end if;

  select * into _binding
  from public.domain_provider_bindings
  where domain_id = _domain.id and tenant_id = _domain.tenant_id and generation = _domain.generation
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'dca02_provider_claim_missing';
  end if;
  if _binding.provider_account_id <> _provider_account_id
     or _binding.zone_id is distinct from _zone_id
     or _binding.provisioning_key <> _provisioning_key then
    raise exception using errcode = '40001', message = 'dca02_provider_bind_claim_conflict';
  end if;
  if _binding.binding_state = 'ambiguous' then
    raise exception using errcode = '22023', message = 'dca02_provider_bind_ambiguous';
  end if;

  if _binding.binding_state = 'bound' then
    if _binding.custom_hostname_id <> _custom_hostname_id then
      raise exception using errcode = '23505', message = 'dca02_provider_identity_rebind_prohibited';
    end if;
    perform set_config('app.dca02_provider_binding_write', 'on', true);
    update public.domain_provider_bindings
    set provider_status = _provider_status,
        ssl_status = _ssl_status,
        provider_version = _provider_version,
        provider_detail_sanitized = coalesce(_provider_detail_sanitized, '{}'::jsonb),
        observed_at = now(),
        updated_at = now()
    where id = _binding.id
    returning * into _binding;
    return next _binding;
    return;
  end if;

  if _binding.binding_state <> 'claimed' or _binding.custom_hostname_id is not null then
    raise exception using errcode = '22023', message = 'dca02_provider_binding_shape_invalid';
  end if;

  perform set_config('app.dca02_provider_binding_write', 'on', true);
  update public.domain_provider_bindings
  set custom_hostname_id = _custom_hostname_id,
      binding_state = 'bound',
      identity_bound_at = now(),
      provider_status = _provider_status,
      ssl_status = _ssl_status,
      provider_version = _provider_version,
      provider_detail_sanitized = coalesce(_provider_detail_sanitized, '{}'::jsonb),
      observed_at = now(),
      updated_at = now()
  where id = _binding.id
  returning * into _binding;

  insert into public.domain_audit_events (
    tenant_id, domain_id, generation, actor_user_id, authority_origin,
    event_type, before_status, after_status, detail_sanitized
  ) values (
    _domain.tenant_id, _domain.id, _domain.generation, _domain.requested_by, 'platform',
    'provider_object_identity_bound', _domain.status, _domain.status,
    jsonb_build_object(
      'provider_account_id', _provider_account_id,
      'zone_id', _zone_id,
      'custom_hostname_id', _custom_hostname_id
    )
  );

  return next _binding;
end;
$$;

create or replace function public.dca02_update_domain_provider_observation(
  _tenant_id uuid,
  _domain_id uuid,
  _expected_generation bigint,
  _provider_account_id uuid,
  _zone_id text,
  _custom_hostname_id text,
  _provider_status text,
  _ssl_status text,
  _provider_version text,
  _provider_detail_sanitized jsonb
) returns setof public.domain_provider_bindings
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  _domain public.tenant_domains%rowtype;
  _binding public.domain_provider_bindings%rowtype;
begin
  select * into _domain
  from public.tenant_domains
  where id = _domain_id and tenant_id = _tenant_id;
  if not found or _domain.generation <> _expected_generation or _domain.status = 'revoked' then
    raise exception using errcode = '40001', message = 'dca02_provider_observation_domain_state_conflict';
  end if;

  select * into _binding
  from public.domain_provider_bindings
  where domain_id = _domain.id and tenant_id = _domain.tenant_id and generation = _domain.generation
  for update;
  if not found
     or _binding.binding_state <> 'bound'
     or _binding.provider_account_id <> _provider_account_id
     or _binding.zone_id is distinct from _zone_id
     or _binding.custom_hostname_id is distinct from _custom_hostname_id then
    raise exception using errcode = '22023', message = 'dca02_provider_observation_identity_mismatch';
  end if;

  perform set_config('app.dca02_provider_binding_write', 'on', true);
  update public.domain_provider_bindings
  set provider_status = _provider_status,
      ssl_status = _ssl_status,
      provider_version = _provider_version,
      provider_detail_sanitized = coalesce(_provider_detail_sanitized, '{}'::jsonb),
      observed_at = now(),
      updated_at = now()
  where id = _binding.id
  returning * into _binding;

  return next _binding;
end;
$$;

create or replace function public.dca02_mark_domain_provider_claim_ambiguous(
  _tenant_id uuid,
  _domain_id uuid,
  _expected_generation bigint,
  _provisioning_key text,
  _detail_sanitized jsonb
) returns setof public.domain_provider_bindings
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  _binding public.domain_provider_bindings%rowtype;
begin
  if _provisioning_key !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'dca02_provider_ambiguity_input_invalid';
  end if;

  select * into _binding
  from public.domain_provider_bindings
  where tenant_id = _tenant_id and domain_id = _domain_id and generation = _expected_generation
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'dca02_provider_claim_missing';
  end if;
  if _binding.provisioning_key <> _provisioning_key or _binding.binding_state = 'bound' then
    raise exception using errcode = '22023', message = 'dca02_provider_ambiguity_claim_conflict';
  end if;

  if _binding.binding_state = 'claimed' then
    perform set_config('app.dca02_provider_binding_write', 'on', true);
    update public.domain_provider_bindings
    set binding_state = 'ambiguous',
        provider_detail_sanitized = coalesce(_detail_sanitized, '{}'::jsonb),
        updated_at = now()
    where id = _binding.id
    returning * into _binding;

    insert into public.domain_audit_events (
      tenant_id, domain_id, generation, actor_user_id, authority_origin,
      event_type, detail_sanitized
    ) values (
      _tenant_id, _domain_id, _expected_generation, null, 'platform',
      'provider_create_outcome_ambiguous',
      jsonb_build_object('binding_id', _binding.id, 'provider_account_id', _binding.provider_account_id)
    );
  end if;

  return next _binding;
end;
$$;

create or replace function public.dca02_release_domain_provider_claim(
  _tenant_id uuid,
  _domain_id uuid,
  _expected_generation bigint,
  _provisioning_key text
) returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  _binding public.domain_provider_bindings%rowtype;
begin
  if _provisioning_key !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'dca02_provider_release_input_invalid';
  end if;

  select * into _binding
  from public.domain_provider_bindings
  where tenant_id = _tenant_id and domain_id = _domain_id and generation = _expected_generation
  for update;
  if not found then
    return true;
  end if;
  if _binding.binding_state <> 'claimed'
     or _binding.provisioning_key <> _provisioning_key
     or _binding.custom_hostname_id is not null then
    raise exception using errcode = '22023', message = 'dca02_provider_release_not_permitted';
  end if;

  perform set_config('app.dca02_provider_binding_write', 'on', true);
  delete from public.domain_provider_bindings where id = _binding.id;
  return true;
end;
$$;

-- Narrow the direct table authority: provider identity now mutates only through DCA-02 RPCs.
revoke insert, update, delete on table public.domain_provider_bindings from service_role;
grant select on table public.domain_provider_bindings to service_role;

revoke all on function public.dca02_guard_provider_binding_write() from public, anon, authenticated;
revoke all on function public.dca02_claim_domain_provider_binding(uuid,uuid,bigint,bigint,uuid,text,text) from public, anon, authenticated;
revoke all on function public.dca02_bind_domain_provider_object_identity(uuid,uuid,bigint,bigint,uuid,text,text,text,text,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.dca02_update_domain_provider_observation(uuid,uuid,bigint,uuid,text,text,text,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.dca02_mark_domain_provider_claim_ambiguous(uuid,uuid,bigint,text,jsonb) from public, anon, authenticated;
revoke all on function public.dca02_release_domain_provider_claim(uuid,uuid,bigint,text) from public, anon, authenticated;

grant execute on function public.dca02_claim_domain_provider_binding(uuid,uuid,bigint,bigint,uuid,text,text) to service_role;
grant execute on function public.dca02_bind_domain_provider_object_identity(uuid,uuid,bigint,bigint,uuid,text,text,text,text,text,text,jsonb) to service_role;
grant execute on function public.dca02_update_domain_provider_observation(uuid,uuid,bigint,uuid,text,text,text,text,text,jsonb) to service_role;
grant execute on function public.dca02_mark_domain_provider_claim_ambiguous(uuid,uuid,bigint,text,jsonb) to service_role;
grant execute on function public.dca02_release_domain_provider_claim(uuid,uuid,bigint,text) to service_role;

comment on column public.domain_provider_bindings.binding_state is
  'DCA-02 server-owned provider identity lifecycle: claimed, bound, or ambiguous. Never client authority.';
comment on column public.domain_provider_bindings.provisioning_key is
  'Opaque non-secret operation identity used to serialize first provider creation for one domain generation.';
comment on column public.domain_provider_bindings.identity_bound_at is
  'Timestamp at which the immutable provider object ID became bound to the authoritative domain generation.';