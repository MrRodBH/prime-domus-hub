-- DCA-01 — Domain & Cloudflare Activation
-- One forward migration. Server-owned authority, fail-fast/fail-closed.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create type public.domain_activation_status as enum (
  'draft',
  'pending_ownership_verification',
  'ownership_verified',
  'pending_dns_configuration',
  'pending_cloudflare_provisioning',
  'pending_ssl',
  'active',
  'degraded',
  'replacement_pending',
  'removal_pending',
  'failed',
  'revoked'
);

create type public.domain_execution_mode as enum ('manual_assisted', 'api_automated');
create type public.domain_hostname_kind as enum ('canonical', 'alias');
create type public.domain_operation_type as enum (
  'issue_ownership_challenge',
  'observe_ownership_dns',
  'prepare_dns_configuration',
  'observe_required_dns',
  'provision_provider_binding',
  'observe_ssl_lifecycle',
  'activate_domain_generation',
  'reconcile_domain',
  'replace_domain',
  'remove_domain',
  'cleanup_domain',
  'activate_authoritative_domain_resolution'
);
create type public.domain_job_status as enum (
  'pending', 'leased', 'retry_wait', 'succeeded', 'failed', 'cancelled'
);
create type public.domain_challenge_status as enum ('active', 'verified', 'expired', 'revoked');

create table public.tenant_domains (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  normalized_hostname text not null,
  registrable_domain text not null,
  hostname_kind public.domain_hostname_kind not null,
  execution_mode public.domain_execution_mode not null,
  status public.domain_activation_status not null default 'draft',
  enabled boolean not null default true,
  generation bigint not null check (generation > 0),
  replacement_of uuid null,
  incumbent_domain_id uuid null,
  lock_version bigint not null default 0 check (lock_version >= 0),
  failure_code text null,
  failure_detail_sanitized jsonb not null default '{}'::jsonb,
  resume_state public.domain_activation_status null,
  metadata jsonb not null default '{}'::jsonb,
  requested_by uuid not null,
  activated_at timestamptz null,
  revoked_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_domains_id_tenant_unique unique (id, tenant_id),
  constraint tenant_domains_id_tenant_generation_unique unique (id, tenant_id, generation),
  constraint tenant_domains_hostname_canonical_ascii check (
    normalized_hostname = lower(normalized_hostname)
    and normalized_hostname !~ '[[:space:]/\\?#@:*]'
    and normalized_hostname !~ '^\.'
    and normalized_hostname !~ '\.$'
    and octet_length(normalized_hostname) between 3 and 253
  ),
  constraint tenant_domains_registrable_canonical_ascii check (
    registrable_domain = lower(registrable_domain)
    and registrable_domain !~ '[[:space:]/\\?#@:*]'
    and registrable_domain !~ '^\.'
    and registrable_domain !~ '\.$'
    and octet_length(registrable_domain) between 3 and 253
  ),
  constraint tenant_domains_resume_state_valid check (
    resume_state is null or resume_state not in ('failed', 'revoked')
  ),
  constraint tenant_domains_candidate_shape check (
    incumbent_domain_id is null or hostname_kind = 'canonical'
  )
);

alter table public.tenant_domains
  add constraint tenant_domains_replacement_same_tenant_fk
  foreign key (replacement_of, tenant_id)
  references public.tenant_domains(id, tenant_id)
  deferrable initially immediate;

alter table public.tenant_domains
  add constraint tenant_domains_incumbent_same_tenant_fk
  foreign key (incumbent_domain_id, tenant_id)
  references public.tenant_domains(id, tenant_id)
  deferrable initially immediate;

create unique index tenant_domains_global_hostname_reservation_uq
  on public.tenant_domains(normalized_hostname);
create unique index tenant_domains_one_active_canonical_per_tenant_uq
  on public.tenant_domains(tenant_id)
  where status = 'active' and enabled and hostname_kind = 'canonical';
create unique index tenant_domains_one_live_candidate_per_incumbent_uq
  on public.tenant_domains(incumbent_domain_id)
  where incumbent_domain_id is not null and status not in ('failed', 'revoked');
create index tenant_domains_tenant_created_idx on public.tenant_domains(tenant_id, created_at);
create index tenant_domains_status_idx on public.tenant_domains(status, enabled);

create table public.domain_verification_challenges (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  domain_id uuid not null,
  generation bigint not null check (generation > 0),
  challenge_version bigint not null check (challenge_version > 0),
  challenge_kind text not null default 'dns_txt' check (challenge_kind = 'dns_txt'),
  record_name text not null,
  value_digest text not null check (value_digest ~ '^[0-9a-f]{64}$'),
  opaque_nonce_reference text not null check (opaque_nonce_reference ~ '^challenge:'),
  status public.domain_challenge_status not null default 'active',
  expires_at timestamptz not null,
  verified_at timestamptz null,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  observed_value_hash text null check (observed_value_hash is null or observed_value_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint domain_challenges_domain_tenant_fk
    foreign key (domain_id, tenant_id, generation)
    references public.tenant_domains(id, tenant_id, generation)
    on delete cascade,
  constraint domain_challenges_generation_unique unique (domain_id, generation, challenge_version)
);
create unique index domain_challenges_one_active_per_generation_uq
  on public.domain_verification_challenges(domain_id, generation)
  where status = 'active';
create index domain_challenges_current_idx
  on public.domain_verification_challenges(domain_id, generation, status);

create table public.domain_provider_accounts (
  id uuid primary key default gen_random_uuid(),
  provider_code text not null check (provider_code = 'cloudflare'),
  account_identifier text not null check (account_identifier ~ '^[A-Za-z0-9_-]{8,64}$'),
  credential_reference text not null check (credential_reference ~ '^env:[A-Z][A-Z0-9_]{2,127}$'),
  enabled boolean not null default true,
  capabilities jsonb not null default '{}'::jsonb,
  health_status text not null default 'unknown'
    check (health_status in ('unknown', 'healthy', 'degraded', 'unavailable', 'disabled')),
  health_detail_sanitized jsonb not null default '{}'::jsonb,
  last_health_check_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint domain_provider_accounts_provider_account_uq unique (provider_code, account_identifier)
);

create table public.domain_provider_bindings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  domain_id uuid not null,
  generation bigint not null check (generation > 0),
  provider_account_id uuid not null references public.domain_provider_accounts(id),
  zone_id text null,
  custom_hostname_id text null,
  provider_status text null,
  ssl_status text null,
  provider_version text null,
  provider_detail_sanitized jsonb not null default '{}'::jsonb,
  observed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint domain_provider_bindings_domain_tenant_fk
    foreign key (domain_id, tenant_id, generation)
    references public.tenant_domains(id, tenant_id, generation)
    on delete cascade,
  constraint domain_provider_bindings_domain_generation_uq unique (domain_id, generation)
);
create unique index domain_provider_bindings_custom_hostname_uq
  on public.domain_provider_bindings(provider_account_id, custom_hostname_id)
  where custom_hostname_id is not null;

create table public.domain_operation_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  domain_id uuid not null,
  generation bigint not null check (generation > 0),
  operation_type public.domain_operation_type not null,
  execution_mode public.domain_execution_mode not null,
  status public.domain_job_status not null default 'pending',
  idempotency_key text not null check (idempotency_key ~ '^[0-9a-f]{64}$'),
  requested_by uuid not null,
  authority_origin text not null,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 10),
  lease_owner text null,
  lease_expires_at timestamptz null,
  next_attempt_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  result_sanitized jsonb not null default '{}'::jsonb,
  terminal_error_code text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint domain_operation_jobs_domain_tenant_fk
    foreign key (domain_id, tenant_id, generation)
    references public.tenant_domains(id, tenant_id, generation)
    on delete cascade,
  constraint domain_operation_jobs_idempotency_uq unique (idempotency_key),
  constraint domain_operation_jobs_lease_shape check (
    (status = 'leased' and lease_owner is not null and lease_expires_at is not null)
    or (status <> 'leased')
  )
);
create index domain_operation_jobs_due_idx
  on public.domain_operation_jobs(status, next_attempt_at, lease_expires_at);
create index domain_operation_jobs_tenant_domain_idx
  on public.domain_operation_jobs(tenant_id, domain_id, created_at desc);

create table public.domain_operation_attempts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.domain_operation_jobs(id) on delete cascade,
  attempt_number integer not null check (attempt_number > 0),
  lease_owner text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz null,
  outcome text null check (outcome is null or outcome in ('succeeded', 'retry_wait', 'failed', 'cancelled', 'lease_expired')),
  result_sanitized jsonb not null default '{}'::jsonb,
  error_code text null,
  created_at timestamptz not null default now(),
  constraint domain_operation_attempts_job_attempt_uq unique (job_id, attempt_number)
);

create table public.domain_audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid null references public.tenants(id) on delete cascade,
  domain_id uuid null references public.tenant_domains(id) on delete cascade,
  generation bigint null,
  actor_user_id uuid null,
  authority_origin text not null,
  command_id uuid null,
  correlation_id uuid not null default gen_random_uuid(),
  event_type text not null,
  before_status public.domain_activation_status null,
  after_status public.domain_activation_status null,
  detail_sanitized jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index domain_audit_events_tenant_domain_idx
  on public.domain_audit_events(tenant_id, domain_id, created_at desc);

create table public.domain_authority_control (
  singleton boolean primary key default true check (singleton),
  authority_mode text not null default 'legacy' check (authority_mode in ('legacy', 'tenant_domains')),
  expected_legacy_domain_count integer not null default 0 check (expected_legacy_domain_count >= 0),
  lock_version bigint not null default 0 check (lock_version >= 0),
  activated_at timestamptz null,
  activated_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Internal guards. Direct client status/authority writes are prohibited.
-- ---------------------------------------------------------------------------

create or replace function public.dca01_guard_tenant_domain_write()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'INSERT' then
    if coalesce(current_setting('app.dca01_domain_insert', true), '') <> 'on' then
      raise exception using errcode = '42501', message = 'dca01_direct_domain_insert_prohibited';
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    raise exception using errcode = '42501', message = 'dca01_domain_delete_prohibited';
  end if;

  if old.tenant_id is distinct from new.tenant_id
     or old.normalized_hostname is distinct from new.normalized_hostname
     or old.registrable_domain is distinct from new.registrable_domain
     or old.hostname_kind is distinct from new.hostname_kind
     or old.execution_mode is distinct from new.execution_mode
     or old.generation is distinct from new.generation
     or old.replacement_of is distinct from new.replacement_of
     or old.incumbent_domain_id is distinct from new.incumbent_domain_id
     or old.requested_by is distinct from new.requested_by then
    raise exception using errcode = '42501', message = 'dca01_immutable_domain_authority_field';
  end if;

  if (old.status is distinct from new.status or old.enabled is distinct from new.enabled)
     and coalesce(current_setting('app.dca01_status_write', true), '') <> 'on' then
    raise exception using errcode = '42501', message = 'dca01_direct_status_mutation_prohibited';
  end if;
  return new;
end;
$$;

create trigger dca01_guard_tenant_domain_write
before insert or update or delete on public.tenant_domains
for each row execute function public.dca01_guard_tenant_domain_write();

create or replace function public.dca01_guard_tenant_domain_projection()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if old.dominio_principal is distinct from new.dominio_principal
     and coalesce(current_setting('app.dca01_projection_write', true), '') <> 'on' then
    raise exception using errcode = '42501', message = 'dca01_direct_domain_projection_write_prohibited';
  end if;
  return new;
end;
$$;

create trigger dca01_guard_tenant_domain_projection
before update of dominio_principal on public.tenants
for each row execute function public.dca01_guard_tenant_domain_projection();

create or replace function public.dca01_guard_audit_immutability()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception using errcode = '42501', message = 'dca01_audit_event_is_append_only';
end;
$$;

create trigger dca01_guard_audit_immutability
before update or delete on public.domain_audit_events
for each row execute function public.dca01_guard_audit_immutability();

create or replace function public.dca01_transition_allowed(
  _from public.domain_activation_status,
  _to public.domain_activation_status
) returns boolean
language sql
immutable
set search_path = pg_catalog, public
as $$
  select case _from
    when 'draft' then _to in ('pending_ownership_verification', 'removal_pending', 'failed')
    when 'pending_ownership_verification' then _to in ('ownership_verified', 'removal_pending', 'failed')
    when 'ownership_verified' then _to in ('pending_dns_configuration', 'removal_pending', 'failed')
    when 'pending_dns_configuration' then _to in ('pending_cloudflare_provisioning', 'removal_pending', 'failed')
    when 'pending_cloudflare_provisioning' then _to in ('pending_ssl', 'removal_pending', 'failed')
    when 'pending_ssl' then _to in ('active', 'removal_pending', 'failed')
    when 'active' then _to in ('degraded', 'removal_pending')
    when 'degraded' then _to in ('active', 'pending_cloudflare_provisioning', 'pending_ssl', 'removal_pending', 'failed')
    when 'replacement_pending' then _to in ('pending_ownership_verification', 'removal_pending', 'failed')
    when 'removal_pending' then _to in ('revoked', 'failed')
    when 'failed' then _to in ('pending_ownership_verification', 'pending_dns_configuration', 'pending_cloudflare_provisioning', 'pending_ssl', 'removal_pending', 'revoked')
    when 'revoked' then false
    else false
  end;
$$;

create or replace function public.dca01_active_evidence_complete(_evidence jsonb)
returns boolean
language sql
immutable
set search_path = pg_catalog, public
as $$
  select coalesce((_evidence ->> 'normalizedHostnameValid')::boolean, false)
     and coalesce((_evidence ->> 'globalHostnameReservationValid')::boolean, false)
     and coalesce((_evidence ->> 'ownershipVerified')::boolean, false)
     and coalesce((_evidence ->> 'requiredDnsObserved')::boolean, false)
     and coalesce((_evidence ->> 'providerBindingConfirmed')::boolean, false)
     and coalesce((_evidence ->> 'sslStatusActive')::boolean, false)
     and coalesce((_evidence ->> 'canonicalOrAliasBindingValid')::boolean, false)
     and coalesce((_evidence ->> 'enabled')::boolean, false)
     and coalesce((_evidence ->> 'reconciliationCurrentGenerationSuccess')::boolean, false);
$$;

-- ---------------------------------------------------------------------------
-- Atomic server command functions.
-- ---------------------------------------------------------------------------

create or replace function public.create_tenant_domain_request(
  _tenant_id uuid,
  _normalized_hostname text,
  _registrable_domain text,
  _hostname_kind public.domain_hostname_kind,
  _execution_mode public.domain_execution_mode,
  _incumbent_domain_id uuid,
  _requested_by uuid,
  _authority_origin text,
  _metadata jsonb,
  _correlation_id uuid
) returns setof public.tenant_domains
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  _incumbent public.tenant_domains%rowtype;
  _active_canonical public.tenant_domains%rowtype;
  _generation bigint;
  _status public.domain_activation_status;
  _created public.tenant_domains%rowtype;
begin
  if _tenant_id is null or _requested_by is null then
    raise exception using errcode = '22023', message = 'dca01_missing_authority';
  end if;
  if _authority_origin not in ('selection', 'single-membership', 'impersonation') then
    raise exception using errcode = '42501', message = 'dca01_invalid_tenant_authority_origin';
  end if;
  if _normalized_hostname <> lower(_normalized_hostname)
     or _normalized_hostname !~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$'
     or octet_length(_normalized_hostname) > 253 then
    raise exception using errcode = '22023', message = 'dca01_invalid_normalized_hostname';
  end if;
  if _registrable_domain <> lower(_registrable_domain)
     or not (_normalized_hostname = _registrable_domain or _normalized_hostname like '%.' || _registrable_domain) then
    raise exception using errcode = '22023', message = 'dca01_invalid_registrable_domain';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(_tenant_id::text, 0));
  perform 1 from public.tenants where id = _tenant_id for share;
  if not found then
    raise exception using errcode = 'P0002', message = 'dca01_tenant_not_found';
  end if;

  if _incumbent_domain_id is not null then
    if _hostname_kind <> 'canonical' then
      raise exception using errcode = '22023', message = 'dca01_replacement_must_be_canonical';
    end if;
    select * into _incumbent
    from public.tenant_domains
    where id = _incumbent_domain_id and tenant_id = _tenant_id
    for update;
    if not found or _incumbent.status <> 'active' or not _incumbent.enabled or _incumbent.hostname_kind <> 'canonical' then
      raise exception using errcode = 'P0001', message = 'dca01_invalid_active_incumbent';
    end if;
    _generation := _incumbent.generation + 1;
    _status := 'replacement_pending';
  elsif _hostname_kind = 'alias' then
    select * into _active_canonical
    from public.tenant_domains
    where tenant_id = _tenant_id and status = 'active' and enabled and hostname_kind = 'canonical'
    for share;
    if not found then
      raise exception using errcode = 'P0001', message = 'dca01_alias_requires_active_canonical';
    end if;
    _generation := _active_canonical.generation;
    _status := 'draft';
  else
    if exists (
      select 1 from public.tenant_domains
      where tenant_id = _tenant_id and status = 'active' and enabled and hostname_kind = 'canonical'
    ) then
      raise exception using errcode = '23505', message = 'dca01_active_canonical_requires_replacement';
    end if;
    select coalesce(max(generation), 0) + 1 into _generation
    from public.tenant_domains where tenant_id = _tenant_id;
    _status := 'draft';
  end if;

  perform set_config('app.dca01_domain_insert', 'on', true);
  insert into public.tenant_domains (
    tenant_id, normalized_hostname, registrable_domain, hostname_kind,
    execution_mode, status, enabled, generation, replacement_of,
    incumbent_domain_id, requested_by, metadata
  ) values (
    _tenant_id, _normalized_hostname, _registrable_domain, _hostname_kind,
    _execution_mode, _status, true, _generation, _incumbent_domain_id,
    _incumbent_domain_id, _requested_by, coalesce(_metadata, '{}'::jsonb)
  ) returning * into _created;

  insert into public.domain_audit_events (
    tenant_id, domain_id, generation, actor_user_id, authority_origin,
    correlation_id, event_type, before_status, after_status, detail_sanitized
  ) values (
    _tenant_id, _created.id, _created.generation, _requested_by, _authority_origin,
    coalesce(_correlation_id, gen_random_uuid()), 'domain_request_created', null, _created.status,
    jsonb_build_object('hostname_kind', _created.hostname_kind, 'execution_mode', _created.execution_mode,
      'incumbent_domain_id', _created.incumbent_domain_id)
  );

  return next _created;
end;
$$;

create or replace function public.transition_tenant_domain(
  _tenant_id uuid,
  _domain_id uuid,
  _expected_lock_version bigint,
  _from_status public.domain_activation_status,
  _to_status public.domain_activation_status,
  _actor_user_id uuid,
  _authority_origin text,
  _active_evidence jsonb,
  _failure_code text,
  _failure_detail_sanitized jsonb,
  _resume_state public.domain_activation_status
) returns setof public.tenant_domains
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  _domain public.tenant_domains%rowtype;
  _updated public.tenant_domains%rowtype;
  _next_resume public.domain_activation_status;
  _next_enabled boolean;
  _authority_mode text;
begin
  select * into _domain
  from public.tenant_domains
  where id = _domain_id and tenant_id = _tenant_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'dca01_domain_not_found';
  end if;
  if _domain.lock_version <> _expected_lock_version or _domain.status <> _from_status then
    raise exception using errcode = '40001', message = 'dca01_domain_version_conflict';
  end if;
  if not public.dca01_transition_allowed(_from_status, _to_status) then
    raise exception using errcode = '22023', message = 'dca01_transition_forbidden';
  end if;
  if _to_status = 'active' then
    if _from_status not in ('pending_ssl', 'degraded') or not public.dca01_active_evidence_complete(coalesce(_active_evidence, '{}'::jsonb)) then
      raise exception using errcode = '22023', message = 'dca01_active_predicate_incomplete';
    end if;
  end if;
  if _from_status = 'failed' then
    if _resume_state is distinct from _to_status
       or (_to_status <> 'removal_pending' and (_domain.resume_state is null or _domain.resume_state <> _to_status)) then
      raise exception using errcode = '22023', message = 'dca01_explicit_recovery_target_required';
    end if;
  end if;

  if _to_status = 'failed' then
    if _resume_state is null or _resume_state <> _from_status or _resume_state in ('failed', 'revoked') then
      raise exception using errcode = '22023', message = 'dca01_failure_resume_state_invalid';
    end if;
    _next_resume := _resume_state;
  else
    _next_resume := null;
  end if;

  _next_enabled := case
    when _to_status in ('removal_pending', 'revoked') then false
    when _to_status = 'active' then true
    else _domain.enabled
  end;

  perform set_config('app.dca01_status_write', 'on', true);
  update public.tenant_domains
  set status = _to_status,
      enabled = _next_enabled,
      lock_version = lock_version + 1,
      failure_code = case when _to_status = 'failed' then _failure_code else null end,
      failure_detail_sanitized = case when _to_status = 'failed' then coalesce(_failure_detail_sanitized, '{}'::jsonb) else '{}'::jsonb end,
      resume_state = _next_resume,
      activated_at = case when _to_status = 'active' then coalesce(activated_at, now()) else activated_at end,
      revoked_at = case when _to_status = 'revoked' then now() else revoked_at end,
      updated_at = now()
  where id = _domain.id
  returning * into _updated;

  select authority_mode into _authority_mode
  from public.domain_authority_control where singleton = true;
  if _authority_mode = 'tenant_domains' and _domain.hostname_kind = 'canonical' then
    perform set_config('app.dca01_projection_write', 'on', true);
    if _to_status = 'active' then
      update public.tenants set dominio_principal = _domain.normalized_hostname, updated_at = now()
      where id = _tenant_id;
    elsif _from_status = 'active' then
      update public.tenants set dominio_principal = null, updated_at = now()
      where id = _tenant_id and dominio_principal = _domain.normalized_hostname;
    end if;
  end if;

  insert into public.domain_audit_events (
    tenant_id, domain_id, generation, actor_user_id, authority_origin,
    event_type, before_status, after_status, detail_sanitized
  ) values (
    _tenant_id, _domain.id, _domain.generation, _actor_user_id, _authority_origin,
    'domain_status_transitioned', _from_status, _to_status,
    jsonb_build_object('lock_version_before', _expected_lock_version, 'lock_version_after', _updated.lock_version,
      'failure_code', case when _to_status = 'failed' then _failure_code else null end)
  );

  return next _updated;
end;
$$;

create or replace function public.issue_domain_ownership_challenge(
  _tenant_id uuid,
  _domain_id uuid,
  _expected_generation bigint,
  _actor_user_id uuid,
  _authority_origin text,
  _record_name text,
  _value_digest text,
  _value_reference text,
  _expires_at timestamptz,
  _correlation_id uuid
) returns setof public.domain_verification_challenges
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  _domain public.tenant_domains%rowtype;
  _version bigint;
  _challenge public.domain_verification_challenges%rowtype;
begin
  select * into _domain from public.tenant_domains
  where id = _domain_id and tenant_id = _tenant_id
  for update;
  if not found or _domain.generation <> _expected_generation or _domain.status <> 'pending_ownership_verification' then
    raise exception using errcode = '22023', message = 'dca01_challenge_domain_state_invalid';
  end if;
  if _expires_at <= now() or _value_digest !~ '^[0-9a-f]{64}$' or _value_reference !~ '^challenge:' then
    raise exception using errcode = '22023', message = 'dca01_challenge_input_invalid';
  end if;

  update public.domain_verification_challenges
  set status = 'revoked', updated_at = now()
  where domain_id = _domain_id and generation = _expected_generation and status = 'active';

  select coalesce(max(challenge_version), 0) + 1 into _version
  from public.domain_verification_challenges
  where domain_id = _domain_id and generation = _expected_generation;

  insert into public.domain_verification_challenges (
    tenant_id, domain_id, generation, challenge_version, record_name,
    value_digest, opaque_nonce_reference, expires_at
  ) values (
    _tenant_id, _domain_id, _expected_generation, _version, _record_name,
    _value_digest, _value_reference, _expires_at
  ) returning * into _challenge;

  insert into public.domain_audit_events (
    tenant_id, domain_id, generation, actor_user_id, authority_origin,
    correlation_id, event_type, before_status, after_status, detail_sanitized
  ) values (
    _tenant_id, _domain_id, _expected_generation, _actor_user_id, _authority_origin,
    coalesce(_correlation_id, gen_random_uuid()),
    case when _version = 1 then 'ownership_challenge_issued' else 'ownership_challenge_rotated' end,
    _domain.status, _domain.status,
    jsonb_build_object('challenge_id', _challenge.id, 'challenge_version', _version, 'expires_at', _expires_at)
  );

  return next _challenge;
end;
$$;

create or replace function public.verify_domain_ownership_challenge(
  _tenant_id uuid,
  _domain_id uuid,
  _expected_generation bigint,
  _challenge_id uuid,
  _challenge_version bigint,
  _observed_digests text[],
  _observation_digest text,
  _actor_user_id uuid,
  _authority_origin text,
  _correlation_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  _domain public.tenant_domains%rowtype;
  _challenge public.domain_verification_challenges%rowtype;
  _verified boolean;
begin
  select * into _domain from public.tenant_domains
  where id = _domain_id and tenant_id = _tenant_id
  for update;
  if not found or _domain.generation <> _expected_generation or _domain.status <> 'pending_ownership_verification' then
    raise exception using errcode = '22023', message = 'dca01_ownership_domain_state_invalid';
  end if;

  select * into _challenge from public.domain_verification_challenges
  where id = _challenge_id and tenant_id = _tenant_id and domain_id = _domain_id
    and generation = _expected_generation and challenge_version = _challenge_version
  for update;
  if not found or _challenge.status <> 'active' then
    raise exception using errcode = '22023', message = 'dca01_ownership_challenge_stale';
  end if;

  if _challenge.expires_at <= now() then
    update public.domain_verification_challenges
    set status = 'expired', attempt_count = attempt_count + 1,
        observed_value_hash = _observation_digest, updated_at = now()
    where id = _challenge.id returning * into _challenge;
    insert into public.domain_audit_events (
      tenant_id, domain_id, generation, actor_user_id, authority_origin,
      correlation_id, event_type, before_status, after_status, detail_sanitized
    ) values (
      _tenant_id, _domain_id, _expected_generation, _actor_user_id, _authority_origin,
      coalesce(_correlation_id, gen_random_uuid()), 'ownership_challenge_expired',
      _domain.status, _domain.status, jsonb_build_object('challenge_id', _challenge.id)
    );
    return jsonb_build_object('verified', false, 'domain', to_jsonb(_domain), 'challenge', to_jsonb(_challenge));
  end if;

  _verified := _challenge.value_digest = any(coalesce(_observed_digests, array[]::text[]));
  if _verified then
    update public.domain_verification_challenges
    set status = 'verified', verified_at = now(), attempt_count = attempt_count + 1,
        observed_value_hash = _observation_digest, updated_at = now()
    where id = _challenge.id returning * into _challenge;

    perform set_config('app.dca01_status_write', 'on', true);
    update public.tenant_domains
    set status = 'ownership_verified', lock_version = lock_version + 1, updated_at = now()
    where id = _domain.id returning * into _domain;

    insert into public.domain_audit_events (
      tenant_id, domain_id, generation, actor_user_id, authority_origin,
      correlation_id, event_type, before_status, after_status, detail_sanitized
    ) values (
      _tenant_id, _domain_id, _expected_generation, _actor_user_id, _authority_origin,
      coalesce(_correlation_id, gen_random_uuid()), 'ownership_verified',
      'pending_ownership_verification', 'ownership_verified',
      jsonb_build_object('challenge_id', _challenge.id, 'challenge_version', _challenge.challenge_version)
    );
  else
    update public.domain_verification_challenges
    set attempt_count = attempt_count + 1, observed_value_hash = _observation_digest, updated_at = now()
    where id = _challenge.id returning * into _challenge;
    insert into public.domain_audit_events (
      tenant_id, domain_id, generation, actor_user_id, authority_origin,
      correlation_id, event_type, before_status, after_status, detail_sanitized
    ) values (
      _tenant_id, _domain_id, _expected_generation, _actor_user_id, _authority_origin,
      coalesce(_correlation_id, gen_random_uuid()), 'ownership_observed_not_verified',
      _domain.status, _domain.status,
      jsonb_build_object('challenge_id', _challenge.id, 'observed_value_count', cardinality(coalesce(_observed_digests, array[]::text[])))
    );
  end if;

  return jsonb_build_object('verified', _verified, 'domain', to_jsonb(_domain), 'challenge', to_jsonb(_challenge));
end;
$$;

create or replace function public.activate_domain_replacement(
  _tenant_id uuid,
  _incumbent_domain_id uuid,
  _candidate_domain_id uuid,
  _incumbent_expected_lock_version bigint,
  _candidate_expected_lock_version bigint,
  _actor_user_id uuid,
  _authority_origin text,
  _candidate_evidence jsonb
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  _incumbent public.tenant_domains%rowtype;
  _candidate public.tenant_domains%rowtype;
  _authority_mode text;
  _cleanup public.tenant_domains%rowtype;
  _idempotency text;
begin
  select * into _incumbent from public.tenant_domains
  where id = _incumbent_domain_id and tenant_id = _tenant_id for update;
  select * into _candidate from public.tenant_domains
  where id = _candidate_domain_id and tenant_id = _tenant_id for update;

  if _incumbent.id is null or _candidate.id is null
     or _incumbent.status <> 'active' or not _incumbent.enabled or _incumbent.hostname_kind <> 'canonical'
     or _candidate.status <> 'pending_ssl' or _candidate.hostname_kind <> 'canonical'
     or _candidate.incumbent_domain_id <> _incumbent.id
     or _candidate.generation <= _incumbent.generation
     or _incumbent.lock_version <> _incumbent_expected_lock_version
     or _candidate.lock_version <> _candidate_expected_lock_version
     or not public.dca01_active_evidence_complete(coalesce(_candidate_evidence, '{}'::jsonb)) then
    raise exception using errcode = '40001', message = 'dca01_replacement_precondition_failed';
  end if;

  perform set_config('app.dca01_status_write', 'on', true);
  -- Remove the incumbent generation from public authority first. The transaction
  -- remains atomic, so a later candidate failure rolls this change back.
  update public.tenant_domains
  set status = 'removal_pending', enabled = false, lock_version = lock_version + 1, updated_at = now()
  where tenant_id = _tenant_id
    and generation = _incumbent.generation
    and status = 'active'
    and enabled
    and (id = _incumbent.id or hostname_kind = 'alias');

  select * into _incumbent from public.tenant_domains where id = _incumbent.id;
  if _incumbent.status <> 'removal_pending' then
    raise exception using errcode = '40001', message = 'dca01_replacement_incumbent_retirement_conflict';
  end if;

  update public.tenant_domains
  set status = 'active', enabled = true, lock_version = lock_version + 1,
      activated_at = coalesce(activated_at, now()), updated_at = now()
  where id = _candidate.id and status = 'pending_ssl' and lock_version = _candidate_expected_lock_version
  returning * into _candidate;
  if _candidate.id is null or _candidate.status <> 'active' then
    raise exception using errcode = '40001', message = 'dca01_replacement_candidate_activation_conflict';
  end if;

  select authority_mode into _authority_mode from public.domain_authority_control where singleton = true;
  if _authority_mode = 'tenant_domains' then
    perform set_config('app.dca01_projection_write', 'on', true);
    update public.tenants set dominio_principal = _candidate.normalized_hostname, updated_at = now()
    where id = _tenant_id;
  end if;

  for _cleanup in
    select * from public.tenant_domains
    where tenant_id = _tenant_id and generation = _incumbent.generation and status = 'removal_pending'
  loop
    _idempotency := encode(extensions.digest(
      'dca01:' || _tenant_id::text || ':' || _cleanup.id::text || ':' || _cleanup.generation::text || ':cleanup_domain:{}',
      'sha256'
    ), 'hex');
    insert into public.domain_operation_jobs (
      tenant_id, domain_id, generation, operation_type, execution_mode,
      idempotency_key, requested_by, authority_origin, max_attempts, payload
    ) values (
      _tenant_id, _cleanup.id, _cleanup.generation, 'cleanup_domain', _cleanup.execution_mode,
      _idempotency, _actor_user_id, _authority_origin, 5,
      jsonb_build_object('source', 'replacement_swap', 'candidate_domain_id', _candidate.id)
    ) on conflict (idempotency_key) do nothing;
  end loop;

  insert into public.domain_audit_events (
    tenant_id, domain_id, generation, actor_user_id, authority_origin,
    event_type, before_status, after_status, detail_sanitized
  ) values
    (_tenant_id, _incumbent.id, _incumbent.generation, _actor_user_id, _authority_origin,
      'replacement_incumbent_retired', 'active', 'removal_pending', jsonb_build_object('candidate_domain_id', _candidate.id)),
    (_tenant_id, _candidate.id, _candidate.generation, _actor_user_id, _authority_origin,
      'replacement_candidate_activated', 'pending_ssl', 'active', jsonb_build_object('incumbent_domain_id', _incumbent.id));

  return jsonb_build_object('incumbent', to_jsonb(_incumbent), 'candidate', to_jsonb(_candidate));
end;
$$;

create or replace function public.lease_domain_operation_jobs(
  _lease_owner text,
  _lease_seconds integer,
  _limit integer
) returns setof public.domain_operation_jobs
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if coalesce(length(_lease_owner), 0) < 8 or _lease_seconds not between 15 and 600 or _limit not between 1 and 50 then
    raise exception using errcode = '22023', message = 'dca01_invalid_lease_request';
  end if;

  update public.domain_operation_attempts a
  set completed_at = now(), outcome = 'lease_expired', error_code = 'domain_lease_expired'
  from public.domain_operation_jobs j
  where a.job_id = j.id and a.attempt_number = j.attempt_count
    and a.completed_at is null and j.status = 'leased' and j.lease_expires_at <= now();

  update public.domain_operation_jobs
  set status = 'failed', lease_owner = null, lease_expires_at = null,
      terminal_error_code = 'domain_lease_expired',
      result_sanitized = jsonb_build_object('reason', 'lease_expired_after_max_attempts'),
      updated_at = now()
  where status = 'leased' and lease_expires_at <= now() and attempt_count >= max_attempts;

  return query
  with candidates as (
    select j.id
    from public.domain_operation_jobs j
    where (
      (j.status in ('pending', 'retry_wait') and j.next_attempt_at <= now())
      or (j.status = 'leased' and j.lease_expires_at <= now())
    ) and j.attempt_count < j.max_attempts
    order by j.next_attempt_at, j.created_at, j.id
    for update skip locked
    limit _limit
  ), leased as (
    update public.domain_operation_jobs j
    set status = 'leased', lease_owner = _lease_owner,
        lease_expires_at = now() + make_interval(secs => _lease_seconds),
        attempt_count = j.attempt_count + 1, updated_at = now()
    from candidates c
    where j.id = c.id
    returning j.*
  ), attempts as (
    insert into public.domain_operation_attempts (job_id, attempt_number, lease_owner)
    select l.id, l.attempt_count, _lease_owner from leased l
    returning job_id
  )
  select l.* from leased l;
end;
$$;

create or replace function public.complete_domain_operation_job(
  _job_id uuid,
  _lease_owner text,
  _outcome public.domain_job_status,
  _result_sanitized jsonb,
  _terminal_error_code text,
  _retry_after_seconds integer
) returns setof public.domain_operation_jobs
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  _job public.domain_operation_jobs%rowtype;
  _next_status public.domain_job_status;
begin
  select * into _job from public.domain_operation_jobs
  where id = _job_id and status = 'leased' and lease_owner = _lease_owner
  for update;
  if not found then
    raise exception using errcode = '40001', message = 'dca01_job_lease_conflict';
  end if;
  if _outcome not in ('retry_wait', 'succeeded', 'failed', 'cancelled') then
    raise exception using errcode = '22023', message = 'dca01_invalid_job_outcome';
  end if;
  if _outcome = 'retry_wait' then
    if _job.attempt_count >= _job.max_attempts or coalesce(_retry_after_seconds, 0) not between 1 and 86400 then
      raise exception using errcode = '22023', message = 'dca01_retry_not_permitted';
    end if;
    _next_status := 'retry_wait';
  else
    _next_status := _outcome;
  end if;

  update public.domain_operation_jobs
  set status = _next_status,
      result_sanitized = coalesce(_result_sanitized, '{}'::jsonb),
      terminal_error_code = case when _next_status in ('retry_wait', 'failed', 'cancelled') then _terminal_error_code else null end,
      next_attempt_at = case when _next_status = 'retry_wait' then now() + make_interval(secs => _retry_after_seconds) else next_attempt_at end,
      lease_owner = null, lease_expires_at = null, updated_at = now()
  where id = _job.id returning * into _job;

  update public.domain_operation_attempts
  set completed_at = now(), outcome = _next_status::text,
      result_sanitized = coalesce(_result_sanitized, '{}'::jsonb), error_code = _terminal_error_code
  where job_id = _job.id and attempt_number = _job.attempt_count and lease_owner = _lease_owner and completed_at is null;
  if not found then
    raise exception using errcode = '40001', message = 'dca01_job_attempt_completion_conflict';
  end if;

  return next _job;
end;
$$;

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
  ) on conflict (provider_code, account_identifier) do update
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

create or replace function public.rotate_domain_provider_credential_reference(
  _provider_account_id uuid,
  _credential_reference text,
  _actor_user_id uuid,
  _authority_origin text
) returns table (id uuid)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  _id uuid;
begin
  if _credential_reference !~ '^env:[A-Z][A-Z0-9_]{2,127}$' then
    raise exception using errcode = '22023', message = 'dca01_credential_reference_invalid';
  end if;
  update public.domain_provider_accounts
  set credential_reference = _credential_reference,
      health_status = 'unknown',
      health_detail_sanitized = jsonb_build_object('reason', 'credential_reference_rotated'),
      updated_at = now()
  where domain_provider_accounts.id = _provider_account_id
  returning domain_provider_accounts.id into _id;
  if _id is null then raise exception using errcode = 'P0002', message = 'dca01_provider_account_not_found'; end if;

  insert into public.domain_audit_events (
    actor_user_id, authority_origin, event_type, detail_sanitized
  ) values (
    _actor_user_id, _authority_origin, 'provider_credential_reference_rotated',
    jsonb_build_object('provider_account_id', _id, 'credential_reference', '[redacted]')
  );
  return query select _id;
end;
$$;

create or replace function public.set_domain_provider_account_availability(
  _provider_account_id uuid,
  _enabled boolean,
  _actor_user_id uuid,
  _authority_origin text
) returns table (id uuid, enabled boolean)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  _id uuid;
  _result_enabled boolean;
begin
  update public.domain_provider_accounts
  set enabled = _enabled,
      health_status = case when _enabled then 'unknown' else 'disabled' end,
      health_detail_sanitized = jsonb_build_object('reason', case when _enabled then 'explicit_enable' else 'explicit_disable' end),
      updated_at = now()
  where domain_provider_accounts.id = _provider_account_id
  returning domain_provider_accounts.id, domain_provider_accounts.enabled into _id, _result_enabled;
  if _id is null then raise exception using errcode = 'P0002', message = 'dca01_provider_account_not_found'; end if;

  insert into public.domain_audit_events (
    actor_user_id, authority_origin, event_type, detail_sanitized
  ) values (
    _actor_user_id, _authority_origin, 'provider_account_availability_changed',
    jsonb_build_object('provider_account_id', _id, 'enabled', _result_enabled)
  );
  return query select _id, _result_enabled;
end;
$$;

-- ---------------------------------------------------------------------------
-- Public resolver boundaries: tenant_domains only. No request-time legacy path.
-- ---------------------------------------------------------------------------

create or replace function public.resolve_public_tenant_by_host(_hostname text)
returns table (
  tenant_id uuid,
  tenant_slug text,
  tenant_name text,
  domain_id uuid,
  hostname text,
  hostname_kind text,
  canonical_hostname text,
  generation bigint,
  authority_mode text
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with matched as (
    select d.*
    from public.tenant_domains d
    where d.normalized_hostname = _hostname
      and d.status = 'active'
      and d.enabled
  ), resolved as (
    select
      t.id as tenant_id,
      t.slug as tenant_slug,
      t.nome as tenant_name,
      m.id as domain_id,
      m.normalized_hostname as hostname,
      m.hostname_kind::text as hostname_kind,
      case when m.hostname_kind = 'canonical' then m.normalized_hostname else c.normalized_hostname end as canonical_hostname,
      m.generation,
      'tenant_domains'::text as authority_mode
    from matched m
    join public.tenants t on t.id = m.tenant_id
    left join public.tenant_domains c
      on m.hostname_kind = 'alias'
     and c.tenant_id = m.tenant_id
     and c.generation = m.generation
     and c.hostname_kind = 'canonical'
     and c.status = 'active'
     and c.enabled
    where m.hostname_kind = 'canonical' or c.id is not null
  )
  select * from resolved
  where (select count(*) from resolved) = 1;
$$;

create or replace function public.get_canonical_redirect_for_active_alias(_hostname text)
returns table (tenant_id uuid, alias_hostname text, canonical_hostname text, generation bigint)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with resolved as (
    select a.tenant_id, a.normalized_hostname as alias_hostname,
      c.normalized_hostname as canonical_hostname, a.generation
    from public.tenant_domains a
    join public.tenant_domains c
      on c.tenant_id = a.tenant_id
     and c.generation = a.generation
     and c.hostname_kind = 'canonical'
     and c.status = 'active'
     and c.enabled
    where a.normalized_hostname = _hostname
      and a.hostname_kind = 'alias'
      and a.status = 'active'
      and a.enabled
      and a.normalized_hostname <> c.normalized_hostname
  )
  select * from resolved where (select count(*) from resolved) = 1;
$$;

create or replace function public.activate_authoritative_domain_resolution(
  _expected_lock_version bigint,
  _actor_user_id uuid,
  _authority_origin text
) returns setof public.domain_authority_control
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  _control public.domain_authority_control%rowtype;
  _legacy_count integer;
  _blocker_count integer;
begin
  select * into _control from public.domain_authority_control
  where singleton = true for update;
  if not found or _control.authority_mode <> 'legacy' or _control.lock_version <> _expected_lock_version then
    raise exception using errcode = '40001', message = 'dca01_cutover_version_conflict';
  end if;

  select count(*) into _legacy_count from public.tenants
  where dominio_principal is not null and btrim(dominio_principal) <> '';
  if _legacy_count <> _control.expected_legacy_domain_count then
    raise exception using errcode = '22023', message = 'dca01_legacy_set_changed';
  end if;

  with legacy_blockers as (
    select t.id
    from public.tenants t
    where t.dominio_principal is not null and btrim(t.dominio_principal) <> ''
      and not exists (
        select 1
        from public.tenant_domains d
        where d.tenant_id = t.id
          and d.hostname_kind = 'canonical'
          and d.status = 'active'
          and d.enabled
          and d.metadata ->> 'legacy_source_sha256' = encode(
            extensions.digest(convert_to(lower(btrim(t.dominio_principal)), 'UTF8'), 'sha256'),
            'hex'
          )
      )
  ), evidence_blockers as (
    select d.id
    from public.tenant_domains d
    where d.status = 'active' and d.enabled
      and (
        not exists (
          select 1 from public.domain_verification_challenges c
          where c.domain_id = d.id and c.tenant_id = d.tenant_id
            and c.generation = d.generation and c.status = 'verified'
        )
        or coalesce((d.metadata ->> 'required_dns_observed')::boolean, false) is not true
        or coalesce((d.metadata ->> 'required_dns_generation')::bigint, 0) <> d.generation
        or not exists (
          select 1 from public.domain_provider_bindings b
          where b.domain_id = d.id and b.tenant_id = d.tenant_id
            and b.generation = d.generation
            and b.custom_hostname_id is not null
            and b.provider_status = 'active'
            and b.ssl_status = 'active'
        )
        or coalesce((d.metadata ->> 'last_reconciliation_success')::boolean, false) is not true
        or coalesce((d.metadata ->> 'last_reconciliation_generation')::bigint, 0) <> d.generation
        or (d.hostname_kind = 'alias' and not exists (
          select 1 from public.tenant_domains canonical
          where canonical.tenant_id = d.tenant_id
            and canonical.generation = d.generation
            and canonical.hostname_kind = 'canonical'
            and canonical.status = 'active'
            and canonical.enabled
        ))
      )
  )
  select (select count(*) from legacy_blockers) + (select count(*) from evidence_blockers)
  into _blocker_count;
  if _blocker_count <> 0 then
    raise exception using errcode = '22023', message = 'dca01_cutover_preflight_failed',
      detail = jsonb_build_object('blocker_count', _blocker_count)::text;
  end if;

  perform set_config('app.dca01_projection_write', 'on', true);
  update public.tenants t
  set dominio_principal = d.normalized_hostname, updated_at = now()
  from public.tenant_domains d
  where d.tenant_id = t.id and d.hostname_kind = 'canonical'
    and d.status = 'active' and d.enabled;

  update public.domain_authority_control
  set authority_mode = 'tenant_domains', lock_version = lock_version + 1,
      activated_at = now(), activated_by = _actor_user_id, updated_at = now()
  where singleton = true returning * into _control;

  insert into public.domain_audit_events (
    tenant_id, domain_id, generation, actor_user_id, authority_origin,
    event_type, detail_sanitized
  )
  select d.tenant_id, d.id, d.generation, _actor_user_id, _authority_origin,
    'authoritative_domain_resolution_activated',
    jsonb_build_object('control_lock_version', _control.lock_version)
  from public.tenant_domains d
  where d.hostname_kind = 'canonical' and d.status = 'active' and d.enabled;

  return next _control;
end;
$$;

-- ---------------------------------------------------------------------------
-- Legacy preflight/import. A server-generated PSL/IDNA manifest is mandatory
-- when legacy rows exist; SQL never guesses a registrable domain.
-- ---------------------------------------------------------------------------

do $$
declare
  _legacy_count integer;
  _manifest_text text;
  _manifest jsonb;
  _manifest_count integer;
  _invalid_count integer;
  _duplicate_count integer;
  _row record;
  _domain_id uuid;
begin
  select count(*) into _legacy_count
  from public.tenants
  where dominio_principal is not null and btrim(dominio_principal) <> '';

  insert into public.domain_authority_control(singleton, authority_mode, expected_legacy_domain_count)
  values (true, 'legacy', _legacy_count);

  if _legacy_count = 0 then
    return;
  end if;

  _manifest_text := current_setting('app.dca01_legacy_import_manifest', true);
  if _manifest_text is null or btrim(_manifest_text) = '' then
    raise exception using errcode = '22023', message = 'dca01_legacy_import_manifest_required';
  end if;
  begin
    _manifest := _manifest_text::jsonb;
  exception when others then
    raise exception using errcode = '22023', message = 'dca01_legacy_import_manifest_invalid_json';
  end;
  if coalesce(jsonb_typeof(_manifest), 'null') <> 'array' then
    raise exception using errcode = '22023', message = 'dca01_legacy_import_manifest_must_be_array';
  end if;
  select jsonb_array_length(_manifest) into _manifest_count;
  if _manifest_count <> _legacy_count then
    raise exception using errcode = '22023', message = 'dca01_legacy_import_manifest_cardinality_mismatch';
  end if;

  with entries as (
    select
      (item ->> 'tenant_id')::uuid as tenant_id,
      item ->> 'normalized_hostname' as normalized_hostname,
      item ->> 'registrable_domain' as registrable_domain,
      item ->> 'public_suffix' as public_suffix,
      item ->> 'source_sha256' as source_sha256
    from jsonb_array_elements(_manifest) item
  )
  select count(*) into _duplicate_count
  from (
    select tenant_id from entries group by tenant_id having count(*) <> 1
    union all
    select null::uuid from entries group by normalized_hostname having count(*) <> 1
  ) q;
  if _duplicate_count <> 0 then
    raise exception using errcode = '22023', message = 'dca01_legacy_import_manifest_ambiguous';
  end if;

  with entries as (
    select
      (item ->> 'tenant_id')::uuid as tenant_id,
      item ->> 'normalized_hostname' as normalized_hostname,
      item ->> 'registrable_domain' as registrable_domain,
      item ->> 'public_suffix' as public_suffix,
      item ->> 'source_sha256' as source_sha256
    from jsonb_array_elements(_manifest) item
  ), evaluated as (
    select t.id,
      t.dominio_principal as source_hostname,
      e.normalized_hostname, e.registrable_domain, e.public_suffix, e.source_sha256
    from public.tenants t
    left join entries e on e.tenant_id = t.id
    where t.dominio_principal is not null and btrim(t.dominio_principal) <> ''
  )
  select count(*) into _invalid_count
  from evaluated
  where normalized_hostname is null
    or source_sha256 is null
    or source_sha256 !~ '^[0-9a-f]{64}$'
    or source_sha256 <> encode(extensions.digest(convert_to(lower(btrim(source_hostname)), 'UTF8'), 'sha256'), 'hex')
    or normalized_hostname !~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$'
    or octet_length(normalized_hostname) > 253
    or registrable_domain is null
    or public_suffix is null
    or registrable_domain = public_suffix
    or not (normalized_hostname = registrable_domain or normalized_hostname like '%.' || registrable_domain)
    or not (registrable_domain = public_suffix or registrable_domain like '%.' || public_suffix)
    or normalized_hostname in ('example.com', 'example.net', 'example.org')
    or normalized_hostname like '%.test'
    or normalized_hostname like '%.invalid'
    or normalized_hostname like '%.localhost';
  if _invalid_count <> 0 then
    raise exception using errcode = '22023', message = 'dca01_legacy_import_preflight_failed';
  end if;

  for _row in
    select t.id as tenant_id, t.owner_user_id,
      e.normalized_hostname, e.registrable_domain, e.public_suffix, e.source_sha256
    from public.tenants t
    join (
      select
        (item ->> 'tenant_id')::uuid as tenant_id,
        item ->> 'normalized_hostname' as normalized_hostname,
        item ->> 'registrable_domain' as registrable_domain,
        item ->> 'public_suffix' as public_suffix,
      item ->> 'source_sha256' as source_sha256
      from jsonb_array_elements(_manifest) item
    ) e on e.tenant_id = t.id
    where t.dominio_principal is not null and btrim(t.dominio_principal) <> ''
  loop
    perform set_config('app.dca01_domain_insert', 'on', true);
    insert into public.tenant_domains (
      tenant_id, normalized_hostname, registrable_domain, hostname_kind,
      execution_mode, status, enabled, generation, requested_by, metadata
    ) values (
      _row.tenant_id, _row.normalized_hostname, _row.registrable_domain, 'canonical',
      'manual_assisted', 'pending_ownership_verification', true, 1,
      coalesce(_row.owner_user_id, '00000000-0000-0000-0000-000000000000'::uuid),
      jsonb_build_object(
        'import_source', 'tenants.dominio_principal',
        'imported_at', now(),
        'imported_from_legacy_authority', true,
        'public_suffix', _row.public_suffix,
        'legacy_source_sha256', _row.source_sha256
      )
    ) returning id into _domain_id;

    insert into public.domain_audit_events (
      tenant_id, domain_id, generation, actor_user_id, authority_origin,
      event_type, before_status, after_status, detail_sanitized
    ) values (
      _row.tenant_id, _domain_id, 1, null, 'platform',
      'legacy_domain_imported', null, 'pending_ownership_verification',
      jsonb_build_object('import_source', 'tenants.dominio_principal')
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS, grants and explicit execution boundaries.
-- ---------------------------------------------------------------------------

alter table public.tenant_domains enable row level security;
alter table public.domain_verification_challenges enable row level security;
alter table public.domain_provider_accounts enable row level security;
alter table public.domain_provider_bindings enable row level security;
alter table public.domain_operation_jobs enable row level security;
alter table public.domain_operation_attempts enable row level security;
alter table public.domain_audit_events enable row level security;
alter table public.domain_authority_control enable row level security;

revoke all on table public.tenant_domains from public, anon, authenticated;
revoke all on table public.domain_verification_challenges from public, anon, authenticated;
revoke all on table public.domain_provider_accounts from public, anon, authenticated;
revoke all on table public.domain_provider_bindings from public, anon, authenticated;
revoke all on table public.domain_operation_jobs from public, anon, authenticated;
revoke all on table public.domain_operation_attempts from public, anon, authenticated;
revoke all on table public.domain_audit_events from public, anon, authenticated;
revoke all on table public.domain_authority_control from public, anon, authenticated;

grant select, insert, update, delete on table public.tenant_domains to service_role;
grant select, insert, update, delete on table public.domain_verification_challenges to service_role;
grant select, insert, update, delete on table public.domain_provider_accounts to service_role;
grant select, insert, update, delete on table public.domain_provider_bindings to service_role;
grant select, insert, update, delete on table public.domain_operation_jobs to service_role;
grant select, insert, update, delete on table public.domain_operation_attempts to service_role;
grant select, insert on table public.domain_audit_events to service_role;
grant select, insert, update, delete on table public.domain_authority_control to service_role;

revoke all on function public.dca01_guard_tenant_domain_write() from public, anon, authenticated;
revoke all on function public.dca01_guard_tenant_domain_projection() from public, anon, authenticated;
revoke all on function public.dca01_guard_audit_immutability() from public, anon, authenticated;
revoke all on function public.dca01_transition_allowed(public.domain_activation_status,public.domain_activation_status) from public, anon, authenticated;
revoke all on function public.dca01_active_evidence_complete(jsonb) from public, anon, authenticated;

revoke all on function public.create_tenant_domain_request(uuid,text,text,public.domain_hostname_kind,public.domain_execution_mode,uuid,uuid,text,jsonb,uuid) from public, anon, authenticated;
revoke all on function public.transition_tenant_domain(uuid,uuid,bigint,public.domain_activation_status,public.domain_activation_status,uuid,text,jsonb,text,jsonb,public.domain_activation_status) from public, anon, authenticated;
revoke all on function public.issue_domain_ownership_challenge(uuid,uuid,bigint,uuid,text,text,text,text,timestamptz,uuid) from public, anon, authenticated;
revoke all on function public.verify_domain_ownership_challenge(uuid,uuid,bigint,uuid,bigint,text[],text,uuid,text,uuid) from public, anon, authenticated;
revoke all on function public.activate_domain_replacement(uuid,uuid,uuid,bigint,bigint,uuid,text,jsonb) from public, anon, authenticated;
revoke all on function public.lease_domain_operation_jobs(text,integer,integer) from public, anon, authenticated;
revoke all on function public.complete_domain_operation_job(uuid,text,public.domain_job_status,jsonb,text,integer) from public, anon, authenticated;
revoke all on function public.register_domain_provider_account(text,text,jsonb,uuid,text) from public, anon, authenticated;
revoke all on function public.rotate_domain_provider_credential_reference(uuid,text,uuid,text) from public, anon, authenticated;
revoke all on function public.set_domain_provider_account_availability(uuid,boolean,uuid,text) from public, anon, authenticated;
revoke all on function public.activate_authoritative_domain_resolution(bigint,uuid,text) from public, anon, authenticated;

grant execute on function public.create_tenant_domain_request(uuid,text,text,public.domain_hostname_kind,public.domain_execution_mode,uuid,uuid,text,jsonb,uuid) to service_role;
grant execute on function public.transition_tenant_domain(uuid,uuid,bigint,public.domain_activation_status,public.domain_activation_status,uuid,text,jsonb,text,jsonb,public.domain_activation_status) to service_role;
grant execute on function public.issue_domain_ownership_challenge(uuid,uuid,bigint,uuid,text,text,text,text,timestamptz,uuid) to service_role;
grant execute on function public.verify_domain_ownership_challenge(uuid,uuid,bigint,uuid,bigint,text[],text,uuid,text,uuid) to service_role;
grant execute on function public.activate_domain_replacement(uuid,uuid,uuid,bigint,bigint,uuid,text,jsonb) to service_role;
grant execute on function public.lease_domain_operation_jobs(text,integer,integer) to service_role;
grant execute on function public.complete_domain_operation_job(uuid,text,public.domain_job_status,jsonb,text,integer) to service_role;
grant execute on function public.register_domain_provider_account(text,text,jsonb,uuid,text) to service_role;
grant execute on function public.rotate_domain_provider_credential_reference(uuid,text,uuid,text) to service_role;
grant execute on function public.set_domain_provider_account_availability(uuid,boolean,uuid,text) to service_role;
grant execute on function public.activate_authoritative_domain_resolution(bigint,uuid,text) to service_role;

revoke all on function public.resolve_public_tenant_by_host(text) from public;
revoke all on function public.get_canonical_redirect_for_active_alias(text) from public;
grant execute on function public.resolve_public_tenant_by_host(text) to anon, authenticated, service_role;
grant execute on function public.get_canonical_redirect_for_active_alias(text) to anon, authenticated, service_role;

comment on table public.domain_authority_control is
  'Administrative cutover marker only. Public request resolution never branches to legacy authority at request time.';
comment on function public.resolve_public_tenant_by_host(text) is
  'Single production authority: active tenant_domains only. Returns zero rows on absence or ambiguity.';
comment on column public.domain_provider_accounts.credential_reference is
  'Opaque server-side environment reference. Plaintext credentials are prohibited.';