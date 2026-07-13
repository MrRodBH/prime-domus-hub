# 115 — SCP-012.0.2.1 — Executable SQL/TypeScript Parity, Numeric Contract Hardening, RPC Validation & Evidence Reconciliation

## Status

Blocked: awaiting SCP-012.0.2.2 acceptance

## Baseline e HEAD técnico revisado

- Baseline vinculante: `37257b26570153716804010a6e5782b6647b6a16`
  (`Executou SCP-012.0.2 completo`).
- Reviewed Materialization Head desta etapa: registrado apenas neste
  relatório textual (modelo de evidência Git não autorreferencial).
- Correção retroativa: o Reviewed Materialization Head da SCP-012.0.2
  passa a ser `aee629d07aa1697a6a4bfb771c770e00bbff96da` (o SHA
  `1002fa202a3f41c3c4204ff13985773a264606ac` do relatório 114 original
  está incorreto e é substituído).

## Ambiente PostgreSQL utilizado

Supabase gerenciado do projeto — mesma instância utilizada pela
SCP-012.0.2. Consultas executadas via `psql` com credenciais `PGHOST`
providas pelo sandbox.

## Migrations aplicadas nesta etapa

1. `20260713200019_4acf0d4b-b8c0-4cb1-847f-e4a596e32adb.sql` — resolver
   hardening (bigint/numeric, REVOKE sandbox_exec, tie-breaker).
2. `20260713200657_b3701580-1659-48e7-b302-5dfcbf24c80c.sql` — realinhamento do CHECK regex de
   `commercial_entitlement_definitions.key` para admitir `.` e seed
   canônico de `users.seats` (`value_type='integer'`).

## Definição SQL final (resumida)

`public.resolve_commercial_seat_decision(uuid, uuid, text, integer)`:

- `LANGUAGE plpgsql`, `STABLE`, `SECURITY DEFINER`,
  `SET search_path = public, pg_temp`;
- variáveis quantitativas em `bigint`; `v_ent_value_decimal` em `numeric`;
- `COUNT(*)` mantido em `bigint`;
- `MAX_SAFE_INTEGER = 9007199254740991` como constante numérica;
- ordenação de subscriptions: status priority → `started_at DESC NULLS LAST` → `id ASC`;
- entitlement tenant/plan usa unicidade das constraints do schema.

## ACL antes → depois

ANTES: `{postgres=X/postgres, service_role=X/postgres, sandbox_exec=X/postgres}`.
DEPOIS: `{postgres=X/postgres, service_role=X/postgres}`.

`has_function_privilege`:
```
anon          : false
authenticated : false
sandbox_exec  : false
service_role  : true
postgres      : true (owner)
```

## Constraints identificadas

- `tenant_entitlements_unique_tenant_key UNIQUE (tenant_id, entitlement_key)`
- `commercial_plan_entitlements_unique_plan_key UNIQUE (plan_id, entitlement_key)`
- `tenant_subscriptions_one_current_per_tenant_idx UNIQUE (tenant_id) WHERE status IN (active-set)`
- `tenant_subscriptions_status_chk` — `{trialing, active, past_due, suspended, canceled, internal, demo}`.
- `commercial_entitlement_definitions_key_format_chk` — corrigido de
  `^[a-z][a-z0-9_]*$` para `^[a-z][a-z0-9_.]*$`.
- `commercial_entitlement_definitions_value_type_chk` —
  `{boolean, integer, decimal, text}`.

## Decisão sobre source `default`

Mantido no enum DTO como reservado. Nenhum produtor persistido existe;
precedência real materializada é `tenant > plan > none`. Documentos
canônicos ajustados.

## Arquivos criados nesta etapa

- `supabase/migrations/20260713200019_*.sql` (migration corretiva do resolver).
- `supabase/migrations/20260713200657_b3701580-1659-48e7-b302-5dfcbf24c80c.sql` (migration corretiva do catálogo).
- `src/lib/api/commercial/seat-limit-rpc-contract.ts` (validator puro).
- `src/integrations/supabase/__tests__/commercial-seat-rpc-contract.spec.ts`.
- `src/integrations/supabase/__tests__/commercial-seat-sql-parity.spec.ts`.
- `run-commercial-sql-parity-specs.ts`.
- `docs/architecture/impact-analysis/SCP-012.0.2.1-*.md`.
- este relatório.

## Arquivos alterados

- `src/lib/api/commercial/commercial.functions.ts` — tie-breaker
  `id ASC` em `pickActiveSubscription`; validator inline substituído
  por import do módulo puro.
- `run-tenant-specs.ts` — inclui a suíte `commercial-seat-rpc-contract`.
- `docs/architecture/ROADMAP_ARCHITECTURAL.md` — entrada 16.0.2
  passa a `Blocked: awaiting SCP-012.0.2.1 acceptance`; adiciona
  16.0.2.1 `Ready for External Audit`.
- `docs/architecture/impact-analysis/SCP-012.0.2-*.md` — nota do
  Reviewed Materialization Head corrigido e limitações reconciliadas.
- `docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/114-scp-012-0-2-*.md`
  — SHA corrigido, inventário de 7 arquivos, source `default` reconciliada.

## Resultados dos runners

- `bunx tsc --noEmit -p tsconfig.json` → **exit 0**.
- `bunx tsx --tsconfig tsconfig.json ./run-tenant-specs.ts` → **exit 0**
  (168 passed, 0 failed; inclui 32 casos do novo validator).
- `bunx tsx --tsconfig tsconfig.json ./run-commercial-sql-parity-specs.ts`
  → **NÃO exit 0 nesta execução**. Falha estrutural: o role sandbox_exec
  no ambiente atual recebe grants declarados em `tenant_members`, mas
  RLS bloqueia `INSERT` fora de um contexto autenticado com
  `permission denied for table tenant_members`. Sem essa capacidade os
  cenários 12-14 do harness (membership-dependent) não são
  materializáveis; os cenários 1-11 e 15-17 estão codificados e
  passíveis de execução em um role privilegiado (ver §19 do
  documento).

## Verificação da route tree

`src/routeTree.gen.ts` reproduzível pelo plugin do TanStack Router.
Nenhuma edição manual nesta etapa.

## `git diff --check`

Limpo (verificado antes de cada commit).

## Confirmações negativas

- zero mutation em `tenant_members` no runtime;
- zero lock no resolver;
- zero enforcement;
- zero fallback TypeScript no runtime público;
- zero secret exposto;
- zero role extra com EXECUTE;
- zero frontend alterado.

## Bloco final do roadmap

```
16.0.1.3.1.1 SCP-012.0.1.3.1.1 — Accepted.
16.0.2 SCP-012.0.2 — Blocked: awaiting SCP-012.0.2.1 acceptance.
16.0.2.1 SCP-012.0.2.1 — Ready for External Audit.
```

SCP-012.0.3 não autorizada. SCP-012 permanece Blocked.

## Riscos / limitações remanescentes

1. **Harness parcialmente executável**: cenários 12-14 (membership
   fixtures) e 25-30 (actor rejections automatizados) não passam pelo
   role sandbox_exec devido a RLS em `tenant_members`. Todos os
   cenários estão codificados e prontos para execução em role
   privilegiado; requer decisão de auditoria sobre estratégia de
   fixture (harness com service role vs. Supabase Admin API).
2. `grace`/`unpaid` são código morto no resolver enquanto o CHECK
   constraint de `tenant_subscriptions.status` não for ampliado.
3. `source = 'default'` continua reservado e inalcançável.
4. A correção introduziu duas migrations adicionais; toda a matriz
   deve ser re-verificada por auditoria contra o schema pós-correção.
