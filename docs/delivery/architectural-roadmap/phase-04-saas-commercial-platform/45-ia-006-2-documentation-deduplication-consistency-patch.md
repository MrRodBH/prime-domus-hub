# 45 — IA-006.2 Documentation Deduplication & Consistency Patch

**Data:** 2026-07-08
**Etapa:** IA-006.2 — Documentation Deduplication & Consistency Patch
**Tipo:** Documental corretivo (sem alteração de código)
**Status:** IA-006.2 implementada e pronta para auditoria.

## 1. Objetivo

Corrigir definitivamente a consistência documental da IA-006 / IA-006.1
após a auditoria externa identificar que blocos antigos coexistiam com
os novos. Esta etapa é exclusivamente documental e cirúrgica: nenhum
código, migration, RLS, SQL function, grant, Storage ou Runtime Core
foi alterado.

## 2. Arquivos Alterados

- `docs/architecture/impact-analysis/IA-006-saas-commercial-platform.md`
  — §21 consolidada com a nova ordem obrigatória incluindo IA-006.2.
- `docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/43-ia-006-saas-commercial-platform-impact-analysis.md`
  — §9 renomeada de "Próximos Passos (atualizado por IA-006.1)" para
    "Próximos Passos" (lista única) e alinhada com IA-006.2.
- `docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/44-ia-006-1-roadmap-phase-numbering-rls-correction.md`
  — anexada nota de retificação IA-006.2.

## 3. Arquivos Criados

- `docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/45-ia-006-2-documentation-deduplication-consistency-patch.md`

## 4. Estado do ROADMAP_ARCHITECTURAL.md

A inspeção do roadmap mostra que já não existe a seção antiga
"Próxima macrofase — SaaS Commercial Platform" nem duplicidades de
Fase 4/5/6/7/8. A IA-006.1 anterior já havia consolidado o roadmap
neste ponto; a IA-006.2 confirma o estado final por inspeção formal.

### 4.1 Inspeção — Headings de fases

```
$ rg -n "^### .*Próxima macrofase|^### .*Fase 4|^### .*Fase 5|^### .*Fase 6|^### .*Fase 7|^### .*Fase 8" docs/architecture/ROADMAP_ARCHITECTURAL.md
124:### 🔵 Fase 4 — SaaS Commercial Platform
153:### 🟡 Fase 5 — Storage Abstraction Layer — Provisória
162:### 🟡 Fase 6 — Plugin Marketplace Evolution
168:### 🟡 Fase 7 — Workspace Ingestion System
174:### 🟡 Fase 8 — Observability Layer
```

Confirmações:

- Não existe mais `### 🔵 Próxima macrofase — SaaS Commercial Platform`.
- Existe uma única `### 🔵 Fase 4 — SaaS Commercial Platform`.
- Storage aparece apenas como `### 🟡 Fase 5 — Storage Abstraction Layer — Provisória`.
- Fases 5/6/7/8 não estão duplicadas.
- Não existe mais `### 🟡 Fase 4 — Storage Abstraction Layer`.
- Não existem mais as versões antigas `### 🟡 Fase 5 — Plugin Marketplace`,
  `### 🟡 Fase 6 — Workspace Ingestion System`, `### 🟡 Fase 7 — Observability Layer`.

## 5. IA-006 — Seção 13 (RLS)

A tabela consolidada em §13 já contém uma única entrada por tabela
(`plans`, `plan_features`, `tenant_subscriptions`, `tenant_entitlements`,
`billing_customers`, `billing_events`, `billing_invoices`,
`billing_provider_accounts`). Todas as entradas administrativas
dependem da função server-side dedicada futura `canManageTenantBilling`
ou `service_role` (webhooks). Não permanece a linha antiga:

```
tenant_subscriptions | SELECT restrito a has_role(auth.uid(), 'admin')
```

### 5.1 Inspeção — Ocorrências de has_role

```
$ rg -n "has_role\(auth\.uid\(\), 'admin'\)|tenant_subscriptions.*has_role|Leitura para admin do tenant" docs/architecture/impact-analysis/IA-006-saas-commercial-platform.md
265:> **não** autorizam o uso direto de `has_role(auth.uid(), 'admin')` nem
276:`has_role(auth.uid(), 'admin')` como autorização comercial real.
301:- `has_role(auth.uid(), 'admin')` **não** é recomendação direta para
```

Todas as três ocorrências restantes estão em **contexto de proibição /
correção histórica**, nunca como recomendação de RLS. Zero ocorrências
de `tenant_subscriptions.*has_role` e zero ocorrências de "Leitura para
admin do tenant".

## 6. IA-006 — Seção 21 (Critérios para Iniciar Implementação)

A seção 21 foi consolidada em uma única lista de sete passos:

1. Auditoria externa aprovar IA-006 / IA-006.1 / IA-006.2.
2. Emitir ADR-005 — Commercial Domain.
3. Emitir ADR-006 — Billing Provider Abstraction.
4. Executar Role Reconciliation / Membership Role Audit antes de
   qualquer autorização administrativa comercial.
5. Só então iniciar SCP-001 — Commercial Domain Model.
6. Confirmar preservação integral dos invariantes de Fase 2/3.
7. Registrar Secrets necessárias, nunca hardcoded, nunca no client.

## 7. Relatório 43 — Seção 9 consolidada

`docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/43-ia-006-saas-commercial-platform-impact-analysis.md` §9
foi renomeada de "Próximos Passos (atualizado por IA-006.1)" para
apenas "Próximos Passos", com lista única alinhada ao §21 da IA-006 e
incluindo a IA-006.2. Não existe duplicidade de §9.

### 7.1 Inspeção — Duplicidade de próximos passos

```
$ rg -n "^## 9\. Próximos Passos|^Antes de qualquer commit funcional|^1\. Auditoria externa" docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/43-...md docs/architecture/impact-analysis/IA-006-...md
IA-006-...:483: Antes de qualquer commit funcional da macrofase (ordem obrigatória):
IA-006-...:485: 1. Auditoria externa aprovar IA-006 / IA-006.1 / IA-006.2.
43-...:89:  ## 9. Próximos Passos
43-...:91:  1. Auditoria externa da IA-006 / IA-006.1 / IA-006.2.
```

Uma única seção/lista final por documento.

## 8. Relatório 44 — Retificação anexada

Anexada nota final ao `docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/44-...md` registrando a existência da
IA-006.2, sem apagar o histórico da IA-006.1.

## 9. Testes / Typecheck

```
$ bunx tsx --tsconfig tsconfig.json ./run-tenant-specs.ts
✓ tenant-selection-state: 8 passed, 0 failed
✓ tenant-attacher: 7 passed, 0 failed
✓ tenant-selection-cardinality: 7 passed, 0 failed
✓ tenant-gate: 12 passed, 0 failed
✓ membership-validation: 10 passed, 0 failed
TOTAL: 44 passed, 0 failed

$ bunx tsgo --noEmit
(clean)
```

Baseline preservado; nenhuma regressão introduzida (esperado, dado que
esta etapa é exclusivamente documental).

## 10. Riscos Residuais

- Nenhum risco funcional introduzido — etapa exclusivamente documental.
- Autorização administrativa comercial permanece condicionada a Role
  Reconciliation e à futura função `canManageTenantBilling`.
- IA-006 permanece bloqueada para implementação até aprovação externa
  final de IA-006 / IA-006.1 / IA-006.2.

## 11. Audit Package

- **Status da implementação:** IA-006.2 implementada e pronta para
  auditoria.
- **Arquivos alterados:**
  `docs/architecture/impact-analysis/IA-006-saas-commercial-platform.md`,
  `docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/43-ia-006-saas-commercial-platform-impact-analysis.md`,
  `docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/44-ia-006-1-roadmap-phase-numbering-rls-correction.md`.
- **Arquivos criados:**
  `docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/45-ia-006-2-documentation-deduplication-consistency-patch.md`.
- **Migrations:** nenhuma.
- **SQL functions:** nenhuma.
- **RLS policies:** nenhuma.
- **Grants:** nenhum.
- **Storage:** nenhuma alteração.
- **Runtime Core:** nenhuma alteração.
- **Roadmap deduplicado:** sim (ver §4.1).
- **Headings finais do roadmap:** Fase 4 SaaS Commercial Platform,
  Fase 5 Storage Abstraction Layer — Provisória, Fase 6 Plugin
  Marketplace Evolution, Fase 7 Workspace Ingestion System, Fase 8
  Observability Layer.
- **IA-006 RLS deduplicada:** sim (uma única tabela em §13).
- **`has_role` removido como recomendação:** sim (permanece apenas em
  contexto de proibição/correção — ver §5.1).
- **Seção 21 consolidada:** sim (ver §6).
- **Relatório 43 seção 9 consolidada:** sim (ver §7).
- **Relatório 44 retificado:** sim (nota IA-006.2 anexada).
- **Testes executados:** 44 passed, 0 failed.
- **Typecheck:** clean.
- **Confirmação de escopo:** exclusivamente documental corretivo;
  nenhum código de produção alterado.
- **Conclusão:** IA-006.2 implementada e pronta para auditoria.

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
- `ROADMAP_ARCHITECTURAL.md` não contém fases duplicadas. ✓
- IA-006 não contém tabela RLS duplicada. ✓

## Retificação IA-006.3

A auditoria externa identificou duplicidade remanescente na seção 21 da IA-006 e na seção 9 do relatório cronológico 43 após IA-006.2. A correção final foi realizada em IA-006.3 e documentada em docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/46-ia-006-3-final-documentation-consistency-verification-cleanup.md.
