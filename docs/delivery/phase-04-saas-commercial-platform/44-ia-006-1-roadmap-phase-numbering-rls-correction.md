# 44 — IA-006.1 Roadmap Phase Numbering & RLS Proposal Correction

**Data:** 2026-07-08
**Etapa:** IA-006.1 — Roadmap Phase Numbering & RLS Proposal Correction
**Tipo:** Documental corretiva (sem alteração de código)
**Status:** IA-006.1 implementada e pronta para auditoria.

## 1. Objetivo

Corrigir a documentação da IA-006 e do `ROADMAP_ARCHITECTURAL.md`
para:

- eliminar ambiguidade de fase (Fase 3 duplicada);
- oficializar a próxima macrofase como **Fase 4 — SaaS Commercial
  Platform**;
- mover **Storage Abstraction Layer** para fase futura provisória
  (**Fase 5**), sem ocupar o slot da Fase 4;
- remover a recomendação ambígua de autorização comercial baseada
  diretamente em `has_role(auth.uid(), 'admin')` ou `tenant_role =
  'admin'`;
- reforçar que autorização comercial administrativa depende de
  **Role Reconciliation** e de uma futura função server-side dedicada
  (`canManageTenantBilling(userId, tenantId)`).

## 2. Arquivos Alterados

- `docs/architecture/ROADMAP_ARCHITECTURAL.md`
- `docs/architecture/impact-analysis/IA-006-saas-commercial-platform.md`
- `docs/delivery/phase-04-saas-commercial-platform/43-ia-006-saas-commercial-platform-impact-analysis.md`

## 3. Arquivos Criados

- `docs/delivery/phase-04-saas-commercial-platform/44-ia-006-1-roadmap-phase-numbering-rls-correction.md`

## 4. Confirmação de Não-Implementação

Nenhuma implementação funcional ocorreu nesta etapa. Nenhuma
migration, SQL function, RLS policy, grant, alteração em Storage ou
em Runtime Core. Nenhuma feature comercial (planos, assinaturas,
webhooks, Stripe/Hotmart/Kiwify, UI comercial, feature flags
comerciais).

## 5. Resumo da Correção no Roadmap

- Fase 3 permanece registrada **apenas** como
  `### ✅ Fase 3 — Membership Evolution Model — Formalmente encerrada`.
  Não há mais coexistência com uma seção "🟡 Fase 3" planejada/ativa.
- Antiga seção `### 🔵 Próxima macrofase — SaaS Commercial Platform`
  foi substituída por `### 🔵 Fase 4 — SaaS Commercial Platform`,
  com Status = planejamento arquitetural iniciado via IA-006 e
  Implementation Status = `BLOCKED` até aprovação externa da
  IA-006/IA-006.1. Registrado explicitamente que **Fase 4 ainda
  não está em implementação funcional** e **SCP-001 ainda não foi
  iniciada**.
- Antiga seção `### 🟡 Fase 4 — Storage Abstraction Layer` foi
  reposicionada como `### 🟡 Fase 5 — Storage Abstraction Layer —
  Provisória`, com nota explícita de que a prioridade atual pós-Fase
  3 é a Fase 4 — SaaS Commercial Platform.
- Fases subsequentes renumeradas em cadeia: Plugin Marketplace
  Evolution → Fase 6, Workspace Ingestion System → Fase 7,
  Observability Layer → Fase 8.

## 6. Confirmação — Fase 3

Fase 3 aparece exclusivamente como **formalmente encerrada**
(F3.1..F3.7 concluídas). Nenhuma duplicidade remanescente.

## 7. Confirmação — Fase 4 oficializada

`Fase 4 — SaaS Commercial Platform` é a próxima macrofase oficial.
Permanece bloqueada para implementação até aprovação externa.

## 8. Confirmação — Storage Abstraction Layer reposicionada

Movida para `Fase 5 — Storage Abstraction Layer — Provisória`. Não
é mais a Fase 4 imediata.

## 9. Resumo da Correção — RLS / Admin Billing

Na IA-006 §13 (Impacto em RLS e Segurança):

- Removida a recomendação direta de
  `has_role(auth.uid(), 'admin')` como política de billing.
- Substituída por dependência de função server-side dedicada
  futura `canManageTenantBilling(userId, tenantId)`.
- Adicionado texto obrigatório: **"A IA-006 não autoriza usar
  `tenant_role = 'admin'` nem `has_role(auth.uid(), 'admin')` como
  autorização comercial real. Qualquer autorização administrativa
  de billing depende de Role Reconciliation e de uma função
  server-side dedicada futura."**
- Pré-requisitos explicitados: Role Reconciliation / Membership
  Role Audit, definição de `billing_admin` / `commercial_admin`,
  ADR de Commercial Authorization, testes de bypass, validação
  server-side.

IA-006 §21 e o relatório cronológico 43 atualizados com a nova
ordem de próximos passos: auditoria → ADR-005 → ADR-006 → Role
Reconciliation → SCP-001.

## 10. Confirmações de Invariantes

- `tenant_role = 'admin'` **não** é autorização comercial.
- `has_role(auth.uid(), 'admin')` **não** é recomendação direta
  para billing.
- Role Reconciliation permanece **pré-requisito** obrigatório
  para qualquer autorização administrativa comercial.
- Nenhuma feature comercial foi implementada.
- SCP-001 não foi iniciada.

## 11. Testes / Typecheck

- `bunx tsx --tsconfig tsconfig.json ./run-tenant-specs.ts` →
  **44 passed, 0 failed** (baseline preservado — nenhuma
  alteração de código).
- `bunx tsgo --noEmit` → clean.

## 12. Riscos Residuais

- Nenhum risco novo introduzido; risco de overgrant histórico
  `tenant_role = 'admin'` permanece registrado e passa a estar
  explicitamente coberto pelo requisito de Role Reconciliation
  antes de qualquer autorização comercial.

## 13. Audit Package

- **Status da implementação:** IA-006.1 implementada e pronta
  para auditoria.
- **Arquivos alterados:** `docs/architecture/ROADMAP_ARCHITECTURAL.md`,
  `docs/architecture/impact-analysis/IA-006-saas-commercial-platform.md`,
  `docs/delivery/phase-04-saas-commercial-platform/43-ia-006-saas-commercial-platform-impact-analysis.md`.
- **Arquivos criados:**
  `docs/delivery/phase-04-saas-commercial-platform/44-ia-006-1-roadmap-phase-numbering-rls-correction.md`.
- **Migrations:** nenhuma.
- **SQL functions:** nenhuma.
- **RLS policies:** nenhuma.
- **Grants:** nenhum.
- **Storage:** nenhuma alteração.
- **Runtime Core:** nenhuma alteração.
- **Roadmap corrigido:** sim.
- **IA-006 corrigida:** sim (§13 e §21).
- **Relatório cronológico corrigido:** sim (§9 do doc 43).
- **Fase 3 duplicada removida:** sim (permanece apenas a seção
  "✅ formalmente encerrada").
- **Fase 4 — SaaS Commercial Platform oficializada:** sim.
- **Storage Abstraction Layer reposicionada:** sim (Fase 5 —
  Provisória).
- **RLS/admin billing corrigido:** sim.
- **Testes executados:** 44 passed, 0 failed.
- **Typecheck:** clean.
- **Confirmação de escopo:** exclusivamente documental/corretivo;
  nenhum código de produção alterado.
- **Conclusão:** IA-006.1 implementada e pronta para auditoria.

Confirmações obrigatórias:

- Nenhuma feature comercial foi implementada. ✓
- Nenhuma migration foi criada. ✓
- Nenhuma RLS policy foi criada ou alterada. ✓
- Nenhuma SQL function foi criada ou alterada. ✓
- Nenhum grant foi alterado. ✓
- Nenhuma alteração em Storage. ✓
- Nenhuma alteração em Runtime Core. ✓
- SCP-001 não foi iniciada. ✓
- Billing não foi implementado. ✓
- Stripe/Hotmart/Kiwify não foram integrados. ✓
- `tenant_role = 'admin'` não é autorização comercial. ✓
- `has_role(auth.uid(), 'admin')` não é recomendação direta para
  billing. ✓
- Role Reconciliation permanece pré-requisito para billing admin. ✓

---

## Retificação IA-006.2

A auditoria externa identificou que IA-006.1 havia inserido novas seções
sem remover completamente blocos antigos. A correção final foi realizada
em IA-006.2, documentada em
`docs/delivery/phase-04-saas-commercial-platform/45-ia-006-2-documentation-deduplication-consistency-patch.md`.
