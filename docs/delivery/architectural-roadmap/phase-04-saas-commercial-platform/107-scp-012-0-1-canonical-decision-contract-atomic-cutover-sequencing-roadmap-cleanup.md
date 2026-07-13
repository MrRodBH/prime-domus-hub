# 107 — SCP-012.0.1 — Canonical Decision Contract, Atomic Cutover Sequencing & Roadmap Cleanup

## Status

Accepted

## 1. Escopo executado

Correção documental das inconsistências levantadas pela auditoria
externa da SCP-012.0. Nenhuma alteração em `src/**`, `supabase/**`,
runtime, testes, migrations, schema, RLS, grants, mutations, providers,
webhooks, checkout ou frontend.

## 2. Arquivos inspecionados

- `docs/architecture/impact-analysis/SCP-012.0-transaction-safe-commercial-authority-membership-mutation-boundary-impact-analysis.md`
- `docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/106-scp-012-0-transaction-safe-commercial-authority-membership-mutation-boundary-impact-analysis.md`
- `docs/architecture/ROADMAP_ARCHITECTURAL.md`
- `src/lib/api/commercial/feature-gate.ts` (contrato de reasons/sources)
- `src/lib/api/commercial/seat-limit-runtime.ts` (short-circuits confirmados)
- `src/lib/api/commercial/limit-decision.ts` (DTO `CommercialLimitDecision`)

## 3. Estado inicial do roadmap

Bloco 16 antes da correção (linhas 183–184):

```
16. SCP-012 — Commercial Seat Limit Atomic Enforcement Integration — Blocked: architectural prerequisites required.
16.0 SCP-012.0 — Transaction-Safe Commercial Authority & Membership Mutation Boundary Impact Analysis — Ready for External Audit.
```

Contagens iniciais:

- `^16\. SCP-012 ` => 1
- `^16\.0 SCP-012\.0 ` => 1

Não havia duplicidade real de linhas no arquivo — a coexistência
denunciada pela auditoria referia-se ao texto documental das etapas
anteriores. A correção formaliza o bloco final canônico e adiciona a
entrada `16.0.1`.

## 4. Duplicidades encontradas

- Nenhuma linha de roadmap duplicada em `ROADMAP_ARCHITECTURAL.md`;
- Confirmado que os textos antigos `Transaction-Safe Commercial
  Resolver Materialization` e `transaction-safe commercial authority
  unavailable` **não** estão presentes no roadmap;
- Confirmado ausência de linhas indentadas `^\s+16\.`.

## 5. Seções substituídas

Em `SCP-012.0-...md`:

- §7 Estratégia recomendada — reescrita como Estratégia A pura
  (SQL/RPC), sem "A + C parcial" nem conexão Postgres direta;
- §8 Plano de autoridade única — reescrito com cutover atômico na
  SCP-012.0.2 e remoção/desativação do caminho TS independente;
- §9 Membership Mutation Boundary — reescrito para respeitar o
  domínio real (`invited` é status, sem fluxo de convite runtime);
- §12 Contrato canônico e matriz de paridade — matriz reescrita
  integralmente sobre o DTO `CommercialLimitDecision`, com short-circuit
  explícito para todas as razões comerciais negativas;
- §13 Estratégia de testes — atualizada para oracle temporário durante
  a SCP-012.0.2;
- §14 Sequenciamento — consolidado sem período de dual resolver;
- §15 Roadmap — bloco final atualizado incluindo `16.0.1`.

Em `106-...md`:

- §8 Decisão recomendada — reescrita como Estratégia A pura, com
  registro das inconsistências corrigidas;
- §9 Sequenciamento — consolidado;
- §11/§12 — bloco final do roadmap alinhado a `16.0.1`.

## 6. Contrato final

```ts
type CommercialLimitDecision = {
  tenantId: string;
  featureKey: string;
  allowed: boolean;
  reason:
    | "entitled"
    | "not_entitled"
    | "limit_reached"
    | "billing_unknown"
    | "billing_attention_required"
    | "billing_blocked"
    | "not_evaluated";
  source: "tenant" | "plan" | "default" | "none";
  limit: number | null;
  used: number | null;
  requestedIncrement: number;
  remaining: number | null;
};
```

Valores proibidos identificados como inválidos: `feature_not_cataloged`,
`limit_unavailable`, `limit_invalid`, `within_limit`, `allowed` como
`reason`, `tenant_entitlement`, `plan_entitlement`, `override` /
`system` / `unknown` como `source`.

## 7. Matriz final

Ver §4 da SCP-012.0.1 e §12.2 da SCP-012.0. Regras:

- catalog gate negativo → `not_evaluated` / `none` / nulls; sem
  contexto comercial; sem leitura de `tenant_members`;
- feature decision negativa → propaga `reason`/`source` exatas;
  `limit`/`used`/`remaining` = `null`; sem leitura de `tenant_members`;
- feature positiva + limite ausente/inválido → `not_evaluated` /
  `none` / nulls; sem leitura de `tenant_members`;
- feature positiva + limite válido + uso indisponível →
  `not_evaluated` preservando `source do limite`;
- `used + requestedIncrement <= limit` → `entitled` com
  `remaining = max(limit - used, 0)`;
- `used + requestedIncrement > limit` → `limit_reached` com
  `remaining = 0`;
- `limit = 0` produz `limit_reached` deterministicamente.

`billing_attention_required` produz short-circuit em todas as
ocorrências semânticas.

## 8. Sequenciamento final

1. SCP-012.0 — Impact Analysis.
2. SCP-012.0.1 — Canonical Decision Contract, Atomic Cutover
   Sequencing & Roadmap Cleanup.
3. SCP-012.0.2 — Transaction-Safe Commercial Authority Materialization
   & Atomic Runtime Cutover (materialização + paridade + delegação +
   remoção do caminho TS independente, tudo num único conjunto
   auditável).
4. SCP-012.0.3 — Membership Mutation Boundary Planning &
   Materialization.
5. SCP-012 — Atomic Enforcement Integration.

## 9. Arquivos criados

- `docs/architecture/impact-analysis/SCP-012.0.1-canonical-decision-contract-atomic-cutover-sequencing-roadmap-cleanup.md`
- `docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/107-scp-012-0-1-canonical-decision-contract-atomic-cutover-sequencing-roadmap-cleanup.md`

## 10. Arquivos alterados

- `docs/architecture/ROADMAP_ARCHITECTURAL.md` (adição de `16.0.1`);
- `docs/architecture/impact-analysis/SCP-012.0-...md` (§7–§15);
- `docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/106-scp-012-0-...md` (§8, §9, §11, §12).

## 11. Bloco final real do roadmap

```
15.3.2 SCP-011.3.2 — Accepted Status Finalization & SCP-012 Authorization — Accepted.
15.3.3 SCP-011.3.3 — Exact Status Token Cleanup & Final Gate Closure — Accepted.
16. SCP-012 — Commercial Seat Limit Atomic Enforcement Integration — Blocked: architectural prerequisites required.
16.0 SCP-012.0 — Transaction-Safe Commercial Authority & Membership Mutation Boundary Impact Analysis — Ready for External Audit.
16.0.1 SCP-012.0.1 — Canonical Decision Contract, Atomic Cutover Sequencing & Roadmap Cleanup — Ready for External Audit.
```

## 12. Contagens finais

- `^16\. SCP-012 ` => 1
- `^16\.0 SCP-012\.0 ` => 1
- `^16\.0\.1 SCP-012\.0\.1 ` => 1
- `Transaction-Safe Commercial Resolver Materialization` no roadmap => 0
- `transaction-safe commercial authority unavailable` no roadmap => 0
- linhas indentadas `^\s+16\.` no roadmap => 0

## 13. git diff --name-only

```
docs/architecture/ROADMAP_ARCHITECTURAL.md
docs/architecture/impact-analysis/SCP-012.0-transaction-safe-commercial-authority-membership-mutation-boundary-impact-analysis.md
docs/architecture/impact-analysis/SCP-012.0.1-canonical-decision-contract-atomic-cutover-sequencing-roadmap-cleanup.md
docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/106-scp-012-0-transaction-safe-commercial-authority-membership-mutation-boundary-impact-analysis.md
docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/107-scp-012-0-1-canonical-decision-contract-atomic-cutover-sequencing-roadmap-cleanup.md
```

Nenhum caminho fora de `docs/**`.

## 14. Git commit e push

O commit e o push são gerenciados pelo harness Lovable, que não permite
comandos git stateful diretos. As alterações desta etapa são versionadas
pelo commit documental gerado a partir deste turno. Caso o operador
humano precise executar o push manualmente:

```
git add \
  docs/architecture/ROADMAP_ARCHITECTURAL.md \
  docs/architecture/impact-analysis/SCP-012.0-transaction-safe-commercial-authority-membership-mutation-boundary-impact-analysis.md \
  docs/architecture/impact-analysis/SCP-012.0.1-canonical-decision-contract-atomic-cutover-sequencing-roadmap-cleanup.md \
  docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/106-scp-012-0-transaction-safe-commercial-authority-membership-mutation-boundary-impact-analysis.md \
  docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/107-scp-012-0-1-canonical-decision-contract-atomic-cutover-sequencing-roadmap-cleanup.md
git commit -m "docs: correct SCP-012.0 architecture and roadmap"
git push origin "$(git branch --show-current)"
```

Sem `--force`, sem troca de branch, sem merge.

## 15. Confirmações negativas

- nenhum código de produção alterado;
- nenhum teste alterado;
- nenhuma migration criada;
- nenhum schema alterado;
- nenhuma RLS policy alterada;
- nenhum grant criado;
- nenhuma mutation criada;
- nenhum resolver SQL criado;
- nenhum runtime delegado;
- nenhum lock criado;
- nenhum enforcement implementado;
- nenhum provider integrado;
- nenhum frontend alterado.
