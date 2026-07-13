# Relatório 49 — ADR-006.1 ADR Status Deduplication & README Consistency Patch

**Data:** 2026-07-08
**Etapa:** ADR-006.1 — ADR Status Deduplication & README Consistency Patch
**Natureza:** Documental corretiva — sem implementação funcional.

## 1. Objetivo

Corrigir definitivamente as duplicidades documentais apontadas pela
auditoria externa após ADR-006:

- `docs/architecture/ADR/ADR-005-commercial-domain.md` estava com duas
  linhas de status (`Proposed / Ready for External Audit` + `Accepted`).
- `docs/architecture/ADR/README.md` estava com duas entradas da ADR-005.

Consolidar ADR-005 como *Accepted* em ambos os arquivos, preservando
ADR-006 como *Proposed / Ready for External Audit*.

## 2. Arquivos alterados

- `docs/delivery/phase-04-saas-commercial-platform/48-adr-006-billing-provider-abstraction.md` — adicionada
  nota "Retificação ADR-006.1" ao final. Histórico preservado.

Nota: `docs/architecture/ADR/ADR-005-commercial-domain.md` e
`docs/architecture/ADR/README.md` foram inspecionados nesta etapa e já
apresentavam o estado final consolidado exigido (uma única linha de
status `Accepted` na ADR-005; uma única entrada por ADR no README).
Nenhuma linha adicional precisou ser removida — as inspeções §6
comprovam a ausência de duplicidade. Nenhuma edição adicional foi
necessária para atingir o estado final consolidado exigido pela
ADR-006.1.

## 3. Arquivos criados

- `docs/delivery/phase-04-saas-commercial-platform/49-adr-006-1-adr-status-deduplication-readme-consistency.md`
  (este relatório).

## 4. Confirmação de não implementação funcional

- Nenhuma migration criada.
- Nenhuma tabela criada/alterada.
- Nenhuma RLS policy criada/alterada.
- Nenhum grant criado/alterado.
- Nenhuma SQL function criada/alterada.
- Nenhuma alteração em Storage.
- Nenhuma alteração em Runtime Core.
- Nenhum arquivo `src/` alterado.
- Nenhum arquivo em `supabase/` alterado.
- Nenhuma Edge Function criada.
- Nenhuma rota de webhook criada.
- Nenhuma integração com Stripe / Hotmart / Kiwify.
- SCP-001 / SCP-002 não iniciadas.
- Role Reconciliation não implementada.
- `canManageTenantBilling` não implementada.

## 5. Conteúdo final consolidado — ADR-005 status

```
- **Status:** Accepted
```

Única linha `Status` na ADR-005. Nenhuma ocorrência de
`Proposed / Ready for External Audit`.

## 6. Conteúdo final consolidado — README ADR-005 / ADR-006

```
- [ADR-005 — Commercial Domain](./ADR-005-commercial-domain.md) — *Accepted*
- [ADR-006 — Billing Provider Abstraction](./ADR-006-billing-provider-abstraction.md) — *Proposed / Ready for External Audit*
```

Uma entrada por ADR. ADR-005 *Accepted*. ADR-006 preservada como
*Proposed / Ready for External Audit*.

## 7. Confirmação — ADR-006 permanece Proposed

ADR-006 mantém `## Status\nProposed / Ready for External Audit`.
Nenhuma marcação como *Accepted*.

## 8. Inspeções obrigatórias

### 8.1 ADR-005 com status único
```
$ rg -n "Status|Proposed / Ready for External Audit|Accepted" \
    docs/architecture/ADR/ADR-005-commercial-domain.md
3:- **Status:** Accepted
88:| **Commercial Status** | Estado comercial conceitual do tenant. |
92:| Status | Significado |
```
Única linha `- **Status:** ...` é `Accepted`. As demais ocorrências
de "Status" são cabeçalhos de tabela conceitual (vocabulário
comercial), não status da ADR. Nenhuma ocorrência de
`Proposed / Ready for External Audit`.

### 8.2 README com ADR-005 e ADR-006 sem duplicidade
```
$ rg -n "ADR-005|ADR-006|Proposed / Ready for External Audit|Accepted" \
    docs/architecture/ADR/README.md
30:2. **Status** — `Proposed | Accepted | Superseded by ADR-XXX`
46:- [ADR-005 — Commercial Domain](./ADR-005-commercial-domain.md) — *Accepted*
47:- [ADR-006 — Billing Provider Abstraction](./ADR-006-billing-provider-abstraction.md) — *Proposed / Ready for External Audit*
```
Uma entrada por ADR. Linha 30 é definição do formato ADR, não índice.

### 8.3 ADR-006 ainda não Accepted
```
$ rg -n "Status|Accepted|Proposed / Ready for External Audit" \
    docs/architecture/ADR/ADR-006-billing-provider-abstraction.md
3:## Status
4:Proposed / Ready for External Audit
```
ADR-006 permanece *Proposed / Ready for External Audit*. Nenhuma
marcação como Accepted.

## 9. Testes / typecheck

- `bunx tsx --tsconfig tsconfig.json ./run-tenant-specs.ts` →
  **44 passed, 0 failed**.
- `bunx tsgo --noEmit` → clean.

## 10. Riscos residuais

- Overgrant histórico `tenant_role = 'admin'` (F3.1) permanece.
  Mitigação: Role Reconciliation obrigatória antes de billing admin.
- Provider inicial ainda não escolhido. Intencional.
- Ledger de eventos e adapters ainda não materializados. Intencional.

## 11. Audit Package

- **Status da implementação:** Documental corretiva concluída.
- **Arquivos alterados:** `docs/delivery/phase-04-saas-commercial-platform/48-adr-006-billing-provider-abstraction.md` (nota de retificação).
- **Arquivos criados:** `docs/delivery/phase-04-saas-commercial-platform/49-adr-006-1-adr-status-deduplication-readme-consistency.md`.
- **Migrations:** nenhuma.
- **SQL functions:** nenhuma.
- **RLS policies:** nenhuma.
- **Grants:** nenhum.
- **Storage:** intacto.
- **Runtime Core:** intacto.
- **ADR-005 status único:** sim (`Accepted`).
- **README ADR-005 sem duplicidade:** sim.
- **README ADR-006 sem duplicidade:** sim.
- **ADR-006 status preservado:** sim (`Proposed / Ready for External Audit`).
- **Relatório 48 retificado:** sim.
- **Testes executados:** 44/44 passed.
- **Typecheck:** clean.
- **Confirmação de escopo:**
  - ADR-005 contém apenas `Status: Accepted`.
  - ADR-005 não contém `Proposed / Ready for External Audit`.
  - README contém apenas uma entrada da ADR-005.
  - README contém apenas uma entrada da ADR-006.
  - ADR-006 permanece `Proposed / Ready for External Audit`.
  - ADR-006 não foi marcada como Accepted.
  - Nenhuma feature comercial foi implementada.
  - Nenhuma migration foi criada.
  - Nenhuma RLS policy foi criada ou alterada.
  - Nenhuma SQL function foi criada ou alterada.
  - Nenhum grant foi alterado.
  - Nenhuma alteração em Storage.
  - Nenhuma alteração em Runtime Core.
  - SCP-001 não foi iniciada.
  - SCP-002 não foi iniciada.
  - Role Reconciliation não foi implementada.
- **Conclusão:** ADR-006.1 implementada e pronta para auditoria.
