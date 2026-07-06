# Architecture Decision Records (ADR)

## O que é um ADR
Um **Architecture Decision Record** é um documento imutável e versionado
que registra uma decisão arquitetural relevante, seu contexto, as
alternativas consideradas e as consequências aceitas.

Cada ADR representa **uma** decisão. ADRs não são substituídos por
edição — decisões posteriores criam novos ADRs que **supersedem** os
anteriores explicitamente.

## Quando criar um ADR
- Introdução, remoção ou alteração de camada arquitetural.
- Alteração de contrato público.
- Alteração de invariante (§5 da Constituição).
- Introdução de novo componente do runtime oficial.
- Alteração do fluxo oficial (§4 da Constituição).
- Alteração de processo de governança (§7 da Constituição).

## Quando NÃO criar um ADR
- Correção de bug sem impacto em contrato ou invariante.
- Refactor interno de módulo sem mudança de superfície pública.
- Alteração puramente cosmética / documental.
- Implementação de feature dentro dos contratos existentes.

## Formato obrigatório
Todo ADR **deve** conter, nesta ordem:

1. **Título** — `ADR-<NNN>-<Slug>`
2. **Status** — `Proposed | Accepted | Superseded by ADR-XXX`
3. **Date** — data de aceitação
4. **Context** — problema e forças que motivam a decisão
5. **Decision** — a decisão em termos normativos
6. **Consequences** — positivas, negativas, neutras
7. **Alternatives Considered** — alternativas rejeitadas e por quê
8. **References** — links para Constituição, patches, diagramas

## Numeração
Sequencial, sem gaps. Um ADR aceito nunca é apagado nem renumerado.

## Índice atual
- [ADR-001 — ResolutionGraph](./ADR-001-ResolutionGraph.md)
- [ADR-002 — Registry Architecture](./ADR-002-RegistryArchitecture.md)
- [ADR-003 — Plugin Architecture](./ADR-003-PluginArchitecture.md)
- [ADR-004 — Workspace Runtime](./ADR-004-WorkspaceRuntime.md)
