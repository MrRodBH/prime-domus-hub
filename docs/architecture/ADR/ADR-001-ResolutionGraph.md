# ADR-001 — ResolutionGraph como Grafo Imutável de Resolução

- **Status:** Accepted
- **Date:** 2026-07-06
- **Supersedes:** decisões informais das etapas 4.3, 4.3.1, 4.3.2, 4.3.3
  (RegistryIndex, UnifiedResolutionLayer, ResolverRegistry mutável)

## Context
Iterações anteriores acumularam camadas de resolução concorrentes:
`RegistryIndex` runtime, `UnifiedResolutionLayer` com `switch(kind)`
central, e finalmente um `ResolverRegistry` mutável. Cada tentativa
introduzia um dos anti-padrões: dual-path, cérebro central único, ou
mutação runtime por plugin. O resultado foi instabilidade arquitetural
e risco de divergência entre tenants.

## Decision
A resolução runtime é feita por um **`ResolutionGraph` imutável**,
construído uma única vez por tenant a partir do `RegistrySnapshot`,
via `createResolutionGraph(snapshot)`. O grafo expõe nós tipados
(`view`, `panel`, `dialog`, `action`), cada um implementando
`resolve(id)` e `exists(id)`. O wrapper e cada resolver são congelados
com `Object.freeze`.

`ResolverRegistry` mutável e `UnifiedResolutionLayer` com switch central
são **proibidos permanentemente**. Nenhum `register()`, `addResolver`,
`switch(kind)` ou dispatch genérico `resolve(kind, id)` é permitido em
runtime.

## Consequences
**Positivas**
- Determinismo total: um snapshot ⇒ um grafo ⇒ uma resolução possível.
- Isolamento multi-tenant garantido por construção.
- Lookup O(1) por `kind` + `id`.
- Plugin não pode corromper resolução.

**Negativas**
- Nenhuma extensão dinâmica de `kind` em runtime — novos `kinds`
  exigem alteração do núcleo via ADR.

**Neutras**
- Renderers e `PluginContext` passam a consumir hooks especializados
  (`useViewResolver`, `usePanelResolver`, `useDialogResolver`,
  `useActionResolver`).

## Alternatives Considered
- **ResolverRegistry mutável (4.3.3):** rejeitado — reintroduz mutação
  runtime e risco de plugin-driven graph extension.
- **Switch central único (4.3.2):** rejeitado — cérebro monolítico,
  não escalável, dificulta isolamento de responsabilidade.
- **RegistryIndex runtime (4.3):** rejeitado — dual-path com snapshot.

## References
- Constituição §3.3, §3.8, §4, §5 (invariantes 5–7).
- `src/components/workspace/resolution/ResolutionGraph.ts`
- `docs/fase6/09-bloco-4-etapa-4-3-4-relatorio.md`
