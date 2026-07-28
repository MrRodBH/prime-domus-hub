# PR-M2 — Functional Completion Impact Analysis

## Status

**Planning Gate Accepted / Merged — implementation Planned / Blocked**

```text
STAGE_ID = PR-M2
EXECUTION_TYPE = pre_principal_architecture_first_gate
AUDITED_MAIN_HEAD = 985a48e26c72c36aa80cac21ab32c768dac84c17
DIRECT_GITHUB_AUDIT_COMPLETED = true
ALL_REQUIRED_DOMAINS_AUDITED = true
ALL_CAPABILITIES_CLASSIFIED = true
UNCLASSIFIED_CAPABILITIES = 0
IMPLEMENTATION_SCOPE_FINITE = false
PRM2_IMPLEMENTATION_READY = false
PRM2_IMPLEMENTATION_AUTHORIZED = false
PRM2_PRINCIPAL_IMPLEMENTATION_PROMPT_CONSUMED = false
PRM2_CORRECTIVE_IMPLEMENTATION_PROMPT_CONSUMED = false
PRM2_REMAINING_IMPLEMENTATION_PROMPT_BUDGET = 2/2
CHATGPT_GITHUB_PROMPT_BUDGET = not_applicable
LOVABLE_IMPLEMENTATION_PROMPT_BUDGET = 2/2
```

## 0. Reconciliação pós-merge

```text
FINAL_EXTERNAL_PLANNING_AUDIT = Accepted
PRM2_PRE_PRINCIPAL_GATE_STATE = Accepted / Merged
PRM2_PLANNING_MERGE_AUTHORIZED = true
PRM2_PLANNING_MERGED = true
PRM2_PLANNING_MERGE_METHOD = squash
PRM2_PLANNING_MERGE_SHA = fc055cb69c2373a4adbc99d4ac02614ecfbde74f
PRM2_PLANNING_MERGED_AT = 2026-07-27T19:33:37Z

PLANNING_PR = 58
PLANNING_HEAD = e51a05876e0d4d30f31fbe822e0221873642eae6
PLANNING_RELEASE_GATE_RUN_ID = 30296162677
PLANNING_RELEASE_GATE_JOB_ID = 90077707894
PLANNING_RELEASE_GATE_ARTIFACT_ID = 8664785012
PLANNING_RELEASE_GATE_ARTIFACT_DIGEST = sha256:3af399ba8c78764b0d661addaac96429a88c7cc950c8f28717ff12d72c1f93b5

POST_MERGE_RELEASE_GATE_RUN_ID = 30298768659
POST_MERGE_RELEASE_GATE_JOB_ID = 90086242677
POST_MERGE_RELEASE_GATE_EVENT = push
POST_MERGE_RELEASE_GATE_BRANCH = main
POST_MERGE_RELEASE_GATE_EXPECTED_SHA = fc055cb69c2373a4adbc99d4ac02614ecfbde74f
POST_MERGE_RELEASE_GATE_CHECKED_OUT_SHA = fc055cb69c2373a4adbc99d4ac02614ecfbde74f
POST_MERGE_RELEASE_GATE_EXACT_HEAD_MATCH = true
POST_MERGE_RELEASE_GATE_MERGE_REF_USED = false
POST_MERGE_RELEASE_GATE_RESULT = success
POST_MERGE_RELEASE_GATE_ARTIFACT_NAME = release-gate-fc055cb69c2373a4adbc99d4ac02614ecfbde74f
POST_MERGE_RELEASE_GATE_ARTIFACT_ID = 8665766909
POST_MERGE_RELEASE_GATE_ARTIFACT_DIGEST = sha256:4648fae81bb752207ac6de062d592a0be6a3166b789d5a63207ceeb5312ad778
POST_MERGE_RELEASE_GATE_ARTIFACT_EXPIRED = false

PLANNING_ACCEPTED_AND_MERGED = true
IMPLEMENTATION_ACCEPTED = false
PRM2_STATE = Planned — Blocked
IMPLEMENTATION_SCOPE_FINITE = false
PRM2_IMPLEMENTATION_READY = false
PRM2_IMPLEMENTATION_AUTHORIZED = false
READY_FOR_PRM2_PRINCIPAL_PROMPT = false

CHATGPT_GITHUB_PROMPT_BUDGET = not_applicable
LOVABLE_IMPLEMENTATION_PROMPT_BUDGET = 2/2
LOVABLE_PRINCIPAL_IMPLEMENTATION_PROMPT_CONSUMED = false
LOVABLE_CORRECTIVE_IMPLEMENTATION_PROMPT_CONSUMED = false

PRM3_STATE = Planned — Blocked by PR-M2
PRM3_IMPLEMENTATION_AUTHORIZED = false
NEXT_STAGE_AUTHORIZED = none
RECONCILIATION_READY_FOR_FINAL_DIRECT_EXTERNAL_AUDIT = true
```

## 1. Método

O SHA `985a48e26c72c36aa80cac21ab32c768dac84c17` foi auditado diretamente. Rotas, componentes e tabelas isoladas não foram aceitos como prova: `IMPLEMENTED_AND_VALIDATED` exige runtime, autoridade, persistência, teste e ausência de dual path material.

## 2. Resultado

|CLASSIFICATION|COUNT|
|---|---:|
| IMPLEMENTED_AND_VALIDATED | 32 |
| IMPLEMENTED_BUT_INCOMPLETE | 116 |
| LEGACY_OR_DUAL_PATH | 15 |
| MISSING | 65 |
| BLOCKED | 0 |
| REQUIRES_REDESIGN | 13 |
| REQUIRES_SEPARATE_GATE | 2 |
| FUTURE_COMMERCIAL_SCOPE | 5 |

```text
CAPABILITIES_AUDITED = 248
IMPLEMENTED_AND_VALIDATED_COUNT = 32
IMPLEMENTED_BUT_INCOMPLETE_COUNT = 116
LEGACY_OR_DUAL_PATH_COUNT = 15
MISSING_COUNT = 65
BLOCKED_COUNT = 0
REQUIRES_REDESIGN_COUNT = 13
REQUIRES_SEPARATE_GATE_COUNT = 2
FUTURE_COMMERCIAL_SCOPE_COUNT = 5
UNCLASSIFIED_CAPABILITIES = 0
```

## 3. Legenda

```text
F0/F1/F2 = frontend ausente/parcial/comprovado
S0/S1/S2 = server boundary ausente/parcial/canônico
D0/D1/D2 = persistência ausente/parcial/materializada
A0/A1/A2 = autorização ausente/parcial/canônica
T0/T1/T2 = teste ausente/parcial/aceito
TI0/TI1/TI2 = isolamento preservado/dependente/em risco
C0/C1/C2/C3/C4/C5/C6/C7 = preservar/completar/eliminar dual path/implementar/resolver bloqueio/redesenhar/decisão autônoma/futuro
AE = teste determinístico + Release Gate + auditoria direta
```

## 4. Achados estruturais

- `requireTenant`, Host authority, public lead writer, typed lead transition e runtime comercial são autoridades aceitas.
- `admin.functions.ts`, `rbac.functions.ts`, `_cms.ts`, `portals.functions.ts`, `dashboard.functions.ts` e partes de `leads-crm.functions.ts` mantêm authority boundaries paralelos.
- `adminRemoverImagem` aceita path do client.
- `_cms.assertCmsPermission` permite Super Admin tenant-scoped sem impersonação.
- Portal Connector Registry canônico não está materializado.
- Cloudflare e commercial admin authorization exigem decisões autônomas.

```text
IMPLEMENTATION_SCOPE_FINITE = false
PRM2_IMPLEMENTATION_READY = false
```

## 5. Matriz

### TENANT_LIFECYCLE

|CAPABILITY_ID|DOMAIN|CAPABILITY|USER_ROLE|EXPECTED_FLOW|CURRENT_FRONTEND|CURRENT_SERVER_BOUNDARY|CURRENT_DATABASE|CURRENT_AUTHORIZATION|CURRENT_TESTS|CURRENT_DOCUMENTATION|CLASSIFICATION|EVIDENCE_FILES|EVIDENCE_SYMBOLS|DEPENDENCIES|SECURITY_IMPACT|TENANT_ISOLATION_IMPACT|REQUIRED_CHANGE|PROPOSED_OWNERSHIP|IN_PRM2_PRINCIPAL_SCOPE|REQUIRES_SEPARATE_GATE|BLOCKING_REASON|ACCEPTANCE_EVIDENCE|
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
|TEN-001|TENANT_LIFECYCLE|Criação de tenant|SA|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|super.functions.ts;_authenticated.super.index.tsx|criarTenant|RPD-01|A|TI1|C1|PR-M2|sim|não|—|AE|
|TEN-002|TENANT_LIFECYCLE|Ativação de tenant|SA|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|super.functions.ts;_authenticated.super.index.tsx|atualizarTenant|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|TEN-003|TENANT_LIFECYCLE|Suspensão de tenant|SA|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|super.functions.ts;_authenticated.super.index.tsx|atualizarTenant|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|TEN-004|TENANT_LIFECYCLE|Reativação de tenant|SA|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|super.functions.ts;_authenticated.super.index.tsx|atualizarTenant|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|TEN-005|TENANT_LIFECYCLE|Arquivamento ou remoção de tenant|SA|E2E|F0|S0|D0|A0|T0|RPD-01|MISSING|super.functions.ts;_authenticated.super.index.tsx|—|RPD-01|A|TI1|C3|PR-M2|sim|não|—|AE|
|TEN-006|TENANT_LIFECYCLE|Onboarding de tenant|SA/TO|E2E|F0|S0|D0|A0|T0|RPD-01|MISSING|super.functions.ts;_authenticated.super.index.tsx|—|RPD-01|A|TI1|C3|PR-M2|sim|não|—|AE|
|TEN-007|TENANT_LIFECYCLE|Administrador inicial|SA|E2E|F1|S1|D2|A1|T0|RPD-01|LEGACY_OR_DUAL_PATH|admin.functions.ts;super.functions.ts|adminCriarUsuarioComLogin;criarTenant|RPD-01|C|TI2|C2|PR-M2|sim|não|—|AE|
|TEN-008|TENANT_LIFECYCLE|Convites de usuários|TA|E2E|F0|S0|D0|A0|T0|RPD-01|MISSING|admin.functions.ts|adminCriarUsuarioComLogin|RPD-01|A|TI1|C3|PR-M2|sim|não|—|AE|
|TEN-009|TENANT_LIFECYCLE|Aceite de membership|UC|E2E|F0|S0|D0|A0|T0|RPD-01|MISSING|tenant-middleware.ts;tenant-repository.ts|membership_status|RPD-01|A|TI1|C3|PR-M2|sim|não|—|AE|
|TEN-010|TENANT_LIFECYCLE|Papéis de usuário|TA|E2E|F1|S1|D2|A1|T0|RPD-01|LEGACY_OR_DUAL_PATH|admin.functions.ts;rbac.functions.ts|aplicarPerfilUsuario;setUserPerfis|RPD-01|A|TI2|C2|PR-M2|sim|não|—|AE|
|TEN-011|TENANT_LIFECYCLE|Permissões RBAC|TA|E2E|F1|S1|D2|A1|T0|RPD-01|LEGACY_OR_DUAL_PATH|rbac.functions.ts;_cms.ts|meusModulos;togglePermissao|RPD-01|C|TI2|C2|PR-M2|sim|não|—|AE|
|TEN-012|TENANT_LIFECYCLE|Tenant switch|UM|E2E|F1|S1|D2|A2|T2|RPD-01|IMPLEMENTED_AND_VALIDATED|tenant-middleware.ts;tenant-repository.ts|requireTenant;resolveTenantContext|RPD-01|A|TI0|C0|PR-M2|sim|não|—|AE|
|TEN-013|TENANT_LIFECYCLE|Configuration Center|TA|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|site.functions.ts;site-versions.functions.ts|site settings;KEY_ENUM|RPD-01|A|TI1|C1|PR-M2|sim|não|—|AE|
|TEN-014|TENANT_LIFECYCLE|White label|TA|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|site.functions.ts;site-versions.functions.ts|branding;branding_v2|RPD-01|A|TI1|C1|PR-M2|sim|não|—|AE|
|TEN-015|TENANT_LIFECYCLE|Diagnóstico de status do tenant|SA|E2E|F2|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|super.functions.ts;_authenticated.super.index.tsx|listarTenants;estatisticasTenants|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|TEN-016|TENANT_LIFECYCLE|Impersonação explícita|SA|E2E|F2|S2|D2|A1|T2|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|tenant-middleware.ts;tenant-repository.ts|resolveTenantContext;origin=impersonation|RPD-01|C|TI1|C1|PR-M2|sim|não|—|AE|
|TEN-017|TENANT_LIFECYCLE|Resolução pública por Host|V|E2E|F2|S2|D2|A2|T2|RPD-01|IMPLEMENTED_AND_VALIDATED|tenant.server.ts;public-tenant-context.spec.ts|requirePublicTenantFromRequest;resolveTenantByHost|RPD-01|C|TI0|C0|PR-M2|sim|não|—|AE|

### DOMAINS_CLOUDFLARE

|CAPABILITY_ID|DOMAIN|CAPABILITY|USER_ROLE|EXPECTED_FLOW|CURRENT_FRONTEND|CURRENT_SERVER_BOUNDARY|CURRENT_DATABASE|CURRENT_AUTHORIZATION|CURRENT_TESTS|CURRENT_DOCUMENTATION|CLASSIFICATION|EVIDENCE_FILES|EVIDENCE_SYMBOLS|DEPENDENCIES|SECURITY_IMPACT|TENANT_ISOLATION_IMPACT|REQUIRED_CHANGE|PROPOSED_OWNERSHIP|IN_PRM2_PRINCIPAL_SCOPE|REQUIRES_SEPARATE_GATE|BLOCKING_REASON|ACCEPTANCE_EVIDENCE|
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
|DOM-001|DOMAINS_CLOUDFLARE|Domínio customizado|TA/SA|E2E|F1|S0|D2|A0|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|super.functions.ts;tenant.server.ts|atualizarTenant;resolveTenantByHost|RPD-01|C|TI1|C1|PR-M2|sim|não|—|AE|
|DOM-002|DOMAINS_CLOUDFLARE|Canonical host|TA/SA|E2E|F1|S2|D2|A2|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|super.functions.ts;tenant.server.ts|atualizarTenant;resolveTenantByHost|RPD-01|C|TI1|C1|PR-M2|sim|não|—|AE|
|DOM-003|DOMAINS_CLOUDFLARE|Configuração DNS|TA/SA|E2E|F0|S0|D0|A0|T0|RPD-01|MISSING|super.functions.ts;tenant.server.ts|atualizarTenant;resolveTenantByHost|RPD-01|C|TI1|C3|PR-M2|sim|não|—|AE|
|DOM-004|DOMAINS_CLOUDFLARE|Verificação TXT|TA/SA|E2E|F0|S0|D0|A0|T0|RPD-01|MISSING|super.functions.ts;tenant.server.ts|atualizarTenant;resolveTenantByHost|RPD-01|C|TI1|C3|PR-M2|sim|não|—|AE|
|DOM-005|DOMAINS_CLOUDFLARE|Ciclo de SSL|TA/SA|E2E|F0|S0|D0|A0|T0|RPD-01|MISSING|super.functions.ts;tenant.server.ts|atualizarTenant;resolveTenantByHost|RPD-01|C|TI1|C3|PR-M2|sim|não|—|AE|
|DOM-006|DOMAINS_CLOUDFLARE|Anti-takeover|TA/SA|E2E|F0|S0|D0|A0|T0|RPD-01|MISSING|super.functions.ts;tenant.server.ts|atualizarTenant;resolveTenantByHost|RPD-01|C|TI1|C3|PR-M2|sim|não|—|AE|
|DOM-007|DOMAINS_CLOUDFLARE|Redirects de domínio|TA/SA|E2E|F0|S0|D0|A0|T0|RPD-01|MISSING|super.functions.ts;tenant.server.ts|atualizarTenant;resolveTenantByHost|RPD-01|C|TI1|C3|PR-M2|sim|não|—|AE|
|DOM-008|DOMAINS_CLOUDFLARE|Publicação de domínio|TA/SA|E2E|F0|S0|D0|A0|T0|RPD-01|MISSING|super.functions.ts;tenant.server.ts|atualizarTenant;resolveTenantByHost|RPD-01|C|TI1|C3|PR-M2|sim|não|—|AE|
|DOM-009|DOMAINS_CLOUDFLARE|Rollback de domínio|TA/SA|E2E|F0|S0|D0|A0|T0|RPD-01|MISSING|super.functions.ts;tenant.server.ts|atualizarTenant;resolveTenantByHost|RPD-01|C|TI1|C3|PR-M2|sim|não|—|AE|
|DOM-010|DOMAINS_CLOUDFLARE|Status de domínio|TA/SA|E2E|F0|S0|D2|A0|T0|RPD-01|MISSING|super.functions.ts;tenant.server.ts|atualizarTenant;resolveTenantByHost|RPD-01|C|TI1|C3|PR-M2|sim|não|—|AE|
|DOM-011|DOMAINS_CLOUDFLARE|Diagnósticos de domínio|TA/SA|E2E|F0|S0|D0|A0|T0|RPD-01|MISSING|super.functions.ts;tenant.server.ts|atualizarTenant;resolveTenantByHost|RPD-01|C|TI1|C3|PR-M2|sim|não|—|AE|
|DOM-012|DOMAINS_CLOUDFLARE|Integração Cloudflare|TA/SA|E2E|F0|S0|D0|A0|T0|RPD-01|REQUIRES_SEPARATE_GATE|super.functions.ts;tenant.server.ts|atualizarTenant;resolveTenantByHost|RPD-01|C|TI1|C6|PR-M2|não|sim|Decisão de integração externa|AE|
|DOM-013|DOMAINS_CLOUDFLARE|Credenciais Cloudflare|TA/SA|E2E|F0|S0|D0|A0|T0|RPD-01|MISSING|super.functions.ts;tenant.server.ts|atualizarTenant;resolveTenantByHost|RPD-01|C|TI1|C3|PR-M2|sim|não|—|AE|
|DOM-014|DOMAINS_CLOUDFLARE|Tratamento de falhas Cloudflare|TA/SA|E2E|F0|S0|D0|A0|T0|RPD-01|MISSING|super.functions.ts;tenant.server.ts|atualizarTenant;resolveTenantByHost|RPD-01|C|TI1|C3|PR-M2|sim|não|—|AE|

### PORTAL_CONNECTORS

|CAPABILITY_ID|DOMAIN|CAPABILITY|USER_ROLE|EXPECTED_FLOW|CURRENT_FRONTEND|CURRENT_SERVER_BOUNDARY|CURRENT_DATABASE|CURRENT_AUTHORIZATION|CURRENT_TESTS|CURRENT_DOCUMENTATION|CLASSIFICATION|EVIDENCE_FILES|EVIDENCE_SYMBOLS|DEPENDENCIES|SECURITY_IMPACT|TENANT_ISOLATION_IMPACT|REQUIRED_CHANGE|PROPOSED_OWNERSHIP|IN_PRM2_PRINCIPAL_SCOPE|REQUIRES_SEPARATE_GATE|BLOCKING_REASON|ACCEPTANCE_EVIDENCE|
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
|POR-001|PORTAL_CONNECTORS|Portal Connector Registry|TA/SA|E2E|F1|S1|D2|A1|T0|RPD-01|REQUIRES_REDESIGN|portals.functions.ts;portal-lead-ingestion.server.ts|listarPortais;atualizarPortal|RPD-01|C|TI2|C5|PR-M2|sim|não|—|AE|
|POR-002|PORTAL_CONNECTORS|portal_name configurável|TA/SA|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|portals.functions.ts;portal-lead-ingestion.server.ts|listarPortais;atualizarPortal|RPD-01|C|TI1|C1|PR-M2|sim|não|—|AE|
|POR-003|PORTAL_CONNECTORS|portal_status|TA/SA|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|portals.functions.ts;portal-lead-ingestion.server.ts|listarPortais;atualizarPortal|RPD-01|C|TI1|C1|PR-M2|sim|não|—|AE|
|POR-004|PORTAL_CONNECTORS|integration_method declarado e validado|TA/SA|E2E|F1|S1|D2|A1|T0|RPD-01|REQUIRES_REDESIGN|portals.functions.ts;portal-lead-ingestion.server.ts|listarPortais;atualizarPortal|RPD-01|C|TI2|C5|PR-M2|sim|não|—|AE|
|POR-005|PORTAL_CONNECTORS|configuration_schema|TA/SA|E2E|F1|S1|D2|A1|T0|RPD-01|MISSING|portals.functions.ts;portal-lead-ingestion.server.ts|listarPortais;atualizarPortal|RPD-01|C|TI1|C3|PR-M2|sim|não|—|AE|
|POR-006|PORTAL_CONNECTORS|credential_reference|TA/SA|E2E|F1|S1|D2|A1|T0|RPD-01|MISSING|portals.functions.ts;portal-lead-ingestion.server.ts|listarPortais;atualizarPortal|RPD-01|C|TI1|C3|PR-M2|sim|não|—|AE|
|POR-007|PORTAL_CONNECTORS|feed_or_endpoint|TA/SA|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|portals.functions.ts;portal-lead-ingestion.server.ts|listarPortais;atualizarPortal|RPD-01|C|TI1|C1|PR-M2|sim|não|—|AE|
|POR-008|PORTAL_CONNECTORS|mapping_profile|TA/SA|E2E|F1|S1|D2|A1|T0|RPD-01|MISSING|portals.functions.ts;portal-lead-ingestion.server.ts|listarPortais;atualizarPortal|RPD-01|C|TI1|C3|PR-M2|sim|não|—|AE|
|POR-009|PORTAL_CONNECTORS|publication_rules|TA/SA|E2E|F1|S1|D2|A1|T0|RPD-01|MISSING|portals.functions.ts;portal-lead-ingestion.server.ts|listarPortais;atualizarPortal|RPD-01|C|TI1|C3|PR-M2|sim|não|—|AE|
|POR-010|PORTAL_CONNECTORS|last_sync_status|TA/SA|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|portals.functions.ts;portal-lead-ingestion.server.ts|listarPortais;atualizarPortal|RPD-01|C|TI1|C1|PR-M2|sim|não|—|AE|
|POR-011|PORTAL_CONNECTORS|last_sync_at|TA/SA|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|portals.functions.ts;portal-lead-ingestion.server.ts|listarPortais;atualizarPortal|RPD-01|C|TI1|C1|PR-M2|sim|não|—|AE|
|POR-012|PORTAL_CONNECTORS|error_state|TA/SA|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|portals.functions.ts;portal-lead-ingestion.server.ts|listarPortais;atualizarPortal|RPD-01|C|TI1|C1|PR-M2|sim|não|—|AE|
|POR-013|PORTAL_CONNECTORS|JSON/API adapter|TA/SA|E2E|F1|S1|D2|A1|T0|RPD-01|MISSING|portals.functions.ts;portal-lead-ingestion.server.ts|listarPortais;atualizarPortal|RPD-01|C|TI1|C3|PR-M2|sim|não|—|AE|
|POR-014|PORTAL_CONNECTORS|XML feed|TA/SA|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|portals.functions.ts;portal-lead-ingestion.server.ts|listarPortais;atualizarPortal|RPD-01|C|TI1|C1|PR-M2|sim|não|—|AE|
|POR-015|PORTAL_CONNECTORS|XLSX adapter|TA/SA|E2E|F1|S1|D2|A1|T0|RPD-01|MISSING|portals.functions.ts;portal-lead-ingestion.server.ts|listarPortais;atualizarPortal|RPD-01|C|TI1|C3|PR-M2|sim|não|—|AE|
|POR-016|PORTAL_CONNECTORS|CSV adapter|TA/SA|E2E|F1|S1|D2|A1|T0|RPD-01|MISSING|portals.functions.ts;portal-lead-ingestion.server.ts|listarPortais;atualizarPortal|RPD-01|C|TI1|C3|PR-M2|sim|não|—|AE|
|POR-017|PORTAL_CONNECTORS|Webhook adapter|TA/SA|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|portals.functions.ts;portal-lead-ingestion.server.ts|listarPortais;atualizarPortal|RPD-01|C|TI1|C1|PR-M2|sim|não|—|AE|
|POR-018|PORTAL_CONNECTORS|Manual export|TA/SA|E2E|F1|S1|D2|A1|T0|RPD-01|MISSING|portals.functions.ts;portal-lead-ingestion.server.ts|listarPortais;atualizarPortal|RPD-01|C|TI1|C3|PR-M2|sim|não|—|AE|
|POR-019|PORTAL_CONNECTORS|Custom adapters|TA/SA|E2E|F1|S1|D2|A1|T0|RPD-01|MISSING|portals.functions.ts;portal-lead-ingestion.server.ts|listarPortais;atualizarPortal|RPD-01|C|TI1|C3|PR-M2|sim|não|—|AE|
|POR-020|PORTAL_CONNECTORS|Seleção de nenhum, um ou múltiplos imóveis|TA/SA|E2E|F1|S2|D2|A2|T2|RPD-01|IMPLEMENTED_AND_VALIDATED|portals.functions.ts;portal-lead-ingestion.server.ts|listarPortais;atualizarPortal|RPD-01|C|TI0|C0|PR-M2|sim|não|—|AE|
|POR-021|PORTAL_CONNECTORS|Retries e DLQ|TA/SA|E2E|F1|S1|D2|A1|T2|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|portals.functions.ts;portal-lead-ingestion.server.ts|listarPortais;atualizarPortal|RPD-01|C|TI1|C1|PR-M2|sim|não|—|AE|
|POR-022|PORTAL_CONNECTORS|Idempotência|TA/SA|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|portals.functions.ts;portal-lead-ingestion.server.ts|listarPortais;atualizarPortal|RPD-01|C|TI1|C1|PR-M2|sim|não|—|AE|
|POR-023|PORTAL_CONNECTORS|Observabilidade de portais|TA/SA|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|portals.functions.ts;portal-lead-ingestion.server.ts|listarPortais;atualizarPortal|RPD-01|C|TI1|C1|PR-M2|sim|não|—|AE|

### MARKETING_TRACKING

|CAPABILITY_ID|DOMAIN|CAPABILITY|USER_ROLE|EXPECTED_FLOW|CURRENT_FRONTEND|CURRENT_SERVER_BOUNDARY|CURRENT_DATABASE|CURRENT_AUTHORIZATION|CURRENT_TESTS|CURRENT_DOCUMENTATION|CLASSIFICATION|EVIDENCE_FILES|EVIDENCE_SYMBOLS|DEPENDENCIES|SECURITY_IMPACT|TENANT_ISOLATION_IMPACT|REQUIRED_CHANGE|PROPOSED_OWNERSHIP|IN_PRM2_PRINCIPAL_SCOPE|REQUIRES_SEPARATE_GATE|BLOCKING_REASON|ACCEPTANCE_EVIDENCE|
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
|MKT-001|MARKETING_TRACKING|Meta Ads|TA/S|E2E|F1|S0|D0|A0|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|forms.functions.ts;public-lead-writer.server.ts|writePublicLead;PublicLeadAttribution|RPD-01|A|TI1|C1|PR-M2|sim|não|—|AE|
|MKT-002|MARKETING_TRACKING|Google Ads|TA/S|E2E|F1|S0|D0|A0|T0|RPD-01|MISSING|forms.functions.ts;public-lead-writer.server.ts|writePublicLead;PublicLeadAttribution|RPD-01|A|TI1|C3|PR-M2|sim|não|—|AE|
|MKT-003|MARKETING_TRACKING|Meta Pixel|TA/S|E2E|F1|S0|D0|A0|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|forms.functions.ts;public-lead-writer.server.ts|writePublicLead;PublicLeadAttribution|RPD-01|A|TI1|C1|PR-M2|sim|não|—|AE|
|MKT-004|MARKETING_TRACKING|LinkedIn Ads|TA/S|E2E|F1|S0|D0|A0|T0|RPD-01|MISSING|forms.functions.ts;public-lead-writer.server.ts|writePublicLead;PublicLeadAttribution|RPD-01|A|TI1|C3|PR-M2|sim|não|—|AE|
|MKT-005|MARKETING_TRACKING|TikTok Ads|TA/S|E2E|F1|S0|D0|A0|T0|RPD-01|MISSING|forms.functions.ts;public-lead-writer.server.ts|writePublicLead;PublicLeadAttribution|RPD-01|A|TI1|C3|PR-M2|sim|não|—|AE|
|MKT-006|MARKETING_TRACKING|Google Analytics|TA/S|E2E|F1|S0|D0|A0|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|forms.functions.ts;public-lead-writer.server.ts|writePublicLead;PublicLeadAttribution|RPD-01|A|TI1|C1|PR-M2|sim|não|—|AE|
|MKT-007|MARKETING_TRACKING|Google Tag Manager|TA/S|E2E|F1|S0|D0|A0|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|forms.functions.ts;public-lead-writer.server.ts|writePublicLead;PublicLeadAttribution|RPD-01|A|TI1|C1|PR-M2|sim|não|—|AE|
|MKT-008|MARKETING_TRACKING|Captura UTM|TA/S|E2E|F2|S1|D2|A2|T2|RPD-01|IMPLEMENTED_AND_VALIDATED|forms.functions.ts;public-lead-writer.server.ts|writePublicLead;PublicLeadAttribution|RPD-01|A|TI0|C0|PR-M2|sim|não|—|AE|
|MKT-009|MARKETING_TRACKING|Atribuição de conversão|TA/S|E2E|F1|S0|D2|A0|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|forms.functions.ts;public-lead-writer.server.ts|writePublicLead;PublicLeadAttribution|RPD-01|A|TI1|C1|PR-M2|sim|não|—|AE|
|MKT-010|MARKETING_TRACKING|Ingestão automática de campanhas|TA/S|E2E|F1|S0|D0|A0|T0|RPD-01|MISSING|forms.functions.ts;public-lead-writer.server.ts|writePublicLead;PublicLeadAttribution|RPD-01|A|TI1|C3|PR-M2|sim|não|—|AE|
|MKT-011|MARKETING_TRACKING|Proveniência do lead|TA/S|E2E|F2|S1|D2|A2|T2|RPD-01|IMPLEMENTED_AND_VALIDATED|forms.functions.ts;public-lead-writer.server.ts|writePublicLead;PublicLeadAttribution|RPD-01|A|TI0|C0|PR-M2|sim|não|—|AE|
|MKT-012|MARKETING_TRACKING|Deduplicação de lead|TA/S|E2E|F1|S1|D2|A2|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|forms.functions.ts;public-lead-writer.server.ts|writePublicLead;PublicLeadAttribution|RPD-01|A|TI1|C1|PR-M2|sim|não|—|AE|
|MKT-013|MARKETING_TRACKING|Estágio inicial do Kanban|TA/S|E2E|F2|S1|D2|A2|T2|RPD-01|IMPLEMENTED_AND_VALIDATED|forms.functions.ts;public-lead-writer.server.ts|writePublicLead;PublicLeadAttribution|RPD-01|A|TI0|C0|PR-M2|sim|não|—|AE|
|MKT-014|MARKETING_TRACKING|Atribuição inicial|TA/S|E2E|F2|S1|D2|A2|T2|RPD-01|IMPLEMENTED_AND_VALIDATED|forms.functions.ts;public-lead-writer.server.ts|writePublicLead;PublicLeadAttribution|RPD-01|A|TI0|C0|PR-M2|sim|não|—|AE|
|MKT-015|MARKETING_TRACKING|Histórico inicial|TA/S|E2E|F1|S1|D2|A2|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|forms.functions.ts;public-lead-writer.server.ts|writePublicLead;PublicLeadAttribution|RPD-01|A|TI1|C1|PR-M2|sim|não|—|AE|
|MKT-016|MARKETING_TRACKING|Armazenamento de credenciais de canais|TA/S|E2E|F1|S0|D0|A0|T0|RPD-01|MISSING|forms.functions.ts;public-lead-writer.server.ts|writePublicLead;PublicLeadAttribution|RPD-01|A|TI1|C3|PR-M2|sim|não|—|AE|
|MKT-017|MARKETING_TRACKING|Webhook ou polling de canais|TA/S|E2E|F1|S0|D0|A0|T0|RPD-01|MISSING|forms.functions.ts;public-lead-writer.server.ts|writePublicLead;PublicLeadAttribution|RPD-01|A|TI1|C3|PR-M2|sim|não|—|AE|
|MKT-018|MARKETING_TRACKING|Administração frontend de tracking|TA/S|E2E|F1|S0|D0|A0|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|forms.functions.ts;public-lead-writer.server.ts|writePublicLead;PublicLeadAttribution|RPD-01|A|TI1|C1|PR-M2|sim|não|—|AE|
|MKT-019|MARKETING_TRACKING|Observabilidade de ingestão|TA/S|E2E|F1|S0|D0|A0|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|forms.functions.ts;public-lead-writer.server.ts|writePublicLead;PublicLeadAttribution|RPD-01|A|TI1|C1|PR-M2|sim|não|—|AE|
|MKT-020|MARKETING_TRACKING|Tratamento de falhas de ingestão|TA/S|E2E|F1|S0|D0|A0|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|forms.functions.ts;public-lead-writer.server.ts|writePublicLead;PublicLeadAttribution|RPD-01|A|TI1|C1|PR-M2|sim|não|—|AE|

### PROPERTY_CATALOG

|CAPABILITY_ID|DOMAIN|CAPABILITY|USER_ROLE|EXPECTED_FLOW|CURRENT_FRONTEND|CURRENT_SERVER_BOUNDARY|CURRENT_DATABASE|CURRENT_AUTHORIZATION|CURRENT_TESTS|CURRENT_DOCUMENTATION|CLASSIFICATION|EVIDENCE_FILES|EVIDENCE_SYMBOLS|DEPENDENCIES|SECURITY_IMPACT|TENANT_ISOLATION_IMPACT|REQUIRED_CHANGE|PROPOSED_OWNERSHIP|IN_PRM2_PRINCIPAL_SCOPE|REQUIRES_SEPARATE_GATE|BLOCKING_REASON|ACCEPTANCE_EVIDENCE|
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
|CAT-001|PROPERTY_CATALOG|Listagem administrativa de imóveis|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|REQUIRES_REDESIGN|admin.functions.ts;catalogo.functions.ts|adminListarImoveis;adminSalvarImovel|RPD-01|C|TI2|C5|PR-M2|sim|não|—|AE|
|CAT-002|PROPERTY_CATALOG|Detalhe administrativo de imóvel|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|REQUIRES_REDESIGN|admin.functions.ts;catalogo.functions.ts|adminListarImoveis;adminSalvarImovel|RPD-01|C|TI2|C5|PR-M2|sim|não|—|AE|
|CAT-003|PROPERTY_CATALOG|Criação e edição de imóvel|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|REQUIRES_REDESIGN|admin.functions.ts;catalogo.functions.ts|adminListarImoveis;adminSalvarImovel|RPD-01|C|TI2|C5|PR-M2|sim|não|—|AE|
|CAT-004|PROPERTY_CATALOG|Exclusão de imóvel|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|REQUIRES_REDESIGN|admin.functions.ts;catalogo.functions.ts|adminListarImoveis;adminSalvarImovel|RPD-01|C|TI2|C5|PR-M2|sim|não|—|AE|
|CAT-005|PROPERTY_CATALOG|Imagens de imóvel|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|REQUIRES_REDESIGN|admin.functions.ts;catalogo.functions.ts|adminListarImoveis;adminSalvarImovel|RPD-01|C|TI2|C5|PR-M2|sim|não|—|AE|
|CAT-006|PROPERTY_CATALOG|Capa e ordenação de imagens|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|LEGACY_OR_DUAL_PATH|admin.functions.ts;catalogo.functions.ts|adminListarImoveis;adminSalvarImovel|RPD-01|C|TI2|C2|PR-M2|sim|não|—|AE|
|CAT-007|PROPERTY_CATALOG|Listagem pública de imóveis|TA/V|E2E|F1|S2|D2|A2|T2|RPD-01|IMPLEMENTED_AND_VALIDATED|admin.functions.ts;catalogo.functions.ts|adminListarImoveis;adminSalvarImovel|RPD-01|C|TI0|C0|PR-M2|sim|não|—|AE|
|CAT-008|PROPERTY_CATALOG|Detalhe público de imóvel|TA/V|E2E|F1|S2|D2|A2|T2|RPD-01|IMPLEMENTED_AND_VALIDATED|admin.functions.ts;catalogo.functions.ts|adminListarImoveis;adminSalvarImovel|RPD-01|C|TI0|C0|PR-M2|sim|não|—|AE|
|CAT-009|PROPERTY_CATALOG|CRUD de lançamentos|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|LEGACY_OR_DUAL_PATH|admin.functions.ts;catalogo.functions.ts|adminListarImoveis;adminSalvarImovel|RPD-01|C|TI2|C2|PR-M2|sim|não|—|AE|
|CAT-010|PROPERTY_CATALOG|Listagem pública de lançamentos|TA/V|E2E|F1|S2|D2|A2|T2|RPD-01|IMPLEMENTED_AND_VALIDATED|admin.functions.ts;catalogo.functions.ts|adminListarImoveis;adminSalvarImovel|RPD-01|C|TI0|C0|PR-M2|sim|não|—|AE|
|CAT-011|PROPERTY_CATALOG|Cidades administrativas|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|REQUIRES_REDESIGN|admin.functions.ts;catalogo.functions.ts|adminListarImoveis;adminSalvarImovel|RPD-01|C|TI2|C5|PR-M2|sim|não|—|AE|
|CAT-012|PROPERTY_CATALOG|Bairros administrativos|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|REQUIRES_REDESIGN|admin.functions.ts;catalogo.functions.ts|adminListarImoveis;adminSalvarImovel|RPD-01|C|TI2|C5|PR-M2|sim|não|—|AE|
|CAT-013|PROPERTY_CATALOG|Cidades e bairros públicos|TA/V|E2E|F1|S2|D2|A2|T2|RPD-01|IMPLEMENTED_AND_VALIDATED|admin.functions.ts;catalogo.functions.ts|adminListarImoveis;adminSalvarImovel|RPD-01|C|TI0|C0|PR-M2|sim|não|—|AE|

### CMS

|CAPABILITY_ID|DOMAIN|CAPABILITY|USER_ROLE|EXPECTED_FLOW|CURRENT_FRONTEND|CURRENT_SERVER_BOUNDARY|CURRENT_DATABASE|CURRENT_AUTHORIZATION|CURRENT_TESTS|CURRENT_DOCUMENTATION|CLASSIFICATION|EVIDENCE_FILES|EVIDENCE_SYMBOLS|DEPENDENCIES|SECURITY_IMPACT|TENANT_ISOLATION_IMPACT|REQUIRED_CHANGE|PROPOSED_OWNERSHIP|IN_PRM2_PRINCIPAL_SCOPE|REQUIRES_SEPARATE_GATE|BLOCKING_REASON|ACCEPTANCE_EVIDENCE|
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
|CMS-001|CMS|Content Workspace|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CMS-002|CMS|Editor universal|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CMS-003|CMS|Adapters de conteúdo|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CMS-004|CMS|Dispatcher|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CMS-005|CMS|Formulários metadata-driven|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CMS-006|CMS|Page builder|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CMS-007|CMS|Landing page builder|TA/V|E2E|F0|S0|D2|A1|T0|RPD-01|MISSING|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C3|PR-M2|sim|não|—|AE|
|CMS-008|CMS|Layouts|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CMS-009|CMS|Seções|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CMS-010|CMS|Blocos|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CMS-011|CMS|Widgets|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CMS-012|CMS|Templates|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CMS-013|CMS|Menus|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CMS-014|CMS|Cabeçalhos|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CMS-015|CMS|Rodapés|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CMS-016|CMS|Grids|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CMS-017|CMS|Colunas|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CMS-018|CMS|Cards|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CMS-019|CMS|Galerias|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CMS-020|CMS|Vídeos|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CMS-021|CMS|Tours|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CMS-022|CMS|Formulários administráveis|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CMS-023|CMS|CTAs|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CMS-024|CMS|Depoimentos|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CMS-025|CMS|Listagens de imóveis|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CMS-026|CMS|Listagens de lançamentos|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CMS-027|CMS|Equipes|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CMS-028|CMS|Contatos|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CMS-029|CMS|Mapas|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CMS-030|CMS|Embeds|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CMS-031|CMS|Rich text|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CMS-032|CMS|Preview|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CMS-033|CMS|Versionamento|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CMS-034|CMS|Agendamento|TA/V|E2E|F0|S0|D2|A1|T0|RPD-01|MISSING|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C3|PR-M2|sim|não|—|AE|
|CMS-035|CMS|Publicação|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CMS-036|CMS|Rollback|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CMS-037|CMS|Permissões CMS|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|REQUIRES_REDESIGN|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|C|TI2|C5|PR-M2|sim|não|—|AE|
|CMS-038|CMS|Workflow editorial|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CMS-039|CMS|Biblioteca de mídia|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|media.functions.ts;signed-url.ts|listarMidias;registrarMidia|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CMS-040|CMS|SEO|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CMS-041|CMS|Responsividade|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CMS-042|CMS|Blocos reutilizáveis|TA/V|E2E|F0|S0|D2|A1|T0|RPD-01|MISSING|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C3|PR-M2|sim|não|—|AE|
|CMS-043|CMS|Temas|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CMS-044|CMS|Customização data-driven por tenant|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CMS-045|CMS|CMS Component and Layout Registry|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|REQUIRES_REDESIGN|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|C|TI2|C5|PR-M2|sim|não|—|AE|
|CMS-046|CMS|Extensão NEW_LAYOUT|TA/V|E2E|F0|S0|D2|A1|T0|RPD-01|MISSING|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C3|PR-M2|sim|não|—|AE|
|CMS-047|CMS|Extensão NEW_SECTION|TA/V|E2E|F0|S0|D2|A1|T0|RPD-01|MISSING|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C3|PR-M2|sim|não|—|AE|
|CMS-048|CMS|Extensão NEW_BLOCK|TA/V|E2E|F0|S0|D2|A1|T0|RPD-01|MISSING|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C3|PR-M2|sim|não|—|AE|
|CMS-049|CMS|Extensão NEW_WIDGET|TA/V|E2E|F0|S0|D2|A1|T0|RPD-01|MISSING|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C3|PR-M2|sim|não|—|AE|
|CMS-050|CMS|Extensão NEW_TEMPLATE|TA/V|E2E|F0|S0|D2|A1|T0|RPD-01|MISSING|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C3|PR-M2|sim|não|—|AE|
|CMS-051|CMS|Extensão NEW_CONTENT_TYPE|TA/V|E2E|F0|S0|D2|A1|T0|RPD-01|MISSING|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C3|PR-M2|sim|não|—|AE|
|CMS-052|CMS|Extensão NEW_EDITOR_CONTROL|TA/V|E2E|F0|S0|D2|A1|T0|RPD-01|MISSING|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C3|PR-M2|sim|não|—|AE|
|CMS-053|CMS|Extensão NEW_TENANT_CONFIGURATION|TA/V|E2E|F0|S0|D2|A1|T0|RPD-01|MISSING|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C3|PR-M2|sim|não|—|AE|
|CMS-054|CMS|Renderização pública de páginas|TA/V|E2E|F1|S1|D2|A2|T2|RPD-01|IMPLEMENTED_AND_VALIDATED|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI0|C0|PR-M2|sim|não|—|AE|
|CMS-055|CMS|Submissão pública de formulários|TA/V|E2E|F1|S1|D2|A2|T2|RPD-01|IMPLEMENTED_AND_VALIDATED|forms.functions.ts;public-lead-writer.server.ts|obterFormPublicoPorSlug;writePublicLead|RPD-01|M|TI0|C0|PR-M2|sim|não|—|AE|
|CMS-056|CMS|Campanhas públicas e eventos|TA/V|E2E|F1|S1|D2|A2|T2|RPD-01|IMPLEMENTED_AND_VALIDATED|campaigns.functions.ts;public-campaign-writer.server.ts|listarCampanhasAtivas;registrarEventoCampanha|RPD-01|M|TI0|C0|PR-M2|sim|não|—|AE|
|CMS-057|CMS|Boundary administrativo tenant-scoped|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|LEGACY_OR_DUAL_PATH|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|C|TI2|C2|PR-M2|sim|não|—|AE|
|CMS-058|CMS|Auditoria de mutações CMS|TA/V|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|pages.functions.ts;_cms.ts|assertCmsPermission;salvarPagina|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|

### CRM

|CAPABILITY_ID|DOMAIN|CAPABILITY|USER_ROLE|EXPECTED_FLOW|CURRENT_FRONTEND|CURRENT_SERVER_BOUNDARY|CURRENT_DATABASE|CURRENT_AUTHORIZATION|CURRENT_TESTS|CURRENT_DOCUMENTATION|CLASSIFICATION|EVIDENCE_FILES|EVIDENCE_SYMBOLS|DEPENDENCIES|SECURITY_IMPACT|TENANT_ISOLATION_IMPACT|REQUIRED_CHANGE|PROPOSED_OWNERSHIP|IN_PRM2_PRINCIPAL_SCOPE|REQUIRES_SEPARATE_GATE|BLOCKING_REASON|ACCEPTANCE_EVIDENCE|
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
|CRM-001|CRM|Captura de lead|TA/C|E2E|F1|S2|D2|A2|T2|RPD-01|IMPLEMENTED_AND_VALIDATED|leads-crm.functions.ts;lead-transition.server.ts|transicionarLead;transitionLead|RPD-01|M|TI0|C0|PR-M2|sim|não|—|AE|
|CRM-002|CRM|Deduplicação|TA/C|E2E|F1|S0|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|leads-crm.functions.ts;lead-transition.server.ts|transicionarLead;transitionLead|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CRM-003|CRM|Atribuição|TA/C|E2E|F1|S2|D2|A2|T2|RPD-01|IMPLEMENTED_AND_VALIDATED|leads-crm.functions.ts;lead-transition.server.ts|transicionarLead;transitionLead|RPD-01|M|TI0|C0|PR-M2|sim|não|—|AE|
|CRM-004|CRM|Kanban|TA/C|E2E|F1|S0|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|leads-crm.functions.ts;lead-transition.server.ts|transicionarLead;transitionLead|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CRM-005|CRM|Funis|TA/C|E2E|F1|S0|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|leads-crm.functions.ts;lead-transition.server.ts|transicionarLead;transitionLead|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CRM-006|CRM|Estágios|TA/C|E2E|F1|S2|D2|A2|T2|RPD-01|IMPLEMENTED_AND_VALIDATED|leads-crm.functions.ts;lead-transition.server.ts|transicionarLead;transitionLead|RPD-01|M|TI0|C0|PR-M2|sim|não|—|AE|
|CRM-007|CRM|Transições|TA/C|E2E|F1|S2|D2|A2|T2|RPD-01|IMPLEMENTED_AND_VALIDATED|leads-crm.functions.ts;lead-transition.server.ts|transicionarLead;transitionLead|RPD-01|M|TI0|C0|PR-M2|sim|não|—|AE|
|CRM-008|CRM|Tarefas|TA/C|E2E|F0|S0|D2|A1|T0|RPD-01|MISSING|leads-crm.functions.ts;lead-transition.server.ts|transicionarLead;transitionLead|RPD-01|M|TI1|C3|PR-M2|sim|não|—|AE|
|CRM-009|CRM|Agenda|TA/C|E2E|F0|S0|D2|A1|T0|RPD-01|MISSING|leads-crm.functions.ts;lead-transition.server.ts|transicionarLead;transitionLead|RPD-01|M|TI1|C3|PR-M2|sim|não|—|AE|
|CRM-010|CRM|Contatos|TA/C|E2E|F1|S0|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|leads-crm.functions.ts;lead-transition.server.ts|transicionarLead;transitionLead|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CRM-011|CRM|Visitas|TA/C|E2E|F0|S0|D2|A1|T0|RPD-01|MISSING|leads-crm.functions.ts;lead-transition.server.ts|transicionarLead;transitionLead|RPD-01|M|TI1|C3|PR-M2|sim|não|—|AE|
|CRM-012|CRM|Propostas|TA/C|E2E|F0|S0|D2|A1|T0|RPD-01|MISSING|leads-crm.functions.ts;lead-transition.server.ts|transicionarLead;transitionLead|RPD-01|M|TI1|C3|PR-M2|sim|não|—|AE|
|CRM-013|CRM|Histórico de ações|TA/C|E2E|F1|S2|D2|A2|T2|RPD-01|IMPLEMENTED_AND_VALIDATED|leads-crm.functions.ts;lead-transition.server.ts|transicionarLead;transitionLead|RPD-01|M|TI0|C0|PR-M2|sim|não|—|AE|
|CRM-014|CRM|Histórico de conversas|TA/C|E2E|F1|S0|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|leads-crm.functions.ts;lead-transition.server.ts|transicionarLead;transitionLead|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CRM-015|CRM|Notas|TA/C|E2E|F1|S0|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|leads-crm.functions.ts;lead-transition.server.ts|transicionarLead;transitionLead|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CRM-016|CRM|Anexos|TA/C|E2E|F1|S0|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|leads-crm.functions.ts;lead-transition.server.ts|transicionarLead;transitionLead|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CRM-017|CRM|Origem|TA/C|E2E|F1|S2|D2|A2|T2|RPD-01|IMPLEMENTED_AND_VALIDATED|leads-crm.functions.ts;lead-transition.server.ts|transicionarLead;transitionLead|RPD-01|M|TI0|C0|PR-M2|sim|não|—|AE|
|CRM-018|CRM|Campanhas relacionadas|TA/C|E2E|F1|S0|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|leads-crm.functions.ts;lead-transition.server.ts|transicionarLead;transitionLead|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CRM-019|CRM|Relatórios|TA/C|E2E|F1|S1|D2|A1|T0|RPD-01|LEGACY_OR_DUAL_PATH|leads-crm.functions.ts;lead-transition.server.ts|transicionarLead;transitionLead|RPD-01|C|TI2|C2|PR-M2|sim|não|—|AE|
|CRM-020|CRM|Automações|TA/C|E2E|F0|S0|D2|A1|T0|RPD-01|MISSING|leads-crm.functions.ts;lead-transition.server.ts|transicionarLead;transitionLead|RPD-01|M|TI1|C3|PR-M2|sim|não|—|AE|
|CRM-021|CRM|Permissões CRM|TA/C|E2E|F1|S1|D2|A1|T0|RPD-01|LEGACY_OR_DUAL_PATH|leads-crm.functions.ts;lead-transition.server.ts|transicionarLead;transitionLead|RPD-01|C|TI2|C2|PR-M2|sim|não|—|AE|
|CRM-022|CRM|Auditoria CRM|TA/C|E2E|F1|S0|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|leads-crm.functions.ts;lead-transition.server.ts|transicionarLead;transitionLead|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CRM-023|CRM|Importação|TA/C|E2E|F0|S0|D2|A1|T0|RPD-01|MISSING|leads-crm.functions.ts;lead-transition.server.ts|transicionarLead;transitionLead|RPD-01|M|TI1|C3|PR-M2|sim|não|—|AE|
|CRM-024|CRM|Exportação|TA/C|E2E|F0|S0|D2|A1|T0|RPD-01|MISSING|leads-crm.functions.ts;lead-transition.server.ts|transicionarLead;transitionLead|RPD-01|M|TI1|C3|PR-M2|sim|não|—|AE|
|CRM-025|CRM|Integrações de comunicação|TA/C|E2E|F0|S0|D2|A1|T0|RPD-01|MISSING|leads-crm.functions.ts;lead-transition.server.ts|transicionarLead;transitionLead|RPD-01|M|TI1|C3|PR-M2|sim|não|—|AE|
|CRM-026|CRM|Dashboards CRM|TA/C|E2E|F1|S1|D2|A1|T0|RPD-01|LEGACY_OR_DUAL_PATH|leads-crm.functions.ts;lead-transition.server.ts|transicionarLead;transitionLead|RPD-01|C|TI2|C2|PR-M2|sim|não|—|AE|
|CRM-027|CRM|KPIs CRM|TA/C|E2E|F1|S1|D2|A1|T0|RPD-01|LEGACY_OR_DUAL_PATH|leads-crm.functions.ts;lead-transition.server.ts|transicionarLead;transitionLead|RPD-01|C|TI2|C2|PR-M2|sim|não|—|AE|
|CRM-028|CRM|Filtros|TA/C|E2E|F1|S0|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|leads-crm.functions.ts;lead-transition.server.ts|transicionarLead;transitionLead|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CRM-029|CRM|SLA|TA/C|E2E|F0|S0|D2|A1|T0|RPD-01|MISSING|leads-crm.functions.ts;lead-transition.server.ts|transicionarLead;transitionLead|RPD-01|M|TI1|C3|PR-M2|sim|não|—|AE|
|CRM-030|CRM|Alertas|TA/C|E2E|F1|S0|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|leads-crm.functions.ts;lead-transition.server.ts|transicionarLead;transitionLead|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CRM-031|CRM|Follow-ups|TA/C|E2E|F1|S0|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|leads-crm.functions.ts;lead-transition.server.ts|transicionarLead;transitionLead|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CRM-032|CRM|Relação com imóvel|TA/C|E2E|F1|S2|D2|A2|T2|RPD-01|IMPLEMENTED_AND_VALIDATED|leads-crm.functions.ts;lead-transition.server.ts|transicionarLead;transitionLead|RPD-01|M|TI0|C0|PR-M2|sim|não|—|AE|
|CRM-033|CRM|Relação com corretor|TA/C|E2E|F1|S2|D2|A2|T2|RPD-01|IMPLEMENTED_AND_VALIDATED|leads-crm.functions.ts;lead-transition.server.ts|transicionarLead;transitionLead|RPD-01|M|TI0|C0|PR-M2|sim|não|—|AE|
|CRM-034|CRM|Relação com campanha|TA/C|E2E|F1|S0|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|leads-crm.functions.ts;lead-transition.server.ts|transicionarLead;transitionLead|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|CRM-035|CRM|Lista de descartados|TA/C|E2E|F1|S1|D2|A1|T0|RPD-01|LEGACY_OR_DUAL_PATH|leads-crm.functions.ts;lead-transition.server.ts|transicionarLead;transitionLead|RPD-01|C|TI2|C2|PR-M2|sim|não|—|AE|
|CRM-036|CRM|Performance comercial|TA/C|E2E|F1|S1|D2|A1|T0|RPD-01|LEGACY_OR_DUAL_PATH|leads-crm.functions.ts;lead-transition.server.ts|transicionarLead;transitionLead|RPD-01|C|TI2|C2|PR-M2|sim|não|—|AE|

### DASHBOARDS

|CAPABILITY_ID|DOMAIN|CAPABILITY|USER_ROLE|EXPECTED_FLOW|CURRENT_FRONTEND|CURRENT_SERVER_BOUNDARY|CURRENT_DATABASE|CURRENT_AUTHORIZATION|CURRENT_TESTS|CURRENT_DOCUMENTATION|CLASSIFICATION|EVIDENCE_FILES|EVIDENCE_SYMBOLS|DEPENDENCIES|SECURITY_IMPACT|TENANT_ISOLATION_IMPACT|REQUIRED_CHANGE|PROPOSED_OWNERSHIP|IN_PRM2_PRINCIPAL_SCOPE|REQUIRES_SEPARATE_GATE|BLOCKING_REASON|ACCEPTANCE_EVIDENCE|
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
|DSH-001|DASHBOARDS|Fontes de dados|TA/C|E2E|F1|S1|D2|A1|T0|RPD-01|LEGACY_OR_DUAL_PATH|dashboard.functions.ts|dashboardStats|RPD-01|C|TI2|C2|PR-M2|sim|não|—|AE|
|DSH-002|DASHBOARDS|Fórmulas|TA/C|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|dashboard.functions.ts|dashboardStats|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|DSH-003|DASHBOARDS|Períodos|TA/C|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|dashboard.functions.ts|dashboardStats|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|DSH-004|DASHBOARDS|Timezone|TA/C|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|dashboard.functions.ts|dashboardStats|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|DSH-005|DASHBOARDS|Cardinalidade|TA/C|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|dashboard.functions.ts|dashboardStats|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|DSH-006|DASHBOARDS|Permissões|TA/C|E2E|F1|S1|D2|A1|T0|RPD-01|LEGACY_OR_DUAL_PATH|dashboard.functions.ts|dashboardStats|RPD-01|C|TI2|C2|PR-M2|sim|não|—|AE|
|DSH-007|DASHBOARDS|Filtros|TA/C|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|dashboard.functions.ts|dashboardStats|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|DSH-008|DASHBOARDS|Drill-down|TA/C|E2E|F1|S1|D2|A1|T0|RPD-01|MISSING|dashboard.functions.ts|dashboardStats|RPD-01|M|TI1|C3|PR-M2|sim|não|—|AE|
|DSH-009|DASHBOARDS|Ganho|TA/C|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|dashboard.functions.ts|dashboardStats|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|DSH-010|DASHBOARDS|Perda|TA/C|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|dashboard.functions.ts|dashboardStats|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|DSH-011|DASHBOARDS|Descarte|TA/C|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|dashboard.functions.ts|dashboardStats|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|DSH-012|DASHBOARDS|Métricas de imóveis|TA/C|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|dashboard.functions.ts|dashboardStats|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|DSH-013|DASHBOARDS|Métricas de leads|TA/C|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|dashboard.functions.ts|dashboardStats|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|DSH-014|DASHBOARDS|Métricas de funil|TA/C|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|dashboard.functions.ts|dashboardStats|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|DSH-015|DASHBOARDS|Métricas de campanhas|TA/C|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|dashboard.functions.ts|dashboardStats|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|DSH-016|DASHBOARDS|Métricas de publicação|TA/C|E2E|F1|S1|D2|A1|T0|RPD-01|MISSING|dashboard.functions.ts|dashboardStats|RPD-01|M|TI1|C3|PR-M2|sim|não|—|AE|
|DSH-017|DASHBOARDS|Relatórios|TA/C|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|dashboard.functions.ts|dashboardStats|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|DSH-018|DASHBOARDS|Empty states|TA/C|E2E|F1|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|dashboard.functions.ts|dashboardStats|RPD-01|M|TI1|C1|PR-M2|sim|não|—|AE|
|DSH-019|DASHBOARDS|Dados por role|TA/C|E2E|F1|S1|D2|A1|T0|RPD-01|LEGACY_OR_DUAL_PATH|dashboard.functions.ts|dashboardStats|RPD-01|C|TI2|C2|PR-M2|sim|não|—|AE|
|DSH-020|DASHBOARDS|Isolamento tenant do dashboard|TA/C|E2E|F1|S1|D2|A1|T0|RPD-01|REQUIRES_REDESIGN|dashboard.functions.ts|dashboardStats|RPD-01|C|TI2|C5|PR-M2|sim|não|—|AE|

### SUPER_ADMIN

|CAPABILITY_ID|DOMAIN|CAPABILITY|USER_ROLE|EXPECTED_FLOW|CURRENT_FRONTEND|CURRENT_SERVER_BOUNDARY|CURRENT_DATABASE|CURRENT_AUTHORIZATION|CURRENT_TESTS|CURRENT_DOCUMENTATION|CLASSIFICATION|EVIDENCE_FILES|EVIDENCE_SYMBOLS|DEPENDENCIES|SECURITY_IMPACT|TENANT_ISOLATION_IMPACT|REQUIRED_CHANGE|PROPOSED_OWNERSHIP|IN_PRM2_PRINCIPAL_SCOPE|REQUIRES_SEPARATE_GATE|BLOCKING_REASON|ACCEPTANCE_EVIDENCE|
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
|SUP-001|SUPER_ADMIN|Dashboard executivo global|SA|E2E|F2|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|super.functions.ts;_authenticated.super.index.tsx|assertSuperAdmin;superKpisGlobais|RPD-01|A|TI1|C1|PR-M2|sim|não|—|AE|
|SUP-002|SUPER_ADMIN|Gestão de tenants|SA|E2E|F2|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|super.functions.ts;_authenticated.super.index.tsx|assertSuperAdmin;superKpisGlobais|RPD-01|A|TI1|C1|PR-M2|sim|não|—|AE|
|SUP-003|SUPER_ADMIN|Gestão global de usuários|SA|E2E|F2|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|super.functions.ts;_authenticated.super.index.tsx|assertSuperAdmin;superKpisGlobais|RPD-01|A|TI1|C1|PR-M2|sim|não|—|AE|
|SUP-004|SUPER_ADMIN|Gestão de memberships|SA|E2E|F2|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|super.functions.ts;_authenticated.super.index.tsx|assertSuperAdmin;superKpisGlobais|RPD-01|A|TI1|C1|PR-M2|sim|não|—|AE|
|SUP-005|SUPER_ADMIN|Gestão global de roles|SA|E2E|F2|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|super.functions.ts;_authenticated.super.index.tsx|assertSuperAdmin;superKpisGlobais|RPD-01|A|TI1|C1|PR-M2|sim|não|—|AE|
|SUP-006|SUPER_ADMIN|Gestão de planos|SA|E2E|F0|S0|D2|A1|T0|RPD-01|MISSING|super.functions.ts;_authenticated.super.index.tsx|assertSuperAdmin;superKpisGlobais|RPD-01|A|TI1|C3|PR-M2|sim|não|—|AE|
|SUP-007|SUPER_ADMIN|Gestão de entitlements|SA|E2E|F0|S0|D2|A1|T0|RPD-01|MISSING|super.functions.ts;_authenticated.super.index.tsx|assertSuperAdmin;superKpisGlobais|RPD-01|A|TI1|C3|PR-M2|sim|não|—|AE|
|SUP-008|SUPER_ADMIN|Gestão de limites|SA|E2E|F0|S0|D2|A1|T0|RPD-01|MISSING|super.functions.ts;_authenticated.super.index.tsx|assertSuperAdmin;superKpisGlobais|RPD-01|A|TI1|C3|PR-M2|sim|não|—|AE|
|SUP-009|SUPER_ADMIN|Billing visibility|SA|E2E|F2|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|super.functions.ts;_authenticated.super.index.tsx|assertSuperAdmin;superKpisGlobais|RPD-01|A|TI1|C1|PR-M2|sim|não|—|AE|
|SUP-010|SUPER_ADMIN|Gestão de domínios|SA|E2E|F2|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|super.functions.ts;_authenticated.super.index.tsx|assertSuperAdmin;superKpisGlobais|RPD-01|A|TI1|C1|PR-M2|sim|não|—|AE|
|SUP-011|SUPER_ADMIN|Gestão de integrações|SA|E2E|F0|S0|D2|A1|T0|RPD-01|MISSING|super.functions.ts;_authenticated.super.index.tsx|assertSuperAdmin;superKpisGlobais|RPD-01|A|TI1|C3|PR-M2|sim|não|—|AE|
|SUP-012|SUPER_ADMIN|Gestão global de portais|SA|E2E|F2|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|super.functions.ts;_authenticated.super.index.tsx|assertSuperAdmin;superKpisGlobais|RPD-01|A|TI1|C1|PR-M2|sim|não|—|AE|
|SUP-013|SUPER_ADMIN|Gestão global de campanhas|SA|E2E|F0|S0|D2|A1|T0|RPD-01|MISSING|super.functions.ts;_authenticated.super.index.tsx|assertSuperAdmin;superKpisGlobais|RPD-01|A|TI1|C3|PR-M2|sim|não|—|AE|
|SUP-014|SUPER_ADMIN|Incidentes|SA|E2E|F0|S0|D2|A1|T0|RPD-01|MISSING|super.functions.ts;_authenticated.super.index.tsx|assertSuperAdmin;superKpisGlobais|RPD-01|A|TI1|C3|PR-M2|sim|não|—|AE|
|SUP-015|SUPER_ADMIN|Logs|SA|E2E|F2|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|super.functions.ts;_authenticated.super.index.tsx|assertSuperAdmin;superKpisGlobais|RPD-01|A|TI1|C1|PR-M2|sim|não|—|AE|
|SUP-016|SUPER_ADMIN|Auditoria|SA|E2E|F2|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|super.functions.ts;_authenticated.super.index.tsx|assertSuperAdmin;superKpisGlobais|RPD-01|A|TI1|C1|PR-M2|sim|não|—|AE|
|SUP-017|SUPER_ADMIN|Ferramentas de suporte|SA|E2E|F0|S0|D2|A1|T0|RPD-01|MISSING|super.functions.ts;_authenticated.super.index.tsx|assertSuperAdmin;superKpisGlobais|RPD-01|A|TI1|C3|PR-M2|sim|não|—|AE|
|SUP-018|SUPER_ADMIN|Impersonação|SA|E2E|F2|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|super.functions.ts;_authenticated.super.index.tsx|assertSuperAdmin;superKpisGlobais|RPD-01|A|TI1|C1|PR-M2|sim|não|—|AE|
|SUP-019|SUPER_ADMIN|Health|SA|E2E|F2|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|super.functions.ts;_authenticated.super.index.tsx|assertSuperAdmin;superKpisGlobais|RPD-01|A|TI1|C1|PR-M2|sim|não|—|AE|
|SUP-020|SUPER_ADMIN|Jobs|SA|E2E|F0|S0|D2|A1|T0|RPD-01|MISSING|super.functions.ts;_authenticated.super.index.tsx|assertSuperAdmin;superKpisGlobais|RPD-01|A|TI1|C3|PR-M2|sim|não|—|AE|
|SUP-021|SUPER_ADMIN|Cron|SA|E2E|F0|S0|D2|A1|T0|RPD-01|MISSING|super.functions.ts;_authenticated.super.index.tsx|assertSuperAdmin;superKpisGlobais|RPD-01|A|TI1|C3|PR-M2|sim|não|—|AE|
|SUP-022|SUPER_ADMIN|Filas|SA|E2E|F0|S0|D2|A1|T0|RPD-01|MISSING|super.functions.ts;_authenticated.super.index.tsx|assertSuperAdmin;superKpisGlobais|RPD-01|A|TI1|C3|PR-M2|sim|não|—|AE|
|SUP-023|SUPER_ADMIN|Webhooks|SA|E2E|F2|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|super.functions.ts;_authenticated.super.index.tsx|assertSuperAdmin;superKpisGlobais|RPD-01|A|TI1|C1|PR-M2|sim|não|—|AE|
|SUP-024|SUPER_ADMIN|Diagnósticos|SA|E2E|F2|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|super.functions.ts;_authenticated.super.index.tsx|assertSuperAdmin;superKpisGlobais|RPD-01|A|TI1|C1|PR-M2|sim|não|—|AE|
|SUP-025|SUPER_ADMIN|Relatórios globais|SA|E2E|F0|S0|D2|A1|T0|RPD-01|MISSING|super.functions.ts;_authenticated.super.index.tsx|assertSuperAdmin;superKpisGlobais|RPD-01|A|TI1|C3|PR-M2|sim|não|—|AE|
|SUP-026|SUPER_ADMIN|Lifecycle de tenant|SA|E2E|F2|S1|D2|A1|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|super.functions.ts;_authenticated.super.index.tsx|assertSuperAdmin;superKpisGlobais|RPD-01|A|TI1|C1|PR-M2|sim|não|—|AE|
|SUP-027|SUPER_ADMIN|Diagnóstico comercial administrativo|SA|E2E|F0|S0|D2|A1|T0|RPD-01|MISSING|super.functions.ts;_authenticated.super.index.tsx|assertSuperAdmin;superKpisGlobais|RPD-01|A|TI1|C3|PR-M2|sim|não|—|AE|
|SUP-028|SUPER_ADMIN|Boundary tenant-scoped do Super Admin|SA|E2E|F2|S1|D2|A1|T0|RPD-01|REQUIRES_REDESIGN|super.functions.ts;_authenticated.super.index.tsx|assertSuperAdmin;superKpisGlobais|RPD-01|C|TI2|C5|PR-M2|sim|não|—|AE|

### COMMERCIAL

|CAPABILITY_ID|DOMAIN|CAPABILITY|USER_ROLE|EXPECTED_FLOW|CURRENT_FRONTEND|CURRENT_SERVER_BOUNDARY|CURRENT_DATABASE|CURRENT_AUTHORIZATION|CURRENT_TESTS|CURRENT_DOCUMENTATION|CLASSIFICATION|EVIDENCE_FILES|EVIDENCE_SYMBOLS|DEPENDENCIES|SECURITY_IMPACT|TENANT_ISOLATION_IMPACT|REQUIRED_CHANGE|PROPOSED_OWNERSHIP|IN_PRM2_PRINCIPAL_SCOPE|REQUIRES_SEPARATE_GATE|BLOCKING_REASON|ACCEPTANCE_EVIDENCE|
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
|COM-001|COMMERCIAL|Commercial plans|T/S/SA|E2E|F2|S2|D2|A2|T2|RPD-01|IMPLEMENTED_AND_VALIDATED|commercial.functions.ts;read-models.ts|getTenantCommercialSummary;getTenantEntitlementSnapshot|RPD-01|A|TI0|C0|PR-M2|sim|não|—|AE|
|COM-002|COMMERCIAL|Plan versions|T/S/SA|E2E|F2|S2|D2|A2|T2|RPD-01|IMPLEMENTED_AND_VALIDATED|commercial.functions.ts;read-models.ts|getTenantCommercialSummary;getTenantEntitlementSnapshot|RPD-01|A|TI0|C0|PR-M2|sim|não|—|AE|
|COM-003|COMMERCIAL|Entitlements|T/S/SA|E2E|F2|S2|D2|A2|T2|RPD-01|IMPLEMENTED_AND_VALIDATED|commercial.functions.ts;read-models.ts|getTenantCommercialSummary;getTenantEntitlementSnapshot|RPD-01|A|TI0|C0|PR-M2|sim|não|—|AE|
|COM-004|COMMERCIAL|Feature keys|T/S/SA|E2E|F2|S2|D2|A2|T2|RPD-01|IMPLEMENTED_AND_VALIDATED|commercial.functions.ts;read-models.ts|getTenantCommercialSummary;getTenantEntitlementSnapshot|RPD-01|A|TI0|C0|PR-M2|sim|não|—|AE|
|COM-005|COMMERCIAL|Usage limits|T/S/SA|E2E|F2|S2|D2|A2|T2|RPD-01|IMPLEMENTED_AND_VALIDATED|commercial.functions.ts;read-models.ts|getTenantCommercialSummary;getTenantEntitlementSnapshot|RPD-01|A|TI0|C0|PR-M2|sim|não|—|AE|
|COM-006|COMMERCIAL|Seat limits|T/S/SA|E2E|F2|S2|D2|A2|T2|RPD-01|IMPLEMENTED_AND_VALIDATED|commercial.functions.ts;read-models.ts|getTenantCommercialSummary;getTenantEntitlementSnapshot|RPD-01|A|TI0|C0|PR-M2|sim|não|—|AE|
|COM-007|COMMERCIAL|Billing provider abstraction|T/S/SA|E2E|F2|S2|D2|A2|T2|RPD-01|IMPLEMENTED_AND_VALIDATED|commercial.functions.ts;read-models.ts|getTenantCommercialSummary;getTenantEntitlementSnapshot|RPD-01|A|TI0|C0|PR-M2|sim|não|—|AE|
|COM-008|COMMERCIAL|Tenant billing mapping|T/S/SA|E2E|F2|S2|D2|A2|T2|RPD-01|IMPLEMENTED_AND_VALIDATED|commercial.functions.ts;read-models.ts|getTenantCommercialSummary;getTenantEntitlementSnapshot|RPD-01|A|TI0|C0|PR-M2|sim|não|—|AE|
|COM-009|COMMERCIAL|Commercial read functions|T/S/SA|E2E|F2|S2|D2|A2|T2|RPD-01|IMPLEMENTED_AND_VALIDATED|commercial.functions.ts;read-models.ts|getTenantCommercialSummary;getTenantEntitlementSnapshot|RPD-01|A|TI0|C0|PR-M2|sim|não|—|AE|
|COM-010|COMMERCIAL|Runtime enforcement|T/S/SA|E2E|F2|S2|D2|A2|T2|RPD-01|IMPLEMENTED_AND_VALIDATED|commercial.functions.ts;read-models.ts|getTenantCommercialSummary;getTenantEntitlementSnapshot|RPD-01|A|TI0|C0|PR-M2|sim|não|—|AE|
|COM-011|COMMERCIAL|Frontend visibility comercial|T/S/SA|E2E|F2|S1|D2|A0|T0|RPD-01|MISSING|commercial.functions.ts;read-models.ts|getTenantCommercialSummary;getTenantEntitlementSnapshot|RPD-01|A|TI1|C3|PRESERVE|sim|não|—|AE|
|COM-012|COMMERCIAL|Diagnósticos tenant comerciais|T/S/SA|E2E|F2|S2|D2|A2|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|commercial.functions.ts;read-models.ts|getTenantCommercialSummary;getTenantEntitlementSnapshot|RPD-01|A|TI1|C1|PRESERVE|sim|não|—|AE|
|COM-013|COMMERCIAL|Provider real|T/S/SA|E2E|F2|S1|D2|A0|T0|RPD-01|FUTURE_COMMERCIAL_SCOPE|commercial.functions.ts;read-models.ts|getTenantCommercialSummary;getTenantEntitlementSnapshot|RPD-01|A|TI1|C7|PRESERVE|não|não|—|AE|
|COM-014|COMMERCIAL|Checkout|T/S/SA|E2E|F2|S1|D2|A0|T0|RPD-01|FUTURE_COMMERCIAL_SCOPE|commercial.functions.ts;read-models.ts|getTenantCommercialSummary;getTenantEntitlementSnapshot|RPD-01|A|TI1|C7|PRESERVE|não|não|—|AE|
|COM-015|COMMERCIAL|Webhook de billing provider|T/S/SA|E2E|F2|S1|D2|A0|T0|RPD-01|FUTURE_COMMERCIAL_SCOPE|commercial.functions.ts;read-models.ts|getTenantCommercialSummary;getTenantEntitlementSnapshot|RPD-01|A|TI1|C7|PRESERVE|não|não|—|AE|
|COM-016|COMMERCIAL|Customer portal|T/S/SA|E2E|F2|S1|D2|A0|T0|RPD-01|FUTURE_COMMERCIAL_SCOPE|commercial.functions.ts;read-models.ts|getTenantCommercialSummary;getTenantEntitlementSnapshot|RPD-01|A|TI1|C7|PRESERVE|não|não|—|AE|
|COM-017|COMMERCIAL|Autorização de billing/commercial admin|T/S/SA|E2E|F2|S1|D2|A0|T0|RPD-01|REQUIRES_SEPARATE_GATE|commercial.functions.ts;read-models.ts|getTenantCommercialSummary;getTenantEntitlementSnapshot|RPD-01|A|TI1|C6|PRESERVE|não|sim|—|AE|
|COM-018|COMMERCIAL|Subscription lifecycle operacional|T/S/SA|E2E|F2|S2|D2|A2|T0|RPD-01|IMPLEMENTED_BUT_INCOMPLETE|commercial.functions.ts;read-models.ts|getTenantCommercialSummary;getTenantEntitlementSnapshot|RPD-01|A|TI1|C1|PRESERVE|sim|não|—|AE|
|COM-019|COMMERCIAL|MRR e receita realizada|T/S/SA|E2E|F2|S1|D2|A0|T0|RPD-01|FUTURE_COMMERCIAL_SCOPE|commercial.functions.ts;read-models.ts|getTenantCommercialSummary;getTenantEntitlementSnapshot|RPD-01|A|TI1|C7|PRESERVE|não|não|—|AE|

## 6. Conclusão

```text
FILES_CHANGED = 5
FILES_OUTSIDE_ALLOWED = 0
RUNTIME_FILES_CHANGED = 0
FRONTEND_FILES_CHANGED = 0
DATABASE_FILES_CHANGED = 0
MIGRATIONS_CHANGED = 0
WORKFLOW_FILES_CHANGED = 0
DEPENDENCIES_CHANGED = 0
CAPABILITIES_AUDITED = 248
CLASSIFICATION_TOTAL = 248
UNCLASSIFIED_CAPABILITIES = 0
RECONCILIATION_READY_FOR_FINAL_DIRECT_EXTERNAL_AUDIT = true
```

```text
FINAL_EXTERNAL_PLANNING_AUDIT = Accepted
PRM2_PRE_PRINCIPAL_GATE_STATE = Accepted / Merged
PRM2_PLANNING_MERGE_AUTHORIZED = true
PRM2_PLANNING_MERGED = true
PRM2_PLANNING_MERGE_METHOD = squash
PRM2_PLANNING_MERGE_SHA = fc055cb69c2373a4adbc99d4ac02614ecfbde74f
PRM2_PLANNING_MERGED_AT = 2026-07-27T19:33:37Z

PLANNING_PR = 58
PLANNING_HEAD = e51a05876e0d4d30f31fbe822e0221873642eae6
PLANNING_RELEASE_GATE_RUN_ID = 30296162677
PLANNING_RELEASE_GATE_JOB_ID = 90077707894
PLANNING_RELEASE_GATE_ARTIFACT_ID = 8664785012
PLANNING_RELEASE_GATE_ARTIFACT_DIGEST = sha256:3af399ba8c78764b0d661addaac96429a88c7cc950c8f28717ff12d72c1f93b5

POST_MERGE_RELEASE_GATE_RUN_ID = 30298768659
POST_MERGE_RELEASE_GATE_JOB_ID = 90086242677
POST_MERGE_RELEASE_GATE_EVENT = push
POST_MERGE_RELEASE_GATE_BRANCH = main
POST_MERGE_RELEASE_GATE_EXPECTED_SHA = fc055cb69c2373a4adbc99d4ac02614ecfbde74f
POST_MERGE_RELEASE_GATE_CHECKED_OUT_SHA = fc055cb69c2373a4adbc99d4ac02614ecfbde74f
POST_MERGE_RELEASE_GATE_EXACT_HEAD_MATCH = true
POST_MERGE_RELEASE_GATE_MERGE_REF_USED = false
POST_MERGE_RELEASE_GATE_RESULT = success
POST_MERGE_RELEASE_GATE_ARTIFACT_NAME = release-gate-fc055cb69c2373a4adbc99d4ac02614ecfbde74f
POST_MERGE_RELEASE_GATE_ARTIFACT_ID = 8665766909
POST_MERGE_RELEASE_GATE_ARTIFACT_DIGEST = sha256:4648fae81bb752207ac6de062d592a0be6a3166b789d5a63207ceeb5312ad778
POST_MERGE_RELEASE_GATE_ARTIFACT_EXPIRED = false

PLANNING_ACCEPTED_AND_MERGED = true
IMPLEMENTATION_ACCEPTED = false
PRM2_STATE = Planned — Blocked
IMPLEMENTATION_SCOPE_FINITE = false
PRM2_IMPLEMENTATION_READY = false
PRM2_IMPLEMENTATION_AUTHORIZED = false
READY_FOR_PRM2_PRINCIPAL_PROMPT = false

CHATGPT_GITHUB_PROMPT_BUDGET = not_applicable
LOVABLE_IMPLEMENTATION_PROMPT_BUDGET = 2/2
LOVABLE_PRINCIPAL_IMPLEMENTATION_PROMPT_CONSUMED = false
LOVABLE_CORRECTIVE_IMPLEMENTATION_PROMPT_CONSUMED = false

PRM3_STATE = Planned — Blocked by PR-M2
PRM3_IMPLEMENTATION_AUTHORIZED = false
NEXT_STAGE_AUTHORIZED = none
RECONCILIATION_READY_FOR_FINAL_DIRECT_EXTERNAL_AUDIT = true
```
