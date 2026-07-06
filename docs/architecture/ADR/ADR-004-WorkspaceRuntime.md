# ADR-004 — Workspace Runtime (Renderers + Tenant Context)

- **Status:** Accepted
- **Date:** 2026-07-06

## Context
O runtime UI do Workspace precisa consumir a arquitetura oficial sem
recriar camadas paralelas de cache, lookup ou dispatch.

## Decision
O **Workspace Runtime** é composto por:

- **TenantContext** — provider único por tenant que expõe
  `{ tenantId, snapshot, resolutionGraph, executeAction, featureFlags }`
  e hooks tipados: `useResolutionGraph`, `useViewResolver`,
  `usePanelResolver`, `useDialogResolver`, `useActionResolver`.
- **Renderer Layer** — `EntityViewRenderer`, `EntityPanelRenderer`,
  `EntityDialogRenderer` consomem exclusivamente os hooks acima e
  chamam `resolutionGraph.<kind>.resolve(id)`. Nenhum renderer faz
  string-dispatch, lookup direto em snapshot ou cache local de resolução.
- **ActionExecutor** — invocado via `executeAction(id, ctx)` do context;
  execução pura, sem tocar o grafo.

Qualquer novo componente do Workspace Runtime segue o mesmo contrato.

## Consequences
**Positivas**
- Um único caminho de renderização por `kind`.
- Substituição de tenant recria contexto e grafo — zero vazamento.
- Renderers são triviais e auditáveis.

**Negativas**
- Renderers ficam acoplados aos hooks especializados; adicionar novos
  `kinds` exige novo hook + resolver via ADR-001.

**Neutras**
- `TenantContext` congela o valor exposto (`Object.freeze`) para
  impedir mutação acidental.

## Alternatives Considered
- **Renderer genérico com `switch(kind)`:** rejeitado — string-dispatch
  proibido.
- **Cache de resolução no renderer:** rejeitado — duplica autoridade do
  `ResolutionGraph`.

## References
- Constituição §3.6, §3.7, §4, §5 (invariantes 6, 10, 11).
- `src/components/workspace/runtime/*`
- `src/components/workspace/tenant/TenantContext.tsx`
