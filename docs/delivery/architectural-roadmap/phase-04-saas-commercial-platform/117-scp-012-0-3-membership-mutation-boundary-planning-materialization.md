# 117 — SCP-012.0.3 — Membership Mutation Boundary Planning & Materialization

**Status:** Ready for External Audit
**Phase:** 04 — SaaS Commercial Platform

Cross-reference: [`docs/architecture/impact-analysis/SCP-012.0.3-membership-mutation-boundary-planning-materialization.md`](../../../architecture/impact-analysis/SCP-012.0.3-membership-mutation-boundary-planning-materialization.md).

## Escopo materializado

- Primitive SQL canônica `public.mutate_tenant_membership` (service_role-only, fail-closed).
  Migrations:
  - `supabase/migrations/20260713212535_fdf03e63-87cb-4288-9806-09ff0368747c.sql` (função + tightening inicial).
  - `supabase/migrations/20260713213947_4b389fff-0a89-446d-9cf7-753b21a79586.sql` (correção ACL de `tenant_members` + assertion fail-closed via `pg_class`/`aclexplode`).
- Boundary TypeScript server-only (`membership-mutation-boundary.server.ts`) chamando exclusivamente a RPC via `supabaseAdmin`; validator **semântico** exige `tenantId`/`targetUserId`/`operation` esperados e enforce das transições por operação.
- Contrato público estrito com union discriminada + rejeição explícita de campos proibidos.
- Trusted Actor Context derivado pelos middlewares existentes; sem aceitação de `tenantId`/`actorUserId` do payload.
- Matriz de autorização: owner + Super Admin impersonando; proteção de owner absoluta (também no validator do retorno).
- Helper puro `classifyMembershipSeatDelta` (interno, não exposto ao cliente).
- Testes unitários (35 casos em `membership-mutation-input.spec.ts`, `run-tenant-specs.ts` exit 0) e integração crítica proporcional (14 cenários contra Postgres real com probes separados anon / authenticated / service_role, exit 0).
- ACL final de `public.tenant_members`: `PUBLIC` sem privilégio, `anon` sem privilégio, `authenticated` = `SELECT` somente, `service_role` administrativo.

## Ausências declaradas

- Zero UI, zero frontend, zero rota nova, zero consumidor de produto.
- Zero lock, zero commercial enforcement, zero `CommercialLimitDecision` no retorno.
- Zero invitation flow, zero criação de `auth.users` no runtime de produto (o harness cria usuários temporários exclusivamente como fixtures e os remove de forma fail-closed), zero DELETE físico.
- Zero owner mutation.

## Roadmap final desta etapa

```
16.  SCP-012 — Commercial Seat Limit Atomic Enforcement Integration —
     Blocked: awaiting SCP-012.0.3 acceptance.
16.0.3 SCP-012.0.3 — Membership Mutation Boundary Planning &
     Materialization — Ready for External Audit.
```

## Validações executadas

- `bunx tsc --noEmit -p tsconfig.json` → exit 0.
- `bunx tsx --tsconfig tsconfig.json ./run-tenant-specs.ts` → 211 passed, 0 failed.
- `bunx tsx --tsconfig tsconfig.json ./run-membership-mutation-parity-specs.ts` → 14 passed, 0 failed (probes anon/authenticated/service_role separados; cleanup fail-closed sem resíduos).
- `git diff --check` → clean.

## Próximo gate

SCP-012 principal aguarda auditoria crítica externa desta etapa. Nenhuma autorização automática.
