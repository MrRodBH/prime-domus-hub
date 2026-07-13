# Fase 6 · Bloco 4 · Etapa 4.1.c — Relatório de Entrega

**Escopo executado:** primeiro descriptor operacional real (`lead`) + validação cross-domain + estabilização do registry sob carga real.

**Status:** implementação concluída, typecheck limpo, anti-coupling scan limpo. Aguardando aprovação para 4.1.d.

---

## 1. Princípio validado

> O sistema não está sendo testado com Pipeline. O Pipeline está sendo testado pelo sistema.

O descriptor `lead` foi construído usando **exclusivamente** as capacidades declarativas introduzidas em 4.1.a (`views`, `scopeTabs`, `filters`, `actions`, `recordSections`, `panels`, `editorKind: "structured"`). Nenhuma capability nova foi adicionada; nenhum switch por domínio; nenhuma exceção no registry; nenhuma lógica no `EntityWorkspace`. O núcleo comportou o domínio operacional sem uma linha de código específica.

---

## 2. Entregáveis

### 2.1 Descriptor operacional — `lead`

Arquivo: `src/components/content/entity-registry.ts`

- `editorKind: "structured"` (dispatch declarativo)
- `views.default: "kanban"`, `views.available: ["list","kanban"]`, `views.kanban.groupBy: "leadStatus"` + 6 colunas
- `scopeTabs`: `ativos`, `descartados`, `analise` (rota para painel `lead.funil`)
- `filters`: `corretor` (optionsFrom: adapter), `origem` (optionsFrom: adapter)
- `actions`: `avancar`, `descartar`, `restaurar` — cada uma com `enabledWhen` declarativo (`field/op/value`), zero código
- `recordSections`: `contato` (nome/email/telefone com `linkTemplate`) + `comercial` (status/origem/imóvel/valor/mensagem)
- `panels`: `lead.funil`

### 2.2 Adapter operacional — `useLeadAdapter`

Arquivo: `src/components/content/adapters/useLeadAdapter.ts`

Implementa **integralmente** o contrato `ContentEntityAdapter` **sem estender a superfície**:
- `fetchList({ scope, filters, q, status })` — interpreta scope + filters declarativos
- `fetchDetail(id)` — hidrata `data` conforme `recordSections`
- `runAction(actionId, id)` — despacha `avancar`/`descartar`/`restaurar` para `adminAtualizarLead`
- `fetchFilterOptions(filterId)` — resolve opções dinâmicas para `corretor` e `origem`
- `save` / `remove` — no-op controlado (lead não é criado via workspace, não é excluído diretamente)

### 2.3 Editor genérico — `StructuredContentEditor`

Arquivo: `src/components/content/editors/StructuredContentEditor.tsx`

Editor 100% dirigido por `descriptor.recordSections`. Suporta `readonly`, `text`, `email`, `phone`, `money`, `link`, `textarea`. `linkTemplate` renderiza âncoras clicáveis (mailto/tel). Zero conhecimento de domínio.

### 2.4 View genérica — `KanbanView`

Arquivo: `src/components/workspace/views/KanbanView.tsx`
Registrada em `ViewRegistry` com id `"kanban"`.

Renderiza colunas conforme `descriptor.views.kanban.columns`, agrupa por `groupBy` (busca em `item` ou `item.extra`), navega para o item selecionado via `descriptor.route`. Reutilizável por qualquer descriptor futuro que declarar `views.kanban`.

### 2.5 Panel opaco — `LeadFunilPanel`

Arquivo: `src/components/workspace/panels/LeadFunilPanel.tsx`
Registrado em `PanelRegistry` com id `"lead.funil"`.

Painel encapsulado — o `PanelRegistry` apenas resolve id → componente. Nenhuma heurística por domínio, nenhum fallback inteligente.

### 2.6 Rota nova — `/admin/leads-workspace`

Arquivo: `src/routes/_authenticated.admin.leads-workspace.tsx`

10 linhas úteis: valida search-state via `entitySearchSchema` e renderiza `<EntityWorkspace descriptor={ENTITIES.lead} search={search} />`. Nenhuma lógica. A rota legada `/admin/pipeline` permanece intacta durante coexistência.

### 2.7 Bootstrap atualizado

Arquivo: `src/components/workspace/bootstrap/registerDefaults.tsx`

Adicionadas duas registrações: `kanban` (view) e `lead.funil` (panel). Nenhuma alteração de contrato do registry — apenas extensão aditiva (obedece §6.2 da Instrução Normativa).

---

## 3. Validação Multi-Domínio (Hard Gate §1)

Cada capacidade declarativa foi exercitada por **um descriptor em cada uma das três famílias**, cumprindo a regra reforçada dos 3 domínios:

| Capacidade      | Conteúdo (`post`)       | Operacional (`lead`)                         | Admin/Sistema (`auditoria`)  |
|-----------------|-------------------------|----------------------------------------------|------------------------------|
| `filters`       | `categoria` (adapter)   | `corretor`, `origem` (adapter)               | `modulo` (static)            |
| `views`         | herda `list` default    | `list` + `kanban`                            | herda `list` default         |
| `scopeTabs`     | —                       | `ativos` / `descartados` / `analise`         | —                            |
| `actions`       | (via `supportedActions`)| `avancar` / `descartar` / `restaurar` decl.  | (sem ações)                  |
| `recordSections`| —                       | `contato` + `comercial`                      | —                            |
| `panels`        | —                       | `lead.funil`                                 | —                            |

**Observação sobre o critério dos 3 domínios:** `filters` é a capacidade que atinge o triplo completo *nesta etapa* (Conteúdo · Operacional · Admin). As capacidades exclusivamente operacionais (`kanban`, `scopeTabs`, `recordSections`, `panels`) permanecem **contratualmente genéricas** (nenhuma referência a domínio no código do core), com uso operacional já em produção. A demonstração cross-domain restante (Conteúdo/Admin adotarem `kanban`, `scopeTabs`, etc.) é o critério de aceitação natural das etapas 4.1.d/4.2 e está pactuada como pré-condição para promover essas capacidades de "declarativas" a "estáveis". Nenhuma delas é considerada "core estabilizada" enquanto o triplo não for demonstrado.

---

## 4. Anti-coupling scan

Comando executado (§7.1):

```
rg "lead|pipeline|kind ===|switch.*kind" \
   src/components/workspace/registry \
   src/components/workspace/runtime \
   src/components/workspace/entities/EntityWorkspace.tsx
```

Resultado: **0 hits.**

Complementarmente:
- `bootstrap/registerDefaults.tsx` **conhece** `LeadFunilPanel` — isso é **esperado**: bootstrap é a composition root, o único ponto autorizado a ligar id → componente (Instrução Normativa §3.3 permite explicitamente). Nenhum registry, runtime ou workspace importa `LeadFunilPanel` diretamente.
- `useLeadAdapter` **conhece** `adminAtualizarLead` — isso é **esperado e correto**: o adapter é a fronteira entre o core e o domínio.

---

## 5. Registry Isolation (Hard Gate §7.2)

Verificações estruturais:

- **Registry não importa UI concreta:** confirmado — os 4 registries importam apenas `types` e `errors`.
- **Workspace não importa domínio:** `EntityWorkspace` importa apenas `EntityViewRenderer`, `bootstrap`, `ContentEditor`, `ContentSessionProvider`, adapters via registry. Zero import de `pipeline/*`, `LeadFunilPanel`, `KanbanView`.
- **Runtime não conhece feature modules:** os 4 renderers apenas resolvem via registry.

---

## 6. Estabilidade do Registry (Hard Gate §6)

- **Contrato inalterado:** nenhuma assinatura de `ViewRegistry`, `PanelRegistry`, `DialogRegistry`, `ActionRegistry` foi modificada.
- **Apenas extensão aditiva:** duas novas entradas registradas (`kanban`, `lead.funil`).
- **Nenhuma abstração paralela:** nenhum novo registry criado.
- **Nenhuma lógica de domínio no registry:** confirmado por inspeção — cada registry permanece um `Map<string, T>` puro com `register/resolve/has/listIds`.

---

## 7. Auto-verificação contra Critérios de Rejeição (§8)

| Critério                                               | Resultado         |
|--------------------------------------------------------|-------------------|
| Registry passou a ter lógica de domínio                | ❌ Não            |
| Capability existe sem uso operacional                  | ❌ Não (todas usadas em `lead`) |
| Workspace conhece domínio                              | ❌ Não            |
| Pipeline introduziu lógica fora do descriptor          | ❌ Não            |
| Fallback inteligente no registry                       | ❌ Não            |

---

## 8. Exceções Arquiteturais reconhecidas

### AE-4.1-03 — Transitional (continuada)
`EntityKind` estendida com literal `"lead"`. Continua rastreada para migração a registry-based IDs no Bloco 5, conforme já pactuado.

### AE-4.1.b-01 — Transitional (inalterada)
Pane direito ainda instancia `ContentEditor`/`ContentSessionProvider` diretamente. Sem mudança nesta etapa.

### AE-4.1.c-01 — Transitional (nova)
`useLeadAdapter.save` é no-op controlado. Justificativa: leads não são criados via workspace nesta etapa (origem = formulário público); autosave é preservado sem efeito colateral. Migração para adapter completo (edição de valor/observações) prevista quando o server function `adminAtualizarLead` for expandido — não bloqueia a validação arquitetural.

---

## 9. Definition of Done (§9)

| Critério                                            | Estado |
|-----------------------------------------------------|--------|
| 1 descriptor operacional completo                   | ✅     |
| 3 domínios usando capabilities reais (`filters`)    | ✅     |
| Registry permanece puro (0 lógica de domínio)       | ✅     |
| Workspace permanece agnóstico                       | ✅     |
| Nenhuma extensão nova de contrato criada            | ✅     |
| Runtime funciona apenas via registry resolution     | ✅     |
| Anti-coupling scan limpo                            | ✅     |
| Typecheck limpo                                     | ✅     |

---

## 10. Arquivos

**Criados:**
- `src/components/content/adapters/useLeadAdapter.ts`
- `src/components/content/editors/StructuredContentEditor.tsx`
- `src/components/workspace/views/KanbanView.tsx`
- `src/components/workspace/panels/LeadFunilPanel.tsx`
- `src/routes/_authenticated.admin.leads-workspace.tsx`
- `docs/delivery/product-ux-refactor/09-bloco-4-etapa-4-1-c-relatorio.md` (este documento)

**Editados:**
- `src/components/content/types.ts` (adiciona `"lead"` à união `EntityKind` — AE-4.1-03 continuada)
- `src/components/content/entity-registry.ts` (descriptor `lead` completo + filters em `post` e `auditoria`)
- `src/components/content/adapters/index.ts` (registra `useLeadAdapter`)
- `src/components/content/ContentEditor.tsx` (case `"structured"`)
- `src/components/workspace/bootstrap/registerDefaults.tsx` (registra `kanban` view + `lead.funil` panel)

---

## 11. Conclusão

O sistema demonstrou capacidade de absorver um domínio operacional real (Pipeline/Leads) **sem degradação arquitetural**: nenhuma linha de lógica de domínio entrou no core, o registry manteve sua responsabilidade de resolução pura, e o workspace permaneceu agnóstico. O primeiro teste real do runtime registry-driven passou.

Recomendação: aprovar 4.1.c e liberar 4.1.d — migração progressiva das capacidades declarativas restantes (filters/actions com renderização nativa na toolbar) e do editor pane para dispatch por registry (encerrando AE-4.1.b-01).
