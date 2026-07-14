# 120 — Phase 4 Closing Review — SaaS Commercial Platform Formal Closure, Managed-Role Trust Boundary Reconciliation & Product Readiness Gate

**Status:** Ready for External Audit
**Phase:** 04 — SaaS Commercial Platform
**Depends on:** F4-CF-01 — Accepted; SCP-001 … SCP-012 — Accepted.
**Blocks:** PR-PH.0 (Planned; not started) and homologation.

Cross-reference:
[`docs/architecture/impact-analysis/PHASE-4-CLOSING-REVIEW-saas-commercial-platform-formal-closure.md`](../../../architecture/impact-analysis/PHASE-4-CLOSING-REVIEW-saas-commercial-platform-formal-closure.md).

## 1. Baseline e commit

- Baseline `de84190 Closed F4-CF-01 harness gates`.
- `git status --short` vazio na entrada; `git diff --check` clean.

## 2. Arquivos examinados

- `docs/architecture/impact-analysis/` — IA-006, ADR-005, ADR-006,
  F4.0, SCP-001…SCP-012 (com subetapas), F4-CF-01, este Closing Review.
- `docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/`
  — relatórios 44…119 + este 120.
- `docs/architecture/ROADMAP_ARCHITECTURAL.md`.
- `docs/architecture/security/SECURITY_ARCHITECTURE.md`.
- `supabase/migrations/` — inventário read-only (nenhuma migration
  criada, alterada ou removida).
- `src/lib/api/commercial/**`, `src/integrations/supabase/**`,
  `src/routes/**` (inventário read-only).
- Runners e testes: `run-tenant-specs.ts`,
  `run-membership-mutation-parity-specs.ts`,
  `run-commercial-seat-atomic-enforcement-specs.ts`,
  `run-commercial-sql-parity-specs.ts` +
  `src/integrations/supabase/__tests__/**`.

## 3. Arquivos criados nesta revisão

- `docs/architecture/impact-analysis/PHASE-4-CLOSING-REVIEW-saas-commercial-platform-formal-closure.md`.
- `docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/120-phase-4-closing-review-saas-commercial-platform-formal-closure.md`.

## 4. Arquivos alterados nesta revisão

- `src/integrations/supabase/__tests__/commercial-seat-sql-parity.spec.ts`
  — rejection contract strict: SQLSTATE `22023` **obrigatório**
  (código ausente reprova); mensagem por igualdade exata ou prefixo
  canônico declarado (`startsWith`); `data === null` obrigatório;
  `error` presente obrigatório. Nenhuma outra mudança funcional.
- `docs/architecture/impact-analysis/F4-CF-01-*.md` — status
  `Accepted`; §6 reescrita com plano de aplicação vs plano
  operacional gerenciado; §7 substitui "byte-a-byte" por "selected
  canonical fields unchanged"; §8.1/§8.2 refletem rejection strict
  e dump completo de role/ACL; §10 reclassifica Classe B como
  encerrada no plano de aplicação; §11 formaliza dependência da
  plataforma.
- `docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/119-*.md`
  — status `Accepted`; nota de ACL e catálogo alinhadas ao impact
  analysis.
- `docs/architecture/impact-analysis/SCP-012-*.md` — §9 renomeada
  para "ACL final — application trust boundary"; linha
  `sandbox_exec` retirada da tabela e substituída por nota formal
  apontando para F4-CF-01 §6.2; `authenticator` (JWT) adicionado
  explicitamente à evidência de ausência de privilégio.
- `docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/118-*.md`
  — nota de ACL alinhada (sem contradição com `sandbox_exec`
  reprovisionado).
- `docs/architecture/security/SECURITY_ARCHITECTURE.md` — §3.1
  criada: distinção Application trust boundary × Managed
  operational trust boundary, com critérios objetivos e
  requisitos permanentes.
- `docs/architecture/ROADMAP_ARCHITECTURAL.md` — entrada 17
  atualizada para `Accepted`; entrada 18 renomeada e marcada
  `Ready for External Audit`; síntese introdutória da Fase 4
  atualizada.

## 5. Estado final do roadmap

```
16. SCP-012 — Commercial Seat Limit Atomic Enforcement Integration —
    Accepted.

17. F4-CF-01 — Phase 4 Repository Integrity, Documentation Placement
    & Runtime Consistency Check and Fix — Accepted.

18. Phase 4 Closing Review — SaaS Commercial Platform Formal Closure,
    Managed-Role Trust Boundary Reconciliation & Product Readiness
    Gate — Ready for External Audit.

PR-PH.0 — Pre-Homologation Product Readiness Impact Analysis —
    Planned; not started.
```

## 6. Resultados dos testes

- `bunx tsc --noEmit -p tsconfig.json` → exit 0.
- `bunx tsx ./run-tenant-specs.ts` → 233 passed / 0 failed.
- `bunx tsx ./run-membership-mutation-parity-specs.ts` → 14 passed / 0 failed.
- `bunx tsx ./run-commercial-seat-atomic-enforcement-specs.ts` → 10 passed / 0 failed.
- `bunx tsx ./run-commercial-sql-parity-specs.ts` — decision 17/17,
  rejection 6/6 (strict SQLSTATE + prefix), structural 1/1,
  cleanup errors 0, fatal no, catalog unchanged yes, exit 0.
- `COMMERCIAL_PARITY_INJECT_FAILURE_AFTER_SETUP=1 bunx tsx
  ./run-commercial-sql-parity-specs.ts` — fatal yes, cleanup errors
  0, catalog unchanged yes, **exit 1**. Fail-closed lifecycle
  demonstrado.

## 7. Evidence — role and ACL

`sandbox_exec` role attributes (`pg_roles`):

```
rolname       | login | super | createrole | createdb | replication | bypassrls | inherit
sandbox_exec  |   t   |   f   |     f      |    f     |      f      |     t     |    t
```

`sandbox_exec` membership graph (`pg_auth_members` + `pg_has_role`):

```
sandbox_exec ⇐ member: postgres (admin_option = t)
pg_has_role sandbox_exec MEMBER:
  anon           = false
  authenticated  = false
  authenticator  = false
  service_role   = false
  supabase_admin = true    -- platform admin, not application
  postgres       = true    -- owner, not application
```

RPC ACL (`aclexplode`) — application plane:

```
proname                              | grantee       | privilege
resolve_commercial_seat_decision     | postgres      | EXECUTE (owner)
resolve_commercial_seat_decision     | service_role  | EXECUTE
mutate_tenant_membership             | postgres      | EXECUTE (owner)
mutate_tenant_membership             | service_role  | EXECUTE
```

`has_function_privilege(...,'EXECUTE')`:

```
role           | resolve_exec | mutate_exec
anon           |    false     |    false
authenticated  |    false     |    false
authenticator  |    false     |    false
service_role   |    true      |    true
sandbox_exec   |    true      |    true    -- managed operational role
postgres       |    true      |    true    -- owner
```

`tenant_members` grants (application plane):

```
grantee       | privilege
authenticated | SELECT
anon          | (none)
PUBLIC        | (none)
service_role  | administrative
```

## 8. sandbox_exec — application-usage proof

- `rg -n "sandbox_exec" src/` → 1 hit total; único hit é comentário
  na spec do harness declarando explicitamente que **não** usa a
  role (`no psql, no PGHOST, no sandbox_exec role`).
- Zero ocorrências em `src/lib/**`, `src/routes/**`,
  `src/integrations/**` (fora de testes), scripts produtivos,
  secrets declarados, arquivos de configuração ou pipeline.
- Nenhum principal de aplicação (`anon`, `authenticated`,
  `authenticator`, `service_role`) é membro de `sandbox_exec`.
- Classificação final (Resultado A da metodologia): **exceção
  operacional gerenciada**, formalizada em `SECURITY_ARCHITECTURE.md
  §3.1` e F4-CF-01 §6.2. Fora do trust boundary de aplicação.

## 9. Rejection contract (strict, fail-closed)

Seis cenários, todos exigindo:

- `data === null`;
- `error` presente;
- `error.code === "22023"` (código ausente reprova);
- `error.message` por prefixo canônico declarado.

Casos: `Invalid requestedIncrement` (increments 0 e 2),
`Invalid tenant origin`, `Actor not found`,
`Super admin requires impersonation origin` (com tenant real
provisionado), `Tenant not found`. Resultado: 6 / 0.

## 10. Cleanup e zero resíduos

- `runCleanupFailClosed` em `try/finally` global; verificação
  residual explícita em `tenant_billing_provider_mappings`,
  `tenant_members`, `tenant_entitlements`, `tenant_subscriptions`,
  `tenants`, `commercial_plan_entitlements`, `commercial_plans`,
  `user_roles` e `auth.users`.
- Execução normal: 0 cleanup errors, 0 resíduos, catálogo
  `users.seats` inalterado nos fields canônicos selecionados.
- Execução injetada: 0 cleanup errors, 0 resíduos, exit 1.

## 11. Reconciliação documental

- `SECURITY_ARCHITECTURE.md §3.1` formaliza os dois planos de
  trust boundary e os critérios para tratar uma role como
  managed operational.
- `SCP-012 §9` e `118 §80-88` alinhados com a distinção
  formal — `sandbox_exec` não aparece mais como grantee do
  trust boundary de aplicação; aparece explicitamente como
  exceção operacional na §6.2 do F4-CF-01.
- `F4-CF-01 §6/§7/§8/§10/§11` reescritas.
- `ROADMAP_ARCHITECTURAL.md` entradas 17 e 18 atualizadas
  para o estado final.

## 12. Risks remanescentes

- Dependência da segurança operacional da plataforma gerenciada
  para preservar `sandbox_exec` como role não assumível por
  aplicação. Alteração dessa postura pela plataforma reabre
  a análise (`SECURITY_ARCHITECTURE.md §3.1` critério 5).
- Homologação depende de PR-PH.0 — não iniciada.

## 13. Go / No-Go

- Application-plane hard gates: **all pass**.
- Managed operational plane: dependência aceita e documentada.
- Decisão: **Go — Phase 4 Closing Review Ready for External Audit.**

## 14. Status final

- **F4-CF-01 → Accepted.**
- **Phase 4 Closing Review → Ready for External Audit.**
- **PR-PH.0 → Planned; not started.**
- Fase 4 **não** apresentada como formalmente encerrada nesta
  execução — aguarda auditoria externa deste Closing Review.
