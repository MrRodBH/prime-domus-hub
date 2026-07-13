# ADR-005 — Commercial Domain

- **Status:** Accepted
- **Date:** 2026-07-08

## Context

A Fase 3 — Membership Evolution Model foi formalmente encerrada
(`docs/delivery/phase-03-membership-evolution/42-f3-7-phase-3-closing-review.md`). A IA-006 — SaaS
Commercial Platform Impact Analysis foi aprovada após correções
IA-006.1, IA-006.2 e IA-006.3
(`docs/architecture/impact-analysis/IA-006-saas-commercial-platform.md`),
estabelecendo a **Fase 4 — SaaS Commercial Platform** como próxima
macrofase.

A IA-006 §21 determinou ordem obrigatória: aprovar IA-006 → emitir
ADR-005 → emitir ADR-006 → executar Role Reconciliation → iniciar
SCP-001. Antes de qualquer implementação funcional é preciso
estabilizar o **vocabulário comercial** e as **fronteiras conceituais**
entre tenant, membership, subscription, plan e entitlement — sem o
que a modelagem futura corre risco de recriar acoplamentos indevidos
(billing como bypass de membership, membership como bypass comercial,
`tenant_role` como autorização comercial etc.).

Esta ADR trata **exclusivamente** do domínio comercial em nível
conceitual. Não introduz tabelas, migrations, RLS, SQL functions,
webhooks, integrações de provider ou UI comercial.

## Decision

1. **Commercial Domain é tenant-scoped.** A assinatura comercial
   pertence ao tenant (organização/imobiliária), nunca ao usuário
   individual.
2. **Subscription pertence ao tenant.** Um usuário pode participar de
   múltiplos tenants; uma assinatura user-scoped criaria ambiguidade
   de acesso e ciclo de vida.
3. **Membership e subscription são dimensões independentes.**
   Membership ativa não garante assinatura ativa; assinatura ativa não
   garante membership ativa.
4. **Plan define pacote comercial declarativo.** Planos são dados
   (catálogo), nunca lógica hardcoded no client ou no servidor.
5. **Entitlement define capacidade efetiva.** Toda decisão de acesso
   a recurso pago é resolvida via entitlements server-side.
6. **Enforcement comercial é server-side.** O client apenas adapta UX.
7. **Client é apenas UX comercial.** Não decide acesso real, não
   libera recurso pago, não altera assinatura ou entitlement.
8. **Autorização administrativa comercial depende de Role
   Reconciliation.** Não pode derivar diretamente de `tenant_role`
   ou `has_role(auth.uid(), 'admin')`. Uma função server-side
   dedicada (conceito: `canManageTenantBilling(userId, tenantId)`)
   será definida em etapa futura — **não** nesta ADR.
9. **Super Admin Commercial Governance é separado de Tenant
   Impersonation.** Console comercial global não usa `x-tenant-id`
   nem impersonação para acessar dados de produto do tenant.
10. **Billing Provider Abstraction será decidida em ADR-006.** Esta
    ADR não escolhe provider (Stripe / Hotmart / Kiwify / outros).

## Consequences

**Positivas**
- Vocabulário comercial estabilizado antes de qualquer código.
- Isolamento tenant-scoped preservado no domínio comercial.
- Impossibilita ambiguidade entre "quem pertence" e "quem paga".
- Enforcement server-side elimina bypass via client.
- Governança administrativa comercial fica atrelada a Role
  Reconciliation, evitando privilege escalation via `tenant_role`.

**Trade-offs / Negativas**
- Exige modelagem futura explícita de subscriptions, plans e
  entitlements (SCP-001..SCP-010, ver IA-006 §17).
- Exige Role Reconciliation antes de qualquer billing admin real.
- Exige ADR-006 antes de qualquer integração com provider.
- Client precisa consultar entitlements server-side para UX precisa.

**Neutras**
- Estados comerciais conceituais listados aqui não implicam enum SQL
  imediato; o mapeamento físico será decidido em SCP-001.

## Commercial Vocabulary

| Termo | Definição |
|---|---|
| **Tenant** | Organização/imobiliária. Unidade de isolamento e de contrato comercial. |
| **Membership** | Vínculo usuário ↔ tenant. Governada pela Fase 3 (`membership_status`, `tenant_role`). |
| **Subscription** | Vínculo tenant ↔ plataforma. Representa o contrato comercial vigente. |
| **Plan** | Pacote comercial declarativo (catálogo). Dados, não código. |
| **Entitlement** | Capacidade comercial efetiva do tenant (feature flag comercial ou limite). |
| **Commercial Status** | Estado comercial conceitual do tenant. |

### Estados comerciais conceituais

| Status | Significado |
|---|---|
| `trialing` | Período de teste vigente. |
| `active` | Assinatura válida/paga. |
| `past_due` | Falha de pagamento dentro de grace period. |
| `suspended` | Uso comercial bloqueado após grace period ou suspensão administrativa. |
| `canceled` | Assinatura cancelada. |
| `internal` | Tenant interno RM Prime, fora de billing comercial. |
| `demo` | Tenant demo, com política comercial específica. |

Estes valores são **conceituais**. Nenhum enum, tabela ou migration é
criado por esta ADR.

### Matriz Membership × Subscription (conceitual)

| membership_status | subscription_status | Efeito conceitual |
|---|---|---|
| `active` | `active` / `trialing` | Opera dentro dos entitlements. |
| `active` | `past_due` | Membro ativo; sujeito a aviso / soft-limit / restrição futura. |
| `active` | `suspended` / `canceled` | Membro existe, mas recursos pagos devem ser bloqueados ou colocados em read-only conforme política futura. |
| `invited` / `suspended` / `revoked` | qualquer | Não opera tenant-scoped, independentemente do estado comercial. |

### Exemplos conceituais de Entitlements

`can_use_ai`, `can_publish_site`, `can_use_custom_domain`,
`can_use_portal_integrations`, `max_users`, `max_properties`,
`max_leads`, `max_storage_mb`, `max_ai_messages_month`.

Lista ilustrativa. Modelagem física ocorrerá em SCP-001+.

## Invariants

- Client nunca é autoridade.
- Servidor é autoridade única.
- Billing **não** substitui membership.
- Membership **não** substitui billing.
- Subscription **não** concede tenant access.
- Membership **não** concede paid feature access.
- `tenant_role` **não** é autorização comercial. *(Proibido usar
  `tenant_role = 'admin'` como autorização comercial.)*
- `has_role(auth.uid(), 'admin')` **não** é autorização comercial.
  *(Proibido como recomendação direta para billing/entitlements.)*
- `x-tenant-id` **não** é autorização comercial (é transporte).
- Super Admin commercial governance **não** é impersonation.
- Entitlement enforcement é server-side.
- Planos são dados, não código: proibido `if (plan === "business")`
  em client ou em lógica de domínio.

## Out of Scope

Explicitamente fora do escopo desta ADR:

- migrations, tables, RLS policies, SQL functions, grants;
- webhooks (Stripe / Hotmart / Kiwify / outros);
- checkout, billing UI, feature flags comerciais;
- implementação de plans, subscriptions, entitlements;
- SCP-001..SCP-010;
- ADR-006 (será emitida separadamente);
- Role Reconciliation / Membership Role Audit (etapa futura);
- alteração em `tenant_members`, `membership_status`, tenant
  resolution, Super Admin impersonation ou Storage;
- implementação de `canManageTenantBilling` (função conceitual,
  não implementada aqui).

## Relationship with IA-006

Esta ADR consome as decisões da IA-006 (e suas correções IA-006.1 /
IA-006.2 / IA-006.3):

- reafirma que Fase 4 é a próxima macrofase e que **SCP-001 ainda
  não foi iniciada**;
- reafirma que `tenant_role = 'admin'` e
  `has_role(auth.uid(), 'admin')` **não** são autorização comercial;
- reafirma a ordem de passos da IA-006 §21;
- fornece o vocabulário comercial exigido como pré-requisito
  conceitual antes de SCP-001.

## Relationship with ADR-006

ADR-006 — Billing Provider Abstraction será emitida em seguida e
tratará:

- interface `BillingProvider` (abstrata);
- separação entre domínio comercial (esta ADR) e integração de
  provider;
- webhooks assinados como fronteira externa;
- suporte inicial e critérios de extensibilidade (Stripe / Hotmart /
  Kiwify citados **sem** decisão definitiva aqui).

Esta ADR **não** decide provider, contrato de webhook, formato de
evento nem estratégia de reconciliação.

## Risks

- **Overgrant histórico:** backfill `tenant_role = 'admin'` (F3.1)
  permanece risco documentado. Mitigação: Role Reconciliation antes
  de qualquer billing admin real.
- **Vazamento de decisão comercial para o client:** mitigado por
  invariante "enforcement server-side".
- **Confusão membership × subscription:** mitigada pela matriz
  conceitual acima e pela separação declarada.
- **Uso indevido de impersonação para gestão comercial:** mitigado
  pela separação Super Admin Commercial Governance × Impersonation.

## Implementation Preconditions

Antes de iniciar SCP-001 é obrigatório, em ordem:

1. Aprovar ADR-005 (esta ADR) em auditoria externa.
2. Emitir e aprovar **ADR-006 — Billing Provider Abstraction**.
3. Executar **Role Reconciliation / Membership Role Audit** antes
   de qualquer autorização administrativa comercial.
4. Preservar integralmente os invariantes de Fase 2 e Fase 3.
5. Só então iniciar **SCP-001 — Commercial Domain Model**.

Esta ordem é coerente com IA-006 §21 e não a altera.

## Alternatives Considered

- **User-scoped subscription:** rejeitada — cria ambiguidade de
  acesso quando o mesmo usuário pertence a múltiplos tenants;
  cancelamento de usuário não pode implicar cancelamento da
  organização.
- **Plan como código (`if plan === "..."`):** rejeitada — acopla
  regras comerciais ao runtime e impossibilita catálogo dinâmico.
- **Autorização comercial derivada de `tenant_role`:** rejeitada —
  reforçaria o overgrant histórico e violaria o princípio de
  autoridade server-side dedicada.
- **Commercial governance via impersonation:** rejeitada — mistura
  fronteiras (produto vs. billing) e cria bypass indevido a dados
  do tenant.

## References

- Constitution — `docs/architecture/ARCHITECTURE_CONSTITUTION.md`
- Security Architecture — `docs/architecture/security/SECURITY_ARCHITECTURE.md`
- IA-006 — `docs/architecture/impact-analysis/IA-006-saas-commercial-platform.md`
- IA-006.1 — `docs/delivery/phase-04-saas-commercial-platform/44-ia-006-1-roadmap-phase-numbering-rls-correction.md`
- IA-006.2 — `docs/delivery/phase-04-saas-commercial-platform/45-ia-006-2-documentation-deduplication-consistency-patch.md`
- IA-006.3 — `docs/delivery/phase-04-saas-commercial-platform/46-ia-006-3-final-documentation-consistency-verification-cleanup.md`
- Roadmap — `docs/architecture/ROADMAP_ARCHITECTURAL.md`
- F3.7 Closing Review — `docs/delivery/phase-03-membership-evolution/42-f3-7-phase-3-closing-review.md`
