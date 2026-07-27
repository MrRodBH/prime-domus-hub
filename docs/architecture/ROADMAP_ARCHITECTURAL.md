# ROADMAP ARCHITECTURAL — RM Prime SaaS

**Status:** Ratificado — RPD-01 Accepted / Closed; PR-M2 planning ready for final direct external audit  
**Autoridade:** Single Source of Future Evolution do RM Prime SaaS  
**HEAD técnico após merge da reconciliação:** `acdc461b0a3c430339c7d07d0fafc94063eca5d8`  
**Baseline auditado da PR-M2:** `985a48e26c72c36aa80cac21ab32c768dac84c17`  
**Executor da RPD-01 e planejamento PR-M2:** ChatGPT GitHub-native

## 1. Fechamento vinculante da RPD-01

```text
STAGE_ID = RPD-01
FINAL_EXTERNAL_AUDIT = Accepted
RPD01_STATE = Accepted / Closed
RPD01_ACCEPTED = true
RPD01_CLOSURE_COMPLETE = true

RPD01_PLANNING_PR = 55
RPD01_PLANNING_HEAD = 8a56c758ca1d8b127dd0ee736769f0b4171f4c7d
RPD01_PLANNING_MERGED = true
RPD01_PLANNING_MERGE_METHOD = squash
RPD01_PLANNING_MERGE_SHA = 1acf99e272e448e834b52a0018e3d34b79f0a133

RPD01_RECONCILIATION_FINAL_AUDIT = Accepted
RPD01_RECONCILIATION_MERGE_AUTHORIZED = true
RPD01_RECONCILIATION_PR = 56
RPD01_RECONCILIATION_HEAD = 90b4792b90e66883ebcb1caa62dad9b644793f93
RPD01_RECONCILIATION_MERGE_METHOD = squash
RPD01_RECONCILIATION_MERGE_SHA = acdc461b0a3c430339c7d07d0fafc94063eca5d8
RPD01_RECONCILIATION_MERGED = true

RPD01_PRINCIPAL_PROMPT_CONSUMED = true
RPD01_CORRECTIVE_PROMPT_CONSUMED = true
RPD01_REMAINING_PROMPT_BUDGET = 0/2
```

Release Gates vinculados:

```text
RPD01_PLANNING_RELEASE_GATE_RUN_ID = 30132995455
RPD01_PLANNING_RELEASE_GATE_JOB_ID = 89611181337
RPD01_PLANNING_RELEASE_GATE_RESULT = success
RPD01_PLANNING_RELEASE_GATE_ARTIFACT_ID = 8611824397
RPD01_PLANNING_RELEASE_GATE_ARTIFACT_DIGEST = sha256:7052f7f3b31e4aaadf23f32a4004a2d3d9c3081cb84090fb130c0dc44d80bb86

POST_PLANNING_MERGE_RELEASE_GATE_RUN_ID = 30134139802
POST_PLANNING_MERGE_RELEASE_GATE_JOB_ID = 89614524262
POST_PLANNING_MERGE_RELEASE_GATE_RESULT = success
POST_PLANNING_MERGE_RELEASE_GATE_ARTIFACT_ID = 8612216615
POST_PLANNING_MERGE_RELEASE_GATE_ARTIFACT_DIGEST = sha256:bf474c3858f4b1e704df19c7e174f4bb2ad69c8c99ff4f7b4e7821f223df0308

RPD01_RECONCILIATION_RELEASE_GATE_RUN_ID = 30164381209
RPD01_RECONCILIATION_RELEASE_GATE_JOB_ID = 89694819354
RPD01_RECONCILIATION_RELEASE_GATE_RESULT = success
RPD01_RECONCILIATION_RELEASE_GATE_ARTIFACT_ID = 8621159498
RPD01_RECONCILIATION_RELEASE_GATE_ARTIFACT_DIGEST = sha256:487c976138a033a5d7fe44b51cc517a589e35862aeacfc1437688f1ef6c3081e

FINAL_PUSH_RELEASE_GATE_RUN_ID = 30270513019
FINAL_PUSH_RELEASE_GATE_JOB_ID = 89991615902
FINAL_PUSH_RELEASE_GATE_EVENT = push
FINAL_PUSH_RELEASE_GATE_BRANCH = main
FINAL_PUSH_RELEASE_GATE_HEAD_SHA = acdc461b0a3c430339c7d07d0fafc94063eca5d8
FINAL_PUSH_RELEASE_GATE_RESULT = success
FINAL_PUSH_RELEASE_GATE_ARTIFACT_ID = 8654686143
FINAL_PUSH_RELEASE_GATE_ARTIFACT_DIGEST = sha256:5b16716597c3dd036ffb7a6600ff6e62768adc8a04293d84b0f891acda6fb400
```

## 2. Regras permanentes

1. Architecture First e Impact Analysis antes de mudança estrutural ou runtime relevante.
2. GitHub `main` auditado é a fonte técnica final.
3. Servidor é a única autoridade para tenant, autorização e decisões comerciais.
4. Client, header e path nunca são autoridade.
5. Sem fallback implícito, tenant default, heurística, dual path ou `ORDER BY/LIMIT 1` autoritativo.
6. Ambiguidade falha rápido e fechado.
7. Super Admin sem impersonação explícita não acessa recurso tenant-scoped.
8. `x-tenant-id` é somente transporte e deve ser revalidado pelo servidor.
9. Storage não confia em bucket, path ou filename enviados pelo client.
10. Signed URL não é autorização primária.
11. Same-Backend Homologation Cell permanece vinculante.
12. Supabase externo não é fallback canônico.
13. Cada etapa admite no máximo um prompt principal e um corretivo consolidado.
14. Nenhuma etapa sucessora inicia sem predecessor compatível, Execution Envelope congelado e autorização explícita.

```text
CANONICAL_REGISTER_STRATEGY = generated route-tree augmentation
GENERATED_REGISTER_AUTHORITY_COUNT = 1
AUTHORED_REGISTER_DECLARATION_COUNT = 0
GENERATED_FILE_REWRITER_COUNT = 0
STRATEGY_B_ALLOWED = false
```

## 3. Estado arquitetural aceito

| Macro / etapa | Estado |
|---|---|
| Fase 2 — Multi-Tenant Core | Accepted / Closed |
| Fase 3 — Membership Evolution Model | Accepted / Closed |
| Fase 4 — SaaS Commercial Platform | Accepted / Closed |
| LSH-01 | Accepted / Closed |
| GNR-01 | Accepted |
| PTC-01 | Accepted |
| PSC-01 | Accepted |
| PPR-GN-01 | Accepted |
| PTW-01 | Accepted |
| PSG-01 | Accepted with Non-Blocking Backlog / Merged |
| HRR-01 | Accepted |
| HRI-01 | Accepted / Closed |
| RPD-01 | Accepted / Closed |
| PR-M2 | Planning — Ready for Final Direct External Audit; implementation not ready |

## 4. Caminho crítico executável

```text
HRI-01 Accepted / Closed
→ RPD-01 Accepted / Closed
→ PR-M2 Planning — Ready for Final Direct External Audit
→ PR-M3 Product UX Refactor, Final Interface and Operational Readiness
→ PR-M3 deliverable: Pre-Homologation Release Candidate Deploy
→ TH-M1 Pre-Homologation End-to-End Product Validation and UAT
→ TH-M2 Consolidated Remediation, Regression and Product Acceptance
→ LSV-03 Same-Backend Controlled Security and Multi-Tenant Validation
→ Homologação formal
→ Produção
```

PR-M2 permanece sem implementação autorizada e sem prompt principal consumido. O Release Candidate Deploy é deliverable da PR-M3, não etapa autônoma. TH-M1 é UAT interna. Homologação formal somente pode começar após PR-M2 e PR-M3 Accepted, relatório completo da TH-M1, TH-M2 Accepted e LSV-03 Accepted.

## 5. Disposição histórica

```text
RRS-01 = Superseded by Accepted Later Authority — GNR-01/HRI-01
PTA-01 = Absorbed by PTW-01/PSG-01 and PR-M2
MOC-01 = Absorbed by PR-M3 and LSV-03
RHV-01 = Absorbed by LSV-03
LSV-04 = Absorbed by TH-M2 and LSV-03
RDA-01 = Absorbed by PR-M2 and PR-M3
RC-01 = Absorbed by TH-M1 and TH-M2
```

Registros históricos são preservados, mas não formam cadeia executável concorrente nem recuperam budget ou autoridade.

## 6. PR-M2 — conclusão funcional

**Estado:** Planning — Ready for Final Direct External Audit. Implementação não pronta e não autorizada.

A auditoria direta classificou cada capacidade como:

```text
IMPLEMENTED_AND_VALIDATED
IMPLEMENTED_BUT_INCOMPLETE
LEGACY_OR_DUAL_PATH
MISSING
BLOCKED
REQUIRES_REDESIGN
REQUIRES_SEPARATE_GATE
FUTURE_COMMERCIAL_SCOPE
```

Resultado vinculável somente após auditoria externa:

```text
AUDITED_MAIN_HEAD = 985a48e26c72c36aa80cac21ab32c768dac84c17
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
IMPLEMENTATION_SCOPE_FINITE = false
PRM2_IMPLEMENTATION_READY = false
```

Escopo mínimo:

- tenant lifecycle, onboarding, usuários, memberships, roles, permissões e Configuration Center;
- domínios, DNS, TXT, SSL, anti-takeover, canonical host, redirects, publicação, rollback e diagnóstico;
- white label, site público, CMS, imóveis, portais e integrações;
- ingestão automática de campanhas no CRM/Kanban;
- CRM, dashboards tenant-scoped e Super Admin SaaS Control Plane;
- planos, entitlements, limites, billing visibility e diagnósticos.

A matriz completa e o envelope congelado estão em:

- `docs/architecture/impact-analysis/PR-M2-functional-completion-impact-analysis.md`;
- `docs/architecture/governance/PR-M2-functional-completion-execution-envelope.md`;
- `docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m2-functional-completion-planning-submission.md`.

### 6.1 Modelo Cloudflare a decidir

```text
CLOUDFLARE_INTEGRATION_MODEL =
MANUAL_ASSISTED
OR API_AUTOMATED
OR HYBRID
```

Nenhuma alternativa é escolhida pela RPD-01 ou pelo planejamento PR-M2. A decisão altera boundary externo, credenciais, DNS, SSL, jobs, retries, rollback e diagnósticos; por isso permanece `REQUIRES_SEPARATE_GATE` sem criação automática de novo stage ID.

### 6.2 Portal Connector Registry

```text
portal_id
tenant_id
portal_name
portal_status
integration_method
configuration_schema
credential_reference
feed_or_endpoint
mapping_profile
publication_rules
last_sync_status
last_sync_at
error_state
```

```text
JSON_API
XML_FEED
XLSX
CSV
WEBHOOK
MANUAL_EXPORT
CUSTOM_ADAPTER
```

A lista de portais e métodos é aberta. `portal_name` é configurável, `integration_method` é declarado e validado, credenciais são referências seguras e adapters/configurações são versionáveis. Fork por tenant é proibido. O runtime auditado ainda usa modelo legado e requer redesign antes da implementação principal.

### 6.3 Marketing e leads

```text
META_ADS = required
GOOGLE_ADS = required
META_PIXEL = required
LINKEDIN_ADS = extensible
TIKTOK_ADS = extensible
GOOGLE_ANALYTICS = extensible
GOOGLE_TAG_MANAGER = extensible
FUTURE_CHANNELS = extensible
```

Leads entram no estágio inicial aceito do Kanban com tenant derivado no servidor, provenance, origem, campanha, anúncio, UTM, deduplicação, campos disponíveis e histórico inicial. A auditoria confirmou o writer público e a atribuição, mas não confirmou integração automática completa de Ads.

### 6.4 CMS Functional Inventory

Inventário obrigatório: Content Workspace, editor universal, adapters, dispatcher, metadata-driven forms, page builder, landing page builder, layouts, seções, blocos, widgets, templates, menus, cabeçalhos, rodapés, grids, colunas, cards, galerias, vídeos, tours, formulários, CTAs, depoimentos, listagens de imóveis, lançamentos, equipes, contatos, mapas, embeds, rich text, preview, versionamento, agendamento, publicação, rollback, permissões, workflow, mídia, SEO, responsividade, blocos reutilizáveis, temas e customizações data-driven por tenant.

CMS Component and Layout Registry:

```text
component_key
component_name
component_category
schema_version
configuration_schema
content_schema
layout_constraints
responsive_rules
visibility_rules
tenant_customizable
theme_aware
preview_supported
versioning_supported
publication_supported
deprecated
replacement_component_key
```

Capacidades extensíveis:

```text
NEW_LAYOUT
NEW_SECTION
NEW_BLOCK
NEW_WIDGET
NEW_TEMPLATE
NEW_CONTENT_TYPE
NEW_EDITOR_CONTROL
NEW_TENANT_CONFIGURATION
```

Resultados proibidos:

```text
TENANT_SPECIFIC_CODE_FORK
DUPLICATE_EDITOR_PATH
PARALLEL_CMS_RUNTIME
CLIENT_SIDE_AUTHORITY
```

Taxonomia CMS:

```text
CMS_BLOCKING_FUNCTIONAL_DEFECT
CMS_BLOCKING_EDITOR_DEFECT
CMS_BLOCKING_PUBLICATION_DEFECT
CMS_BLOCKING_PREVIEW_DEFECT
CMS_BLOCKING_VERSIONING_DEFECT
CMS_BLOCKING_PERMISSION_DEFECT
CMS_BLOCKING_RESPONSIVE_DEFECT
CMS_BLOCKING_ACCESSIBILITY_DEFECT
CMS_LAYOUT_REFINEMENT
CMS_EDITOR_UX_REFINEMENT
CMS_COMPONENT_EXTENSION
CMS_TEMPLATE_EXTENSION
CMS_CONTENT_TYPE_EXTENSION
CMS_TENANT_CUSTOMIZATION
CMS_NON_BLOCKING_BACKLOG
```

### 6.5 CRM Functional Inventory

Inventário obrigatório: lead capture, deduplicação, atribuição, Kanban, funil, estágios, transições, tarefas, agenda, contatos, visitas, propostas, histórico de ações, histórico de conversas, notas, anexos, origem, campanhas, relatórios, automações, permissões, auditoria, importação, exportação, integrações de comunicação, dashboards, KPIs, filtros, SLA, alertas, follow-ups e relações com imóvel, corretor e campanha.

### 6.6 Dashboards e Super Admin

```text
PRM2_DASHBOARD_FUNCTIONAL_AUTHORITY = true
PRM3_DASHBOARD_FINAL_PRESENTATION = true
TENANT_ADMIN_DASHBOARD != SUPER_ADMIN_SAAS_CONTROL_PLANE
SUPER_ADMIN_GLOBAL_AUTHORITY = global platform administration only
SUPER_ADMIN_TENANT_SCOPED_ACCESS = explicit impersonation only
SUPER_ADMIN_WITHOUT_IMPERSONATION_TENANT_ACCESS = prohibited
```

Dashboard funcional: fontes, fórmulas, períodos, timezone, cardinalidade, permissões, filtros, drill-down, ganho, perda, descarte, métricas de imóveis, leads, funil, campanhas, publicação, relatórios, empty states e dados por role.

Super Admin: dashboard executivo global, tenants, usuários, memberships, roles, planos, entitlements, limites, billing visibility, domínios, integrações, portais, campanhas, incidentes, logs, auditoria, suporte, impersonação, health, jobs, cron, filas, webhooks, diagnósticos e relatórios globais. Impersonação deve ser explícita, server-validated, visível, reversível e auditada.

## 7. PR-M3 — interface final

```text
LOVABLE = primary implementation platform
UX_PRODUCT_PROFESSIONAL = active collaborator
CHATGPT_GITHUB_AUDIT = mandatory
```

PR-M3 responde pela experiência final de Tenant Admin, Super Admin, CRM, CMS, dashboards, relatórios, onboarding, domínios, portais e campanhas. Imagens do Product Owner são referência de densidade, composição, organização, hierarquia e visibilidade, não de paleta, tipografia ou identidade final.

## 8. TH-M1 e TH-M2

TH-M1 valida end-to-end: onboarding; usuários, roles, permissões e convites; domínio, DNS, Cloudflare e SSL; white label, site e publicação; CMS do rascunho ao rollback; imóvel completo; nenhum, um e múltiplos portais; dashboards e relatórios; CRM e Kanban; históricos e conversas; Meta Ads, Google Ads, Meta Pixel, analytics, GTM, LinkedIn, TikTok, UTMs e conversões; Super Admin; impersonação explícita; saída da impersonação; e ausência de acesso tenant-scoped sem impersonação.

```text
THM1_FINDINGS_REPORT = required
THM1_PRODUCT_ACCEPTANCE = not automatic
```

Taxonomia TH-M2:

```text
BLOCKING_BACKEND_DEFECT
BLOCKING_FRONTEND_DEFECT
ESSENTIAL_CAPABILITY_MISSING
AUTHORIZATION_OR_ISOLATION_DEFECT
INTEGRATION_DEFECT
UX_REFINEMENT
DASHBOARD_REFINEMENT
CONNECTOR_EXTENSION
TENANT_CUSTOMIZATION
CMS_BLOCKING_FUNCTIONAL_DEFECT
CMS_BLOCKING_EDITOR_DEFECT
CMS_BLOCKING_PUBLICATION_DEFECT
CMS_BLOCKING_PREVIEW_DEFECT
CMS_BLOCKING_VERSIONING_DEFECT
CMS_BLOCKING_PERMISSION_DEFECT
CMS_BLOCKING_RESPONSIVE_DEFECT
CMS_BLOCKING_ACCESSIBILITY_DEFECT
CMS_LAYOUT_REFINEMENT
CMS_EDITOR_UX_REFINEMENT
CMS_COMPONENT_EXTENSION
CMS_TEMPLATE_EXTENSION
CMS_CONTENT_TYPE_EXTENSION
CMS_TENANT_CUSTOMIZATION
CRM_BLOCKING_FUNCTIONAL_DEFECT
CRM_WORKFLOW_DEFECT
CRM_AUTOMATION_DEFECT
CRM_REPORTING_DEFECT
CRM_UX_REFINEMENT
SUPER_ADMIN_BLOCKING_FUNCTIONAL_DEFECT
SUPER_ADMIN_AUTHORIZATION_DEFECT
SUPER_ADMIN_IMPERSONATION_DEFECT
SUPER_ADMIN_TENANT_LIFECYCLE_DEFECT
SUPER_ADMIN_COMMERCIAL_VISIBILITY_DEFECT
SUPER_ADMIN_INTEGRATION_DIAGNOSTIC_DEFECT
SUPER_ADMIN_DASHBOARD_REFINEMENT
SUPER_ADMIN_REPORT_EXTENSION
SUPER_ADMIN_SUPPORT_TOOL_EXTENSION
SUPER_ADMIN_UX_REFINEMENT
NON_BLOCKING_BACKLOG
```

## 9. Ownership matrix

```text
PRM2_TENANT_FUNCTIONAL_OWNERSHIP = true
PRM2_CMS_FUNCTIONAL_OWNERSHIP = true
PRM2_CRM_FUNCTIONAL_OWNERSHIP = true
PRM2_SUPER_ADMIN_FUNCTIONAL_OWNERSHIP = true
PRM2_INTEGRATION_FUNCTIONAL_OWNERSHIP = true
PRM3_TENANT_FINAL_UX_OWNERSHIP = true
PRM3_CMS_FINAL_UX_OWNERSHIP = true
PRM3_CRM_FINAL_UX_OWNERSHIP = true
PRM3_SUPER_ADMIN_FINAL_UX_OWNERSHIP = true
THM1_TENANT_E2E_VALIDATION_REQUIRED = true
THM1_CMS_E2E_VALIDATION_REQUIRED = true
THM1_CRM_E2E_VALIDATION_REQUIRED = true
THM1_SUPER_ADMIN_E2E_VALIDATION_REQUIRED = true
THM1_INTEGRATION_E2E_VALIDATION_REQUIRED = true
THM2_TENANT_REMEDIATION_OWNERSHIP = true
THM2_CMS_REMEDIATION_OWNERSHIP = true
THM2_CRM_REMEDIATION_OWNERSHIP = true
THM2_SUPER_ADMIN_REMEDIATION_OWNERSHIP = true
THM2_INTEGRATION_REMEDIATION_OWNERSHIP = true
```

## 10. Product Discovery, Customization & Test Feedback Contract

```text
DOCUMENTATION_SUPPORTS_FUTURE_DISCOVERY = true
PROVIDER_CATALOG_IS_EXTENSIBLE = true
PORTAL_CATALOG_IS_EXTENSIBLE = true
MARKETING_CHANNEL_CATALOG_IS_EXTENSIBLE = true
CRM_CAPABILITY_CATALOG_IS_AUDIT_DRIVEN = true
CMS_CAPABILITY_CATALOG_IS_AUDIT_DRIVEN = true
DASHBOARD_REFINEMENT_IS_EXPECTED = true
SUPER_ADMIN_CAPABILITY_CATALOG_IS_AUDIT_DRIVEN = true
TENANT_CUSTOMIZATION_IS_EXPECTED = true
```

```text
SILENT_SCOPE_EXPANSION_AFTER_STAGE_START = prohibited
RETROACTIVE_DEFINITION_OF_DONE_EXPANSION = prohibited
UNBOUNDED_IMPLEMENTATION_PROMPTS = prohibited
TENANT_SPECIFIC_CODE_FORKS = prohibited
CLIENT_SIDE_AUTHORITY = prohibited
PARALLEL_CMS_RUNTIME = prohibited
DUPLICATE_CMS_EDITOR_PATH = prohibited
SUPER_ADMIN_DIRECT_TENANT_AUTHORITY = prohibited
```

## 11. Autorizações

```text
PRM2_PLANNING_AUTHORIZED = true
PRM2_PLANNING_EXECUTED = true
PRM2_IMPLEMENTATION_READY = false
PRM2_IMPLEMENTATION_AUTHORIZED = false
PRM2_PRINCIPAL_IMPLEMENTATION_PROMPT_CONSUMED = false
PRM2_CORRECTIVE_IMPLEMENTATION_PROMPT_CONSUMED = false
PRM2_REMAINING_IMPLEMENTATION_PROMPT_BUDGET = 2/2
PRM3_IMPLEMENTATION_AUTHORIZED = false
LOVABLE_EXECUTION_AUTHORIZED = false
DEPLOY_AUTHORIZED = false
LIVE_TESTING_AUTHORIZED = false
CONTROLLED_HOMOLOGATION_AUTHORIZED = false
PRODUCTION_AUTHORIZED = false
NEXT_STAGE_AUTHORIZED = none
```
