# SCP-002 — Billing Provider Abstraction Materialization

## Status
Accepted

- **Date:** 2026-07-08
- **Phase:** Fase 4 — SaaS Commercial Platform
- **Nature:** Foundational, provider-agnostic persistence for provider
  mapping, billing event ledger, idempotency and normalized events.
  No real billing, no provider integration, no webhooks, no checkout,
  no adapter, no commercial authorization.

## Context

IA-006, ADR-005, ADR-006, F4.0 e SCP-001 foram todas aceitas em
auditoria externa. A ordem aprovada autoriza a **materialização
fundacional interna** da abstração de billing provider definida
pela ADR-006 — sem qualquer integração real, sem webhook público,
sem checkout e sem autorização administrativa comercial.

## Objective

Materializar as estruturas persistentes internas para:

1. Catálogo interno de providers (provider-agnostic).
2. Mapeamento tenant ↔ provider.
3. Mapeamento subscription interna ↔ referência externa opaca.
4. Ledger de eventos de billing normalizados.
5. Idempotência por `(provider_code, provider_event_id)`.
6. Enumeração conceitual dos eventos normalizados da ADR-006.
7. Status de processamento com transições auditáveis.
8. Rastreabilidade sem PII financeira sensível.
9. RLS deny-by-default em todas as tabelas.
10. Documentação arquitetural.

Nenhum processamento, adapter, secret, checkout, webhook, Edge
Function ou SDK é criado por esta etapa.

## Scope

Permitido:
- Migration única `scp002_billing_provider_abstraction_materialization`.
- Tabelas: `billing_provider_definitions`,
  `tenant_billing_provider_mappings`, `billing_events`,
  `billing_event_transitions`.
- Constraints de formato, status, cardinalidade, unicidade e checks
  temporais.
- Índices essenciais e índices únicos parciais para referências
  externas opcionais.
- Comentários SQL em cada tabela.
- RLS habilitado, sem policies permissivas.
- Grants apenas para `service_role` (padrão SCP-001).
- Triggers `updated_at` reaproveitando `public.tg_set_updated_at()`.
- Atualização de SCP-001 para `Accepted`.
- Atualização de Roadmap para registrar SCP-002 como próxima etapa.

## Out of Scope

- Billing real completo.
- Provider integration real (Stripe / Hotmart / Kiwify).
- Adapter real; `BillingProvider` real em `src/`.
- `NormalizedBillingEvent` real em `src/`.
- Webhook público real, rotas `/webhook`, Edge Function.
- Checkout, customer portal, UI comercial.
- Secrets, API keys, assinatura real, parser real, job de
  reconciliação real, chamada externa.
- Server functions comerciais, RPC comercial.
- `billing_admin`, `commercial_admin`, `canManageTenantBilling`.
- Policies permissivas para `anon` ou `authenticated`.
- Policies derivadas de `tenant_role`, `is_owner`,
  `has_role(auth.uid(),'admin')`.
- Alterações em `tenant_members`, updates em dados existentes.
- Seed de providers, eventos, customers, subscriptions.
- Colunas `stripe_*`, `hotmart_*`, `kiwify_*`.
- Escolha definitiva de provider inicial.
- SCP-003.

## Data Model

### `billing_provider_definitions`
Catálogo provider-agnostic. Chave primária `code` (regex
`^[a-z][a-z0-9_]*$`). `status` ∈ {`candidate`, `enabled`,
`disabled`, `archived`}. `provider_type` ∈ {`external`,
`internal`, `manual`}. Nenhum seed é criado.

### `tenant_billing_provider_mappings`
Mapeamento tenant ↔ provider. FKs: `tenant_id` → `tenants`
(cascade), `provider_code` → `billing_provider_definitions`
(restrict), `subscription_id` → `tenant_subscriptions`
(`ON DELETE SET NULL`). `status` ∈ {`draft`, `linked`, `disabled`,
`archived`}. Referências externas opacas (`provider_customer_ref`,
`provider_subscription_ref`) sem qualquer coluna provider-specific.
Unicidade por `(tenant_id, provider_code)`. Unicidade das
referências externas garantida por índices únicos parciais que
permitem múltiplos `NULL` sem colisão.

### `billing_events`
Ledger passivo, provider-agnostic. `event_type` restrito aos oito
eventos normalizados da ADR-006 (`CheckoutCompleted`,
`SubscriptionCreated`, `SubscriptionUpdated`, `SubscriptionCanceled`,
`InvoicePaid`, `InvoicePaymentFailed`, `TrialEnding`,
`ChargeRefunded`) mais `Unknown`. `processing_status` ∈ {`received`,
`verified`, `normalized`, `processed`, `ignored`, `failed`,
`reconciled`}. Unicidade por `(provider_code, provider_event_id)` e
por `idempotency_key`. `payload_sanitized` armazena apenas payload
sanitizado; `payload_hash` fica reservado para rastreabilidade
futura. Check `processed_at >= received_at`. Nenhum processamento,
parser ou trigger de negócio é criado nesta etapa. O writer futuro
computa `idempotency_key` como `provider_code + ':' + provider_event_id`.

### `billing_event_transitions`
Trilha auditável de transições de `processing_status`. Sem
`updated_at`, sem automação, sem trigger.

## Provider-Agnostic Boundary

- Nenhuma coluna `stripe_*`, `hotmart_*`, `kiwify_*`.
- Referências externas são opacas (`text`) e não impõem provider.
- `billing_provider_definitions.code` é livre e não recebe seed.
- Nenhum SDK, secret ou Edge Function é criado.
- A escolha definitiva de provider inicial é adiada.

## Event Ledger and Idempotency

- Chave de idempotência canônica: `(provider_code, provider_event_id)`.
- Coluna adicional `idempotency_key` UNIQUE, provider-agnostic.
- Evento duplicado deve ser no-op na camada futura de ingestão.
- Transições de status são registradas em `billing_event_transitions`
  quando a camada futura estiver aprovada.
- Nenhum handler, worker ou webhook é criado agora.

## RLS Posture

RLS habilitado nas 4 tabelas, **sem policies permissivas**. Nenhum
acesso é concedido a `anon` ou `authenticated`. Grants apenas para
`service_role`. `FORCE ROW LEVEL SECURITY` não é aplicado, mantendo
o padrão da SCP-001 e do restante do projeto.

## Commercial Authorization Boundary

- `tenant_role = 'admin'` **não** é `billing_admin`.
- `tenant_role = 'owner'` **não** é `billing_admin`.
- `is_owner = true` **não** é `billing_admin`.
- `has_role(auth.uid(),'admin')` **não** é `billing_admin`.
- Super Admin global **não** é tenant `billing_admin`.
- `canManageTenantBilling` **não existe** após SCP-002.
- `x-tenant-id` continua sendo transporte, não autoridade.

## Relationship with ADR-006

SCP-002 materializa exclusivamente a fundação persistente descrita
pela ADR-006. Não cria `BillingProvider`, `NormalizedBillingEvent`
reais, webhook, checkout ou provider concreto. O schema é
provider-agnostic e passivo.

## Relationship with SCP-001

SCP-002 estende a fundação criada pela SCP-001 (`commercial_plans`,
`commercial_entitlement_definitions`, `commercial_plan_entitlements`,
`tenant_subscriptions`, `tenant_entitlements`) sem alterá-las.
`tenant_billing_provider_mappings` e `billing_events` referenciam
`tenant_subscriptions` via FK `ON DELETE SET NULL` para preservar
histórico.

## Hard Gates

Herdados de F4.0 (**RR-G1..RR-G7**) e específicos da SCP-002:

- **SCP2-G1** — No Real Provider Integration.
- **SCP2-G2** — No Public Webhook Endpoint.
- **SCP2-G3** — No Checkout or Customer Portal.
- **SCP2-G4** — Provider-Agnostic Persistence Only.
- **SCP2-G5** — Idempotency Before Processing.
- **SCP2-G6** — Sanitized Event Payload Only.
- **SCP2-G7** — No Provider-Specific Columns.
- **SCP2-G8** — No Commercial Admin Authorization.
- **SCP2-G9** — Deny-by-Default RLS.

## Invariants

1. Provider é dado, não código.
2. Referência externa é opaca.
3. Idempotência precede processamento.
4. Payload persistido é sanitizado.
5. Ledger é passivo até etapa dedicada.
6. Deny-by-default até acesso ser projetado.
7. Nenhum papel de membership vira, por si só, `billing_admin`.

## Risks

- **Ledger sem consumidor** — mitigado por deny-by-default e
  ausência total de policies.
- **Confusão entre catálogo (`billing_provider_definitions`) e
  mapping (`tenant_billing_provider_mappings`)** — mitigada por
  nomes, comentários e FKs explícitas.
- **Overgrant histórico em `tenant_members`** — inalterado por
  SCP-002; mitigação segue sendo os Hard Gates RR-G1..RR-G7.
- **PII financeira em payload raw** — mitigada por regra normativa
  de sanitização e por não haver, hoje, ingestor real.

## Next Steps

Submeter SCP-002 para auditoria externa. Após aprovação, a próxima
etapa NÃO é presumida automaticamente como integração real. As
opções, a decidir pela auditoria, são:

- A) SCP-003 — Commercial Read Models / Server-Side Access Planning.
- B) SCP-003 — Billing Event Ingestion Design.
- C) SCP-003 — Provider Selection Decision.
- D) SCP-003 — Webhook Boundary Design.

Nenhuma dessas etapas é iniciada aqui.

## Declarations

- SCP-002 materializa apenas estruturas internas passivas.
- SCP-002 não implementa billing real completo.
- SCP-002 não implementa provider integration.
- SCP-002 não implementa adapter real.
- SCP-002 não implementa webhook público real.
- SCP-002 não implementa checkout.
- SCP-002 não implementa customer portal.
- SCP-002 não cria secrets de provider.
- SCP-002 não escolhe provider definitivo.
- SCP-002 não implementa `billing_admin`.
- SCP-002 não implementa `commercial_admin`.
- SCP-002 não implementa `canManageTenantBilling`.
- SCP-002 não cria policies permissivas para usuários finais.
- SCP-002 não altera `tenant_members`.

## References

- Constitution — `docs/architecture/ARCHITECTURE_CONSTITUTION.md`
- Security Architecture — `docs/architecture/security/SECURITY_ARCHITECTURE.md`
- IA-006 — `docs/architecture/impact-analysis/IA-006-saas-commercial-platform.md`
- ADR-005 — `docs/architecture/ADR/ADR-005-commercial-domain.md`
- ADR-006 — `docs/architecture/ADR/ADR-006-billing-provider-abstraction.md`
- F4.0 — `docs/architecture/security/F4-0-role-reconciliation-membership-role-audit.md`
- SCP-001 — `docs/architecture/commercial/SCP-001-commercial-domain-model.md`
- Roadmap — `docs/architecture/ROADMAP_ARCHITECTURAL.md`
