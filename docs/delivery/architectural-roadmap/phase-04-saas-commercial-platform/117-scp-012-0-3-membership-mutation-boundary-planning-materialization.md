# 117 — SCP-012.0.3 — Membership Mutation Boundary Planning & Materialization

**Status:** Ready for External Audit
**Phase:** 04 — SaaS Commercial Platform

Cross-reference: [`docs/architecture/impact-analysis/SCP-012.0.3-membership-mutation-boundary-planning-materialization.md`](../../../architecture/impact-analysis/SCP-012.0.3-membership-mutation-boundary-planning-materialization.md).

## Escopo materializado

- Primitive SQL canônica `public.mutate_tenant_membership` (service_role-only, fail-closed).
- Boundary TypeScript server-only (`membership-mutation-boundary.server.ts`) chamando exclusivamente a RPC via `supabaseAdmin`.
- Contrato público estrito com union discriminada + rejeição explícita de campos proibidos.
- Trusted Actor Context derivado pelos middlewares existentes; sem aceitação de `tenantId`/`actorUserId` do payload.
- Matriz de autorização: owner + Super Admin impersonando; proteção de owner absoluta.
- Helper puro `classifyMembershipSeatDelta` (interno, não exposto ao cliente).
- Testes unitários (21 casos, exit 0) e integração crítica proporcional (10 cenários contra Postgres real, exit 0).
- Tightening dos grants em `tenant_members` (revoke `INSERT/UPDATE/DELETE` de `authenticated`/`anon`).

## Ausências declaradas

- Zero UI, zero frontend, zero rota nova, zero consumidor de produto.
- Zero lock, zero commercial enforcement, zero `CommercialLimitDecision` no retorno.
- Zero invitation flow, zero criação de `auth.users`, zero DELETE físico.
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
- `bunx tsx --tsconfig tsconfig.json ./run-tenant-specs.ts` → 197 passed, 0 failed.
- `bunx tsx --tsconfig tsconfig.json ./run-membership-mutation-parity-specs.ts` → 10 passed, 0 failed.
- `git diff --check` → clean.
- Zero fixture residual (`tenants` com slug `t-scp01203-%` → 0).

## Próximo gate

SCP-012 principal aguarda auditoria crítica externa desta etapa. Nenhuma autorização automática.
