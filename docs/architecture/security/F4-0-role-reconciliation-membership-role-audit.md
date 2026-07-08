# F4.0 — Role Reconciliation / Membership Role Audit

## Status
Proposed / Ready for External Audit

- **Date:** 2026-07-08
- **Phase:** Fase 4 — SaaS Commercial Platform (gate preparatório, pré-SCP-001)

## Context

A ADR-005 (Commercial Domain) e a ADR-006 (Billing Provider
Abstraction) foram aprovadas em auditoria externa. A IA-006 §21
estabeleceu que a próxima etapa obrigatória, antes de SCP-001 —
Commercial Domain Model, é a reconciliação de roles de membership.

Desde F3.1, existe um risco documentado: o backfill histórico
atribuiu `tenant_role = 'admin'` a memberships não-owner. F3.6
consolidou o domínio tipado de `tenant_role`, mas explicitamente
NÃO usou o role como autorização — apenas como base para esta
reconciliação.

Esta etapa (F4.0) audita e reconcilia conceitualmente o uso de
`tenant_role`, para eliminar ambiguidade antes que a Fase 4 comece
a modelar assinatura, entitlements e billing.

## Objective

Responder objetivamente:

1. Quais valores reais existem em `tenant_members.tenant_role`?
2. Quantas memberships existem por role e status?
3. Quais memberships `active` possuem `tenant_role = 'admin'`?
4. `tenant_role` é usado hoje para autorização funcional?
5. `tenant_role = 'admin'` concede algum privilégio comercial hoje?
6. Existe risco de overgrant comercial imediato?
7. Podemos iniciar SCP-001 sem implementar billing admin?
8. Quais hard gates devem permanecer antes de qualquer autorização
   administrativa comercial?

## Scope

Permitido:
- inspecionar schema e dados de `tenant_members`;
- inspecionar uso de `tenant_role`, `has_role`, `billing_admin`,
  `commercial_admin`, `canManageTenantBilling` em `src/`, `supabase/`,
  `docs/`;
- documentar findings, reconciliação, hard gates e recomendação;
- atualizar status documental da ADR-006 para `Accepted`.

## Out of Scope

Proibido nesta etapa:
- migrations, `ALTER TABLE`, `UPDATE` em `tenant_members`;
- novas tabelas, colunas, RLS policies, SQL functions, grants;
- alteração de Storage ou Runtime Core;
- implementação de billing admin, `canManageTenantBilling`, RBAC
  comercial, RLS comercial ou qualquer autorização administrativa
  comercial real;
- SCP-001, SCP-002, plans, subscriptions, entitlements,
  billing_events, webhooks;
- integração com Stripe/Hotmart/Kiwify;
- alteração de tenant resolution, Super Admin impersonation;
- promoção de `tenant_role = 'admin'` a `billing_admin`;
- uso de `has_role(auth.uid(), 'admin')` como autorização comercial.

## Data Inventory

Executado via `psql` gerenciado. Nenhum dado pessoal exposto.

### Distribuição por `membership_status`
| status | count |
|---|---|
| active | 4 |

Nenhuma membership `invited`, `suspended` ou `revoked` no momento
da auditoria.

### Distribuição por `tenant_role`
| tenant_role | count |
|---|---|
| owner | 1 |
| admin | 3 |

Nenhuma membership com `manager`, `broker`, `captador`, `secretaria`
ou `viewer` no momento da auditoria.

### Distribuição combinada
| membership_status | tenant_role | count |
|---|---|---|
| active | owner | 1 |
| active | admin | 3 |

### Active admins (`membership_status = 'active' AND tenant_role = 'admin'`)
- Total: **3 memberships** classificadas como active admin.
- Todas herdadas do backfill da F3.1 (regra:
  `is_owner ? 'owner' : 'admin'`).
- IDs técnicos não são reproduzidos aqui por higiene; inventário
  reproduzível pela query da §8.4 do prompt.

### Owners (`tenant_role = 'owner' OR is_owner = true`)
- 1 membership com `tenant_role = 'owner'`.
- 1 membership com `is_owner = true`.
- Convergem no mesmo registro — não há divergência
  owner-vs-is_owner.

## Code Usage Inventory

### `tenant_role` / `TenantRole` / helpers em `src/` e `supabase/`

| Local | Classificação |
|---|---|
| `supabase/migrations/20260708125042_*.sql` | schema/backfill (F3.1). |
| `supabase/migrations/20260708132329_*.sql` | comentário proibindo `tenant_role` como resolvedor de tenant. |
| `src/integrations/supabase/membership-types.ts` | type puro. |
| `src/integrations/supabase/membership-validation.ts` | helpers puros (`isTenantRole`, `assertTenantRole`, `isTenantAdminRole`, `isTenantOwnerRole`); comentários explicitam que não são autorização. |
| `src/integrations/supabase/tenant-repository.ts` | comentários proibindo `tenant_role` como critério de seleção. |
| `src/integrations/supabase/tenant-middleware.ts` | comentários proibindo `tenant_role` como resolvedor. |
| `src/lib/api/tenant-selection.functions.ts` | comentário proibindo `tenant_role` na seleção. |
| `src/components/workspace/tenant/tenant-selection-cardinality.ts` | comentário proibindo `tenant_role`. |
| `src/integrations/supabase/types.ts` | tipos gerados. |
| `src/integrations/supabase/__tests__/membership-validation.spec.ts` | testes de domínio. |

**Resultado:** nenhum uso funcional de `tenant_role` como
autorização. Todos os call sites são tipos, helpers puros, testes
ou comentários explicitamente proibindo o uso do role como
autorização.

### `has_role(auth.uid(), 'admin')` em `src/` e `supabase/`

`rg -n "has_role\(auth\.uid\(\), 'admin'\)" src supabase` → **0
ocorrências**. Todas as ocorrências vivem em `docs/`, em contexto
explícito de proibição/correção (IA-006, IA-006.1/2/3, ADR-005,
ADR-006, relatórios). Nenhum código de produção usa
`has_role(auth.uid(), 'admin')`.

### `billing_admin` / `commercial_admin` / `canManageTenantBilling`

`rg` sobre `src/` e `supabase/` → **0 ocorrências**. Todas as
menções vivem em `docs/`, exclusivamente como conceito futuro,
proibição ou pré-condição. Nenhuma função, RLS, tabela, coluna,
policy ou tipo implementa esses conceitos.

## Findings

1. Existem 3 memberships `active` com `tenant_role = 'admin'`,
   todas provenientes do backfill de F3.1.
2. Existe 1 membership `active` com `tenant_role = 'owner'`,
   convergente com `is_owner = true`.
3. `tenant_role` **não** participa de qualquer decisão de
   autorização em `src/` ou `supabase/` — apenas de tipos, helpers
   puros e testes.
4. `has_role(auth.uid(), 'admin')` **não** é usado em `src/` ou
   `supabase/` como autorização comercial (nem como autorização de
   qualquer natureza no runtime comercial).
5. `billing_admin`, `commercial_admin` e `canManageTenantBilling`
   **não** existem no código. Vivem apenas como vocabulário
   documental de ADR-005/ADR-006/IA-006.
6. Não há RLS policy, SQL function ou grant que derive
   autoridade comercial de `tenant_role` ou `is_owner`.
7. Tenant resolution (`get_current_tenant_id`, `tenant-middleware`,
   `tenant-repository`) permanece ancorado exclusivamente em
   `membership_status = 'active'`.

## Reconciliation Decision

Existing `tenant_role` values are reconciled as product/membership
roles only. No existing `tenant_role`, including `admin`, is
authorized to act as `billing_admin` or `commercial_admin`.
Commercial administrative authorization remains undefined and
blocked until a dedicated authorization model is approved and
implemented.

Em português:

Os valores atuais de `tenant_role` ficam reconciliados como papéis
de produto/membership, **não** como papéis comerciais. Nenhum
`tenant_role` existente, incluindo `admin`, autoriza `billing_admin`
ou `commercial_admin`. A autorização administrativa comercial
permanece indefinida e bloqueada até aprovação e implementação de
modelo dedicado.

Nenhum dado é alterado por esta etapa. Os 3 registros
`active/admin` permanecem como estão, agora explicitamente
reconciliados como roles de produto e **sem** eficácia comercial.

## Commercial Authorization Boundary

- `tenant_role = 'admin'` **não** é `billing_admin`.
- `tenant_role = 'owner'` **não** é `billing_admin`.
- `is_owner = true` **não** é `billing_admin`.
- `has_role(auth.uid(), 'admin')` **não** é `billing_admin`.
- Super Admin global **não** é tenant `billing_admin`.
- `canManageTenantBilling` **não existe ainda** e não é criada por
  esta etapa.

## Residual Risks

- **Semântica ambígua de `admin`** — o rótulo `admin` em
  `tenant_role` continua semanticamente sobrecarregado; qualquer
  leitura humana futura pode presumir autoridade comercial. Mitigar
  em SCP-001 via nomenclatura dedicada (`billing_admin` isolado) e
  documentação vinculante.
- **Overgrant histórico persistente** — os 3 registros
  `active/admin` continuam existindo. Enquanto `tenant_role` não
  for conectado a nenhuma decisão de autorização, o overgrant é
  inerte. Qualquer futura conexão exige nova revisão.
- **Uso indevido futuro dos helpers** — `isTenantAdminRole` /
  `isTenantOwnerRole` existem como base para reconciliação; usá-los
  como autorização real reintroduziria o overgrant. Comentários no
  módulo já alertam; hard gates abaixo reforçam.

## Hard Gates

Vinculantes para toda etapa comercial futura.

- **RR-G1 — No Existing Role Grants Commercial Admin.** Nenhum
  `tenant_role` existente concede autoridade comercial.
- **RR-G2 — No `tenant_role` Billing Authorization.** Nenhuma
  policy, função ou código pode usar `tenant_role` como autorização
  comercial.
- **RR-G3 — No `has_role` Billing Authorization.**
  `has_role(auth.uid(), 'admin')` não pode ser usado como
  autorização comercial.
- **RR-G4 — Dedicated Commercial Authorization Required.** Toda
  autoridade administrativa comercial exige modelo dedicado
  (`billing_admin` / `canManageTenantBilling`) aprovado em ADR
  específica.
- **RR-G5 — Server-Side Only Commercial Authorization.** Nenhuma
  autoridade comercial pode ser resolvida no client.
- **RR-G6 — No Super Admin Impersonation for Commercial
  Governance.** Super Admin impersonation é operacional/suporte,
  não é autoridade comercial do tenant.
- **RR-G7 — No Client-Side Commercial Authority.** Client jamais
  decide capacidade comercial; apenas exibe estado normalizado
  vindo do servidor.

## Recommendation

F4.0 pode ser considerada concluída se, cumulativamente:

1. `tenant_role` não é usado como autorização comercial;
2. `has_role` não é usado como autorização comercial;
3. `billing_admin` / `commercial_admin` não existem funcionalmente;
4. `canManageTenantBilling` não está implementada;
5. os registros `active/admin` históricos estão inventariados;
6. a fronteira comercial foi documentada;
7. SCP-001 pode iniciar **sem** criar autorização administrativa
   comercial.

Todos os sete critérios estão atendidos por esta auditoria. A
recomendação é aprovar F4.0 em auditoria externa e desbloquear
SCP-001 — **exclusivamente** para modelagem de domínio comercial,
sem criar `billing_admin` / `canManageTenantBilling`.

## References

- Constitution — `docs/architecture/ARCHITECTURE_CONSTITUTION.md`
- Security Architecture — `docs/architecture/security/SECURITY_ARCHITECTURE.md`
- IA-006 — `docs/architecture/impact-analysis/IA-006-saas-commercial-platform.md`
- IA-006.1/2/3 — `docs/fase6/44..46-*.md`
- ADR-005 — `docs/architecture/ADR/ADR-005-commercial-domain.md`
- ADR-006 — `docs/architecture/ADR/ADR-006-billing-provider-abstraction.md`
- F3.1 — `docs/fase6/28-f3-1-membership-schema-foundation.md`
- F3.6 — `docs/fase6/41-f3-6-membership-roles-status-validation.md`
- Roadmap — `docs/architecture/ROADMAP_ARCHITECTURAL.md`
