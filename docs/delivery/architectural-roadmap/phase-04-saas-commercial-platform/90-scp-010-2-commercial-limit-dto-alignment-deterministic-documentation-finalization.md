# SCP-010.2 — Commercial Limit DTO Alignment & Deterministic Documentation Finalization — Relatório de execução

## Status

Ready for External Audit

## 1. Arquivos criados

- `docs/architecture/impact-analysis/SCP-010.2-commercial-limit-dto-alignment-deterministic-documentation-finalization.md`
- `docs/delivery/phase-04-saas-commercial-platform/90-scp-010-2-commercial-limit-dto-alignment-deterministic-documentation-finalization.md` (este relatório)

## 2. Arquivos alterados

- `docs/architecture/impact-analysis/SCP-010-commercial-seat-limit-runtime-contract-planning.md` — **substituído integralmente**.
- `docs/architecture/impact-analysis/SCP-010.1-authoritative-membership-domain-verification-contract-determinism-roadmap-cleanup.md` — edição mínima (§6/§7/§9).
- `docs/architecture/ROADMAP_ARCHITECTURAL.md` — inclusão de `14.2 SCP-010.2`.

## 3. Estado anterior confirmado

Antes de qualquer edição:

```
$ grep -c '^# SCP-010 ' docs/architecture/impact-analysis/SCP-010-commercial-seat-limit-runtime-contract-planning.md
1
$ grep -c '^## Status$' docs/architecture/impact-analysis/SCP-010-commercial-seat-limit-runtime-contract-planning.md
1
$ rg -n 'Ready for External Audit \(consolidado|within_limit|tenant_entitlement|plan_entitlement' <arquivo>
5:Ready for External Audit (consolidado pela SCP-010.1).
41:- `public.tenant_entitlements` — ...
45:- `public.commercial_plan_entitlements` — ...
151:| `value_int` finito ... | within_limit / limit_reached |
161:| ... | within_limit / limit_reached | tenant_entitlement | ... |
162:| ... | within_limit / limit_reached | plan_entitlement | ... |
```

Status duplicado formal não existia (heading único), mas a linha
de status trazia sufixo proibido e a matriz continha valores
inválidos. Conteúdo antigo removido.

## 4. DTO final (canônico, SCP-009)

`entitled | not_entitled | limit_reached | billing_unknown |
billing_attention_required | billing_blocked | not_evaluated`.
`source: tenant | plan | default | none`.
`requestedIncrement`: default `1`; único valor aceito `1`.

## 5. Mapeamento de source

`override → tenant`; `plan → plan`; `system → default`; ausência →
`none`. Referência real: migration
`20260708223211_*` (`CHECK source IN ('plan','override','system')`).

## 6. Mapeamento de billing

Propagação literal de `getCommercialFeatureDecision` /
`decideCommercialFeature` / `getTenantBillingHealth`
(`src/lib/api/commercial/feature-gate.ts`,
`commercial.functions.ts`, `read-models.ts`). Nenhuma reinterpretação
isolada dos status de subscription.

## 7. Estratégia contra dual-path

Alternativa A adotada: reuso do resolver comercial autoritativo
para extração do valor numérico. Reimplementação independente da
precedência tenant/plan/default/none proibida. Alternativa B
(resolver compartilhado server-only) fica como pré-requisito
opcional caso a SCP-011 exija refatoração.

## 8. Roadmap final

```
13. SCP-009 — ... — Accepted.
14. SCP-010 — ... — Ready for External Audit.
14.1 SCP-010.1 — ... — Ready for External Audit.
14.2 SCP-010.2 — ... — Ready for External Audit.
15. SCP-011 — ... — próxima etapa futura planejada; não iniciada.
```

## 9. Testes e verificações

Comandos e exit codes reais em §12.

## 10. Buscas documentais

- Termos proibidos no documento SCP-010 após substituição: **0
  ocorrências**.
- Termos do DTO canônico presentes no documento SCP-010.
- Roadmap com exatamente uma entrada por etapa `SCP-010`,
  `SCP-010.1`, `SCP-010.2`, `SCP-011`.

## 11. Confirmações negativas

Nenhum código de produção, migration, tabela, coluna, enum,
constraint, índice, RPC, SQL function, trigger, RLS policy, grant,
mutation, frontend, provider, checkout, webhook, billing real ou
enforcement foi criado ou alterado. Nenhum DTO TypeScript
materializado. `limit_reached` não emitido em runtime.
`storage.media_limit` fora de escopo. SCP-011 e SCP-012 não
iniciadas.

## 12. Execuções

Registradas na etapa de verificação subsequente deste relatório
(§20 das instruções da SCP-010.2), com `set -o pipefail`, captura
de exit code separada por comando, e asserts documentais.
