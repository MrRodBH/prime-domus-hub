# ADR-006 — Billing Provider Abstraction

## Status
Accepted

- **Date:** 2026-07-08

## Context

A ADR-005 — Commercial Domain foi aprovada em auditoria externa,
formalizando o vocabulário e as fronteiras conceituais do domínio
comercial (tenant-scoped subscription, membership × subscription
independentes, plans como dados, entitlements como capacidade
efetiva, enforcement server-side).

A IA-006 — SaaS Commercial Platform Impact Analysis (com correções
IA-006.1/2/3) definiu a Fase 4 — SaaS Commercial Platform como
próxima macrofase, e a §21 estabeleceu ordem obrigatória: aprovar
IA-006 → emitir ADR-005 → emitir ADR-006 → executar Role
Reconciliation → iniciar SCP-001.

Antes de qualquer implementação funcional (SCP-001 — Commercial
Domain Model, SCP-002 — Billing Provider Abstraction) é obrigatório
estabelecer a **fronteira de integração** com provedores de billing.
Sem essa fronteira, o domínio comercial interno passaria a depender
diretamente de APIs externas (Stripe, Hotmart, Kiwify), criando
lock-in, dispersão de lógica provider-specific pelo domínio, e
acoplamento entre eventos externos e estado interno.

Esta ADR trata **exclusivamente** da abstração de provider em nível
conceitual. Não introduz interface TypeScript real, adapter, rota de
webhook, integração com Stripe/Hotmart/Kiwify, tabelas, migrations,
RLS ou SQL functions.

## Decision

1. Billing provider integration deve ocorrer via **abstração
   interna** (conceito: `BillingProvider`), não por acoplamento
   direto ao provider.
2. O domínio comercial interno **não** deve depender diretamente de
   APIs externas.
3. Eventos externos devem ser **normalizados** para
   `NormalizedBillingEvent` antes de afetar estado interno.
4. Webhooks exigem **verificação obrigatória** de assinatura e
   janela temporal antes de qualquer efeito.
5. Eventos de billing devem ser **idempotentes**, chaveados por
   `(provider, provider_event_id)`.
6. Divergências entre estado interno e provider devem ser
   **reconciliadas** com o provider como fonte de verdade quando
   necessário.
7. **Multi-provider** deve ser possível arquiteturalmente, sem
   exigir múltiplos providers no primeiro release.
8. Provider inicial **não** é escolhido definitivamente nesta ADR.
   Stripe permanece candidato técnico primário para B2B SaaS
   recorrente; Hotmart e Kiwify permanecem candidatos
   comerciais/fiscais sob avaliação. A decisão final ocorre em
   etapa de implementação específica.
9. **Super Admin commercial operations** são server-side auditáveis
   e **não** são impersonation; não usam `x-tenant-id` como
   autorização, apenas como transporte quando aplicável.
10. Nenhuma autorização comercial deriva de `tenant_role` ou de
    `has_role(auth.uid(), 'admin')`. Autorização administrativa
    comercial depende de Role Reconciliation e da função
    server-side dedicada futura (conceito:
    `canManageTenantBilling(userId, tenantId)`), **não**
    implementada aqui.

## Consequences

**Positivas**
- Reduz lock-in a um provider específico.
- Melhora testabilidade (adapter substituível por fake em testes).
- Preserva o domínio interno das idiossincrasias de cada API
  externa.
- Facilita suporte futuro a múltiplos providers (Stripe / Hotmart /
  Kiwify) sem reescrever o domínio.
- Evita `if (provider === "stripe")` disperso na camada de negócio.
- Enforcement server-side preservado por design.

**Trade-offs / Negativas**
- Aumenta complexidade inicial: exige camada de normalização.
- Exige ledger conceitual de eventos e mecanismo de idempotência
  (materialização física futura em SCP-002).
- Exige testes de assinatura, replay, ordering e reconciliação.
- Pode atrasar uma integração rápida com provider único, em troca
  de fronteira sã.

**Neutras**
- Eventos normalizados listados são conceituais; mapeamento físico
  (enums, tabela `billing_events`) ocorre em SCP-002, não aqui.

## Provider Boundary

Fluxo conceitual (nenhuma implementação nesta ADR):

```
Provider externo (Stripe / Hotmart / Kiwify)
  → Webhook HTTP raw (assinado)
    → BillingProvider adapter
        · verifyWebhookSignature(request)
        · parseWebhookEvent(request)
    → NormalizedBillingEvent
      → Idempotency check (provider, provider_event_id)
        → Commercial domain (subscription / entitlement / status interno)
          → Reconciliação com provider quando necessário
```

Interface conceitual (apenas ilustrativa, **não** criar em `src/`):

```ts
interface BillingProvider {
  createCheckoutSession(input): Promise<CheckoutSession>;
  createCustomerPortalSession(input): Promise<CustomerPortalSession>;
  cancelSubscription(input): Promise<void>;
  verifyWebhookSignature(request): WebhookVerification;
  parseWebhookEvent(request): NormalizedBillingEvent;
}
```

Este trecho existe **exclusivamente** dentro desta ADR. Nenhum
arquivo TypeScript, adapter, rota de webhook, secret, SDK ou
implementação é criado por esta decisão.

## Normalized Billing Events

Eventos internos normalizados mínimos (conceituais):

| Evento normalizado | Origem possível | Efeito conceitual | Observações |
|---|---|---|---|
| `CheckoutCompleted` | Stripe checkout.session.completed / Hotmart PURCHASE_APPROVED / Kiwify order_approved | Marca intenção de compra concluída; pode disparar provisionamento inicial. | Não substitui `SubscriptionCreated`. |
| `SubscriptionCreated` | Stripe customer.subscription.created / equivalentes | Cria assinatura tenant-scoped no domínio interno. | Deve linkar `tenant_id` internamente. |
| `SubscriptionUpdated` | Stripe customer.subscription.updated / equivalentes | Atualiza plano, ciclo, quantidade ou estado. | Aciona recomputação de entitlements. |
| `SubscriptionCanceled` | Stripe customer.subscription.deleted / equivalentes | Marca assinatura como `canceled` no domínio interno. | Não apaga membership. |
| `InvoicePaid` | Stripe invoice.paid / equivalentes | Marca ciclo como pago; libera/renova entitlements. | Base para `active`. |
| `InvoicePaymentFailed` | Stripe invoice.payment_failed / equivalentes | Marca ciclo como `past_due`. | Inicia grace period conforme política futura. |
| `TrialEnding` | Stripe customer.subscription.trial_will_end / equivalentes | Sinaliza fim iminente de trial. | Base para notificações. |
| `ChargeRefunded` | Stripe charge.refunded / equivalentes | Registra refund/estorno. | Pode acionar suspensão conforme política. |

Todo evento externo deve ser **convertido** para um destes eventos
normalizados antes de qualquer efeito no domínio comercial interno.

## Webhook Verification

Regras normativas (**hard rules**):

- Webhook **sem** assinatura válida deve ser rejeitado (HTTP 401).
- Webhook com timestamp fora da janela aceitável deve ser rejeitado.
- Payload **não** verificado nunca produz efeito no domínio.
- Segredo de webhook **nunca** reside no client.
- `service_role` **nunca** é exposto ao client; uso restrito a
  ambiente server-side controlado.
- PII financeiro (nome, e-mail, últimos dígitos de cartão, valores
  detalhados) **não** deve ser logado sem sanitização.
- Verificação e parsing são responsabilidade do adapter
  `BillingProvider`, **não** do domínio comercial.
- Nenhuma rota de webhook é criada por esta ADR.

## Idempotency

Regras normativas:

- Toda ingestão de evento externo é chaveada por
  `(provider, provider_event_id)`.
- Esta chave é conceitualmente **UNIQUE**.
- Evento duplicado é **no-op** (não reprocessa efeito de domínio).
- Estados conceituais de um evento: `processed`, `failed`,
  `ignored`.
- Reprocessamento deve ser **seguro** e **auditável**.
- Eventos fora de ordem devem ser tratados por reconciliação, não
  por reprocessamento cego.
- Um ledger conceitual futuro (`billing_events`) materializará
  essas regras em SCP-002. **Nenhuma tabela é criada nesta ADR.**

## Provider Reconciliation

Webhooks **não** são a única fonte de verdade definitiva. Deve
existir estratégia de reconciliação com o provider para tratar:

- evento perdido (webhook não entregue);
- evento fora de ordem (update antes de create);
- evento duplicado (idempotência garante no-op);
- divergência entre estado interno e provider;
- cancelamento posterior à criação;
- chargeback / refund após pagamento;
- troca de plano (upgrade / downgrade);
- renovação de assinatura entre ciclos.

Fluxo conceitual:

```
webhook event → normalização → idempotência → atualização interna
  → reconciliação com provider quando necessário
```

Reconciliação pode ocorrer sob demanda (ex.: consulta manual do
Super Admin) ou por job periódico. **Nenhum job é implementado por
esta ADR.**

## Multi-Provider Strategy

A arquitetura **deve permitir** múltiplos providers, mas **não
exige** múltiplos providers no primeiro release.

Candidatos considerados:

| Provider | Perfil | Observações |
|---|---|---|
| **Stripe** | B2B SaaS recorrente global | Melhor DX para assinaturas recorrentes, webhooks bem documentados, customer portal maduro; tributação brasileira exige integração fiscal adicional. |
| **Hotmart** | Marketplace BR / infoproduto | Forte no Brasil, emissão fiscal integrada, webhooks distintos, modelo mais orientado a produto único do que a assinatura B2B multi-seat. |
| **Kiwify** | Marketplace BR | Similar a Hotmart em perfil fiscal/checkout; webhooks próprios, integração fiscal simplificada. |

Formulação vinculante:

> Stripe permanece candidato técnico primário para B2B SaaS
> recorrente; Hotmart e Kiwify permanecem candidatos
> comerciais/fiscais sob avaliação. A decisão final de provider
> inicial deve ocorrer em etapa de implementação específica, não
> nesta ADR.

## Relationship with ADR-005

- ADR-005 define o **domínio comercial** (tenant-scoped
  subscription, membership × subscription independentes, plans como
  dados, entitlements server-side).
- ADR-006 define a **fronteira de integração com providers**.
- ADR-006 **não** altera tenant-scoped subscription.
- ADR-006 **não** altera membership nem `membership_status`.
- ADR-006 **não** cria autorização comercial. Autorização
  administrativa comercial permanece dependente de Role
  Reconciliation e da função server-side dedicada futura.
- ADR-006 **não** contradiz ADR-005 em nenhum ponto.

## Out of Scope

Explicitamente fora do escopo desta ADR:

- migrations, tables (incluindo `billing_events` real,
  `tenant_subscriptions`, `billing_customers`), columns, RLS
  policies, SQL functions, grants;
- rota real de webhook (`/api/public/webhooks/*`);
- Stripe SDK, Hotmart integration, Kiwify integration;
- checkout, customer portal, UI comercial;
- provider secrets, payload parser real, verificador real de
  assinatura;
- Edge Function;
- SCP-001 — Commercial Domain Model;
- SCP-002 — Billing Provider Abstraction (materialização);
- Role Reconciliation / Membership Role Audit;
- implementação de `canManageTenantBilling`;
- escolha definitiva de provider inicial;
- alteração em tenant resolution, Super Admin impersonation,
  Storage ou Runtime Core.

## Risks

- **Lock-in silencioso:** mitigado por adapter obrigatório e por
  proibição de referências provider-specific no domínio interno.
- **Bypass via webhook malicioso:** mitigado por verificação
  obrigatória de assinatura, janela temporal e idempotência.
- **Reprocessamento indevido:** mitigado por chave
  `(provider, provider_event_id)` UNIQUE conceitual.
- **Divergência prolongada com o provider:** mitigada por
  reconciliação server-side sob demanda e por job periódico futuro.
- **Overgrant histórico `tenant_role = 'admin'` (F3.1):** permanece
  risco documentado; ADR-006 reforça que **nenhuma** autorização
  comercial deriva de `tenant_role` ou `has_role(auth.uid(),
  'admin')`. Mitigação: Role Reconciliation antes de billing admin.
- **Vazamento de PII financeiro em logs:** mitigado por regra
  explícita de sanitização.

## Implementation Preconditions

Antes de iniciar SCP-001 e SCP-002 é obrigatório, em ordem:

1. Aprovar ADR-006 (esta ADR) em auditoria externa.
2. Executar **Role Reconciliation / Membership Role Audit** antes
   de qualquer autorização administrativa comercial.
3. Definir escopo de **SCP-001 — Commercial Domain Model**.
4. Definir escopo de **SCP-002 — Billing Provider Abstraction**
   (materialização da fronteira definida aqui).
5. Preservar invariantes de Fase 2, Fase 3, IA-006 e ADR-005.

Esta ordem é coerente com IA-006 §21 e ADR-005, e não a altera.

## References

- Constitution — `docs/architecture/ARCHITECTURE_CONSTITUTION.md`
- Security Architecture — `docs/architecture/security/SECURITY_ARCHITECTURE.md`
- IA-006 — `docs/architecture/impact-analysis/IA-006-saas-commercial-platform.md`
- IA-006.1 — `docs/fase6/44-ia-006-1-roadmap-phase-numbering-rls-correction.md`
- IA-006.2 — `docs/fase6/45-ia-006-2-documentation-deduplication-consistency-patch.md`
- IA-006.3 — `docs/fase6/46-ia-006-3-final-documentation-consistency-verification-cleanup.md`
- ADR-005 — `docs/architecture/ADR/ADR-005-commercial-domain.md`
- Roadmap — `docs/architecture/ROADMAP_ARCHITECTURAL.md`
