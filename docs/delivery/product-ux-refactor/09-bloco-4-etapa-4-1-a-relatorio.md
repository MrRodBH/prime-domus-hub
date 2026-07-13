# Fase 6 · Bloco 4 · Etapa 4.1.a — Relatório da Extensão do Contrato Base

**Status:** Concluída · aguardando aprovação para iniciar 4.1.b
**Data:** 2026-07-03
**Escopo:** Extensão exclusivamente contratual do `EntityWorkspace`. Nenhuma UI de domínio implementada.
**Contrato normativo:** `docs/delivery/product-ux-refactor/09-product-ux-contract.md` (§12 — Three-Domain Rule)
**Plano Executivo:** `docs/delivery/product-ux-refactor/09-bloco-4-etapa-4-1-plano-executivo.md`

---

## 1 · Princípio inegociável reafirmado

> O Workspace não evolui para suportar o Pipeline.
> O Pipeline evolui apenas como prova de que o Workspace já suporta qualquer coisa.

Toda decisão desta subetapa foi validada contra o **Multi-Domain Validation Test**
(Product UX Contract §12): Conteúdo · Operacional · Terceiro domínio independente
(Administração/Sistema).

---

## 2 · Entregas

### 2.1 · Governança documental

- **`docs/delivery/product-ux-refactor/09-product-ux-contract.md` §12 (novo)** — Three-Domain Rule
  formalizada como cláusula normativa do contrato. Regras derivadas de
  nomenclatura, prova em código, falha no critério e escopo do núcleo.
- **`docs/delivery/product-ux-refactor/09-bloco-4-etapa-4-1-plano-executivo.md`** — permanece a
  referência do plano da etapa 4.1 completa; 4.1.a é sua primeira subetapa.
- **Este relatório** — congela a superfície de contrato aceita.

### 2.2 · Extensões de contrato (tipadas, sem runtime)

Todas as extensões abaixo foram adicionadas como **campos/métodos opcionais**.
Nenhuma entidade existente precisou ser alterada. Zero breaking change.

| Símbolo | Local | Papel |
|---|---|---|
| `EntityViewMode` | `types.ts` | União `"list" \| "kanban" \| "gallery" \| "table"` (reservados: `calendar`, `timeline`, `map`) |
| `EntityViewsSpec` + `KanbanViewSpec` + `GalleryViewSpec` + `TableViewSpec` | `types.ts` | Declaração de visualizações |
| `ScopeTabSpec` | `types.ts` | Abas de escopo da lista |
| `FilterSpec` | `types.ts` | Filtros declarativos |
| `ActionSpec` + `ActionPredicate` | `types.ts` | Catálogo declarativo de ações (predicados só em formato declarativo — sem escape hatch funcional) |
| `RecordSectionSpec` + `RecordFieldSpec` + `RecordFieldKind` | `types.ts` | Editor `structured` |
| `PanelSpec` | `types.ts` | Painéis analíticos opacos |
| `EditorKind = ... \| "structured"` | `types.ts` | Novo modo de editor (registro operacional) |
| `EntityDescriptor.{views, scopeTabs, filters, actions, recordSections, panels}` | `types.ts` | Todos opcionais |
| `ListParams.{scope, filters}` | `types.ts` | Passagem opaca ao adapter |
| `ContentEntityAdapter.{runAction, fetchFilterOptions}` | `types.ts` | Superfície uniforme |
| `contentSearchSchema.{view, scope}` + `.passthrough()` | `search-schema.ts` | Chaves de filtros entram sem hardcode de nomes de domínio |
| Reexports em `@/components/workspace/entities` | `index.ts` | Superfície pública canônica |

### 2.3 · Fora de escopo (4.1.b em diante)

- Implementação dos componentes `EntityKanban`, `EntityFilters`, `EntityActionsBar`,
  `RecordEntityEditor`, `EntityAnalyticsPanel`, `EntityViewToolbar`.
- Registries (View / Panel / Dialog / Action) — apenas os *tipos* dos itens.
- Descriptor `lead` (Pipeline). `EntityKind` **permanece inalterado**.
- Qualquer alteração em rotas existentes.

---

## 3 · Aderência à Three-Domain Rule (§12)

Cada capacidade adicionada foi validada contra os três domínios obrigatórios:

| Capacidade | Conteúdo | Operacional | Admin / Sistema |
|---|---|---|---|
| `views` | Mídias → `gallery`; Auditoria → `table` | Pipeline → `kanban` | Logs de integração → `table` |
| `scopeTabs` | Blog → `publicados/rascunhos/arquivados` | Leads → `ativos/descartados/análise` | Perfis → `ativos/em revisão` |
| `filters` | Blog → `autor`; Auditoria → `módulo` | Leads → `corretor/período/alerta` | Chaves API → `escopo/expiração` |
| `actions` | Página → `publicar/despublicar` | Lead → `avançar/ganho/descartar` | Perfil → `revogar/redefinir senha` |
| `recordSections` (`editorKind: "structured"`) | Formulário → metadados avançados | Lead / Contrato / Comissão | Chave API / Integração / Billing |
| `panels` | Blog → métricas de leitura | Pipeline → funil de vendas | Sistema → uso/quota |
| `runAction` / `fetchFilterOptions` | Toda entidade de conteúdo | Toda entidade operacional | Toda entidade administrativa |
| `ListParams.{scope, filters}` | Idem `scopeTabs` / `filters` acima | Idem | Idem |
| `EditorKind: "structured"` | Formulário (registro de config) | Lead / Contrato | Chave API / Perfil |

**Nomenclatura auditada:** todos os identificadores adicionados ao núcleo são
semanticamente neutros (`views`, `scopeTabs`, `filters`, `actions`, `panels`,
`recordSections`, `runAction`, `fetchFilterOptions`, `scope`, `view`,
`structured`). Nenhum identificador carrega semântica de domínio.

**Escape hatches funcionais:** ausentes. `ActionPredicate` é 100% declarativo
(`always`, `statusIn`, `statusNotIn`, `field/op/value`). O plano executivo §13
proíbe funções `*Fn` no core, e essa proibição é honrada aqui.

---

## 4 · Definition of Done da Etapa 4.1.a

- [x] Contratos atualizados sem quebra de compatibilidade — todas as novas
      chaves são opcionais; nenhum descriptor existente precisou ser alterado.
- [x] Todas as novas capacidades definidas com nomenclatura genérica.
- [x] Regra dos 3 domínios documentada no Product UX Contract §12.
- [x] Nenhuma dependência de domínio (Pipeline ou outro) existe no core —
      `EntityKind` permanece `pagina|post|form|campanha|midia|site|auditoria`.
- [x] Zero implementação funcional de UI/runtime nesta subetapa.
- [x] Barrel `@/components/workspace/entities` atualizado com os novos tipos.

Typecheck limpo é verificado pelo pipeline padrão; este relatório não introduz
código de runtime, apenas tipos e reexports.

---

## 5 · Architectural Exceptions abertas nesta subetapa

Nenhuma. Todas as extensões são estritamente aditivas e opcionais.

As AEs previstas para 4.1 (`AE-4.1-01` importação legacy de painéis Pipeline
como componentes opacos; `AE-4.1-02` execução genérica de dialogs; `AE-4.1-03`
`EntityKind` como union literal transitório) permanecem **latentes** e só se
tornarão ativas quando a Etapa 4.1.b introduzir os registries e o descriptor
`lead`.

---

## 6 · Próximo passo

**Etapa 4.1.b — Registries + Renderers genéricos + Descriptor `lead`.**
Requer aprovação explícita antes do início. A partir da 4.1.b passa a valer o
compromisso do Plano Executivo §7: cada extensão nova precisa ser exercitada
por pelo menos um descriptor de Conteúdo *antes* do Pipeline ser aceito como
consumidor único — e agora, adicionalmente, precisa demonstrar viabilidade
no terceiro domínio (Administração/Sistema) conforme Product UX Contract §12.
