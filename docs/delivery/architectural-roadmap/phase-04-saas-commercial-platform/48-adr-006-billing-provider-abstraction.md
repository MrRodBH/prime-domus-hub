# Relatório 48 — ADR-006 Billing Provider Abstraction

**Data:** 2026-07-08
**Etapa:** ADR-006 — Billing Provider Abstraction
**Natureza:** Arquitetural / Documental — sem implementação funcional.

## 1. Objetivo

Emitir a **ADR-006 — Billing Provider Abstraction**, formalizando a
fronteira interna entre o domínio comercial (ADR-005) e provedores
externos de billing (Stripe / Hotmart / Kiwify), cumprindo o item 3
da ordem obrigatória da IA-006 §21 (aprovar IA-006 → ADR-005 →
ADR-006 → Role Reconciliation → SCP-001). Também atualizar o status
da ADR-005 para *Accepted* após aprovação externa.

## 2. Arquivos inspecionados

- `docs/architecture/ADR/README.md`
- `docs/architecture/ADR/ADR-001-ResolutionGraph.md`
- `docs/architecture/ADR/ADR-002-RegistryArchitecture.md`
- `docs/architecture/ADR/ADR-003-PluginArchitecture.md`
- `docs/architecture/ADR/ADR-004-WorkspaceRuntime.md`
- `docs/architecture/ADR/ADR-005-commercial-domain.md`
- `docs/architecture/impact-analysis/IA-006-saas-commercial-platform.md`
- `docs/architecture/ROADMAP_ARCHITECTURAL.md`
- `docs/architecture/ARCHITECTURE_CONSTITUTION.md`
- `docs/architecture/security/SECURITY_ARCHITECTURE.md`
- `docs/delivery/phase-04-saas-commercial-platform/47-adr-005-commercial-domain.md`

## 3. Arquivos criados

- `docs/architecture/ADR/ADR-006-billing-provider-abstraction.md`
- `docs/delivery/phase-04-saas-commercial-platform/48-adr-006-billing-provider-abstraction.md` (este relatório)

## 4. Arquivos alterados

- `docs/architecture/ADR/ADR-005-commercial-domain.md` — substituição
  integral da linha de status: `Proposed / Ready for External Audit`
  → `Accepted`. Nenhum outro campo alterado, nenhuma linha duplicada.
- `docs/architecture/ADR/README.md` — substituição integral da
  entrada da ADR-005 (`Proposed / Ready for External Audit` →
  `Accepted`) e inclusão da ADR-006 como *Proposed / Ready for
  External Audit*. Nenhuma entrada anterior duplicada.

`ROADMAP_ARCHITECTURAL.md` **não** foi alterado: a Fase 4 já cita
ADR-006 e Role Reconciliation como pré-requisitos futuros, e não
existe seção específica listando ADR-006 como pendente cuja
substituição integral fosse necessária.

## 5. Atualização de status da ADR-005

- ADR-005 marcada como **Accepted** por decisão da auditoria externa.
- Substituição feita apenas na linha de status; contexto, decisões,
  invariantes e demais seções preservadas.
- README de ADRs atualizado para refletir *Accepted*.

## 6. Confirmação de não implementação funcional

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
- Nenhum secret criado.
- `BillingProvider` **não** existe em `src/` (apenas ilustrativo
  dentro da ADR).
- `NormalizedBillingEvent` **não** existe em `src/` (apenas
  conceitual dentro da ADR).
- `canManageTenantBilling` **não** implementada.

## 7. Decisões registradas na ADR-006

1. Provider abstraction obrigatória (`BillingProvider` conceitual).
2. Domínio interno não depende diretamente de APIs externas.
3. Eventos externos normalizados em `NormalizedBillingEvent` antes
   de qualquer efeito interno.
4. Webhooks exigem verificação obrigatória de assinatura e janela.
5. Idempotência chaveada por `(provider, provider_event_id)`.
6. Reconciliação com provider como fonte de verdade quando
   necessário.
7. Multi-provider possível arquiteturalmente; não exigido no
   primeiro release.
8. Provider inicial não escolhido nesta ADR; Stripe candidato
   técnico primário, Hotmart/Kiwify sob avaliação.
9. Super Admin commercial operations são server-side auditáveis e
   não são impersonation.
10. Nenhuma autorização comercial deriva de `tenant_role` ou de
    `has_role(auth.uid(), 'admin')`.

## 8. Relação com ADR-005

- ADR-005 define o domínio comercial; ADR-006 define a fronteira de
  provider.
- ADR-006 não altera tenant-scoped subscription, membership,
  `membership_status`, tenant resolution nem Super Admin
  impersonation.
- ADR-006 não cria autorização comercial.
- ADR-006 não contradiz ADR-005 em nenhum ponto.

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

### 10.1 ADR-006 criada
```
$ ls docs/architecture/ADR/ | rg "ADR-006|006|billing"
ADR-006-billing-provider-abstraction.md
```

### 10.2 ADR-005 marcada como Accepted
```
$ rg -n "Status" docs/architecture/ADR/ADR-005-commercial-domain.md
- **Status:** Accepted
$ rg -n "ADR-005" docs/architecture/ADR/README.md
- [ADR-005 — Commercial Domain](../../architecture/ADR/ADR-005-commercial-domain.md) — *Accepted*
```
Nenhuma ocorrência de ADR-005 como `Proposed / Ready for External Audit`.

### 10.3 ADR-006 ainda não Accepted
ADR-006 mantém `Status: Proposed / Ready for External Audit`. README
lista a ADR-006 como *Proposed / Ready for External Audit*. Nenhuma
ocorrência de ADR-006 como Accepted.

### 10.4 Ausência de implementação funcional
```
$ rg -n "BillingProvider|NormalizedBillingEvent" src
(sem resultados)
```
Nenhum novo `create table|create policy|create function|stripe|
hotmart|kiwify|webhook|checkout` foi introduzido em `supabase/` ou
`src/` por esta etapa. Ocorrências pré-existentes (ex.: WhatsApp
FAB, uploads existentes) são anteriores à ADR-006 e não foram
tocadas.

### 10.5 Roadmap sem renumeração indevida
```
$ rg -n "^### .*Fase [4-8]" docs/architecture/ROADMAP_ARCHITECTURAL.md
### 🔵 Fase 4 — SaaS Commercial Platform
### 🟡 Fase 5 — Storage Abstraction Layer — Provisória
### 🟡 Fase 6 — Plugin Marketplace Evolution
### 🟡 Fase 7 — Workspace Ingestion System
### 🟡 Fase 8 — Observability Layer
```

## 11. Testes / typecheck

- `bunx tsx --tsconfig tsconfig.json ./run-tenant-specs.ts` →
  **44 passed, 0 failed**.
- `bunx tsgo --noEmit` → clean.

Baseline preservada. Nenhum arquivo `src/` foi tocado por esta etapa.

## 12. Riscos residuais

- Overgrant histórico `tenant_role = 'admin'` (F3.1) permanece.
  Mitigação: Role Reconciliation obrigatória antes de billing admin.
- Provider inicial ainda não escolhido. Intencional — decisão será
  tomada em etapa de implementação específica, não em ADR.
- Ledger de eventos e adapters ainda não materializados —
  intencional; será SCP-002.
- Sem rota real de webhook até SCP-002; nenhuma superfície pública
  comercial exposta.

## 13. Próximos passos

1. Auditoria externa da ADR-006.
2. Após aprovação, executar **Role Reconciliation / Membership Role
   Audit** — pré-requisito para qualquer autorização administrativa
   comercial, dado o overgrant histórico `tenant_role = 'admin'`
   (F3.1).
3. Só então iniciar **SCP-001 — Commercial Domain Model** e, na
   sequência, **SCP-002 — Billing Provider Abstraction**.

Não iniciar SCP-001, SCP-002, billing real, webhooks reais,
integração de provider ou commercial admin authorization nesta etapa.

## 14. Audit Package

- **Status da implementação:** Documental — ADR-006 emitida como
  *Proposed / Ready for External Audit*; ADR-005 promovida a
  *Accepted*.
- **Arquivos inspecionados:** ver §2.
- **Arquivos criados:** `docs/architecture/ADR/ADR-006-billing-provider-abstraction.md`, `docs/delivery/phase-04-saas-commercial-platform/48-adr-006-billing-provider-abstraction.md`.
- **Arquivos alterados:** `docs/architecture/ADR/ADR-005-commercial-domain.md` (status), `docs/architecture/ADR/README.md` (índice).
- **Migrations:** nenhuma.
- **SQL functions:** nenhuma.
- **RLS policies:** nenhuma.
- **Grants:** nenhum.
- **Storage:** intacto.
- **Runtime Core:** intacto.
- **ADR-005 status atualizado:** sim (Accepted).
- **ADR-006 criada:** sim.
- **ADR-006 status:** Proposed / Ready for External Audit.
- **Roadmap alterado:** não.
- **Testes executados:** 44/44 passed.
- **Typecheck:** clean.
- **Inspeções executadas:** ver §10.
- **Decisões registradas:** ver §7.
- **Riscos residuais:** ver §12.
- **Próximos passos:** ver §13.
- **Confirmação de escopo:**
  - ADR-006 é documental/arquitetural.
  - ADR-005 foi atualizada para Accepted.
  - ADR-006 permanece Proposed / Ready for External Audit.
  - Nenhuma feature comercial foi implementada.
  - Nenhuma migration foi criada.
  - Nenhuma tabela comercial foi criada.
  - Nenhuma RLS policy foi criada ou alterada.
  - Nenhuma SQL function foi criada ou alterada.
  - Nenhum grant foi alterado.
  - Nenhuma alteração em Storage.
  - Nenhuma alteração em Runtime Core.
  - SCP-001 não foi iniciada.
  - SCP-002 não foi iniciada.
  - Role Reconciliation não foi implementada.
  - Stripe/Hotmart/Kiwify não foram integrados.
  - Nenhum webhook real foi criado.
  - Nenhum checkout foi criado.
  - `BillingProvider` não foi implementado em `src/`.
  - `NormalizedBillingEvent` não foi implementado em `src/`.
  - `tenant_role = 'admin'` não virou autorização comercial.
  - `has_role(auth.uid(), 'admin')` não virou autorização comercial.
  - `canManageTenantBilling` não foi implementada.
- **Conclusão:** ADR-006 implementada e pronta para auditoria.

## Retificação ADR-006.1

A auditoria externa identificou duplicidade documental após ADR-006: a ADR-005 permaneceu com duas linhas de status e o README de ADRs manteve duas entradas da ADR-005. A correção final foi realizada em ADR-006.1 e documentada em `docs/delivery/phase-04-saas-commercial-platform/49-adr-006-1-adr-status-deduplication-readme-consistency.md`.
