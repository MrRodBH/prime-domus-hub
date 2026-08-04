# PR-M2 — Portal Connector Registry, Publication Jobs & Hybrid Delivery Execution Evidence

## Status

```text
STAGE = PR-M2 — Functional Completion
INCREMENT = Portal Connector Registry, Publication Jobs & Hybrid Delivery Functional Completion
EXECUTION_MODEL = ChatGPT GitHub-native
INITIAL_HEAD = fa6b1e82506a2e40fbab171ebdf2060750474bfb
CODE_HEAD = 5f9ae06c6a823dfba68ab6447b0d8ec1562be1b3
PULL_REQUEST = 60
PR_STATE = open / draft
MERGE_EXECUTED = false
AUTO_MERGE_ENABLED = false
LOVABLE_EXECUTED = false
```

## 1. Objetivo executado

O incremento consolidou o domínio funcional de distribuição de imóveis para portais e canais externos mediante:

```text
closed build-time connector registry
+ requireTenant administrative context
+ effective Tenant Access Control authorization
+ explicit Super Admin impersonation boundary
+ HYBRID connector configuration
+ versioned closed mappings
+ transactional publication job ledger
+ idempotency and optimistic concurrency
+ attempts, retry, terminal failure and reconciliation states
+ deterministic manual exports
+ service-role-only mutations
+ explicit adapter_not_implemented automated state
```

Nenhuma publicação externa automatizada foi apresentada como concluída.

## 2. Preflight e estado anterior

O preflight direto do HEAD inicial comprovou:

```text
PORTAL_CONNECTOR_SCHEMA = existing portal_connectors table
PUBLICATION_STATE_SCHEMA = existing imovel_portais projection
SYNC_LOG_SCHEMA = existing portal_sync_logs and portal_sync_dlq
CURRENT_JOB_MODEL = absent
CURRENT_RETRY_MODEL = config only / no canonical orchestrator
CURRENT_IDEMPOTENCY_MODEL = absent
CURRENT_CREDENTIAL_MODEL = plaintext feed_token and webhook_secret columns
CURRENT_MAPPING_MODEL = unversioned config reference only
CURRENT_MANUAL_EXPORT_MODEL = absent
CURRENT_AUTOMATED_ADAPTERS = absent
CURRENT_WEBHOOK_MODEL = URL and plaintext secret fields only
CURRENT_AUTHORITY_MODEL = requireTenant + has_role(admin/gerente)
CURRENT_DIRECT_MUTATIONS = portal_connectors update and raw token rotation
CURRENT_CROSS_TENANT_RISKS = role authority and broad direct table access
CURRENT_SECRET_EXPOSURE_RISKS = plaintext persistence and one-time token DTO
CURRENT_FAKE_SUCCESS_RISKS = no canonical job/adapter completion boundary
```

Tabelas existentes reutilizadas como autoridades ou projeções:

```text
portal_connectors = connector instances
imovel_portais = current publication projection
portal_sync_logs = sanitized operational log projection
portal_sync_dlq = retained legacy dead-letter archive only
imoveis = tenant-scoped property source
imovel_imagens = tenant-scoped persisted media source
```

Não foi criado um segundo conjunto concorrente dessas entidades.

## 3. Connector Registry canônico

Arquivo:

```text
src/lib/portals/portal-connector-registry.ts
```

O registry fechado contém quatro contratos automatizados:

```text
JSON_API
XML_FEED
WEBHOOK
CUSTOM_ADAPTER
```

Cada definição declara:

```text
connectorKey
displayName
operationMode
automatedMethods
manualMethods
schemaVersion
mappingContract
supportedPropertyStatuses
requiredFields
optionalFields
mediaContract
endpointContract
credentialContract
retryContract
idempotencyContract
publicationContract
unpublicationContract
reconciliationContract
diagnosticsContract
availabilityState
```

Estado materializado:

```text
CONNECTORS_CATALOGED = 4
PORTAL_OPERATION_MODE = HYBRID
ADAPTERS_IMPLEMENTED = 0
ADAPTERS_NOT_IMPLEMENTED = 4
AUTOMATED_AVAILABILITY_STATE = adapter_not_implemented
MANUAL_FORMATS = CSV / XLSX / MANUAL_EXPORT
```

Keys, schemas, versões, métodos e estados não podem ser inventados pelo client.

## 4. Autoridade final

Arquivo:

```text
src/lib/api/tenant-portal-authority.server.ts
```

Contratos:

```text
authorizeTenantPortalOperation
authorizeTenantPortalCredentialOperation
authorizeTenantPortalPublicationOperation
```

Matriz final:

```text
active owner = global portal authority
delegated member = explicit portals permission with global scope
Super Admin = only through explicit impersonation
Super Admin without impersonation = denied
has_role(admin) tenant authority = removed
has_role(gerente) tenant authority = removed
user_roles tenant authority = removed
```

O tenant e o actor derivam exclusivamente do contexto trusted de `requireTenant`.

## 5. Credenciais

A migration adiciona somente metadados não secretos:

```text
credential_reference
credential_version
credential_state
last_rotated_at
rotation_required
row_version
```

Valores legados de alta entropia são convertidos em verificadores SHA-256 unidirecionais na tabela:

```text
portal_connector_credential_verifiers
```

Em seguida:

```text
feed_token = NULL
webhook_secret = NULL
```

Uma constraint impede nova persistência plaintext nesses campos.

A rotação exposta ao tenant recebe somente:

```text
credential://...
```

Ela não cria vault fictício, não recebe secret real e mantém o connector em:

```text
credential_provisioning_required
```

até provisionamento externo seguro futuro.

```text
PLAINTEXT_SECRET_SCAN = no active runtime persistence or DTO
DTO_SECRET_SCAN = feed_token/webhook_secret absent
INLINE_SECRET_SCAN = closed recursive rejection
```

## 6. Schema final

Migration:

```text
supabase/migrations/20260729103000_pr_m2_portal_functional_completion.sql
```

Tabelas adicionadas:

```text
portal_connector_credential_verifiers
tenant_portal_mappings
tenant_portal_jobs
tenant_portal_job_attempts
tenant_portal_exports
```

Tabelas estendidas:

```text
portal_connectors
imovel_portais
portal_sync_logs
```

### Mapping model

```text
versioned
closed JSON object
one current version per tenant + connector
immutable archived versions
explicit optimistic version precondition
```

### Job model

```text
tenant_id
connector_id
property_id
mapping_id
operation
desired_state
current_state
idempotency_key
payload_hash
mapping_version
connector_schema_version
attempt_count
max_attempts
next_attempt_at
last_attempt_at
last_error_code
external_reference
revision
created_by
created_at
updated_at
completed_at
cancelled_at
```

### Estados

```text
not_selected
queued
processing
published
unpublish_queued
unpublishing
unpublished
retry_scheduled
failed_retryable
failed_terminal
reconciliation_required
cancelled
```

`failed_terminal` é o dead-letter state canônico ativo. `portal_sync_dlq` permanece apenas arquivo legado.

## 7. Primitives transacionais

```text
assert_tenant_portal_authority
validate_tenant_portal_config
assert_tenant_portal_transition
save_tenant_portal_connector
set_tenant_portal_connector_state
rotate_tenant_portal_credential_reference
save_tenant_portal_mapping
enqueue_tenant_portal_publication
claim_tenant_portal_job
record_tenant_portal_attempt
complete_tenant_portal_job
schedule_tenant_portal_retry
cancel_tenant_portal_job
reconcile_tenant_portal_state
record_tenant_portal_export
```

Garantias estruturais:

- `SECURITY DEFINER` e `search_path` controlado;
- tenant row lock antes de mutation crítica;
- job row lock antes de transição;
- claim explícito por job ID com `FOR UPDATE SKIP LOCKED`;
- nenhum job é escolhido como autoridade por `ORDER BY/LIMIT 1`;
- connector, imóvel, mapping, job e export são revalidados contra o tenant;
- idempotency key é única por tenant;
- replay idempotente retorna o mesmo job;
- colisão de intenção é negada;
- revision precondition é obrigatória;
- attempt e auditoria são persistidos explicitamente;
- chamadas HTTP não ocorrem dentro da transação SQL;
- automated success é negado enquanto não existir adapter aprovado.

## 8. Retry, attempts e reconciliação

```text
IDEMPOTENCY_MODEL = unique tenant + idempotency_key with intent reconciliation
RETRY_MODEL = explicit exponential backoff bounded by connector policy
ATTEMPT_MODEL = immutable numbered attempts per tenant + job
RECONCILIATION_MODEL = explicit reconciliation_required transition
DEAD_LETTER_MODEL = failed_terminal
```

O retry:

- somente parte de `failed_retryable`;
- respeita `max_attempts`;
- calcula `next_attempt_at` com backoff limitado;
- não ocorre implicitamente dentro do adapter;
- exige nova transition RPC e revision precondition.

## 9. Adapter boundary

Arquivos:

```text
src/lib/portals/portal-adapter.server.ts
src/lib/portals/tenant-portal-worker.server.ts
```

Contrato:

```text
validateConfiguration
buildPublicationPayload
publish
unpublish
reconcile
healthCheck
```

O payload deriva de:

```text
imoveis row filtered by tenant_id
+ imovel_imagens rows filtered by tenant_id and imovel_id
+ current tenant-scoped versioned mapping
```

Endpoints aceitam somente HTTPS e rejeitam credentials embutidas e hosts privados conhecidos.

Estado atual:

```text
REAL_AUTOMATED_ADAPTERS = 0
AUTOMATED_RESULT = adapter_not_implemented
FAKE_EXTERNAL_SUCCESS = false
REAL_EXTERNAL_HTTP_CALLS = 0
```

## 10. Export manual

Formatos funcionais:

```text
CSV
XLSX
MANUAL_EXPORT JSON
```

Características:

- geração server-side;
- ordenação determinística por imóvel;
- conteúdo tenant-scoped;
- somente imóveis publicados e elegíveis;
- mídia tenant-scoped persistida;
- mapping fechado e versionado;
- export vazio explícito;
- SHA-256 do conteúdo;
- contagem e tamanho persistidos;
- object path derivado pelo servidor;
- armazenamento no bucket canônico `site`;
- URL assinada por 15 minutos;
- compensação de Storage se o registro transacional falhar;
- download não altera publicação externa.

```text
EXPORT_TEST_COUNTS = CSV deterministic / XLSX generated twice / empty CSV explicit
EXPORT_STORAGE_SERVER_AUTHORITATIVE = true
SIGNED_URL_PRIMARY_AUTHORIZATION = false
```

## 11. Server functions

Arquivo:

```text
src/lib/api/tenant-portal.functions.ts
```

Wrappers finais:

```text
getPortalConnectorRegistry
listTenantPortalConnectors
getTenantPortalConnector
saveTenantPortalConnector
setTenantPortalConnectorState
rotateTenantPortalCredentialReference
listTenantPortalMappings
saveTenantPortalMapping
enqueueTenantPortalPublication
enqueueTenantPortalUnpublication
retryTenantPortalJob
cancelTenantPortalJob
reconcileTenantPortalPublication
listTenantPortalJobs
getTenantPortalJob
listTenantPortalAttempts
listTenantPortalLogs
generateTenantPortalManualExport
getTenantPortalDashboard
getTenantPortalDiagnostics
```

Todas as mutations usam uma primitive especializada. Não existe DML de connector, mapping, job ou export no wrapper client-callable.

`src/lib/api/portals.functions.ts` foi reduzido a um barrel canônico com aliases read-only. Os caminhos `atualizarPortal` e `rotacionarToken` deixaram de existir no runtime ativo.

## 12. RLS, grants e ACL

Estado declarado e testado estruturalmente:

```text
anon portal table access = denied
authenticated direct portal table access = denied
authenticated direct portal mutation = denied
authenticated direct job mutation = denied
authenticated direct log mutation = denied
service_role table access = allowed
RPC execute PUBLIC/anon/authenticated = revoked
RPC execute service_role = granted
```

RLS é habilitado nas tabelas legadas e novas envolvidas no domínio.

A migration não foi aplicada ao backend gerenciado nesta execução.

## 13. Interface funcional

Arquivo:

```text
src/routes/_authenticated.admin.portais.tsx
```

A interface representa:

```text
connector
operation mode
automated method
manual method
configuration state
credential state
mapping version
active jobs
retry state
last success
last failure
next retry
terminal failure
reconciliation state
manual export availability
sanitized logs
diagnostics
```

Estados visíveis incluem:

```text
loading
empty
ready
configuration_required
credential_provisioning_required
adapter_not_implemented
queued
processing
published
unpublished
retry_scheduled
failed_retryable
terminal failure
reconciliation_required
cancelled
permission_denied
error
retry_available
```

A interface não recebe secret, não aceita raw JSON, não executa autorização local e não confunde export manual com publicação externa.

## 14. Release Gate do código

```text
PORTAL_FUNCTIONAL_SPEC_ASSERTIONS = 150
CONNECTOR_REGISTRY_COUNT = 4
ADAPTER_IMPLEMENTED_COUNT = 0
ADAPTER_NOT_IMPLEMENTED_COUNT = 4

CODE_RELEASE_GATE_RUN_ID = 30457112352
CODE_RELEASE_GATE_JOB_ID = 90593416129
CODE_RELEASE_GATE_EXPECTED_SHA = 5f9ae06c6a823dfba68ab6447b0d8ec1562be1b3
CODE_RELEASE_GATE_CHECKED_OUT_SHA = 5f9ae06c6a823dfba68ab6447b0d8ec1562be1b3
CODE_RELEASE_GATE_EXACT_HEAD_MATCH = true
CODE_RELEASE_GATE_RESULT = success

CODE_RELEASE_GATE_ARTIFACT_ID = 8726089297
CODE_RELEASE_GATE_ARTIFACT_NAME = release-gate-5f9ae06c6a823dfba68ab6447b0d8ec1562be1b3
CODE_RELEASE_GATE_ARTIFACT_DIGEST = sha256:c5f2797da618be35954e5fb1601979cfcfb8c47da3ff0a38740f1925b2c48876
CODE_RELEASE_GATE_ARTIFACT_EXPIRED = false
```

O gate executou:

```text
frozen-lockfile install
public tenant regressions
public writer regressions
public surface security regressions
CMS tenant authority regressions
dashboard authority regressions
CRM report authority regressions
property admin authority regressions
tenant lifecycle regressions
tenant access control regressions
Configuration Center regressions
Portal functional completion specifications
development build
typecheck
production build
second typecheck
repeated deterministic route generation
LSH-01 regressions
artifact upload
```

## 15. Classificação da evidência

```text
PROVED_BY_REPOSITORY =
closed registry, canonical authority, server wrappers, migration, RLS/grant declarations,
transactional job model, adapter boundary, UI cutover and removal of legacy mutations

PROVED_BY_DETERMINISTIC_TEST =
150 portal assertions, closed configs, secret rejection, transition matrix, endpoint validation,
tenant media binding, deterministic CSV/XLSX generation, payload hashing, service-role-only mutations,
no direct mutation, no fake adapter success and UI state coverage

PROVED_BY_GITHUB_ACTIONS =
exact PR-head checkout, frozen install, complete regression suite, typecheck, build:dev,
build, repeated deterministic route generation and uploaded evidence artifact

NOT_EXECUTED_AGAINST_MANAGED_LIVE_BACKEND =
migration application, legacy connector backfill, verifier creation, live RLS/grant ACL,
live RPC execution, live queue concurrency, live export Storage and live rollback/reconciliation

NOT_EXECUTED_AGAINST_REAL_EXTERNAL_PORTAL =
HTTP publication, unpublication, reconciliation, credential provisioning and provider health check
```

## 16. Definition of Done

```text
PORTAL_CONNECTOR_REGISTRY_CANONICAL = true
PORTAL_OPERATION_MODE = HYBRID
TENANT_PORTAL_AUTHORITY = server_only
SUPER_ADMIN_IMPERSONATION_REQUIRED = true
HAS_ROLE_TENANT_AUTHORITY = false
CONNECTOR_CONFIG_CLOSED = true
INLINE_SECRETS = false
PLAINTEXT_CREDENTIALS = false
PUBLICATION_JOB_MODEL_CANONICAL = true
IDEMPOTENCY_ENFORCED = true
STATE_TRANSITIONS_CLOSED = true
RETRY_POLICY_ENFORCED = true
ATTEMPTS_AUDITABLE = true
DEAD_LETTER_STATE_EXPLICIT = true
CROSS_TENANT_CONNECTOR_ACCESS = false
CROSS_TENANT_PUBLICATION = false
DIRECT_CLIENT_PORTAL_MUTATION = false
DIRECT_CLIENT_JOB_MUTATION = false
FAKE_EXTERNAL_SUCCESS = false
ADAPTER_NOT_IMPLEMENTED_STATE = explicit
MANUAL_CSV_EXPORT = functional
MANUAL_XLSX_EXPORT = functional
MANUAL_EXPORT_JSON = functional
EXPORT_STORAGE_SERVER_AUTHORITATIVE = true
TYPECHECK = success
BUILD_DEV = success
BUILD = success
DETERMINISTIC_ROUTE_GENERATION = success
CODE_RELEASE_GATE_EXACT_HEAD = success
PR_STATE = open
PR_DRAFT = true
PR_MERGED = false
AUTO_MERGE = false
```

## 17. Arquivos e commits do código

Comparação entre o baseline e o code HEAD:

```text
INITIAL_HEAD = fa6b1e82506a2e40fbab171ebdf2060750474bfb
CODE_HEAD = 5f9ae06c6a823dfba68ab6447b0d8ec1562be1b3
COMMITS_CREATED_BEFORE_EVIDENCE = 18
FILES_CHANGED_BEFORE_EVIDENCE = 12
MIGRATIONS_CREATED = 1
DEPENDENCY_VERSION_CHANGES = 0
```

Arquivos:

```text
package.json
run-pr-m2-cms-authority-specs.ts
run-pr-m2-portal-functional-completion-specs.ts
scripts/verify-release.mjs
src/lib/api/portals.functions.ts
src/lib/api/tenant-portal-authority.server.ts
src/lib/api/tenant-portal.functions.ts
src/lib/portals/portal-adapter.server.ts
src/lib/portals/portal-connector-registry.ts
src/lib/portals/tenant-portal-worker.server.ts
src/routes/_authenticated.admin.portais.tsx
supabase/migrations/20260729103000_pr_m2_portal_functional_completion.sql
```

## 18. Próximo incremento

O próximo incremento operacional da PR-M2 deverá concluir o workflow CMS e os contratos de extensibilidade antes do fechamento do CRM e dos dashboards:

```text
NEXT_PRM2_INCREMENT =
PR-M2 — CMS Workflow, Page Builder & Extensibility Functional Completion
```

Permanecem fora desse incremento:

```text
DCA-01
BCA-01
PR-M3
homologation
production
```
