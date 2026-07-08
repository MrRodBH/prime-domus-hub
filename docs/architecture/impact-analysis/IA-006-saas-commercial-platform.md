# IA-006 — SaaS Commercial Platform Impact Analysis

> **Status:** `DRAFT / READY FOR EXTERNAL AUDIT`
> **Tipo:** Impact Analysis (arquitetural, documental, analítica)
> **Escopo:** Análise de impacto da macrofase **SaaS Commercial Platform**
> **Implementation Status:** `BLOCKED` — nenhuma implementação funcional autorizada por esta IA.
> **Pré-requisito:** Fase 3 — Membership Evolution Model, formalmente encerrada após F3.7.

---

## 1. Contexto

A plataforma RM Prime SaaS concluiu a **Fase 3 — Membership Evolution
Model** (F3.1 → F3.7), estabelecendo:

- Resolução autoritativa server-side de tenant (`requireTenant`,
  `resolveTenantContext`).
- Header `x-tenant-id` como **transporte**, jamais como autoridade.
- Cardinalidade explícita (0 / 1 / N) sobre memberships `active`, sem
  `ORDER BY`, `LIMIT 1`, fallback, tenant default ou heurística.
- Isolamento Super Admin: sem impersonação, sem acesso tenant-scoped.
- Domínio tipado de `membership_status` e `tenant_role`
  (`membership-types.ts`, `membership-validation.ts`).
- UX de Tenant Switcher (F3.5/F3.5.1) e gate determinístico.

O próximo eixo estratégico é a **SaaS Commercial Platform**: planos,
assinaturas, billing, trial, inadimplência, entitlements e integrações
com provedores de pagamento (Stripe, Hotmart, Kiwify). Esta IA-006
define o **impacto arquitetural** dessa evolução — **sem implementar**
qualquer feature comercial.

## 2. Objetivo

Produzir a análise de impacto formal que:

1. Descreva como planos, assinaturas e billing devem se integrar ao
   modelo multi-tenant já estabilizado.
2. Preserve integralmente os invariantes de segurança das Fases 2 e 3.
3. Proponha modelo de dados, subetapas, hard gates e riscos.
4. Habilite auditoria externa antes de qualquer implementação.

## 3. Escopo

Inclui:

- Análise da relação `tenant × subscription × plan × entitlement`.
- Estados comerciais do tenant.
- Estrutura de planos e entitlements.
- Comparativo arquitetural de provedores.
- Camada futura de abstração de billing.
- Webhooks e idempotência.
- Impacto em RLS, segurança, Super Admin e membership.
- Modelo de dados futuro (proposta, não migração).
- Decomposição em subetapas SCP-001 … SCP-010.
- Hard Gates futuros propostos.
- Riscos.

## 4. Fora de Escopo

Explícita e permanentemente fora desta IA:

- Criação de tabelas, migrations, RLS policies, grants, SQL functions.
- Integração real com Stripe / Hotmart / Kiwify.
- Edge Functions ou webhooks funcionais.
- UI de planos, checkout, painel comercial Super Admin.
- Feature flags comerciais em runtime.
- Alterações em `tenant-middleware`, `tenant-attacher`,
  `get_current_tenant_id`, `tenant_members`.
- Uso de `tenant_role` como autorização comercial.
- Qualquer bypass de tenancy motivado por status comercial.
- Storage Abstraction Layer (Fase 4 — permanece independente).

## 5. Estado Atual Pós-Fase 3

- **Multi-tenancy:** ADR-001..004 + IA-001..004 estabilizados.
- **Server-side authority:** `resolveTenantContext` é fonte única de
  verdade para tenant ativo.
- **RLS:** RESTRICTIVE por tenant, sem bypass para Super Admin fora de
  impersonação explícita.
- **Storage:** M3 concluída operacionalmente; universo físico legado ∅.
- **Membership domain:** `MEMBERSHIP_STATUSES` e `TENANT_ROLES` tipados;
  `active` é o único status operacional.
- **Backlog conhecido:** `tenant_role = 'admin'` overgrant histórico
  (Role Reconciliation pendente); Metadata Rewrite Batch; Upload
  Provenance Token; Media Picker Return Contract Normalization.

## 6. Relação Tenant × Assinatura

**Recomendação arquitetural:** assinatura comercial é **tenant-scoped**,
não user-scoped.

Justificativa:

- Um tenant representa uma organização/imobiliária; billing pertence à
  organização, não ao operador individual.
- Membership é o vínculo user↔tenant; assinatura é o contrato
  organização↔plataforma. São dimensões ortogonais.
- Evita que o cancelamento de um usuário derrube o acesso comercial de
  toda a organização.

Regras propostas:

| Pergunta | Decisão proposta |
|---|---|
| Assinatura pertence a quem? | Tenant. |
| Nº de assinaturas ativas por tenant? | Exatamente **uma** ativa (`active`, `trialing`, `past_due`). |
| Trial | Estado de assinatura (`trialing`) com deadline server-side. |
| Cancelamento | Estado `canceled`; acesso comercial revogado no fim do ciclo. |
| Inadimplência | Estado `past_due` com grace period explícito. |
| Tenants internos/demo | Estado dedicado (`internal` / `demo`), imune a billing enforcement. |
| Super Admin cria tenant sem assinatura? | Sim, com estado inicial `internal` ou `trialing` sob decisão explícita. |
| Assinatura afeta login? | **Não.** Login sempre disponível; enforcement é sobre uso de recursos. |

**Invariante:** *assinatura ativa não substitui membership ativa e
vice-versa*.

## 7. Estados Comerciais do Tenant

Domínio proposto (não implementar):

| Estado | Semântica | Enforcement |
|---|---|---|
| `trialing` | Trial vigente | Uso completo, com deadline. |
| `active` | Assinatura paga | Uso completo. |
| `past_due` | Falha de pagamento em grace | Aviso + eventual soft-limit. |
| `suspended` | Grace expirado | Bloqueio de recursos pagos; leitura mínima. |
| `canceled` | Cancelado | Read-only ou bloqueio total conforme política. |
| `internal` | Tenant interno RM Prime | Sem enforcement comercial. |
| `demo` | Tenant demo | Limites reduzidos, sem billing. |

Decisão em aberto para o momento de implementação:

- **Fonte de verdade:** derivar de `tenant_subscriptions` (recomendado)
  ou materializar em `tenants.commercial_status`. A recomendação é
  **derivar**, mantendo `tenants` sem coluna comercial e evitando
  divergência entre snapshot e realidade.

## 8. Planos Comerciais

Estrutura conceitual proposta:

- `free` (opcional; possivelmente ausente para SaaS B2B)
- `starter`
- `professional`
- `business`
- `enterprise` (contrato custom, possivelmente não self-serve)

Dimensões que os planos devem parametrizar:

- Seats (`max_users`)
- Imóveis (`max_properties`)
- Leads (`max_leads`)
- Sites (`max_sites`)
- Blog posts (`max_blog_posts`)
- Storage (`max_storage_mb`)
- Mensagens IA/mês (`max_ai_messages_month`)
- Automações (`max_automations`)
- Integrações de portal (booleano por portal)
- Domínio próprio (`can_use_custom_domain`)
- White label (`can_use_white_label`)
- Relatórios avançados (`can_use_advanced_reports`)
- Nível de suporte (`support_tier`)

**Regra:** planos são **dados**, não código. Nenhuma decisão comercial
pode viver em `if plan === 'business'` no runtime.

## 9. Entitlements

Entitlement = capacidade comercial concreta consultada pelo servidor.

Exemplos:

- Booleanos: `can_use_ai`, `can_publish_site`, `can_use_custom_domain`,
  `can_use_portal_integrations`.
- Numéricos (quotas): `max_users`, `max_properties`, `max_leads`,
  `max_storage_mb`, `max_ai_messages_month`.

Estratégia recomendada:

1. **Definição:** entitlements são derivados do plano (`plan_features`).
2. **Materialização:** projetados em `tenant_entitlements` para permitir
   overrides pontuais (ex.: cortesia, negociação enterprise).
3. **Consulta:** função server-side determinística
   `getTenantEntitlements(tenantId)` (proposta futura) com cache curto.
4. **Enforcement:** exclusivamente server-side, nas server functions /
   server routes que executam a ação.
5. **UI:** client pode esconder/desabilitar controles baseado em
   entitlements expostos, mas **nunca** decide acesso real.

**Hard rule:** *client pode esconder UI; servidor decide entitlement*.

## 10. Billing Providers — Comparativo Arquitetural

| Aspecto | Stripe | Hotmart | Kiwify |
|---|---|---|---|
| Recorrência | Nativa, robusta | Suporta assinaturas | Suporta assinaturas |
| Webhooks | Assinados (HMAC), maduros | Assinados, maduros | Assinados |
| Checkout | Hospedado + custom | Hospedado | Hospedado |
| Gestão de assinatura self-serve | Portal do cliente nativo | Limitado | Limitado |
| NF-e / tributação BR | Requer integração externa | Emite NF automaticamente (BR) | Emite NF automaticamente (BR) |
| Ajuste fino de planos/pró-rata | Excelente | Restrito | Restrito |
| Lock-in | Baixo (API portável) | Alto (marketplace) | Médio |
| Adequação B2B SaaS | Alta | Baixa (foco infoproduto) | Baixa/Média |
| Operação BR | Requer setup formal | Nativa | Nativa |

**Leitura arquitetural:** Stripe é o provider natural para B2B SaaS
recorrente; Hotmart/Kiwify agregam operação fiscal BR e canais de venda,
mas trazem lock-in e são desenhados para infoproduto. **Não** fixar
provider único nesta IA — a decisão final depende de dados comerciais
que ainda não estão em escopo. **Recomendação arquitetural:** projetar
para pluralidade via abstração (§11).

## 11. Payment Provider Abstraction

Propor camada futura `BillingProvider` para:

- Normalizar eventos de webhook em um domínio interno estável
  (`SubscriptionCreated`, `SubscriptionUpdated`, `InvoicePaid`, etc.).
- Normalizar estados (`active`, `trialing`, `past_due`, `canceled`).
- Encapsular chamadas ao provider (criar checkout, portal, cancelar).
- Permitir múltiplos providers coexistindo (Stripe para internacional,
  Hotmart/Kiwify para funis BR específicos).
- Evitar `if (provider === 'stripe')` espalhado no domínio.

Interface conceitual (não implementar):

```
interface BillingProvider {
  createCheckoutSession(input): Promise<CheckoutSession>
  createCustomerPortalSession(input): Promise<PortalSession>
  cancelSubscription(input): Promise<void>
  verifyWebhookSignature(request): WebhookVerification
  parseWebhookEvent(request): NormalizedBillingEvent
}
```

## 12. Webhooks e Idempotência

Eventos futuros mínimos:

`checkout.completed`, `subscription.created`, `subscription.updated`,
`subscription.canceled`, `invoice.paid`, `invoice.payment_failed`,
`charge.refunded`, `trial.ending`.

Requisitos arquiteturais:

- **Verificação de assinatura** obrigatória (HMAC provider-específico).
- **Idempotência:** tabela `billing_events` com chave
  `(provider, provider_event_id)` UNIQUE. Reprocessamento é no-op.
- **Ordering:** eventos podem chegar fora de ordem; estado da assinatura
  é reconciliado a partir do provider (fonte de verdade externa) quando
  o evento indicar divergência.
- **Replay protection:** rejeitar eventos com timestamp fora de janela
  aceitável.
- **Retry:** provider retry natural; nossa camada apenas confirma 2xx
  após persistir o evento.
- **Rota:** `src/routes/api/public/billing/webhook/<provider>.ts`
  seguindo padrão `api/public/*` (bypass de auth + verificação
  server-side no handler).
- **Auditoria:** log estruturado por evento; nenhum PII em log.

## 13. Impacto em RLS e Segurança

> **Correção IA-006.1:** as políticas abaixo são **conceituais** e
> **não** autorizam o uso direto de `has_role(auth.uid(), 'admin')` nem
> de `tenant_role = 'admin'` como autorização comercial. Toda leitura/
> gestão administrativa de billing deve depender de uma **função
> server-side dedicada futura**, por exemplo
> `canManageTenantBilling(userId, tenantId)`, que só poderá existir
> após: (i) **Role Reconciliation / Membership Role Audit**,
> (ii) definição explícita de papel comercial dedicado (ex.
> `billing_admin` / `commercial_admin`), (iii) ADR de Commercial
> Authorization, (iv) testes de bypass e (v) validação server-side.

**A IA-006 não autoriza usar `tenant_role = 'admin'` nem
`has_role(auth.uid(), 'admin')` como autorização comercial real.
Qualquer autorização administrativa de billing depende de Role
Reconciliation e de uma função server-side dedicada futura.**

| Tabela proposta | Escopo | RLS proposta (conceitual) |
|---|---|---|
| `plans` | Global (catálogo) | `SELECT` público autenticado; escrita apenas service_role. |
| `plan_features` | Global | Idem. |
| `tenant_subscriptions` | Tenant-scoped | `SELECT` restrito via função server-side dedicada futura (`canManageTenantBilling`) dentro do tenant ativo (via `get_current_tenant_id()`); escrita apenas service_role (webhooks) e Super Admin. |
| `tenant_entitlements` | Tenant-scoped | `SELECT` para membros ativos do tenant; escrita apenas service_role. |
| `billing_customers` | Tenant-scoped | Leitura restrita via `canManageTenantBilling`; escrita service_role. |
| `billing_events` | Global admin-only | Sem leitura tenant; escrita service_role. |
| `billing_invoices` | Tenant-scoped | Leitura via `canManageTenantBilling`; escrita service_role. |
| `billing_provider_accounts` | Global | Sem leitura tenant; admin-only via função dedicada. |

**Invariantes preservados:**

- RLS **não** é relaxada para billing.
- Nenhuma tabela comercial libera acesso a dados de negócio de outro
  tenant.
- Webhook usa `service_role` **exclusivamente** dentro de rota
  verificada; nunca exposto no client.
- Nenhuma decisão comercial concede tenant-scope: assinatura ativa não
  implica membership.
- `tenant_role` **não** é autorização comercial.
- `has_role(auth.uid(), 'admin')` **não** é recomendação direta para
  billing.

## 14. Impacto em Super Admin

- Console comercial Super Admin é **separado** da tenant impersonation:
  listar tenants, ver planos, alterar plano manualmente, marcar
  tenant como `internal`/`demo`, suspender/reativar, ver webhooks,
  auditoria.
- Rotas administrativas comerciais **não** setam `x-tenant-id`; operam
  contra endpoints global-admin dedicados (`/super/billing/*`).
- Impersonação continua sendo o único caminho para Super Admin acessar
  recursos tenant-scoped de produto.

**Hard rule:** *Super Admin commercial management ≠ tenant
impersonation*.

## 15. Impacto em Membership

Matriz obrigatória:

| membership_status | subscription_status | Efeito |
|---|---|---|
| `active` | `active` / `trialing` | Uso completo dentro dos entitlements. |
| `active` | `past_due` | Aviso; recursos pagos podem entrar em soft-limit. |
| `active` | `suspended` / `canceled` | Recursos pagos bloqueados; leitura mínima. |
| `invited` / `suspended` / `revoked` | qualquer | Sem operação tenant-scoped (independente do billing). |
| `active` | `internal` / `demo` | Uso conforme política interna. |

**Regras não negociáveis:**

- Membership ativa **não** substitui assinatura ativa.
- Assinatura ativa **não** substitui membership ativa.
- `tenant_role` **não** vira `billing_admin` sem **Role Reconciliation**
  prévia (backlog Fase 3).

## 16. Modelo de Dados Futuro Proposto

> **Proposta conceitual. Nenhuma migration é criada nesta IA.**

### 16.1 `plans` (global)
- **Responsabilidade:** catálogo de planos comerciais.
- **Escopo:** global.
- **Campos principais:** `id`, `code` (unique), `name`, `description`,
  `billing_cycle` (`monthly` / `yearly`), `price_cents`, `currency`,
  `is_public`, `is_active`, timestamps.
- **RLS:** leitura pública autenticada; escrita service_role.
- **Sensibilidade:** baixa.
- **Riscos:** desatualização entre catálogo interno e configuração no
  provider.

### 16.2 `plan_features` (global)
- **Responsabilidade:** capacidades e quotas por plano.
- **Escopo:** global.
- **Campos:** `plan_id` (FK), `feature_key`, `value_bool`,
  `value_number`, `value_text`.
- **RLS:** leitura pública autenticada; escrita service_role.

### 16.3 `tenant_subscriptions` (tenant-scoped)
- **Responsabilidade:** assinatura vigente do tenant.
- **Escopo:** tenant-scoped.
- **Campos:** `id`, `tenant_id` (FK), `plan_id` (FK), `status`
  (`trialing|active|past_due|suspended|canceled|internal|demo`),
  `provider`, `provider_subscription_id`, `current_period_start`,
  `current_period_end`, `trial_ends_at`, `cancel_at`, `canceled_at`,
  timestamps.
- **RLS:** leitura para admin do tenant ativo; escrita service_role.
- **Riscos:** múltiplas assinaturas ativas por tenant → UNIQUE parcial
  em `(tenant_id) WHERE status IN ('active','trialing','past_due')`.

### 16.4 `tenant_entitlements` (tenant-scoped)
- **Responsabilidade:** materialização/override de entitlements por
  tenant.
- **Campos:** `tenant_id`, `feature_key`, `value_bool`, `value_number`,
  `value_text`, `source` (`plan` / `override`), `expires_at`.
- **RLS:** leitura para membros ativos do tenant; escrita service_role.

### 16.5 `billing_customers` (tenant-scoped)
- **Responsabilidade:** vincular tenant a `customer_id` do provider.
- **Campos:** `tenant_id`, `provider`, `provider_customer_id`, `email`.
- **RLS:** restrita; escrita service_role.

### 16.6 `billing_events` (global admin-only)
- **Responsabilidade:** ledger de eventos recebidos via webhook.
- **Campos:** `id`, `provider`, `provider_event_id` (UNIQUE por
  provider), `event_type`, `payload_json`, `received_at`,
  `processed_at`, `status`, `error`.
- **RLS:** sem leitura tenant; admin-only.
- **Riscos:** contém payload provider (potencial PII financeiro) —
  aplicar retenção e sanitização.

### 16.7 `billing_invoices` (tenant-scoped)
- **Responsabilidade:** faturas / cobranças.
- **Campos:** `tenant_id`, `provider`, `provider_invoice_id`,
  `amount_cents`, `currency`, `status`, `issued_at`, `paid_at`,
  `hosted_invoice_url`.
- **RLS:** leitura para admin do tenant; escrita service_role.

### 16.8 `billing_provider_accounts` (global)
- **Responsabilidade:** configuração de contas provider (Stripe
  account, Hotmart producer, Kiwify seller) — chaves de API vivem em
  Secrets, **não** aqui.
- **RLS:** admin-only.

## 17. Subetapas Futuras Propostas

Todas em status **PROPOSED** (nenhuma iniciada).

| Código | Subetapa | Descrição |
|---|---|---|
| SCP-001 | Commercial Domain Model | Formalizar tipos, enums e vocabulário comercial (sem SQL). |
| SCP-002 | Billing Provider Abstraction | Definir interface `BillingProvider` e contratos de eventos normalizados. |
| SCP-003 | Plans & Entitlements Foundation | Criar `plans`, `plan_features`, seeds; RLS de catálogo. |
| SCP-004 | Tenant Subscription State | Criar `tenant_subscriptions`, invariantes de unicidade e transições. |
| SCP-005 | Webhook Intake & Idempotency | Rotas `api/public/billing/webhook/*`, ledger `billing_events`, verificação de assinatura. |
| SCP-006 | Server-Side Entitlement Enforcement | `getTenantEntitlements`, middleware/guardas nas server functions afetadas. |
| SCP-007 | Super Admin Commercial Console | UI e endpoints admin, isolados de impersonação. |
| SCP-008 | Tenant Billing UX | UI in-tenant: plano vigente, portal do cliente, faturas. |
| SCP-009 | Trial & Suspension Flows | Deadlines, transições, notificações, grace period. |
| SCP-010 | SaaS Commercial Platform Closing Review | Auditoria final análoga à F3.7. |

## 18. Hard Gates Futuros Propostos

- **SCP-G1 — Commercial State Server Authority.** Estado comercial é
  resolvido exclusivamente server-side.
- **SCP-G2 — Billing Provider Webhook Verification.** Todo webhook exige
  verificação de assinatura antes de qualquer efeito.
- **SCP-G3 — Webhook Idempotency.** `(provider, provider_event_id)`
  UNIQUE; reprocessamento é no-op.
- **SCP-G4 — Tenant-Scoped Subscription Isolation.** Tabelas
  tenant-scoped são governadas por RLS e por `get_current_tenant_id()`.
- **SCP-G5 — Entitlement Server Enforcement.** Toda gate de recurso
  pago é aplicada em server function/route, nunca no client.
- **SCP-G6 — No Client-Side Commercial Authority.** Client pode
  esconder UI; nunca decide acesso real.
- **SCP-G7 — Super Admin Commercial Governance Separation.** Console
  comercial não usa `x-tenant-id`; impersonação continua exclusiva de
  produto.
- **SCP-G8 — No Membership/Billing Bypass.** Nenhuma direção
  (`membership → billing` ou `billing → membership`) concede acesso à
  outra.
- **SCP-G9 — Role Reconciliation Before Billing Admin.** Nenhum
  `tenant_role` herdado é promovido a `billing_admin` sem reconciliação
  formal.

## 19. Riscos

1. **Billing como bypass de tenant** — assinatura ativa liberar acesso
   sem membership. Mitigado por SCP-G8.
2. **Membership como bypass comercial** — membership ativa acessar
   recurso pago sem assinatura. Mitigado por SCP-G5/G8.
3. **Webhook forjado** — mitigado por SCP-G2.
4. **Webhook duplicado / fora de ordem** — mitigado por SCP-G3 e
   reconciliação com provider.
5. **Cross-tenant billing leak** — mitigado por SCP-G4 + RLS
   restritiva.
6. **Overgrant por `tenant_role`** — mitigado por SCP-G9 + Role
   Reconciliation.
7. **Super Admin confundido com impersonation** — mitigado por SCP-G7.
8. **Client-side entitlement manipulation** — mitigado por SCP-G5/G6.
9. **PII financeiro em `billing_events`** — mitigado por retenção,
   sanitização e RLS admin-only.
10. **Lock-in de provider** — mitigado por SCP-G/abstração (SCP-002).

## 20. Decisão Recomendada

Aprovar a IA-006 como **base arquitetural oficial** para a macrofase
SaaS Commercial Platform, com:

- Assinatura **tenant-scoped**.
- Estado comercial derivado de `tenant_subscriptions`.
- Entitlements materializados com overrides.
- Enforcement 100% server-side.
- Multi-provider via `BillingProvider` (Stripe como candidato primário
  para B2B recorrente; Hotmart/Kiwify sob avaliação para funis BR).
- Webhooks em `api/public/billing/webhook/*` com verificação e
  idempotência.
- Console Super Admin comercial separado da impersonação.
- Hard Gates SCP-G1..G9 institucionalizados no início da SCP-001.

## 21. Critérios para Iniciar Implementação

Antes de qualquer commit funcional da macrofase:

1. Auditoria externa aprovar esta IA-006.
2. Executar **Role Reconciliation** (pré-requisito para SCP-007/G9).
3. Emitir ADR-005 (Commercial Domain) e ADR-006 (Billing Provider
   Abstraction) antes de SCP-001/SCP-002.
4. Confirmar preservação integral dos invariantes de Fase 2/3.
5. Registrar Secrets necessárias (nunca hardcoded, nunca no client).

---

**Autoridade:** este documento é a única fonte oficial de análise de
impacto arquitetural da SaaS Commercial Platform até que ADRs
específicos sejam emitidos.
