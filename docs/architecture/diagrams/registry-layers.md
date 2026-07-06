# Registry Layers — Diagrama

```mermaid
flowchart TD
  R[Registry<br/>build-time, congelado]:::layer
  S[RegistrySnapshot<br/>container passivo por tenant]:::layer
  G[ResolutionGraph<br/>imutável, dispatcher único]:::layer
  UI[Renderer Layer]:::layer
  EX[ActionExecutor<br/>função pura]:::layer

  R -->|seed| S
  S -->|createResolutionGraph| G
  G -->|use<Kind>Resolver| UI
  UI -->|executeAction| EX
  G -.->|action definitions| EX

  classDef layer stroke-width:1.5px
```

**Separação estrita (Constituição §3, §4):**
| Camada | Faz | Não faz |
|---|---|---|
| Registry | Indexa definições build-time | Executar, resolver, conhecer tenant |
| Snapshot | Isola instâncias por tenant | Resolver, executar, decidir |
| ResolutionGraph | Dispatch imutável O(1) | Mutar, executar lógica de negócio |
| Renderer | Renderizar resolvido | Dispatch, lookup direto |
| Executor | Executar action pura | Tocar grafo, mutar snapshot |
