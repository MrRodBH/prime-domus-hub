# Workspace Runtime — Diagrama

```mermaid
flowchart TD
  subgraph Bootstrap["Bootstrap (uma vez por processo)"]
    B1[registerDefaults] --> B2[freezeRegistries]
  end

  subgraph BuildTime["Build-time / Declarativo"]
    R1[ViewRegistry]
    R2[PanelRegistry]
    R3[DialogRegistry]
    R4[ActionRegistry]
  end

  subgraph Tenant["Por tenant (uma vez)"]
    S[RegistrySnapshot]
    G[ResolutionGraph<br/>imutável]
  end

  subgraph Runtime["Runtime UI"]
    TC[TenantContext]
    VR[EntityViewRenderer]
    PR[EntityPanelRenderer]
    DR[EntityDialogRenderer]
    EX[ActionExecutor]
  end

  B1 --> R1 & R2 & R3 & R4
  R1 & R2 & R3 & R4 --> S
  S --> G
  G --> TC
  TC --> VR
  TC --> PR
  TC --> DR
  TC --> EX
```

**Regras aplicadas:** fluxo único, sem atalhos entre camadas
(Constituição §4). `Bootstrap` executa uma única vez; `Snapshot` e
`ResolutionGraph` são construídos uma vez por tenant e congelados.
