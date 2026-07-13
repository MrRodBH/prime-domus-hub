# 50 — F4.0 — Role Reconciliation / Membership Role Audit

## 1. Objetivo

Executar auditoria e reconciliação documental do uso de
`tenant_role` (em especial `tenant_role = 'admin'` herdado do
backfill da F3.1) antes da modelagem comercial da Fase 4,
neutralizando conceitualmente o risco de overgrant sem alterar
dados nem introduzir autorização comercial funcional.

## 2. Identificação da etapa

- **Nome oficial:** F4.0 — Role Reconciliation / Membership Role Audit
- **Fase:** Fase 4 — SaaS Commercial Platform
- **Papel:** gate preparatório obrigatório, pré-SCP-001
- **Status:** Proposed / Ready for External Audit

## 3. Arquivos inspecionados

- `docs/architecture/impact-analysis/IA-006-saas-commercial-platform.md`
- `docs/architecture/ADR/ADR-005-commercial-domain.md`
- `docs/architecture/ADR/ADR-006-billing-provider-abstraction.md`
- `docs/architecture/ADR/README.md`
- `docs/architecture/ROADMAP_ARCHITECTURAL.md`
- `src/integrations/supabase/membership-types.ts`
- `src/integrations/supabase/membership-validation.ts`
- `src/integrations/supabase/tenant-repository.ts`
- `src/integrations/supabase/tenant-middleware.ts`
- `src/lib/api/tenant-selection.functions.ts`
- `src/components/workspace/tenant/tenant-selection-cardinality.ts`
- `supabase/migrations/20260708125042_*.sql` (F3.1)
- `supabase/migrations/20260708132329_*.sql`
- `docs/delivery/architectural-roadmap/phase-03-membership-evolution/28-f3-1-membership-schema-foundation.md`
- `docs/delivery/architectural-roadmap/phase-03-membership-evolution/41-f3-6-membership-roles-status-validation.md`

## 4. Arquivos criados

- `docs/architecture/security/F4-0-role-reconciliation-membership-role-audit.md`
- `docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/50-f4-0-role-reconciliation-membership-role-audit.md`

## 5. Arquivos alterados

- `docs/architecture/ADR/ADR-006-billing-provider-abstraction.md` —
  Status `Proposed / Ready for External Audit` → `Accepted`
  (substituição limpa, sem duplicidade).
- `docs/architecture/ADR/README.md` — entrada da ADR-006 movida de
  `*Proposed / Ready for External Audit*` para `*Accepted*`
  (substituição limpa, sem duplicidade).

## 6. Ajuste documental ADR-006 Accepted

Verificado por inspeção textual pós-edição:

- `docs/architecture/ADR/ADR-006-billing-provider-abstraction.md`
  contém exatamente uma linha `## Status` seguida de `Accepted`.
- `docs/architecture/ADR/README.md` contém exatamente uma entrada
  para ADR-006, com marcador `*Accepted*`. Entrada da ADR-005
  preservada como `*Accepted*`.

## 7. Confirmação de não implementação funcional

Não foram criadas migrations, tabelas, colunas, RLS policies, SQL
functions, grants, buckets, edge functions, rotas, componentes ou
tipos de código. Nenhum `UPDATE` foi executado em `tenant_members`.
Nenhuma alteração em Storage ou Runtime Core. Nenhuma integração
com Stripe/Hotmart/Kiwify.

## 8. Inventário de dados

Executado via `psql` gerenciado. Sem PII exposto.

- `membership_status`: `active = 4` (nenhum outro status presente).
- `tenant_role`: `owner = 1`, `admin = 3`.
- Combinada: `active/owner = 1`, `active/admin = 3`.
- Active admins: **3 memberships**, herdadas do backfill de F3.1.
- Owners: 1 registro, com `tenant_role = 'owner'` e
  `is_owner = true` convergentes.

## 9. Inventário de uso de código

- `tenant_role` em `src/` e `supabase/`: apenas types, helpers
  puros (`membership-types.ts`, `membership-validation.ts`),
  comentários proibindo uso como resolvedor/autorização, tipos
  gerados, testes e migrations. **Zero** uso funcional como
  autorização.
- `has_role(auth.uid(), 'admin')` em `src/` e `supabase/`: **0
  ocorrências**. Todas as menções vivem em `docs/` como
  proibição/correção.
- `billing_admin`, `commercial_admin`, `canManageTenantBilling`
  em `src/` e `supabase/`: **0 ocorrências**. Apenas vocabulário
  documental em ADR-005, ADR-006, IA-006 e relatórios.

## 10. Decisão de reconciliação

Existing `tenant_role` values are reconciled as product/membership
roles only. No existing `tenant_role`, including `admin`, is
authorized to act as `billing_admin` or `commercial_admin`.
Commercial administrative authorization remains undefined and
blocked until a dedicated authorization model is approved and
implemented.

Nenhum dado foi alterado. Os 3 registros `active/admin`
permanecem intactos e ficam explicitamente reconciliados como
roles de produto/membership, sem eficácia comercial.

## 11. Hard Gates

- **RR-G1** — No Existing Role Grants Commercial Admin
- **RR-G2** — No `tenant_role` Billing Authorization
- **RR-G3** — No `has_role` Billing Authorization
- **RR-G4** — Dedicated Commercial Authorization Required
- **RR-G5** — Server-Side Only Commercial Authorization
- **RR-G6** — No Super Admin Impersonation for Commercial Governance
- **RR-G7** — No Client-Side Commercial Authority

## 12. Roadmap, se alterado

`docs/architecture/ROADMAP_ARCHITECTURAL.md` **não** foi alterado
nesta etapa. Justificativa: a seção da Fase 4 já registra Role
Reconciliation como pré-requisito de billing admin e já bloqueia
uso de `tenant_role = 'admin'` / `has_role(auth.uid(), 'admin')`
como autorização comercial. Adicionar F4.0 explicitamente ao
roadmap é possível em patch documental subsequente sem impacto
funcional; não é necessário para concluir esta etapa.

## 13. Inspeções executadas

- `rg -n "tenant_role|TenantRole|isTenantAdminRole|isTenantOwnerRole|isTenantRole|assertTenantRole" src supabase docs/architecture docs/delivery`
- `rg -n "has_role\(auth\.uid\(\), 'admin'\)|has_role\(auth\.uid\(\), \"admin\"\)" src supabase docs/architecture docs/delivery`
- `rg -n "billing_admin|commercial_admin|canManageTenantBilling|billing admin|commercial admin" src supabase docs/architecture docs/delivery`
- `rg -n "tenant_role" src supabase` (usos restritos a
  type/helper/test/comentário/migration).
- Queries §8.1–§8.5 do prompt via `psql` gerenciado.

## 14. Testes / typecheck

- `bunx tsx --tsconfig tsconfig.json ./run-tenant-specs.ts` →
  **44 passed, 0 failed**.
- `bunx tsgo --noEmit` → clean.

## 15. Riscos residuais

- Semântica ambígua de `admin` no `tenant_role`.
- Overgrant histórico persistente (3 registros), inerte enquanto
  `tenant_role` não for conectado a decisões de autorização.
- Risco de uso indevido dos helpers `isTenantAdminRole` /
  `isTenantOwnerRole` — mitigado por comentários no módulo e pelos
  hard gates RR-G1..RR-G7.

## 16. Próximos passos

Após aprovação externa da F4.0, a próxima etapa possível é
**SCP-001 — Commercial Domain Model**, com restrição: SCP-001 não
pode implementar `billing_admin`, `commercial_admin` ou
`canManageTenantBilling`, salvo prompt específico com autorização
explícita posterior.

## 17. Audit Package

- Status da implementação: implementada, pronta para auditoria.
- Identificação da etapa: F4.0 — Role Reconciliation / Membership Role Audit
- Arquivos inspecionados: ver §3.
- Arquivos criados: `docs/architecture/security/F4-0-role-reconciliation-membership-role-audit.md`; `docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/50-f4-0-role-reconciliation-membership-role-audit.md`.
- Arquivos alterados: `docs/architecture/ADR/ADR-006-billing-provider-abstraction.md`; `docs/architecture/ADR/README.md`.
- Migrations: nenhuma.
- SQL functions: nenhuma.
- RLS policies: nenhuma.
- Grants: nenhum.
- Storage: nenhuma alteração.
- Runtime Core: nenhuma alteração.
- ADR-006 status atualizado: sim (`Accepted`), sem duplicidade.
- README ADR-006 atualizado: sim (`*Accepted*`), sem duplicidade.
- Inventário de dados executado: sim (§8).
- Active admins encontrados: 3.
- Uso funcional de `tenant_role`: nenhum.
- Uso funcional de `has_role` admin: nenhum em `src/`/`supabase/`.
- `billing_admin`/`commercial_admin` encontrados: nenhum em código.
- `canManageTenantBilling` encontrado: nenhum em código.
- Roadmap alterado: não (justificado §12).
- Testes executados: 44/44 passed.
- Typecheck: clean.
- Decisão de reconciliação: roles atuais reconciliados como
  product/membership only; autorização comercial permanece indefinida
  e bloqueada.
- Hard Gates registrados: RR-G1..RR-G7.
- Próximos passos: aprovação externa e, em seguida, SCP-001.
- Confirmação de escopo: F4.0 é auditoria/reconciliação documental
  e de dados; nenhum billing/commercial admin funcional foi criado.
- Conclusão: F4.0 implementada e pronta para auditoria.

## Retificação F4.0.1

A auditoria externa identificou duplicidade documental após F4.0: a ADR-006 permaneceu com dois status (`Proposed / Ready for External Audit` e `Accepted`) e o README de ADRs manteve duas entradas da ADR-006. A correção final foi realizada em F4.0.1 e documentada em `docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/51-f4-0-1-adr-006-accepted-status-final-cleanup.md`.
