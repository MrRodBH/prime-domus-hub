# ROADMAP ARCHITECTURAL — RM Prime SaaS

**Status:** Ratificado  
**Autoridade:** Single Source of Future Evolution do RM Prime SaaS  
**Última reconciliação estrutural:** PR-PH.0 — Macro Execution Consolidation

> Este documento registra o estado arquitetural aceito, os próximos gates executáveis e os backlogs formais. Impact Analyses, ADRs, implementações e auditorias devem respeitar esta sequência.

---

## 1. Sistema de governança

| Artefato | Autoridade |
|---|---|
| `ARCHITECTURE_CONSTITUTION.md` | regras permanentes e invariantes |
| `SECURITY_ARCHITECTURE.md` | fronteiras e decisões permanentes de segurança |
| `ADR/` | decisões arquiteturais aceitas e imutáveis |
| `impact-analysis/` | análise e contrato prévio de execução |
| `ROADMAP_ARCHITECTURAL.md` | ordem e escopo da evolução futura |
| `docs/delivery/` | evidência de execução, validação e auditoria |

Fluxo obrigatório:

```text
Roadmap
  → Impact Analysis / macro contract
  → ADR, quando necessário
  → implementação
  → relatório mínimo
  → auditoria crítica externa
  → Accepted ou uma única correção consolidada
```

### 1.1 Regra de execução macro

- Um estágio de roadmap corresponde a um prompt macro de execução.
- Workstreams internos não são etapas e não recebem aprovação independente.
- É proibido criar cadeias `.1`, `.2`, `.3` para correções ordinárias, status, relatório ou roadmap.
- Cada gate admite no máximo uma correção consolidada após auditoria.
- O GitHub é a fonte primária da auditoria.
- O relatório em chat deve ser uma cápsula mínima de evidências.

---

## 2. Invariantes arquiteturais permanentes

1. Client nunca é autoridade.
2. Servidor é a autoridade única para tenant, autorização e decisões comerciais.
3. `x-tenant-id` é transporte, não autorização.
4. Sem fallback implícito, tenant default, heurística, `LIMIT 1` autoritativo ou dual path.
5. Tenant desconhecido, ambíguo ou não autorizado falha fechado.
6. Cardinalidade é explícita: zero, um e N.
7. Super Admin acessa escopo tenant somente sob impersonação explícita validada no servidor.
8. Membership, `tenant_role`, `app_role`, RBAC e commercial entitlement são domínios separados.
9. `tenant_role` não concede autorização ampla nem comercial implicitamente.
10. Commercial entitlement não substitui membership authorization.
11. RLS não pode ser relaxada para compensar boundary ausente.
12. Runtime possui uma única autoridade por domínio; não há resolvers ou executores paralelos.
13. Storage não confia em path informado pelo client.
14. Signed URL não é autorização primária.
15. Toda claim de runtime exige evidência direta ou teste executável.

---

## 3. Estado arquitetural aceito

### 3.1 Núcleo de produto e plugins

- ResolutionGraph imutável e resolução O(1) — Accepted.
- Registry → RegistrySnapshot → ResolutionGraph — Accepted.
- ActionExecutor como executor único — Accepted.
- PluginContext sandboxed/read-only — Accepted.
- Workspace Runtime baseado nos hooks e boundaries oficiais — Accepted.
- Sem dual path, fallback ou registry alternativo — regra permanente.

### 3.2 Fase 2 — Multi-Tenant Core — Closed / Accepted

| Domínio | Estado |
|---|---|
| IA-001 / Tenant Middleware | Accepted |
| IA-002 / Client Impersonation Layer | Accepted |
| IA-003 / RLS Policies | Accepted |
| M2b e M2b.1 / RLS materialization and correction | Accepted |
| IA-004 / Tenant Storage Isolation | Accepted |
| M3.2 / Server-authoritative upload target | Accepted |
| M3.3 e M3.3.1 / Legacy storage inventory | Accepted |
| M3.4 e M3.4.1 / Signed URL hardening | Accepted |
| M3.5 / Media Picker validation | Accepted |

Backlogs não bloqueantes preservados:

- Upload Provenance Token;
- M3.3.2 — Metadata Rewrite Batch;
- Media Picker Return Contract Normalization;
- Public Asset Strategy / CDN / Cache.

### 3.3 Fase 3 — Membership Evolution Model — Closed / Accepted

| Etapa consolidada | Estado |
|---|---|
| F3.1 — Membership Schema Foundation | Accepted |
| F3.2 — Server-Side Tenant Selection | Accepted |
| F3.3 — RLS Membership Selection | Accepted |
| F3.4 — Tenant Selection Transport / Client State | Accepted |
| F3.5 — Tenant Switcher UX | Accepted |
| F3.6 — Membership Roles & Status Validation | Accepted |
| F3.7 — Closing Review | Accepted |

Resultado vinculante:

- múltiplas memberships suportadas;
- seleção explícita e server-authoritative;
- `membership_status` e `tenant_role` tipados;
- Super Admin separado de seleção comum de tenant;
- zero tenant implícito.

### 3.4 Fase 4 — SaaS Commercial Platform — Closed / Accepted

Accepted:

- IA-006;
- ADR-005;
- ADR-006;
- F4.0;
- SCP-001 a SCP-012, incluindo suas cadeias históricas de reconciliação;
- F4-CF-01;
- Phase 4 Closing Review.

Resultado vinculante:

- modelo de domínio comercial materializado;
- catálogo de feature keys e validação server-side;
- feature gate comercial fail-closed;
- contratos e runtime de limites de uso;
- decisão comercial de assentos;
- mutation atômica de membership com enforcement comercial na mesma transação;
- boundaries server-only;
- zero escrita direta de `tenant_members` no runtime TypeScript;
- ACL e RLS preservadas;
- assinatura comercial não substitui membership.

Fora do escopo aceito da Fase 4 e ainda futuro:

- billing provider real;
- checkout;
- customer portal;
- webhooks públicos reais;
- upgrade, downgrade e cancelamento reais;
- invitation flow final;
- UI comercial final.

Risco operacional preservado:

- dependência da managed role `sandbox_exec`, documentada em `SECURITY_ARCHITECTURE.md` e no closing review.

---

## 4. Product Readiness — estado atual

### 4.1 PR-PH.0 — Pre-Homologation Product Readiness Impact Analysis

**Status:** Accepted.

Artefato canônico:

```text
docs/architecture/impact-analysis/
PR-PH-0-pre-homologation-product-readiness-impact-analysis.md
```

Decisões aceitas:

- repository evidence lock concluído;
- claims incorretas de CRM e host resolution removidas;
- `portal-engine.server.ts` não é host resolver;
- resolver público existente está desconectado e contém fallback default proibido;
- runtime público deve falhar fechado para host desconhecido;
- PR-PH.1–PR-PH.12 permanecem como workstreams históricos, não gates executáveis;
- TH-001–TH-006 permanecem como workstreams históricos, não gates executáveis;
- toda execução restante é consolidada nos cinco macrogates abaixo.

### 4.2 Caminho crítico executável — Cadeia de Etapas Executáveis

```text
PR-PH.0  Accepted
PR-M1    Superseded
LSO-01   Rejected
LSH-01   In Progress · Recovery Mode (Lotes A e B completed; Lote C pending)
LSV-01   Planned — blocked until LSH-01 Accepted
RDA-01   Planned — blocked until LSV-01 Accepted
RC-01    Planned — blocked until RDA-01 Accepted
PR-M2    Planned — blocked until RC-01 Accepted
PR-M3    Planned
TH-M1    Planned
TH-M2    Planned
Homologação  Blocked
Produção     Blocked
```

Regras permanentes (Cadeia de Etapas Executáveis):

- cada etapa é um gate arquitetural autônomo de primeira classe;
- não existe numeração decimal corretiva (`.1`, `.2`, ...);
- cada etapa recebe exatamente um prompt, uma entrega, um relatório e uma auditoria externa;
- é admitida no máximo uma correção consolidada por etapa; correção malsucedida encerra a etapa como `Rejected` e uma nova abordagem exige nova etapa de primeira classe;
- requisitos obrigatórios de uma etapa não podem ser reclassificados como limitações conhecidas;
- GitHub permanece a fonte primária da auditoria.

Homologação permanece bloqueada até PR-M3 Accepted.
Produção permanece bloqueada até TH-M2 Accepted.

---

## 5. PR-M1 — Workspace Authority & Revenue Operations Finalization

**Status:** Superseded pela etapa LSO-01. Contratos válidos preservados
(boundary de transição, RPC `transition_lead_status`, trigger de proteção
de colunas, `lead_stage_history`, OCC de Pipeline, 35 specs do boundary).
Obrigações remanescentes transferidas: segurança da criação manual,
autorização lead-scoped, OCC do Content Workspace → LSO-01; autoridade das
métricas do dashboard → RDA-01; regressão ampla → RC-01. Ver
`docs/delivery/product-roadmap/pre-homologation-product-readiness/122-pr-m1-workspace-authority-revenue-operations-finalization.md`.
**Absorve:** PR-PH.1, PR-PH.2, PR-PH.3, PR-PH.4.

Escopo consolidado:

- Tenant Workspace Information Architecture;
- navegação, labels, rotas, redirects e aliases;
- Roles, Permissions & Configuration Authority Baseline;
- matriz de autorização por operação;
- CRM & Kanban canonicalization and finalization;
- cutover entre PipelinePage e EntityWorkspace lead;
- remoção de fallback e dual paths;
- provenance de tenant em service-role writes;
- histórico de estágio e concorrência;
- Role-Aware Dashboard & Decision Intelligence;
- fórmulas, thresholds, timezone, empty states e drill-down;
- testes unitários, integração, E2E, segurança e autorização negativa.

Hard gates:

- uma rota e uma autoridade por função;
- uma superfície CRM;
- zero fallback runtime;
- zero autorização derivada do client;
- service role somente após tenant provenance determinística;
- Super Admin tenant-scoped somente por impersonação;
- KPIs determinísticos e testados;
- ferramentas de teste fixadas no repositório.

Estado esperado após aceite:

```text
PR-M1 Accepted
PR-M2 Planned / released
```

---

## 6. PR-M2 — Public Tenant Authority, White Label, CMS, Domains & Onboarding Finalization

**Status:** Planned — blocked by PR-M1.  
**Absorve:** PR-PH.5, PR-PH.6, PR-PH.7, PR-PH.8, PR-PH.9.

Escopo consolidado:

- fail-closed public host → tenant resolution;
- remoção de `FALLBACK_TENANT_SLUG = 'rm-prime'` como autoridade runtime;
- conexão de host, tenant context, PostgREST transport e `site_settings`;
- tenant isolation pública;
- workspace e public-site white label;
- menus públicos, CMS, SEO, sitemap, robots, preview e publicação;
- versionamento e agendamento;
- page builder e landing pages;
- sanitização de rich text, embeds e links;
- UTM, campanha, origem, consentimento e thank-you flows;
- custom-domain lifecycle consumindo o resolver único;
- DNS/TXT, anti-takeover, canonical, redirects e SSL boundary;
- onboarding e Configuration Center;
- testes XSS, RLS, cross-tenant, unknown-host e domain takeover.

Tabelas observadas/canônicas relevantes:

```text
site_settings
site_settings_versions
cms_pages
blog_posts
cms_forms
cms_campaigns
media_library
media_usage
```

Possível objeto novo, somente após decisão dentro do macro:

```text
tenant_domains
```

Hard gates:

- host desconhecido falha fechado;
- nenhum tenant default em produção;
- um único public tenant resolver;
- nenhuma leitura pública sem tenant derivado no servidor;
- uma autoridade por campo de branding;
- nenhum conteúdo executável não sanitizado;
- takeover de domínio impossível;
- onboarding não se confunde com impersonação;
- ferramentas de teste fixadas.

Estado esperado após aceite:

```text
PR-M2 Accepted
PR-M3 Planned / released
```

---

## 7. PR-M3 — Product Quality, Operational Readiness & Closing Review

**Status:** Planned — blocked by PR-M2.  
**Absorve:** PR-PH.10, PR-PH.11, PR-PH.12.

Escopo consolidado:

- UX/UI consistency;
- design tokens, themes, typography, spacing and states;
- responsive review;
- accessibility WCAG AA;
- visual and accessibility test tooling;
- environments, variables and secrets;
- observability, structured logs, health checks and alerts;
- error reporting and tracing;
- rate limits, cron, webhooks, e-mail, WhatsApp and analytics;
- runbooks, rollback and support operations;
- backup and restore evidence;
- LGPD retention, export, deletion and unsubscribe;
- complete reexecution of PR-M1 and PR-M2 critical suites;
- Pre-Homologation Product Closing Review inside the same macro.

Hard gates:

- no critical responsive or keyboard failure;
- no unresolved critical/high accessibility issue;
- no unpinned harness used as evidence;
- environment and secret inventory complete;
- target-environment migrations, RLS and grants verified;
- backup/restore proven;
- rollback and incident runbooks executable;
- no silently skipped critical suite.

Estado esperado após aceite:

```text
PR-M3 Accepted
Homologação authorized to start
TH-M1 released
```

---

## 8. TH-M1 — Homologation Provisioning & Full Validation

**Status:** Planned — blocked by PR-M3.  
**Absorve:** TH-001, TH-002, TH-003, TH-004.

Uma única execução deverá:

- validar o plano de testes e critérios de aceite;
- provisionar ou verificar homologação;
- confirmar paridade de ambiente;
- executar testes gerais;
- executar homologação com tenant piloto;
- registrar defeitos com severidade, evidência e owner;
- produzir baseline de regressão.

Não haverá relatório ou gate independente por suíte ou ciclo piloto.

Estado esperado após aceite:

```text
TH-M1 Accepted
TH-M2 released
```

---

## 9. TH-M2 — Defect Resolution, Regression & Production Gate

**Status:** Planned — blocked by TH-M1.  
**Absorve:** TH-005, TH-006.

Uma única execução deverá:

- corrigir todos os defeitos bloqueantes;
- executar regressão completa;
- repetir segurança e isolamento multi-tenant;
- validar performance e disponibilidade críticas;
- validar observabilidade, incident response e rollback;
- reconciliar riscos residuais;
- executar Production Readiness Review;
- emitir decisão final de produção.

Produção não é autorizada antes de TH-M2 Accepted.

---

## 10. Mapeamento de identificadores históricos

| Identificador histórico | Situação | Macro owner |
|---|---|---|
| PR-PH.1–PR-PH.4 | workstreams absorvidos; não executáveis isoladamente | PR-M1 |
| PR-PH.5–PR-PH.9 | workstreams absorvidos; não executáveis isoladamente | PR-M2 |
| PR-PH.10–PR-PH.12 | workstreams absorvidos; não executáveis isoladamente | PR-M3 |
| TH-001–TH-004 | workstreams absorvidos; não executáveis isoladamente | TH-M1 |
| TH-005–TH-006 | workstreams absorvidos; não executáveis isoladamente | TH-M2 |

Os identificadores permanecem no histórico Git e nos delivery records para rastreabilidade. Não devem ser usados como novos prompts.

---

## 11. Protocolo mínimo de evidências

Relatório em chat para Lovable ou executor:

```text
STATUS:
BASELINE:
HEAD:
COMMITS:
FILES_CHANGED:
MIGRATIONS:
TYPECHECK:
TESTS:
SECURITY:
RLS_GRANTS:
ENVIRONMENT:
BLOCKERS:
KNOWN_LIMITATIONS:
ROADMAP_STATUS:
```

Não enviar no chat:

- arquivos integrais;
- diff completo;
- repetição do prompt;
- narrativa arquivo a arquivo;
- código já disponível no GitHub;
- inventário completo reconstruível pelo auditor.

Auditoria externa responde somente com:

1. síntese;
2. veredito;
3. bloqueios decisivos;
4. próxima instrução.

---

## 12. Backlogs arquiteturais futuros

### 12.1 Fase 5 — Storage Abstraction Layer

- interface `StorageProvider`;
- implementação inicial Supabase Storage;
- extensibilidade para S3/GCS;
- preservação das regras de tenant isolation e upload provenance.

### 12.2 Fase 6 — Plugin Marketplace Evolution

- marketplace remoto;
- compatibilidade de versões e `apiVersion`;
- plugin signing e trust layer;
- política de distribuição por tenant.

### 12.3 Fase 7 — Workspace Ingestion System

- upload pipeline unificado;
- CSV import engine;
- XML/ZIP ingestion;
- media ingestion framework.

### 12.4 Fase 8 — Observability Layer

- audit log por tenant;
- tracing de ActionExecutor;
- replay system futuro.

### 12.5 Governance backlogs

- GA-07 — `docs/architecture/DECISION_LOG.md`;
- GA-08 — Documentation Repository Reorganization.

Esses itens não interferem no caminho crítico PR-M1 → PR-M2 → PR-M3 → TH-M1 → TH-M2, salvo decisão arquitetural formal posterior.

---

## 13. Namespaces e terminologia

- **PR-F6** = Product Roadmap · Fase 6 — Product UX Refactor.
- **AR-F6** = Architectural Roadmap · Fase 6 — Plugin Marketplace Evolution.
- Os números de fases em namespaces distintos não formam uma sequência global.
- “Limpeza dos Testes” permanece uma fase autônoma anterior à Product UX Refactor no histórico do produto.

---

## 14. Próxima ação autorizada

```text
PR-M1 — Workspace Authority & Revenue Operations Finalization
```

Nenhuma PR-PH.x individual está autorizada a iniciar.  
Nenhum TH-xxx individual está autorizado a iniciar.  
Homologação permanece bloqueada até PR-M3 Accepted.  
Produção permanece bloqueada até TH-M2 Accepted.
