# ROADMAP ARCHITECTURAL — RM Prime SaaS

**Status:** Ratificado — RPD-01 Accepted; reconciliação pós-merge pronta para auditoria externa  
**Autoridade:** Single Source of Future Evolution do RM Prime SaaS  
**Baseline anterior:** `7d0ea2869e0c15887637063a85a833ccff0721c4`  
**Main após merge do planejamento:** `1acf99e272e448e834b52a0018e3d34b79f0a133`  
**Executor:** ChatGPT GitHub-native

## 1. Estado vinculante da RPD-01

```text
STAGE_ID = RPD-01
FINAL_EXTERNAL_AUDIT = Accepted
RPD01_STATE = Accepted
RPD01_ACCEPTED = true

RPD01_PLANNING_PR = 55
RPD01_PLANNING_HEAD = 8a56c758ca1d8b127dd0ee736769f0b4171f4c7d
RPD01_PLANNING_MERGED = true
RPD01_PLANNING_MERGE_SHA = 1acf99e272e448e834b52a0018e3d34b79f0a133

RPD01_RECONCILIATION_STATE = Ready for Direct External Audit
RPD01_RECONCILIATION_MERGED = false
```

Release Gates:

```text
RPD01_PLANNING_RELEASE_GATE_RUN_ID = 30132995455
RPD01_PLANNING_RELEASE_GATE_JOB_ID = 89611181337
RPD01_PLANNING_RELEASE_GATE_RESULT = success
RPD01_PLANNING_RELEASE_GATE_ARTIFACT_ID = 8611824397
RPD01_PLANNING_RELEASE_GATE_ARTIFACT_DIGEST = sha256:7052f7f3b31e4aaadf23f32a4004a2d3d9c3081cb84090fb130c0dc44d80bb86

POST_MERGE_RELEASE_GATE_RUN_ID = 30134139802
POST_MERGE_RELEASE_GATE_JOB_ID = 89614524262
POST_MERGE_RELEASE_GATE_RESULT = success
POST_MERGE_RELEASE_GATE_ARTIFACT_ID = 8612216615
POST_MERGE_RELEASE_GATE_ARTIFACT_DIGEST = sha256:bf474c3858f4b1e704df19c7e174f4bb2ad69c8c99ff4f7b4e7821f223df0308
```

## 2. Regras permanentes

1. Architecture First e Impact Analysis antes de mudança estrutural ou runtime relevante.
2. GitHub `main` auditado é a fonte técnica final.
3. Servidor é a única autoridade para tenant, autorização e decisões comerciais.
4. Client, header e path nunca são autoridade.
5. Sem fallback implícito, tenant default, heurística, dual path ou `ORDER BY/LIMIT 1` autoritativo.
6. Ambiguidade falha rápido e fechado.
7. Super Admin sem impersonação explícita não acessa recurso tenant-scoped.
8. `x-tenant-id` é transporte e deve ser revalidado pelo servidor.
9. Storage não confia em bucket, path ou filename enviados pelo client.
10. Signed URL não é autorização primária.
11. Same-Backend Homologation Cell permanece vinculante.
12. Supabase externo não é fallback canônico.
13. Cada etapa admite no máximo um prompt principal e um corretivo consolidado.
14. Nenhuma etapa sucessora inicia sem predecessor terminal compatível, Execution Envelope congelado e autorização explícita.

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
| RPD-01 | Accepted; planejamento merged; reconciliação em auditoria externa |

Autoridade de Register:

```text
CANONICAL_REGISTER_STRATEGY = generated route-tree augmentation
GENERATED_REGISTER_AUTHORITY_COUNT = 1
AUTHORED_REGISTER_DECLARATION_COUNT = 0
GENERATED_FILE_REWRITER_COUNT = 0
STRATEGY_B_ALLOWED = false
```

## 4. Caminho crítico executável

```text
HRI-01 Accepted / Closed
→ RPD-01 Accepted
→ PR-M2 Planned — Blocked pending explicit authorization
→ PR-M3 Product UX Refactor, Final Interface and Operational Readiness
→ PR-M3 deliverable: Pre-Homologation Release Candidate Deploy
→ TH-M1 Pre-Homologation End-to-End Product Validation and UAT
→ TH-M2 Consolidated Remediation, Regression and Product Acceptance
→ LSV-03 Same-Backend Controlled Security and Multi-Tenant Validation
→ Homologação formal
→ Produção
```

O Release Candidate Deploy é deliverable da PR-M3, não etapa autônoma. A homologação formal somente pode iniciar quando PR-M2 e PR-M3 estiverem Accepted, TH-M1 tiver relatório completo, TH-M2 estiver Accepted e LSV-03 estiver Accepted.

## 5. Disposição da sequência anterior

| Etapa antiga | Disposição vigente |
|---|---|
| RRS-01 | Superseded by Accepted Later Authority — GNR-01/HRI-01 |
| PTA-01 | Absorbed by accepted PTW-01/PSG-01 and PR-M2 |
| MOC-01 | Absorbed by PR-M3 and LSV-03 |
| RHV-01 | Absorbed by LSV-03 |
| LSV-04 | Absorbed by TH-M2 and LSV-03 |
| RDA-01 | Absorbed by PR-M2 and PR-M3 |
| RC-01 | Absorbed by TH-M1 and TH-M2 |

Registros históricos são preservados, mas não formam cadeia executável concorrente.

## 6. PR-M2 — ownership funcional

**Estado:** Planned — Blocked pending explicit authorization.

PR-M2 deverá auditar, classificar, completar e validar funcionalmente:

- tenant lifecycle, onboarding, usuários, memberships, roles e permissões;
- Configuration Center;
- domínios, DNS/TXT, SSL, anti-takeover e decisão Cloudflare;
- white label, site público, publicação e rollback;
- CMS, Content Workspace, editor, page builder, templates e workflow;
- imóveis, mídia e publicação em nenhum, um ou vários portais;
- Portal Connector Registry extensível;
- Marketing and Tracking Connector Registry extensível;
- ingestão automática de leads no estágio inicial aceito do Kanban;
- CRM, Kanban, funil, histórico, conversas, tarefas, relatórios e automações;
- dashboards tenant-scoped com autoridade funcional determinística;
- Super Admin SaaS Control Plane separado do Tenant Admin;
- planos, entitlements, limites, billing visibility e diagnósticos.

Classificação mínima:

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

## 7. Extensibilidade obrigatória

Portais e métodos iniciais não constituem lista fechada:

```text
JSON_API
XML_FEED
XLSX
CSV
WEBHOOK
MANUAL_EXPORT
CUSTOM_ADAPTER
```

Canais essenciais e extensíveis:

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

Leads de campanhas devem entrar automaticamente no CRM com tenant derivado no servidor, provenance, origem, campanha, anúncio, UTM, deduplicação e histórico inicial.

## 8. CMS, CRM, dashboards e Super Admin

```text
CMS_CAPABILITY_CATALOG_IS_AUDIT_DRIVEN = true
CMS_COMPONENT_CATALOG_IS_EXTENSIBLE = true
CMS_TEMPLATE_CATALOG_IS_EXTENSIBLE = true
CMS_LAYOUT_CATALOG_IS_EXTENSIBLE = true
CMS_EDITOR_UX_REFINEMENT_IS_EXPECTED = true

CRM_CAPABILITY_CATALOG_IS_AUDIT_DRIVEN = true
CRM_WORKFLOW_REFINEMENT_IS_EXPECTED = true
KANBAN_STAGE_CONFIGURATION_IS_EXTENSIBLE = true

DASHBOARD_REFINEMENT_IS_EXPECTED = true
SUPER_ADMIN_CAPABILITY_CATALOG_IS_AUDIT_DRIVEN = true
TENANT_CUSTOMIZATION_IS_EXPECTED = true
```

```text
TENANT_ADMIN_DASHBOARD != SUPER_ADMIN_SAAS_CONTROL_PLANE
SUPER_ADMIN_GLOBAL_AUTHORITY = global platform administration only
SUPER_ADMIN_TENANT_SCOPED_ACCESS = explicit impersonation only
SUPER_ADMIN_WITHOUT_IMPERSONATION_TENANT_ACCESS = prohibited
```

Impersonação deve ser explícita, server-validated, visível, reversível e auditada.

## 9. PR-M3, TH-M1, TH-M2 e LSV-03

PR-M3 é responsável pela interface final do Tenant Admin, Super Admin, CRM, CMS, dashboards, relatórios, onboarding, domínios, portais e campanhas. Lovable é a plataforma primária planejada; o profissional de UX/produto entra no handoff final da PR-M2, participa de toda a PR-M3 e apoia TH-M1/TH-M2.

As imagens fornecidas pelo Product Owner são referências somente de densidade informacional, composição, organização de cards, hierarquia de métricas e visibilidade operacional. Não definem paleta, tema, tipografia, identidade ou estilo final.

TH-M1 é UAT interna pré-homologação e produz relatório consolidado. TH-M2 executa remediação, regressão e Product Acceptance Review. LSV-03 ocorre depois da aceitação funcional e visual e valida segurança, isolamento e Same-Backend Homologation Cell.

## 10. Contrato de descoberta e testes

```text
DOCUMENTATION_SUPPORTS_FUTURE_DISCOVERY = true
PORTAL_CATALOG_IS_EXTENSIBLE = true
MARKETING_CHANNEL_CATALOG_IS_EXTENSIBLE = true
CRM_CAPABILITY_CATALOG_IS_AUDIT_DRIVEN = true
CMS_CAPABILITY_CATALOG_IS_AUDIT_DRIVEN = true
DASHBOARD_REFINEMENT_IS_EXPECTED = true
SUPER_ADMIN_CAPABILITY_CATALOG_IS_AUDIT_DRIVEN = true
TENANT_CUSTOMIZATION_IS_EXPECTED = true
```

Proibido:

```text
SILENT_SCOPE_EXPANSION_AFTER_STAGE_START
RETROACTIVE_DEFINITION_OF_DONE_EXPANSION
UNBOUNDED_IMPLEMENTATION_PROMPTS
TENANT_SPECIFIC_CODE_FORKS
CLIENT_SIDE_AUTHORITY
PARALLEL_CMS_RUNTIME
DUPLICATE_CMS_EDITOR_PATH
SUPER_ADMIN_DIRECT_TENANT_AUTHORITY
```

Descobertas da TH-M1 são consolidadas para TH-M2; itens não bloqueantes recebem owner, prioridade e backlog.

## 11. Budget e autorizações

```text
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
