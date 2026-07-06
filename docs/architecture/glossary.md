# Glossary — Definições Oficiais

As definições abaixo são normativas. Em caso de conflito com qualquer
outra documentação, prevalece este glossário em conjunto com a
`ARCHITECTURE_CONSTITUTION.md`.

- **Registry** — Estrutura declarativa build-time que indexa
  componentes ou definições de um `kind` específico
  (`View`, `Panel`, `Dialog`, `Action`). Congelado após bootstrap.

- **RegistrySnapshot** — Container passivo, imutável e isolado por
  tenant, que agrega instâncias de registry seed-adas. Não resolve
  e não executa.

- **ResolutionGraph** — Grafo imutável de resolução runtime construído
  uma vez por tenant a partir de um `RegistrySnapshot`. Expõe nós
  tipados por `kind`; único dispatcher autorizado do runtime.

- **ActionExecutor** — Função pura que executa uma `Action` declarada,
  a partir de `ActionContext`. Não muta grafo nem snapshot.

- **PluginContext** — Sandbox somente leitura entregue a plugins,
  contendo `tenantId`, `resolutionGraph` (read-only), `executeAction`,
  `featureFlags` e `apiVersion`. Congelado.

- **Resolver** — Nó especializado do `ResolutionGraph` responsável por
  um único `kind`. Implementa `resolve(id)` e `exists(id)`; imutável.

- **Renderer** — Componente do runtime UI que consome um resolver via
  hook oficial e renderiza o resultado. Nunca faz dispatch por string.

- **Manifest** — Descritor declarativo de um plugin
  (`PluginManifest`), contendo id, versão, `apiVersion`, dependências,
  permissões e capabilities.

- **Plugin** — Unidade externa ao núcleo composta por `manifest` e
  `module`, executada sob `PluginContext`. Nunca altera arquitetura.

- **Snapshot** — Sinônimo abreviado de `RegistrySnapshot` quando o
  contexto for inequívoco.

- **Bootstrap** — Fase inicial única do processo que registra defaults
  e chama `freezeRegistries()`. Idempotente e determinística.

- **Workspace** — Superfície de UI multi-entidade que hospeda
  renderers e consome o `ResolutionGraph` via `TenantContext`.

- **Feature Flag** — Booleano tenant-scoped exposto por
  `FeatureFlagService`. Não altera Resolution / Registry / Snapshot /
  Executor.

- **ADR (Architecture Decision Record)** — Documento imutável e
  versionado que registra uma decisão arquitetural; formato e regras
  em `ADR/README.md`.

- **Hard Gate** — Verificação obrigatória de conformidade
  arquitetural aplicada a toda alteração relevante (§8 da Constituição).

- **Patch Arquitetural** — Intervenção formal, escopada e aprovada,
  aplicada quando um Hard Gate ou ADR identifica desvio ou evolução
  necessária.

- **Architecture Constitution** — `docs/architecture/ARCHITECTURE_CONSTITUTION.md`;
  autoridade máxima e fonte oficial de verdade da arquitetura.

- **Single Source of Truth (SSoT)** — Princípio segundo o qual cada
  dado, contrato ou decisão possui um único dono autoritativo. No
  contexto arquitetural, a `Architecture Constitution` é a SSoT.
