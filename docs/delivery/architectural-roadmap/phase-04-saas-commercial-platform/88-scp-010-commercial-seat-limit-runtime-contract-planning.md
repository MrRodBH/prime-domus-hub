# SCP-010 — Commercial Seat Limit Runtime Contract & Read Model Planning — Relatório de execução

## Status

Ready for External Audit

## 33.1 Síntese

- Analisado: `tenant_members` (schema real via `types.ts`), enums
  `membership_status` e `tenant_role`, `requireTenant`,
  impersonation boundary, feature catalog (`users.seats`),
  `CommercialFeatureDecision` runtime, tabelas comerciais
  (`tenant_entitlements`, `commercial_plan_entitlements`,
  `tenant_subscriptions`).
- Contrato recomendado: status counted = `{active, invited}`;
  status not counted = `{suspended, revoked}`; todos os `tenant_role`
  reais consomem assento; unidade contada = linha `tenant_members`
  agrupada por `(tenant_id, user_id)`; precedência de limite
  `tenant → plan → none`; `null`/ausência não é ilimitado;
  `requestedIncrement` inteiro `> 0` validado server-side; `used`
  exclusivamente server-side; `CommercialLimitDecision` preserva o
  DTO da SCP-009.
- Decisões congeladas: §4, §5, §6, §7, §8, §10, §11, §21 do documento
  principal.
- Postergado para SCP-011: implementação do runtime read-only e
  read models. Postergado para SCP-012: enforcement atômico em
  mutations (TOCTOU).

## 33.2 Arquivos criados

- `docs/architecture/impact-analysis/SCP-010-commercial-seat-limit-runtime-contract-planning.md`
- `docs/delivery/phase-04-saas-commercial-platform/88-scp-010-commercial-seat-limit-runtime-contract-planning.md`

## 33.3 Arquivos alterados

- `docs/architecture/ROADMAP_ARCHITECTURAL.md` (linha 166: SCP-010
  marcada como Ready for External Audit; linha 167: SCP-011 registrada
  como próxima etapa futura planejada).

## 33.4 Evidências do repositório

- Membership: `src/integrations/supabase/types.ts` (linhas 3184–3236,
  3621, 3823); `src/integrations/supabase/membership-types.ts`;
  `src/integrations/supabase/membership-validation.ts`.
- Status reais: `'active' | 'invited' | 'suspended' | 'revoked'`.
- Roles reais: `'owner' | 'admin' | 'manager' | 'broker' |
  'captador' | 'secretaria' | 'viewer'`.
- Constraints: apenas FK `tenant_members_tenant_id_fkey` observável
  em `types.ts.Relationships`. UNIQUE `(tenant_id, user_id)` a
  confirmar em migration.
- Mutation boundaries: nenhuma server function isolada de
  create/invite/activate/suspend/reactivate/remove localizada em
  `src/lib/api/**`. Inventário registrado como parcial (§17 do doc).
- `requireTenant`: `src/integrations/supabase/tenant-middleware.ts`.
- Impersonation boundary: `src/integrations/supabase/impersonation-state.ts`,
  `use-impersonation.ts`, `tenant-attacher.ts` (precedência
  impersonação → seleção → sem header).
- Feature catalog: `src/lib/api/commercial/feature-catalog.ts` —
  `users.seats` presente com `valueType: "number"`, `status: "active"`.
- Commercial entitlement sources: tabelas
  `commercial_plans`, `commercial_plan_entitlements`,
  `commercial_entitlement_definitions`, `tenant_entitlements`,
  `tenant_subscriptions`, `tenant_billing_provider_mappings`,
  `billing_events`, `billing_event_transitions`,
  `billing_provider_definitions`.
- Roadmap final (Fase 4): SCP-001..SCP-009 = Accepted; SCP-010 =
  Ready for External Audit; SCP-011 = próxima etapa futura.

## 33.5 Decisão de contagem

- Consomem assento: `active`, `invited`.
- Não consomem: `suspended`, `revoked` (equivalente semântico de
  "removed" no domínio real).
- `invited` reserva assento.
- Todos os roles reais (`owner`, `admin`, `manager`, `broker`,
  `captador`, `secretaria`, `viewer`) consomem quando o status é
  counted.
- Unidade contada: linha `tenant_members` agrupada por
  `(tenant_id, user_id)`.
- Duplicidade: mitigada por `COUNT(DISTINCT user_id)` no read model;
  UNIQUE `(tenant_id, user_id)` a confirmar em SCP-011.

## 33.6 Decisão de limite

- Fonte autoritativa: `tenant_entitlements` (feature key
  `users.seats`) → `commercial_plan_entitlements` do plano vigente
  via `tenant_subscriptions` → `none`.
- Precedência: `tenant` > `plan` > `none`. Sem fallback heurístico.
- `limit = null`: não representa ilimitado.
- Ausência: não representa ilimitado.
- `limit = 0`: zero assentos permitidos.
- Unlimited: não representado nesta etapa; SCP-011 deve definir se
  aplicável.

## 33.7 Concorrência

- Avaliação read-only não é enforcement — TOCTOU documentado em §16
  do documento principal.
- Mutations que exigirão enforcement (a inventariar em SCP-011 e
  materializar em SCP-012): criação `active`, criação `invited`,
  aceite de convite, ativação (`suspended → active`), reativação
  (`revoked → active`), importação em lote.
- Problema a resolver em SCP-012: garantir que
  `used + Δ ≤ limit` avaliado e materializado dentro da mesma
  transação atômica por tenant (função SQL transacional, RPC com
  advisory lock, constraint agregada ou revalidação intra-transação
  — escolha sob auditoria).

## 33.8 Confirmações negativas

Nenhuma migration criada. Nenhuma tabela criada. Nenhuma coluna
criada. Nenhuma RLS policy criada. Nenhum grant criado. Nenhuma
função runtime criada (nenhum `getCommercialLimitDecision`,
`getCommercialSeatLimitDecision`, `evaluateSeatLimit`, contador de
uso). Nenhuma mutation alterada. `limit_reached` não emitido em
runtime. Nenhum provider integrado (Stripe/Hotmart/Kiwify). Nenhum
webhook. Nenhum checkout. Nenhum customer portal. `billing_admin`,
`commercial_admin`, `canManageTenantBilling` não criados.
`tenant_members` inalterado. `getCommercialFeatureDecision`,
`decideCommercialFeature`, `normalizeFeatureKey`, `feature-catalog.ts`
inalterados. Nenhum frontend alterado. `storage.media_limit` não
tratado. SCP-011 não iniciada. SCP-012 não iniciada.

## 33.9 Testes e verificações

- `rg -n "tenant_members|membership_status" src/integrations/supabase/types.ts`
  → confirma enum e colunas.
- `rg -n "users.seats" src/lib/api/commercial/feature-catalog.ts`
  → confirma catalogação.
- `rg -n "SCP-010" docs/architecture/ROADMAP_ARCHITECTURAL.md`
  → única entrada, Ready for External Audit.
- Sem alteração em arquivos de produção (apenas `docs/**`).
- Como a etapa é documental, nenhum teste novo de runtime foi criado.

## 33.10 Status final

SCP-010 — Ready for External Audit.

Não iniciar SCP-011.
