# 111 — SCP-012.0.1.3 — Server-Only RPC Trusted Actor Context & Hard Gate S0 Contract Reconciliation

## Status

Ready for External Audit

## 1. Escopo executado

Impact Analysis corretiva para reconciliar a incompatibilidade
identificada no Hard Gate S0 da tentativa de execução da SCP-012.0.2:

- `auth.uid()` obrigatório dentro de RPC executável exclusivamente por
  `service_role` é incompatível com a infraestrutura Supabase atual;
- nenhum client existente satisfaz simultaneamente `auth.uid()`
  genuíno + identidade Postgres `service_role`.

A etapa é exclusivamente documental e arquitetural. Nenhum código,
migration, RPC, função SQL, grant, revoke, RLS, teste, tipo Supabase,
frontend, provider, checkout ou webhook foi alterado.

## 2. Documentos autoritativos lidos

- `docs/architecture/impact-analysis/SCP-012-commercial-seat-limit-atomic-enforcement-integration.md`
- `docs/architecture/impact-analysis/SCP-012.0-transaction-safe-commercial-authority-membership-mutation-boundary-impact-analysis.md`
- `docs/architecture/impact-analysis/SCP-012.0.1-canonical-decision-contract-atomic-cutover-sequencing-roadmap-cleanup.md`
- `docs/architecture/impact-analysis/SCP-012.0.1.1-deterministic-full-section-rewrite-evidence-lock-git-readiness.md`
- `docs/architecture/impact-analysis/SCP-012.0.1.2-canonical-concurrency-internal-roadmap-accepted-status-finalization.md`
- `docs/architecture/impact-analysis/SCP-012.0.1.2.1-generated-route-tree-drift-reconciliation-git-evidence-correction-accepted-status-finalization.md`
- `src/integrations/supabase/client.server.ts`
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/auth-middleware.ts`
- `src/integrations/supabase/auth-attacher.ts`
- `src/integrations/supabase/tenant-middleware.ts`
- `src/integrations/supabase/tenant-repository.ts`
- `src/integrations/supabase/types.ts`
- `src/lib/api/commercial/commercial.functions.ts`
- `src/lib/api/commercial/limit-decision.ts`
- `src/lib/api/commercial/seat-limit-runtime.ts`
- `src/lib/api/commercial/seat-usage-reader.ts`

## 3. Decisão recomendada

**Alternativa A — service_role-only + Trusted Actor Context.**

- RPC continua service_role-only (`REVOKE` de `PUBLIC`/`anon`/
  `authenticated`; `GRANT EXECUTE` somente a `service_role`);
- server function autenticada deriva `actorUserId`, `tenantId` e
  `tenantOrigin` internamente via `requireSupabaseAuth` +
  `requireTenant`;
- esses campos são transportados como parâmetros **internos** da RPC,
  nunca aceitos pelo `inputValidator` público;
- Postgres revalida contexto contra o estado persistente
  (`tenant_members`, `user_roles`, `tenants`);
- `auth.uid()` **não** é utilizado como identidade do ator dentro da
  RPC service_role-only — reconciliação escopada à cadeia SCP-012.

Detalhes normativos integrais no documento canônico:
`docs/architecture/impact-analysis/SCP-012.0.1.3-server-only-rpc-trusted-actor-context-hard-gate-s0-contract-reconciliation.md`.

## 4. Contrato público (server function)

Aceita somente:

```
undefined | {} | { requestedIncrement: 1 }
```

Rejeitados pelo `inputValidator`: `actorUserId`, `tenantId`,
`tenantOrigin`, `isSuperAdmin`, `impersonation`, `featureKey`, `limit`,
`used`, `remaining`, `source`, `billingStatus`, `CommercialLimitDecision`,
`CommercialFeatureDecision`.

## 5. Contrato interno (RPC)

Parâmetros server-attested, não expostos ao client:

- `actorUserId = context.userId`
- `tenantId = context.tenant.tenantId`
- `tenantOrigin = context.tenant.origin` ∈
  `{ 'impersonation', 'selection', 'single-membership' }`
- `requestedIncrement` (validado pelo `inputValidator` público)

Não transportados: `isSuperAdmin`, `allowed`, `reason`, `limit`,
`used`, `remaining`, decisão de billing.

## 6. Revalidação SQL futura

Usuário comum: sem role `super_admin`; `tenantOrigin ∈ { selection,
single-membership }`; membership ativa em `tenant_members`.

Super Admin: role `super_admin` em `user_roles`; `tenantOrigin =
'impersonation'`; sem membership comum como substituto.

Rejeitados: Super Admin com selection/single-membership; usuário comum
com impersonation; membership suspended/revoked; tenant/actor
inexistente; origin inválida.

## 7. Contrato de grants (documentado)

```sql
REVOKE ALL ON FUNCTION <assinatura_real> FROM PUBLIC;
REVOKE ALL ON FUNCTION <assinatura_real> FROM anon;
REVOKE ALL ON FUNCTION <assinatura_real> FROM authenticated;
GRANT  EXECUTE ON FUNCTION <assinatura_real> TO service_role;
```

## 8. Threat model

- browser não confiável; server function autenticada é boundary
  confiável; `service_role` é segredo de backend;
- comprometimento da `service_role` = comprometimento total do
  backend, não mitigado por `auth.uid()`;
- revalidação SQL protege contra erros de integração e uso
  cross-tenant, não contra comprometimento integral do servidor.

## 9. Impacto sobre SCP-012.0.2

SCP-012.0.2 permanece **bloqueada** aguardando aceitação externa desta
etapa. A materialização futura deverá seguir integralmente §5–§11 do
documento canônico SCP-012.0.1.3.

## 10. Arquivos criados

- `docs/architecture/impact-analysis/SCP-012.0.1.3-server-only-rpc-trusted-actor-context-hard-gate-s0-contract-reconciliation.md`
- `docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/111-scp-012-0-1-3-server-only-rpc-trusted-actor-context-hard-gate-s0-contract-reconciliation.md`

## 11. Arquivos alterados

- `docs/architecture/ROADMAP_ARCHITECTURAL.md` (linha 189 substituída
  por bloco 16.0.1.3 + 16.0.2);
- `docs/architecture/impact-analysis/SCP-012.0-transaction-safe-commercial-authority-membership-mutation-boundary-impact-analysis.md`
  (§11 Segurança substituída integralmente, preservando hardening SQL
  e contrato de grants, e adicionando a reconciliação de identidade
  server-attested).

## 12. Bloco final do roadmap aplicado

```
16. SCP-012 — Commercial Seat Limit Atomic Enforcement Integration — Blocked: architectural prerequisites required.
16.0 SCP-012.0 — Transaction-Safe Commercial Authority & Membership Mutation Boundary Impact Analysis — Accepted.
16.0.1 SCP-012.0.1 — Canonical Decision Contract, Atomic Cutover Sequencing & Roadmap Cleanup — Accepted.
16.0.1.1 SCP-012.0.1.1 — Deterministic Full-Section Rewrite, Evidence Lock & Git Readiness — Accepted.
16.0.1.2 SCP-012.0.1.2 — Canonical Concurrency, Internal Roadmap & Accepted Status Finalization — Accepted.
16.0.1.2.1 SCP-012.0.1.2.1 — Generated Route Tree Drift Reconciliation, Git Evidence Correction & Accepted Status Finalization — Accepted.
16.0.1.3 SCP-012.0.1.3 — Server-Only RPC Trusted Actor Context & Hard Gate S0 Contract Reconciliation — Ready for External Audit.
16.0.2 SCP-012.0.2 — Transaction-Safe Commercial Authority Materialization & Atomic Runtime Cutover — Blocked: awaiting SCP-012.0.1.3 acceptance.
```

## 13. Hard Gates

- nenhuma migration criada;
- nenhuma RPC criada;
- nenhuma função SQL criada;
- nenhum grant/revoke aplicado;
- nenhuma RLS alterada;
- nenhum tipo Supabase regenerado;
- nenhum arquivo em `src/**`, `supabase/**`, `tests/**` alterado;
- `package.json`, `tsconfig.json` inalterados;
- `src/routeTree.gen.ts` não editado manualmente;
- SCP-012 permanece Blocked;
- SCP-012.0.2 permanece bloqueada aguardando aceitação.

## 14. Confirmações negativas

- nenhum código de produção alterado;
- nenhum teste alterado;
- nenhuma mutation criada;
- nenhum lock criado;
- nenhum enforcement implementado;
- nenhum provider integrado;
- nenhum frontend alterado;
- `auth.uid()` não foi removido como conceito global do projeto;
- `actorUserId`/`tenantId`/`tenantOrigin` **não** são permitidos no
  payload público;
- `service_role` permanece o único executor futuro autorizado da RPC.

## 15. Evidência Git

- Baseline anterior:
  `a29c9699ebe71ae9f5478a857856836678361571` (SCP-012.0.1.2.1
  materializada);
- HEAD concreto da materialização SCP-012.0.1.3:
  `4d6e2b07b6aead2b80fc4f695cc0f3fad3709a94`
  (`Executed SCP-012.0.1.3 gate`);
- Working tree inicial: limpo;
- Working tree final da materialização: limpo em
  `4d6e2b07b6aead2b80fc4f695cc0f3fad3709a94`;
- Quantidade de commits entre baseline e HEAD: **5**;
- Cinco commits (`git log --reverse --format="%H %s"
  a29c9699..4d6e2b07`):

  ```
  0da928e957df30315203a5c1ae79ad126cc30d12 Changes
  8e715f13dc434ad6833197533835f5ef0953b210 Changes
  fd2c59224f68ce32e85410a0852581a560eeb02c Changes
  876ea8e561c685a452ce1b5f8ef36d0b7dc0b049 Changes
  4d6e2b07b6aead2b80fc4f695cc0f3fad3709a94 Executed SCP-012.0.1.3 gate
  ```

- Quatro arquivos alterados/criados, todos em `docs/**`
  (`git diff --name-status a29c9699..4d6e2b07`):

  ```
  M  docs/architecture/ROADMAP_ARCHITECTURAL.md
  M  docs/architecture/impact-analysis/SCP-012.0-transaction-safe-commercial-authority-membership-mutation-boundary-impact-analysis.md
  A  docs/architecture/impact-analysis/SCP-012.0.1.3-server-only-rpc-trusted-actor-context-hard-gate-s0-contract-reconciliation.md
  A  docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/111-scp-012-0-1-3-server-only-rpc-trusted-actor-context-hard-gate-s0-contract-reconciliation.md
  ```

- Nenhum arquivo fora de `docs/**` alterado entre `a29c9699` e
  `4d6e2b07`;
- `git diff --check` da materialização: limpo;
- Typecheck da materialização (`bunx tsc --noEmit -p tsconfig.json`):
  exit 0.
