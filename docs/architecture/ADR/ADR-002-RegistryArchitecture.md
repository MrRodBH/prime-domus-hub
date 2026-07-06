# ADR-002 — Registry Architecture (Tri-Camada: Registry → Snapshot → Graph)

- **Status:** Accepted
- **Date:** 2026-07-06

## Context
O sistema precisa de uma fonte declarativa de `View`/`Panel`/`Dialog`/
`Action`, isolamento por tenant e dispatch determinístico. Sem
separação estrita, cada camada tende a acumular responsabilidades
alheias (Registry executando lógica, Snapshot resolvendo, Graph
mutando).

## Decision
Adotar arquitetura tri-camada estrita:

1. **Registry** — fonte declarativa build-time. Indexa, nunca orquestra.
   Congelado por `freezeRegistries()` após bootstrap.
2. **RegistrySnapshot** — container **passivo** por tenant. Isola
   instâncias de registry; **não resolve, não executa, não decide**.
3. **ResolutionGraph** — grafo imutável de dispatch runtime construído
   a partir do snapshot (ver ADR-001).

Cada camada tem responsabilidades exclusivas e dependências
explicitamente permitidas/proibidas conforme §3 da Constituição.
Fusão de responsabilidades entre estas camadas é **proibida
permanentemente**.

## Consequences
**Positivas**
- Responsabilidade única por camada.
- Fail-fast em mutação pós-bootstrap (`RegistryFrozenError`).
- Isolamento tenant garantido pelo snapshot.

**Negativas**
- Bootstrap obrigatório e único; qualquer registro tardio é rejeitado.

**Neutras**
- Actions podem ser semeadas como `handler` puro ou `ActionDefinition`;
  o snapshot normaliza.

## Alternatives Considered
- **Registry único mutável em runtime:** rejeitado — quebra determinismo
  e isolamento multi-tenant.
- **Snapshot com lookups semânticos:** rejeitado — recria dual-path com
  o `ResolutionGraph`.

## References
- Constituição §3.1, §3.2, §3.3, §5 (invariantes 1–5, 12).
- `src/components/workspace/registry/*`
- `src/components/workspace/registry/snapshot.ts`
- `src/components/workspace/registry/freeze.ts`
