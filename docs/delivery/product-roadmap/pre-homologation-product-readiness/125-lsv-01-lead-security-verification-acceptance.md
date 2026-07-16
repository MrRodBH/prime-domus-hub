# 125 — LSV-01: Lead Security Verification & Acceptance

**Status:** In Progress

- Lote A — Isolated Live Security Harness & Identity Matrix Foundation: **In Progress** — harness implementation completed; **live environment execution pending** (no authorized non-production target available in the current environment).
- Lote B — Live Authorization, RLS, Grants & Impersonation Matrix: **Blocked** (awaiting Lote A live execution).
- Lote C — Atomicity, Rollback, Concurrency & Final Closure: Pending.

**Predecessor:** LSH-01 (Accepted — External Audit Approval HEAD
`c6769c227e6255a01e1e3a96cac9292e0a72278e`).
**Successor:** RDA-01 (Planned · blocked until LSV-01 Accepted).

## Estado corrente do Lote A

Materializado neste HEAD:

- Environment guard endurecido com allowlist/denylist independente
  (`tests/security/lsv-01/authorized-test-targets.ts`); refs opacos
  desconhecidos são rejeitados mesmo quando `LSV_ALLOWED_PROJECT_REF`
  coincide com a URL; o ref de produção da aplicação está em denylist
  canônica.
- Factory concreta (`createConcreteFactory`) e cleanup concreto
  (`createConcreteCleanup`) implementados; ambos exigem client
  administrativo emitido apenas após aprovação do guard.
- Runner live (`run-lsv-01-live-specs.ts`) escreve evidência redigida
  em `docs/delivery/product-roadmap/pre-homologation-product-readiness/
  evidence/lsv-01-lot-a-live-execution.json` e **falha explicitamente
  quando não há target autorizado ou quando qualquer etapa live é
  pulada** — nunca declara sucesso sem execução real.
- Testes negativos do guard incluem: ref opaco desconhecido, ref de
  produção via denylist, target `local` com URL não-loopback, target
  `ephemeral`/`staging` com ref fora da allowlist.
- Regressão LSH-01 preservada (bun run test:lsh-01 exit 0).

Ainda pendente para declarar Lote A **Completed**:

- Provisionamento de projeto Supabase ephemeral/staging autorizado
  (adicionar o project ref em `ALLOWLIST_PROJECT_REFS`).
- Execução real de `bun run test:lsv-01:live` contra esse target,
  produzindo evidência com `production_guard_passed=true`,
  `real_sessions_acquired > 0`, `tenant_context_smoke_failed = 0`,
  `orphaned_fixtures = 0`.


## Baselines vinculantes

- **LSH-01 External Audit Approval HEAD:**
  `c6769c227e6255a01e1e3a96cac9292e0a72278e`
- **LSH-01 Implementation Evidence HEAD:**
  `20265f950b541e2d9f499e747b7577b28fc29a4a`
- **LSH-01 Lote B baseline:**
  `768f1f6789bf31421771b97722145a5cb5a1b5a4`

## Objetivo

Verificar operacionalmente, em ambiente isolado autorizado, a
autoridade Lead materializada pela LSH-01. A LSV-01 não redefine nem
reabre os contratos herdados; comprova-os sob JWTs reais, memberships
reais e RLS aplicada.

## Ambiente de teste autorizado

Targets permitidos: `local`, `ephemeral`, `staging`. Target proibido:
`production`. Configuração obrigatória:

```
LSV_TEST_MODE=1
LSV_TEST_TARGET=local|ephemeral|staging
LSV_ALLOWED_PROJECT_REF=<ref autorizado>
LSV_SUPABASE_URL=<target>
LSV_SUPABASE_ANON_KEY=<target>
LSV_SUPABASE_SERVICE_ROLE_KEY=<target>
```

O environment guard (`tests/security/lsv-01/environment-guard.ts`)
falha fechado com `LSV_TEST_TARGET_NOT_AUTHORIZED` para qualquer
divergência. Nenhuma fixture é criada antes da aprovação do guard.

## Arquivos do harness (Lote A)

- `tests/security/lsv-01/environment-guard.ts` — guarda de produção.
- `tests/security/lsv-01/fixture-types.ts` — contratos tipados.
- `tests/security/lsv-01/fixture-factory.ts` — API idempotente por
  runId; factory concreta bindada só contra target autorizado.
- `tests/security/lsv-01/fixture-cleanup.ts` — cleanup em finally,
  respeita `ON DELETE RESTRICT` de `lead_audit_events`.
- `tests/security/lsv-01/session-factory.ts` — `signInWithPassword`
  real; `fingerprintToken` irreversível.
- `tests/security/lsv-01/client-factory.ts` — cliente isolado por
  identidade com `MemoryStorage` própria.
- `tests/security/lsv-01/identity-matrix.ts` — matriz declarada de
  identidades, tenants, roles, memberships e Super Admin.
- `tests/security/lsv-01/harness-smoke.spec.ts` — smoke tests
  estruturais do harness.
- `run-lsv-01-harness-specs.ts` — runner com saída redigida.

## Matriz de identidades

| Alias | Tenant slot | Functional role | Membership | Super Admin | Auth |
|-------|-------------|-----------------|------------|-------------|------|
| tenant_a_admin | tenantA | admin | active | no | yes |
| tenant_a_corretor_assigned | tenantA | corretor | active | no | yes |
| tenant_a_corretor_unassigned | tenantA | corretor | active | no | yes |
| tenant_a_unauthorized_role | tenantA | secretaria | active | no | yes |
| tenant_b_admin | tenantB | admin | active | no | yes |
| tenant_b_corretor | tenantB | corretor | active | no | yes |
| suspended_member | tenantA | corretor | suspended | no | yes |
| removed_or_no_membership_user | none | — | none | no | yes |
| super_admin | none | — | none | yes | yes |
| anonymous | none | — | none | no | no |

## Fixtures previstas

- tenantA: `propertyA`, `leadAAssigned`, `leadAUnassigned`;
- tenantB: `propertyB`, `leadB`.

## Scripts

Adicionados a `package.json`:

```
test:lsv-01:harness  → tsx ./run-lsv-01-harness-specs.ts
test:lsv-01:lot-a    → bun run test:lsv-01:harness && bun run test:lsh-01
```

A execução é sempre explícita; nenhum comando padrão de build ou
desenvolvimento roda a suíte live.

## Redaction e evidências

O runner emite:

```
passed
failed
skipped
fixtures_created
fixtures_cleaned
orphaned_fixtures
environment_target
project_ref_redacted
```

Nunca são emitidos JWTs, tokens, senhas, service role, anon key ou
prefixos de token reutilizáveis. `redactProjectRef` produz
`prefix***suffix` para reports.

## Reservado aos Lotes B e C

- matriz completa das 5 operações Lead sob JWTs reais;
- matriz cross-tenant e header forjado;
- matriz de RLS efetiva no banco aplicado;
- matriz de grants efetiva no banco aplicado;
- matriz canônica de impersonação (7 cenários);
- atomicidade `create_manual_lead` lead + audit event;
- rollback sob erro intermediário;
- concorrência sob criação simultânea;
- fechamento documental e submissão para auditoria externa.

## Definition of Done (Lote A)

- LSH-01 marcado `Accepted` na Impact Analysis, no Delivery e no
  Roadmap;
- Impact Analysis e Delivery da LSV-01 criados;
- guard testado e presente;
- runner com saída redigida;
- clientes autenticados por identidade sem compartilhamento de
  estado;
- service role restrita a setup/teardown;
- regressão LSH-01 sem falhas;
- typecheck e build exit 0;
- nenhum secret ou token no repositório.

## Não escopo

RDA-01, RC-01, PR-M2, dashboard, CMS, host resolution, domains,
billing. Contratos estruturais da LSH-01 não são reabertos.

## Estado final (Lote A)

- LSH-01 — Accepted
- LSV-01 — In Progress
- Lote A — Completed (após execução com sucesso do runner e da
  regressão LSH-01)
- Lote B — Pending
- Lote C — Pending
- RDA-01 — Blocked
