# SCP-010.1 — Relatório de execução

## Status

Ready for External Audit.

## 17.1 Arquivos criados

- `docs/architecture/impact-analysis/SCP-010.1-authoritative-membership-domain-verification-contract-determinism-roadmap-cleanup.md`
- `docs/delivery/phase-04-saas-commercial-platform/89-scp-010-1-authoritative-membership-domain-verification-contract-determinism-roadmap-cleanup.md`

## 17.2 Arquivos alterados

- `docs/architecture/impact-analysis/SCP-010-commercial-seat-limit-runtime-contract-planning.md`
  (reescrito integralmente para conteúdo único consolidado).
- `docs/architecture/ROADMAP_ARCHITECTURAL.md` (linhas 166-168:
  SCP-010 mantida como Ready for External Audit; SCP-010.1 inserida
  como 14.1; SCP-011 explicitada como próxima etapa futura não
  iniciada).

## 17.3 Domínio autoritativo de membership

- Enum PostgreSQL `public.membership_status` = `active | invited |
  suspended | revoked` (`removed` não existe).
- Enum PostgreSQL `public.tenant_role` = `owner | admin | manager |
  broker | captador | secretaria | viewer` (`agent`/`guest` não
  existem; coluna `membership_role` não existe).
- Coluna de status: `tenant_members.membership_status` `NOT NULL`
  `DEFAULT 'active'`.
- Coluna de papel: `tenant_members.tenant_role` `NOT NULL`
  `DEFAULT 'viewer'`.
- `types.ts`, `membership-types.ts`, `membership-validation.ts` e
  documentação F3.6 alinhados ao banco. Nenhum domínio legado
  coexistindo.

## 17.4 Constraint de unicidade

- Migration: `supabase/migrations/20260701204508_...` L33.
- Nome: `tenant_members_pkey`.
- Definição SQL: `PRIMARY KEY (tenant_id, user_id)` — total, sem
  predicado parcial.
- Cobre reinvites/revogados: reinvitar o mesmo `(tenant, user)`
  requer UPDATE na linha existente.

## 17.5 Representação de convites

- `user_id NOT NULL` na tabela `tenant_members`.
- Não existe tabela de invitations separada.
- Convite = linha com `membership_status='invited'`, `user_id`
  já vinculado a `auth.users`, `invited_at` preenchido.
- Duplicidade impedida pela PK.
- Unidade contada = `COUNT(*)` sobre
  `membership_status ∈ {active, invited}` — sem `DISTINCT`.

## 17.6 Fonte do limite

- Tabelas: `commercial_entitlement_definitions`,
  `commercial_plan_entitlements`, `tenant_entitlements`,
  `tenant_subscriptions`, `commercial_plans`.
- Coluna numérica: `value_int integer` (`CHECK value_int >= 0`).
- Cardinalidade:
  `tenant_entitlements_unique_tenant_key UNIQUE(tenant_id, entitlement_key)`;
  `commercial_plan_entitlements_unique_plan_key UNIQUE(plan_id, entitlement_key)`;
  `tenant_subscriptions_one_current_per_tenant_idx UNIQUE(tenant_id)
  WHERE status ∈ {trialing, active, past_due, suspended, internal,
  demo}`.
- Precedência final: (1) `tenant_entitlements` vigente → (2)
  `commercial_plan_entitlements` via subscription elegível
  (`trialing, active, past_due, internal, demo`) → (3)
  `not_evaluated`.
- Conflitos: violação de UNIQUE observada em runtime →
  `not_evaluated`. Nenhum `LIMIT 1` / `ORDER BY` para desempate.

## 17.7 Matriz determinística de decisões

Ver §8 do documento principal SCP-010. Cada cenário resolve para
exatamente um par `(allowed, reason, source, limit)`. `not_entitled`
e `billing_unknown` eliminados; único reason para fontes ausentes
ou inválidas = `not_evaluated`.

## 17.8 Mutation inventory

Busca em todo o repositório por escritas em `tenant_members`
(`insert`, `update`, `upsert`, `delete`, `from("tenant_members")`,
RPCs, edge functions, seeds, admin screens):

| Operação | Arquivo | Boundary | Aumenta uso? | Enforcement futuro? |
| --- | --- | --- | --- | --- |
| SELECT | `src/lib/api/tenant-selection.functions.ts` | server | não | n/a |
| SELECT (count) | `src/lib/api/super.functions.ts` | server admin | não | n/a |
| SELECT | `src/integrations/supabase/tenant-repository.ts` | server | não | n/a |

**Nenhuma mutation aplicacional** em `tenant_members`. RLS restringe
writes a `is_super_admin()`; mudanças de membership hoje ocorrem
somente via SQL/admin. Consequência: SCP-011 entregará runtime de
avaliação sem consumidor operacional; SCP-012 precisará distinguir
criar novos boundaries, migrar writes SQL existentes e integrar
enforcement em boundaries já existentes.

## 17.9 Roadmap consolidado

```
13. SCP-009 — Commercial Usage Limit Evaluation Planning — Accepted.
14. SCP-010 — Commercial Seat Limit Runtime Contract & Read Model Planning — Ready for External Audit.
14.1 SCP-010.1 — Authoritative Membership Domain Verification, Contract Determinism & Roadmap Cleanup — Ready for External Audit.
15. SCP-011 — Commercial Seat Limit Server Runtime — próxima etapa futura planejada; não iniciada.
```

## 17.10 Confirmações negativas

Nenhuma migration criada ou alterada. Nenhum código de produção
alterado. Nenhum enum, constraint, índice, trigger, RLS policy,
grant, seed, RPC, SQL function, tabela, coluna, mutation, query de
uso ou runtime criado. Nenhum frontend alterado. `feature-catalog.ts`,
`getCommercialFeatureDecision`, `decideCommercialFeature`,
`normalizeFeatureKey` inalterados. SCP-011 não iniciada. SCP-012
não iniciada.

## 18. Testes e verificações executadas

- Typecheck: `bunx tsgo --noEmit` — exit 0, sem erros.
- Specs: `bunx tsx --tsconfig tsconfig.json ./run-tenant-specs.ts`
  — 8 suites, **81 passed, 0 failed**, exit 0.
  - tenant-selection-state: 8 passed
  - tenant-attacher: 7 passed
  - tenant-selection-cardinality: 7 passed
  - tenant-gate: 12 passed
  - membership-validation: 10 passed
  - commercial-read-models: 9 passed
  - commercial-feature-gate: 15 passed
  - commercial-feature-catalog: 13 passed

Verificações documentais executadas após as edições:

- `rg -n "SCP-010|SCP-010.1|SCP-011" docs/architecture/ROADMAP_ARCHITECTURAL.md`
  → uma entrada SCP-010 (L166), uma entrada SCP-010.1 (L167), uma
  entrada futura SCP-011 (L168); sem placeholder antigo; sem
  numeração duplicada.
- `rg -n "a ser confirmad|a definir na SCP-011|not_entitled ou billing_unknown"
  docs/architecture/impact-analysis/SCP-010*.md` → zero
  ocorrências.

## 19. Critério de conclusão

Todos os critérios da §19 do plano SCP-010.1 satisfeitos. SCP-011
permanece não iniciada.
