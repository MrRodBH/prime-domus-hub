# Relatório 47 — ADR-005 Commercial Domain

**Data:** 2026-07-08
**Etapa:** ADR-005 — Commercial Domain
**Natureza:** Arquitetural / Documental — sem implementação funcional.

## 1. Objetivo

Emitir a **ADR-005 — Commercial Domain**, formalizando o vocabulário
comercial oficial e as fronteiras conceituais entre tenant,
membership, subscription, plan e entitlement, cumprindo o item 2 da
ordem obrigatória definida em IA-006 §21 (aprovar IA-006 → ADR-005
→ ADR-006 → Role Reconciliation → SCP-001).

## 2. Arquivos inspecionados

- `docs/architecture/ADR/README.md`
- `docs/architecture/ADR/ADR-001-ResolutionGraph.md`
- `docs/architecture/ADR/ADR-004-WorkspaceRuntime.md`
- `docs/architecture/impact-analysis/IA-006-saas-commercial-platform.md`
- `docs/architecture/ROADMAP_ARCHITECTURAL.md`
- `docs/delivery/architectural-roadmap/phase-03-membership-evolution/42-f3-7-phase-3-closing-review.md`
- `docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/44-ia-006-1-roadmap-phase-numbering-rls-correction.md`
- `docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/45-ia-006-2-documentation-deduplication-consistency-patch.md`
- `docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/46-ia-006-3-final-documentation-consistency-verification-cleanup.md`

## 3. Arquivos criados

- `docs/architecture/ADR/ADR-005-commercial-domain.md`
- `docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/47-adr-005-commercial-domain.md` (este relatório)

## 4. Arquivos alterados

- `docs/architecture/ADR/README.md` — apenas inclusão de ADR-005 no
  índice, marcada como *Proposed / Ready for External Audit*. Nenhuma
  entrada anterior removida ou reordenada.

Nenhuma alteração aplicada em `ROADMAP_ARCHITECTURAL.md`: a Fase 4
já cita ADR-006 e Role Reconciliation como pré-requisitos futuros, e
não existe seção dedicada a "pré-requisitos da Fase 4" cuja
substituição integral fosse necessária. Edições cosméticas foram
evitadas por instrução explícita do prompt.

## 5. Confirmação de não implementação funcional

- Nenhuma migration criada.
- Nenhuma tabela criada/alterada.
- Nenhuma RLS policy criada/alterada.
- Nenhum grant criado/alterado.
- Nenhuma SQL function criada/alterada.
- Nenhuma alteração em Storage.
- Nenhuma alteração em Runtime Core.
- Nenhum arquivo `src/` alterado.
- Nenhuma integração com provider (Stripe / Hotmart / Kiwify).
- `canManageTenantBilling` **não** implementada (apenas citada
  como função server-side futura).

## 6. Decisões registradas na ADR

1. Commercial Domain é tenant-scoped.
2. Subscription pertence ao tenant.
3. Membership e subscription são dimensões independentes.
4. Plan é catálogo declarativo — dados, nunca código.
5. Entitlement define capacidade efetiva; enforcement server-side.
6. Client é apenas UX comercial.
7. Autorização administrativa comercial depende de Role
   Reconciliation e de função server-side dedicada futura.
8. Super Admin Commercial Governance é separado de Impersonation.
9. Billing Provider Abstraction será decidida em ADR-006.
10. Estados comerciais conceituais: `trialing`, `active`,
    `past_due`, `suspended`, `canceled`, `internal`, `demo`
    (sem criação de enum).

Invariantes reforçadas: client nunca é autoridade; billing não
substitui membership e vice-versa; `tenant_role` e
`has_role(auth.uid(), 'admin')` **não** são autorização comercial;
`x-tenant-id` é transporte, não autorização.

## 7. Relação com IA-006

ADR-005 consome IA-006 (e IA-006.1/2/3) como base de impacto,
reafirmando ordem de passos §21 e vocabulário exigido antes de
SCP-001. Não altera nem contradiz IA-006.

## 8. Relação com ADR-006

ADR-005 declara ADR-006 — Billing Provider Abstraction como próxima
etapa, sem antecipar suas decisões (interface `BillingProvider`,
webhooks assinados, provider concreto). Stripe / Hotmart / Kiwify
citados apenas como candidatos, sem escolha.

## 9. Roadmap

Não alterado. Numeração de fases preservada:

```
Fase 4 — SaaS Commercial Platform
Fase 5 — Storage Abstraction Layer — Provisória
Fase 6 — Plugin Marketplace Evolution
Fase 7 — Workspace Ingestion System
Fase 8 — Observability Layer
```

## 10. Inspeções executadas

### 10.1 ADR-005 presente
```
$ ls docs/architecture/ADR/ | rg "ADR-005|005|commercial"
ADR-005-commercial-domain.md
```

### 10.2 Ausência de implementação funcional
`rg -n "create table|alter table|create policy|create function|stripe|hotmart|kiwify|webhook|checkout" supabase src` — nenhuma nova ocorrência introduzida por esta etapa. Ocorrências pré-existentes no repositório são anteriores à ADR-005 e não foram tocadas.

### 10.3 Roadmap sem renumeração indevida
```
$ rg -n "^### .*Fase [4-8]" docs/architecture/ROADMAP_ARCHITECTURAL.md
### 🔵 Fase 4 — SaaS Commercial Platform
### 🟡 Fase 5 — Storage Abstraction Layer — Provisória
### 🟡 Fase 6 — Plugin Marketplace Evolution
### 🟡 Fase 7 — Workspace Ingestion System
### 🟡 Fase 8 — Observability Layer
```

### 10.4 Proibição de autorização comercial por admin role
`rg` sobre ADR-005 confirma que `tenant_role` e
`has_role(auth.uid(), 'admin')` aparecem **exclusivamente em
contexto de proibição**, e `canManageTenantBilling` aparece
**apenas como função conceitual futura, não implementada**.

## 11. Testes / typecheck

- `bunx tsx --tsconfig tsconfig.json ./run-tenant-specs.ts` →
  **44 passed, 0 failed**.
- `bunx tsgo --noEmit` → clean.

Baseline preservada. Nenhum arquivo `src/` foi tocado por esta etapa.

## 12. Riscos residuais

- Overgrant histórico `tenant_role = 'admin'` (F3.1) permanece.
  Mitigação: Role Reconciliation obrigatória antes de billing admin.
- ADR-006 e Role Reconciliation ainda não emitidas — SCP-001
  permanece bloqueada.
- Vocabulário comercial ainda não possui contraparte física
  (tabelas/enums) — intencional; será SCP-001.

## 13. Próximos passos

1. Auditoria externa da ADR-005.
2. Após aprovação, emitir **ADR-006 — Billing Provider Abstraction**.
3. Executar **Role Reconciliation / Membership Role Audit**.
4. Só então iniciar **SCP-001 — Commercial Domain Model**.

Não iniciar ADR-006 nem SCP-001 nesta etapa.

## 14. Audit Package

- **Status da implementação:** Documental — ADR-005 emitida como
  *Proposed / Ready for External Audit*.
- **Arquivos inspecionados:** ver §2.
- **Arquivos criados:** `docs/architecture/ADR/ADR-005-commercial-domain.md`, `docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/47-adr-005-commercial-domain.md`.
- **Arquivos alterados:** `docs/architecture/ADR/README.md` (índice).
- **Migrations:** nenhuma.
- **SQL functions:** nenhuma.
- **RLS policies:** nenhuma.
- **Grants:** nenhum.
- **Storage:** intacto.
- **Runtime Core:** intacto.
- **ADR-005 criada:** sim.
- **Roadmap alterado:** não.
- **Testes executados:** 44/44 passed.
- **Typecheck:** clean.
- **Inspeções executadas:** ver §10.
- **Decisões registradas:** ver §6.
- **Riscos residuais:** ver §12.
- **Próximos passos:** ver §13.
- **Confirmação de escopo:**
  - ADR-005 é documental/arquitetural.
  - Nenhuma feature comercial foi implementada.
  - Nenhuma migration foi criada.
  - Nenhuma tabela comercial foi criada.
  - Nenhuma RLS policy foi criada ou alterada.
  - Nenhuma SQL function foi criada ou alterada.
  - Nenhum grant foi alterado.
  - Nenhuma alteração em Storage.
  - Nenhuma alteração em Runtime Core.
  - SCP-001 não foi iniciada.
  - ADR-006 não foi implementada.
  - Role Reconciliation não foi implementada.
  - Stripe/Hotmart/Kiwify não foram integrados.
  - `tenant_role = 'admin'` não virou autorização comercial.
  - `has_role(auth.uid(), 'admin')` não virou autorização comercial.
  - `canManageTenantBilling` não foi implementada.
- **Conclusão:** ADR-005 implementada e pronta para auditoria.
