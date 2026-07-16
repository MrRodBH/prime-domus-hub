# 123 · LSO-01 — Lead Security & Workspace OCC

## 1. Status final

**Status:** Rejected — encerrada definitivamente.

A LSO-01 permanece como registro histórico. Não haverá reabertura, não
haverá novo ciclo corretivo e não haverá nova iteração sob este
identificador. Nenhuma parte deste documento descreve estado vigente do
runtime.

## 2. Baseline e execução auditada

- **Baseline original:** `afdb898b725d734107f19d09af84558ab4b81290`
  (`main` — "Finalizou cutover PR-M1").
- **Predecessora:** PR-M1 (Superseded).
- **Sucessora:** LSH-01 (Ready for External Audit) → LSV-01
  (Planned · blocked until external acceptance of LSH-01).

## 3. Motivo da rejeição

A auditoria externa da LSO-01 identificou que a etapa não satisfazia o
Definition of Done integral: o boundary tipado de autorização não era
consumido pelas cinco operações Lead, os grants e a policy de leitura
da tabela `lead_audit_events` violavam a fronteira de segurança, a FK
`lead_id` usava `ON DELETE CASCADE`, `tenant_id` possuía
`DEFAULT get_current_tenant_id()`, `adminAtualizarLead` aplicava cast
inseguro, `adminListarCorretores` (superfície administrativa legada,
não pertencente ao domínio Lead) executava `select("*")`, o retorno da
RPC canônica de criação manual era validado por Zod frouxo e o
contrato de impersonação era heurístico. Esses defeitos não foram
resolvidos dentro do ciclo da LSO-01, o que levou à rejeição
arquitetural da etapa.

## 4. Artefatos parciais preservados

Da execução original permanecem, apenas como referência histórica, os
seguintes artefatos parciais que serviram de ponto de partida para a
LSH-01:

- rascunho inicial da tabela `lead_audit_events`;
- rascunho inicial da RPC `create_manual_lead`;
- primeira versão do módulo `src/lib/leads/lead-authorization.server.ts`;
- primeira versão das 35 specs do boundary de transição
  (`src/lib/leads/__tests__/lead-transition.spec.ts`), herdadas da
  PR-M1 e preservadas.

Todos esses artefatos foram substituídos, endurecidos ou reescritos
pela LSH-01. Nenhum deles é autoridade vigente.

## 5. Obrigações transferidas

Nenhuma obrigação da LSO-01 permanece sem destino. As obrigações
estruturais migraram integralmente para a LSH-01. As provas
operacionais reais sob sessões multi-usuário migraram integralmente
para a LSV-01.

## 6. Matriz final de transferência

| Obrigação | Destino | Estado |
|-----------|---------|--------|
| Boundary TypeScript | LSH-01 | Materialized |
| Integração das server functions | LSH-01 | Materialized |
| Hardening de `create_manual_lead` | LSH-01 | Materialized |
| Hardening de `lead_audit_events` | LSH-01 | Materialized |
| Testes determinísticos | LSH-01 | Materialized |
| Live grants e RLS | LSV-01 | Planned |
| Multi-JWT attack matrix | LSV-01 | Planned |
| Impersonation runtime multi-sessão | LSV-01 | Planned |
| Rollback operacional | LSV-01 | Planned |

## 7. Encerramento definitivo

A LSO-01 está definitivamente encerrada como Rejected. Não será
reaberta e não admite novo ciclo corretivo.
