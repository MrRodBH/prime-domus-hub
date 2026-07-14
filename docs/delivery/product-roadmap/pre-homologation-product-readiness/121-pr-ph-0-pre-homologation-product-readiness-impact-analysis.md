# 121 — PR-PH.0 — Pre-Homologation Product Readiness Impact Analysis

**Status:** Ready for External Audit
**Roadmap namespace:** Product Roadmap · Pre-Homologation Product Readiness
**Depends on:** Phase 4 Closing Review — Accepted; Architectural
Roadmap · Fase 4 — SaaS Commercial Platform — Closed / Accepted.
**Blocks:** PR-PH.1 … PR-PH.12; TH-001 … TH-006; homologação.

Cross-reference:
[`docs/architecture/impact-analysis/PR-PH-0-pre-homologation-product-readiness-impact-analysis.md`](../../../architecture/impact-analysis/PR-PH-0-pre-homologation-product-readiness-impact-analysis.md).

Esta execução consolidou, dentro da própria PR-PH.0, a correção
integral apontada pela auditoria crítica externa: inventário
repository-grounded, classificações factuais corrigidas,
contratos executáveis individuais por etapa e sequência PR-PH
vinculante.

## 1. Baseline e commit

- Baseline auditado e commit atual do `HEAD` no preflight:
  `e126e11 Criou PR-PH.0 e fechou Fase 4`.
- `git status --short` vazio na entrada; `git diff --check` clean.
- 93 migrations aplicadas; runtime, RLS, grants, providers,
  package.json e lockfile inalterados por esta execução.

## 2. Escopo autorizado e fora de escopo

Alterados apenas os três arquivos documentais autorizados:

- `docs/architecture/impact-analysis/PR-PH-0-pre-homologation-product-readiness-impact-analysis.md`
  (modified) — reescrita integral: inventário repository-grounded,
  contratos executáveis individuais PR-PH.1 … PR-PH.12,
  sequência corrigida, matriz de dependências.
- `docs/architecture/ROADMAP_ARCHITECTURAL.md` (modified) —
  substituição do bloco agregado por entradas individuais para
  PR-PH.0, PR-PH.1 … PR-PH.12 e TH-001 … TH-006; declaração
  vinculante da sequência e do ownership.
- `docs/delivery/product-roadmap/pre-homologation-product-readiness/121-pr-ph-0-pre-homologation-product-readiness-impact-analysis.md`
  (modified — este arquivo) — reconciliação factual.

Fora de escopo: runtime; componentes React; rotas; server
functions; adapters; hooks; migrations; schema; tabelas; RLS;
grants; seeds; fixtures; providers; storage; package.json;
lockfile; bibliotecas; branding em produção; dashboard; CRM;
Kanban; CMS; domínios; onboarding. Fase 4 permanece **Closed /
Accepted**.

## 3. Correções factuais aplicadas

Aplicadas em `PR-PH-0-*.md`:

1. **Rotas de CRM reclassificadas.** `/admin/pipeline` é a
   autoridade funcional operacional atual; `/admin/leads` é
   **compatibility redirect / legacy route** (migração de
   parâmetros para `/admin/pipeline`), **não** autoridade
   independente; `/admin/leads-workspace` é **superfície
   funcional concorrente** baseada em `EntityWorkspace` com
   `ENTITIES.lead`. Diferenças reais entre PipelinePage e
   EntityWorkspace(lead) inventariadas em §5.1.
2. **CRM e Kanban.** `DndContext`/`PointerSensor`/`DragOverlay`,
   `onMutate` com snapshot, `onError` com rollback e `onSuccess`
   com `invalidateQueries` classificados como **Implemented and
   connected** (evidência em
   `src/components/pipeline/hooks/usePipelineData.ts` e
   `src/components/pipeline/PipelinePage.tsx`). Audit trail
   formal e concorrência permanecem **Missing** — responsáveis
   por PR-PH.3.
3. **CMS.** Removida a classificação “dual path CMS antigo ×
   novo”. `admin.site.tsx` é `EntityWorkspace(ENTITIES.site)`
   (singleton de configurações do site); `admin.paginas` é
   `EntityWorkspace(ENTITIES.pagina)` (páginas dinâmicas);
   `cms-transferencia` e `cms-auditoria` são **redirects
   legados**. Registry declara todas as entidades como
   `ready: true`.
4. **White label.** Reconhecida a autoridade existente do site
   público (`site_settings` + `site_settings_versions` +
   `useSiteAdapter` + `buildBrandingCss` em
   `src/routes/__root.tsx`) — **Implemented but incomplete**.
   Workspace interno permanece **Missing como sistema**.
   Quatro camadas (workspace, site público, plataforma,
   unificação) declaradas separadamente; proibida introdução
   de `tenant_branding` como tabela presumida sem IA e
   justificativa.
5. **Dashboard.** Inventário repository-grounded de cada
   indicador (leads, visitas, propostas, vendas, VGV, funil,
   alertas, série diária, origens, taxas, desempenho, ranking,
   insights, drill-down) contra `dashboard.functions.ts`.
   Registrado explicitamente que o código já implementa
   comparação com período anterior, VGV restrito a `ganho`,
   alertas por tempo, série diária, ranking e insights.
   Lacunas concretas (timezone, papéis diferenciados, metas
   hardcoded, testes ausentes, divergência entre constantes de
   alerta do pipeline e do dashboard) identificadas sem
   correção nesta etapa.
6. **Descoberta básica futura eliminada.** Nenhuma ocorrência
   remanescente dos padrões proibidos (“Requires
   re-inventory”, “Requires inventory”, “Requires audit”,
   “auditar em PR-PH.x”, “verificar em PR-PH.x”) no documento
   corrigido.

## 4. Sequência vinculante corrigida

1. PR-PH.1 — Tenant Workspace Information Architecture,
   Navigation & Canonical Route Map.
2. PR-PH.2 — Roles, Permissions & Configuration Authority
   Baseline.
3. PR-PH.3 — CRM & Kanban Canonicalization and Finalization.
4. PR-PH.4 — Role-Aware Dashboard & Decision Intelligence
   Finalization.
5. PR-PH.5 — Workspace and Public-Site White-Label
   Consolidation.
6. PR-PH.6 — Public Website Navigation, CMS Authority &
   Content Architecture.
7. PR-PH.7 — Landing Page & Dynamic Page Builder Finalization.
8. PR-PH.8 — Tenant Domain Management & Host Resolution.
9. PR-PH.9 — Tenant Onboarding & Configuration Center.
10. PR-PH.10 — Product UX/UI Final Consistency, Accessibility &
    Responsive Review.
11. PR-PH.11 — Environment, Observability & Operational
    Readiness.
12. PR-PH.12 — Pre-Homologation Product Closing Review.

Após Product Readiness: TH-001 → TH-002 → TH-003 → TH-004 →
TH-005 → TH-006.

**Ownership vinculante.** PR-PH.1 nunca executa cutover
funcional do CRM; PR-PH.3 é a única responsável pela
canonicalização funcional entre PipelinePage e
EntityWorkspace(lead).

**Roles precede CRM. CRM precede o dashboard final.**

## 5. Contratos executáveis individuais

`PR-PH-0-*.md §19` contém um contrato completo — 37 itens — para
cada uma das 12 etapas PR-PH.1 … PR-PH.12. Nenhum contrato é
substituído por resumo agregado; categorias inaplicáveis são
marcadas “Não aplicável”. Onde há decisão arquitetural
pendente, o contrato registra: decisão necessária, alternativas
conhecidas, evidência atual, etapa responsável, condição
objetiva de escolha e mudanças proibidas antes da decisão.

## 6. Roadmap individualizado

Em `docs/architecture/ROADMAP_ARCHITECTURAL.md`, o bloco
anterior:

> PR-PH.1 até PR-PH.12 — Planned; not started.
> TH-001 até TH-006 — Planned; not started.

foi substituído por 12 entradas individuais para PR-PH.1 …
PR-PH.12 e 6 entradas individuais para TH-001 … TH-006, cada
uma com nome completo e status `Planned; not started`. PR-PH.0
permanece `Ready for External Audit`. Homologação permanece
`Blocked`.

## 7. Evidência Git

Comandos utilizados: `git status --short`, `git log -1 --oneline`,
`git diff --check`, `git diff --name-status`, `git diff --stat`.

Diff efetivo desta execução (todos com tipo `M` — modified;
nenhum arquivo adicionado, removido ou renomeado):

| Tipo | Caminho |
|---|---|
| M | `docs/architecture/impact-analysis/PR-PH-0-pre-homologation-product-readiness-impact-analysis.md` |
| M | `docs/architecture/ROADMAP_ARCHITECTURAL.md` |
| M | `docs/delivery/product-roadmap/pre-homologation-product-readiness/121-pr-ph-0-pre-homologation-product-readiness-impact-analysis.md` |

Totais: 3 modified; 0 added; 0 deleted; 0 renamed; 3 arquivos
alterados no total. Nenhum arquivo fora do escopo autorizado
foi tocado.

## 8. Validações

- `git diff --check` — clean.
- `bunx tsc --noEmit -p tsconfig.json` — executado; esta
  execução não alterou nenhum arquivo TypeScript.
- Buscas de reconciliação (grep executado no artefato
  corrigido):
  - `Requires re-inventory|Requires inventory|auditar em PR-PH|verificar em PR-PH`
    no `PR-PH-0-*.md` → **zero ocorrências**.
  - `PR-PH\.1 até PR-PH\.12|TH-001 até TH-006` no
    `ROADMAP_ARCHITECTURAL.md` → **zero ocorrências**.
  - `PR-PH\.2.*Dashboard|PR-PH\.9.*Roles` no `PR-PH-0-*.md` →
    **zero ocorrências** (roles = PR-PH.2; dashboard =
    PR-PH.4).
  - `5 arquivos editados \+ 2 arquivos criados` em
    `docs/delivery/product-roadmap/pre-homologation-product-readiness/`
    → **zero ocorrências**.

Confirmações positivas:

- Uma única sequência PR-PH canônica.
- Um contrato executável individual para cada PR-PH.1 …
  PR-PH.12.
- Uma entrada individual para cada etapa no roadmap.
- PR-PH.0 permanece `Ready for External Audit`.
- PR-PH.1 permanece `Planned; not started`.
- Homologação permanece `Blocked`.

## 9. Riscos remanescentes

- Dependência operacional preservada da role gerenciada
  `sandbox_exec` (Phase 4 §12; F4-CF-01 §6.2).
- Superfície concorrente `/admin/leads-workspace` × PipelinePage
  precisa cutover em PR-PH.3 antes de qualquer dashboard final
  (PR-PH.4).
- Divergência de constantes de alerta entre pipeline e
  dashboard — consolidar em PR-PH.3.
- Custom domain sem state machine é risco de takeover — não
  liberar homologação sem PR-PH.8.
- White label do site público sem hard gate de contraste é
  risco de a11y — endurecer em PR-PH.5.

## 10. Status final

- **Phase 4 Closing Review → Accepted.**
- **Architectural Roadmap · Fase 4 — Closed / Accepted.**
- **PR-PH.0 → Ready for External Audit.**
- **PR-PH.1 … PR-PH.12 → Planned; not started.**
- **TH-001 … TH-006 → Planned; not started.**
- **Homologação → Blocked** até conclusão e aceite da Product
  Readiness.
