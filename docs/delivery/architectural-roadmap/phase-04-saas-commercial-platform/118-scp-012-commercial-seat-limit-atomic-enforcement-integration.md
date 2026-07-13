# 118 — SCP-012 — Commercial Seat Limit Atomic Enforcement Integration

**Status:** Ready for External Audit
**Phase:** 04 — SaaS Commercial Platform

Cross-reference: [`docs/architecture/impact-analysis/SCP-012-commercial-seat-limit-atomic-enforcement-integration.md`](../../../architecture/impact-analysis/SCP-012-commercial-seat-limit-atomic-enforcement-integration.md).

## Escopo materializado

- `CREATE OR REPLACE FUNCTION public.mutate_tenant_membership(...)` — a
  primitive canônica de mutation passa a executar, dentro de uma única
  transação PostgreSQL: (a) lock canônico `SELECT id FROM public.tenants
  WHERE id = _tenant_id FOR UPDATE`; (b) revalidação do Trusted Actor
  Context; (c) validação e proteção de owner; (d) planejamento integral
  da transição; (e) classificação server-side do seat delta; (f) para
  delta +1, chamada a `resolve_commercial_seat_decision(actor, tenant,
  origin, 1)`; (g) rollback determinístico via `commercial_seat_limit_denied`
  carregando `CommercialLimitDecision` em `DETAIL`; (h) DML após
  enforcement; (i) DTO whitelisted inalterado.
- Reclosure fail-closed da ACL de `mutate_tenant_membership` e
  `resolve_commercial_seat_decision` na mesma migration, com assertion
  dinâmica (`pg_proc` + `aclexplode` + `pg_roles`) que aborta caso
  qualquer *grantee* fora de function owner + service_role possua
  EXECUTE.
- Parser server-only-adjacent
  (`src/lib/api/commercial/membership-mutation-enforcement-error.ts`)
  reconhece exclusivamente a mensagem canônica por **igualdade exata**
  (`message === "commercial_seat_limit_denied"`); substrings, prefixos,
  sufixos ou wrappers retornam `null`. Exige DETAIL presente,
  parseável e semanticamente coerente via `validateSeatDecisionResponse`,
  e lança `CommercialSeatLimitDeniedError` com decisão validada.
- Boundary TypeScript
  (`src/lib/api/commercial/membership-mutation-boundary.server.ts`)
  preserva chamada única a `mutate_tenant_membership` via
  `supabaseAdmin` e passa a converter apenas o erro canônico em
  `CommercialSeatLimitDeniedError`. Zero fallback. Zero segunda escrita.
- Harness atualizado
  (`run-membership-mutation-parity-specs.ts`) — plano sintético +
  subscription active + entitlement `users.seats = 100`, cleanup
  fail-closed com verificação residual explícita para
  `tenant_members`, `tenants`, `tenant_subscriptions`,
  `commercial_plan_entitlements`, `commercial_plans`, `user_roles` e
  `auth.users`; erros de consulta residual falham o cleanup. A
  verificação de ausência em `auth.users` foi endurecida via helper
  local `isCanonicalAuthUserNotFoundError`, que aceita apenas a
  resposta canônica de `@supabase/supabase-js` (`AuthApiError`,
  `status = 404`, `code = "user_not_found"`); qualquer outro erro —
  rede, autenticação, autorização, servidor ou shape inesperado —
  falha o cleanup, assim como uma resposta sem erro sem `data.user`.
  14 cenários originais preservados.
- Runner de enforcement + concorrência
  (`run-commercial-seat-atomic-enforcement-specs.ts`) — **10 cenários
  reais** contra PostgreSQL (A–I + J), com clientes service_role
  independentes, `Promise.all`, helper `validateRealCommercialDenial`
  que verifica `error.message` exato, `error.code === "P0001"`,
  `error.details` real parseado por `validateSeatDecisionResponse`, e
  cenário J executando `executeMembershipMutation` diretamente para
  observar `CommercialSeatLimitDeniedError` produzido pelo boundary
  contra negação real do PostgREST. Cenários E, F e J agora
  desestruturam `error` da consulta de rollback contra
  `public.tenant_members` e falham explicitamente se a leitura não
  puder ser concluída — uma falha de consulta nunca é interpretada
  como ausência de membership; o rollback só é declarado quando a
  consulta tem sucesso e retorna zero linhas (E, J) ou o snapshot
  esperado (F, `suspended` com `suspended_at` não nulo). O runner
  compartilha o mesmo classificador canônico
  `isCanonicalAuthUserNotFoundError` para `auth.users`.
- Testes unitários — **14 casos** em
  `src/integrations/supabase/__tests__/commercial-seat-limit-denied-parser.spec.ts`
  (adicionado caso que rejeita mensagens contendo o token apenas como
  substring).

## Validações executadas

- `bunx tsc --noEmit -p tsconfig.json` → exit 0.
- `bunx tsx --tsconfig tsconfig.json ./run-tenant-specs.ts` → 233 passed, 0 failed.
- `bunx tsx --tsconfig tsconfig.json ./run-membership-mutation-parity-specs.ts` → 14 passed, 0 failed.
- `bunx tsx --tsconfig tsconfig.json ./run-commercial-seat-atomic-enforcement-specs.ts` → 10 passed, 0 failed.
- `git diff --check` → clean.
- ACL efetiva: `has_function_privilege` = `false` para anon,
  authenticated e sandbox_exec; `true` apenas para service_role. Owner
  + service_role únicos EXECUTE presentes em `aclexplode`.
- `tenant_members`: `authenticated` mantém apenas SELECT; anon sem
  privilégios; nenhuma mudança nesta etapa.

## Ausências declaradas

- Zero UI, frontend, rota nova, invitation flow, criação de `auth.users`
  no runtime de produto.
- Zero DELETE físico, zero owner mutation, zero segunda RPC, zero
  fallback TypeScript, zero enforcement após mutation, zero
  compensating transaction, zero snapshot ou reservation table.
- Zero grant de escrita a `authenticated`, zero policy RLS permissiva
  criada, zero acesso direto do browser à RPC.
- Zero segundo resolver comercial. Zero recomputo de decisão comercial
  em TypeScript. Zero override de `requestedIncrement` a partir do
  client — sempre literal `1` dentro da RPC.
- Zero mudança em provider adapters (Stripe / Hotmart / Kiwify), zero
  checkout, zero customer portal, zero webhook, zero upgrade/downgrade
  de plano.

## Roadmap final desta etapa

```
16. SCP-012 — Commercial Seat Limit Atomic Enforcement Integration —
Ready for External Audit.

16.0   SCP-012.0   — Accepted.
16.0.1 SCP-012.0.1 — Accepted.
16.0.2 SCP-012.0.2 — Accepted.
16.0.3 SCP-012.0.3 — Accepted.
```

F4-CF-01 permanece como checkpoint planejado após a aceitação da
SCP-012 e antes do fechamento formal da Fase 4.
