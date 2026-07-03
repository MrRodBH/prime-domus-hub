# Fase 6 · Bloco 4 · Etapa 4.1 — Plano Executivo (Pipeline como Prova Arquitetural)

**Status:** Aguardando aprovação · **Data:** 2026-07-03
**Contrato normativo:** `docs/fase6/09-product-ux-contract.md`
**Checklist obrigatório:** `docs/fase6/09-product-ux-compliance-checklist.md`
**Herança direta:** `docs/fase6/09-bloco-4-etapa-4-0-relatorio-tecnico.md`

---

## 0 · Reafirmação do Princípio

> **O Pipeline não está sendo integrado ao Workspace.**
> **O Workspace está demonstrando que é capaz de receber qualquer domínio sem conhecer suas regras específicas.**

Toda decisão deste plano é subordinada a essa regra. Nenhuma alteração no núcleo é aceita se existir *exclusivamente* para atender o Pipeline; alterações só entram se representarem generalização reutilizável por qualquer entidade futura (Investidores, Contratos, Comissões, etc.).

---

## 1 · Diagnóstico da Distância Arquitetural

Análise objetiva do que o `EntityWorkspace` (Etapa 4.0) oferece hoje versus o que o domínio Pipeline exige:

| Capacidade requerida pelo Pipeline | Suportada pelo núcleo 4.0? | Natureza |
|---|---|---|
| Split lista/detalhe | ✅ Sim | Genérica (já existe) |
| Densidade compact/comfortable | ✅ Sim | Genérica (já existe) |
| Busca textual + filtro de status | ✅ Sim | Genérica (já existe) |
| Ação "criar" via botão do header | ✅ Sim (opcional via descriptor) | Genérica (já existe) |
| Preservação de contexto via URL | ✅ Sim | Genérica (já existe) |
| **Visões alternativas** (kanban ↔ lista) | ❌ Não | **Generalização candidata** |
| **Abas de escopo da lista** (Ativos/Descartados/Análise) | ❌ Não | **Generalização candidata** |
| **Filtros declarativos** (corretor, período, alerta) | ❌ Parcial (só status) | **Generalização candidata** |
| **Ações de transição de estado** (Avançar, Ganho, Descartar, Reabrir) | ❌ Não modela | **Generalização candidata** |
| **Editor não-documental** (registro operacional sem slug/blocks/publish) | ❌ Não | **Generalização candidata** |
| **Painéis analíticos anexos** (Funil, Performance) | ❌ Não | **Generalização candidata** |
| DnD entre colunas (kanban) | ❌ Não | Genérica se view=kanban existir |

**Leitura arquitetural:** a distância entre o núcleo 4.0 e Pipeline é *precisamente* a distância entre um núcleo pensado para **um domínio (Conteúdo)** e um núcleo pensado para **qualquer domínio**. Fechar essa distância é exatamente o objetivo declarado da Etapa 4.1.

---

## 2 · Extensões Genéricas Propostas ao Núcleo

Todas as extensões abaixo são apresentadas como **evoluções do contrato genérico** (`EntityDescriptor` + `EntityAdapter`). Nenhuma menciona Pipeline; todas se aplicam igualmente a qualquer entidade futura.

### 2.1 · `descriptor.views` — Visualizações declarativas

Descriptor passa a declarar um conjunto de visualizações disponíveis:

```ts
type EntityViewMode = "list" | "kanban" | "gallery" | "table";

descriptor.views: {
  default: EntityViewMode;
  available: EntityViewMode[];
  // Configuração declarativa por modo (colunas do kanban, colunas da table, etc.)
  kanban?: { groupBy: string; columns: { id: string; label: string; accent?: string }[] };
  gallery?: { thumbField: string };
  table?: { columns: { field: string; label: string }[] };
};
```

- **Justificativa genérica:** Mídias se beneficiam de `gallery`; Auditoria de `table`; Contratos futuros de `kanban` por estágio. Não é uma capacidade Pipeline — é uma capacidade universal de exibição.
- **Impacto no núcleo:** `EntityWorkspace` renderiza um seletor de view apenas quando `views.available.length > 1`; o renderizador de kanban é um componente genérico `EntityKanban` alimentado pelos metadados do descriptor.

### 2.2 · `descriptor.scopeTabs` — Abas de escopo da lista

Distintas das `tabs` do editor (que são do painel de detalhe), estas dividem o conjunto de registros exibidos:

```ts
descriptor.scopeTabs?: {
  id: string;
  label: string;
  // Filtro declarativo aplicado ao adapter.fetchList (interpretado pelo adapter)
  scope: Record<string, unknown>;
  // Se true, esconde views de lista/kanban e delega renderização ao painel do descriptor
  panel?: string;
}[];
```

- **Justificativa genérica:** "Arquivados" em Páginas, "Rascunhos" em Blog, "Suspensas" em Campanhas — qualquer entidade pode se beneficiar. Auditoria já tem naturalmente conceito de "período" que seria uma scopeTab.
- **Impacto no núcleo:** `EntityWorkspace` renderiza tira de abas ao lado do toggle de view; o adapter recebe `scope` em `fetchList` e decide como aplicá-lo.

### 2.3 · `descriptor.filters` — Filtros declarativos

Descriptor descreve filtros disponíveis; a lista renderiza controles automaticamente:

```ts
descriptor.filters?: {
  id: string;
  label: string;
  kind: "select" | "text" | "date-range" | "enum-select";
  optionsFrom?: "adapter" | { static: { value: string; label: string }[] };
}[];
```

- **Justificativa genérica:** "Autor" em Blog, "Tipo" em Mídias, "Módulo" em Auditoria, "Segmento" em Campanhas. Filtros são universalmente úteis.
- **Impacto no núcleo:** `EntityList` renderiza controles a partir dos filtros do descriptor; adapter opcional expõe `fetchFilterOptions(filterId)` quando `optionsFrom === "adapter"`.

### 2.4 · `descriptor.actions` — Ações e transições declarativas

`WorkspaceAction` deixa de ser um enum fechado e se torna um catálogo:

```ts
descriptor.actions: {
  id: string;                 // "publicar", "avancar", "reabrir", "descartar"
  label: string;
  icon?: string;              // nome no lucide-icons
  intent?: "primary" | "default" | "destructive";
  // Ativação condicional a partir do registro selecionado
  enabledWhen?: (record: EntityRecord) => boolean;
  // Se abre um dialog declarado à parte
  dialog?: string;
}[];
```

E o adapter ganha uma superfície uniforme:

```ts
interface EntityAdapter {
  // já existe:
  fetchList, fetchDetail, save, remove, publicUrl?, listVersions?, restoreVersion?
  // novo:
  runAction?(actionId: string, id: string, payload?: unknown): Promise<void>;
  fetchFilterOptions?(filterId: string): Promise<{ value: string; label: string }[]>;
}
```

- **Justificativa genérica:** Hoje "publicar", "arquivar", "duplicar" já são ações — o modelo atual é um enum fechado que sabe apenas as ações do domínio Conteúdo. A generalização remove essa fronteira. Cada adapter (Página, Post, Campanha, Formulário, e amanhã Investidor) declara o vocabulário que faz sentido.
- **Impacto no núcleo:** `EntityEditor` renderiza barra de ações a partir de `descriptor.actions` filtradas por `enabledWhen`. Reutiliza o mesmo mecanismo para *todas* as entidades — inclusive as atuais, que hoje têm ações espalhadas.

### 2.5 · `editorKind: "record"` — Editor de registro operacional

Novo tipo de editor no catálogo existente (`blocks | richtext | form-builder | campaign | media | settings | audit`):

```ts
editorKind: "record"
```

Modelo: registro operacional (não-documental) exibido em **seções declarativas** guiadas por descriptor:

```ts
descriptor.recordSections?: {
  id: string;
  label: string;
  fields: {
    id: string;                 // path dentro de detail.data
    label: string;
    kind: "text" | "email" | "phone" | "money" | "link" | "readonly" | "textarea";
    href?: (record: EntityDetail) => string | null;  // ex.: mailto:, tel:, wa.me
  }[];
}[];
```

- **Justificativa genérica:** Todo domínio operacional (Investidores, Contratos, Comissões, Corretores, Portais) precisará dessa forma de editor. Sem ela, cada novo domínio teria que inventar um `editorKind` próprio — exatamente o anti-pattern que a Etapa 4.0 proibiu.
- **Impacto no núcleo:** Novo componente `RecordEntityEditor` renderiza seções declarativas usando primitivas existentes do design system. Zero lógica específica de qualquer domínio.

### 2.6 · `descriptor.panels` — Painéis analíticos anexos

Alguns escopos exibem painéis analíticos em vez de lista/kanban. Modelagem declarativa:

```ts
descriptor.panels?: {
  id: string;                                   // "funil", "performance"
  render: () => React.ReactNode;                // fornecido pelo adapter/descriptor
}[];
```

- **Justificativa genérica:** Blog vai querer "Métricas de leitura"; Formulários vai querer "Taxa de conversão"; Mídias vai querer "Uso por página". Painel analítico é padrão SaaS universal.
- **Impacto no núcleo:** Uma `scopeTab` com `panel: "funil"` faz o `EntityWorkspace` renderizar o painel declarado em vez da lista.

---

## 3 · Avaliação de Neutralidade das Extensões

Cada extensão foi avaliada contra três testes canônicos:

| Extensão | Domain Independence | Workspace Neutrality | Future Entity Test | Veredicto |
|---|:-:|:-:|:-:|:-:|
| 2.1 `views` | ✅ Aplicável a qualquer entidade | ✅ Núcleo não sabe *qual* view | ✅ Investidores usaria `list` + `table` | **Aprovada como genérica** |
| 2.2 `scopeTabs` | ✅ Universal (Arquivados, Rascunhos, etc.) | ✅ Núcleo não sabe *quais* escopos | ✅ Contratos: "Ativos/Encerrados" | **Aprovada como genérica** |
| 2.3 `filters` | ✅ Todo domínio precisa | ✅ Núcleo só lê metadados | ✅ Qualquer entidade | **Aprovada como genérica** |
| 2.4 `actions` | ✅ Substitui enum fechado atual | ✅ Núcleo executa `runAction(id)` opaco | ✅ Verbos por domínio | **Aprovada como genérica** |
| 2.5 `editorKind: "record"` | ✅ Padrão operacional universal | ✅ Núcleo despacha por kind | ✅ Investidores, Contratos, Comissões | **Aprovada como genérica** |
| 2.6 `panels` | ✅ Padrão SaaS universal | ✅ Render fornecido, núcleo só monta | ✅ Todo domínio maduro terá | **Aprovada como genérica** |

**Compromisso:** cada extensão será exercitada por *pelo menos uma* entidade Conteúdo existente antes do fechamento da 4.1 (ex.: `actions` catalogadas em Página; `scopeTabs` "Publicadas/Rascunhos" em Blog). Isso comprova neutralidade em código, não só em documento.

---

## 4 · Descriptor Proposto para `lead` (Pipeline)

```ts
lead: {
  kind: "lead",
  singular: "Lead",
  plural: "Pipeline",
  route: "/admin/pipeline",
  publicPathPrefix: "",
  editorKind: "record",
  layoutMode: "split",

  views: {
    default: "list",
    available: ["list", "kanban"],
    kanban: {
      groupBy: "status",
      columns: [
        { id: "novo",        label: "Novo",         accent: "red" },
        { id: "conversando", label: "Conversando",  accent: "amber" },
        { id: "visita",      label: "Visita",       accent: "lime" },
        { id: "proposta",    label: "Proposta",     accent: "emerald" },
        { id: "ganho",       label: "Ganho",        accent: "emerald" },
        { id: "perdido",     label: "Perdido",      accent: "rose" },
      ],
    },
  },

  scopeTabs: [
    { id: "ativos",       label: "Ativos",       scope: { exclude_status: ["descartado"] } },
    { id: "descartados",  label: "Descartados",  scope: { only_status: ["descartado"] } },
    { id: "analise",      label: "Análise",      scope: {}, panel: "funil" },
  ],

  filters: [
    { id: "corretor", label: "Corretor", kind: "enum-select", optionsFrom: "adapter" },
    { id: "origem",   label: "Origem",   kind: "select",      optionsFrom: "adapter" },
    { id: "periodo",  label: "Período",  kind: "date-range" },
    { id: "alerta",   label: "Alerta",   kind: "select", optionsFrom: {
      static: [
        { value: "sem_atendimento",       label: "Sem atendimento (24h)" },
        { value: "sem_followup",          label: "Sem follow-up (3d)" },
        { value: "visitas_sem_feedback",  label: "Visitas sem feedback" },
        { value: "propostas_paradas",     label: "Propostas paradas (5d)" },
      ],
    }},
  ],

  actions: [
    { id: "criar",     label: "Novo lead",       icon: "Plus",         intent: "primary" },
    { id: "avancar",   label: "Avançar",         icon: "ArrowRight",   enabledWhen: /* aberto */ },
    { id: "ganho",     label: "Marcar ganho",    icon: "CheckCircle2" },
    { id: "perdido",   label: "Marcar perdido",  icon: "Trash2", intent: "destructive", dialog: "perda",
      enabledWhen: /* status === 'proposta' */ },
    { id: "descartar", label: "Descartar",       icon: "Ban",    intent: "destructive", dialog: "descarte" },
    { id: "reabrir",   label: "Reabrir",         icon: "RotateCcw",
      enabledWhen: /* status ∈ {descartado, perdido} */ },
  ],

  recordSections: [
    { id: "contato",  label: "Contato",  fields: [
      { id: "email",    label: "E-mail",   kind: "email" },
      { id: "telefone", label: "Telefone", kind: "phone" },
    ]},
    { id: "negocio",  label: "Negócio",  fields: [
      { id: "imovel.titulo", label: "Imóvel",           kind: "readonly" },
      { id: "valor_estimado", label: "Valor estimado",  kind: "money" },
    ]},
    { id: "origem", label: "Origem", fields: [
      { id: "origem",     label: "Fonte",     kind: "readonly" },
      { id: "created_at", label: "Recebido",  kind: "readonly" },
      { id: "mensagem",   label: "Mensagem",  kind: "textarea" },
    ]},
  ],

  tabs: ["detalhes"],                        // detalhe único; sem SEO/preview/versões
  workflowStates: ["saved"],                 // Pipeline não é fluxo de publicação
  allowedTransitions: {},
  defaultStatus: "active",
  statusVocabulary: [{ label: "Ativo", value: "active" }],  // status de publicação; status operacional é campo do registro
  permissionsModule: "crm.pipeline",
  supportedBlocks: [],
  ready: true,
}
```

**Anexos ao descriptor** (fora do tipo, mas referenciados por id em `actions`):

- `dialogs.descarte` → componente `DescarteDialog` (fornecido pelo adapter Pipeline).
- `dialogs.perda` → componente `PerdaDialog` (idem).
- `panels.funil` → composição `FunilChart + PerformanceComercialPanel` (idem).

Esses são artefatos do domínio Pipeline, expostos ao núcleo apenas como **componentes React opacos** — o núcleo sabe apenas "renderize esse painel"; não sabe o que ele contém.

---

## 5 · Adapter Proposto (`useLeadAdapter`)

Superfície pública (`EntityAdapter` estendido em 2.4):

```ts
useLeadAdapter(): EntityAdapter {
  fetchList({ q, status, scope, filters }): mapeia Lead → EntityRecord
  fetchDetail(id): carrega Lead → EntityDetail
  save(id, draft): edita valor_estimado / notas via adminAtualizarLead
  remove(id): descarta lead (endpoint de descarte)
  runAction(id, actionId, payload):
    - "avancar"   → adminAtualizarLead({ status: nextStatus })
    - "ganho"     → adminAtualizarLead({ status: "ganho" })
    - "perdido"   → aciona PerdaDialog (payload traz motivo)
    - "descartar" → aciona DescarteDialog
    - "reabrir"   → reabrirLead()
  fetchFilterOptions(filterId):
    - "corretor" → adminListarCorretores()
    - "origem"   → distinct de leads.origem
}
```

**Regras invioláveis:**
- Nenhum import de `@/lib/api/*` fora do adapter.
- Nenhuma referência a `Lead`/`Status` fora de `src/adapters/pipeline-legacy` e `src/components/pipeline/leads/*`.
- `NovoLeadDialog`, `LeadHistoricoDialog`, `ValorEstimadoEditor` seguem no `@/adapters/pipeline-legacy` e são acionados via `runAction` / `dialogs.*`.

---

## 6 · Arquitetura Física

### Novos módulos (todos genéricos)
- `src/components/workspace/entities/EntityViewToolbar.tsx` — seletor de view/scopeTab/filters/density.
- `src/components/workspace/entities/EntityKanban.tsx` — kanban genérico com DnD, alimentado por `views.kanban`.
- `src/components/workspace/entities/EntityFilters.tsx` — renderer genérico de `descriptor.filters`.
- `src/components/workspace/entities/EntityActionsBar.tsx` — renderer genérico de `descriptor.actions`.
- `src/components/workspace/entities/RecordEntityEditor.tsx` — editor de `editorKind: "record"`.
- `src/components/workspace/entities/EntityAnalyticsPanel.tsx` — host de `descriptor.panels[*]`.

### Novos módulos de domínio (Pipeline)
- `src/components/workspace/domains/lead/descriptor.ts` — descriptor completo.
- `src/components/workspace/domains/lead/adapter.ts` — `useLeadAdapter`.
- `src/components/workspace/domains/lead/dialogs.ts` — wiring de DescarteDialog/PerdaDialog/NovoLeadDialog do legacy.
- `src/components/workspace/domains/lead/panels.tsx` — wiring de FunilChart/PerformanceComercialPanel do legacy.

### Alterações estruturais no núcleo
- `EntityDescriptor` ganha campos opcionais (`views`, `scopeTabs`, `filters`, `actions`, `recordSections`, `panels`) — **todos opcionais**, entidades de Conteúdo continuam funcionando sem preencher.
- `EntityAdapter` ganha métodos opcionais (`runAction`, `fetchFilterOptions`).
- `EntityWorkspace` passa a orquestrar view/scope/filters, mas **sem nenhuma condicional por `kind`** — apenas presença/ausência dos campos.
- `EntityKind` recebe `| "lead"`.

### Migração da rota
- `src/routes/_authenticated.admin.pipeline.tsx` importa `descriptor` de `domains/lead` e delega a `EntityWorkspace`.
- `pipelineSearchSchema` é *substituído* por `entitySearchSchema` estendido com os campos declarativos (`view`, `scope`, `corretor`, `origem`, `inicio`, `fim`, `alerta`) — nenhum campo específico "pipeline".
- `PipelinePage`, `LeadsList`, `LeadDetail`, `usePipelineData`, `search-schema.ts`, `entity-detail-mode.ts` são **removidos** ao final da etapa (após validação).

---

## 7 · Compromisso de Neutralidade em Código

Antes de o Pipeline ser considerado migrado, **pelo menos uma entidade de Conteúdo existente** deve exercitar cada extensão nova — sem regressão funcional:

| Extensão | Entidade cobaia | Uso mínimo |
|---|---|---|
| `views` | Mídias | Adiciona `available: ["list", "gallery"]` (opcional; pode ficar só declarativo se não houver capacidade) |
| `scopeTabs` | Blog | `["publicados", "rascunhos", "arquivados"]` — hoje é filtro de status; vira escopo |
| `filters` | Blog | Filtro "Autor" declarativo |
| `actions` | Página | Todas as ações atuais migram do enum para `descriptor.actions` |
| `recordSections` | — | Introduzido pelo Pipeline (é a estreia legítima do editorKind) |
| `panels` | — | Introduzido pelo Pipeline (idem) |

Esse é o teste anti-regressão: se uma extensão só tem *um* consumidor (Pipeline), ela é suspeita de ser específica, e será revisada.

---

## 8 · Riscos Arquiteturais

1. **`descriptor.actions.enabledWhen` como função.** Funções não são declarativas puras. Mitigação: aceitar também *predicados declarativos* (`{ status: { in: [...] } }`) como forma preferida; função só como escape hatch documentado.
2. **`dialogs` como referências opacas.** Núcleo passa a conhecer o *nome* de dialogs específicos. Mitigação: dialogs são registrados no descriptor (`descriptor.dialogs`) como componentes React; núcleo só chama `dialogs[id]` — não conhece implementação.
3. **DnD no kanban.** Requer transição de estado; delegado a `runAction("mover", { toColumn })`. Adapter interpreta.
4. **Bulk actions futuras.** Fora do escopo desta etapa; contrato deixará espaço (`descriptor.actions[].bulk?: boolean`) sem implementação.
5. **Legacy `@/adapters/pipeline-legacy`.** Continua vivo (Bloco 2). Adapter novo importa dele. Sem regressão do adapter existente.

---

## 9 · Architectural Exceptions previstas

| ID | Categoria | Descrição | Classificação | Critério de saída |
|---|---|---|---|---|
| **AE-4.1-01** | Composição legada | `useLeadAdapter` importa componentes de `@/adapters/pipeline-legacy` (DescarteDialog, PerdaDialog, NovoLeadDialog, FunilChart, PerformanceComercialPanel, ValorEstimadoEditor). | **Transitória** | Blocos futuros de rearquitetura CRM (fora da Fase 6) reescreverão esses componentes sob o design system Workspace. |
| **AE-4.1-02** | Contrato de dialogs | Núcleo executa `descriptor.dialogs[id]` como caixa preta. | **Estrutural aceitável** | Faz parte do contrato genérico — não expira. Documentada como capacidade do descriptor. |

Nenhuma outra exceção prevista. Se surgir durante a implementação, será registrada com o mesmo padrão de 12 campos definido na 4.0.

---

## 10 · Definition of Done

Para a Etapa 4.1 ser considerada encerrada:

- [ ] `EntityWorkspace` não contém nenhuma referência textual a `"lead"`, `"pipeline"`, `"corretor"`, `"funil"`.
- [ ] `grep -r "kind === " src/components/workspace/entities/` retorna **0 ocorrências**.
- [ ] `grep -r "kind === \"lead\"\\|pipeline" src/components/workspace/` retorna **0 ocorrências**.
- [ ] Todas as extensões da §2 têm pelo menos um consumidor além de Pipeline (§7).
- [ ] Rota `/admin/pipeline` migrada; `PipelinePage.tsx` e artefatos listados em §6 removidos.
- [ ] Preservação de contexto validada: filtros + seleção + scroll preservados ao navegar Pipeline → Páginas → Pipeline.
- [ ] Product UX Compliance Checklist preenchido com 100% de aderência.
- [ ] Workspace Score atualizado, incluindo três novos indicadores:
  - **Domain Independence:** 100% (Pipeline integrado só via descriptor+adapter+metadata).
  - **Descriptor Completeness:** 100% (todas capacidades específicas do Pipeline vivem no descriptor).
  - **Workspace Neutrality:** 100% (inspeção de `EntityWorkspace` não revela domínio).
- [ ] Typecheck + lint + build passando.
- [ ] Arquiteturais Exceptions registradas com ciclo de vida completo.
- [ ] Relatório técnico entregue seguindo estrutura da §Relatório da Etapa 4.1.

---

## 11 · Estratégia de Migração

1. **Etapa 4.1.a — Extensão do contrato:** estender `EntityDescriptor` + `EntityAdapter` com campos opcionais. Nenhuma entidade os utiliza ainda. Typecheck deve continuar verde para as 7 rotas existentes.
2. **Etapa 4.1.b — Extensão do núcleo:** implementar `EntityViewToolbar`, `EntityKanban`, `EntityFilters`, `EntityActionsBar`, `RecordEntityEditor`, `EntityAnalyticsPanel`. Nenhum descriptor os invoca ainda. Zero regressão esperada.
3. **Etapa 4.1.c — Neutralidade em código:** migrar ações de Página (§7) para `descriptor.actions`; migrar filtro de Blog para `descriptor.filters`. Comprovar antes de introduzir Pipeline.
4. **Etapa 4.1.d — Descriptor + adapter Lead:** criar `domains/lead/*`, registrar em `ENTITY_REGISTRY`.
5. **Etapa 4.1.e — Rota:** substituir `_authenticated.admin.pipeline.tsx` para consumir `EntityWorkspace`.
6. **Etapa 4.1.f — Remoção do legacy:** deletar `PipelinePage.tsx`, `LeadsList.tsx`, `LeadDetail.tsx`, `usePipelineData.ts`, `search-schema.ts`, `entity-detail-mode.ts`. Preservar `@/adapters/pipeline-legacy/*` (componentes reutilizados via AE-4.1-01).
7. **Etapa 4.1.g — Auditoria + relatório:** rodar os testes de §10, preencher checklist, redigir relatório final.

---

## 12 · Aprovação necessária antes da implementação

Este plano precisa de decisão explícita sobre:

1. **Aceitação das 6 extensões genéricas da §2** como evoluções do contrato (não como código específico de Pipeline).
2. **Aceitação de AE-4.1-01 e AE-4.1-02** como exceções arquiteturais legítimas.
3. **Aceitação da estratégia de neutralidade da §7** (migrar ao menos uma entidade Conteúdo para cada extensão nova antes de aceitar Pipeline como consumidor único).
4. **Aceitação da remoção física da §11.6** dos módulos `src/components/pipeline/*` (exceto `@/adapters/pipeline-legacy`).

Somente após aprovação escrita, a Etapa 4.1.a é iniciada.

---

**Observação final:** a análise mostra que o núcleo 4.0 estava calibrado para o *espaço conceitual do Conteúdo*. A Etapa 4.1 é o primeiro passo para calibrar o núcleo para o *espaço conceitual de qualquer domínio operacional*. Sem as 6 extensões, Pipeline caberia no `EntityWorkspace` apenas via anti-patterns explicitamente proibidos (condicionais por `kind`, wrappers específicos). Com as extensões — e apenas com elas — é possível cumprir o princípio arquitetural declarado sem trair a experiência do usuário.
