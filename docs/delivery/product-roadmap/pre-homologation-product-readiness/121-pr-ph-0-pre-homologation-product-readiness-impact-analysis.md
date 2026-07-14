# 121 — PR-PH.0 — Pre-Homologation Product Readiness Impact Analysis

**Status:** Ready for External Audit
**Roadmap namespace:** Product Roadmap · Pre-Homologation Product Readiness
**Depends on:** Phase 4 Closing Review — Accepted; Architectural
Roadmap · Fase 4 — SaaS Commercial Platform — Closed / Accepted.
**Blocks:** PR-PH.1 … PR-PH.12; TH-001 … TH-006; homologação.

Cross-reference:
[`docs/architecture/impact-analysis/PR-PH-0-pre-homologation-product-readiness-impact-analysis.md`](../../../architecture/impact-analysis/PR-PH-0-pre-homologation-product-readiness-impact-analysis.md).

## 1. Baseline e commit

- Baseline `8b7a54e Closed Phase 4 as Ready`.
- `git status --short` vazio na entrada; `git diff --check` clean.
- 93 migrations aplicadas; runtime, RLS, grants, providers,
  package.json e lockfile inalterados por esta execução.

## 2. Materialização do encerramento da Fase 4

Atualizados nesta execução:

- `docs/architecture/impact-analysis/PHASE-4-CLOSING-REVIEW-saas-commercial-platform-formal-closure.md`
  → Status **Accepted (external audit)**. Nota de reconciliação
  redacional para `data == null` versus `data === null` sem
  alteração de runtime/harness.
- `docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/120-phase-4-closing-review-saas-commercial-platform-formal-closure.md`
  → Status **Accepted (external audit)**; Fase 04 marcada
  **Closed / Accepted**.
- `docs/architecture/ROADMAP_ARCHITECTURAL.md` → §Fase 4
  reescrita como **Closed / Accepted**; entrada 18 = Accepted;
  PR-PH.0 = **Ready for External Audit**; PR-PH.1…PR-PH.12 e
  TH-001…TH-006 registradas como Planned; not started;
  homologação **Blocked**.

Nada é alterado nas subetapas SCP-010.x / SCP-011.x / SCP-012.0.x,
que permanecem **Accepted**.

## 3. Novos artefatos criados

- `docs/architecture/impact-analysis/PR-PH-0-pre-homologation-product-readiness-impact-analysis.md`.
- `docs/delivery/product-roadmap/pre-homologation-product-readiness/121-pr-ph-0-pre-homologation-product-readiness-impact-analysis.md`
  (este arquivo — novo namespace canônico da Product Roadmap
  Pre-Homologation Product Readiness, sem duplicar o namespace
  histórico `phase-06-product-ux-refactor/`).

## 4. Metodologia

Fonte da verdade obrigatória: código atual → schema/migrations →
rotas registradas → componentes importados → testes executáveis →
só depois documentação histórica.

Classificações: Implemented and connected · Implemented but
incomplete · Implemented but disconnected · Legacy / superseded ·
Duplicate authority · Planned only · Missing · Requires
architectural decision.

## 5. Inventário direto do produto (resumo executivo)

Detalhes completos em `PR-PH-0-*.md` §§4–14. Resumo:

- **Workspace shell / Rail / Header / ContextTabs**: Implemented
  and connected.
- **Breadcrumbs, 403 dedicado, menu do usuário formalizado**:
  Missing / Requires decision.
- **7 contextos de menu** (`contexts.ts`) mapeados; entradas
  "Início" candidata a nomenclatura controlada.
- **Duplicate authority**: `/admin/pipeline` × `/admin/leads` ×
  `/admin/leads-workspace`. Resolver em PR-PH.1.
- **Dual path CMS**: `admin.site.tsx` × `admin.paginas.*` +
  `cms-transferencia`. Cutover obrigatório em PR-PH.5.
- **Dashboard**: sem contratos formalizados de KPI, fórmula,
  timezone, drill-down, papéis, teste. Planned only.
- **CRM / Kanban**: incompleto; audit trail e otimista+rollback
  não formalizados; contagem financeira (ganho ≠ perdido ≠
  descartado ≠ fechado) sem contrato.
- **White label**: Missing como sistema. Logo fixo no rail.
- **Site público**: Implemented and connected; blocos, versões,
  agendamento, LGPD auditáveis em PR-PH.5.
- **Landing pages**: Missing como categoria.
- **Custom domain**: resolução por host presente; UI, state
  machine, verificação, SSL, anti-takeover Missing.
- **Onboarding / Configuration Center**: Missing.
- **Permissões**: F4.0 + SCP-012 consolidados; matriz de
  autoridade por operação a formalizar em PR-PH.9.
- **Operacional**: observability/email/rate-limit/auditoria
  parciais; homologação bloqueada até PR-PH.12.

## 6. Matriz de estado do produto

Ver `PR-PH-0-*.md §18`. Domínios ausentes / incompletos:
Branding, Landing pages, Onboarding, Configuration Center;
Dashboard, CRM/Kanban e CMS classificados como Parcial + Legado.

## 7. Sequência PR-PH executável

PR-PH.1 → PR-PH.2 → PR-PH.3 → PR-PH.4 → PR-PH.5 → PR-PH.6 →
PR-PH.7 → PR-PH.8 → PR-PH.9 → PR-PH.10 → PR-PH.11 → PR-PH.12.

Homologação: TH-001 → TH-002 → TH-003 → TH-004 → TH-005 →
TH-006.

Detalhes de escopo, contratos, hard gates e Definition of Done
em `PR-PH-0-*.md §§15–20`.

## 8. Caminho crítico e dependências

Matriz completa em `PR-PH-0-*.md §17`. Caminho crítico:
PR-PH.1 é bloqueio duro para PR-PH.2 e PR-PH.3; PR-PH.4 pode
ser planejada em paralelo apenas em nível de planejamento,
nunca implementada em paralelo com etapas que toquem menu,
autoridade ou tabelas partilhadas.

## 9. Diretriz vinculante de interface

**RM Prime SaaS — Data-Dense Premium Dark Interface** preservada:
dark graphite; cor viva apenas com semântica; máximo contraste
nas superfícies de leitura; KPI sempre com contexto/comparação/
tendência; alertas explicáveis; drill-down; dashboard por papel;
tema claro alternativo; validação com usuários reais antes da
homologação.

## 10. Validações

- `git diff --name-status` limitado a documentação (5 arquivos
  editados + 2 arquivos criados).
- `git diff --check` clean.
- `bunx tsc --noEmit -p tsconfig.json` — executado a seguir; esta
  execução não altera nenhum arquivo TypeScript.
- Buscas de reconciliação:
  - único status do Closing Review = Accepted;
  - única entrada PR-PH.0 = Ready for External Audit;
  - nenhuma PR-PH.1+ marcada como iniciada;
  - nenhuma Fase 4 descrita como em curso;
  - nenhum dashboard/Kanban declarado como final sem evidência;
  - nenhum custom domain declarado como pronto;
  - nenhuma homologação autorizada.

## 11. Itens fora de escopo

Componentes React, rotas, migrations, tabelas, RLS, grants,
providers, bibliotecas, temas, dashboards, Kanban, CMS,
domínios e onboarding — **não** foram modificados.

## 12. Riscos remanescentes

- Dependência operacional gerenciada de `sandbox_exec`
  (Fase 4).
- Dual path CMS e triplicação de Pipeline exigem tratamento
  antes de qualquer dashboard final.
- Custom domain sem state machine é risco de takeover.
- White label sem hard gate de contraste é risco de a11y.

## 13. Status final

- **Phase 4 Closing Review → Accepted.**
- **Architectural Roadmap · Fase 4 — Closed / Accepted.**
- **PR-PH.0 → Ready for External Audit.**
- **PR-PH.1 … PR-PH.12 → Planned; not started.**
- **TH-001 … TH-006 → Planned; not started.**
- **Homologação → Blocked** até conclusão e aceite da Product
  Readiness.
