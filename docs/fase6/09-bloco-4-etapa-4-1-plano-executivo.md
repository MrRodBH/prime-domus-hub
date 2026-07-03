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

---

## 13 · Revisão Arquitetural Final

Esta seção é normativa. Foi produzida antes de qualquer implementação da
Etapa 4.1, com o objetivo de fortalecer a neutralidade do núcleo
(`EntityWorkspace`) e evitar que a integração do Pipeline introduza
acoplamentos estruturais. Em caso de conflito com seções anteriores
deste plano, **esta seção prevalece**.

### 13.1 · Descriptor Declarativo (Metadata First)

**Decisão.** Todo campo do `EntityDescriptor` que possa ser expresso
como estrutura de dados deve sê-lo. Funções são **escape hatch**, não
padrão. As formas declarativas canônicas para a Etapa 4.1 são:

```ts
// Predicados declarativos (visibilidade, habilitação, confirmação)
type Predicate =
  | { field: string; op: "eq" | "neq" | "in" | "nin" | "gt" | "gte" | "lt" | "lte" | "exists" | "empty"; value?: unknown }
  | { all: Predicate[] }
  | { any: Predicate[] }
  | { not: Predicate };

// Ações
type ActionSpec = {
  id: string;                    // identificador estável
  label: string;
  icon?: string;                 // nome do ícone no ícone-registry
  visibleWhen?: Predicate;       // declarativo
  enabledWhen?: Predicate;       // declarativo
  confirm?: { titleKey: string; bodyKey?: string; destructive?: boolean };
  dialogId?: string;             // resolve via Dialog Registry (§13.7)
  execute:                       // resultado da ação — sempre declarativo
    | { kind: "mutation"; mutationId: string; input?: Record<string, unknown> }
    | { kind: "navigate"; to: string; searchPatch?: Record<string, unknown> }
    | { kind: "dialog"; dialogId: string };
};

// Filtros
type FilterSpec = {
  id: string;
  label: string;
  field: string;
  control: "select" | "multi-select" | "date-range" | "text" | "boolean";
  optionsSource?: { adapterMethod: string } | { static: Array<{ value: string; label: string }> };
  defaultValue?: unknown;
};

// Transições
type TransitionSpec = {
  from: string | string[];
  to: string;
  when?: Predicate;
  requires?: ActionSpec["id"][];
};
```

**Escape hatch permitido — e apenas ele.** Um único campo de fuga é
autorizado por capacidade, com o sufixo `Fn`
(`visibleWhenFn`, `enabledWhenFn`, `confirmFn`). Seu uso obriga:

1. Registro imediato como **Architectural Exception** local ao descriptor.
2. Justificativa técnica descrita nos 3 eixos: por que a forma
   declarativa não basta, impacto arquitetural e limitação futura.
3. Meta explícita de eliminação (etapa/bloco de saída).

**Regra de aceitação:** na Etapa 4.1, Pipeline **não pode** introduzir
nenhum `*Fn`. Se surgir a tentação, a lacuna vira extensão do vocabulário
declarativo (novo `op`, novo tipo de `execute`), nunca função.

### 13.2 · Arquitetura de Registries

Formalizam-se quatro registries de responsabilidade única. O
`EntityWorkspace` conhece apenas **identificadores** — nunca componentes
concretos.

```
EntityDescriptor
   │  (identificadores)
   ▼
┌───────────────┬───────────────┬───────────────┬───────────────┐
│ View Registry │ Panel Registry│ Dialog Registry│ Action Registry│
└───────────────┴───────────────┴───────────────┴───────────────┘
   ▼               ▼                ▼                 ▼
list/kanban/…   TimelinePanel   ConfirmDialog   mutation runners
gallery/table   PreviewPane     FormDialog      navigate runners
calendar/…      AnalyticsPanel  ChoiceDialog    dialog runners
```

- **View Registry** — resolve `viewId` → componente de visualização.
  Núcleo não importa `EntityKanban`; recebe do registry.
- **Panel Registry** — resolve `panelId` → componente de painel de
  detalhe/analítico. Descriptor referencia por id.
- **Dialog Registry** — resolve `dialogId` → componente de diálogo.
  Ações e adapters emitem `dialogId`, nunca JSX.
- **Action Registry** — resolve `execute.kind` + `mutationId` para o
  runtime que executa a ação (mutation, navigate, dialog). Adapters
  registram seus mutation runners; o núcleo apenas despacha.

Registries são inicializados no boot da aplicação. Testes garantem que
o núcleo (`EntityWorkspace`, `EntitySessionProvider`, `EntityList`,
`EntityEditor`) **não importe** nenhum componente resolvido por registry.

### 13.3 · Revisão crítica do `EntityKind`

**Diagnóstico.** O union literal `EntityKind = "pagina" | "post" | …`
é, hoje, um acoplamento estrutural: cada novo domínio exige alteração
no núcleo, mesmo que apenas para ampliar o tipo. Isso viola o princípio
de que "novo domínio = descriptor + adapter, sem tocar no core".

**Alternativas avaliadas.**

| Opção                                    | Custo | Segurança de tipos | Extensibilidade | Veredito |
|------------------------------------------|-------|--------------------|-----------------|----------|
| Manter union literal                     | 0     | Alta               | Baixa           | Rejeitada como estado final |
| `entityId: string` cru                   | Baixo | Baixa              | Alta            | Rejeitada — perde autocompletar |
| `descriptorId: string` + Registry tipado | Médio | Média-alta via generics do registry | Alta | **Adotada como direção** |
| Union literal + augmentation por módulo  | Médio | Alta               | Média           | Aceita como forma **transitória** |

**Decisão.** `EntityKind` **permanece nesta etapa** como union literal
por dois motivos: (i) o custo de migrar 7 rotas e adapters existentes
está fora do escopo declarado do Bloco 4; (ii) o Registry tipado
depende de uma refatoração de tipagem (`ENTITY_REGISTRY` genérico
indexado por `descriptorId`) que merece uma etapa própria.

**Compromissos formais.**

1. Nenhum novo `if (kind === …)` é aceito, mesmo com union literal.
2. Cada novo descriptor deve ser adicionável **sem** editar arquivos
   do núcleo — apenas `ENTITY_REGISTRY` e o módulo do domínio.
3. A eliminação do union literal é registrada como
   **AE-4.1-03 (Transitional)** com saída prevista para o Bloco 5
   (introdução do Registry tipado por `descriptorId`).

### 13.4 · Contrato público de Views

O contrato de `descriptor.views[*].id` é ampliado para reservar, desde
já, os seguintes identificadores públicos:

```
"list" | "kanban" | "gallery" | "table" | "calendar" | "timeline" | "map"
```

Apenas `list`, `kanban`, `gallery` e `table` são implementados na
Etapa 4.1. Os demais são **reservados no contrato** para estabilizar
a interface pública — descriptors futuros poderão declará-los sem
quebra de contrato, e o View Registry retornará
`UnavailableViewPlaceholder` até a implementação real.

### 13.5 · Independência entre capacidades do Workspace

Fica declarado como invariante arquitetural que as capacidades a seguir
são **ortogonais** — nenhuma pressupõe qualquer outra:

`View · Scope · Filters · Sort · Selection · Density · Search · Panels`

Regras derivadas:

1. Cada capacidade é opcional no descriptor. Ausência ≠ desabilitação
   parcial de outras.
2. O `EntityWorkspace` deve renderizar corretamente qualquer subconjunto
   (ex.: `map + filters + search`, `timeline + scope`, `list + sort`).
3. Testes de neutralidade validam combinações mínimas por capacidade
   contra pelo menos dois descriptors (§13.10).

### 13.6 · Panels desacoplados

`descriptor.panels[*]` referencia painéis por `panelId`; a resolução
para componente React ocorre no Panel Registry. O descriptor **não
importa React**. Props do painel são passados como `panelProps:
Record<string, unknown>` validados pelo próprio painel.

`render: () => ReactNode` fica **proibido** no descriptor. Qualquer
necessidade de composição avançada resolve-se registrando um novo
painel no Registry.

### 13.7 · Dialogs desacoplados

Simétrico à §13.6. Toda referência a diálogo é feita por `dialogId`
(ver `ActionSpec.dialogId` e `execute.kind: "dialog"`). O Dialog
Registry resolve `dialogId` → componente e injeta o contrato genérico:

```ts
type DialogRuntimeProps = {
  entity: unknown;             // record atual, opaco para o núcleo
  descriptor: EntityDescriptor;
  onResolve: (result: unknown) => void;
  onCancel: () => void;
};
```

Descriptors **não** importam componentes de diálogo. Não há exceção
prevista para a Etapa 4.1.

### 13.8 · Contrato evolutivo do Kanban

O contrato `descriptor.views` para `kind: "kanban"` reserva, no schema
público, campos opcionais para expansão futura — nenhum precisa ser
implementado agora:

```ts
type KanbanViewSpec = {
  id: "kanban";
  groupBy: string;                         // obrigatório
  columnsFrom: { adapterMethod: string };  // obrigatório
  ordering?: { field: string; direction: "asc" | "desc" };
  swimlanes?: { field: string };
  aggregation?: Array<{ field: string; op: "sum" | "count" | "avg" }>;
  summary?: { showTotals?: boolean; showAverages?: boolean };
  columnLimits?: { max?: number; warnAt?: number };
};
```

A implementação da Etapa 4.1 lê apenas `groupBy` e `columnsFrom`.
Os demais campos existem no tipo e são ignorados em runtime — mas
não constituem quebra de contrato quando forem ativados.

### 13.9 · Renomeação do `editorKind: "record"`

**Decisão.** O identificador `editorKind: "record"` é substituído por
`editorKind: "structured"`, resolvido pelo Editor Registry como
`StructuredEntityEditor`.

**Justificativa.** "Record" é jargão interno de banco de dados e não
comunica papel de produto. "Structured" descreve o padrão de UI
(formulário estruturado por schema), permanece agnóstico de domínio e
convive naturalmente com futuros `editorKind`: `document`, `structured`,
`spreadsheet`, `canvas`.

### 13.10 · Multi-Domain Validation Test (regra permanente)

Elevado a **regra arquitetural permanente da Fase 6**:

> Nenhuma extensão do contrato do `EntityWorkspace` (novo campo em
> descriptor, novo id em registry, nova capacidade) é considerada
> aprovada enquanto tiver **apenas um consumidor**.

Critérios objetivos por extensão:

1. **≥ 1 domínio operacional** (Pipeline / Catálogo / Distribuição /
   Administração / Super).
2. **≥ 1 domínio de conteúdo** (Página / Post / Formulário / Campanha /
   Mídia / Site / Auditoria).
3. Ambos os consumidores devem exercer a extensão em **runtime**, não
   apenas declará-la no descriptor.
4. Evidência (rota, screenshot, teste) registrada no relatório da
   etapa que introduziu a extensão.

Consequência para a Etapa 4.1: cada uma das 6 extensões da §2 deve
listar seu consumidor de Conteúdo antes da introdução do Pipeline
(§7 e §11.c continuam válidos e são reforçados por esta regra).

Falha no teste bloqueia o gate parcial da etapa até que (a) a segunda
adoção seja implementada, ou (b) a extensão seja revertida do
contrato.

---

## 14 · Relatório resumido da Revisão Arquitetural Final

| # | Ponto revisado                   | Decisão                                                                 | Impacto positivo                                                     |
|---|----------------------------------|-------------------------------------------------------------------------|----------------------------------------------------------------------|
| 1 | Descriptor declarativo           | Predicates + ActionSpec + FilterSpec + TransitionSpec; escape hatch `*Fn` proibido nesta etapa | Descriptors auditáveis, serializáveis, sem lógica embutida           |
| 2 | Registries formalizados          | View / Panel / Dialog / Action Registries com responsabilidade única    | Núcleo passa a conhecer apenas ids; plugabilidade real               |
| 3 | `EntityKind`                     | Mantido como union transitório (AE-4.1-03), com regra de "sem edição do core" e saída no Bloco 5 | Evita refactor fora de escopo sem legitimar acoplamento               |
| 4 | Contrato de Views                | Ids reservados: list/kanban/gallery/table/calendar/timeline/map         | Interface pública estável; novos modos não quebram contrato          |
| 5 | Independência de capacidades     | Ortogonalidade declarada como invariante; testada em ≥ 2 descriptors    | Combinações arbitrárias suportadas por construção                    |
| 6 | Panels desacoplados              | Referência por `panelId`; `render` proibido no descriptor               | Descriptor 100% declarativo; Painéis substituíveis                   |
| 7 | Dialogs desacoplados             | Referência por `dialogId` + `DialogRuntimeProps` genérico               | Núcleo nunca importa diálogos de domínio                             |
| 8 | Kanban evolutivo                 | Campos opcionais reservados (ordering, swimlanes, aggregation, summary, columnLimits) | Expansão futura sem quebra                                           |
| 9 | Record Editor                    | Renomeado para `editorKind: "structured"` → `StructuredEntityEditor`    | Nome alinhado ao produto; namespace aberto para outros editors       |
| 10 | Multi-Domain Validation Test    | Regra permanente da Fase 6; ≥ 1 consumidor operacional + ≥ 1 conteúdo   | Impede que "genérico" seja, na prática, específico de um domínio     |

**Conclusão.** Com estas dez decisões incorporadas, o `EntityWorkspace`
passa a operar como **infraestrutura orientada por contratos** e não
mais como uma generalização do CMS. A Etapa 4.1.a fica autorizada a
iniciar somente após aprovação escrita desta seção.
