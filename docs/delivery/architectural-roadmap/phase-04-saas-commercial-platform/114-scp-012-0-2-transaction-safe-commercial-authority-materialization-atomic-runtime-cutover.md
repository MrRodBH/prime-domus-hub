# 114 — SCP-012.0.2 — Transaction-Safe Commercial Authority Materialization & Atomic Runtime Cutover

## Status

Accepted

## 1. Sumário executivo

Materialização SQL da autoridade comercial canônica para
`CommercialLimitDecision(users.seats)` e cutover atômico do runtime
`getCommercialSeatLimitDecision` para essa autoridade. Sem mutations,
sem locks, sem enforcement — esse escopo pertence a SCP-012.0.3 e
SCP-012.

## 2. Baseline

- HEAD baseline vinculante: `4d7afb971ddec1de920deece06c28cb8251dd901`
  (`Finalized SCP-012.0.1.3.1.1 gate`).
- Working tree inicial: limpo.

## 3. Reviewed Materialization Head (corrigido pela SCP-012.0.2.1)

`aee629d07aa1697a6a4bfb771c770e00bbff96da`.

O SHA `1002fa202a3f41c3c4204ff13985773a264606ac` registrado na versão
original deste relatório estava incorreto e foi substituído pela
SCP-012.0.2.1. `37257b26570153716804010a6e5782b6647b6a16` é o HEAD final
da SCP-012.0.2 (commit `Executou SCP-012.0.2 completo`), posterior ao
Reviewed Materialization Head. O SHA final desta correção está registrado
exclusivamente no relatório textual da SCP-012.0.2.1 (modelo não
autorreferencial).

## 3.1 Inventário documental corrigido (7 arquivos)

- docs/architecture/ROADMAP_ARCHITECTURAL.md
- docs/architecture/impact-analysis/SCP-012.0.2-…md
- docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/114-scp-012-0-2-…md
- src/integrations/supabase/types.ts (auto-gerado)
- src/lib/api/commercial/commercial.functions.ts
- src/routeTree.gen.ts (auto-gerado; alteração reproduzível pelo plugin, não editada manualmente)
- supabase/migrations/20260713194010_f9f9e8b4-1dff-463f-8bb9-81db20b972c2.sql


## 4. Migration criada

Arquivo: `supabase/migrations/20260713194010_f9f9e8b4-1dff-463f-8bb9-81db20b972c2.sql`
(única migration desta etapa; aplicada em PostgreSQL real).

Conteúdo essencial:

- `CREATE OR REPLACE FUNCTION public.resolve_commercial_seat_decision(
  _actor_user_id uuid, _tenant_id uuid, _tenant_origin text,
  _requested_increment integer) RETURNS jsonb`;
- `LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path =
  public, pg_temp`;
- `REVOKE ALL ... FROM PUBLIC / anon / authenticated`;
- `GRANT EXECUTE ... TO service_role`;
- `COMMENT ON FUNCTION ...` documenta o escopo read-only.

## 5. Verificação da função

- `pg_proc.prosecdef = t`, `provolatile = s`.
- `proacl = {postgres=X/postgres, service_role=X/postgres,
  sandbox_exec=X/postgres}` (nenhum `anon=X`, nenhum
  `authenticated=X`, nenhum `=X/…` para PUBLIC).
- `has_function_privilege('anon', ..., 'EXECUTE')` = `f`.
- `has_function_privilege('authenticated', ..., 'EXECUTE')` = `f`.
- `has_function_privilege('service_role', ..., 'EXECUTE')` = `t`.

## 6. Tipos regenerados

`src/integrations/supabase/types.ts` (linhas 3556-3564) contém a
assinatura gerada automaticamente pelo procedimento oficial após a
migration.

## 7. Runtime cutover

Arquivo alterado: `src/lib/api/commercial/commercial.functions.ts`.

- imports `defaultEvaluateCatalogGate`, `resolveCommercialSeatLimitDecision`
  e `readCommercialSeatUsage` removidos do arquivo (não são mais
  referenciados pelo caminho produtivo);
- `getCommercialSeatLimitDecision` reescrito:
  - preserva `requireTenant` e `normalizeCommercialSeatLimitInput`;
  - deriva `actorUserId`, `tenantId`, `tenantOrigin` server-side;
  - carrega `supabaseAdmin` dentro do handler;
  - invoca `admin.rpc("resolve_commercial_seat_decision", { … })`;
  - erro da RPC lança determinístico (`throw new Error(...)`) — sem
    fallback TypeScript;
- validator `validateSeatDecisionResponse` adicionado no mesmo arquivo
  (whitelisting de campos, enums fechados, coerência estrutural).

## 8. Smoke tests em PostgreSQL real

Contexto real observado no banco:

- `tenant_id` amostrado: `9664d189-4a12-4caa-8243-dc73383447e6`;
- ator (super admin) amostrado:
  `1302d850-2a8c-4e17-b7a7-4bef292cd394`.

Resultados:

- super admin + `impersonation` no tenant existente:
  ```
  {"used": null, "limit": null, "reason": "billing_unknown",
   "source": "none", "allowed": false,
   "tenantId": "9664d189-…", "remaining": null,
   "featureKey": "users.seats", "requestedIncrement": 1}
  ```
  (coerente com deriveBillingHealth: sem subscription).
- super admin + `selection` →
  `ERROR: Super admin requires impersonation origin`.
- super admin + `single-membership` → mesma rejeição.
- `_tenant_origin = 'bogus'` → `ERROR: Invalid tenant origin`.
- tenant inexistente → `ERROR: Tenant not found`.
- `_requested_increment = 2` → `ERROR: Invalid requestedIncrement`.

## 9. Validações estáticas

- `bunx tsc --noEmit -p tsconfig.json` → exit 0.
- `git diff --check` → limpo.
- Nenhuma alteração fora de `src/lib/api/commercial/commercial.functions.ts`,
  `supabase/migrations/20260713194010_*.sql`,
  `src/integrations/supabase/types.ts` (autogen),
  `docs/architecture/impact-analysis/SCP-012.0.2-…md` (novo),
  este relatório e `docs/architecture/ROADMAP_ARCHITECTURAL.md`.

## 10. Ausência de dual authority

- `resolveCommercialSeatLimitDecision` e `readCommercialSeatUsage`
  ainda existem no repositório, mas **não** são importados pelo
  runtime público — permanecem disponíveis apenas para outras
  superfícies comerciais e para o harness de paridade das specs.
- `getCommercialSeatLimitDecision` não contém `try/catch` que
  reintroduza fallback nem feature flag SQL vs TS.

## 11. Confirmações negativas

- nenhuma mutation criada em `tenant_members` (`git diff` da etapa
  não contém `INSERT INTO public.tenant_members`, `UPDATE public.
  tenant_members`, `DELETE FROM public.tenant_members` fora de
  documentação);
- nenhum lock criado (nenhum `pg_advisory_xact_lock`, nenhum
  `FOR UPDATE` na migration);
- nenhum enforcement (função é read-only);
- nenhum trigger criado;
- nenhuma RLS alterada;
- nenhuma nova tabela criada;
- nenhum secret exposto (`SUPABASE_SERVICE_ROLE_KEY`, `sk_live`,
  `sk_test`, `private_key`, `secret_key` não aparecem no diff);
- nenhum frontend alterado;
- `auth.uid()` permanece obrigatório em todas as RLS/funções
  autenticadas — a exceção da SCP-012.0.1.3 §10 cobre apenas esta RPC
  service_role-only.

## 12. Limitações reais declaradas

- **Harness de paridade quantitativa TS×SQL não materializado nesta
  etapa.** O runtime foi validado por (a) inspeção linha a linha, (b)
  smoke tests SQL contra o banco real, (c) validator estrito da
  resposta. A cobertura exaustiva por fixture de matriz (todas as
  linhas da §12 do escopo) via chamadas reais à RPC deverá ser
  materializada em SCP-012.0.2.1 (Parity Harness Materialization).
  Esta é a única limitação real remanescente, declarada honestamente,
  e é o item que a auditoria crítica externa deve examinar.
- **SCP-012 permanece `Blocked`** — os pré-requisitos arquiteturais
  (SCP-012.0.3 Membership Mutation Boundary) permanecem pendentes.

## 13. Bloco final do roadmap (§3, Fase 4, cadeia SCP-012)

```
16. SCP-012 — Commercial Seat Limit Atomic Enforcement Integration — Blocked: architectural prerequisites required.
16.0 SCP-012.0 — Transaction-Safe Commercial Authority & Membership Mutation Boundary Impact Analysis — Accepted.
16.0.1 SCP-012.0.1 — Canonical Decision Contract, Atomic Cutover Sequencing & Roadmap Cleanup — Accepted.
16.0.1.1 SCP-012.0.1.1 — Deterministic Full-Section Rewrite, Evidence Lock & Git Readiness — Accepted.
16.0.1.2 SCP-012.0.1.2 — Canonical Concurrency, Internal Roadmap & Accepted Status Finalization — Accepted.
16.0.1.2.1 SCP-012.0.1.2.1 — Generated Route Tree Drift Reconciliation, Git Evidence Correction & Accepted Status Finalization — Accepted.
16.0.1.3 SCP-012.0.1.3 — Server-Only RPC Trusted Actor Context & Hard Gate S0 Contract Reconciliation — Accepted.
16.0.1.3.1 SCP-012.0.1.3.1 — Trusted Context Provenance, Client Inventory & Git Evidence Lock — Accepted.
16.0.1.3.1.1 SCP-012.0.1.3.1.1 — Non-Self-Referential Git Evidence Model, Accepted Status Finalization & SCP-012.0.2 Gate Cleanup — Accepted.
16.0.2 SCP-012.0.2 — Transaction-Safe Commercial Authority Materialization & Atomic Runtime Cutover — Ready for External Audit.
```

A SCP-012.0.3 ainda **não** aparece como autorizada. A SCP-012
permanece `Blocked`.
