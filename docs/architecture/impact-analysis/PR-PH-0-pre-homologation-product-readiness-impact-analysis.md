# PR-PH.0 — Pre-Homologation Product Readiness Impact Analysis

**Status:** Ready for External Audit
**Depends on:** Phase 4 Closing Review — Accepted; Architectural
Roadmap · Fase 4 — SaaS Commercial Platform — Closed / Accepted.
**Blocks:** PR-PH.1 … PR-PH.12; TH-001 … TH-006; homologação
externa.

Esta análise é **exclusivamente de planejamento**. Nenhum
componente, rota, migration, RLS, grant, provider, biblioteca,
tema, CMS, domínio ou onboarding é alterado. Todas as
classificações abaixo foram obtidas por inspeção direta do
repositório no baseline formal.

Esta revisão substitui integralmente o conteúdo anterior deste
documento em resposta à auditoria crítica externa: elimina
descoberta básica delegada ao futuro, corrige classificações
factuais, produz contratos executáveis individuais por etapa e
reordena a sequência PR-PH.

---

## 1. Baseline vinculante

- Repositório: `MrRodBH/prime-domus-hub` — branch `main`.
- Baseline vinculante desta reconciliação:
  `5c9ff73112797efd3bb59e4b157cb02f0b055905` — “Reconciliou
  PR-PH.0 com evidência”. O SHA do commit que materializa a
  presente execução não é auto-referenciado neste arquivo
  versionado; o observador externo deverá conferir o diff
  contra o baseline acima.
- `git status --short`: working tree limpo na entrada.
- `git diff --check`: clean.
- 93 arquivos de migration versionados no repositório auditado
  (`ls supabase/migrations/*.sql | wc -l` = 93). **O estado remoto
  de aplicação (ordem, checksums, drift) não é verificável apenas
  pelo repositório** — a validação operacional é competência de
  PR-PH.11 e da consolidação em PR-PH.12. Runtime, RLS, grants,
  providers, `package.json` e lockfile **não** são alterados por
  esta execução.
- Nenhum arquivo fora dos três autorizados foi modificado.

**Estado esperado após esta execução (idêntico ao anterior):**

- Phase 4 Closing Review — Accepted.
- Architectural Roadmap · Fase 4 — Closed / Accepted.
- **PR-PH.0 — Ready for External Audit** (não Accepted).
- PR-PH.1 … PR-PH.12 — Planned; not started.
- TH-001 … TH-006 — Planned; not started.
- Homologação — Blocked.

## 2. Governança vinculante

- **One Roadmap Stage — One Macro Execution Prompt**: cada
  futura etapa executa preflight, confirmação do estado real,
  matriz de impacto, implementação, testes positivos/negativos/
  limítrofes, cleanup fail-closed, reconciliação documental e
  auditoria externa.
- Segurança, integridade e autoridade server-side prevalecem
  sobre economia de execução.
- **Descoberta básica ocorre agora, na PR-PH.0.** Etapas futuras
  podem validar, cutover ou implementar, mas **não** podem ser
  responsáveis por descobrir fatos já observáveis no repositório.

## 3. Metodologia de inventário

Para cada domínio foram inspecionados, nesta ordem:

1. código atual em `src/`;
2. schema/migrations em `supabase/migrations/` e tipos
   `src/integrations/supabase/types.ts`;
3. rotas registradas em `src/routes/`;
4. componentes efetivamente importados (grep na árvore);
5. server functions em `src/lib/api/*.functions.ts`;
6. testes/runners executáveis;
7. só então documentação histórica como corroboração.

Classificações permitidas: **Implemented and connected**;
**Implemented but incomplete**; **Implemented but disconnected**;
**Legacy / superseded / compatibility redirect**; **Duplicate
authority**; **Concurrent surface**; **Planned only**;
**Missing**; **Requires architectural decision**.

Expressões proibidas nesta análise: “Requires re-inventory”,
“Requires inventory”, “Requires audit”, “auditar em PR-PH.x”,
“verificar em PR-PH.x”, “inventário obrigatório em PR-PH.x”,
“disponibilidade a auditar futuramente”. Toda incerteza que
sobrevive à leitura do código foi convertida em **decisão
necessária** com alternativas conhecidas, evidência atual,
etapa responsável e condição objetiva de escolha.

## 4. Inventário do workspace interno

### 4.1 Shell e navegação (evidência direta)

- `WorkspaceShell` em `src/components/workspace/WorkspaceShell.tsx`
  monta Header (56 px), Rail (240/64), ContextTabs, `<Outlet/>`,
  CommandPalette, AiDrawer e Sheet mobile — **Implemented and
  connected**.
- `NavigationRail` colapsável, gating super-only por `isSuper` —
  **Implemented and connected**.
- `AppHeader`, `ContextTabs`, `CommandPalette`, `AiDrawer`,
  `DetailPanel`, `ui-store.ts` (Zustand-like) — **Implemented
  and connected**. Escopo de persistência (localStorage vs
  por-tenant vs por-usuário) é **decisão necessária** em
  PR-PH.1.
- Tenant Switcher (`src/components/workspace/tenant/*`,
  `TenantContext`, `TenantSelectionGate`, `useImpersonation`,
  `use-tenant-selection`) — **Implemented and connected**.
- Estados vazios: `AdminEmptyState` e demais componentes em
  `src/components/admin/ui/*` — **Implemented but incomplete**
  (cobertura por rota parcial).
- Página 403 dedicada — **Missing**. O gate super faz redirect
  para `/admin` sem página explicativa. Responsável: PR-PH.1.
- Breadcrumbs formais — **Missing**. Responsável: PR-PH.1.
- Menu do usuário no header — **Implemented but incomplete**:
  logout presente; troca de tema, conta e preferências
  precisam ser formalizadas. Responsável: PR-PH.1.
- Dark/light mode: tokens presentes em `src/styles.css`; chave
  de alternância no header **não observada** — **Missing**.
  Responsável: PR-PH.10.
- Identidade visual do workspace (logo `logo-rm-prime.png` fixo
  no `NavigationRail`) — **Missing como configuração**.
  Responsável: PR-PH.5.

### 4.2 Contextos de menu (fonte: `src/components/workspace/contexts.ts`)

| Contexto | Rota raiz | Rotas do contexto | Autoridade funcional |
|---|---|---|---|
| Início | `/admin` | `admin.index.tsx` | única |
| Pipeline | `/admin/pipeline` | pipeline (autoridade); `/admin/leads` (**compatibility redirect**); `/admin/leads-workspace` (**superfície funcional concorrente**) | ver §7 |
| Catálogo | `/admin/imoveis` | imoveis, lancamentos | única |
| Conteúdo | `/admin/paginas` | site, paginas, blog, formularios, campanhas, midias, auditoria (`cms-auditoria` é redirect), `cms-transferencia` (redirect legado) | ver §11 |
| Distribuição | `/admin/portais` | portais | única |
| Administração | `/admin/corretores` | corretores, equipes, perfis, cidades, bairros, origens, motivos, auditoria | única |
| Operação | `/super` | tenants, observabilidade, dlq | super-only |

Rótulo “Início” — decisão necessária de nomenclatura em PR-PH.1;
alternativas: `Início`, `Visão Geral`, `Dashboard`, `Painel`.
Nunca configurável para alterar rota, autoridade ou visibilidade
administrativa.

## 5. Rotas e classificação canônica de CRM

Evidência direta:

- `src/routes/_authenticated.admin.pipeline.tsx` →
  `PipelinePage` (`src/components/pipeline/PipelinePage.tsx`)
  usa `pipelineSearchSchema`, monta lista, detalhe inline,
  Kanban com `DndContext`/`PointerSensor`/`DragOverlay`, tabs
  (`ativos`/`descartados`/`analise`), densidades, chips de
  filtro. Consome `usePipelineData`, que chama
  `adminListarLeads`, `adminListarCorretores`,
  `adminContarDescartes`, `adminAtualizarLead`. — **Implemented
  and connected — autoridade funcional operacional atual**.
- `src/routes/_authenticated.admin.leads.tsx` → `beforeLoad`
  aplica `redirect({ to: "/admin/pipeline", search: migrated })`
  migrando `corretor_id → corretor` e `tab=kanban → view=kanban`.
  Não renderiza UI. — **Compatibility redirect / legacy route.
  Não é terceira autoridade funcional.**
- `src/routes/_authenticated.admin.leads-workspace.tsx` →
  `EntityWorkspace` com `ENTITIES.lead` a partir de
  `src/components/workspace/entities`. Superfície funcional
  independente, com o mesmo tema visual do workspace de
  conteúdo. — **Concurrent surface / candidate replacement**.
- `src/routes/_authenticated.admin.cms-auditoria.tsx` → redirect
  para `/admin/auditoria`.
- `src/routes/_authenticated.admin.cms-transferencia.tsx` →
  redirect para `/admin/auditoria`.

### 5.1 Diferenças reais entre PipelinePage e EntityWorkspace(lead)

| Dimensão | `/admin/pipeline` (PipelinePage) | `/admin/leads-workspace` (EntityWorkspace `ENTITIES.lead`) |
|---|---|---|
| Fonte de dados | `usePipelineData` → `adminListarLeads` + `adminListarCorretores` + `adminContarDescartes` | Adapter `useLeadAdapter` no registry `src/components/content/adapters/index.ts` |
| Ações | Novo lead, alterar status via DnD/Kanban, filtros, chips, tabs (Ativos/Descartados/Análise) | Ações do descriptor `lead` (registrado no adapter registry) |
| Campos | Cliente, imóvel, valor, corretor, origem, `valor_estimado`, `assigned_to`, `status`, `updated_at` | Definidos pelo descriptor `ENTITIES.lead` |
| Kanban | Implementado (DndContext + colunas + DragOverlay); regra de destino: `perdido` só a partir de `proposta` | Não observado |
| Status | `novo, conversando, visita, proposta, ganho, perdido, descartado` | Vocabulário definido no descriptor |
| Filtros | Corretor, status múltiplo, origem, período, alerta | Filtros declarativos via `FilterSpec` |
| Detalhe | Split inline (40/60) via `?item=<id>` (Pipeline INLINE ONLY) | Painel do workspace |
| Permissões | Server-side em `adminListarLeads`/`adminAtualizarLead` (role escopo em `dashboard.functions.ts` e `admin.functions.ts`) | Server-side no adapter |
| Histórico/audit trail | `LeadHistoricoDialog` disponível; audit trail formal por card **não observado** | Não observado |
| Testes específicos da superfície | Não observado sob `__tests__` no baseline | Não observado |
| Integrações | Novo lead, drag-and-drop, alertas por tempo, `sonner` toast, invalidateQueries `["admin","leads"]` | Registry-driven |

**Decisão necessária (PR-PH.3):** escolher autoridade única
entre PipelinePage e EntityWorkspace(lead); definir plano de
cutover para a superfície concorrente. **Proibido antes da
PR-PH.3:** remover adapter `useLeadAdapter`, remover
`PipelinePage`, alterar `leads-workspace.tsx`, ou converter
`/admin/leads` em rota funcional.

## 6. Inventário completo do CRM e Kanban

Evidência direta em `src/components/pipeline/hooks/usePipelineData.ts`:

- `useQuery` para leads, corretores, contagem de descartes —
  **Implemented and connected**.
- `useMutation` `updateStatus` com:
  - `onMutate` → `cancelQueries` + `getQueryData` (snapshot
    anterior) + `setQueryData` otimista — **optimistic update:
    Implemented and connected**.
  - `onError` → `setQueryData(prev)` + `toast.error(e.message)`
    — **rollback: Implemented and connected**.
  - `onSuccess` → `invalidateQueries` — **Implemented and
    connected**.
- `DndContext` + `PointerSensor` (distance 6) + `DragOverlay` +
  `handleDragStart`/`handleDragEnd` em `PipelinePage.tsx`;
  restrição “Perdido só a partir de Proposta” aplicada com
  toast; drop em outra coluna dispara `updateStatus.mutate` —
  **drag-and-drop: Implemented and connected**.
- Lista, Kanban, detalhe inline, tabs Descartados/Análise,
  filtros, densidade, URL search state — **Implemented and
  connected**.
- Alertas por tempo (`sem_atendimento`, `sem_followup`,
  `visitas_sem_feedback`, `propostas_paradas`) — presentes
  tanto no pipeline (`usePipelineData`) quanto no dashboard
  (`dashboard.functions.ts`). Constantes de tempo divergem:
  pipeline usa `>1d`, `>3d`, `>3d`, `>5d`; dashboard usa
  `>48h`, `>7d`, `>7d`, `>7d`. — **Decisão necessária em PR-PH.3
  (constantes canônicas server-side).**

Status funcional adicional:

- Audit trail formal por card (quem mudou de estágio, quando,
  motivo, valor anterior) — **Missing**. Responsável: PR-PH.3.
- Concorrência multiusuário / conflict detection / versão
  do card — **Missing**. Responsável: PR-PH.3.
- Permissões server-side reais: `adminAtualizarLead`,
  `adminListarLeads`, `adminContarDescartes` chamadas via
  `useServerFn`; ambos precisam validação formal de
  `membership_status`, `tenant_role` mínimo e entitlement
  comercial futuro. — **Implemented but incomplete**.
  Responsável: PR-PH.2 (autoridade) + PR-PH.3 (aplicação).
- Testes: nenhum spec dedicado sob
  `src/integrations/supabase/__tests__/` cobre transições de
  estágio no pipeline com rollback. Runners atuais cobrem
  domínio comercial (Fase 4). — **Missing**.
- Semântica financeira (`ganho ≠ perdido ≠ descartado ≠
  fechado ≠ arquivado`) — descoberta encerrada nesta PR-PH.0:
  - `ganho`, `perdido` — status persistidos na coluna `leads.status`
    (`admin.functions.ts:783` — enum
    `"novo","conversando","visita","proposta","ganho","perdido","descartado"`).
  - `descartado` — status persistido na mesma coluna. Mutação
    canônica em `leads-crm.functions.ts:53-68` (`descartarLead`)
    grava `status="descartado"`, `descartado_at=now()`,
    `discard_reason_id` e insere histórico em `lead_descartes`.
    Reabertura em `leads-crm.functions.ts:155-168`
    (`reabrirLead`) restaura status anterior e limpa
    `descartado_at`. Motivos gerenciados por
    `lead-reasons.functions.ts` (tabela `discard_reasons`).
  - `perdido` vs `descartado`: `perdido` é resultado comercial
    (regra “só a partir de proposta”, §6 acima); `descartado` é
    remoção operacional com motivo obrigatório e histórico
    dedicado.
  - `fechado`/`arquivado` — **não observados** como estados
    distintos no enum, tabelas ou histórico. Divergência
    semântica a resolver em PR-PH.3 (contagem financeira já é
    canonicalmente restrita a `ganho` — `dashboard.functions.ts`).

## 7. Inventário completo do dashboard

Evidência direta:
`src/routes/_authenticated.admin.index.tsx` + `src/lib/api/dashboard.functions.ts`.

Server functions: `dashboardStats` (POST, `requireSupabaseAuth`,
`filtroSchema`) e `dashboardLeadsFiltrados` (POST,
`requireSupabaseAuth`).

Escopo de papel implementado em `dashboardStats`: lê `user_roles`,
classifica `isPrivileged = admin | gerente | secretaria`; se não
privilegiado, restringe a leads do próprio `corretores.id` do
`userId`. Filtros: `inicio`, `fim`, `corretor_id`, `team_id`,
`origem`.

### 7.1 Indicadores efetivamente implementados

| Indicador | Fonte/query | Fórmula atual | Filtro temporal | Comparação | Status incluídos | Papel | Drill-down | Empty state | Lacuna concreta |
|---|---|---|---|---|---|---|---|---|---|
| Leads recebidos | `leads` | `atuais.length` | `created_at ∈ [inicio, fim]` | período anterior (`diffPercent`) | todos | admin/gerente/secretaria → global; corretor → só os seus | `dashboardLeadsFiltrados` | mensagem “sem leads no período”: **não observada explicitamente** | timezone declarada; teste determinístico |
| Visitas | `leads` | `countAtLeast(atuais,"visita")` (idx ≥ 2 e ≠ perdido) | idem | idem | agrega ≥ visita, exclui perdido | idem | ✓ | idem | idem |
| Propostas | `leads` | `countAtLeast(atuais,"proposta")` | idem | idem | agrega ≥ proposta, exclui perdido | idem | ✓ | idem | idem |
| Vendas | `leads` | `countByStatus(atuais,"ganho")` | idem | idem | apenas `ganho` | idem | ✓ | idem | idem |
| VGV | `leads` | soma `valor_estimado` onde `status="ganho"` | idem | não comparado | apenas `ganho` — **correto** | idem | ✓ | mostra R$ 0 | idem |
| Funil | `leads` | 7 etapas (Novo, Contato, Qualificado, Visita, Proposta, Venda, Descartados); `Qualificado = Contato` (agregado) | idem | não | Descartados = `perdido` | idem | ✓ | idem | qualificado sem etapa própria; explicar ou dividir em PR-PH.4 |
| Alertas | `leads` (ativos, `not in (ganho,perdido)`) | `semAtendimento: novo>48h`; `semFollowup: conversando>7d`; `visitasSemFeedback: visita>7d`; `propostasParadas: proposta>7d` | tempo real, sem `[inicio,fim]` | não | não `ganho/perdido` | idem | via `dashboardLeadsFiltrados` | idem | **constantes divergem do pipeline** (§6); consolidar em PR-PH.3 antes de PR-PH.4 |
| Série diária | `leads` do período | `serie[dia] += 1` por leads/visitas/propostas/vendas/vgv | dia ISO 10 chars | não | agrega ≥ etapa, exclui perdido | idem | não | array de zeros | timezone; boundary de dia server-side |
| Origens | `leads` do período | por origem: `total`, `vendas`, `%`, `conversao` | idem | não | todos | idem | não | ok | timezone; testes |
| Taxas | derivado do funil | 5 taxas com metas hardcoded (`METAS` em `dashboard.functions.ts:269`) | idem | não | idem | idem | não | ok | **metas hardcoded — decisão em PR-PH.4 (`per-tenant/per-role/config`)** |
| Desempenho individual | `leads` do período do próprio corretor | leads, visitas, propostas, vendas, vgv | idem | não | idem | apenas quando `corretorIdSelf` | não | `null` | timezone; testes |
| Ranking | `corretores` + `leads` do período | soma por `corretor_id`, ordenado por VGV, top 10 | idem | não | idem | apenas `isPrivileged` | não | array vazio | timezone; testes |
| Insights (IA) | motor de regras | performance, gargalo, oportunidade, alerta, previsão (VGV × 30) | idem | não | idem | idem | não | ok | previsão linear ingênua; documentar limites em PR-PH.4 |

Registro explícito — **o código atual já possui**: server
function; comparação com período anterior; contagem por status;
VGV restrito a `ganho`; alertas por tempo; série diária; ranking;
insights; drill-down (`dashboardLeadsFiltrados`).

### 7.2 Lacunas identificadas sem correção nesta etapa

- Timezone: uso de `new Date(iso).toISOString().slice(0,10)`
  agrega por dia em UTC; documentar/travar em PR-PH.4.
- Papéis: hoje `admin/gerente/secretaria` são tratados como
  “privileged” em pé de igualdade; separação por papel é
  **decisão necessária em PR-PH.2** antes de PR-PH.4.
- Metas: `METAS` hardcoded em `dashboard.functions.ts:269`
  (`leadContato:80`, `contatoVisita:50`, `visitaProposta:50`,
  `propostaVenda:40`, `leadVenda:5`). Tornar configurável por
  tenant/role em PR-PH.4.
- Diferença `created_at` × `updated_at`: dashboard filtra por
  `created_at`; alertas usam `updated_at`. Consolidar contrato
  em PR-PH.4.
- Divergência de constantes de alerta entre pipeline (§6) e
  dashboard — resolver em PR-PH.3.
- Dependência da autoridade CRM atual: dashboard lê `leads`
  diretamente. Autoridade única precisa estar consolidada
  (PR-PH.3) antes de dashboard final (PR-PH.4).
- Testes ausentes: nenhum spec sob `__tests__` cobre
  `dashboardStats`.

## 8. Inventário CMS — sem “dual path” presumido

Evidência direta:

- `src/routes/_authenticated.admin.site.tsx` →
  `EntityWorkspace` com `ENTITIES.site` (descriptor
  singleton em `src/components/content/entity-registry.ts`) —
  **autoridade única de configurações globais do site**.
- `src/routes/_authenticated.admin.paginas.index.tsx` →
  `EntityWorkspace` com `ENTITIES.pagina` (páginas dinâmicas
  com editor de blocos) — **autoridade única de páginas
  dinâmicas**.
- `src/routes/_authenticated.admin.paginas.$id.tsx` → detalhe
  legado; seleção do workspace ocorre via `?item=<id>`.
- `src/routes/_authenticated.admin.cms-transferencia.tsx` →
  redirect legado. **Não é autoridade funcional.**
- `src/routes/_authenticated.admin.cms-auditoria.tsx` →
  redirect legado.
- `src/components/content/entity-registry.ts` declara todas as
  entidades com `ready: true`. Nenhuma entidade `ready: false`.
- `src/components/content/adapters/index.ts` mapeia
  `pagina/post/form/campanha/midia/site/auditoria/lead` para
  seus adapters.

Conclusão factual: **não há dual path CMS** entre `admin.site`
e `admin.paginas`. São descriptors diferentes para entidades
diferentes: `site` = singleton de configurações do site;
`pagina` = coleção de páginas dinâmicas com editor de blocos.
A classificação anterior “CMS antigo × novo” foi **removida**.

Nenhuma evidência foi encontrada de: duas autoridades de
leitura para a mesma entidade; dois editores para a mesma
entidade; duas tabelas concorrentes; dois fluxos de publicação;
rota antiga funcional; componentes legados efetivamente
importados como autoridade concorrente. `CmsFase1Tabs` e
`CmsPaginasTabs` só são importados por
`src/components/content/editors/SettingsContentEditor.tsx`
(reuso interno do editor do workspace unificado), não como
autoridade paralela.

Cutover pendente **restrito**: consolidar auditoria (redirects
`cms-auditoria`/`cms-transferencia`) em `/admin/auditoria`
formalmente na PR-PH.6.

## 9. Inventário white label

Quatro camadas obrigatórias.

### 9.1 White label do workspace interno — **Missing como sistema**

Logo `logo-rm-prime.png` fixo em `NavigationRail`; nenhuma
configuração de branding do workspace por tenant/usuário.
Responsável: PR-PH.5.

### 9.2 White label do site público — **Implemented but incomplete**

Evidência direta (`src/lib/api/site.functions.ts`,
`src/lib/api/site-versions.functions.ts`,
`src/components/content/adapters/useSiteAdapter.ts`,
`src/components/content/entity-registry.ts`,
`src/routes/__root.tsx:178 buildBrandingCss`, e as rotas
públicas em `src/routes/`):

Implementados como autoridade única `site_settings` +
`site_settings_versions`:

- `obterSiteSettings`, `atualizarSiteSettings`;
- draft → publish → versions → restore
  (`site-versions.functions.ts`);
- rendering server-side de CSS de branding no root loader
  (`buildBrandingCss` em `__root.tsx`);
- consumo público em `src/components/site/Header.tsx`,
  `Footer.tsx`, `WhatsAppFab.tsx`, `CmsPreviewOverlay.tsx`;
- audit trail via `logCmsAudit`.

Campos efetivamente suportados hoje pela autoridade única
`site_settings` (evidência direta: `interface SiteSettings` em
`src/lib/api/site.functions.ts:32-…` — descoberta encerrada
nesta PR-PH.0, sem “campos plausíveis”):

- `branding`: `logo_path`, `logo_url`, `favicon_path`,
  `favicon_url`, `site_name`.
- `branding_v2`: `color_primary`, `color_secondary`,
  `color_accent`, `color_button`, `color_link`, `font_primary`,
  `font_secondary`, `logo_mobile_path`, `logo_mobile_url`
  (aplicados em runtime via CSS variables por `buildBrandingCss`
  em `src/routes/__root.tsx`).
- `empresa`: `razao_social`, `nome_fantasia`, `cnpj`, `creci`,
  `responsavel_tecnico`, `fundacao`, `slogan`, `sobre_curto`.
- `footer`: `copyright`, `coluna1_titulo`, `coluna1_links`,
  `coluna2_titulo`, `coluna2_links`, `mostrar_redes`,
  `texto_legal`.
- `seo_global`: `default_title`, `default_description`,
  `default_og_image_path`, `default_og_image_url`, `keywords`,
  `twitter_handle`.
- `home_hero`, `home_secoes`, `home_diferenciais`,
  `home_depoimentos`, `pagina_lancamentos`, `pagina_sobre`,
  `contato` — conteúdo/SEO por página pública (não branding
  puro; mesma autoridade).

Persistência: tabela `site_settings` (tenant-scoped) +
`site_settings_versions` (audit + restore). Server functions:
`obterSiteSettings`, `atualizarSiteSettings`
(`site.functions.ts:307-…`), draft/publish/restore
(`site-versions.functions.ts`). Renderização pública:
`buildBrandingCss` no root loader; consumo em
`src/components/site/{Header,Footer,WhatsAppFab,CmsPreviewOverlay}.tsx`.
Fallbacks: valores default em `hydrateSiteSettings` quando
campos ausentes.

### 9.3 Branding da plataforma — protegido

Elementos institucionais RM Prime SaaS (identidade da
plataforma, logos institucionais, badges), não configuráveis
pelo tenant. Formalizar catálogo em PR-PH.5.

### 9.4 Sistema unificado de branding — autoridade única e não sobreposição

Regra vinculante desta PR-PH.0:

> Nenhum mesmo campo de branding pode possuir duas autoridades
> persistentes ou dois caminhos de publicação.

- **Não** criar segunda autoridade de branding sem Impact
  Analysis.
- **Não** pré-autorizar a tabela `workspace_branding` — ela é
  registrada aqui apenas como alternativa **sujeita a Impact
  Analysis** em PR-PH.5.
- PR-PH.5 deverá realizar Impact Analysis antes de decidir entre:
  (A) extensão controlada de `site_settings` para cobrir também
  o workspace interno com escopo declarado (mesma autoridade,
  campos declaradamente separados); ou (B) autoridade separada
  exclusivamente para o workspace interno.
- A opção (B) somente será permitida se: os campos forem
  não-sobrepostos com `site_settings`; o domínio for
  explicitamente distinto; não existir fallback entre
  autoridades; a resolução for determinística; a precedência
  for proibida; não houver dual write; não houver sincronização
  implícita; a decisão estiver documentada.
- Preservar compatibilidade, isolamento multi-tenant, contraste
  WCAG AA mínimo e fallback determinístico.

## 10. Inventário site público, CMS e blocos

- Rotas públicas presentes (`index`, `sobre`, `contato`,
  `anuncie`, `imoveis`, `imovel.$slug`, `lancamentos*`,
  `blog*`, `p.$slug`, `privacidade`, `sitemap[.]xml`,
  `unsubscribe`) — **Implemented and connected**.
- Resolução de tenant por host: `src/lib/tenant.server.ts`,
  `src/lib/portal-engine.server.ts` — **Implemented and
  connected**.
- Renderers: `CmsPageRenderer.tsx`, `CmsFormRenderer.tsx`,
  `CampaignRenderer.tsx`, overlay de preview
  `CmsPreviewOverlay.tsx` — **Implemented and connected**.
- Blocos do page builder — **inventário encerrado nesta
  PR-PH.0** (descoberta finalizada; PR-PH.7 implementa/finaliza
  lacunas, não redescobre). Evidência direta:
  `src/lib/api/pages.functions.ts` (tipo `CmsBlock` + `blockSchema`
  Zod), `src/components/content/blocks/BlockEditor.tsx`
  (switch de editores) e `src/components/site/CmsPageRenderer.tsx`
  (switch de renderers públicos).

  | id (type) | schema (Zod) | editor | renderer público | preview | persistência | sanitização | mídia | responsividade | a11y | captura lead | analytics | teste | classificação |
  |---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|---|
  | `hero` | ✓ | ✓ `BlockEditor.tsx:94` | ✓ `CmsPageRenderer.tsx:21` | via workspace | `cms_pages.blocks` (JSONB) | não formalizada | `imagem_url` | não gate | não gate | não | não | ausente | Implemented but incomplete (sanitização/a11y) |
  | `richtext` | ✓ (`html`, `align`) | ✓ `:113` | ✓ `:40` | via workspace | idem | **HTML sem sanitização declarada** | não | não gate | não gate | não | não | ausente | Implemented but incomplete (XSS risk) |
  | `image` | ✓ | ✓ `:126` | ✓ `:51` | via workspace | idem | não | ✓ | não gate | `alt` opcional | não | não | ausente | Implemented but incomplete |
  | `gallery` | ✓ | ✓ `:134` | ✓ `:60` | via workspace | idem | não | ✓ | colunas 2/3/4 | `alt` por item | não | não | ausente | Implemented but incomplete |
  | `video` | ✓ (`embed_url`) | ✓ `:157` | ✓ `:73` | via workspace | idem | embed URL sem allowlist | ✓ | não gate | não gate | não | não | ausente | Implemented but incomplete |
  | `cta` | ✓ | ✓ `:164` | ✓ `:84` | via workspace | idem | href sem allowlist | não | não gate | não gate | não | não | ausente | Implemented but incomplete |
  | `form` | ✓ (`form_slug`) | ✓ `:173` | ✓ `:99` (delega a `CmsFormRenderer`) | via workspace | idem + `cms_forms` | server function | não | herda | herda | ✓ (via forms) | não | ausente | Implemented but incomplete |
  | `features` | ✓ | ✓ `:180` | ✓ `:108` | via workspace | idem | não | ícone string | não gate | não gate | não | não | ausente | Implemented but incomplete |
  | `faq` | ✓ | ✓ `:197` | ✓ `:125` | via workspace | idem | resposta texto | não | não gate | não gate | não | não | ausente | Implemented but incomplete |
  | `spacer` | ✓ | ✓ `:213` | ✓ `:141` | via workspace | idem | n/a | não | ✓ | n/a | não | não | ausente | Implemented and connected |

  Bloco apenas declarado / sem renderer / sem editor: **nenhum**
  no baseline (paridade schema↔editor↔renderer completa).
  Blocos sem sanitização formal: `richtext` (crítico),
  `video.embed_url`, `cta.botao_href`. Blocos sem teste
  dedicado: **todos**. PR-PH.7 é responsável por implementar
  sanitização, allowlist, contratos a11y e testes por bloco.
- Formulários, LGPD (`privacidade.tsx`, `unsubscribe.tsx`),
  SEO/metadata, sitemap, robots, preview, publicação,
  versionamento (`site-versions.functions.ts`,
  `VersionsPanel.tsx`), agendamento, analytics, pixels
  (`meta-pixel.ts`) — **Implemented but incomplete**;
  consolidação em PR-PH.6.

## 11. Landing pages

Suporte formal ausente como categoria distinta. — **Missing**.
Responsável: PR-PH.7. `ENTITIES.pagina` cobre páginas do CMS;
não há template dedicado a lançamento/campanha/captura como
categoria separada.

## 12. Tenant Domain Management

- Subdomínio padrão via `portal-engine.server.ts`; resolução
  por host — **Implemented and connected**.
- UI de custom domain (`admin.dominios.tsx`) — **Missing**.
- State machine (`not_configured → pending_dns → verifying →
  verified → provisioning_ssl → active | failed | suspended →
  removing`), verificação DNS/TXT, SSL, anti-takeover,
  auditoria, rollback, canonical, apex/www, unicidade —
  **Planned only**.

Responsável: PR-PH.8.

## 13. Onboarding e Configuration Center

- Wizard `onboarding.tsx` — **Missing**.
- Configuration Center unificado — **Missing** (as configurações
  vivem espalhadas em admin/site, admin/perfis, admin/portais,
  admin/corretores, admin/equipes).

Responsável: PR-PH.9.

## 14. Roles, permissions e autoridade de configuração

### 14.1 Domínios canônicos (fonte vinculante)

Fonte: `src/integrations/supabase/membership-types.ts`,
`src/integrations/supabase/types.ts` (generated) e migrations
que criaram/alteraram os enums.

- `membership_status` — enum PostgreSQL. Valores exatos:
  `active`, `invited`, `suspended`, `revoked`. **Somente `active`
  é operacional** (participa de resolução de tenant e de operação
  tenant-scoped). Traduções informais (`removed`, `member`) **não
  existem** no runtime e **não** podem ser usadas como valores
  persistidos.
- `tenant_role` — enum PostgreSQL. Valores exatos: `owner`,
  `admin`, `manager`, `broker`, `captador`, `secretaria`,
  `viewer`. Classifica a membership no tenant; **não** resolve
  tenant, **não** concede autorização ampla implicitamente,
  **não** substitui RBAC nem entitlement comercial.

### 14.2 Autoridades separadas (não misturar)

- **Membership status** — determina se a membership pode
  participar de resolução e operação tenant-scoped. Autoridade:
  `tenant-middleware.ts`, `tenant-repository.ts`,
  `get_current_tenant_id()`.
- **Tenant role** — classificação de papel no tenant.
  Reconciliado em F4.0: `tenant_role = 'admin'` histórico **não**
  concede autoridade comercial. Nenhum call site em `src/` ou
  `supabase/` usa `tenant_role` como autorização funcional
  (F4.0 §Code Usage Inventory).
- **User roles / `has_role(_user_id, _role)`** — modelo global
  de papéis (`public.user_roles`, enum `app_role`). Autoridade
  real utilizada por server functions específicas (inventário
  observado por `rg -l "has_role" src/lib/api/`): `admin.functions`,
  `blog.functions`, `meta.functions`, `cms-transfer.functions`,
  `dashboard.functions`, `lancamentos.functions`, `_cms.ts`,
  `super.functions`, `cms-audit.functions`, `rbac.functions`,
  `commercial/commercial.functions`, `portals.functions`,
  `origens.functions`, `historico.functions`, `leads-crm.functions`,
  `lead-reasons.functions`, `legacy-storage.functions`,
  `ia.functions`, `instagram.functions`, `catalogo.functions`.
  Valores de `app_role` **não** se confundem com `tenant_role`.
- **RBAC** — perfis, módulos, ações, escopos. Tabelas:
  `rbac_profiles`, `rbac_modules`, `rbac_permissions`,
  `user_profiles`. Funções: `has_cms_permission`,
  `has_permission`, `has_any_permission`. Consumers reais:
  `_cms.ts` (`assertCmsPermission`), `rbac.functions.ts`,
  `use-cms-permissions.ts`.
- **Commercial entitlement** — SCP-006 … SCP-012. Controla
  disponibilidade comercial de features. **Nunca** substitui
  membership authorization; **nunca** concede acesso tenant-scoped
  isoladamente.
- **Super Admin** — `public.is_super_admin()` sobre `user_roles`.
  Pode operar recursos globais autorizados. **Para recursos
  tenant-scoped, exige impersonação explícita, validada e
  derivada no servidor.** Sem impersonação,
  `get_current_tenant_id` retorna `NULL` e a operação falha.

### 14.3 Contrato de impersonação (não é bypass)

Fonte: `src/integrations/supabase/tenant-middleware.ts`
(`resolveTenantContext`) e `public.get_current_tenant_id()`.

- `x-tenant-id` é **transporte**, não autoridade. O client nunca
  decide.
- O servidor identifica se o usuário é Super Admin (RPC
  `is_super_admin`).
- O servidor valida o tenant alvo (`tenants.id` existe para
  Super Admin; membership `active` do usuário para regular).
- O servidor deriva `origin = 'impersonation'` (Super Admin com
  header válido), `origin = 'selection'` (regular com header
  válido) ou `origin = 'single-membership'` (regular, um único
  active).
- **Super Admin sem header válido** → `Forbidden: no tenant
  membership` (nenhum bypass).
- **Regular com header** só acessa tenant para o qual possui
  membership `active` validada server-side.

**No Super Admin tenant-scoped RLS bypass evidenced.** Nenhuma
policy `USING (public.is_super_admin())` foi identificada como
regra global sobre tabelas tenant-scoped no baseline auditado.
Se PR-PH.2 identificar exceção, deverá registrar: nome da
policy, tabela, `USING`, `WITH CHECK`, migration de origem e
justificativa arquitetural.

### 14.4 Matriz de autorização por operação

Matriz por **operação** (não apenas por módulo). Quando o
repositório não comprova uma condição, usa `Not evidenced in
repository`. Fontes: rotas em `src/routes/`, server functions
em `src/lib/api/*.functions.ts`, middleware em
`src/integrations/supabase/*`, schema em `types.ts` +
migrations.

| Operação | Rota / caller | Server fn | Middleware | Tenant resolution | membership_status exigido | tenant_role consultado | user_roles / has_role consultado | RBAC consultado | Owner req. | Entitlement | Impersonation behavior | Tabela | RLS policy relevante | Audit event | Teste existente | Lacuna | Evidência |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Selecionar tenant | `use-tenant-selection.ts` | `tenant-selection.functions.ts` | `requireSupabaseAuth` | `resolveTenantContext` cardinality sobre `active` | `active` | não | não | não | não | não | header validado server-side | `tenant_members` | tenant-scoped por `user_belongs_to_tenant` | não | `tenant-selection-cardinality.spec` | matriz canônica ausente | `tenant-middleware.ts` |
| Listar leads | `/admin/pipeline`, `/admin/leads-workspace` | `leads-crm.functions.ts:listarLeads` | `requireSupabaseAuth` | `get_current_tenant_id` | `active` | não | Not evidenced in repository (filtragem via RLS) | não | não | não | via `x-tenant-id` (Super Admin) | `leads` | tenant-scoped | não | Not evidenced in repository | audit trail ausente | `leads-crm.functions.ts` |
| Criar lead | idem | `leads-crm.functions.ts:criarLead` | `requireSupabaseAuth` | idem | `active` | não | Not evidenced in repository | não | não | não | idem | `leads` | tenant-scoped | não | Not evidenced in repository | audit trail ausente | idem |
| Atualizar lead | idem | `admin.functions.ts` | `requireSupabaseAuth` | idem | `active` | não | `has_role` consultado | não | não | não | idem | `leads` | tenant-scoped | não | Not evidenced in repository | audit por card ausente | `admin.functions.ts` |
| Mudança de estágio | idem | `leads-crm.functions.ts` (update status) | `requireSupabaseAuth` | idem | `active` | não | Not evidenced in repository | não | não | não | idem | `leads` + trigger `tg_leads_enforce_status_flow` | tenant-scoped | trigger valida transições | Not evidenced in repository | histórico de estágio Missing | trigger em DB |
| Descartar lead | idem | `leads-crm.functions.ts:descartarLead` | `requireSupabaseAuth` | idem | `active` | não | Not evidenced in repository | não | não | não | idem | `leads`, `lead_descartes` | tenant-scoped | insert em `lead_descartes` | Not evidenced in repository | audit unificado ausente | `:53-68` |
| Reabrir lead | idem | `leads-crm.functions.ts:reabrirLead` | `requireSupabaseAuth` | idem | `active` | não | Not evidenced in repository | não | não | não | idem | `leads` | tenant-scoped | não | Not evidenced in repository | audit unificado ausente | `:155-168` |
| Gestão corretores | `/admin/corretores` | `admin.functions.ts` | `requireSupabaseAuth` | idem | `active` | não | `has_role('admin')` | não | não | não | idem | `corretores` | tenant-scoped | não | Not evidenced in repository | matriz canônica ausente | `admin.functions.ts` |
| Gestão equipes | `/admin/equipes` | `admin.functions.ts` | `requireSupabaseAuth` | idem | `active` | não | `has_role('admin')` | não | não | não | idem | `teams`, `team_members` | tenant-scoped | não | Not evidenced in repository | matriz canônica ausente | idem |
| Gestão perfis (RBAC) | `/admin/perfis` | `rbac.functions.ts` | `requireSupabaseAuth` | idem | `active` | não | `has_role('admin')` | `rbac_profiles`, `rbac_permissions` | não | não | idem | `rbac_*`, `user_profiles` | tenant-scoped | não | Not evidenced in repository | matriz canônica ausente | `rbac.functions.ts` |
| Catálogo (imóveis/lançamentos) | `/admin/imoveis*`, `/admin/lancamentos*` | `catalogo.functions.ts`, `lancamentos.functions.ts` | `requireSupabaseAuth` | idem | `active` | não | `has_role` | não | não | não | idem | `imoveis`, `launch_projects`, `launch_units` | tenant-scoped | não | Not evidenced in repository | granularidade fina ausente | as functions |
| CMS write | `/admin/site`, `/admin/paginas*`, `/admin/blog*`, `/admin/formularios*`, `/admin/campanhas*` | `site.functions.ts`, `pages.functions.ts`, `blog.functions.ts`, `forms.functions.ts`, `campaigns.functions.ts`, `_cms.ts` | `requireSupabaseAuth` | idem | `active` | não | `has_role` (via `_cms.ts`) | `has_cms_permission` (`_cms.ts:assertCmsPermission`) | não | não | idem | `site_settings*`, `cms_pages`, `blog_posts`, `cms_forms`, `cms_campaigns` | tenant-scoped | `logCmsAudit` (`_cms.ts`) | Not evidenced in repository | granularidade fina por bloco ausente | `_cms.ts` |
| Mídias | `/admin/midias` | `media.functions.ts`, `uploads.functions.ts` | `requireSupabaseAuth` | idem | `active` | não | `has_role` | não | não | não | idem | `media_library`, `media_usage`, storage buckets `site`/`imoveis`/`lancamentos` | tenant-scoped | não | Not evidenced in repository | tenant scoping formal ausente | media/uploads functions |
| Portais | `/admin/portais` | `portals.functions.ts` | `requireSupabaseAuth` | idem | `active` | não | `has_role` | não | não | não | idem | `portal_connectors`, `imovel_portais`, `portal_sync_dlq`, `portal_sync_logs` | tenant-scoped | `system_events` | Not evidenced in repository | — | `portals.functions.ts` |
| Site settings / branding público | `/admin/site` | `site.functions.ts`, `site-versions.functions.ts` | `requireSupabaseAuth` | idem | `active` | não | `has_role` | não | não | não | idem | `site_settings`, `site_settings_versions` | tenant-scoped | versões (`site_settings_versions`) | Not evidenced in repository | contraste WCAG não gate | `site.functions.ts` |
| Assento comercial (mutation) | interno | `commercial/commercial.functions.ts` → RPC `mutate_tenant_membership` | `requireSupabaseAuth` | idem | mutation valida internamente | consultado por `mutate_tenant_membership` (owner-only) | Not evidenced in repository como authz externa | não | owner requerido (regular) | consultado por `resolve_commercial_seat_decision` | idem | `tenant_members`, `tenant_subscriptions`, `tenant_entitlements`, `commercial_plan_entitlements` | tenant-scoped | via mutation | `commercial-seat-*.spec` + runner de paridade | audit externo ausente | RPC `mutate_tenant_membership` |
| Super Admin global | `/super*` | `super.functions.ts` | `requireSupabaseAuth` + `is_super_admin` | n/a (recursos globais) | n/a | não | `is_super_admin` obrigatório | não | não | não | não aplicável | `system_events` (via `super_observabilidade`) | ver guard `is_super_admin` | via `log_system_event` | Not evidenced in repository | catálogo formal de recursos globais ausente | `super.functions.ts` |
| Super Admin sob impersonação (tenant-scoped) | `/super*` com `x-tenant-id` | `super.functions.ts` + server functions tenant-scoped | `requireSupabaseAuth` + `is_super_admin` + `requireTenant` | `origin=impersonation` derivado server-side | `tenants.id` existe (não exige membership) | não | `is_super_admin` obrigatório | não | não | não | header inválido/ausente → falha (nenhum bypass) | conforme operação alvo | conforme tabela alvo | via operação alvo | `tenant-middleware.spec`, `commercial-context-selection.spec` | audit unificado ausente | `tenant-middleware.ts`, `get_current_tenant_id()` |

Não é permitido inferir autorização a partir de: menu visível,
nome da rota, nome da função, documentação histórica,
`tenant_role` sem consulta no runtime, `has_role` sem chamada
efetiva, ou RLS habilitado sem leitura da policy.

### 14.5 Verificação de nomes de tabelas

Cada tabela citada acima existe no schema atual (confrontado
com `src/integrations/supabase/types.ts` e migrations):
`tenant_members`, `leads`, `lead_descartes`, `corretores`,
`teams`, `team_members`, `user_roles`, `user_profiles`,
`rbac_profiles`, `rbac_modules`, `rbac_permissions`, `imoveis`,
`launch_projects`, `launch_units`, `site_settings`,
`site_settings_versions`, `cms_pages`, `blog_posts`, `cms_forms`,
`cms_campaigns`, `media_library`, `media_usage`,
`portal_connectors`, `imovel_portais`, `portal_sync_dlq`,
`portal_sync_logs`, `tenant_subscriptions`, `tenant_entitlements`,
`commercial_plan_entitlements`, `system_events`, `tenants`.
Nomes previamente citados que **não** existem no schema
(`lead_historico`, `cms_posts`, `cms_audit`, `media_assets`,
`portal_configs`, `lancamentos`, `unidades`, `cms_permissions`)
foram substituídos pelos nomes reais acima.

PR-PH.2 continua responsável pela canonicalização formal da
matriz e pelo hardening, mas **não** pela descoberta inicial —
o baseline acima é vinculante.

## 15. Prontidão operacional

Cada linha declara a **classe de evidência**:
Repository-observable (só o código/arquivos comprovam);
Environment-observable (exige o ambiente rodando);
Externally managed (capacidade da plataforma, não do repo);
Externally verified (confirmada fora do repo — cite a fonte);
Not verified; Missing (ausente). Presença de código **não**
autoriza classificação de entrega operacional.

| Item | Estado | Classe de evidência | Evidência |
|---|---|---|---|
| Ambientes (preview / published) | Capacidade declarada da plataforma; teste de restore **Not verified** | Externally managed | plataforma gerenciada; PR-PH.11 responsável por validação operacional |
| Variáveis (por nome) | Nomes referenciados em código: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`, `LOVABLE_API_KEY` | Repository-observable (referência); operacional Not verified | `client.ts`, `client.server.ts`, `pages.functions.ts` |
| Secrets (por nome) | Nomes referenciados: `SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`, `CRON_SECRET`, `SUPABASE_DB_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Referência Repository-observable; provisionamento Externally managed; validação operacional Not verified | `client.server.ts`, secrets store |
| Migrations | **93 migration files versionados no repositório auditado.** Estado remoto de aplicação (ordem real, drift, checksums) **Not verified** pelo repositório | Repository-observable (contagem/ordem em `supabase/migrations/`); aplicação remota Not verified | `ls supabase/migrations/*.sql | wc -l` = 93 |
| Seed | Missing como pipeline formal (fixtures existem apenas em runners de teste) | Repository-observable | `run-*.ts` |
| Backup | Capacidade declarada da plataforma; execução periódica **Not verified**; teste de restore obrigatório em PR-PH.11 | Externally managed | plataforma |
| Restore | Capacidade declarada da plataforma; **restore drill Not verified** — obrigatório em PR-PH.11 | Externally managed | plataforma |
| Observabilidade | Coleta server-side implementada; dashboard consumidor Missing | Repository-observable + Missing | `src/lib/observability.server.ts`, `super_observabilidade` RPC |
| Logs | Implementados server-side (`log_system_event`); coleta cliente parcial | Repository-observable | `log_system_event`, `console.error` em handlers |
| Error reporting (client) | Implementado e conectado | Repository-observable | `lovable-error-reporting.ts`, `error-capture.ts` |
| Alertas operacionais | Missing — sem canal formal | Missing | — |
| Health checks | Missing como rota dedicada | Missing | — |
| Rate limits | Implementados em superfícies sensíveis; validação operacional Not verified | Repository-observable | `rate-limit.server.ts`, `rate_limit_hit` RPC |
| Cron | `pg_cron` referenciado por `email_queue_wake`/`email_queue_dispatch`; declaração de agendamento externa Not verified | Repository-observable (referência); Not verified operacionalmente | funções `email_queue_*` |
| Webhooks internos | `email_queue/process`, `portal-dlq-retry` em `/api/public/*` implementados; entrega operacional Not verified | Repository-observable | rotas em `src/routes/api/public/` |
| E-mail — código | Implementado (envio + templates) | Repository-observable | `email/notify.server.ts`, `email-templates/*` |
| E-mail — provider configurado | Externally managed | Externally managed; Not verified | Lovable email infra |
| E-mail — entrega real (com observabilidade, retry, DLQ, teste) | **Not verified** — obrigatório em PR-PH.11 | Not verified | — |
| WhatsApp | Botão flutuante público apenas; sem API oficial (decisão de produto) | Repository-observable | `WhatsAppFab.tsx` |
| Analytics | Pixel/tag implementado; dashboard analítico Missing | Repository-observable + Missing | `meta-pixel.ts` |
| Auditoria CMS | Implementada e conectada | Repository-observable | `_cms.ts:logCmsAudit`, `admin.auditoria.tsx` |
| Runbooks | Missing | Missing | — |
| Rollback operacional | Site versions/restore implementado; CRM/comercial Missing | Repository-observable + Missing | `site-versions.functions.ts` |
| Retenção / Exportação / Exclusão / LGPD | Páginas públicas presentes; processo interno de export/erase Missing | Repository-observable + Missing | `privacidade.tsx`, `unsubscribe.tsx` |
| Suporte / SLA | Missing — sem canal formal declarado | Missing | — |

PR-PH.11 deverá implementar/validar as lacunas acima; **não**
deverá repetir descoberta básica. Toda entrada `Not verified`
depende de evidência operacional externa e não pode ser
promovida por inferência.


## 16. Diretriz vinculante — RM Prime SaaS Data-Dense Premium Dark Interface

Preservada. Dark graphite; cores vivas apenas com semântica;
máximo contraste nas superfícies de leitura; KPI sempre com
contexto/comparação/tendência; alertas explicáveis; drill-down;
dashboard por papel; tema claro alternativo; validação com
usuários reais antes da homologação.

Formalização de tokens, contraste, tipografia, densidade,
estados e regras de cor do tenant é responsabilidade da
PR-PH.10.

---

## 17. Sequência vinculante corrigida

| Etapa | Nome oficial |
|---|---|
| **PR-PH.1** | Tenant Workspace Information Architecture, Navigation & Canonical Route Map |
| **PR-PH.2** | Roles, Permissions & Configuration Authority Baseline |
| **PR-PH.3** | CRM & Kanban Canonicalization and Finalization |
| **PR-PH.4** | Role-Aware Dashboard & Decision Intelligence Finalization |
| **PR-PH.5** | Workspace and Public-Site White-Label Consolidation |
| **PR-PH.6** | Public Website Navigation, CMS Authority & Content Architecture |
| **PR-PH.7** | Landing Page & Dynamic Page Builder Finalization |
| **PR-PH.8** | Tenant Domain Management & Host Resolution |
| **PR-PH.9** | Tenant Onboarding & Configuration Center |
| **PR-PH.10** | Product UX/UI Final Consistency, Accessibility & Responsive Review |
| **PR-PH.11** | Environment, Observability & Operational Readiness |
| **PR-PH.12** | Pre-Homologation Product Closing Review |

Após Product Readiness:

| Etapa | Nome oficial |
|---|---|
| **TH-001** | Test & Homologation Impact Analysis |
| **TH-002** | Homologation Environment Provisioning |
| **TH-003** | General Test Execution |
| **TH-004** | Pilot Tenant Homologation |
| **TH-005** | Defect Correction & Regression Cycles |
| **TH-006** | Production Readiness Review |

**Caminho crítico mínimo:**
PR-PH.1 → PR-PH.2 → PR-PH.3 → PR-PH.4 → PR-PH.5 → PR-PH.6 →
PR-PH.7 → PR-PH.8 → PR-PH.9 → PR-PH.10 → PR-PH.11 → PR-PH.12
→ TH-001.

Roles precede CRM; CRM precede dashboard final; branding
consolidado precede onboarding e domínio; CMS precede landing
page; domínio precede onboarding quando o onboarding inclui
domínio.

## 18. Ownership vinculante entre PR-PH.1 e PR-PH.3

- **PR-PH.1** é responsável **exclusivamente** por: mapa de
  navegação; estrutura dos sete contextos; rotas canônicas;
  redirects e aliases; breadcrumbs; menu do usuário; página
  403; nomenclatura de “Início”; destino de links; tratamento
  de rotas órfãs; regras de aliasing (`/admin/leads →
  /admin/pipeline`).
- **PR-PH.1 não pode:** reescrever CRM; substituir componentes
  funcionais; migrar dados; alterar status; implementar
  Kanban; executar cutover funcional; remover adapters
  funcionais; decidir regras comerciais.
- **PR-PH.3** é responsável **exclusivamente por**: autoridade
  funcional do CRM; seleção do componente canônico
  (PipelinePage vs EntityWorkspace(lead)); cutover; remoção
  da superfície funcional substituída; modelo de status;
  cards; Kanban; drag-and-drop; rollback; concorrência;
  histórico; auditoria; permissões; regras financeiras
  (`ganho ≠ perdido ≠ descartado ≠ fechado ≠ arquivado`);
  testes funcionais; consolidação de constantes de alerta.

---

## 19. Contratos executáveis individuais (PR-PH.1 … PR-PH.12)

Cada contrato é vinculante. Categorias marcadas “Não
aplicável” quando genuinamente ausentes.

### 19.1 PR-PH.1 — Tenant Workspace Information Architecture, Navigation & Canonical Route Map

1. **Nome oficial:** Tenant Workspace Information Architecture,
   Navigation & Canonical Route Map.
2. **Objetivo:** consolidar arquitetura de informação do
   workspace autenticado; canonicalizar rotas; formalizar
   redirects, breadcrumbs, menu do usuário, página 403 e
   nomenclatura “Início”.
3. **Baseline:** §§4.1, 4.2, 5 desta análise.
4. **Dependências:** PR-PH.0 Accepted (auditoria externa).
5. **Autoridades atuais:** `WorkspaceShell`, `NavigationRail`,
   `AppHeader`, `ContextTabs`, `contexts.ts`, redirects
   `/admin/leads`, `/admin/cms-auditoria`,
   `/admin/cms-transferencia`.
6. **Lacunas:** breadcrumbs formais; 403 dedicado; nomenclatura
   controlada de “Início”; menu do usuário incompleto;
   documentação canônica de rotas.
7. **Escopo autorizado:** IA, navegação, rótulos, redirects,
   página 403, breadcrumbs, menu do usuário, mapa canônico de
   rotas.
8. **Fora de escopo:** cutover funcional; alteração de
   autoridade comercial ou CRM; alteração de schema; alteração
   de RLS/grants; alteração de dashboard; alteração de site
   público.
9. **Arquivos e módulos previstos:** `src/components/workspace/*`,
   `src/components/workspace/contexts.ts`, `src/routes/_authenticated.*`
   (novas rotas de 403/breadcrumbs), `src/router.tsx` (apenas
   se necessário para 403).
10. **Rotas previstas:** possível `/_authenticated/403.tsx`;
    reafirmação dos redirects existentes.
11. **Tabelas afetadas:** Não aplicável.
12. **Migrations possíveis:** Não aplicável.
13. **Impacto em RLS:** Não aplicável.
14. **Impacto em grants:** Não aplicável.
15. **Server boundaries:** Não aplicável.
16. **Contratos de dados:** Não aplicável.
17. **Autoridade de autorização:** reforço da autoridade
    existente (`auth-middleware`, `tenant-middleware`).
18. **Membership authorization:** confirmação declarativa;
    nenhuma alteração.
19. **Entitlement comercial:** Não aplicável.
20. **Impersonação:** preservada; página 403 nunca revela
    identidade impersonada.
21. **UX:** breadcrumbs, 403 explicativo, nomenclatura fechada.
22. **Responsividade:** obrigatória em novas superfícies.
23. **Acessibilidade:** obrigatória; foco visível; ARIA.
24. **Analytics:** Não aplicável.
25. **Observabilidade:** Não aplicável.
26. **Testes unitários:** contratos de nomenclatura (assert de
    strings canônicas).
27. **Testes de integração:** rotas canônicas → 200; rotas
    legadas → redirect 3xx; rotas negadas → 403.
28. **Testes E2E:** navegação por rail/tabs/menu.
29. **Testes visuais:** breadcrumbs e 403.
30. **Testes de segurança:** 403 nunca vaza tenant; menu do
    usuário respeita gate super.
31. **Fixtures e cleanup fail-closed:** Não aplicável.
32. **Hard gates:** menu configurável nunca altera segurança;
    nenhum cutover funcional executado; nenhuma alteração de
    schema/RLS.
33. **Definition of Done:** mapa canônico publicado; 403 vivo;
    breadcrumbs vivos; redirects testados.
34. **Complexidade relativa:** média.
35. **Adequação a um único prompt macro:** sim.
36. **Condições objetivas de replanejamento:** necessidade de
    alterar autoridade de rota autenticada (`_authenticated`)
    ou de tocar autoridade comercial.
37. **Estado esperado do roadmap após aprovação:** PR-PH.1 —
    Accepted; PR-PH.2 — Ready for Impact Analysis.

### 19.2 PR-PH.2 — Roles, Permissions & Configuration Authority Baseline

1. **Nome oficial:** Roles, Permissions & Configuration
   Authority Baseline.
2. **Objetivo:** formalizar a matriz de autoridade por operação
   administrativa; separar membership authorization e
   entitlement comercial; documentar o comportamento sob
   impersonação; produzir contratos server-side.
3. **Baseline:** §14 desta análise + F4.0 + SCP-012.
4. **Dependências:** PR-PH.1 Accepted.
5. **Autoridades atuais:** `has_role`, `tenant_role`,
   `membership_status`, `auth-middleware`, `tenant-middleware`,
   `membership-validation`, entitlement server (SCP-011).
6. **Lacunas:** matriz de autoridade por operação; catálogo de
   operações administrativas; testes negativos abrangentes.
7. **Escopo autorizado:** documentação normativa + specs
   framework-agnostic + eventuais funções de leitura server
   para diagnóstico (read-only).
8. **Fora de escopo:** alteração de RLS existentes; criação de
   novo domínio comercial; UI de administração de papéis.
9. **Arquivos e módulos previstos:** `docs/architecture/security/*`
   (novo apêndice), `src/integrations/supabase/__tests__/*` (novos
   specs), possíveis leitores read-only em `rbac.functions.ts`.
10. **Rotas previstas:** Não aplicável.
11. **Tabelas afetadas:** apenas leitura de `user_roles`,
    `tenant_members`.
12. **Migrations possíveis:** Não aplicável (esta etapa é
    baseline; migrations aparecem em etapas seguintes).
13. **Impacto em RLS:** Não aplicável.
14. **Impacto em grants:** Não aplicável.
15. **Server boundaries:** reafirmação de autoridade única
    server-side.
16. **Contratos de dados:** matriz `operação → papel mínimo →
    membership_status → owner? → entitlement → impersonação`.
17. **Autoridade de autorização:** server-side única.
18. **Membership authorization:** contrato canônico.
19. **Entitlement comercial:** referência a SCP-006 …
    SCP-012.
20. **Impersonação:** super sem impersonação nunca acessa
    tenant-scoped.
21. **UX:** Não aplicável.
22. **Responsividade:** Não aplicável.
23. **Acessibilidade:** Não aplicável.
24. **Analytics:** Não aplicável.
25. **Observabilidade:** eventos de negação uniformizados.
26. **Testes unitários:** matriz completa positivo/negativo.
27. **Testes de integração:** cenários negativos por operação.
28. **Testes E2E:** Não aplicável.
29. **Testes visuais:** Não aplicável.
30. **Testes de segurança:** privilege escalation coverage;
    proibir derivação de autorização por `tenant_role` ou
    client state.
31. **Fixtures e cleanup fail-closed:** obrigatórios em
    fixtures de teste.
32. **Hard gates:** nenhuma autorização derivada de client;
    autoridade server única.
33. **Definition of Done:** matriz publicada; specs verdes;
    nenhuma alteração de runtime autoritativo.
34. **Complexidade relativa:** média.
35. **Adequação a um único prompt macro:** sim.
36. **Condições objetivas de replanejamento:** necessidade de
    reescrever `auth-middleware`.
37. **Estado esperado do roadmap após aprovação:** PR-PH.2 —
    Accepted; PR-PH.3 — Ready for Impact Analysis.

### 19.3 PR-PH.3 — CRM & Kanban Canonicalization and Finalization

1. **Nome oficial:** CRM & Kanban Canonicalization and
   Finalization.
2. **Objetivo:** escolher autoridade funcional entre
   PipelinePage e EntityWorkspace(lead); executar cutover;
   consolidar Kanban, DnD, otimista+rollback, audit trail,
   concorrência, permissões server-side, regras financeiras
   e constantes de alerta.
3. **Baseline:** §§5, 5.1, 6 desta análise.
4. **Dependências:** PR-PH.1 e PR-PH.2 Accepted.
5. **Autoridades atuais:** `PipelinePage`, `usePipelineData`,
   `adminAtualizarLead`, `adminListarLeads`,
   `adminContarDescartes`, `EntityWorkspace` com
   `ENTITIES.lead`, `useLeadAdapter`.
6. **Lacunas:** autoridade única; audit trail formal por card;
   detecção de concorrência; contagem financeira
   canonicalizada; testes; constantes de alerta unificadas.
7. **Escopo autorizado:** cutover CRM; migrations de audit
   trail e versionamento de card; ajustes de server functions;
   consolidação de constantes.
8. **Fora de escopo:** dashboard final; branding; CMS; domínio;
   onboarding.
9. **Arquivos e módulos previstos:** `src/components/pipeline/*`,
   `src/lib/api/admin.functions.ts`, `src/lib/api/leads-crm.functions.ts`,
   `src/lib/api/historico.functions.ts`,
   `src/components/content/adapters/useLeadAdapter.ts`,
   `src/routes/_authenticated.admin.pipeline.tsx`,
   `src/routes/_authenticated.admin.leads-workspace.tsx`
   (potencialmente removida ou transformada em alias).
10. **Rotas previstas:** decisão sobre `/admin/leads-workspace`.
11. **Tabelas afetadas:** `leads`, possível `lead_history` /
    `lead_audit`.
12. **Migrations possíveis:** criação de audit trail; coluna
    de `version` para conflict detection.
13. **Impacto em RLS:** políticas de leitura/escrita da nova
    tabela de audit; nenhuma reescrita de RLS existente sem
    justificativa.
14. **Impacto em grants:** grants do novo objeto.
15. **Server boundaries:** todas as mutations via server
    function autorizada.
16. **Contratos de dados:** DTO canônico do card; DTO de
    transição de estágio; DTO de auditoria.
17. **Autoridade de autorização:** matriz de PR-PH.2.
18. **Membership authorization:** exigida em toda mutation.
19. **Entitlement comercial:** aplicar `seat`/`feature` se
    relevante.
20. **Impersonação:** auditar como super sob impersonação.
21. **UX:** Kanban, densidades, chips, tabs, detalhe inline.
22. **Responsividade:** Kanban mobile.
23. **Acessibilidade:** DnD teclado (fallback).
24. **Analytics:** eventos de transição de estágio.
25. **Observabilidade:** logs por mutation.
26. **Testes unitários:** transições positivas/negativas;
    otimista+rollback determinístico.
27. **Testes de integração:** RLS positive/negative;
    concorrência.
28. **Testes E2E:** DnD → persist → refresh.
29. **Testes visuais:** cards e Kanban.
30. **Testes de segurança:** RLS negativos por tenant e por
    papel.
31. **Fixtures e cleanup fail-closed:** obrigatório
    (`try/finally` global).
32. **Hard gates:** rollback obrigatório em falha; audit trail
    obrigatório; `ganho` é o único status que soma VGV.
33. **Definition of Done:** autoridade única; audit trail;
    concorrência tratada; testes verdes; superfície concorrente
    removida ou explicitamente arquivada com redirect.
34. **Complexidade relativa:** alta.
35. **Adequação a um único prompt macro:** sim, se cutover
    couber em uma execução com fail-closed; caso contrário,
    replanejar.
36. **Condições objetivas de replanejamento:** impossibilidade
    de manter `optimistic + rollback` fail-closed sob
    concorrência real.
37. **Estado esperado do roadmap após aprovação:** PR-PH.3 —
    Accepted; PR-PH.4 — Ready for Impact Analysis.

### 19.4 PR-PH.4 — Role-Aware Dashboard & Decision Intelligence Finalization

1. **Nome oficial:** Role-Aware Dashboard & Decision
   Intelligence Finalization.
2. **Objetivo:** formalizar cada KPI (pergunta, fórmula,
   fonte, timezone, filtros, papéis, comparação, drill-down,
   empty state, teste); tornar metas configuráveis;
   consolidar constantes de alerta com PR-PH.3.
3. **Baseline:** §7 desta análise.
4. **Dependências:** PR-PH.3 Accepted.
5. **Autoridades atuais:** `dashboardStats`,
   `dashboardLeadsFiltrados`.
6. **Lacunas:** timezone; papéis diferenciados; metas
   configuráveis; testes; `qualificado` sem etapa própria;
   previsão linear ingênua.
7. **Escopo autorizado:** ajustes de fórmulas, adição de
   filtros, testes, opcional tabela de metas.
8. **Fora de escopo:** cutover CRM (feito em PR-PH.3);
   branding; CMS.
9. **Arquivos e módulos previstos:** `src/lib/api/dashboard.functions.ts`,
   `src/routes/_authenticated.admin.index.tsx`.
10. **Rotas previstas:** nenhuma nova.
11. **Tabelas afetadas:** possível `dashboard_goals` (por
    tenant/role) — decisão em PR-PH.4.
12. **Migrations possíveis:** `dashboard_goals` (se aprovado).
13. **Impacto em RLS:** política tenant-scoped.
14. **Impacto em grants:** grants do novo objeto.
15. **Server boundaries:** manutenção do `createServerFn`
    autenticado.
16. **Contratos de dados:** DTO por indicador.
17. **Autoridade de autorização:** matriz de PR-PH.2.
18. **Membership authorization:** aplicada.
19. **Entitlement comercial:** Não aplicável.
20. **Impersonação:** dashboard sob impersonação usa contexto
    do tenant impersonado.
21. **UX:** empty states, drill-down, tooltips explicativas.
22. **Responsividade:** obrigatória.
23. **Acessibilidade:** tabelas com cabeçalhos ARIA.
24. **Analytics:** Não aplicável.
25. **Observabilidade:** logs de performance dos handlers.
26. **Testes unitários:** fórmulas determinísticas por KPI.
27. **Testes de integração:** roles diferentes; drill-down.
28. **Testes E2E:** filtros de período; drill-down.
29. **Testes visuais:** snapshots com dados determinísticos.
30. **Testes de segurança:** RLS negativos por papel.
31. **Fixtures e cleanup fail-closed:** obrigatório.
32. **Hard gates:** nenhum KPI sem fórmula, fonte e teste;
    timezone declarada.
33. **Definition of Done:** contratos formalizados; testes
    verdes.
34. **Complexidade relativa:** média-alta.
35. **Adequação a um único prompt macro:** sim.
36. **Condições objetivas de replanejamento:** necessidade de
    reescrever o CRM (deve estar concluído em PR-PH.3).
37. **Estado esperado do roadmap após aprovação:** PR-PH.4 —
    Accepted; PR-PH.5 — Ready for Impact Analysis.

### 19.5 PR-PH.5 — Workspace and Public-Site White-Label Consolidation

1. **Nome oficial:** Workspace and Public-Site White-Label
   Consolidation.
2. **Objetivo:** consolidar branding do workspace interno e do
   site público sob autoridade coerente; formalizar limites
   de contraste e fallback determinístico.
3. **Baseline:** §9 desta análise.
4. **Dependências:** PR-PH.4 Accepted (gate serial), portando PR-PH.1 … PR-PH.4 Accepted; adicionalmente autoridades de roles (PR-PH.2) e de site público (autoridade `site_settings` já existente).
5. **Autoridades atuais:** `site_settings`,
   `site_settings_versions`, `useSiteAdapter`,
   `buildBrandingCss`.
6. **Lacunas:** branding do workspace interno; catálogo de
   campos configuráveis vs protegidos; hard gate de contraste.
7. **Escopo autorizado:** evolução da autoridade existente
   `site_settings`, ou criação de `workspace_branding` como
   autoridade separada (decisão vinculante).
8. **Fora de escopo:** onboarding; custom domain.
9. **Arquivos e módulos previstos:** `src/lib/api/site.functions.ts`,
   `src/lib/api/site-versions.functions.ts`,
   `src/components/workspace/*`, `src/routes/__root.tsx`.
10. **Rotas previstas:** possível `/admin/branding` ou
    `/admin/site/branding` — decisão em PR-PH.5.
11. **Tabelas afetadas:** `site_settings`, possivelmente
    `workspace_branding`.
12. **Migrations possíveis:** adicionar tabela `workspace_branding`
    apenas se aprovado.
13. **Impacto em RLS:** política tenant-scoped.
14. **Impacto em grants:** grants do novo objeto.
15. **Server boundaries:** todas as leituras/escritas via
    server function.
16. **Contratos de dados:** DTO de branding com validação de
    contraste.
17. **Autoridade de autorização:** admin/owner.
18. **Membership authorization:** aplicada.
19. **Entitlement comercial:** Não aplicável.
20. **Impersonação:** super sob impersonação escreve como o
    tenant impersonado (auditado).
21. **UX:** preview, draft, publish, restore.
22. **Responsividade:** obrigatória.
23. **Acessibilidade:** hard gate WCAG AA de contraste.
24. **Analytics:** Não aplicável.
25. **Observabilidade:** audit trail.
26. **Testes unitários:** validação de contraste; fallback.
27. **Testes de integração:** publish → renderer.
28. **Testes E2E:** preview → publish → site público.
29. **Testes visuais:** logo, cores, dark/light.
30. **Testes de segurança:** sanitização de assets.
31. **Fixtures e cleanup fail-closed:** obrigatório.
32. **Hard gates:** contraste inválido → fallback determinístico;
    branding do tenant nunca substitui identificação da
    plataforma quando contratualmente exigido.
33. **Definition of Done:** branding do workspace e do site
    público consolidados; testes verdes.
34. **Complexidade relativa:** média-alta.
35. **Adequação a um único prompt macro:** sim.
36. **Condições objetivas de replanejamento:** necessidade de
    reescrever `site_settings` (deve permanecer autoridade).
37. **Estado esperado do roadmap após aprovação:** PR-PH.5 —
    Accepted; PR-PH.6 — Ready for Impact Analysis.

### 19.6 PR-PH.6 — Public Website Navigation, CMS Authority & Content Architecture

1. **Nome oficial:** Public Website Navigation, CMS Authority
   & Content Architecture.
2. **Objetivo:** consolidar autoridade das entidades do CMS
   (`site`, `pagina`, `post`, `form`, `campanha`, `midia`,
   `auditoria`), formalizar menus públicos, SEO, sitemap,
   versionamento, agendamento e LGPD. **Ownership de redirects
   e aliases administrativos permanece exclusivamente com
   PR-PH.1** — PR-PH.6 **consome** a política aprovada em
   PR-PH.1 e não cria, remove nem mantém redirects
   administrativos por conta própria.
3. **Baseline:** §§8, 10 desta análise.
4. **Dependências:** PR-PH.5 Accepted (gate serial), portando PR-PH.1 … PR-PH.5 Accepted. Política de aliases administrativos herdada de PR-PH.1.
5. **Autoridades atuais:** `EntityWorkspace` com descriptors
   já registrados; renderers públicos.
6. **Lacunas:** consolidação formal de agendamento, SEO e
   LGPD; contratos por bloco.
7. **Escopo autorizado:** ajustes documentais + eventuais
   migrations não-destrutivas de versionamento; **consumo** da
   política de aliases herdada de PR-PH.1.
8. **Fora de escopo:** landing pages (PR-PH.7); domínio
   (PR-PH.8); criação/remoção autônoma de redirects
   administrativos (autoridade exclusiva de PR-PH.1).
9. **Arquivos e módulos previstos:** `src/lib/api/pages.functions.ts`,
   `src/lib/api/site.functions.ts`, `src/lib/api/site-versions.functions.ts`,
   `src/components/content/*`, `src/components/site/*`.
10. **Rotas previstas:** manutenção. **Estratégia única de
    aliases administrativos** (herdada de PR-PH.1): manter
    temporariamente `cms-transferencia` e `cms-auditoria` como
    aliases sob *deprecation contract*, com critério objetivo
    de remoção (ausência comprovada de consumidores externos
    ao workspace ou expiração da janela de deprecação definida
    em PR-PH.1). Estratégias contraditórias (“remover” + “manter
    como alias”) são proibidas.
11. **Tabelas afetadas:** `pages`, `posts`, `forms`,
    `campaigns`, `media`, `site_settings*`.
12. **Migrations possíveis:** apenas se necessárias para
    agendamento/SEO.
13. **Impacto em RLS:** manter tenant-scoped.
14. **Impacto em grants:** manter.
15. **Server boundaries:** todas as leituras/escritas via
    server function.
16. **Contratos de dados:** DTO por entidade.
17. **Autoridade de autorização:** admin/owner/cms editor.
18. **Membership authorization:** aplicada.
19. **Entitlement comercial:** Não aplicável.
20. **Impersonação:** auditada.
21. **UX:** preview, publish, versions, restore.
22. **Responsividade:** editor e renderer.
23. **Acessibilidade:** blocos com contratos ARIA.
24. **Analytics:** pixels e eventos.
25. **Observabilidade:** audit trail.
26. **Testes unitários:** sanitização, validação por bloco.
27. **Testes de integração:** publish → renderer público.
28. **Testes E2E:** navegação pública.
29. **Testes visuais:** blocos e páginas.
30. **Testes de segurança:** sanitização XSS.
31. **Fixtures e cleanup fail-closed:** obrigatório.
32. **Hard gates:** nenhum bloco sem sanitização e a11y.
33. **Definition of Done:** contratos formais por bloco.
34. **Complexidade relativa:** alta.
35. **Adequação a um único prompt macro:** sim.
36. **Condições objetivas de replanejamento:** necessidade de
    reescrever renderers.
37. **Estado esperado do roadmap após aprovação:** PR-PH.6 —
    Accepted; PR-PH.7 — Ready for Impact Analysis.

### 19.7 PR-PH.7 — Landing Page & Dynamic Page Builder Finalization

1. **Nome oficial:** Landing Page & Dynamic Page Builder
   Finalization.
2. **Objetivo:** introduzir categoria formal de landing pages
   (templates, blocos, formulários, UTM/origem/campanha,
   thank-you, analytics), consolidar page builder dinâmico.
3. **Baseline:** §11 desta análise.
4. **Dependências:** PR-PH.6 Accepted.
5. **Autoridades atuais:** `ENTITIES.pagina`, blocos.
6. **Lacunas:** categoria dedicada; templates; UTM/thank-you.
7. **Escopo autorizado:** novo tipo (ou flag) na entidade
   `pagina`; templates; integração com leads.
8. **Fora de escopo:** domínio (PR-PH.8).
9. **Arquivos e módulos previstos:** `src/components/content/*`,
   `src/lib/api/pages.functions.ts`.
10. **Rotas previstas:** possíveis rotas públicas dedicadas.
11. **Tabelas afetadas:** `pages` (colunas novas) ou nova
    `landing_pages` — decisão em PR-PH.7.
12. **Migrations possíveis:** conforme decisão.
13. **Impacto em RLS:** tenant-scoped.
14. **Impacto em grants:** tenant-scoped.
15. **Server boundaries:** server function.
16. **Contratos de dados:** DTO de template e submission.
17. **Autoridade de autorização:** admin/owner/cms editor.
18. **Membership authorization:** aplicada.
19. **Entitlement comercial:** possível gate por plano.
20. **Impersonação:** auditada.
21. **UX:** editor visual, preview.
22. **Responsividade:** obrigatória.
23. **Acessibilidade:** formulários com labels/aria.
24. **Analytics:** UTM + eventos.
25. **Observabilidade:** logs.
26. **Testes unitários:** por bloco.
27. **Testes de integração:** captura → lead.
28. **Testes E2E:** preencher → confirmar.
29. **Testes visuais:** templates.
30. **Testes de segurança:** sanitização + LGPD/consent.
31. **Fixtures e cleanup fail-closed:** obrigatório.
32. **Hard gates:** consent obrigatório; sem UTM stripping.
33. **Definition of Done:** categoria viva com testes.
34. **Complexidade relativa:** alta.
35. **Adequação a um único prompt macro:** sim.
36. **Condições objetivas de replanejamento:** necessidade de
    novo domínio comercial.
37. **Estado esperado do roadmap após aprovação:** PR-PH.7 —
    Accepted; PR-PH.8 — Ready for Impact Analysis.

### 19.8 PR-PH.8 — Tenant Domain Management & Host Resolution

1. **Nome oficial:** Tenant Domain Management & Host Resolution.
2. **Objetivo:** implementar UI e state machine de custom
   domain com verificação, SSL, anti-takeover, auditoria e
   rollback.
3. **Baseline:** §12 desta análise.
4. **Dependências:** PR-PH.7 Accepted (gate serial), portando PR-PH.1 … PR-PH.7 Accepted; branding (PR-PH.5) consolidado.
5. **Autoridades atuais:** `portal-engine.server.ts`.
6. **Lacunas:** UI, state machine, verificação DNS/TXT, SSL,
   anti-takeover.
7. **Escopo autorizado:** nova tabela `tenant_domains`, server
   functions, `admin.dominios.tsx`.
8. **Fora de escopo:** onboarding (usa este contrato).
9. **Arquivos e módulos previstos:** `src/lib/api/domains.functions.ts`
   (novo), `src/routes/_authenticated.admin.dominios.tsx`
   (novo), `src/lib/portal-engine.server.ts`.
10. **Rotas previstas:** `/admin/dominios`.
11. **Tabelas afetadas:** `tenant_domains` (nova).
12. **Migrations possíveis:** criação de `tenant_domains` + RLS
    + grants.
13. **Impacto em RLS:** tenant-scoped estrito; anti-takeover
    via unique constraint + verificação server-side.
14. **Impacto em grants:** grants padrões.
15. **Server boundaries:** todas as escritas via server
    function.
16. **Contratos de dados:** DTO da state machine.
17. **Autoridade de autorização:** owner.
18. **Membership authorization:** obrigatória.
19. **Entitlement comercial:** possível gate.
20. **Impersonação:** auditada.
21. **UX:** wizard passo a passo; instruções DNS.
22. **Responsividade:** obrigatória.
23. **Acessibilidade:** cópia de instruções acessível.
24. **Analytics:** eventos.
25. **Observabilidade:** logs de verificação.
26. **Testes unitários:** state machine.
27. **Testes de integração:** verificação DNS mockada.
28. **Testes E2E:** wizard completo.
29. **Testes visuais:** wizard.
30. **Testes de segurança:** anti-takeover; unicidade global.
31. **Fixtures e cleanup fail-closed:** obrigatório.
32. **Hard gates:** takeover impossível; canonical/redirect
    consistentes.
33. **Definition of Done:** wizard vivo; state machine testada.
34. **Complexidade relativa:** alta.
35. **Adequação a um único prompt macro:** sim, se SSL for
    delegado à plataforma; caso contrário, replanejar.
36. **Condições objetivas de replanejamento:** necessidade de
    provisionar SSL por conta própria.
37. **Estado esperado do roadmap após aprovação:** PR-PH.8 —
    Accepted; PR-PH.9 — Ready for Impact Analysis.

### 19.9 PR-PH.9 — Tenant Onboarding & Configuration Center

1. **Nome oficial:** Tenant Onboarding & Configuration Center.
2. **Objetivo:** wizard de onboarding + Configuration Center
   unificado, sem mistura com impersonação.
3. **Baseline:** §13 desta análise.
4. **Dependências:** PR-PH.8 Accepted (gate serial), portando PR-PH.1 … PR-PH.8 Accepted; branding (PR-PH.5) e domínio (PR-PH.8) consolidados.
5. **Autoridades atuais:** superfícies dispersas.
6. **Lacunas:** unificação; wizard.
7. **Escopo autorizado:** UI + server functions read/write
   agregadas.
8. **Fora de escopo:** novos domínios comerciais.
9. **Arquivos e módulos previstos:** `src/routes/_authenticated.admin.configuracao.*`
   (novo), `src/routes/_authenticated.admin.onboarding.tsx` (novo),
   agregadores.
10. **Rotas previstas:** `/admin/onboarding`, `/admin/configuracao`.
11. **Tabelas afetadas:** possível `onboarding_progress` (nova).
12. **Migrations possíveis:** conforme decisão.
13. **Impacto em RLS:** tenant-scoped.
14. **Impacto em grants:** tenant-scoped.
15. **Server boundaries:** server function.
16. **Contratos de dados:** DTO de progresso.
17. **Autoridade de autorização:** owner/admin.
18. **Membership authorization:** aplicada.
19. **Entitlement comercial:** aplicado quando relevante.
20. **Impersonação:** wizard nunca inicia sob impersonação.
21. **UX:** progresso, retomada, ajuda contextual.
22. **Responsividade:** obrigatória.
23. **Acessibilidade:** wizard acessível por teclado.
24. **Analytics:** eventos.
25. **Observabilidade:** logs por passo.
26. **Testes unitários:** state machine.
27. **Testes de integração:** retomada; skip; conclusão.
28. **Testes E2E:** wizard completo.
29. **Testes visuais:** wizard.
30. **Testes de segurança:** RLS por passo.
31. **Fixtures e cleanup fail-closed:** obrigatório.
32. **Hard gates:** nenhum passo pode expor tenant errado.
33. **Definition of Done:** wizard + Configuration Center
    vivos.
34. **Complexidade relativa:** alta.
35. **Adequação a um único prompt macro:** sim.
36. **Condições objetivas de replanejamento:** necessidade de
    novo domínio comercial.
37. **Estado esperado do roadmap após aprovação:** PR-PH.9 —
    Accepted; PR-PH.10 — Ready for Impact Analysis.

### 19.10 PR-PH.10 — Product UX/UI Final Consistency, Accessibility & Responsive Review

1. **Nome oficial:** Product UX/UI Final Consistency,
   Accessibility & Responsive Review.
2. **Objetivo:** formalizar tokens semânticos, tipografia,
   densidade, dark/light, contraste, a11y por teclado; revisar
   todas as superfícies estabilizadas; endurecer branding
   tenant-scoped (contraste WCAG).
3. **Baseline:** §16 + inventário das etapas anteriores.
4. **Dependências:** PR-PH.1 … PR-PH.9 Accepted (gate serial).
5. **Autoridades atuais:** `src/styles.css`, tokens,
   `buildBrandingCss` (`site.functions.ts`).
6. **Lacunas:** consolidação, resolução formal de tokens/
   contraste, sanitização de valores usados em CSS,
   persistência de tema, testes visuais e de a11y.
7. **Escopo autorizado:** tokens, componentes visuais,
   utilitário de branding, testes.
8. **Fora de escopo:** lógica de negócio; schema; RLS.
9. **Arquivos e módulos previstos:** `src/styles.css`,
   componentes visuais, `buildBrandingCss`.
10. **Rotas previstas:** Não aplicável.
11. **Tabelas afetadas:** Não aplicável (leitura de
    `site_settings` já existente).
12. **Migrations possíveis:** Requires Impact Analysis before
    materialization se surgir necessidade de persistência
    adicional (ex.: preferência de tema por usuário).
13. **Impacto em RLS:** Não aplicável.
14. **Impacto em grants:** Não aplicável.
15. **Server boundaries:** Não aplicável.
16. **Contratos de dados:** tokens semânticos versionados.
17. **Autoridade de autorização:** Não aplicável.
18. **Membership authorization:** Não aplicável.
19. **Entitlement comercial:** Não aplicável.
20. **Impersonação:** Não aplicável.
21. **UX:** consolidação.
22. **Responsividade:** obrigatória em todas as superfícies e
    breakpoints.
23. **Acessibilidade:** WCAG AA.
24. **Analytics:** Não aplicável.
25. **Observabilidade:** Não aplicável.
26. **Testes unitários (aplicáveis):** resolução de tokens
    semânticos; cálculo de contraste (WCAG AA); fallback de
    cor; sanitização de valores usados em CSS
    (`buildBrandingCss`); testes negativos para valores
    inválidos (hex malformado, contraste < AA, cor com
    caracteres proibidos em CSS).
27. **Testes de integração (aplicáveis):** persistência e
    hidratação de tema (dark/light) durante navegação;
    branding tenant-scoped renderiza somente valores do
    tenant correto (via `x-tenant-id` server-side).
28. **Testes E2E:** navegação por teclado; foco visível;
    ordem de tabulação; skip links.
29. **Testes visuais:** snapshots dark/light para cada
    superfície canônica; snapshots por breakpoint (mobile,
    tablet, desktop wide).
30. **Testes de segurança (aplicáveis):** sanitização de
    valores usados em CSS impede injeção; branding de tenant
    A nunca aparece em tenant B; testes de acessibilidade
    automatizados (axe/pa11y ou equivalente) sobre superfícies
    admin.
31. **Fixtures e cleanup fail-closed:** obrigatório para
    testes de integração que criam settings temporários.
32. **Hard gates:** contraste AA; foco visível; responsividade
    em todos os breakpoints; sanitização; ausência de
    hardcoded colors em código de componente.
33. **Definition of Done:** todas as superfícies auditadas;
    suítes acima verdes; snapshots aceitos.
34. **Complexidade relativa:** média.
35. **Adequação a um único prompt macro:** sim.
36. **Condições objetivas de replanejamento:** regressão em
    tokens ou contraste durante execução.
37. **Estado esperado do roadmap após aprovação:** PR-PH.10 —
    Accepted; PR-PH.11 — Ready for Impact Analysis.

### 19.11 PR-PH.11 — Environment, Observability & Operational Readiness

1. **Nome oficial:** Environment, Observability & Operational
   Readiness.
2. **Objetivo:** materializar health checks, alertas,
   dashboard operacional, retenção, exportação, exclusão
   (LGPD), runbooks, backup verification e restore
   verification.
3. **Baseline:** §15 (matriz por classe de evidência).
4. **Dependências:** PR-PH.10 Accepted (gate serial).
5. **Autoridades atuais:** `observability.server.ts`,
   `log_system_event`, `super_observabilidade`,
   `rate-limit.server.ts`, `email/notify.server.ts`,
   `portal_sync_dlq`, `email_queue_*`.
6. **Lacunas:** health checks; canal formal de alertas;
   retenção documentada; exportação/exclusão LGPD; runbooks;
   restore drill.
7. **Escopo autorizado:** rotas de health check;
   observabilidade; documentação operacional; migrations
   estritamente necessárias para retenção/LGPD (sujeitas a
   Impact Analysis próprio); runbooks.
8. **Fora de escopo:** alterações funcionais em CRM, CMS,
   comercial ou branding.
9. **Arquivos e módulos previstos:** `docs/architecture/*`,
   `src/lib/observability.server.ts`, rotas em
   `src/routes/api/public/health/*` (se ausentes),
   `src/lib/rate-limit.server.ts`, LGPD server functions.
10. **Rotas previstas:** health checks explícitos; endpoints
    de export/erase (com authz apropriada).
11. **Tabelas afetadas:** Requires Impact Analysis before
    materialization — potencial `data_export_requests`,
    `data_erasure_requests`, `retention_policies` (não
    decididas na PR-PH.0).
12. **Migrations possíveis:** Requires Impact Analysis before
    materialization — LGPD e retenção podem exigir schema
    próprio.
13. **Impacto em RLS:** Requires Impact Analysis before
    materialization se novas tabelas surgirem.
14. **Impacto em grants:** Requires Impact Analysis before
    materialization se novas tabelas surgirem.
15. **Server boundaries:** logs autoritativos server-side;
    proibido logar PII em client.
16. **Contratos de dados:** DTO de log; DTO de health check;
    DTO de export/erase.
17. **Autoridade de autorização:** operações administrativas
    exigem membership `active` + `has_role('admin')` +
    tenant-scope; operações globais exigem `is_super_admin`.
18. **Membership authorization:** aplicada em superfícies
    admin operacionais.
19. **Entitlement comercial:** Não aplicável.
20. **Impersonação:** logs identificam Super Admin sob
    impersonação (`origin=impersonation`).
21. **UX:** dashboards operacionais internos.
22. **Responsividade:** obrigatória para dashboards.
23. **Acessibilidade:** WCAG AA aplicável a dashboards.
24. **Analytics:** Não aplicável.
25. **Observabilidade:** central desta etapa.
26. **Testes unitários:** parsers de logs; parsers de DLQ;
    lógica de retenção; sanitização de payloads de export.
27. **Testes de integração:** rate limit; e-mail (com
    provider mock); health checks retornam 200/503 corretos;
    fluxo de export/erase completa ciclo.
28. **Testes E2E:** smoke prod-like; alerta é disparado em
    falha simulada; dashboards renderizam.
29. **Testes visuais:** dashboards operacionais.
30. **Testes de segurança:** rate limit real; LGPD respeitada;
    tenant isolation em logs; export/erase autorizado apenas
    para owner/admin do próprio tenant.
31. **Testes operacionais:** **restore drill obrigatório** —
    backup recente é restaurado em ambiente isolado e
    validado; **backup verification** obrigatório — evidência
    externa datada.
32. **Rollback e falha operacional:** cada capacidade deve
    declarar rollback documentado e teste negativo.
33. **Fixtures e cleanup fail-closed:** obrigatório.
34. **Hard gates:** LGPD respeitada; retenção documentada;
    restore drill executado; alertas ativos e testados;
    health checks vivos.
35. **Definition of Done:** runbooks publicados; alertas
    ativos; retenção documentada e implementada; export/erase
    operacional; restore verificado; observabilidade com
    dashboard consumidor.
36. **Complexidade relativa:** alta.
37. **Estado esperado do roadmap após aprovação:** PR-PH.11 —
    Accepted; PR-PH.12 — Ready for Impact Analysis.

### 19.12 PR-PH.12 — Pre-Homologation Product Closing Review

1. **Nome oficial:** Pre-Homologation Product Closing Review.
2. **Objetivo:** consolidar todas as etapas anteriores e
   emitir declaração final de Product Readiness. **Não
   implementa produto**, mas **obrigatoriamente reexecuta ou
   consolida** as suítes críticas listadas em (26)–(36) desta
   cláusula.
3. **Baseline:** contratos individuais PR-PH.1 … PR-PH.11 +
   ledger acumulado de evidências (cada etapa PR-PH deverá
   registrar em seu relatório: comando exato executado,
   versão da ferramenta, variáveis exigidas, resultado,
   contagem, artefato, commit, data, escopo coberto, skips e
   limitações). A PR-PH.12 consome esse ledger.
4. **Dependências:** PR-PH.11 Accepted (gate serial) e todas
   as etapas anteriores PR-PH.1 … PR-PH.10 Accepted.
5. **Autoridades atuais:** todas as consolidadas.
6. **Lacunas:** nenhuma pendente esperada.
7. **Escopo autorizado:** documentação de encerramento;
   reexecução/consolidação de evidências de teste.
8. **Fora de escopo:** qualquer alteração de runtime, schema,
   RLS, grants, componentes ou rotas.
9. **Arquivos e módulos previstos:** `docs/architecture/*`,
   `docs/delivery/*`.
10. **Rotas previstas:** Não aplicável.
11. **Tabelas afetadas:** Não aplicável.
12. **Migrations possíveis:** Não aplicável (PR-PH.12 não
    cria migrations). **A validação segue ledger dinâmico:**
    a PR-PH.12 valida o conjunto de migrations *esperadas*
    (baseline PR-PH.0 mais as legitimamente criadas por
    PR-PH.1 … PR-PH.11 conforme cada contrato) contra o
    estado remoto — ordem, ausência de migration espúria,
    ausência de migration esperada não aplicada, drift de
    schema, rollback ou forward-fix documentado. **Proibido
    exigir total fixo igual ao número registrado na PR-PH.0.**
13. **Impacto em RLS:** Não aplicável — mas **validar**
    ausência de regressão em políticas existentes.
14. **Impacto em grants:** Não aplicável — mas **validar**
    grants por tabela pública.
15. **Server boundaries:** Não aplicável.
16. **Contratos de dados:** Não aplicável.
17. **Autoridade de autorização:** Não aplicável.
18. **Membership authorization:** Não aplicável.
19. **Entitlement comercial:** Não aplicável.
20. **Impersonação:** Não aplicável.
21. **UX:** Não aplicável.
22. **Responsividade:** validada em PR-PH.10.
23. **Acessibilidade:** validada em PR-PH.10.
24. **Analytics:** Não aplicável.
25. **Observabilidade:** validada em PR-PH.11.
26. **Typecheck / build / lint:** obrigatórios.
    Comandos versionados no repositório:
    `bunx tsc --noEmit -p tsconfig.json`;
    `bun run build`; `bun run lint`. Falha: qualquer erro.
27. **Specs determinísticas / integração:** **obrigatório
    reexecutar/consolidar** os runners TypeScript canônicos
    com os comandos declarados nos próprios arquivos:
    `bunx tsx --tsconfig tsconfig.json ./run-tenant-specs.ts`;
    `bunx tsx --tsconfig tsconfig.json ./run-membership-mutation-parity-specs.ts`;
    `bunx tsx --tsconfig tsconfig.json ./run-commercial-seat-atomic-enforcement-specs.ts`;
    `bunx tsx --tsconfig tsconfig.json ./run-commercial-sql-parity-specs.ts`.
    Variáveis obrigatórias para os três runners de paridade
    contra PostgreSQL real: `SUPABASE_URL`,
    `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PUBLISHABLE_KEY`.
    Evidência: exit 0 e contagem por cenário. Falha:
    qualquer exit ≠ 0 ou cenário ausente. Indisponível:
    bloqueador. **Novos runners criados em PR-PH.1 … PR-PH.11
    são incorporados pelo ledger; runners removidos são
    substituídos por seus sucessores documentados.**
28. **E2E / smoke:** **obrigatório reexecutar/consolidar** os
    smokes existentes em `tests/*/test_*.py` via
    `bash tests/_helpers/run_all.sh`. Requer Python 3,
    Playwright configurado, `BASE_URL`; testes que exigem
    `PGHOST` (por ex. `tests/security/test_tenant_isolation.py`)
    só podem ser considerados aprovados quando `PGHOST` está
    disponível — **skip por ausência de `PGHOST` não conta
    como sucesso de isolamento SQL**. Artefatos em
    `$QA_ARTIFACTS`. Falha: qualquer smoke vermelho ou skip
    não justificado. Indisponível: bloqueador com registro
    formal.
29. **Testes visuais:** consolidar snapshots materializados
    em PR-PH.10 conforme comando versionado por PR-PH.10.
    Falha: divergência sem justificativa aprovada.
30. **Testes de segurança e isolamento tenant:**
    `tests/security/test_tenant_isolation.py` executado com
    `PGHOST` disponível. Revisão de RLS e grants:
    inspecionar policies e grants no ambiente-alvo via
    consultas SQL exatas contra `pg_policies`,
    `information_schema.table_privileges` e `pg_proc`
    (comando específico versionado por PR-PH.2/PR-PH.11
    conforme aplicável); variáveis: `PGHOST`, `PGUSER`,
    `PGPASSWORD`, `PGDATABASE`. Resultado esperado: policies
    e grants declarados batem com o baseline auditado.
    Falha: qualquer regressão. Indisponível: bloqueador.
31. **Migrations (ledger dinâmico):** validar ordem,
    checksums e estado remoto do ledger acumulado (item 12).
32. **Observabilidade e backup/restore:** consumir as
    evidências datadas produzidas em PR-PH.11 (restore drill
    executado, alertas testados, health checks vivos).
33. **Documentação e roadmap:** reconciliados; riscos
    aceitos registrados; rollback documentado.
34. **Fixtures e cleanup fail-closed:** obrigatório validar
    que todos os runners emitem cleanup via `try/finally`
    global (herdado do harness canônico de F4-CF-01).
35. **Hard gates:** PR-PH.12 **não poderá** declarar Product
    Readiness se alguma evidência obrigatória (26–34)
    estiver ausente, inconclusiva, desatualizada, com skip
    não justificado, ou aceita silenciosamente. Cada suíte
    obrigatória deve possuir comando versionado; qualquer
    placeholder (`ou equivalente aprovado`, `comando a
    definir`, `linter equivalente`) é falha automática.
    Ferramentas ainda não fixadas no `package.json` (por
    exemplo, Vitest) **não** podem ser referenciadas como
    comando canônico até que estejam versionadas com script
    e configuração no repositório.
36. **Definition of Done:** todas as evidências (26–34)
    coletadas, verdes e datadas; ledger de migrations
    fechado; declaração final Ready for External Audit no
    fechamento da Product Readiness.
37. **Estado esperado do roadmap após aprovação:** PR-PH.12 —
    Accepted; TH-001 — Ready for Impact Analysis; homologação
    permanece Blocked até TH-006.

### 19.13 Inventário canônico de comandos de teste (baseline PR-PH.0)

Confrontado com `package.json`, `run-*.ts`,
`tests/_helpers/run_all.sh` e `tests/**/test_*.py`. Vitest
**não** está fixado no `package.json`; nenhum script
`test` existe. Não é permitido inventar comandos.

| Suíte | Runner | Comando exato atual | Dependências / variáveis | Estado |
|---|---|---|---|---|
| Typecheck | `tsconfig.json` | `bunx tsc --noEmit -p tsconfig.json` | bun, TypeScript (fixado) | Versionado |
| Build | Vite | `bun run build` | script em `package.json` | Versionado |
| Lint | ESLint | `bun run lint` | script em `package.json` | Versionado |
| Specs determinísticas tenant/comerciais | `run-tenant-specs.ts` | `bunx tsx --tsconfig tsconfig.json ./run-tenant-specs.ts` | bun, tsx; nenhum ambiente externo | Versionado |
| Paridade mutation membership | `run-membership-mutation-parity-specs.ts` | `bunx tsx --tsconfig tsconfig.json ./run-membership-mutation-parity-specs.ts` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PUBLISHABLE_KEY`; PostgreSQL real | Versionado — exige ambiente |
| Paridade atomic enforcement seat | `run-commercial-seat-atomic-enforcement-specs.ts` | `bunx tsx --tsconfig tsconfig.json ./run-commercial-seat-atomic-enforcement-specs.ts` | idem | Versionado — exige ambiente |
| Paridade SQL comercial | `run-commercial-sql-parity-specs.ts` | `bunx tsx --tsconfig tsconfig.json ./run-commercial-sql-parity-specs.ts` | idem | Versionado — exige ambiente |
| Smoke E2E consolidado | `tests/_helpers/run_all.sh` | `bash tests/_helpers/run_all.sh` | Python 3, Playwright, `BASE_URL`, opcional `PGHOST` para segurança | Versionado |
| Isolamento tenant SQL | `tests/security/test_tenant_isolation.py` | via `run_all.sh` ou `python3 tests/security/test_tenant_isolation.py` | `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `psql` | Versionado — skip sem `PGHOST` **não** conta como sucesso |
| RLS/grants — inspeção SQL | consulta a `pg_policies`, `information_schema.table_privileges`, `pg_proc` | comando versionado por PR-PH.2/PR-PH.11 conforme necessário | `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` | A ser fixado por PR-PH.2/PR-PH.11 (não presumir na PR-PH.0) |
| Vitest / testes unitários genéricos | — | — | não fixado no `package.json`; **não** é comando canônico até que seja versionado | Missing (a decidir pela etapa que o introduzir) |


---

## 20. Matriz de dependências

| Etapa | Depende de | Banco | Runtime | Frontend | Segurança | UX | Testes |
|---|---|---|---|---|---|---|---|
| PR-PH.1 | PR-PH.0 | não | menu/nav | shell + nav | 403/authz | alta | integ. rotas |
| PR-PH.2 | PR-PH.1 | leituras | rbac + auth-middleware | não | RLS + authz | — | negativos |
| PR-PH.3 | PR-PH.2 | audit trail | leads-crm + admin | Kanban | RLS + audit + concorrência | alta | otimista+rollback |
| PR-PH.4 | PR-PH.3 | possível dashboard_goals | dashboard.functions | dashboard | RLS reads | alta | determinístico |
| PR-PH.5 | PR-PH.4 (serial) | site_settings + possível workspace_branding (sujeito a IA em PR-PH.5) | site + site-versions | shell + site | contraste + authz | alta | visual |
| PR-PH.6 | PR-PH.5 (serial) | apenas se necessário | pages + site + site-versions | admin CMS + site público | RLS + sanit. | alta | SEO/preview |
| PR-PH.7 | PR-PH.6 (serial) | landing_pages? | pages | builder | RLS + sanit. | alta | UTM/lead |
| PR-PH.8 | PR-PH.7 (serial) | tenant_domains | portal-engine | admin.dominios | anti-takeover | média | state machine |
| PR-PH.9 | PR-PH.8 (serial); depende de PR-PH.5 e PR-PH.8 consolidados | onboarding_progress? | agregadores | wizard + config | authz | alta | wizard E2E |
| PR-PH.10 | PR-PH.1..9 | não | não | tokens/tema | contraste | alta | visual/a11y |
| PR-PH.11 | PR-PH.10 | não | observability | dashboards ops | segredos/LGPD | baixa | smoke |
| PR-PH.12 | PR-PH.1..11 | não | não | não | consolidação | — | consolidação |

Proibições explícitas:

- PR-PH.4 (dashboard final) não pode preceder PR-PH.3.
- PR-PH.2 (roles) não pode ser adiada para depois das etapas
  funcionais.
- PR-PH.1 não pode assumir cutover funcional do CRM.
- Execução paralela é proibida quando duas etapas tocam a
  mesma autoridade, rota, tabela, RLS, componente ou domínio
  de branding/CRM/CMS.

## 21. Matriz de estado do produto

| Domínio | Implementado | Parcial | Legado/redirect | Ausente | Evidência |
|---|:-:|:-:|:-:|:-:|---|
| Workspace shell | ✓ | | | | `WorkspaceShell`, `NavigationRail`, `AppHeader`, `contexts.ts` |
| Menu / IA | | ✓ | | | breadcrumbs/403 ausentes; menu do usuário incompleto |
| Rotas CRM | ✓ (pipeline) | | ✓ (`/admin/leads` redirect) | | pipeline autoridade; leads redirect; leads-workspace concurrent |
| Kanban / DnD / otimista+rollback | ✓ | | | | `usePipelineData`, `PipelinePage` |
| CRM audit trail / concorrência | | | | ✓ | não observado |
| Dashboard (fórmulas, papéis, alertas, série, ranking, insights, drill-down) | ✓ | | | | `dashboard.functions.ts` |
| Dashboard (timezone/metas configuráveis/testes) | | ✓ | | | metas hardcoded; sem specs |
| Branding site público | ✓ | | | | `site_settings`, `useSiteAdapter`, `buildBrandingCss`, versions |
| Branding workspace interno | | | | ✓ | logo fixo em `NavigationRail` |
| CMS | ✓ | | | | `EntityWorkspace` + registry (`ready: true`) |
| Landing pages | | | | ✓ | sem categoria dedicada |
| Custom domain | | ✓ | | | resolução por host; UI ausente |
| Onboarding | | | | ✓ | sem wizard |
| Configuration Center | | | | ✓ | superfície unificada ausente |
| Permissões / authz | ✓ | | | | F4.0 + SCP-012 + middlewares |
| Matriz de autoridade por operação | | | | ✓ | não formalizada |
| Analytics | | ✓ | | | `meta-pixel`; sem dashboard analítico |
| Notificações | | ✓ | | | e-mail templates; WhatsApp botão |
| Ambiente / secrets | ✓ | | | | Lovable Cloud gerenciado |
| Observabilidade | | ✓ | | | `observability.server.ts` sem dashboard |
| Homologação | | | | ✓ | não iniciada — blocked |

## 22. Riscos e bloqueios reais

- Dependência operacional preservada da role gerenciada
  `sandbox_exec` (Phase 4 §12; F4-CF-01 §6.2).
- Superfície concorrente `/admin/leads-workspace` × PipelinePage
  pode induzir contagem errada e divergência de UX — resolver
  em PR-PH.3 antes de PR-PH.4.
- Constantes de alerta divergentes entre pipeline e dashboard
  — consolidar em PR-PH.3.
- Custom domain sem state machine gera risco de takeover — não
  liberar homologação sem PR-PH.8 aceito.
- White label do site público existe, mas sem hard gate de
  contraste — endurecer em PR-PH.5.
- Autoridade de configuração espalhada — consolidar em
  PR-PH.9 com base na matriz de PR-PH.2.

## 23. Hard gates da PR-PH.0

Falhar se qualquer uma das condições ocorrer (regras
descritivas — evitam repetição literal de tokens operacionais
proibidos para não colidir com as buscas de reconciliação):

- Documento voltar a delegar descoberta básica a etapas futuras
  usando fórmulas equivalentes a re-inventário / novo
  levantamento / verificação genérica em etapa posterior.
- Descoberta básica continuar delegada às etapas futuras por
  qualquer outra formulação.
- White label público permanecer globalmente Missing.
- `admin.site` e `admin.paginas` declarados dual path sem
  prova.
- `cms-transferencia` tratado como autoridade funcional.
- `admin/leads` tratado como autoridade funcional
  independente.
- DnD/optimistic update/rollback existentes classificados
  como ausentes.
- Dashboard permanecer antes do CRM na sequência.
- Roles permanecer depois das etapas funcionais na sequência.
- PR-PH.1 continuar responsável pelo cutover funcional do CRM.
- Contratos individuais substituídos por contrato genérico.
- Roadmap continuar agregando PR-PH.1 … PR-PH.12 ou TH-001 …
  TH-006 em uma única linha.
- Roadmap declarar que PR-PH.0 não foi iniciada.
- Contrato da PR-PH.6 conter estratégias contraditórias para
  aliases administrativos ou reivindicar ownership sobre
  redirects.
- PR-PH.5 pré-autorizar segunda autoridade de branding sobre
  os mesmos campos.
- PR-PH.12 declarar Product Readiness sem reexecução/
  consolidação das suítes obrigatórias.
- Evidência Git não corresponder ao diff real.
- Buscas normativas apresentadas como “zero ocorrências”
  quando existem ocorrências normativas legítimas.
- Arquivo fora do escopo autorizado alterado.
- Runtime alterado.
- PR-PH.0 marcada Accepted.
- PR-PH.1 iniciada.
- Homologação liberada.

## 24. Validações executadas

- `git diff --check` — clean.
- `bunx tsc --noEmit -p tsconfig.json` — executado após a
  reescrita; nenhuma alteração de TypeScript nesta execução.
- Busca operacional (padrões proibidos fora da seção normativa
  §23): `rg -n "responsabilidade da PR-PH|inventário completo.*PR-PH|auditar/consolidar|precisa validação em PR-PH|campos observados/plausíveis|inventário futuro" docs/architecture/impact-analysis/PR-PH-0-pre-homologation-product-readiness-impact-analysis.md`
  → resultado esperado: zero ocorrências operacionais. As
  formas literais legadas foram substituídas por regras
  descritivas nesta reconciliação (§23 evita tokens exatos
  para não criar falsos positivos).
- Busca sobre roadmap: `rg -n "PR-PH\.0.*não iniciado|Escopo futuro registrado para PR-PH\.0" docs/architecture/ROADMAP_ARCHITECTURAL.md`
  → resultado esperado: zero ocorrências.
- Escopo: apenas os três arquivos documentais autorizados
  foram modificados nesta execução.

## 25. Itens fora de escopo

- Runtime; componentes React; rotas; route tree; server
  functions; adapters; hooks; migrations; schema; tabelas;
  RLS; grants; seeds; fixtures; providers; storage; package.json;
  lockfile; bibliotecas; configuração de ambiente; branding em
  produção; dashboard; CRM; Kanban; CMS; domínios; onboarding;
  testes de produto.
- Nenhuma etapa PR-PH.1 ou posterior foi implementada.

## 26. Decisão final

- Nenhuma implementação de produto foi executada.
- Fase 4 permanece **Closed / Accepted**.
- PR-PH.0 permanece **Ready for External Audit** — não
  Accepted.
- PR-PH.1 permanece **Planned; not started**.
- Homologação permanece **Blocked**.
- Sequência PR-PH.1 … PR-PH.12 + TH-001 … TH-006 vinculante e
  com contrato executável individual por etapa.
