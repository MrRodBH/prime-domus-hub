# SCP-004.1 — Commercial Diagnostic Boundary & Documentation Cleanup

## Status

Accepted

- **Date:** 2026-07-09
- **Phase:** Fase 4 — SaaS Commercial Platform
- **Nature:** Corretivo direto sobre a SCP-004. Remove do runtime toda
  superfície de diagnóstico comercial administrativo e consolida a
  documentação (status da SCP-003, sequência oficial da Fase 4 e escopo
  final da SCP-004). Sem migration, sem RLS, sem grant, sem alteração
  em `tenant_members`, sem provider integration, sem billing real, sem
  autorização comercial nova.

## Acceptance Note

SCP-004.1 is accepted as the corrective governance patch for SCP-004.

It confirms that `CommercialAdminDiagnostic` is not exposed in runtime and remains only as a future documented item requiring a dedicated commercial authorization surface.

## Escopo

1. Remoção total, em runtime, de:
   - `getCommercialAdminDiagnostic` (server function);
   - `deriveAdminDiagnostic` (helper de derivação);
   - `CommercialAdminDiagnostic` (tipo DTO).
2. Manutenção da SCP-004 com apenas três funções runtime comerciais:
   - `getTenantCommercialSummary`;
   - `getTenantEntitlementSnapshot`;
   - `getTenantBillingHealth`.
3. Ajuste dos specs para remover cobertura do diagnóstico e reforçar a
   cobertura de sanitização dos três DTOs remanescentes.
4. Correção documental do status da SCP-003 (heading e linha única
   `Accepted`).
5. Consolidação da subseção "Gates e sequência inicial da Fase 4" no
   roadmap, marcando SCP-004 como `Accepted` e adicionando restrição
   permanente de que `CommercialAdminDiagnostic` não é exposto em runtime.
6. Atualização de `docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/58-scp-004-...md` para refletir o estado
   final correto (três funções comerciais, item futuro documentado).

## Arquivos alterados

- `src/lib/api/commercial/read-models.ts` — removido tipo
  `CommercialAdminDiagnostic` e função `deriveAdminDiagnostic`;
  substituídos por nota documental.
- `src/lib/api/commercial/commercial.functions.ts` — removida a server
  function `getCommercialAdminDiagnostic`, imports órfãos e menções em
  cabeçalho; item futuro registrado apenas como comentário.
- `src/integrations/supabase/__tests__/commercial-read-models.spec.ts`
  — removidos os dois testes de `deriveAdminDiagnostic` e adicionado
  um teste consolidado de sanitização cobrindo os três DTOs
  remanescentes (garante ausência de `provider_customer_ref`,
  `provider_subscription_ref`, `payload`, `payload_hash`,
  `idempotency`, `raw`, `error_message`).
- `docs/architecture/commercial/SCP-003-commercial-read-models-server-side-access-planning.md`
  — validado como `## Status` único, linha única `Accepted`.
- `docs/architecture/ROADMAP_ARCHITECTURAL.md` — subseção "Gates e
  sequência inicial da Fase 4" substituída integralmente conforme
  especificado; SCP-004 marcada como `Accepted`; adicionada restrição
  permanente sobre `CommercialAdminDiagnostic`.
- `docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/58-scp-004-commercial-server-read-functions.md` —
  removido `getCommercialAdminDiagnostic` do bloco de funções
  entregues; adicionada seção "Item futuro" descrevendo as restrições
  para futura reintrodução.

## Funções runtime comerciais finais

- `getTenantCommercialSummary` → `TenantCommercialSummary`
- `getTenantEntitlementSnapshot` → `TenantEntitlementSnapshot`
- `getTenantBillingHealth` → `TenantBillingHealth`

`CommercialAdminDiagnostic` permanece **apenas** como item futuro
documental. Não há tipo, helper, handler, endpoint ou export em
runtime. Reintrodução exige superfície de autorização comercial
dedicada — **não** pode reutilizar `tenant_role`, `has_role(auth.uid(),
'admin')` ou Super Admin impersonation como governança comercial.

## Testes

```
✓ tenant-selection-state:        8 passed, 0 failed
✓ tenant-attacher:               7 passed, 0 failed
✓ tenant-selection-cardinality:  7 passed, 0 failed
✓ tenant-gate:                  12 passed, 0 failed
✓ membership-validation:        10 passed, 0 failed
✓ commercial-read-models:        9 passed, 0 failed

TOTAL: 53 passed, 0 failed
```

Typecheck (`bunx tsgo --noEmit`): **clean**.

## Inspeções textuais obrigatórias

### CommercialAdminDiagnostic runtime

```
rg -n "getCommercialAdminDiagnostic|deriveAdminDiagnostic|CommercialAdminDiagnostic" \
  src/lib/api src/integrations/supabase/__tests__
```

**Resultado:** 0 ocorrências (nem runtime nem em comentários dentro do
código).

### Super Admin impersonation em camada comercial

```
rg -n "isSuperAdmin|impersonation" src/lib/api/commercial
```

**Resultado:** 0 ocorrências.

### Direct client reads

```
rg -n "supabase\.from\(['\"](commercial_plans|commercial_entitlement_definitions|\
commercial_plan_entitlements|tenant_subscriptions|tenant_entitlements|\
billing_provider_definitions|tenant_billing_provider_mappings|billing_events|\
billing_event_transitions)" src/
```

**Resultado:** 0 direct client reads.

### Mutations

```
rg -n "\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(" src/lib/api/commercial/
```

**Resultado:** 0 mutations.

### Provider integration

```
rg -in "stripe|hotmart|kiwify|webhook|checkout|customer.portal|customer portal" \
  src/lib/api/commercial/
```

**Resultado:** 0 implementação runtime.

### Autorização comercial proibida

```
rg -n "billing_admin|commercial_admin|canManageTenantBilling" \
  src/lib/api src/integrations/supabase
```

**Resultado:** 0 ocorrências runtime.

### RLS/policies/grants/migrations

Nenhuma migration criada nesta etapa. Nenhum `CREATE POLICY`,
`ALTER POLICY`, `DROP POLICY`, `GRANT`, `REVOKE` ou
`FORCE ROW LEVEL SECURITY` introduzido pela SCP-004.1.

### Roadmap

```
rg -n "SCP-003|SCP-004|próxima etapa|Accepted" \
  docs/architecture/ROADMAP_ARCHITECTURAL.md
```

Confirmado:

- SCP-003 aparece **uma única vez** na sequência oficial (item 7,
  `Accepted`).
- SCP-004 aparece **uma única vez** na sequência oficial (item 8,
  `Accepted`).
- Não há duas linhas numeradas como 7.
- SCP-003 **não** aparece como próxima etapa.

### Status SCP-003

```
rg -n "## Status|Accepted" \
  docs/architecture/commercial/SCP-003-commercial-read-models-server-side-access-planning.md
```

Confirmado: apenas um `## Status`, apenas uma linha `Accepted`, nenhum
status duplicado.

## Roadmap final consolidado (Fase 4)

1. IA-006 — SaaS Commercial Platform Impact Analysis — Accepted.
2. ADR-005 — Commercial Domain — Accepted.
3. ADR-006 — Billing Provider Abstraction — Accepted.
4. F4.0 — Role Reconciliation / Membership Role Audit — Accepted.
5. SCP-001 — Commercial Domain Model — Accepted.
6. SCP-002 — Billing Provider Abstraction Materialization — Accepted.
7. SCP-003 — Commercial Read Models / Server-Side Access Planning —
   Accepted.
8. SCP-004 — Commercial Server Read Functions — Accepted.

## Status final da SCP-003

`Accepted` (heading único, linha única).

## Confirmações explícitas

Nesta etapa **não** houve:

- migration;
- RLS policy;
- grant;
- mutation;
- provider integration;
- webhook;
- checkout;
- customer portal;
- criação de `billing_admin`;
- criação de `commercial_admin`;
- criação de `canManageTenantBilling`;
- alteração em `tenant_members`;
- exposição de `CommercialAdminDiagnostic` em runtime.

## Próximo passo recomendado

Submeter SCP-004 + SCP-004.1 conjuntamente para auditoria externa.
**Não iniciar SCP-005** antes da aprovação.
