# 56 — SCP-003 — Commercial Read Models / Server-Side Access Planning

## 1. Objetivo

Definir a fronteira server-side segura para leitura futura do domínio
comercial, catalogar os read models conceituais necessários, listar
padrões proibidos de acesso e preservar o postura deny-by-default de
RLS. Nenhum billing real, provider real, webhook, checkout, autorização
comercial ou migration é implementado.

## 2. Identificação da etapa

- **Etapa:** SCP-003 — Commercial Read Models / Server-Side Access Planning
- **Fase:** Fase 4 — SaaS Commercial Platform
- **Natureza:** Planejamento arquitetural / documental
- **Predecessores aceitos:** IA-006, ADR-005, ADR-006, F4.0, SCP-001, SCP-002

## 3. Arquivos inspecionados

- `docs/architecture/commercial/SCP-002-billing-provider-abstraction-materialization.md`
- `docs/architecture/commercial/SCP-001-commercial-domain-model.md`
- `docs/architecture/ROADMAP_ARCHITECTURAL.md`
- `docs/architecture/ADR/ADR-006-billing-provider-abstraction.md`
- `supabase/migrations/` (últimas 5 migrations)
- `src/` (buscas por provider/webhook/checkout/autorização comercial)

## 4. Arquivos criados

- `docs/architecture/commercial/SCP-003-commercial-read-models-server-side-access-planning.md`
- `docs/fase6/56-scp-003-commercial-read-models-server-side-access-planning.md`

## 5. Arquivos alterados

- `docs/architecture/commercial/SCP-002-billing-provider-abstraction-materialization.md`
  → bloco `## Status` substituído integralmente para `Accepted`.
- `docs/architecture/ROADMAP_ARCHITECTURAL.md`
  → subseção `#### Gates e sequência inicial da Fase 4` substituída
  integralmente para registrar SCP-002 `Accepted` e SCP-003 como
  próxima etapa.

## 6. Ajuste documental SCP-002 Accepted

O bloco anterior:

```
## Status
Implemented / Ready for External Audit
```

foi substituído integralmente por:

```
## Status
Accepted
```

Inspeção textual confirmou heading `## Status` único e ausência de
`Implemented / Ready for External Audit` no arquivo.

## 7. Roadmap

A subseção `#### Gates e sequência inicial da Fase 4` foi substituída
integralmente. Sequência oficial após a substituição:

1. IA-006 — Accepted
2. ADR-005 — Accepted
3. ADR-006 — Accepted
4. F4.0 — Accepted
5. SCP-001 — Accepted
6. SCP-002 — Accepted
7. SCP-003 — próxima etapa

As restrições permanentes foram reescritas em nome da SCP-003
(billing real, billing admin, commercial admin, `canManageTenantBilling`,
provider integration, adapters, webhook público, checkout, customer
portal, secrets de provider, RLS permissiva para usuários finais).

## 8. Confirmação de ausência de migration

`ls supabase/migrations/ | tail -5` retornou as mesmas 5 migrations
pré-existentes (última: `20260708225736_e07e7782-...` da SCP-002).
Nenhuma migration foi criada por SCP-003. Nenhuma tabela, RLS policy,
SQL function, grant, trigger ou Storage bucket foi alterado.

## 9. Read models planejados

- **`TenantCommercialSummary`** — resumo comercial seguro do tenant
  (`subscription_status`, plano, períodos, trial, warnings), sem
  provider refs, sem payload, sem PII.
- **`TenantEntitlementSnapshot`** — snapshot server-side de capacidades
  (`entitlements[]` derivado de plan+overrides), sem autoridade
  administrativa.
- **`TenantBillingHealth`** — saúde comercial sanitizada
  (`has_active_subscription`, `is_past_due`, `is_suspended`,
  `last_safe_event_type`), sem provider refs, sem payload, sem PII.
- **`CommercialAdminDiagnostic`** — planejado para Super Admin
  commercial governance; **não implementado** e sem autorização
  atrelada a `tenant_role`, `is_owner`, `has_role(auth.uid(),'admin')`
  ou impersonação.

## 10. Server-side read boundary

Modelo aprovado:

```
client → server-only read function → commercial read model → sanitized response
```

Padrão proibido:

```
client → direct Supabase read → commercial tables
```

A função server real (SCP-004+) deverá: rodar server-only, validar
`auth.uid()` + membership ativa, sanitizar payload, ser read-only
idempotente, e estar sob rate-limit/observabilidade. SCP-003 não
implementa a função.

## 11. RLS posture

`pg_tables` para as 9 tabelas comerciais/billing:

| Tabela | rowsecurity | forcerowsecurity |
|---|---|---|
| `commercial_plans` | true | false |
| `commercial_entitlement_definitions` | true | false |
| `commercial_plan_entitlements` | true | false |
| `tenant_subscriptions` | true | false |
| `tenant_entitlements` | true | false |
| `billing_provider_definitions` | true | false |
| `tenant_billing_provider_mappings` | true | false |
| `billing_events` | true | false |
| `billing_event_transitions` | true | false |

`pg_policies` para as 9 tabelas: **0 rows**. Deny-by-default preservado.
Nenhuma policy foi criada por SCP-003.

## 12. Prohibited access patterns

Documentados integralmente na §"Prohibited Access Patterns" do documento
oficial: proibição de leitura client-side direta nas 4 tabelas
sensíveis, proibição de RLS permissiva para `authenticated`, proibição
de policies baseadas em `tenant_role` / `is_owner` /
`has_role(auth.uid(),'admin')`, proibição de Super Admin impersonation
como caminho comercial global, proibição de exposição de payload.

## 13. Confirmação de ausência de provider/webhook/checkout

`rg -n "stripe|hotmart|kiwify|webhook|checkout|customer portal|BillingProvider|NormalizedBillingEvent" src supabase`
→ nenhuma implementação nova. Ocorrências pré-existentes são
documentação, migrations antigas ou ADRs anteriores; nenhuma rota,
adapter, SDK ou Edge Function foi adicionada por SCP-003.

## 14. Confirmação de ausência de billing admin/commercial admin

`rg -n "billing_admin|commercial_admin|canManageTenantBilling" src supabase`
→ nenhuma ocorrência funcional em `src/` ou `supabase/`. As ocorrências
existentes aparecem apenas em documentação, sempre como
proibição/conceito futuro. `canManageTenantBilling` não existe como
função server-side, RPC, SQL function ou middleware.

## 15. Inspeções executadas

- SCP-002 `## Status` único, valor `Accepted`; `Implemented / Ready for
  External Audit` ausente.
- Roadmap: SCP-001 `Accepted`, SCP-002 `Accepted`, SCP-003 registrada
  como próxima etapa; nenhuma linha `SCP-002 — ... — próxima etapa`
  remanescente na subseção oficial.
- `ls supabase/migrations/ | tail -5` → mesmas 5 migrations
  pré-SCP-003.
- `rg` por `from('tenant_subscriptions'|'tenant_entitlements'|'billing_events'|'tenant_billing_provider_mappings')`
  em `src` → **0 ocorrências**.
- `rg` por `billing_admin|commercial_admin|canManageTenantBilling` em
  `src`/`supabase` → **0 ocorrências funcionais**.
- `rg` por `stripe|hotmart|kiwify|webhook|checkout|BillingProvider|NormalizedBillingEvent`
  em `src`/`supabase` → sem implementação nova.

## 16. Testes/typecheck

- `bunx tsx --tsconfig tsconfig.json ./run-tenant-specs.ts` →
  **44 passed, 0 failed**.
- `bunx tsgo --noEmit` → clean.

## 17. Riscos residuais

- **Pressão futura por leitura direta client-side** — mitigada por
  `SCP3-G1..G3` e pela ausência total de policies permissivas.
- **Confusão entre read model e autorização comercial** — mitigada por
  `SCP3-G4` e reafirmação normativa em cada read model.
- **Vazamento de PII financeira em payloads futuros** — mitigada por
  campos proibidos explícitos em cada read model e por `SCP2-G6`.
- **Adiamento indefinido de `billing_admin`** — aceito; camada dedicada
  será proposta sem depender de papéis de membership.

## 18. Próximos passos

Submeter SCP-003 para auditoria externa. Opções para SCP-004,
a decidir pela auditoria:

- A) SCP-004 — Commercial Server Read Functions (recomendada).
- B) SCP-004 — Provider Selection Decision.
- C) SCP-004 — Billing Event Ingestion Design.
- D) SCP-004 — Webhook Boundary Design.

SCP-004 **não** foi iniciada.

## 19. Audit Package

- **Status da implementação:** Implementada e pronta para auditoria externa.
- **Identificação da etapa:** SCP-003 — Commercial Read Models / Server-Side Access Planning.
- **Arquivos inspecionados:** ver §3.
- **Arquivos criados:** documento arquitetural SCP-003 + este relatório.
- **Arquivos alterados:** SCP-002 (status → Accepted), Roadmap (subseção Fase 4).
- **Migration criada:** nenhuma.
- **Tabelas criadas:** nenhuma.
- **RLS policies criadas:** nenhuma.
- **SQL functions criadas:** nenhuma.
- **Grants alterados:** nenhum.
- **Storage:** nenhuma alteração.
- **Runtime Core:** nenhuma alteração.
- **SCP-002 status atualizado:** sim → `Accepted`.
- **Roadmap alterado:** sim (§7).
- **Read models planejados:** `TenantCommercialSummary`,
  `TenantEntitlementSnapshot`, `TenantBillingHealth`,
  `CommercialAdminDiagnostic` (não implementado).
- **Server-side boundary definida:** sim (§10).
- **Provider integration:** não implementada.
- **Webhooks:** nenhum.
- **Checkout:** nenhum.
- **Customer portal:** nenhum.
- **Billing admin:** não implementado.
- **Commercial admin:** não implementado.
- **canManageTenantBilling:** não implementada.
- **Direct client reads:** 0 (verificado por `rg`).
- **`tenant_members` alterada:** não.
- **Seed data:** nenhum.
- **Testes executados:** 44 passed, 0 failed.
- **Typecheck:** clean.
- **Inspeções executadas:** ver §15.
- **Riscos residuais:** ver §17.
- **Próximos passos:** ver §18.
- **Confirmação de escopo:**
  - SCP-003 criou apenas planejamento de read models e fronteira server-side.
  - SCP-003 não criou migration.
  - SCP-003 não criou tabelas.
  - SCP-003 não criou RLS policies.
  - SCP-003 não criou SQL functions.
  - SCP-003 não alterou grants.
  - SCP-003 não implementou provider integration real.
  - SCP-003 não implementou adapter real.
  - SCP-003 não implementou `BillingProvider` real em `src/`.
  - SCP-003 não implementou `NormalizedBillingEvent` real em `src/`.
  - SCP-003 não implementou webhooks.
  - SCP-003 não implementou checkout.
  - SCP-003 não implementou customer portal.
  - SCP-003 não integrou Stripe/Hotmart/Kiwify.
  - SCP-003 não escolheu provider definitivo.
  - SCP-003 não criou UI comercial.
  - SCP-003 não criou policies permissivas para usuários finais.
  - SCP-003 não implementou `billing_admin`.
  - SCP-003 não implementou `commercial_admin`.
  - SCP-003 não implementou `canManageTenantBilling`.
  - SCP-003 não criou leitura direta client-side das tabelas comerciais/billing.
  - SCP-003 não alterou `tenant_members`.
  - SCP-003 não executou update em dados existentes.
  - SCP-004 não foi iniciada.
- **Conclusão:** SCP-003 implementada e pronta para auditoria externa.

## Retificação SCP-003.1

A auditoria externa identificou inconsistências documentais após SCP-003: o documento oficial da SCP-002 permaneceu com dois status (`Implemented / Ready for External Audit` e `Accepted`) e o Roadmap manteve duas linhas da SCP-002 na sequência inicial da Fase 4. A correção final foi realizada em SCP-003.1 e documentada em `docs/fase6/57-scp-003-1-scp-002-status-roadmap-sequence-final-cleanup.md`.
