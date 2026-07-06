# ARCHITECTURE CONSTITUTION — RM Prime SaaS

**Versão:** 1.0.0
**Status:** Ratificada — Fase 6 · GA-01
**Autoridade:** Fonte oficial e única de verdade (Single Source of Truth) da
arquitetura do RM Prime SaaS.

> Em caso de conflito entre esta Constituição e qualquer relatório técnico,
> prompt, documentação secundária ou implementação, **prevalece a
> Constituição**.

---

## 1. Mission

### 1.1 Objetivo
Estabelecer uma arquitetura runtime **determinística, imutável e
extensível de forma controlada**, capaz de sustentar multi-tenant SaaS em
escala com previsibilidade absoluta de comportamento.

### 1.2 Princípios de longo prazo
- Arquitetura é ativo permanente, não subproduto de features.
- Decisões arquiteturais são versionadas e auditáveis.
- Runtime é determinístico e reproduzível.
- Extensibilidade é possível **sem** mutação do núcleo.

### 1.3 Motivação
Eliminar as classes de falha que corromperam iterações anteriores:
dual-paths, resolução mutável, plugins que reescrevem o núcleo,
inferência implícita e centralização de responsabilidade.

---

## 2. Core Principles

Princípios normativos. Todos são obrigatórios e não negociáveis.

| Princípio | Definição normativa |
|---|---|
| **Architecture First** | Nenhuma feature precede a arquitetura. Toda evolução respeita as camadas oficiais. |
| **Single Source of Truth** | Cada dado, contrato ou decisão possui um único dono. Duplicação é proibida. |
| **Deterministic Runtime** | O mesmo input em runtime produz sempre o mesmo output. Sem heurística, sem ordem incidental. |
| **Fail Fast** | Erros de contrato, validação e configuração falham no instante mais próximo da causa. |
| **Explicit Contracts** | Todo cruzamento de camada usa tipos declarados. Sem `any` estrutural, sem string-dispatch genérico. |
| **Low Coupling** | Camadas conhecem apenas suas dependências permitidas. |
| **High Cohesion** | Cada módulo tem uma única razão para existir e mudar. |
| **Immutable Resolution** | Após bootstrap, o grafo de resolução é imutável. |
| **O(1) Lookup** | Resolução runtime é lookup direto em estrutura pré-construída, nunca varredura. |
| **Predictable Runtime** | Nenhum caminho crítico depende de estado global mutável fora dos containers oficiais. |

---

## 3. Official Architecture

Componentes oficiais do runtime. Nenhum outro componente pode assumir
essas responsabilidades.

### 3.1 Registry
- **Responsabilidade:** fonte declarativa de definições em build-time
  (`View`, `Panel`, `Dialog`, `Action`).
- **Proibido:** executar lógica, resolver, orquestrar, conhecer tenant.
- **Dependências permitidas:** `registry/types`, `registry/freeze`.
- **Dependências proibidas:** `workspace`, `runtime`, `bootstrap`, `plugins`, `tenant`.
- **Contratos públicos:** `register<Kind>`, `create<Kind>Registry`, `<Kind>RegistryInstance`.
- **Invariantes:** congelado após `freezeRegistries()`; `register` pós-bootstrap lança `RegistryFrozenError`.

### 3.2 RegistrySnapshot
- **Responsabilidade:** container **passivo** que isola instâncias de
  registry por tenant.
- **Proibido:** resolver, executar, decidir, indexar semanticamente.
- **Dependências permitidas:** `Registry` (via seed).
- **Dependências proibidas:** `Renderer`, `Plugin`, `ResolutionGraph`, `TenantContext`.
- **Contratos públicos:** `createRegistrySnapshot(tenantId, source)`, `RegistrySnapshot`.
- **Invariantes:** congelado após seed; imutável por tenant; não expõe lookups.

### 3.3 ResolutionGraph
- **Responsabilidade:** grafo **imutável** de resolução runtime;
  dispatcher único.
- **Proibido:** mutação em runtime, `register()`, criação dinâmica de
  `kind`, execução de lógica de negócio.
- **Dependências permitidas:** `RegistrySnapshot`, resolvers especializados.
- **Dependências proibidas:** `Plugin`, `Renderer`, componentes React.
- **Contratos públicos:** `createResolutionGraph(snapshot)`,
  `ResolutionGraph`, `useResolutionGraph`, `use<Kind>Resolver`.
- **Invariantes:** construído uma única vez por tenant; `Object.freeze`
  no wrapper e em cada resolver; nós tipados por `kind`.

### 3.4 ActionExecutor
- **Responsabilidade:** execução pura de actions declaradas.
- **Proibido:** tocar `ResolutionGraph`, mutar snapshot, decidir
  roteamento por string arbitrária.
- **Dependências permitidas:** `RegistrySnapshot` (leitura de action definitions).
- **Dependências proibidas:** `Renderer`, `Plugin` (a não ser via `PluginContext`).
- **Contratos públicos:** `executeAction`, `executeActionById`.
- **Invariantes:** função pura sem estado global mutável.

### 3.5 PluginContext
- **Responsabilidade:** sandbox **read-only** oferecido a plugins.
- **Proibido:** registrar resolvers, mutar grafo, acessar registry base,
  criar `kind`, escrever em snapshot.
- **Dependências permitidas:** `ResolutionGraph` (leitura), `ActionExecutor`, `FeatureFlags`.
- **Dependências proibidas:** `Registry` base, `RegistrySnapshot` mutável.
- **Contratos públicos:** `PluginContext { tenantId, resolutionGraph, executeAction, featureFlags, apiVersion }`.
- **Invariantes:** `Object.freeze`; `apiVersion` fixo por release; sem side-effects arquiteturais.

### 3.6 Workspace Runtime
- **Responsabilidade:** hospedar renderers e orquestrar UI de workspace
  a partir do `ResolutionGraph`.
- **Proibido:** resolver por conta própria, cachear resolução, replicar
  registry.
- **Dependências permitidas:** `TenantContext`, hooks públicos de resolver.
- **Dependências proibidas:** `Registry`, `Snapshot` diretos, mutação de grafo.
- **Contratos públicos:** componentes do `workspace/runtime/*`.
- **Invariantes:** consome exclusivamente via hooks oficiais.

### 3.7 Renderer Layer
- **Responsabilidade:** renderizar `View`, `Panel`, `Dialog` resolvidos.
- **Proibido:** dispatch por string, lookup direto em snapshot, lógica
  de resolução.
- **Dependências permitidas:** hooks `use<Kind>Resolver`.
- **Dependências proibidas:** `Registry`, `Snapshot`, `Plugin`.
- **Contratos públicos:** `EntityViewRenderer`, `EntityPanelRenderer`,
  `EntityDialogRenderer`.
- **Invariantes:** um caminho de renderização por `kind`.

### 3.8 Resolver Layer
- **Responsabilidade:** nós especializados do grafo
  (`ViewResolver`, `PanelResolver`, `DialogResolver`, `ActionResolver`).
- **Proibido:** mutação após construção, cross-kind dispatch, execução.
- **Dependências permitidas:** `RegistrySnapshot`, `ResolutionGraph` types.
- **Dependências proibidas:** `Renderer`, `Plugin`.
- **Contratos públicos:** `create<Kind>Resolver`, `<Kind>Resolver`.
- **Invariantes:** cada instância `Object.freeze`; `resolve`/`exists` puros.

### 3.9 Bootstrap
- **Responsabilidade:** registrar defaults, congelar registries,
  materializar snapshot e grafo por tenant.
- **Proibido:** executar após inicialização, reagir a estado runtime.
- **Dependências permitidas:** todos os registries e defaults.
- **Dependências proibidas:** UI, componentes.
- **Contratos públicos:** `bootstrapWorkspaceRegistries`, `getDefaultSnapshotSource`.
- **Invariantes:** executa uma única vez; determinístico; culmina em `freezeRegistries()`.

---

## 4. Runtime Flow

Fluxo oficial e **exclusivo**:

```
Registry
   ↓
Snapshot
   ↓
ResolutionGraph
   ↓
Renderer
   ↓
ActionExecutor
```

Nenhum fluxo paralelo, atalho ou bypass é permitido. Não existe
"caminho alternativo" para renderização, resolução ou execução.

---

## 5. Architectural Invariants

Invariantes ratificados durante a Fase 6. **Nenhum pode ser removido ou
adicionado sem Emenda (§10).**

1. **Registry Purity** — Registry indexa, nunca orquestra.
2. **Registry Freeze** — pós-bootstrap, `register()` é proibido.
3. **Snapshot Passivity** — Snapshot não resolve, não executa, não decide.
4. **Tenant Isolation** — Snapshot por tenant, sem estado compartilhado mutável.
5. **Resolution Graph Immutability** — grafo congelado por tenant,
   construído uma vez.
6. **Single Dispatcher** — `resolutionGraph.<kind>.resolve(id)` é o
   único ponto de dispatch runtime.
7. **Typed Kinds** — nenhum `kind` novo em runtime; nenhum string-dispatch genérico.
8. **Plugin Read-Only Sandbox** — plugin lê grafo, jamais o modifica.
9. **Executor Purity** — `ActionExecutor` é função pura.
10. **Bootstrap Determinism** — bootstrap é idempotente e único.
11. **Explicit Contracts** — todo cruzamento de camada usa tipos declarados.
12. **O(1) Resolution** — resolução é lookup direto, não varredura.

---

## 6. Forbidden Decisions

Decisões **permanentemente proibidas**:

- Dual-path (dois caminhos concorrentes para o mesmo objetivo).
- Heurísticas em runtime crítico.
- Fallback "inteligente" ou implícito.
- Inferência implícita de tipo/kind.
- Mutação do `ResolutionGraph` após bootstrap.
- Registry executando lógica de negócio.
- Snapshot resolvendo componentes.
- Plugins alterando arquitetura (registrando resolvers, criando kinds,
  mutando grafo).
- Novos singletons globais fora dos containers oficiais.
- APIs paralelas para responsabilidades já cobertas.
- Alteração unilateral de contratos públicos.
- Downgrade de componente estrutural a "debug-only".
- Fusão de responsabilidade entre Registry, Snapshot, ResolutionGraph e Executor.

---

## 7. Governance Process

Fluxo oficial para qualquer alteração arquitetural. **A partir da
ratificação desta seção (Gate de Entrada permanente), nenhuma etapa pode
iniciar diretamente pela implementação.** Toda nova etapa — feature,
refactor, middleware, auth, multi-tenancy, storage, plugin, integração,
CMS, CRM, automação, API, dashboard, workflow ou Marketplace — deve
começar por um documento **Architectural Impact Analysis (IA)** em
`docs/architecture/impact-analysis/IA-<NNN>-<Slug>.md`, seguindo o
template obrigatório de 13 seções descrito no README daquele diretório.

```
Nova Etapa
   ↓
Architectural Impact Analysis (IA)
   ↓
Validação contra ARCHITECTURE_CONSTITUTION.md
   ↓
Hard Gates (G0–G7)
   ↓
Verificação de ADR
   ↓
Verificação de Patch Arquitetural
   ↓
Aprovação
   ↓
Implementação
   ↓
Typecheck + Scans
   ↓
Relatório Técnico
   ↓
Auditoria
```

Relação entre artefatos:
- **Constituição** — regras permanentes (SSoT).
- **Impact Analysis (IA)** — avalia uma implementação **antes** de acontecer.
- **ADR** — registra decisão arquitetural quando a etapa efetivamente
  altera ou amplia a arquitetura.

Uma IA não substitui um ADR e um ADR não substitui uma IA. Pular
qualquer etapa é violação do processo oficial de governança e a
implementação correspondente é rejeitada.

---

## 8. Hard Gates

| Gate | Objetivo | Falha quando |
|---|---|---|
| **G0 — Governance** | Impedir decisão unilateral. | Alteração de camada sem ADR/Patch aprovado. |
| **G1 — Plugin Sandbox** | Plugin nunca registra resolver / registry / grafo. | Plugin importa registry base ou muta grafo. |
| **G2 — Flag Neutrality** | Feature Flags não alteram Resolution/Registry/Snapshot/Executor. | Flag decide roteamento arquitetural. |
| **G3 — Loader Purity** | Loader não modifica `ResolutionGraph`. | Loader registra resolver ou reabre snapshot. |
| **G4 — Plugin Registry Isolation** | `PluginRegistry` não conhece runtime do workspace. | Import de `tenant`, `resolution`, `snapshot`, `runtime`. |
| **G5 — Context Read-Only** | `PluginContext` permanece somente leitura. | Novo método mutador exposto. |
| **G6 — Core Untouchability** | `ResolutionGraph` / `Resolver` / `Snapshot` / `Executor` / `Registry` intocados fora do fluxo formal. | Edição sem ADR + Patch. |
| **G7 — Bootstrap Untouchability** | `bootstrap` intocado fora do fluxo formal. | Edição sem ADR + Patch. |

---

## 9. Definition of Architectural Compliance

Uma implementação só é considerada concluída quando:

1. Contratos públicos preservados.
2. Arquitetura preservada (camadas, fluxo, responsabilidades).
3. Invariantes preservados (§5).
4. Testes aprovados.
5. Checklist / Hard Gates aprovados.
6. Documentação atualizada quando aplicável (Constituição, ADR, diagramas, glossário).

---

## 10. Amendment Process

A Constituição só pode ser alterada mediante:

1. Análise de impacto arquitetural formal.
2. ADR aprovado documentando a decisão.
3. Patch Arquitetural aprovado, quando aplicável.
4. Aprovação explícita do arquiteto do projeto.
5. Atualização versionada da `ARCHITECTURE_CONSTITUTION.md`.

Nenhuma alteração retroativa é válida sem passar por este processo.
