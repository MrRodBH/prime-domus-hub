# Resolution Flow — Diagrama

```mermaid
sequenceDiagram
  autonumber
  participant UI as Renderer (View/Panel/Dialog)
  participant Hook as use<Kind>Resolver
  participant Graph as ResolutionGraph
  participant Node as <Kind>Resolver (frozen)
  participant Snap as RegistrySnapshot

  UI->>Hook: request kind + id
  Hook->>Graph: read graph.<kind>
  Graph->>Node: resolve(id)
  Node->>Snap: lookup em registry isolado (O(1))
  Snap-->>Node: componente / definition
  Node-->>Graph: resultado tipado
  Graph-->>Hook: resultado
  Hook-->>UI: render
```

```mermaid
flowchart LR
  A[Snapshot] --> B[createResolutionGraph]
  B --> C{{Graph imutável}}
  C --> V[ViewResolver]
  C --> P[PanelResolver]
  C --> D[DialogResolver]
  C --> X[ActionResolver]
  V -->|resolve id| VC[ViewComponent]
  P -->|resolve id| PC[PanelComponent]
  D -->|resolve id| DC[DialogComponent]
  X -->|resolve id| XC[ActionDefinition]
```

**Invariantes reforçados:** único dispatcher `resolutionGraph.<kind>.resolve(id)`;
lookup O(1); zero mutação; zero string-dispatch genérico
(Constituição §5, invariantes 5–7, 12).
