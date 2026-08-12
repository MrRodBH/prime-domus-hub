-- DCA-02 — Consolidated Corrective: Provider Binding Privilege Hardening
-- Forward-only least-privilege closure after direct post-migration grant audit.

revoke all privileges on table public.domain_provider_bindings from service_role;
grant select on table public.domain_provider_bindings to service_role;

comment on table public.domain_provider_bindings is
  'DCA-02 provider identity ledger. service_role has SELECT-only table authority; mutations are restricted to server-owned SECURITY DEFINER RPCs.';
