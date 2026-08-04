# PR-M2 — Configuration Center & White Label Execution Evidence

## Status

```text
STAGE = PR-M2 — Functional Completion
INCREMENT = Configuration Center & White Label Functional Completion
EXECUTION_MODEL = ChatGPT GitHub-native
INITIAL_HEAD = 6646575744b6e96903b13aa05c8e164f15f9bbb6
CODE_HEAD = 86cc806720d277f83f2ab9983921775bd1ce473c
PULL_REQUEST = 60
PR_STATE = open / draft
MERGE_EXECUTED = false
AUTO_MERGE_ENABLED = false
LOVABLE_EXECUTED = false
```

## 1. Objetivo executado

O incremento consolidou uma autoridade tenant-scoped, server-side, versionada e fail-closed para a configuração funcional White Label do produto.

O runtime canônico é composto por:

```text
closed build-time/server registry
+ requireTenant administrative authority
+ Host-derived public authority
+ immutable whole-tenant snapshots
+ optimistic revision control
+ service-role-only transactional mutations
+ tenant-scoped persisted media references
```

Domínios materializados:

```text
identity
branding
visual
contact
social
seo
legal
catalog
lead_capture
header_footer
analytics
future_activation
legacy_content
```

## 2. Preflight e estado anterior

O preflight comprovou três autoridades concorrentes:

1. `site_settings` armazenava configurações por chave e recebia mutations diretas;
2. `site_settings_versions` versionava cada chave separadamente, sem transação do snapshot integral;
3. `website_menu_items` mantinha menus em um editor e runtime paralelos à configuração do site.

Também foram comprovados:

- valores `branding` e `branding_v2` coexistentes;
- referências legadas de mídia por path e URL assinada;
- editor de seções com JSON arbitrário;
- preview e publicação por chave;
- consumidores públicos dependentes do shape legado;
- ausência de registry fechado para todas as opções funcionais White Label.

```text
CONFIGURATION_KEYS_BEFORE = 14 legacy top-level setting groups
LEGACY_TOP_LEVEL_GROUPS =
branding
branding_v2
empresa
footer
seo_global
home_hero
home_secoes
contato
pagina_lancamentos
home_diferenciais
home_depoimentos
pagina_sobre
pagina_contato
pagina_anuncie
```

## 3. Registry canônico

Arquivo:

```text
src/lib/api/configuration-registry.ts
```

O registry contém 117 chaves únicas, distribuídas pelos 13 domínios funcionais. Cada definição declara:

```text
key
domain
label
description
valueKind
defaultValue
nullable
visibility
editAuthority
publicExposure
secretClassification
previewBehavior
publishBehavior
rollbackBehavior
uiControl
options
validationMessage
```

Garantias:

- chave não catalogada é rejeitada;
- tokens, passwords, client secrets, refresh tokens, private keys e API keys inline são rejeitados;
- HTML/JavaScript inseguro é rejeitado;
- cores, fontes, enums, e-mails, telefones, URLs, social hosts e IDs de analytics são validados;
- referências de mídia aceitam somente UUID persistido;
- defaults são explícitos, incluindo `null` quando o contrato é nullable;
- keys de sistema não podem ser alteradas pela superfície tenant;
- a projeção pública exclui arquivo legado e diagnósticos administrativos.

```text
CONFIGURATION_KEYS_AFTER = 117
ARBITRARY_SETTING_KEYS = false
UNVALIDATED_CONFIGURATION_WRITE = false
INLINE_SECRETS = false
```

## 4. Ledger e modelo de versões

Migration:

```text
supabase/migrations/20260728233000_pr_m2_configuration_center.sql
```

Autoridade canônica:

```text
TABLE = site_settings_versions
CANONICAL_KEY = configuration
VERSION_UNIT = whole tenant configuration snapshot
```

Cardinalidade materializada por índices únicos parciais:

```text
at most one draft per tenant
exactly one published version after backfill/publication
unique revision per tenant
unbounded immutable archived history
```

Fluxo final:

```text
published configuration
→ save or replace one draft based on expected published revision
→ validate whole snapshot
→ preview without public mutation
→ publish atomically
→ archive previous published version
→ retain immutable history
→ prepare rollback as a new draft
→ publish rollback draft explicitly
```

O rollback nunca edita uma versão histórica.

## 5. Backfill fail-closed

A migration:

- agrega deterministicamente todas as rows legadas por tenant;
- agrega menus com ordem explícita;
- preserva o mapa legado integral em `legacy_settings_archive`, admin-only;
- converte referências de mídia apenas quando o path resolve para exatamente uma row de `media_library` do mesmo tenant;
- rejeita URL assinada legada sem path persistido autoritativo;
- rejeita mídia ausente, ambígua ou cross-tenant;
- rejeita cores, fontes e anos legados inválidos;
- não utiliza `ORDER BY/LIMIT 1` como autoridade;
- não utiliza agregação arbitrária para escolher mídia;
- valida cada snapshot consolidado antes de persistir a revisão 1;
- não modifica migrations históricas.

```text
BACKFILL_COUNTS = not executed against managed live backend
ORPHAN_COUNTS = not executed against managed live backend
LIVE_MEDIA_MAPPING_COUNTS = not executed against managed live backend
```

## 6. Boundaries server-side

Arquivos canônicos:

```text
src/lib/api/tenant-configuration-authority.server.ts
src/lib/api/tenant-configuration.functions.ts
```

Wrappers expostos:

```text
getConfigurationRegistry
getPublishedTenantConfiguration
getPublishedPublicConfiguration
getTenantConfigurationDraft
saveTenantConfigurationDraft
discardTenantConfigurationDraft
validateTenantConfigurationDraft
previewTenantConfiguration
publishTenantConfiguration
listTenantConfigurationVersions
getTenantConfigurationVersion
rollbackTenantConfiguration
getTenantConfigurationDiagnostics
```

Autoridade:

```text
administrative tenant = requireTenant trusted context
public tenant = requirePublicTenantFromRequest Host authority
view/edit = cms.configuracoes global permission
publish/rollback = cms.versoes global permission
Super Admin = explicit impersonation required
client tenant authority = false
client publish authority = false
```

Primitives SQL:

```text
validate_tenant_configuration_snapshot
assert_tenant_configuration_authority
save_tenant_configuration_draft
discard_tenant_configuration_draft
publish_tenant_configuration
rollback_tenant_configuration
```

Cada mutation adquire lock da row de `tenants`, verifica revision precondition, valida snapshot, executa DML e registra auditoria dentro da mesma transação.

## 7. RLS, grants e ACL

Estado declarado e testado estruturalmente:

```text
anon direct site_settings access = denied
authenticated direct site_settings access = denied
anon direct site_settings_versions access = denied
authenticated direct site_settings_versions access = denied
anon direct website_menu_items access = denied
authenticated direct website_menu_items access = denied
service_role table access = allowed
RPC execute PUBLIC/anon/authenticated = revoked
RPC execute service_role = granted
```

A migration não foi aplicada ao backend gerenciado nesta execução.

## 8. Mídia e Storage

O snapshot armazena somente `media_library.id`.

O servidor:

1. deriva o tenant do contexto trusted;
2. busca a mídia por `id + tenant_id`;
3. deriva o path persistido;
4. revalida o target pelo boundary de Storage;
5. cria URL assinada temporária apenas após a autorização do recurso.

```text
CLIENT_STORAGE_PATH_AUTHORITY = false
SIGNED_URL_PRIMARY_AUTHORIZATION = false
CROSS_TENANT_MEDIA_REFERENCE = denied
```

## 9. Cutover de runtime e interfaces

Arquivos migrados:

```text
src/lib/api/site.functions.ts
src/lib/api/site-versions.functions.ts
src/lib/api/menu.functions.ts
src/components/content/adapters/useSiteAdapter.ts
src/components/content/editors/SettingsContentEditor.tsx
```

Estado final:

- `site.functions.ts` lê somente o snapshot publicado e projeta o DTO legado tipado para consumidores públicos existentes;
- `site-versions.functions.ts` mantém apenas compatibilidade de leitura e nega mutations por chave;
- `menu.functions.ts` lê `menu_items` do snapshot canônico e nega CRUD na tabela legada;
- o adapter do site opera domínios do registry e o snapshot integral;
- o editor é dirigido pelo registry;
- não há `CmsFase1Tabs`, `CmsMenuTab` ou `RawSectionEditor` na superfície ativa;
- preview salva o draft e produz projeção pública sem publicação;
- diagnósticos exibem validação, versões, autoridade e gates futuros.

```text
LEGACY_PATHS_REMOVED =
direct site_settings mutation
per-key draft/publish/rollback
website_menu_items active mutation
branding versus branding_v2 runtime authority
parallel menu editor
raw arbitrary section editor

PUBLIC_CONSUMERS_MIGRATED =
site settings
public menu
root branding/SEO consumers through typed compatibility projection
```

## 10. Gates futuros preservados

```text
DOMAIN_ACTIVATION_STATE = pending_DCA01
CLOUDFLARE_MODEL = HYBRID_pending_DCA01
BILLING_ACTIVATION_STATE = pending_BCA01
FINAL_VISUAL_REDESIGN = pending_PRM3
```

DCA-01, BCA-01 e PR-M3 não foram iniciadas.

## 11. Testes e Release Gate do código

```text
CONFIGURATION_CENTER_SPEC_ASSERTIONS = 133
CONFIGURATION_REGISTRY_KEY_COUNT = 117

CODE_RELEASE_GATE_RUN_ID = 30410641602
CODE_RELEASE_GATE_JOB_ID = 90445690152
CODE_RELEASE_GATE_EXPECTED_SHA = 86cc806720d277f83f2ab9983921775bd1ce473c
CODE_RELEASE_GATE_CHECKED_OUT_SHA = 86cc806720d277f83f2ab9983921775bd1ce473c
CODE_RELEASE_GATE_EXACT_HEAD_MATCH = true
CODE_RELEASE_GATE_RESULT = success

CODE_RELEASE_GATE_ARTIFACT_ID = 8708284458
CODE_RELEASE_GATE_ARTIFACT_NAME = release-gate-86cc806720d277f83f2ab9983921775bd1ce473c
CODE_RELEASE_GATE_ARTIFACT_DIGEST = sha256:22006b80fa323aee42df009e1e96a271cd64502243cdf1432bf05b5c5e64acd4
CODE_RELEASE_GATE_ARTIFACT_EXPIRED = false
```

O Release Gate executou com sucesso:

```text
frozen-lockfile install
public tenant context regressions
public tenant read regressions
public settings/campaign regressions
public page regressions
public writer regressions
public surface security regressions
CMS tenant authority regressions
dashboard authority regressions
CRM report authority regressions
property admin authority regressions
tenant lifecycle regressions
tenant access control regressions
Configuration Center specifications
build:dev
typecheck
build
second typecheck
deterministic repeated route generation
LSH-01 regressions
artifact upload
```

## 12. Classificação da evidência

```text
PROVED_BY_REPOSITORY =
registry, boundaries, transactional SQL, ACL declarations, UI cutover,
public projection, legacy retirement and future gate preservation

PROVED_BY_DETERMINISTIC_TEST =
133 Configuration Center assertions, closed keys, validation, secret rejection,
media UUID contract, cardinality declarations, no direct legacy mutations,
Host-derived public authority and regression compatibility

PROVED_BY_GITHUB_ACTIONS =
exact-head checkout, frozen install, all deterministic specs, typecheck,
build:dev, build, repeated deterministic route generation and artifact

NOT_EXECUTED_AGAINST_MANAGED_LIVE_BACKEND =
migration application, real legacy backfill, live row counts, live RLS/grants,
live RPC execution, live rollback, live media mapping and cross-tenant scenarios
```

## 13. Definition of Done

```text
CONFIGURATION_REGISTRY_CANONICAL = true
ARBITRARY_SETTING_KEYS = false
UNVALIDATED_CONFIGURATION_WRITE = false
TENANT_CONFIGURATION_AUTHORITY = server_only
PUBLIC_CONFIGURATION_AUTHORITY = Host_derived
SUPER_ADMIN_IMPERSONATION_REQUIRED = true
WHITE_LABEL_FUNCTIONAL_CONTRACT_COMPLETE = true
ALL_SUPPORTED_OPTIONS_DOCUMENTED = true
ALL_SUPPORTED_OPTIONS_EXPOSED_TO_UI = true
BRANDING_SINGLE_AUTHORITY = true
PARALLEL_CONFIGURATION_EDITOR = false
DUAL_RUNTIME = false
MEDIA_REFERENCE_TENANT_VALIDATED = true
CLIENT_STORAGE_PATH_AUTHORITY = false
INLINE_SECRETS = false
DRAFT_FLOW_COMPLETE = true
PREVIEW_FLOW_COMPLETE = true
PUBLISH_FLOW_COMPLETE = true
ROLLBACK_FLOW_COMPLETE = true
VERSION_HISTORY_IMMUTABLE = true
PUBLIC_DRAFT_EXPOSURE = false
PUBLIC_ADMIN_CONFIG_EXPOSURE = false
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

## 14. Próximo incremento

Pela sequência do execution envelope e pelo estado já materializado na branch, o próximo incremento autorizado da PR-M2 é:

```text
PR-M2 — Portal Connector Registry, Publication Jobs & Hybrid Delivery Functional Completion
```

Esse incremento deverá concluir adapters, mappings, jobs, retries, idempotência, export manual e diagnóstico, sem iniciar DCA-01, BCA-01 ou PR-M3.
