# 54 — SCP-002 — Billing Provider Abstraction Materialization

## 1. Objetivo

Materializar a fundação persistente interna, provider-agnostic, para a
abstração de billing definida pela ADR-006: catálogo de providers,
mapeamento tenant ↔ provider, ledger de eventos normalizados,
idempotência e trilha de transições. Nenhum billing real, provider real,
webhook, checkout ou autorização administrativa comercial é implementado.

## 2. Identificação da etapa

- **Etapa:** SCP-002 — Billing Provider Abstraction Materialization
- **Fase:** Fase 4 — SaaS Commercial Platform
- **Natureza:** Materialização fundacional provider-agnostic
- **Predecessores aceitos:** IA-006, ADR-005, ADR-006, F4.0, SCP-001

## 3. Arquivos inspecionados

- `docs/architecture/commercial/SCP-001-commercial-domain-model.md`
- `docs/architecture/ROADMAP_ARCHITECTURAL.md`
- `docs/architecture/ADR/ADR-006-billing-provider-abstraction.md`
- `docs/architecture/security/F4-0-role-reconciliation-membership-role-audit.md`
- Schema atual das tabelas `tenants`, `tenant_subscriptions`
- `supabase/migrations/` (últimas 3 migrations)

## 4. Arquivos criados

- `supabase/migrations/20260708225736_e07e7782-191e-4228-a91f-e0c2f7d91252.sql`
- `docs/architecture/commercial/SCP-002-billing-provider-abstraction-materialization.md`
- `docs/delivery/phase-04-saas-commercial-platform/54-scp-002-billing-provider-abstraction-materialization.md`

## 5. Arquivos alterados

- `docs/architecture/commercial/SCP-001-commercial-domain-model.md`
  → status atualizado para `Accepted` (substituição integral).
- `docs/architecture/ROADMAP_ARCHITECTURAL.md`
  → subseção `Gates e sequência inicial da Fase 4` substituída integralmente
  para registrar SCP-001 `Accepted` e SCP-002 como próxima etapa.
- `src/integrations/supabase/types.ts` (regenerado automaticamente pela
  aplicação da migration).

## 6. Ajuste documental SCP-001 Accepted

O bloco `## Status` da SCP-001 continha:

```
## Status
Implemented / Ready for External Audit
```

Foi substituído integralmente por:

```
## Status
Accepted
```

Nenhuma outra seção da SCP-001 foi alterada. Inspeção textual confirmou
ausência de duplicidade de heading `## Status`.

## 7. Roadmap

A subseção `#### Gates e sequência inicial da Fase 4` foi substituída
integralmente. A nova sequência aceita é:

1. IA-006 — Accepted
2. ADR-005 — Accepted
3. ADR-006 — Accepted
4. F4.0 — Accepted
5. SCP-001 — Accepted
6. SCP-002 — próxima etapa

Restrições permanentes registradas: SCP-002 não implementa billing real
completo, billing admin, commercial admin, `canManageTenantBilling`,
provider integration real, adapters de Stripe / Hotmart / Kiwify, webhook
público real, checkout, customer portal ou secrets de provider.

## 8. Migration criada

`supabase/migrations/20260708225736_e07e7782-191e-4228-a91f-e0c2f7d91252.sql`.

Uma única migration cria as 4 tabelas, constraints, índices, triggers
`updated_at`, grants e comentários. RLS é habilitado sem policies.

## 9. Modelo de dados criado

Quatro tabelas provider-agnostic:

- **`billing_provider_definitions`** — catálogo de providers (PK `code`,
  status ∈ {`candidate`,`enabled`,`disabled`,`archived`}, `provider_type`
  ∈ {`external`,`internal`,`manual`}). **Sem seed.**
- **`tenant_billing_provider_mappings`** — mapeamento tenant ↔ provider
  com referências externas opacas (`provider_customer_ref`,
  `provider_subscription_ref`) e FK opcional para `tenant_subscriptions`
  (`ON DELETE SET NULL`). Unicidade `(tenant_id, provider_code)`.
  Índices únicos parciais garantem unicidade das refs externas quando não
  nulas, sem colidir em múltiplos `NULL`.
- **`billing_events`** — ledger passivo com `event_type` restrito aos 8
  eventos normalizados da ADR-006 + `Unknown`, `processing_status` ∈
  {`received`,`verified`,`normalized`,`processed`,`ignored`,`failed`,
  `reconciled`}, chave dupla de idempotência (`(provider_code,
  provider_event_id)` UNIQUE e `idempotency_key` UNIQUE), check
  `processed_at >= received_at`, `payload_sanitized`, `payload_hash`.
- **`billing_event_transitions`** — trilha de mudanças de status com
  checks em `from_status`/`to_status`.

## 10. RLS posture

Consulta a `pg_class`:

| Tabela | rowsecurity | forcerowsecurity |
|---|---|---|
| `billing_provider_definitions` | true | false |
| `tenant_billing_provider_mappings` | true | false |
| `billing_events` | true | false |
| `billing_event_transitions` | true | false |

`FORCE ROW LEVEL SECURITY` **não** foi aplicado, mantendo o padrão da
SCP-001 e do restante do projeto.

## 11. Confirmação de ausência de policies permissivas

Consulta `pg_policies` para as 4 tabelas retornou **0 rows**. Nenhuma
policy foi criada. Nenhuma policy baseada em `tenant_role`, `is_owner` ou
`has_role(auth.uid(),'admin')`. Deny-by-default no plano de RLS.

## 12. Confirmação de ausência de provider/webhook/checkout

- Nenhuma coluna `stripe_*`, `hotmart_*`, `kiwify_*` foi criada.
- Nenhuma rota de webhook, Edge Function, adapter, SDK ou secret de
  provider foi adicionada.
- Nenhum código de checkout, customer portal ou UI comercial foi
  adicionado.
- Nenhuma seleção definitiva de provider foi feita.

## 13. Confirmação de ausência de billing admin/commercial admin

- `billing_admin` não existe.
- `commercial_admin` não existe.
- `canManageTenantBilling` não existe como função server-side, RPC, SQL
  function ou middleware.
- Super Admin permanece operacional, sem autoridade comercial.
- `x-tenant-id` continua sendo transporte, não autoridade.

## 14. Confirmação de ausência de seed/provider definitivo

- `billing_provider_definitions` foi criada vazia. Nenhum `INSERT` foi
  executado.
- Nenhum evento, customer ou subscription foi inserido.
- Stripe, Hotmart e Kiwify permanecem candidatos conforme ADR-006, sem
  escolha definitiva.

## 15. Inspeções executadas

Schema:
- `pg_class` (RLS/FORCE RLS) → conforme §10.
- `pg_policies` → 0 rows nas 4 tabelas (§11).
- `pg_class.relacl` inspecionado nas 4 tabelas → padrão idêntico ao das
  tabelas SCP-001 (`commercial_plans`, `tenant_subscriptions`,
  `tenant_entitlements`): grants padrão Supabase (default privileges)
  presentes para `postgres`, `anon`, `authenticated`, `service_role`. O
  `GRANT ALL ... TO service_role` explícito da migration converge com o
  padrão da SCP-001. Deny-by-default é garantido pela ausência total de
  RLS policies para `anon` e `authenticated`.

Código/texto:
- `rg -n "stripe|hotmart|kiwify|webhook|checkout|customer portal|BillingProvider|NormalizedBillingEvent" src supabase` — ocorrências
  encontradas são pré-existentes (documentação, migrations antigas, ADRs
  anteriores); nenhuma nova implementação funcional foi adicionada por
  SCP-002.
- `rg -n "billing_admin|commercial_admin|canManageTenantBilling"` em
  `src/` e `supabase/` — nenhuma ocorrência funcional; ocorrências
  aparecem apenas em documentação como proibição/conceito futuro.
- `rg -n "stripe_|hotmart_|kiwify_" supabase/migrations src` — nenhuma
  coluna provider-specific criada nesta etapa.
- `rg -n "tenant_members"` na nova migration — 0 ocorrências.
- SCP-001 `## Status` — única ocorrência, valor `Accepted`.
- Roadmap — SCP-001 `Accepted`; SCP-002 registrada como próxima etapa.

## 16. Testes/typecheck

- `bunx tsx --tsconfig tsconfig.json ./run-tenant-specs.ts` →
  **44 passed, 0 failed**.
- `bunx tsgo --noEmit` → clean.

## 17. Riscos residuais

- **Ledger sem consumidor** — mitigado por deny-by-default RLS e ausência
  de policies; nenhum caminho de leitura/escrita para `anon` ou
  `authenticated`.
- **Overgrant histórico em `tenant_members`** — inalterado por SCP-002;
  mitigação segue sendo os Hard Gates RR-G1..RR-G7 da F4.0.
- **PII financeira em payload raw** — apenas `payload_sanitized` é
  documentado como aceitável; ausência de ingestor real reduz risco a
  zero nesta etapa.
- **Escolha futura de provider** — permanece aberta; nenhum lock-in
  introduzido.

## 18. Próximos passos

Submeter SCP-002 para auditoria externa. A próxima etapa NÃO é presumida
automaticamente. Opções a decidir pela auditoria:

- A) SCP-003 — Commercial Read Models / Server-Side Access Planning
- B) SCP-003 — Billing Event Ingestion Design
- C) SCP-003 — Provider Selection Decision
- D) SCP-003 — Webhook Boundary Design

Nenhuma dessas etapas é iniciada aqui.

## 19. Audit Package

- **Status da implementação:** Implementada e pronta para auditoria externa.
- **Identificação da etapa:** SCP-002 — Billing Provider Abstraction Materialization.
- **Arquivos inspecionados:** ver §3.
- **Arquivos criados:** migration SCP-002 + doc arquitetural + este relatório.
- **Arquivos alterados:** SCP-001 (status), Roadmap (subseção Fase 4), types gerado.
- **Migration criada:** `20260708225736_e07e7782-191e-4228-a91f-e0c2f7d91252.sql`.
- **Tabelas criadas:** `billing_provider_definitions`,
  `tenant_billing_provider_mappings`, `billing_events`,
  `billing_event_transitions`.
- **Constraints criadas:** formato de código, enums de status /
  provider_type / event_type / processing_status, unicidades
  `(tenant_id, provider_code)`, `(provider_code, provider_event_id)`,
  `idempotency_key`, check `processed_at >= received_at`, checks nos
  status de transições.
- **Índices criados:** 11 índices (status, tenant, provider, subscription,
  processing_status, event_type, received_at, transitions) + 2 índices
  únicos parciais para refs externas opcionais.
- **RLS habilitado:** sim, nas 4 tabelas.
- **FORCE RLS aplicado:** não (padrão da SCP-001 mantido).
- **Policies criadas:** 0.
- **Grants:** `GRANT ALL ... TO service_role` explícito; ACLs default do
  Supabase para `anon` / `authenticated` presentes (idêntico à SCP-001);
  deny-by-default garantido pela ausência de policies.
- **SQL functions:** nenhuma nova; reuso de `public.tg_set_updated_at()`.
- **Triggers:** 3 triggers `updated_at` (uma por tabela com essa coluna).
- **Storage:** nenhuma alteração.
- **Runtime Core:** nenhuma alteração.
- **SCP-001 status atualizado:** sim → `Accepted`.
- **Roadmap alterado:** sim (§7).
- **Provider integration:** não implementada.
- **Provider escolhido:** nenhum.
- **Provider-specific columns:** nenhuma.
- **Webhooks:** nenhum.
- **Checkout:** nenhum.
- **Customer portal:** nenhum.
- **Billing admin:** não implementado.
- **Commercial admin:** não implementado.
- **canManageTenantBilling:** não implementada.
- **tenant_members alterada:** não.
- **Seed data:** nenhum.
- **Testes executados:** 44 passed, 0 failed.
- **Typecheck:** clean.
- **Inspeções executadas:** ver §15.
- **Riscos residuais:** ver §17.
- **Próximos passos:** ver §18.
- **Confirmação de escopo:**
  - SCP-002 criou apenas materialização fundacional provider-agnostic.
  - SCP-002 não implementou billing real completo.
  - SCP-002 não implementou provider integration real.
  - SCP-002 não implementou adapter real.
  - SCP-002 não implementou `BillingProvider` real em `src/`.
  - SCP-002 não implementou `NormalizedBillingEvent` real em `src/`.
  - SCP-002 não implementou webhooks.
  - SCP-002 não implementou checkout.
  - SCP-002 não implementou customer portal.
  - SCP-002 não integrou Stripe/Hotmart/Kiwify.
  - SCP-002 não escolheu provider definitivo.
  - SCP-002 não criou provider-specific columns.
  - SCP-002 não criou secrets.
  - SCP-002 não criou UI comercial.
  - SCP-002 não criou policies permissivas para usuários finais.
  - SCP-002 não usou `tenant_role` como autorização comercial.
  - SCP-002 não usou `has_role(auth.uid(), 'admin')` como autorização comercial.
  - SCP-002 não implementou `billing_admin`.
  - SCP-002 não implementou `commercial_admin`.
  - SCP-002 não implementou `canManageTenantBilling`.
  - SCP-002 não alterou `tenant_members`.
  - SCP-002 não executou update em dados existentes.
  - SCP-002 não criou seed de providers, eventos, customers ou subscriptions.
  - SCP-003 não foi iniciada.
- **Conclusão:** SCP-002 implementada e pronta para auditoria externa.

## Retificação SCP-002.1

A auditoria externa identificou inconsistências documentais após SCP-002: o documento oficial da SCP-001 permaneceu com dois status (`Implemented / Ready for External Audit` e `Accepted`) e o Roadmap manteve duas linhas da SCP-001 na sequência inicial da Fase 4. A correção final foi realizada em SCP-002.1 e documentada em `docs/delivery/phase-04-saas-commercial-platform/55-scp-002-1-scp-001-status-roadmap-sequence-final-cleanup.md`.
