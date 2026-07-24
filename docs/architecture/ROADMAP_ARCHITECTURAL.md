# ROADMAP ARCHITECTURAL — RM Prime SaaS

**Status:** Ratificado — reconciliado por RPD-01  
**Autoridade:** Single Source of Future Evolution do RM Prime SaaS  
**Baseline do rebaseline:** `7d0ea2869e0c15887637063a85a833ccff0721c4`  
**Etapa atual:** `RPD-01 — Roadmap Product Delivery Rebaseline`  
**Executor desta etapa:** ChatGPT GitHub-native  

## 1. Regras permanentes

1. Architecture First e Impact Analysis antes de mudança estrutural ou runtime relevante.
2. GitHub `main` auditado é a fonte técnica final.
3. Servidor é a única autoridade para tenant, autorização e decisões comerciais.
4. Client, header e path nunca são autoridade.
5. Sem fallback implícito, tenant default, heurística, dual path ou `ORDER BY/LIMIT 1` autoritativo.
6. Ambiguidade falha rápido e fechado.
7. Super Admin sem impersonação explícita não acessa recurso tenant-scoped.
8. `x-tenant-id` é somente transporte e deve ser revalidado no servidor.
9. Storage não confia em bucket, path ou filename enviados pelo client.
10. Signed URL não é autorização primária.
11. Same-Backend Homologation Cell permanece vinculante.
12. Supabase externo não é fallback canônico.
13. Cada etapa admite no máximo um prompt principal e um corretivo consolidado.
14. Não criar lotes, sublotes ou identificadores decimais para contornar budget.
15. Nenhuma etapa sucessora inicia sem predecessor terminal compatível, Execution Envelope congelado e autorização explícita.

## 2. Estado arquitetural aceito

### 2.1 Fases encerradas

| Macro | Estado |
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
| HRI-01 | Accepted / Closed / Implementation and reconciliation merged |

### 2.2 Autoridade de Register

```text
CANONICAL_REGISTER_STRATEGY = generated route-tree augmentation
GENERATED_REGISTER_AUTHORITY_COUNT = 1
AUTHORED_REGISTER_DECLARATION_COUNT = 0
GENERATED_FILE_REWRITER_COUNT = 0
STRATEGY_B_ALLOWED = false
```

A autoridade única é o output oficial do gerador em `src/routeTree.gen.ts`.

### 2.3 Etapas terminais históricas

Os itens abaixo permanecem preservados como histórico e não podem ser reabertos:

```text
PR-M1
LSO-01
LSV-01
LSV-02
LSR-01
LSR-02
FRP-01
HVP-01
HRC-01
HRI-01
```

Estados `Rejected`, `Superseded` ou históricos não recuperam autoridade executável.

## 3. Caminho crítico executável após RPD-01

```text
HRI-01
Accepted / Closed
    ↓
RPD-01
Roadmap Product Delivery Rebaseline
    ↓
PR-M2
Tenant Product Functional Completion, Integrations,
White Label, CMS, CRM, Super Admin Control Plane,
Domains and Onboarding
    ↓
PR-M3
Product UX Refactor, Final Interface
and Operational Readiness
    ↓
PR-M3 deliverable
Pre-Homologation Release Candidate Deploy
    ↓
TH-M1
Pre-Homologation End-to-End Product Validation and UAT
    ↓
TH-M2
Consolidated Remediation, Regression
and Product Acceptance
    ↓
LSV-03
Same-Backend Controlled Security
and Multi-Tenant Validation
    ↓
Homologação formal
    ↓
Produção
```

O Release Candidate Deploy é deliverable da PR-M3, não etapa autônoma.

Homologação formal somente pode iniciar quando:

```text
PR-M2 = Accepted
PR-M3 = Accepted
TH-M1 = completed with findings report
TH-M2 = Accepted
LSV-03 = Accepted
```

Produção permanece bloqueada até homologação formal aceita e decisão explícita de produção.

## 4. Disposição da sequência anterior

| Etapa antiga | Disposição vigente |
|---|---|
| RRS-01 | Superseded by Accepted Later Authority — GNR-01/HRI-01 |
| PTA-01 | Absorbed by accepted PTW-01/PSG-01 and remaining PR-M2 functional inventory |
| MOC-01 | Absorbed by PR-M3 operational readiness and LSV-03 controlled validation |
| RHV-01 | Absorbed by LSV-03 |
| LSV-04 | Absorbed by TH-M2 and LSV-03 according to factual scope |
| RDA-01 | Absorbed by PR-M2 dashboard functional authority and PR-M3 final UX |
| RC-01 | Absorbed by TH-M1 and TH-M2 |

Os artefatos históricos continuam válidos para rastreabilidade, mas não formam uma cadeia executável concorrente.

## 5. PR-M2 — Tenant Product Functional Completion

**Estado:** Planned — blocked until RPD-01 acceptance and explicit planning authorization.

### 5.1 Ownership

PR-M2 é responsável por inventariar, completar e validar funcionalmente:

- tenant lifecycle e onboarding;
- usuários, memberships, roles e permissões;
- Configuration Center;
- domínio próprio, DNS, TXT, SSL, anti-takeover e Cloudflare;
- white label, site público e publicação;
- CMS, Content Workspace, page builder, templates, componentes e workflow editorial;
- imóveis, mídia e publicação em site/portais;
- Portal Connector Registry extensível;
- Marketing and Tracking Connector Registry extensível;
- ingestão automática de leads para o estágio inicial aceito do Kanban;
- CRM, Kanban, funil, histórico, conversas, tarefas, relatórios e automações;
- dashboard e relatórios tenant-scoped com autoridade funcional determinística;
- Super Admin SaaS Control Plane funcional, separado do Tenant Admin;
- planos, entitlements, limites e visibilidade comercial factual;
- integrações e diagnósticos operacionais.

### 5.2 Inventários obrigatórios

Antes de congelar implementação, cada domínio deve ser classificado como:

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

A existência de rota, tela, tabela ou componente não comprova completude funcional.

### 5.3 Portais e integrações

O catálogo de portais não é fechado. Cada integração deve registrar, no mínimo:

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

Métodos iniciais possíveis, sem limitação futura:

```text
JSON_API
XML_FEED
XLSX
CSV
WEBHOOK
MANUAL_EXPORT
CUSTOM_ADAPTER
```

Canais essenciais:

```text
META_ADS = required
GOOGLE_ADS = required
META_PIXEL = required
```

O desenho deve suportar LinkedIn Ads, TikTok Ads, Google Analytics, Google Tag Manager e canais futuros.

### 5.4 CRM e ingestão de leads

Leads de campanhas e integrações devem entrar automaticamente no CRM, no estágio inicial aceito do Kanban, com tenant derivado no servidor, provenance, origem, campanha, anúncio, UTM, deduplicação e histórico inicial.

O CRM deve ser auditado funcionalmente para captura, deduplicação, atribuição, Kanban, funil, tarefas, agenda, visitas, propostas, notas, anexos, histórico de ações, histórico de conversas, relatórios, automações, SLA, alertas, importação, exportação e permissões.

### 5.5 CMS

O CMS deve possuir inventário auditado de editor universal, adapters, dispatcher, metadata-driven forms, page builder, landing pages, blocos, widgets, templates, conteúdo, mídia, preview, versionamento, agendamento, publicação, rollback, permissões, workflow e SEO.

O catálogo de layouts, templates, componentes, controles editoriais e tipos de conteúdo deve ser extensível e data-driven, sem editor paralelo, runtime paralelo ou fork por tenant.

### 5.6 Super Admin SaaS Control Plane

```text
TENANT_ADMIN_DASHBOARD != SUPER_ADMIN_SAAS_CONTROL_PLANE
```

O Control Plane deve inventariar dashboard executivo global, tenants, usuários, memberships, roles, planos, entitlements, limites, domínios, integrações, portais, campanhas, incidentes, logs, auditoria, suporte, jobs, cron, filas, webhooks e diagnósticos.

Acesso tenant-scoped pelo Super Admin exige impersonação explícita, server-validated, visível e auditada.

## 6. PR-M3 — Product UX Refactor, Final Interface and Operational Readiness

**Estado:** Planned — blocked by PR-M2.

### 6.1 Executor e colaboração

```text
LOVABLE = primary implementation platform
UX_PRODUCT_PROFESSIONAL = active collaborator
CHATGPT_GITHUB_AUDIT = mandatory
```

Entrada do profissional de UX/produto:

```text
preparatory_entry = final discovery and handoff of PR-M2
primary_phase = entire PR-M3
validation_support = TH-M1 and TH-M2
```

### 6.2 Escopo

PR-M3 é responsável pela interface final de:

- Tenant Admin;
- Super Admin Control Plane;
- CRM, Kanban, leads e funil;
- CMS, editor, page builder, preview e publicação;
- dashboards, KPIs, gráficos, tabelas, filtros e relatórios;
- onboarding, Configuration Center, domínios, portais e campanhas;
- design system, tokens, tipografia, temas, espaçamento e estados;
- navegação, responsividade, acessibilidade, feedback visual e performance percebida.

Imagens de referência fornecidas pelo Product Owner definem somente densidade informacional, composição, organização de cards, hierarquia de métricas e visibilidade operacional. Não definem paleta, tema, tipografia, identidade ou estilo final.

### 6.3 Exit gate

```text
FINAL_FRONTEND_IMPLEMENTED = true
FINAL_TENANT_DASHBOARD_IMPLEMENTED = true
FINAL_SUPER_ADMIN_CONTROL_PLANE_UX_IMPLEMENTED = true
FINAL_CMS_EDITOR_EXPERIENCE_IMPLEMENTED = true
FINAL_CRM_EXPERIENCE_IMPLEMENTED = true
CRITICAL_FLOWS_USABLE = true
RESPONSIVE_VALIDATION_PASSED = true
ACCESSIBILITY_CRITICALS_RESOLVED = true
PRE_HOMOLOGATION_RELEASE_CANDIDATE_DEPLOYED = true
TEAM_TEST_ENVIRONMENT_AVAILABLE = true
```

O deploy da PR-M3 é pré-homologação e não autoriza produção.

## 7. TH-M1 — Pre-Homologation End-to-End Product Validation and UAT

**Estado:** Planned — blocked by PR-M3.

TH-M1 não é homologação formal. Ela executa validação interna completa por Product Owner, time interno, profissional de UX/produto e operadores autorizados.

Deve testar, no mínimo:

- criação, onboarding, suspensão e reativação de tenant;
- usuários, roles, permissões e convites;
- domínio, DNS, Cloudflare, SSL, white label, CMS e publicação;
- CMS end-to-end, do rascunho ao rollback;
- cadastro completo de imóvel, mídia, site e nenhum/um/vários portais;
- dashboards e relatórios do Tenant Admin;
- CRM, Kanban, funil, histórico, conversas, automações e relatórios;
- Meta Ads, Google Ads, Meta Pixel, analytics, GTM, LinkedIn, TikTok, UTMs e conversões;
- Super Admin global, tenants, planos, limites, diagnósticos, suporte, auditoria e impersonação.

Resultado obrigatório:

```text
THM1_FINDINGS_REPORT = required
THM1_PRODUCT_ACCEPTANCE = not automatic
```

## 8. TH-M2 — Consolidated Remediation, Regression and Product Acceptance

**Estado:** Planned — blocked by TH-M1.

TH-M2 recebe um inventário consolidado e classifica defeitos bloqueantes de backend/frontend, capacidades essenciais ausentes, falhas de autorização ou isolamento, falhas de integração, refinamentos de UX/dashboard, extensões de conector, customizações tenant, achados de CMS, CRM e Super Admin, além de backlog não bloqueante.

TH-M2 executa correções bloqueantes, capacidades essenciais ausentes, regressão completa, repetição dos fluxos críticos, validação de segurança aplicável e Product Acceptance Review.

## 9. LSV-03 — Same-Backend Controlled Security and Multi-Tenant Validation

**Estado:** Planned — blocked by TH-M2.

LSV-03 ocorre somente após aceitação funcional e visual do produto. Seu escopo é técnico e controlado:

- tenant A versus tenant B;
- sessões controladas;
- forged headers e payloads;
- impersonação;
- RLS, grants e policies;
- Storage isolation;
- public writers e readers;
- signed resources;
- cron, queues, webhooks e outbound controls;
- fixture manifest;
- teardown;
- residue scan;
- protected baseline unchanged.

LSV-03 não é usada para descobrir funcionalidades básicas ausentes ou defeitos comuns de UX, CRM, CMS, dashboard ou Super Admin.

## 10. Product Discovery, Customization & Test Feedback Contract

### 10.1 Flexibilidade obrigatória

```text
DOCUMENTATION_SUPPORTS_FUTURE_DISCOVERY = true
PROVIDER_CATALOG_IS_EXTENSIBLE = true
PORTAL_CATALOG_IS_EXTENSIBLE = true
MARKETING_CHANNEL_CATALOG_IS_EXTENSIBLE = true
CRM_CAPABILITY_CATALOG_IS_AUDIT_DRIVEN = true
CRM_WORKFLOW_REFINEMENT_IS_EXPECTED = true
DASHBOARD_REFINEMENT_IS_EXPECTED = true
TENANT_CUSTOMIZATION_IS_EXPECTED = true
CMS_CAPABILITY_CATALOG_IS_AUDIT_DRIVEN = true
CMS_COMPONENT_CATALOG_IS_EXTENSIBLE = true
CMS_TEMPLATE_CATALOG_IS_EXTENSIBLE = true
CMS_LAYOUT_CATALOG_IS_EXTENSIBLE = true
CMS_CONTENT_TYPE_CATALOG_IS_EXTENSIBLE = true
CMS_EDITOR_UX_REFINEMENT_IS_EXPECTED = true
CMS_PUBLICATION_WORKFLOW_REFINEMENT_IS_EXPECTED = true
SUPER_ADMIN_CAPABILITY_CATALOG_IS_AUDIT_DRIVEN = true
SUPER_ADMIN_DASHBOARD_REFINEMENT_IS_EXPECTED = true
SUPER_ADMIN_OPERATIONAL_WIDGETS_ARE_EXTENSIBLE = true
SUPER_ADMIN_REPORT_CATALOG_IS_EXTENSIBLE = true
SUPER_ADMIN_SUPPORT_TOOLS_ARE_EXTENSIBLE = true
```

### 10.2 Limites da flexibilidade

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

Novos requisitos identificados antes de uma etapa podem entrar no Execution Envelope. Achados durante execução devem ser classificados. Defeitos bloqueantes dentro do escopo podem usar o corretivo consolidado; melhorias e extensões não podem ampliar silenciosamente a etapa. Descobertas da TH-M1 são consolidadas para TH-M2.

## 11. Backlogs arquiteturais preservados

- Upload Provenance Token;
- M3.3.2 Metadata Rewrite Batch;
- Media Picker Return Contract Normalization;
- Public Asset Strategy / CDN / Cache;
- billing provider real, checkout, customer portal e webhooks comerciais reais;
- GA-07 — `docs/architecture/DECISION_LOG.md`;
- GA-08 — Documentation Repository Reorganization;
- Storage Abstraction Layer;
- Plugin Marketplace Evolution;
- Workspace Ingestion System;
- Observability Layer.

Backlogs não substituem o caminho crítico e não autorizam implementação automática.

## 12. Estado e próxima ação

```text
RPD01_STATE = Planning Complete — Ready for Direct External Audit
RPD01_ACCEPTED = false
RPD01_MERGE_AUTHORIZED = false
RPD01_PRINCIPAL_PROMPT_CONSUMED = true
RPD01_CORRECTIVE_PROMPT_CONSUMED = false
RPD01_REMAINING_PROMPT_BUDGET = 1/2
PRM2_PLANNING_AUTHORIZED = false
PRM2_IMPLEMENTATION_AUTHORIZED = false
PRM3_IMPLEMENTATION_AUTHORIZED = false
LOVABLE_EXECUTION_AUTHORIZED = false
DEPLOY_AUTHORIZED = false
LIVE_TESTING_AUTHORIZED = false
CONTROLLED_HOMOLOGATION_AUTHORIZED = false
PRODUCTION_AUTHORIZED = false
NEXT_STAGE_AUTHORIZED = none
```

Próxima ação: Release Gate e auditoria externa direta do PR de planejamento RPD-01. Nenhuma etapa posterior está autorizada por este documento.
