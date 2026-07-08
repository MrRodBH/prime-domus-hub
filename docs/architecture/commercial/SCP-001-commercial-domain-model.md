# SCP-001 — Commercial Domain Model

## Status
Accepted

- **Date:** 2026-07-08
- **Phase:** Fase 4 — SaaS Commercial Platform
- **Nature:** Foundational persistent modeling. No billing, no provider, no
  webhooks, no checkout, no commercial authorization, no enforcement.

## Context

IA-006, ADR-005 (Commercial Domain), ADR-006 (Billing Provider
Abstraction) e F4.0 (Role Reconciliation / Membership Role Audit)
foram todas aceitas em auditoria externa. A ordem aprovada
autoriza, como próxima etapa, a **modelagem persistente fundacional
do domínio comercial** — sem qualquer implementação funcional
comercial, sem billing real e sem autorização administrativa
comercial.

## Objective

Materializar o vocabulário comercial da ADR-005 em um schema
persistente mínimo e deny-by-default, apto a receber, em etapas
futuras separadamente aprovadas, catálogos, integrações e
enforcement — sem, por si só, alterar o comportamento funcional
do produto.

## Scope

Permitido nesta etapa:
- Criar migration única (`scp001_commercial_domain_model`).
- Criar tabelas: `commercial_plans`, `commercial_entitlement_definitions`,
  `commercial_plan_entitlements`, `tenant_subscriptions`,
  `tenant_entitlements`.
- Criar constraints (formato, status, cardinalidade, períodos,
  não-negatividade, mutual exclusion de tipos de valor).
- Criar índices essenciais.
- Criar índice único parcial garantindo no máximo uma assinatura
  corrente por tenant.
- Habilitar RLS em todas as 5 tabelas.
- Conceder GRANT apenas a `service_role` (deny-by-default para
  `anon` e `authenticated`).
- Reutilizar `public.tg_set_updated_at()` para triggers `updated_at`.
- Criar `COMMENT ON TABLE` em cada tabela.
- Criar documentação arquitetural e relatório cronológico.
- Atualizar F4.0 para `Accepted` e Roadmap para registrar a
  sequência inicial da Fase 4.

## Out of Scope

Proibido nesta etapa:
- Billing real, cobrança, provider integration.
- `BillingProvider`, `NormalizedBillingEvent` reais.
- Webhooks, checkout, customer portal.
- Stripe, Hotmart, Kiwify (SDK, adapters, Edge Functions).
- UI comercial, server functions comerciais, RPC comercial.
- Autorização administrativa comercial: `billing_admin`,
  `commercial_admin`, `canManageTenantBilling` — não existem
  funcionalmente após SCP-001.
- Policies permissivas para `anon` ou `authenticated`.
- Policies derivadas de `tenant_role`, `is_owner`, `has_role(auth.uid(),'admin')`.
- Alterações em `tenant_members`.
- Updates em dados existentes.
- Seed de planos, entitlements ou assinaturas.
- SCP-002.

## Data Model

### `commercial_plans`
Catálogo global de planos comerciais. Metadados apenas — nenhum
campo específico de provider. Colunas de negócio: `code` (regex
`^[a-z][a-z0-9_]*$`, único), `name`, `description`, `status`
(`draft` | `active` | `archived`), `sort_order`, `metadata` (jsonb).

### `commercial_entitlement_definitions`
Catálogo global das capacidades comerciais possíveis. `key` (PK,
regex `^[a-z][a-z0-9_]*$`), `name`, `description`, `value_type`
(`boolean` | `integer` | `decimal` | `text`), `unit`, `is_active`,
`metadata`. Não enforça acesso.

### `commercial_plan_entitlements`
Mapeamento plano × entitlement. FKs: `plan_id` → `commercial_plans`
(cascade), `entitlement_key` → `commercial_entitlement_definitions`
(restrict). Colunas de valor mutuamente exclusivas (`value_bool`,
`value_int`, `value_decimal`, `value_text`) com `num_nonnulls(...) <= 1`.
Unicidade por `(plan_id, entitlement_key)`. Somente catálogo
declarativo.

### `tenant_subscriptions`
Estado de assinatura comercial tenant-scoped. FKs: `tenant_id` →
`tenants` (cascade), `plan_id` → `commercial_plans` (restrict).
`status` ∈ {`trialing`, `active`, `past_due`, `suspended`,
`canceled`, `internal`, `demo`}. Timestamps de ciclo (`started_at`,
`trial_ends_at`, `current_period_start/_end`, `canceled_at`,
`suspended_at`). Nenhuma coluna de provider (SCP-001). Índice
único parcial garante no máximo uma assinatura corrente por tenant
para os status não-`canceled`.

### `tenant_entitlements`
Entitlements efetivos por tenant. FKs: `tenant_id` (cascade),
`subscription_id` (`ON DELETE SET NULL`), `entitlement_key`
(restrict). `source` ∈ {`plan`, `override`, `system`}. Valores
mutuamente exclusivos. Janela de vigência `[effective_from,
effective_until)`. Unicidade por `(tenant_id, entitlement_key)`.
Não enforça acesso.

## RLS Posture

Todas as 5 tabelas têm `ENABLE ROW LEVEL SECURITY`, **sem policies
permissivas**. Consequência: `anon` e `authenticated` não conseguem
ler nem escrever. Apenas `service_role` (bypass de RLS) — e apenas
via caminhos server-only privilegiados aprovados em etapas futuras
— pode manipular esses dados.

**FORCE ROW LEVEL SECURITY** não foi aplicado: o padrão atual do
projeto (ex.: `tenants`, `tenant_members`, `leads`) tem
`relforcerowsecurity = false`. Introduzir FORCE apenas na fundação
comercial quebraria consistência de padrão sem ganho — o service
role em rotas server-only é o vetor de acesso desejado nesta fase
e a ausência total de policies já garante deny-by-default para
qualquer role sujeita a RLS.

Grants concedidos: apenas `GRANT ALL ... TO service_role`. Nenhum
grant para `anon` ou `authenticated`.

## Commercial Authorization Boundary

- `tenant_role = 'admin'` **não** é `billing_admin`.
- `tenant_role = 'owner'` **não** é `billing_admin`.
- `is_owner = true` **não** é `billing_admin`.
- `has_role(auth.uid(), 'admin')` **não** é `billing_admin`.
- Super Admin global **não** é tenant `billing_admin`.
- `canManageTenantBilling` **não existe** após SCP-001.
- `x-tenant-id` continua sendo transporte, não autoridade.

## Relationship with ADR-005

SCP-001 materializa o vocabulário comercial oficial da ADR-005:
tenant, subscription, plan, entitlement. Preserva as invariantes:
subscription pertence ao tenant, plan é catálogo declarativo,
entitlement define capacidade efetiva sem enforcer autoridade
comercial administrativa.

## Relationship with ADR-006

SCP-001 **não** implementa `BillingProvider`, `NormalizedBillingEvent`,
webhooks, checkout ou provider concreto. O schema não contém
colunas de provider. Provider mapping/materialização é objeto de
SCP-002 (ou etapa posterior aprovada).

## Relationship with F4.0

SCP-001 respeita integralmente os Hard Gates RR-G1..RR-G7 da F4.0:

- **RR-G1** — Nenhum `tenant_role` existente concede autoridade
  comercial: nenhuma policy comercial derivada de role foi criada.
- **RR-G2** — Nenhuma policy/função/código usa `tenant_role` como
  autorização comercial.
- **RR-G3** — `has_role(auth.uid(),'admin')` não é usado como
  autorização comercial.
- **RR-G4** — Toda futura autoridade administrativa comercial ainda
  exige modelo dedicado aprovado.
- **RR-G5** — Nenhum resolvedor comercial no client.
- **RR-G6** — Super Admin impersonation permanece operacional,
  não comercial.
- **RR-G7** — Client jamais decide capacidade comercial.

## Invariants

1. Subscription pertence ao tenant, nunca ao usuário.
2. No máximo uma subscription corrente por tenant (índice único parcial).
3. Plan é catálogo declarativo, sem código.
4. Entitlement descreve capacidade, não concede acesso.
5. Server-side é a única autoridade comercial futura.
6. Nenhum papel de membership vira, por si só, `billing_admin`.
7. Deny-by-default até que uma etapa dedicada projete o acesso.

## Risks

- **Schema sem consumidores** — até SCP-002+, as tabelas ficam
  inertes; mitigado pela ausência total de policies e pela restrição
  a `service_role`.
- **Overgrant histórico persistente em `tenant_members`** — inalterado
  por SCP-001; mitigação segue sendo os Hard Gates RR-G1..RR-G7.
- **Confusão futura entre catálogo (`commercial_plan_entitlements`)
  e efetivo (`tenant_entitlements`)** — mitigada por `source` e
  janela de vigência; documentação vinculante.

## Next Steps

- Submeter SCP-001 para auditoria externa.
- Após aprovação, planejar **SCP-002 — Billing Provider Abstraction
  Materialization** ou etapa intermediária, se necessário.
- Nenhuma outra etapa comercial pode iniciar antes.

## References

- Constitution — `docs/architecture/ARCHITECTURE_CONSTITUTION.md`
- Security Architecture — `docs/architecture/security/SECURITY_ARCHITECTURE.md`
- IA-006 — `docs/architecture/impact-analysis/IA-006-saas-commercial-platform.md`
- ADR-005 — `docs/architecture/ADR/ADR-005-commercial-domain.md`
- ADR-006 — `docs/architecture/ADR/ADR-006-billing-provider-abstraction.md`
- F4.0 — `docs/architecture/security/F4-0-role-reconciliation-membership-role-audit.md`
- Roadmap — `docs/architecture/ROADMAP_ARCHITECTURAL.md`
