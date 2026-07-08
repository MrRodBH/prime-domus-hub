# Relatório 52 — SCP-001 Commercial Domain Model

**Data:** 2026-07-08
**Etapa:** SCP-001 — Commercial Domain Model
**Fase:** Fase 4 — SaaS Commercial Platform
**Natureza:** Modelagem fundacional persistente. Sem billing real,
sem provider, sem webhooks, sem checkout, sem autorização
administrativa comercial.

## 1. Objetivo

Materializar o vocabulário comercial da ADR-005 em um schema
persistente mínimo e deny-by-default, respeitando integralmente
os Hard Gates RR-G1..RR-G7 da F4.0 e os limites de ADR-005/ADR-006.

## 2. Identificação da etapa

- **ID:** SCP-001 — Commercial Domain Model.
- **Sequência:** IA-006 → ADR-005 → ADR-006 → F4.0 → **SCP-001**.
- **Próxima possível etapa:** SCP-002 (não iniciada).

## 3. Arquivos inspecionados

- `docs/architecture/security/F4-0-role-reconciliation-membership-role-audit.md`
- `docs/architecture/ROADMAP_ARCHITECTURAL.md`
- `docs/architecture/ADR/ADR-005-commercial-domain.md`
- `docs/architecture/ADR/ADR-006-billing-provider-abstraction.md`
- `docs/architecture/impact-analysis/IA-006-saas-commercial-platform.md`
- `supabase/migrations/` (último timestamp).
- `pg_tables`, `pg_policies`, `pg_class` para os objetos criados.

## 4. Arquivos criados

- `supabase/migrations/20260708223211_64debf1c-e0af-4283-ba6c-770decc9dd98.sql`
  — migration `scp001_commercial_domain_model`.
- `docs/architecture/commercial/SCP-001-commercial-domain-model.md`
  — documento arquitetural oficial da SCP-001.
- `docs/fase6/52-scp-001-commercial-domain-model.md` — este relatório.

## 5. Arquivos alterados

- `docs/architecture/security/F4-0-role-reconciliation-membership-role-audit.md`
  — bloco `## Status` substituído integralmente por `Accepted`.
- `docs/architecture/ROADMAP_ARCHITECTURAL.md` — adicionada
  subseção única `#### Gates e sequência inicial da Fase 4`
  dentro da Fase 4 existente, sem duplicar a Fase, sem renumerar
  fases posteriores.

## 6. Ajuste documental F4.0 Accepted

Antes: `Proposed / Ready for External Audit`.
Depois: `Accepted`.

Inspeção de duplicidade:

```
$ rg -n "^## Status|Proposed / Ready for External Audit|Accepted" \
     docs/architecture/security/F4-0-role-reconciliation-membership-role-audit.md
2:## Status
3:Accepted
```

Resultado: único `## Status`, único `Accepted`, sem
`Proposed / Ready for External Audit`. Reconciliação, inventário
de dados, decisão e Hard Gates RR-G1..RR-G7 preservados intactos.

## 7. Roadmap

Fase 4 permanece com título `### 🔵 Fase 4 — SaaS Commercial
Platform`. Subseção `#### Gates e sequência inicial da Fase 4`
adicionada uma única vez, contendo:

1. IA-006 — Accepted.
2. ADR-005 — Accepted.
3. ADR-006 — Accepted.
4. F4.0 — Accepted.
5. SCP-001 — próxima etapa de modelagem fundacional.

Numeração de fases preservada (Fase 4 → Fase 8, sem renumeração).

## 8. Migration criada

Arquivo:
`supabase/migrations/20260708223211_64debf1c-e0af-4283-ba6c-770decc9dd98.sql`.

Escopo: exclusivamente criação das 5 tabelas comerciais
fundacionais, índices, RLS ENABLE, GRANT a `service_role`,
triggers `updated_at` reutilizando `public.tg_set_updated_at()`,
e `COMMENT ON TABLE`. Nenhuma alteração em tabelas pré-existentes.

## 9. Modelo de dados criado

Tabelas:
- `public.commercial_plans` — catálogo global de planos.
- `public.commercial_entitlement_definitions` — catálogo de
  entitlements possíveis.
- `public.commercial_plan_entitlements` — mapeamento plano ×
  entitlement.
- `public.tenant_subscriptions` — assinatura comercial
  tenant-scoped.
- `public.tenant_entitlements` — entitlements efetivos por tenant.

Índices:
- `commercial_plans_status_idx`
- `commercial_plan_entitlements_plan_id_idx`
- `commercial_plan_entitlements_key_idx`
- `tenant_subscriptions_tenant_id_idx`
- `tenant_subscriptions_status_idx`
- `tenant_subscriptions_one_current_per_tenant_idx` (parcial,
  único: no máximo 1 subscription corrente por tenant)
- `tenant_entitlements_tenant_id_idx`
- `tenant_entitlements_key_idx`

Constraints principais:
- `commercial_plans_code_format_chk`, `commercial_plans_status_chk`.
- `commercial_entitlement_definitions_key_format_chk`,
  `commercial_entitlement_definitions_value_type_chk`.
- `commercial_plan_entitlements_unique_plan_key`,
  `commercial_plan_entitlements_single_value_chk`,
  `commercial_plan_entitlements_int_non_negative_chk`,
  `commercial_plan_entitlements_decimal_non_negative_chk`.
- `tenant_subscriptions_status_chk`,
  `tenant_subscriptions_period_chk`.
- `tenant_entitlements_source_chk`,
  `tenant_entitlements_unique_tenant_key`,
  `tenant_entitlements_single_value_chk`,
  `tenant_entitlements_int_non_negative_chk`,
  `tenant_entitlements_decimal_non_negative_chk`,
  `tenant_entitlements_effective_period_chk`.

## 10. RLS posture

`ENABLE ROW LEVEL SECURITY` aplicado às 5 tabelas.

`FORCE ROW LEVEL SECURITY` **não** aplicado — o padrão atual do
projeto (`tenants`, `tenant_members`, `leads`) opera com
`relforcerowsecurity = false`. Manter consistência de padrão e
usar deny-by-default via ausência total de policies + grants
restritos a `service_role` é suficiente para SCP-001. Justificativa
registrada também em `docs/architecture/commercial/SCP-001-commercial-domain-model.md`
§RLS Posture.

Grants: apenas `GRANT ALL ... TO service_role` para as 5 tabelas.
Nenhum grant para `anon`. Nenhum grant para `authenticated`.

## 11. Confirmação de ausência de policies permissivas

```
$ psql -c "select tablename, policyname from pg_policies where
  schemaname='public' and tablename in (...5 tabelas...);"
(0 rows)
```

Resultado: 0 policies. Nenhuma policy comercial concedendo acesso
por `tenant_role`, `is_owner`, `has_role` ou por qualquer critério.

## 12. Confirmação de ausência de provider/webhook/checkout

```
$ rg -n "stripe|hotmart|kiwify|BillingProvider|NormalizedBillingEvent|webhook|checkout|customer portal" src supabase
src/lib/config.server.ts:24:    //   stripeSecretKey: process.env.STRIPE_SECRET_KEY,
```

Única ocorrência é um comentário pré-existente em
`src/lib/config.server.ts` (não introduzido nem alterado por
SCP-001). Nenhum adapter, SDK, rota, edge function, migration
ou runtime comercial de provider foi criado. Nenhum webhook.
Nenhum checkout. Nenhum customer portal.

## 13. Confirmação de ausência de billing admin/commercial admin

```
$ rg -n "billing_admin|commercial_admin|canManageTenantBilling|\
has_role\(auth\.uid\(\), 'admin'\)" src supabase
(nenhuma ocorrência)
```

`billing_admin`, `commercial_admin` e `canManageTenantBilling`
continuam inexistentes em `src/` e `supabase/`. Nenhuma
autorização administrativa comercial foi implementada.

## 14. Inspeções executadas

### 14.1 Tabelas criadas
```
$ psql -c "select tablename from pg_tables where schemaname='public'
  and tablename in ('commercial_plans','commercial_entitlement_definitions',
  'commercial_plan_entitlements','tenant_subscriptions','tenant_entitlements')
  order by tablename;"
 commercial_entitlement_definitions
 commercial_plan_entitlements
 commercial_plans
 tenant_entitlements
 tenant_subscriptions
(5 rows)
```

### 14.2 RLS habilitado
```
$ psql -c "select tablename, rowsecurity from pg_tables where ...;"
 commercial_entitlement_definitions | t
 commercial_plan_entitlements       | t
 commercial_plans                   | t
 tenant_entitlements                | t
 tenant_subscriptions               | t
```
`rowsecurity = true` para as 5 tabelas. `forcerowsecurity = false`
por consistência com o padrão do projeto (ver §10).

### 14.3 Policies existentes
Ver §11: 0 rows.

### 14.4 Constraints principais
Enumeradas em §9. Todas presentes conforme migration.

### 14.5 F4.0 status
Ver §6: único bloco `## Status` com valor `Accepted`.

### 14.6 Roadmap
Fase 4 preservada, subseção única `#### Gates e sequência inicial
da Fase 4`, Fases 5-8 intactas.

### 14.7 tenant_members
Migration SCP-001 não contém `tenant_members`. Nenhum UPDATE em
dados. Nenhum ALTER TABLE em `tenant_members`.

## 15. Testes / typecheck

```
$ bunx tsx --tsconfig tsconfig.json ./run-tenant-specs.ts
TOTAL: 44 passed, 0 failed

$ bunx tsgo --noEmit
(clean)
```

## 16. Riscos residuais

- Schema comercial sem consumidores até SCP-002+; mitigado por
  RLS deny-by-default + grant restrito a `service_role`.
- Overgrant histórico em `tenant_members` (3 registros `active/admin`)
  segue inalterado; mitigação continua sendo Hard Gates
  RR-G1..RR-G7.
- Risco de confusão entre catálogo e efetivo mitigado por `source`
  e janela de vigência em `tenant_entitlements`.

## 17. Próximos passos

1. Auditoria externa da SCP-001.
2. Após aprovação, planejar **SCP-002 — Billing Provider Abstraction
  Materialization** (ou etapa intermediária, se auditoria exigir).
3. Nenhuma outra etapa comercial pode iniciar antes.

## 18. Audit Package

- **Status da implementação:** Implementado — SCP-001 emitida como
  *Implemented / Ready for External Audit*.
- **Identificação da etapa:** SCP-001 — Commercial Domain Model.
- **Arquivos inspecionados:** ver §3.
- **Arquivos criados:** ver §4.
- **Arquivos alterados:** ver §5.
- **Migration criada:**
  `supabase/migrations/20260708223211_64debf1c-e0af-4283-ba6c-770decc9dd98.sql`.
- **Tabelas criadas:** 5 (ver §9).
- **Constraints criadas:** ver §9.
- **Índices criados:** 8 (ver §9).
- **RLS habilitado:** sim, nas 5 tabelas.
- **FORCE RLS aplicado:** não — justificativa em §10.
- **Policies criadas:** 0.
- **Migrations:** 1.
- **SQL functions:** nenhuma nova (apenas reuso de
  `public.tg_set_updated_at`).
- **Grants:** apenas `service_role`.
- **Storage:** intacto.
- **Runtime Core:** intacto.
- **F4.0 status atualizado:** sim (`Accepted`).
- **Roadmap alterado:** sim, apenas subseção única dentro da Fase 4.
- **Provider integration:** não.
- **Webhooks:** não.
- **Checkout:** não.
- **Billing admin:** não.
- **Commercial admin:** não.
- **canManageTenantBilling:** não.
- **tenant_members alterada:** não.
- **Seed data:** nenhum.
- **Testes executados:** 44/44 passed.
- **Typecheck:** clean.
- **Inspeções executadas:** ver §14.
- **Riscos residuais:** ver §16.
- **Próximos passos:** ver §17.
- **Confirmação de escopo:**
  - SCP-001 criou apenas modelagem fundacional do domínio comercial.
  - SCP-001 não implementou billing admin.
  - SCP-001 não implementou commercial admin.
  - SCP-001 não implementou canManageTenantBilling.
  - SCP-001 não implementou provider integration.
  - SCP-001 não implementou BillingProvider real.
  - SCP-001 não implementou NormalizedBillingEvent real.
  - SCP-001 não implementou webhooks.
  - SCP-001 não implementou checkout.
  - SCP-001 não integrou Stripe/Hotmart/Kiwify.
  - SCP-001 não criou UI comercial.
  - SCP-001 não criou policies permissivas para usuários finais.
  - SCP-001 não usou `tenant_role` como autorização comercial.
  - SCP-001 não usou `has_role(auth.uid(),'admin')` como autorização comercial.
  - SCP-001 não alterou `tenant_members`.
  - SCP-001 não executou update em dados existentes.
  - SCP-001 não criou seed de planos ou entitlements.
  - SCP-002 não foi iniciada.
- **Conclusão:** SCP-001 implementada e pronta para auditoria.
