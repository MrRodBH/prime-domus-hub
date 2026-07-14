# PR-PH.0 — Pre-Homologation Product Readiness Impact Analysis

**Status:** Ready for External Audit
**Depends on:** Phase 4 Closing Review — Accepted; Architectural
Roadmap · Fase 4 — SaaS Commercial Platform — Closed / Accepted.
**Blocks:** PR-PH.1 … PR-PH.12; TH-001 … TH-006; homologação
externa.

Esta análise é **exclusivamente de planejamento**. Nenhum
componente, rota, migration, RLS, grant, provider, biblioteca,
tema, CMS, domínio ou onboarding é alterado. Toda classificação
de estado do produto foi obtida por inspeção direta do código,
schema, rotas registradas, componentes importados e testes
executáveis — nunca a partir de documentação histórica isolada.

---

## 1. Baseline

- Working tree limpo na entrada; `git diff --check` clean.
- Último commit de entrada: `8b7a54e Closed Phase 4 as Ready`.
- Aceite externo do **Phase 4 Closing Review** já materializado
  nesta execução.
- **Architectural Roadmap · Fase 4 — SaaS Commercial Platform**
  registrada como **Closed / Accepted**.
- Estado esperado após esta execução:
  - Phase 4 Closing Review — **Accepted**.
  - PR-PH.0 — **Ready for External Audit**.
  - PR-PH.1 … PR-PH.12 — Planned; not started.
  - TH-001 … TH-006 — Planned; not started.
  - Homologação — Blocked.

## 2. Governança vinculante

- Aplicar permanentemente **One Roadmap Stage — One Macro
  Execution Prompt**: cada futura etapa terá um único prompt
  principal, preflight, confirmação do estado real, matriz de
  impacto, implementação integral, testes positivos/negativos/
  limítrofes, cleanup fail-closed quando houver fixtures,
  reconciliação documental, atualização controlada do roadmap e
  auditoria externa consolidada.
- Correções remanescentes devem ser consolidadas em no máximo um
  único prompt corretivo — sem microcorreções independentes, sem
  cadeias recursivas de numeração, sem redução de segurança para
  cumprir a meta de "um único prompt".
- Segurança, integridade e autoridade server-side prevalecem
  sobre economia de execução.

## 3. Metodologia de inventário (Regra de fonte da verdade)

Para cada domínio de produto foram inspecionados, nesta ordem:

1. código atual (`src/`);
2. schema real e migrations (`supabase/migrations/`);
3. rotas efetivamente registradas (`src/routes/`);
4. componentes efetivamente importados (grep no árvore de
   imports);
5. testes efetivamente executáveis (runners e specs sob
   `src/**/__tests__` e `run-*-specs.ts`);
6. só então documentação histórica foi confrontada como
   corroboração — nunca como prova isolada.

Classificações permitidas por item: **Implemented and connected**,
**Implemented but incomplete**, **Implemented but disconnected**,
**Legacy / superseded**, **Duplicate authority**, **Planned only**,
**Missing**, **Requires architectural decision**.

## 4. Inventário do workspace interno

### 4.1 Shell e navegação

- `WorkspaceShell` (`src/components/workspace/WorkspaceShell.tsx`)
  é o AppShell permanente da sessão autenticada. Monta Header
  (56), Rail (240/64), ContextTabs, `<Outlet/>`, CommandPalette,
  AiDrawer, Sheet mobile — **Implemented and connected**.
- `NavigationRail` (colapsável, tooltip, super-only gating por
  `isSuper`) — **Implemented and connected**.
- `AppHeader`, `ContextTabs`, `CommandPalette`, `AiDrawer`,
  `DetailPanel` — presentes em `src/components/workspace/`.
  Persistência de estado de UI: `ui-store.ts` (Zustand-like) —
  **Implemented and connected**. Não auditado ainda: escopo de
  persistência (localStorage vs por-tenant vs por-usuário).
- Breadcrumbs: **Missing** como componente formal (não há
  `Breadcrumbs.tsx` no shell); a navegação depende de
  `ContextTabs` + rota. **Requires architectural decision** em
  PR-PH.1 (introduzir ou dispensar formalmente).
- Menu do usuário no header: presente. Escopo (perfil, logout,
  troca de tema, troca de conta) precisa auditoria em PR-PH.1.
- Tenant Switcher: `src/components/workspace/tenant/*`,
  `TenantContext`, `TenantSelectionGate`, hooks
  `useImpersonation`, `use-tenant-selection`. — **Implemented and
  connected**. Cardinalidade e gating documentados em F3.4/F3.5.
- Estados de loading/vazio/erro: `AdminEmptyState` e componentes
  em `src/components/admin/ui/*`. Cobertura por rota é **Partial**
  — algumas superfícies de admin/portais não usam o mesmo padrão.
- Página sem autorização: `_authenticated.super.tsx` faz redirect
  para `/admin`; sem página 403 dedicada. **Missing**.
- Responsividade e a11y por teclado: **Requires audit** em
  PR-PH.10.
- Persistência de preferências (rail collapsed, tema, densidade):
  **Partial** — apenas rail collapsed observado em `ui-store`.
- Dark/light mode: token system em `src/styles.css` presente;
  chave de alternância no header **não observada**.
- Identidade visual por tenant: **Missing** no workspace interno
  (logo `logo-rm-prime.png` fixo em `NavigationRail`).

### 4.2 Matriz de entradas de menu (7 contextos)

Fonte: `src/components/workspace/contexts.ts`.

| Contexto | Rota raiz | Componente / subs | Papel min. | Configurável | Fallback | Duplicidade | Órfãs |
|---|---|---|---|---|---|---|---|
| Início | `/admin` | `_authenticated.admin.index.tsx` | authenticated | Nome fixo (renomear em PR-PH.1) | `/admin` | — | — |
| Pipeline | `/admin/pipeline` | pipeline + `/admin/leads` + `/admin/leads-workspace` | authenticated | fixo | `/admin/leads` | **Duplicate authority: `pipeline` × `leads` × `leads-workspace`** | — |
| Catálogo | `/admin/imoveis` | imoveis + lancamentos (subs) | authenticated | fixo | — | — | — |
| Conteúdo | `/admin/paginas` | site, paginas, blog, formularios, campanhas, midias, cms-auditoria, cms-transferencia | authenticated | fixo | `/admin/paginas` | **Dual path CMS antigo × novo (`site` × `paginas`, `cms-transferencia` residual)** | `cms-transferencia` |
| Distribuição | `/admin/portais` | portais | authenticated | fixo | — | — | — |
| Administração | `/admin/corretores` | corretores, equipes, perfis, cidades, bairros, origens, motivos, auditoria | admin | fixo | `/admin/corretores` | — | — |
| Operação | `/super` | tenants, observabilidade, dlq | super_admin | Super-only | `/super` | — | — |

Página **Início** — proposta de nomenclatura controlada em PR-PH.1
com opções fechadas: `Início`, `Visão Geral`, `Dashboard`, `Painel`.
Nunca configurável para alterar rota, autoridade ou visibilidade
administrativa; texto do client nunca decide segurança.

### 4.3 Achados de navegação

- **Duplicate authority — Pipeline/Leads**: rotas `/admin/pipeline`,
  `/admin/leads`, `/admin/leads-workspace` coexistem. Definir
  autoridade única em PR-PH.3.
- **Dual path CMS**: `admin.site.tsx` (antigo) coexiste com
  `admin.paginas.*` (novo) + `cms-transferencia`. Cutover
  obrigatório em PR-PH.5/PR-PH.6.
- **Falta 403 dedicado**: super gate faz redirect. Registrar em
  PR-PH.9.
- **Falta breadcrumbs**: registrar decisão em PR-PH.1.

## 5. Inventário do dashboard (`/admin`)

Fonte: `_authenticated.admin.index.tsx`, `src/lib/api/dashboard.functions.ts`.

- KPIs atuais: **Requires re-inventory** por PR-PH.2. Nenhum KPI
  do dashboard atual foi validado como coberto por fórmula
  server-authoritative, timezone declarada, papel, drill-down e
  teste determinístico.
- Origem dos dados: `dashboard.functions.ts` — verificar em
  PR-PH.2 se todos os retornos são server-side, tenant-scoped e
  RLS-safe, ou se algum é mockado/derivado no client.
- Comparação com período anterior, timezone, drill-down,
  atualização automática, estado "sem dados": **não
  formalizados** no runtime atual. **Planned only**.

### 5.1 KPIs planejados por papel (contrato exigido em PR-PH.2)

Para cada KPI abaixo, PR-PH.2 deverá declarar: pergunta de
negócio, fórmula, origem SQL/RPC, filtros, timezone, comparação,
atualização, drill-down, papéis autorizados, comportamento sem
dados, teste determinístico.

Papéis: **owner**, **admin**, **gestor comercial**, **corretor**,
**apoio** (quando aplicável). Super Admin só vê contexto próprio;
fora de impersonação não acessa dado tenant-scoped.

Indicadores mínimos a auditar disponibilidade real:

- Leads recebidos; leads sem primeiro atendimento; SLA de primeiro
  contato.
- Visitas agendadas/realizadas; visitas sem feedback.
- Propostas abertas; propostas vencendo.
- Ganhos, perdidos, motivos de perda.
- VGV ganho, VGV em negociação, pipeline bruto, pipeline
  ponderado.
- Conversão por etapa, tempo médio por etapa, negócios
  estagnados, valor em risco.
- Origem/campanha; desempenho por corretor.
- Imóveis com maior procura/conversão.
- Tarefas vencidas; atividades recentes acionáveis.

Proibido gráfico decorativo — todo componente visual do dashboard
final deve responder a uma decisão real.

## 6. Inventário CRM e Kanban

Fontes: `src/components/pipeline/*`, `src/lib/api/leads-crm.functions.ts`,
`_authenticated.admin.pipeline.tsx`, `_authenticated.admin.leads.tsx`,
`_authenticated.admin.leads-workspace.tsx`.

- Pipeline atual: **Implemented but incomplete / Duplicate
  authority**. Três rotas concorrentes precisam unificação em
  PR-PH.3.
- Kanban: **Requires inventory** em PR-PH.3 — validar
  implementação real de `@dnd-kit/core` (dependência presente),
  colunas, cards, filtros, ordenação, atualização otimista,
  rollback, histórico, permissões, responsividade, acessibilidade,
  virtualização.
- Card final deverá conter: cliente, imóvel, valor, corretor,
  origem, campanha, última atividade, próxima ação, tempo no
  estágio, probabilidade, badge de risco, motivo explicável do
  alerta.
- Regras de estágio (ganho/perdido/descartado/fechado) e
  contagem financeira: **Missing formalization**. Negócio
  perdido/descartado nunca pode ser contabilizado como fechado —
  hard gate em PR-PH.3.
- Concorrência entre usuários, otimismo + rollback, audit trail:
  **Planned only**.

## 7. Inventário white label

Camadas a distinguir formalmente em PR-PH.4:

1. Identidade visual do **workspace interno** (RM Prime SaaS
   Data-Dense Premium Dark Interface).
2. Identidade visual do **site público do tenant**.
3. Identidade da **plataforma RM Prime**.
4. Elementos que o **tenant pode configurar**.
5. Elementos **protegidos pelo produto** (nunca configuráveis).

Inventário atual: logo do workspace fixo em `NavigationRail`;
nenhuma configuração de branding tenant-scoped observada no
runtime. **Missing** para todos os campos: logotipo, ícone,
favicon, nome comercial, razão social, telefones, WhatsApp,
e-mail, endereço, CRECI, redes sociais, cores, fontes, botões,
header/footer, SEO, imagens padrão, compartilhamento social,
preview, reset, publicação.

Limites obrigatórios (planejar em PR-PH.4):

- Preservar contraste WCAG mínimo;
- Preservar acessibilidade e integridade de layout;
- Preservar identificação da plataforma quando
  contratualmente exigida;
- Fallback determinístico quando cores do tenant tiverem
  contraste inválido.

## 8. Diretriz vinculante — RM Prime SaaS Data-Dense Premium Dark Interface

Preservada e detalhada. Princípios:

- Dark graphite, nunca preto absoluto como superfície geral.
- Cores vivas apenas com significado semântico.
- Máximo contraste nos pontos de leitura.
- KPIs com contexto, comparação, tendência.
- Gráficos vinculados a decisões reais; alertas explicáveis;
  drill-down até a origem do dado.
- Dashboard adaptado ao papel; tema claro alternativo;
  validação com usuários reais antes da homologação.

Contratos a formalizar em PR-PH.10:

- Escala de superfícies; tokens semânticos; tipografia;
  densidade; estados positivos/negativos/neutros/atenção;
  contraste mínimo; regras para cores do tenant; limites do
  white label; comportamento em dark/light; persistência por
  usuário; fallback quando identidade do tenant tiver contraste
  inválido.

Nenhuma implementação visual nesta etapa.

## 9. Inventário site público, CMS e blocos

Fontes: rotas públicas (`index.tsx`, `sobre.tsx`, `contato.tsx`,
`anuncie.tsx`, `imoveis.tsx`, `imovel.$slug.tsx`, `lancamentos*`,
`blog*`, `p.$slug.tsx`, `privacidade.tsx`, `sitemap[.]xml.ts`,
`unsubscribe.tsx`), `src/components/site/*`,
`src/components/content/*`, `src/lib/api/site*`, `pages.functions.ts`.

- Rotas públicas presentes — **Implemented and connected**.
- Resolução de tenant por host: `src/lib/tenant.server.ts`,
  `portal-engine.server.ts` — **Implemented and connected**;
  cobertura formal em PR-PH.7.
- Page renderer CMS: `CmsPageRenderer.tsx`, `CmsFormRenderer.tsx`,
  `CampaignRenderer.tsx`, overlay de preview — **Implemented**;
  auditar cobertura em PR-PH.5.
- Blocos do page builder: `src/components/content/blocks/*` e
  `editors/`. Inventário obrigatório em PR-PH.6: hero, rich text,
  imagem, galeria, vídeo, CTA, formulário, features, FAQ, spacer,
  imóveis, depoimentos, mapa, equipe, parceiros. Para cada
  bloco: schema, editor, renderer público, validação,
  responsividade, a11y, preview, sanitização, mídia, captura de
  lead, analytics.
- **Dual path CMS**: `admin.site.tsx` × `admin.paginas.*` +
  `cms-transferencia`. Cutover formal exigido em PR-PH.5.
  Nenhum CMS antigo poderá permanecer como autoridade paralela
  após a Product Readiness.
- Formulários, captura de leads, SEO, metadata, sitemap, robots,
  preview, publicação, versionamento (`site-versions.functions.ts`,
  `VersionsPanel.tsx`), agendamento, analytics, pixels
  (`meta-pixel.ts`), LGPD/consentimento (`privacidade.tsx`,
  `unsubscribe.tsx`) — **Partial**; auditoria em PR-PH.5.

## 10. Landing pages

Suporte formal ausente como categoria distinta. **Missing**.
Planejar em PR-PH.6: templates (institucional, lançamento,
imóvel específico, campanha, captação de proprietários,
recrutamento de corretores, evento, conteúdo rico, conversão
genérica), editor, blocos, formulários, consentimento,
UTM/origem/campanha, integração com leads, thank-you, eventos
analíticos, SEO, preview, draft, publish, unpublish,
versionamento, domínio/URL, isolamento por tenant.

## 11. Tenant Domain Management

Estado atual: subdomínio padrão via `portal-engine.server.ts` +
resolução por host; **custom domain UI: Missing**; não há
`admin.dominios.tsx`. Registros DNS, verificação, SSL, redirects,
apex/www, canonical, unicidade e proteção contra takeover:
**Planned only**.

State machine obrigatória (PR-PH.7):

`not_configured → pending_dns → verifying → verified →
provisioning_ssl → active | failed | suspended → removing`.

Contratos exigidos em PR-PH.7: autoridade server-side;
unicidade; prova de propriedade (registro TXT); proteção
anti-takeover; verificação periódica; auditoria; tratamento de
domínio perdido; rollback; impacto em SEO; redirects; subdomínio
padrão; domínio do workspace interno se aplicável.

Nenhuma criação de custom domain nesta etapa.

## 12. Onboarding e Configuration Center

Onboarding formal: **Missing** — não há wizard `onboarding.tsx`.
Passos que devem ser cobertos em PR-PH.8: criação de tenant,
dados da empresa, branding, equipe, primeiro imóvel, pipeline,
integrações, domínio, site, analytics, publicação, checklist,
progresso, retomada, ajuda contextual.

Configuration Center: **Missing** como superfície unificada.
Deverá concentrar organização, equipe, papéis, CRM, pipeline,
branding, site, páginas, domínio, integrações, notificações,
segurança e billing futuro. Nunca misturar configuração de
tenant com impersonação de Super Admin.

## 13. Roles, permissions e autoridade de configuração

Fontes: `src/integrations/supabase/auth-middleware.ts`,
`membership-validation.ts`, `use-tenant.ts`, `rbac.functions.ts`,
`super.functions.ts`, F4.0, SCP-012.

Contratos consolidados (Fase 4):

- `has_role(admin)` **não** é autorização ampla nem comercial.
- `tenant_role` **não** é autorização comercial.
- Membership authorization e entitlement comercial são planos
  distintos.
- Autoridade server-side única; client nunca decide.
- Super Admin sem impersonação nunca acessa tenant-scoped.

PR-PH.9 deverá, para cada operação administrativa planejada,
declarar: papel mínimo, membership_status exigido, necessidade
de owner, autorização comercial futura, comportamento sob
impersonação, server function, tabela afetada, RLS, audit trail,
teste negativo.

Não derivar autorização de: `tenant_role`, `has_role(admin)`,
client state, menu visível ou entitlement comercial isolados.

## 14. Prontidão operacional

Auditar em PR-PH.11:

- Ambientes (preview/prod), variáveis, secrets;
- Migrations (93 aplicadas), seed, backup, restore;
- Observabilidade (`observability.server.ts`), logs, alertas,
  error tracking (`lovable-error-reporting.ts`);
- Auditoria (`_authenticated.admin.auditoria.tsx`, `cms-auditoria`);
- Performance, cache, filas;
- E-mail (`lib/email/notify.server.ts` + `email-templates/*`),
  WhatsApp (botão flutuante apenas — sem API oficial), analytics,
  rate limits (`rate-limit.server.ts`), cron, webhooks,
  health checks;
- Rollback, runbooks, suporte;
- LGPD (`privacidade.tsx`, `unsubscribe.tsx`), retenção,
  exportação, exclusão.

## 15. Roadmap PR-PH executável

Sequência vinculante:

| Etapa | Escopo |
|---|---|
| **PR-PH.1** | Tenant Workspace Information Architecture & Navigation. Unifica pipeline × leads × leads-workspace; formaliza breadcrumbs, menu do usuário, 403, nomenclatura controlada de "Início". |
| **PR-PH.2** | Role-Aware Dashboard & Decision Intelligence Finalization. Cada KPI com pergunta, fórmula, origem, filtros, timezone, comparação, drill-down, papéis, teste. |
| **PR-PH.3** | CRM & Kanban Finalization. `@dnd-kit`, cards, atualização otimista + rollback, audit trail, contagem financeira correta (ganho ≠ perdido ≠ descartado ≠ fechado). |
| **PR-PH.4** | Workspace and Public-Site White-Label System. Branding tenant-scoped com limites de contraste, fallback determinístico. |
| **PR-PH.5** | Public Website Navigation & Content Architecture. Cutover CMS antigo → novo; menus públicos; SEO; metadata; sitemap; versionamento; agendamento; LGPD. |
| **PR-PH.6** | Landing Page & Dynamic Page Builder Finalization. Templates, blocos, formulários, UTM, thank-you, analytics, preview, publish/unpublish, versionamento, isolamento por tenant. |
| **PR-PH.7** | Tenant Domain Management & Host Resolution. State machine explícita, verificação, SSL, anti-takeover, auditoria, rollback. |
| **PR-PH.8** | Tenant Onboarding & Configuration Center. Wizard + Configuration Center unificado, sem mistura com impersonação. |
| **PR-PH.9** | Roles, Permissions & Configuration Authority Review. Matriz de autoridade por operação; separação membership × entitlement. |
| **PR-PH.10** | Product UX/UI Final Consistency, Accessibility & Responsive Review. Tokens semânticos, contraste, tipografia, densidade, dark/light, a11y por teclado. |
| **PR-PH.11** | Environment, Observability & Operational Readiness. Variáveis, secrets, migrations, backup/restore, alertas, runbooks, LGPD. |
| **PR-PH.12** | Pre-Homologation Product Closing Review. |

Após PR-PH:

| Etapa | Escopo |
|---|---|
| **TH-001** | Test & Homologation Impact Analysis. |
| **TH-002** | Homologation Environment Provisioning. |
| **TH-003** | General Test Execution. |
| **TH-004** | Pilot Tenant Homologation. |
| **TH-005** | Defect Correction & Regression Cycles. |
| **TH-006** | Production Readiness Review. |

Ajustes futuros de nome/agrupamento só serão admitidos com
evidência técnica clara documentada.

## 16. Contrato obrigatório de cada etapa futura

Cada análise de impacto PR-PH.1 … PR-PH.12 deverá conter:
objetivo; baseline; dependências; itens implementados; lacunas;
escopo autorizado; fora de escopo; arquivos e módulos afetados;
tabelas; migrations possíveis; RLS; server boundaries; frontend;
contratos de dados; autoridade; a11y; responsividade; analytics;
testes unitários, integração, visuais e E2E; cleanup; riscos;
hard gates; Definition of Done; estado esperado do roadmap;
estimativa relativa de complexidade; possibilidade de execução
em um único prompt; condições que obrigariam replanejamento.
Dependências cruzadas devem ser identificadas antecipadamente.

## 17. Matriz de dependências

| Etapa | Depende de | Banco | Runtime | Frontend | Segurança | UX | Testes |
|---|---|---|---|---|---|---|---|
| PR-PH.1 | PR-PH.0 | não | menu.functions | shell + nav | 403/authz | alta | E2E nav |
| PR-PH.2 | PR-PH.1 | possível read views | dashboard.functions | dashboard | RLS reads | alta | dados determinísticos |
| PR-PH.3 | PR-PH.1 | migrations de estágio/audit | leads-crm.functions | Kanban | RLS + audit | alta | otimista+rollback |
| PR-PH.4 | PR-PH.1 | tenant_branding? | site.functions | shell + site | contraste/authz | alta | visual |
| PR-PH.5 | PR-PH.4 | cutover CMS | pages/site/site-versions | site público | RLS + sanit. | alta | SEO/preview |
| PR-PH.6 | PR-PH.5 | landing_pages? | pages.functions | builder | RLS + sanit. | alta | UTM/lead |
| PR-PH.7 | PR-PH.4 | tenant_domains | portal-engine.server | admin.dominios | anti-takeover | média | verificação |
| PR-PH.8 | PR-PH.1,4,7 | onboarding state | onboarding.functions | wizard + config | authz | alta | wizard E2E |
| PR-PH.9 | todas | authz tables | rbac.functions | matriz UI | RLS + authz | média | negativos |
| PR-PH.10 | 1..9 | não | não | tokens/tema | contraste | alta | visual/a11y |
| PR-PH.11 | 1..10 | backup/restore | observability | dashboards ops | segredos/LGPD | baixa | smoke prod-like |
| PR-PH.12 | 1..11 | não | não | não | consolidação | — | consolidação |

**Caminho crítico:** PR-PH.1 → PR-PH.2 → PR-PH.3 (frentes
independentes possíveis PR-PH.4 em paralelo somente no nível de
planejamento) → PR-PH.5 → PR-PH.6 → PR-PH.7 → PR-PH.8 →
PR-PH.9 → PR-PH.10 → PR-PH.11 → PR-PH.12.

Proibida execução paralela quando duas etapas alterarem as mesmas
autoridades, tabelas ou superfícies de navegação.

## 18. Matriz de estado do produto

| Domínio | Implementado | Parcial | Desconectado | Legado | Ausente | Evidência |
|---|---:|---:|---:|---:|---:|---|
| Workspace shell | ✓ | | | | | `WorkspaceShell`, `NavigationRail`, `AppHeader`, `contexts.ts` |
| Menu / IA | | ✓ | | | | 3 rotas pipeline concorrentes; 403 ausente; breadcrumbs ausentes |
| Dashboard | | ✓ | | | | `dashboard.functions.ts` sem contrato KPI formalizado |
| CRM / Kanban | | ✓ | | ✓ | | pipeline/leads/leads-workspace; audit trail e otimista sem contrato |
| Branding (tenant) | | | | | ✓ | logo fixo; sem tabela branding |
| Site público | ✓ | | | | | rotas públicas + `CmsPageRenderer` |
| CMS | | ✓ | | ✓ | | dual path `site` × `paginas` + `cms-transferencia` |
| Landing pages | | | | | ✓ | sem categoria/template dedicado |
| Custom domain | | ✓ | | | | resolução por host presente; UI/state machine ausentes |
| Onboarding | | | | | ✓ | sem wizard |
| Configuration Center | | | | | ✓ | superfície unificada ausente |
| Permissões / authz | ✓ | | | | | F4.0, SCP-012, `has_role`, `auth-middleware` |
| Analytics | | ✓ | | | | `meta-pixel`, sem dashboard analítico |
| Notificações | | ✓ | | | | e-mail templates; WhatsApp apenas via botão |
| Ambiente / secrets | ✓ | | | | | Lovable Cloud gerenciado |
| Observabilidade | | ✓ | | | | `observability.server.ts` sem dashboard |
| Homologação | | | | | ✓ | não iniciada — blocked |

## 19. Riscos e bloqueios

- Dependência operacional preservada da role gerenciada
  `sandbox_exec` (Phase 4 §12).
- Dual path CMS deve ser encerrado antes da homologação;
  coexistência prolongada gera drift de autoridade.
- Duplicidade Pipeline/Leads/Leads-Workspace pode induzir
  contagem errada em dashboard — resolver em PR-PH.1 antes de
  PR-PH.2.
- Custom domain sem state machine gera risco de takeover — não
  liberar homologação sem PR-PH.7 aceito.
- White label sem limite de contraste pode quebrar
  acessibilidade — hard gate em PR-PH.4.
- Nenhuma funcionalidade poderá ser implementada nesta etapa.

## 20. Hard gates da PR-PH.0

Não finalizar se: alguma superfície relevante não tiver sido
inventariada; documentação histórica isolada tiver sido usada
como prova; dual path não estiver classificado; menu
configurável puder alterar segurança; KPI sem fórmula e origem;
gráfico sem decisão; custom domain sem proteção contra takeover;
white label puder quebrar contraste; roles implícitas; Product
Readiness sem caminho crítico; testes/homologação sem gate;
qualquer implementação de produto tiver sido feita; roadmap
manter a Fase 4 aberta; PR-PH.0 marcada Accepted sem auditoria
externa.

## 21. Decisão final

- Nenhuma implementação de produto foi executada.
- Fase 4 encerrada; PR-PH.0 registrada e completa.
- Sequência PR-PH.1 … PR-PH.12 + TH-001 … TH-006 vinculada.
- Status final desta análise: **Ready for External Audit**.
