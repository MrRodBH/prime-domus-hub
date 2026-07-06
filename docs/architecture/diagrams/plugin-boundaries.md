# Plugin Boundaries — Diagrama

```mermaid
flowchart TB
  subgraph Host["Host Runtime"]
    TC[TenantContext]
    G[ResolutionGraph<br/>read-only]
    EX[ActionExecutor]
    FF[FeatureFlagService]
  end

  subgraph PluginInfra["Plugin Infrastructure (isolada)"]
    PM[PluginManifest]
    PV[PluginValidator]
    PL[PluginLoader]
    PR[PluginRegistry<br/>manifest + module]
  end

  subgraph PluginSandbox["Plugin em execução"]
    PCTX[PluginContext<br/>frozen, read-only]
    PMOD[Plugin Module]
  end

  TC --> PCTX
  G -. read .-> PCTX
  EX --> PCTX
  FF --> PCTX
  PCTX --> PMOD

  PM --> PV
  PV --> PL
  PL --> PR
  PR -. manifest+module .-> PMOD

  PMOD -.->|PROIBIDO| G
  PMOD -.->|PROIBIDO| PR
  PL   -.->|PROIBIDO| G
```

**Regras aplicadas:**
- `PluginContext` é read-only (Constituição §3.5, §5 invariante 8).
- `PluginRegistry` isola manifest+module e **não** se confunde com os
  registries do Workspace (Hard Gate G4).
- `PluginLoader` não modifica `ResolutionGraph` (Hard Gate G3).
- `FeatureFlagService` retorna booleanos e não altera resolução (G2).
