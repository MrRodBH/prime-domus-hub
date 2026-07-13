# SCP-004 — Commercial Server Read Functions

## Status

Accepted

- **Date:** 2026-07-09
- **Phase:** Fase 4 — SaaS Commercial Platform
- **Nature:** Materialization of the server-only commercial read
  boundary planned in SCP-003. Adds pure derivation helpers, four
  server functions and deterministic unit specs. **No** migrations,
  RLS, grants, provider integration, webhook, checkout, customer
  portal, billing/commercial admin role or client direct reads.

## Acceptance Note

SCP-004 is accepted together with SCP-004.1.

SCP-004.1 corrected the commercial diagnostic boundary by removing `CommercialAdminDiagnostic` from runtime and preserving only the approved server-side commercial read functions:

- `getTenantCommercialSummary`;
- `getTenantEntitlementSnapshot`;
- `getTenantBillingHealth`.

No billing mutation surface, provider integration, webhook, checkout, customer portal, commercial admin role, billing admin role, RLS policy, grant, migration, or `tenant_members` change was introduced.

## Objetivo

Implementar a primeira camada segura de leitura comercial server-side,
baseada exclusivamente no planejamento da SCP-003, materializando os
read models `TenantCommercialSummary`, `TenantEntitlementSnapshot` e
`TenantBillingHealth` como server functions sanitizadas.

O quarto read model previsto na SCP-003 — a superfície de diagnóstico
comercial administrativo — **não** é exposto em runtime nesta etapa
(ver seção "Item futuro: diagnóstico comercial administrativo").

## Escopo implementado

Camada estritamente server-only:

```
client → server-only read function (createServerFn + requireTenant)
       → supabaseAdmin (async import, service_role)
       → pure derivation (src/lib/api/commercial/read-models.ts)
       → sanitized DTO
```

Nenhuma leitura direta client-side de tabelas comerciais/billing. As
funções resolvem o tenant via `requireTenant` (F3.2/F3.3), reutilizando
o mecanismo consolidado — sem introduzir novo caminho de autorização.

## Arquivos criados

- `src/lib/api/commercial/read-models.ts` — tipos + funções puras de
  derivação (`deriveCommercialSummary`, `deriveEntitlementSnapshot`,
  `deriveBillingHealth`). Zero dependência server-only para permitir
  specs unitários determinísticos.
- `src/lib/api/commercial/commercial.functions.ts` — três server
  functions com `requireTenant`, `supabaseAdmin` carregado via
  `await import` dentro do handler.
- `src/integrations/supabase/__tests__/commercial-read-models.spec.ts`
  — specs cobrindo casos vazios, override tenant×plan, janela
  `effective_from/until`, matriz de status `healthy` /
  `attention_required` / `blocked` / `unknown`, sanitização de todos
  os DTOs.

## Arquivos alterados

- `run-tenant-specs.ts` — adicionada suíte `commercial-read-models` ao
  runner unificado.
- `docs/architecture/ROADMAP_ARCHITECTURAL.md` — sequência da Fase 4
  atualizada: SCP-003 `Accepted`, SCP-004 `Accepted`; restrições
  permanentes renomeadas para SCP-004.
- `docs/architecture/commercial/SCP-003-commercial-read-models-server-side-access-planning.md`
  — status único `Accepted`.

## Read functions e DTOs

### `getTenantCommercialSummary` → `TenantCommercialSummary`

```ts
{
  tenantId, plan: { id, code, name, status },
  subscription: { status, currentPeriodStart, currentPeriodEnd, trialEndsAt, canceledAt },
  billingProvider: { providerCode, status, configured }
}
```

Ajuste em relação ao contrato conceitual da SCP-003: schema atual não
possui `cancel_at_period_end`; o DTO expõe `canceledAt` (derivado de
`tenant_subscriptions.canceled_at`).

### `getTenantEntitlementSnapshot` → `TenantEntitlementSnapshot`

```ts
{ tenantId, entitlements: [{ key, value, source: "tenant"|"plan"|"default", effective }] }
```

`source` é derivado explicitamente: valores tenant sobrescrevem valores
do plano ativo; `effective` deriva da janela `effective_from/until`.

### `getTenantBillingHealth` → `TenantBillingHealth`

```ts
{ tenantId, status: "unknown"|"healthy"|"attention_required"|"blocked",
  reasons: string[], lastBillingEventAt, hasProviderMapping }
```

Consulta `billing_events` seleciona **apenas** `tenant_id`,
`received_at`, `processing_status`. `provider_customer_ref`,
`provider_subscription_ref`, `payload_sanitized`, `payload_hash`,
`idempotency_key`, `error_code`, `error_message` **nunca** são
selecionados.

### Item futuro: diagnóstico comercial administrativo

O quarto read model previsto na SCP-003 (diagnóstico comercial
administrativo) permanece apenas como item futuro. Não há server
function, handler, endpoint ou derivação em runtime nesta etapa.

Restrições obrigatórias para reintrodução futura:

- não pode ser autorizado por `tenant_role`;
- não pode ser autorizado por `has_role(auth.uid(), 'admin')`;
- não pode ser autorizado por Super Admin impersonation reutilizada
  como governança comercial;
- exige uma superfície de autorização comercial dedicada, ainda não
  definida.

## Garantias server-only

- `supabaseAdmin` importado exclusivamente dentro de `.handler()` via
  `await import("@/integrations/supabase/client.server")`.
- Módulo `read-models.ts` não importa `@supabase/*` — evita vazamento
  para o bundle client caso venha a ser referenciado por hooks.
- Nenhum arquivo `.functions.ts` exporta helpers para consumo direto
  em componentes.

## Testes

Runner `bunx tsx --tsconfig tsconfig.json ./run-tenant-specs.ts`:

```
✓ tenant-selection-state:        8 passed, 0 failed
✓ tenant-attacher:               7 passed, 0 failed
✓ tenant-selection-cardinality:  7 passed, 0 failed
✓ tenant-gate:                  12 passed, 0 failed
✓ membership-validation:        10 passed, 0 failed
✓ commercial-read-models:        9 passed, 0 failed
TOTAL: 53 passed, 0 failed
```

Typecheck (`bunx tsgo --noEmit`): clean.

## Inspeções textuais executadas

- **Direct client reads** — `rg "supabase\.from\(['\"]"` para as 9
  tabelas comerciais/billing em `src/`: **0 ocorrências**.
- **Mutations em SCP-004** — `rg "\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\("`
  em `src/lib/api/commercial/`: **0 ocorrências**.
- **Provider integration** — `rg -i "stripe|hotmart|kiwify|webhook|checkout|customer.portal"`
  em `src/lib/api/commercial/`: apenas 1 ocorrência em comentário
  declarando "no provider integration, webhook, checkout or customer
  portal" (fora de escopo, não implementação).
- **Autorização comercial proibida** — `billing_admin`,
  `commercial_admin`, `canManageTenantBilling`: apenas comentários
  documentando ausência intencional. **0 runtime**.
- **RLS/policies/grants** — nenhuma migration criada nesta etapa; sem
  `CREATE POLICY`, `ALTER POLICY`, `DROP POLICY`, `GRANT`, `REVOKE`,
  `FORCE ROW LEVEL SECURITY`.
- **`tenant_members`** — não referenciado nem alterado por SCP-004.

## Hard Gates SCP-003 preservados

- **SCP3-G1** Server-Side Read Boundary Required — ✅ único caminho é
  createServerFn + requireTenant.
- **SCP3-G2** No Direct Client Reads — ✅ 0 ocorrências client-side.
- **SCP3-G3** No Permissive RLS For End Users — ✅ 0 policies criadas.
- **SCP3-G4** Read Models Are Derived, Not Authoritative — ✅ helpers
  puros; snapshot não concede permissão.
- **SCP3-G5** No Commercial Mutation Surface — ✅ 0 mutations.
- **SCP3-G6** No Provider Event Processing — ✅ apenas leitura
  sanitizada de `received_at` + `processing_status`.
- **SCP3-G7** No Billing Admin Authorization — ✅ nenhum papel novo.
- **SCP3-G8** Audit Before Endpoint Implementation — ✅ endpoints são
  server functions internas, sem rota HTTP pública nova.

## Confirmações explícitas

Nesta etapa **não** houve:

- direct client reads das tabelas comerciais/billing;
- mutations comerciais;
- provider integration (Stripe/Hotmart/Kiwify);
- webhook público;
- checkout;
- customer portal;
- criação de `billing_admin`;
- criação de `commercial_admin`;
- criação de `canManageTenantBilling`;
- alteração em `tenant_members`;
- RLS permissiva;
- novos grants;
- migrations.

## Ressalvas técnicas

- DTO `subscription` usa `canceledAt` em vez de `cancelAtPeriodEnd`
  porque o schema atual não possui tal coluna (documentado acima).
- `pickActiveSubscription` aplica priorização determinística por
  `status` (não usa `LIMIT 1` implícito nem `ORDER BY` heurístico como
  critério de autorização — apenas para escolher qual assinatura o read
  model deve refletir quando o schema permite múltiplas linhas por
  tenant).
- Tabelas comerciais permanecem deny-by-default; consumo via
  `supabaseAdmin` é intencional e restrito a este boundary
  server-only. Qualquer futura leitura autenticada por policy exigirá
  nova SCP.

## Próximo passo recomendado

Submeter SCP-004 para auditoria externa. Não iniciar SCP-005 antes da
aprovação. Candidatos naturais para SCP-005 (a decidir pela auditoria):
consumo controlado no server (hooks server-driven), seleção de provider
inicial, ou design de ingestão de billing events.

## Referências

- Plano SCP-003 — `docs/architecture/commercial/SCP-003-commercial-read-models-server-side-access-planning.md`
- Roadmap — `docs/architecture/ROADMAP_ARCHITECTURAL.md`
- Middleware — `src/integrations/supabase/tenant-middleware.ts`
- Admin client — `src/integrations/supabase/client.server.ts`
