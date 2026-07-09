# SCP-003 — Commercial Read Models / Server-Side Access Planning

## Status
Implemented / Ready for External Audit

- **Date:** 2026-07-09
- **Phase:** Fase 4 — SaaS Commercial Platform
- **Nature:** Planning and architectural definition of a safe server-side
  read surface for the commercial domain. No real billing, no provider
  integration, no webhooks, no checkout, no adapter, no commercial
  authorization, no RLS changes, no migration.

## Context

IA-006, ADR-005, ADR-006, F4.0, SCP-001 e SCP-002 foram todas aceitas em
auditoria externa. A ordem aprovada autoriza agora o **planejamento** da
superfície server-side segura para leitura comercial, antes de qualquer
função server real, endpoint, webhook ou integração de provider.

## Objective

Definir com precisão:

1. Quais read models comerciais serão necessários no futuro.
2. Onde essas leituras poderão viver (server-only).
3. Quais leituras são explicitamente proibidas no client.
4. Como a fronteira entre RLS deny-by-default e acesso server-only será
   mantida.
5. Quais contratos conceituais de resposta serão usados.
6. Onde ficam os limites entre tenant membership, subscription,
   entitlements e provider events.
7. Quais critérios de segurança devem preceder qualquer endpoint real.
8. Base documental para a futura implementação controlada (SCP-004+).

Nenhum código funcional, RPC, server function comercial, RLS policy ou
migration é criado nesta etapa.

## Scope

Permitido:
- Documentação arquitetural desta SCP-003.
- Relatório cronológico correspondente.
- Atualização de status da SCP-002 para `Accepted`.
- Atualização da subseção de sequência inicial da Fase 4 do Roadmap.
- Inspeções textuais e de schema para evidência de auditoria.

## Out of Scope

- Billing real completo.
- Provider integration real (Stripe / Hotmart / Kiwify).
- Adapter real; `BillingProvider` real em `src/`.
- `NormalizedBillingEvent` real em `src/`.
- Webhook público real, rotas `/webhook`, Edge Function.
- Checkout, customer portal, UI comercial.
- Secrets, API keys, assinatura real, parser real, job de reconciliação,
  chamada externa.
- Server functions comerciais reais, RPC comercial real.
- `billing_admin`, `commercial_admin`, `canManageTenantBilling`.
- Policies permissivas para `anon` ou `authenticated`.
- Policies derivadas de `tenant_role`, `is_owner`,
  `has_role(auth.uid(),'admin')`.
- Alterações em `tenant_members`, updates em dados existentes.
- Seed de providers, eventos, customers, subscriptions.
- Colunas `stripe_*`, `hotmart_*`, `kiwify_*`.
- Escolha definitiva de provider inicial.
- SCP-004.

## Current Commercial Persistence

Tabelas já materializadas por SCP-001 e SCP-002:

**SCP-001 — Commercial Domain Model:**
- `commercial_plans`
- `commercial_entitlement_definitions`
- `commercial_plan_entitlements`
- `tenant_subscriptions`
- `tenant_entitlements`

**SCP-002 — Billing Provider Abstraction Materialization:**
- `billing_provider_definitions`
- `tenant_billing_provider_mappings`
- `billing_events`
- `billing_event_transitions`

Todas permanecem com **RLS habilitado** e **sem policies permissivas
para usuários finais**. Acesso não-service_role é bloqueado por default.

## Server-Side Read Boundary

Toda leitura comercial futura deve ocorrer através de uma camada
server-only controlada. O modelo conceitual aprovado é:

```
client → server-only read function → commercial read model → sanitized response
```

O padrão proibido é:

```
client → direct Supabase read → commercial tables
```

A SCP-003 **não** implementa a função server real. A SCP-003 apenas
define a fronteira e os contratos conceituais que a SCP-004 (se
aprovada) deverá seguir. A função server real deverá:

- Executar em contexto server-only (server function ou server route
  interno) — nunca client-side.
- Usar `service_role` apenas no server; nunca expor a chave.
- Validar `auth.uid()` e membership ativa no tenant antes de retornar.
- Sanitizar todo payload — nenhum campo bruto de provider é exposto.
- Ser idempotente e sem efeito colateral de escrita.
- Estar sujeita a rate-limit e observabilidade.

## Proposed Read Models

### TenantCommercialSummary

Finalidade: resumo comercial seguro do tenant para UI futura.

Campos conceituais permitidos:
- `tenant_id`
- `subscription_status`
- `plan_code`
- `plan_name`
- `current_period_start`
- `current_period_end`
- `trial_ends_at`
- `entitlement_summary`
- `commercial_warnings`

Campos proibidos:
- `provider_customer_ref`
- `provider_subscription_ref`
- `provider_event_id`
- `payload_sanitized`
- `payload_hash`
- Qualquer `error_message` sensível
- Qualquer PII financeira
- Qualquer raw provider data

### TenantEntitlementSnapshot

Finalidade: snapshot server-side das capacidades efetivas do tenant.

Campos conceituais:
- `tenant_id`
- `entitlements: { key, value, source, effective_until }[]`
- `computed_at`

Regras:
- Snapshot é **derivado** de `tenant_entitlements` +
  `commercial_plan_entitlements` do plano ativo.
- Snapshot **não é** autorização administrativa.
- Snapshot **não pode** ser calculado no client.
- Snapshot **não substitui** enforcement server-side em cada mutação
  sensível.

### TenantBillingHealth

Finalidade: estado sanitizado da saúde comercial/billing do tenant para
alertas de UI (banners, avisos, CTA).

Campos conceituais:
- `tenant_id`
- `subscription_status`
- `has_active_subscription`
- `is_past_due`
- `is_suspended`
- `requires_attention`
- `last_safe_event_type` (apenas `event_type` normalizado ADR-006)
- `last_event_received_at`

Proibido expor:
- Provider refs (`provider_customer_ref`, `provider_subscription_ref`).
- Payload raw ou sanitizado.
- Método de pagamento, cartão, CPF/CNPJ, e-mail de cobrança.
- Invoice raw, valores discriminados de cobrança externa.

### CommercialAdminDiagnostic

Finalidade: diagnóstico interno futuro para Super Admin commercial
governance.

Atenção:
- **Não implementar agora.**
- **Não expor agora.**
- **Não** usar impersonação de tenant como autorização.
- **Não** usar `tenant_role` como autorização.
- **Não** usar `has_role(auth.uid(), 'admin')` como autorização.
- Autorização virá de camada dedicada (`billing_admin` /
  `commercial_admin`), a ser projetada em etapa futura.

## Prohibited Access Patterns

São **explicitamente proibidos** por SCP-003:

1. Client ler `tenant_subscriptions` diretamente.
2. Client ler `tenant_entitlements` diretamente.
3. Client ler `billing_events` diretamente.
4. Client ler `tenant_billing_provider_mappings` diretamente.
5. RLS permitir `SELECT` para `authenticated` nessas tabelas nesta
   etapa.
6. RLS baseada em `tenant_role`.
7. RLS baseada em `is_owner`.
8. RLS baseada em `has_role(auth.uid(), 'admin')`.
9. Super Admin impersonation como caminho de leitura comercial global.
10. Provider event payload (mesmo sanitizado) exposto ao client.

Qualquer PR futuro que introduza um desses padrões deve ser rejeitado
pela auditoria.

## RLS Posture

SCP-003 confirma e preserva:
- Tabelas comerciais (SCP-001) continuam deny-by-default.
- Tabelas de billing (SCP-002) continuam deny-by-default.
- 0 policies permissivas nas 9 tabelas.
- Nenhum `SELECT` direto para `anon` ou `authenticated`.
- `service_role` acessível somente por caminhos server-only, e apenas em
  etapas futuras.

**Nenhuma RLS policy é criada por SCP-003.**

## Commercial Authorization Boundary

Reafirmação normativa:

- `tenant_role = 'admin'` **não é** `billing_admin`.
- `tenant_role = 'owner'` **não é** `billing_admin`.
- `is_owner = true` **não é** `billing_admin`.
- `has_role(auth.uid(), 'admin')` **não é** `billing_admin`.
- Super Admin global **não é** tenant `billing_admin`.
- `canManageTenantBilling` **não existe** após SCP-003.

Adicionalmente:

- Leitura comercial futura **não equivale** a autorização administrativa
  comercial.
- Read model **não concede** permissão.
- Read model **não autoriza** mutação.
- Read model **não substitui** enforcement de entitlement em cada
  operação sensível.

## Relationship with SCP-001

SCP-003 planeja como os dados criados pela SCP-001 (`commercial_plans`,
`commercial_entitlement_definitions`, `commercial_plan_entitlements`,
`tenant_subscriptions`, `tenant_entitlements`) poderão ser lidos com
segurança no futuro. Nenhuma alteração de schema é feita.

## Relationship with SCP-002

SCP-003 planeja como os dados de billing criados pela SCP-002
(`billing_provider_definitions`, `tenant_billing_provider_mappings`,
`billing_events`, `billing_event_transitions`) poderão ser expostos —
apenas em forma sanitizada, provider-agnostic e sem payload raw — no
read model `TenantBillingHealth`. Nenhuma alteração de schema é feita.

## Hard Gates

Herdados de F4.0 (**RR-G1..RR-G7**) e SCP-002 (**SCP2-G1..SCP2-G9**),
todos preservados integralmente.

Novos gates específicos da SCP-003:

- **SCP3-G1** — Server-Side Read Boundary Required.
- **SCP3-G2** — No Direct Client Reads From Commercial Tables.
- **SCP3-G3** — No Permissive RLS For End Users.
- **SCP3-G4** — Read Models Are Derived, Not Authoritative.
- **SCP3-G5** — No Commercial Mutation Surface.
- **SCP3-G6** — No Provider Event Processing.
- **SCP3-G7** — No Billing Admin Authorization.
- **SCP3-G8** — Audit Before Endpoint Implementation.

## Invariants

1. Read models são derivados; a autoridade permanece no schema.
2. Nenhum campo bruto de provider vaza para o client.
3. Deny-by-default RLS permanece intacto.
4. Nenhum papel de membership vira, por si só, `billing_admin`.
5. Toda leitura comercial futura passa por camada server-only.
6. Read model nunca autoriza mutação.
7. Enforcement de entitlement é responsabilidade de cada mutação, não do
   read model.

## Risks

- **Vazamento de PII financeira em payloads futuros** — mitigado pelas
  regras de campos proibidos em cada read model e por `SCP2-G6` /
  `SCP3-G2`.
- **Confusão entre read model e autorização** — mitigada por
  reafirmação normativa e pelo gate `SCP3-G4`.
- **Pressão por leitura direta client-side** — mitigada por
  `SCP3-G1..G3`; qualquer PR que abra RLS permissiva deve ser
  rejeitado.
- **Adiamento indefinido de `billing_admin`** — aceito nesta etapa; a
  camada dedicada será proposta em etapa futura sem depender de papéis
  de membership.

## Next Steps

Submeter SCP-003 para auditoria externa. A próxima etapa NÃO é presumida
automaticamente. Opções a decidir pela auditoria:

- A) SCP-004 — Commercial Server Read Functions (recomendada).
- B) SCP-004 — Provider Selection Decision.
- C) SCP-004 — Billing Event Ingestion Design.
- D) SCP-004 — Webhook Boundary Design.

Nenhuma dessas etapas é iniciada aqui.

## References

- Constitution — `docs/architecture/ARCHITECTURE_CONSTITUTION.md`
- Security Architecture — `docs/architecture/security/SECURITY_ARCHITECTURE.md`
- IA-006 — `docs/architecture/impact-analysis/IA-006-saas-commercial-platform.md`
- ADR-005 — `docs/architecture/ADR/ADR-005-commercial-domain.md`
- ADR-006 — `docs/architecture/ADR/ADR-006-billing-provider-abstraction.md`
- F4.0 — `docs/architecture/security/F4-0-role-reconciliation-membership-role-audit.md`
- SCP-001 — `docs/architecture/commercial/SCP-001-commercial-domain-model.md`
- SCP-002 — `docs/architecture/commercial/SCP-002-billing-provider-abstraction-materialization.md`
- Roadmap — `docs/architecture/ROADMAP_ARCHITECTURAL.md`
