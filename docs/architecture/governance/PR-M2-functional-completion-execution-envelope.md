# PR-M2 — Functional Completion Execution Envelope

## Status

**Frozen for audit — implementation not ready and not authorized**

```text
STAGE_ID = PR-M2
STAGE_NAME = Functional Completion
STAGE_TYPE = implementation
PREDECESSOR = RPD-01 Accepted / Closed
SUCCESSOR = PR-M3
AUDITED_MAIN_HEAD = 985a48e26c72c36aa80cac21ab32c768dac84c17

PRM2_PLANNING_AUTHORIZED = true
PRM2_PLANNING_EXECUTED = true
PRM2_IMPLEMENTATION_AUTHORIZED = false

IMPLEMENTATION_SCOPE_FINITE = false
PRM2_IMPLEMENTATION_READY = false

PRM2_PRINCIPAL_IMPLEMENTATION_PROMPT_CONSUMED = false
PRM2_CORRECTIVE_IMPLEMENTATION_PROMPT_CONSUMED = false
PRM2_REMAINING_IMPLEMENTATION_PROMPT_BUDGET = 2/2
```

## 1. Objetivo fechado

Concluir funcionalmente o produto pré-homologação sem reabrir fases aceitas, preservando tenant authority server-side, isolamento multi-tenant, boundaries públicos aceitos e runtime comercial da Fase 4.

Este envelope não autoriza implementação. Ele congela o estado factual apurado e define as condições mínimas para que um futuro prompt principal possa existir.

## 2. Escopo incluído após futura autorização

Somente após `PRM2_IMPLEMENTATION_READY = true` e autorização expressa, o escopo poderá incluir:

1. consolidação de boundaries tenant-scoped do Tenant Admin;
2. tenant lifecycle, onboarding, owner inicial, convites e memberships;
3. conclusão do Configuration Center e white label;
4. conclusão funcional de CMS, CRM, dashboards e Super Admin;
5. conclusão do Portal Connector Registry;
6. ingestão de marketing/campanhas e atribuição;
7. visibilidade frontend dos contratos comerciais já aceitos;
8. testes determinísticos e evidência de regressão.

## 3. Escopo excluído

```text
PR-M3 final UX/UI
TH-M1 UAT
TH-M2 consolidated remediation
LSV-03 controlled security validation
formal homologation
production
provider charging
checkout
customer billing portal
production deploy
live testing
tenant-specific code forks
parallel CMS runtime
duplicate editor
```

Também permanecem excluídos:

- reabertura das Fases 2, 3 e 4;
- substituição de `requireTenant`;
- reimplementação do public Host authority;
- reimplementação do lead transition boundary;
- reimplementação do commercial feature gate e seat-limit authority;
- Supabase externo como fallback canônico.

## 4. Capacidades concluídas protegidas

```text
AUTHENTICATED_TENANT_AUTHORITY = requireTenant
PUBLIC_TENANT_AUTHORITY = Host-derived fail-closed resolution
SUPER_ADMIN_TENANT_ACCESS = explicit impersonation only
PUBLIC_LEAD_WRITER = accepted tenant-bound writer
LEAD_TRANSITION_AUTHORITY = transition_lead_status through typed boundary
COMMERCIAL_READ_AUTHORITY = accepted Fase 4 server functions
COMMERCIAL_FEATURE_GATE = accepted
COMMERCIAL_SEAT_LIMIT_AUTHORITY = SQL RPC accepted
GENERATED_REGISTER_AUTHORITY_COUNT = 1
AUTHORED_REGISTER_DECLARATION_COUNT = 0
GENERATED_FILE_REWRITER_COUNT = 0
```

Essas capacidades não podem ser substituídas por fallback, wrapper paralelo ou client authority.

## 5. Gaps obrigatórios

### 5.1 Authority boundary

- eliminar `requireSupabaseAuth + has_role` como autoridade suficiente em recursos tenant-scoped;
- consolidar imóveis, imagens, corretores, usuários, RBAC, CMS, portais, CRM reporting e dashboards em boundaries canônicos;
- proibir bypass tenant-scoped do Super Admin em `_cms.assertCmsPermission`;
- remover paths de Storage enviados pelo client como autoridade de remoção;
- tornar o scope RBAC efetivo no runtime, não apenas configurável.

### 5.2 Produto

- onboarding e owner inicial;
- convites e aceite de membership;
- lifecycle completo de tenant;
- domínio customizado operacional;
- Portal Connector Registry canônico;
- ingestão de canais de marketing;
- CMS extensível e workflow completo;
- CRM com tarefas, agenda, visitas, propostas, automações, import/export e comunicação;
- dashboards com tenant authority e fórmulas testadas;
- Super Admin Control Plane completo;
- visibilidade frontend comercial.

## 6. Gaps não bloqueantes da PR-M2

Os itens abaixo podem permanecer backlog somente se não impedirem o fluxo pré-homologação aceito e forem explicitamente aprovados pela auditoria:

- refinamentos visuais reservados à PR-M3;
- conectores adicionais além do conjunto mínimo formalmente escolhido;
- relatórios e extensões de suporte não essenciais;
- canais futuros além de Meta Ads, Google Ads e Meta Pixel;
- otimizações de performance sem regressão funcional.

## 7. Itens que exigem decisão autônoma

```text
CLOUDFLARE_INTEGRATION_MODEL_DECISION_REQUIRED = true
COMMERCIAL_ADMIN_AUTHORIZATION_DECISION_REQUIRED = true
```

### 7.1 Cloudflare

A escolha entre `MANUAL_ASSISTED`, `API_AUTOMATED` e `HYBRID` deve definir credenciais, DNS, TXT, SSL, anti-takeover, redirects, jobs, retries, rollback e diagnósticos.

### 7.2 Commercial admin

Qualquer gestão de planos, entitlements, limits ou provider mappings exige authorization layer própria. Role tenant, `has_role` e Super Admin impersonation não podem ser reutilizados como autoridade comercial.

Nenhum novo stage ID é criado por este envelope.

## 8. Arquivos permitidos

Como `PRM2_IMPLEMENTATION_READY = false`, nenhum arquivo de implementação está autorizado:

```text
FILES_ALLOWED = none
FILES_PROHIBITED = all runtime, frontend, database, migration, workflow and dependency files
```

Uma lista futura de `FILES_ALLOWED` somente poderá ser materializada por alteração documental auditada e aceita, sem consumir antecipadamente o prompt principal.

## 9. Migrations, RLS e grants

```text
MIGRATIONS_ALLOWED = none
RLS_CHANGES_ALLOWED = none
POLICY_CHANGES_ALLOWED = none
GRANT_CHANGES_ALLOWED = none
SQL_FUNCTION_CHANGES_ALLOWED = none
```

Mudanças futuras deverão:

- preservar RLS e grants mínimos;
- usar tenant authority server-side;
- falhar fechadas em ambiguidade;
- proibir `ORDER BY/LIMIT 1` como autoridade;
- impedir Super Admin sem impersonação em dados tenant-scoped;
- incluir rollback explícito e specs SQL estruturais.

## 10. Boundaries server-side vinculantes

```text
requireTenant
requirePublicTenantFromRequest
requirePublicWriterTenantFromRequest
lead-operations.server
lead-transition.server
commercial.functions
resolve_commercial_seat_decision
```

Qualquer novo boundary deverá ser derivado desses contratos ou possuir Impact Analysis específico.

## 11. Contratos de frontend

O frontend:

- não envia tenant como autoridade;
- não decide autorização;
- não decide entitlement ou limit;
- não escolhe bucket/path/filename autoritativos;
- não acessa tabelas comerciais diretamente;
- não expõe service role;
- apresenta estado de impersonação;
- apresenta erro determinístico e não inventa fallback;
- mantém PR-M3 responsável pela apresentação visual final.

## 12. Contratos de dados

- toda linha tenant-scoped possui `tenant_id` consistente;
- ids recebidos são revalidados contra tenant no servidor;
- coleções 0/1/N têm cardinalidade explícita;
- referências de credenciais são seguras;
- adapters e mappings são versionáveis;
- status e transições usam domínios fechados;
- mutações críticas são atômicas ou compensáveis;
- logs e auditoria não podem criar autoridade.

## 13. Testes obrigatórios para futura implementação

```text
typecheck
build:dev
build
deterministic route generation
tenant middleware specs
tenant selection specs
public tenant context specs
public writer authority specs
public surface security specs
lead authorization specs
lead runtime operation specs
lead structural specs
lead SQL structural specs
commercial read model specs
commercial feature gate specs
commercial seat-limit specs
cross-tenant negative tests
Super Admin without impersonation negative tests
forged x-tenant-id tests
Storage path provenance tests
RLS/policy/grant structural tests
CMS draft-preview-publish-rollback tests
CRM transition/history/report consistency tests
dashboard formula and tenant isolation tests
portal registry/adapter/idempotency tests
```

## 14. Definition of Done futura

A PR-M2 somente poderá ser `Accepted` quando:

```text
ALL_BLOCKING_CAPABILITIES_COMPLETE = true
LEGACY_OR_DUAL_PATH_COUNT = 0
REQUIRES_REDESIGN_COUNT = 0
UNAUTHORIZED_SUPER_ADMIN_TENANT_ACCESS = 0
CLIENT_TENANT_AUTHORITY = false
CLIENT_STORAGE_PATH_AUTHORITY = false
CMS_PARALLEL_RUNTIME_COUNT = 0
DUPLICATE_EDITOR_PATH_COUNT = 0
PORTAL_REGISTRY_CANONICAL = true
CRM_FUNCTIONAL_COMPLETION = true
DASHBOARD_FUNCTIONAL_AUTHORITY = true
SUPER_ADMIN_CONTROL_PLANE_COMPLETE = true
COMMERCIAL_FRONTEND_VISIBILITY_COMPLETE = true
TYPECHECK_PASSED = true
BUILD_DEV_PASSED = true
BUILD_PASSED = true
RELEASE_GATE_PASSED = true
FILES_OUTSIDE_ALLOWED = 0
```

## 15. Rollback

Nenhuma implementação está autorizada neste estado. O rollback documental do planejamento é o fechamento do PR sem merge.

Um futuro rollback de implementação deverá restaurar o SHA inicial do stage, reverter migrations em ordem segura, preservar dados e provar ausência de resíduos.

## 16. Relatório final futuro

O executor futuro deverá entregar contagens de arquivos, migrations, policies, grants, testes, classificações resolvidas, gaps remanescentes, hashes, Release Gate e budget.

## 17. Budget

```text
PRM2_PRINCIPAL_IMPLEMENTATION_PROMPT_CONSUMED = false
PRM2_CORRECTIVE_IMPLEMENTATION_PROMPT_CONSUMED = false
PRM2_REMAINING_IMPLEMENTATION_PROMPT_BUDGET = 2/2
```

O planejamento não consome budget de implementação.

## 18. Estado máximo após esta execução

```text
PRM2_STATE = Planning — Ready for Final Direct External Audit
PRM2_IMPLEMENTATION_READY = false
PRM2_IMPLEMENTATION_AUTHORIZED = false
PRM3_STATE = Planned — Blocked by PR-M2
NEXT_STAGE_AUTHORIZED = none
```

## 19. Condição para prompt principal

O prompt principal somente poderá ser emitido após:

1. auditoria direta deste PR de planejamento;
2. aceite ou correção consolidada do inventário;
3. resolução explícita das duas decisões autônomas;
4. materialização auditada de `FILES_ALLOWED`;
5. comprovação de que o escopo cabe em um principal e um corretivo;
6. autorização expressa do Rodolfo.

```text
READY_FOR_FINAL_DIRECT_EXTERNAL_AUDIT = true
READY_FOR_PRM2_PRINCIPAL_PROMPT = false
```
