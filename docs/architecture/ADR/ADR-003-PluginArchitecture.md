# ADR-003 — Plugin Architecture (Read-Only Sandbox + Isolated Registry)

- **Status:** Accepted
- **Date:** 2026-07-06

## Context
O sistema deve suportar plugins e futura marketplace sem permitir que
plugins alterem a arquitetura. Iterações anteriores flertaram com
`plugin-driven graph extension`, que quebra determinismo e isolamento.

## Decision
Plugins operam sob três garantias:

1. **PluginContext** é uma sandbox **somente leitura**
   (`{ tenantId, resolutionGraph, executeAction, featureFlags, apiVersion }`),
   congelada por `Object.freeze`. Plugin **não** recebe `Registry` base,
   **não** registra resolver, **não** cria `kind`, **não** muta grafo.
2. **PluginRegistry** é um registry **isolado** que armazena apenas
   `{ manifest, module }`. Não se confunde nem se comunica com os
   registries do Workspace (`View`/`Panel`/`Dialog`/`Action`).
3. **PluginLoader** valida manifest, `apiVersion`, dependências e
   permissões; delega carregamento a um `PluginSource` (contrato
   preparado para Dynamic Module Loading). Loader **não** modifica
   `ResolutionGraph`.

`FeatureFlagService` é neutro: retorna booleanos por tenant e não
altera Resolution / Registry / Snapshot / Executor.

## Consequences
**Positivas**
- Plugin-safe por construção; nenhuma via de corrupção do núcleo.
- Marketplace futura pode evoluir sem tocar runtime.
- Feature flags não geram dual-path arquitetural.

**Negativas**
- Plugins não podem introduzir novos `kinds` dinamicamente — exige
  evolução do núcleo via ADR.

**Neutras**
- `apiVersion` fixa contrato entre host e plugin (`"4.3.4"`).

## Alternatives Considered
- **Plugins registrando resolvers:** rejeitado — reintroduz mutação
  runtime do grafo.
- **PluginContext com `resolve(kind, id)` genérico:** rejeitado —
  string-dispatch genérico proibido pela Constituição.

## References
- Constituição §3.5, §5 (invariante 8), §6, §8 (G1–G5).
- `src/components/workspace/plugins/*`
- `docs/fase6/09-bloco-4-etapa-4-4-relatorio.md`
