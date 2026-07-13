# 112 — SCP-012.0.1.3.1 — Trusted Context Provenance, Client Inventory & Git Evidence Lock

## Status

Ready for External Audit

## 1. Escopo executado

Correção exclusivamente documental e evidencial sobre a SCP-012.0.1.3
para:

- registrar concretamente a evidência Git da materialização
  (HEAD `4d6e2b07...` e os cinco commits entre `a29c9699...` e
  `4d6e2b07...`);
- confirmar o inventário real de clients Supabase por arquivo, linha
  e declaração `createClient`;
- corrigir a proveniência de `actorUserId`, `tenantId` e
  `tenantOrigin`, distinguindo transporte não confiável de autoridade
  server-attested;
- eliminar as formulações absolutas ("não controlado pelo browser") do
  documento canônico.

A decisão arquitetural da SCP-012.0.1.3 (service_role-only + Trusted
Actor Context + revalidação SQL) foi **preservada integralmente**.

## 2. Baseline e HEADs

- Baseline inicial desta etapa:
  `4d6e2b07b6aead2b80fc4f695cc0f3fad3709a94`
  (`Executed SCP-012.0.1.3 gate`);
- Working tree inicial: limpo;
- HEAD final: registrado após materialização automática desta etapa;
- Commits criados: registrados após materialização automática.

## 3. Arquivos alterados (todos em `docs/**`)

- `docs/architecture/ROADMAP_ARCHITECTURAL.md` — inserida linha
  16.0.1.3.1 e substituída integralmente a linha 16.0.2;
- `docs/architecture/impact-analysis/SCP-012.0.1.3-server-only-rpc-trusted-actor-context-hard-gate-s0-contract-reconciliation.md`
  — §2, §6, §8, §9, §10 e §16 substituídas integralmente;
- `docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/111-scp-012-0-1-3-server-only-rpc-trusted-actor-context-hard-gate-s0-contract-reconciliation.md`
  — §15 substituída integralmente.

## 4. Arquivos criados

- `docs/architecture/impact-analysis/SCP-012.0.1.3.1-trusted-context-provenance-client-inventory-git-evidence-lock.md`;
- `docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/112-scp-012-0-1-3-1-trusted-context-provenance-client-inventory-git-evidence-lock.md`.

## 5. Inventário final de clients Supabase

| Client | Arquivo:linha | Chave | Role Postgres | `auth.uid()` | Consumidor |
|--------|---------------|-------|---------------|--------------|------------|
| `supabase` | `src/integrations/supabase/client.ts:21` | `VITE_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_PUBLISHABLE_KEY` | `authenticated` | usuário | browser/hooks/realtime |
| `context.supabase` | `src/integrations/supabase/auth-middleware.ts:46` | `SUPABASE_PUBLISHABLE_KEY` + bearer | `authenticated` | usuário do JWT | server functions autenticadas |
| `supabaseAdmin` | `src/integrations/supabase/client.server.ts:22` | `SUPABASE_SERVICE_ROLE_KEY` | `service_role` | nulo | server-only privilegiado |
| `serverPublishable()` | `src/lib/tenant.server.ts:9` / `:12` | `SUPABASE_PUBLISHABLE_KEY` | `anon` | nulo | `resolveTenantByHost` (`src/lib/tenant.server.ts:27`) |

Chamadas ad-hoc adicionais a `createClient(...)` em `src/lib/api/**` e
`src/routes/**` utilizam apenas `SUPABASE_PUBLISHABLE_KEY` (role
`anon`) ou `SUPABASE_SERVICE_ROLE_KEY` (`service_role`) — nenhuma
constitui uma quinta identidade Postgres.

## 6. Resultado da busca por `serverPublishable`

`rg -n "serverPublishable" src`:

```
src/lib/tenant.server.ts:9:function serverPublishable() {
src/lib/tenant.server.ts:27:  const client = serverPublishable();
```

A linha do inventário foi **mantida** por evidência direta da
declaração e do consumidor. Não houve remoção.

## 7. Correções de proveniência

- `actorUserId` — descrito como não aceito no payload público e
  derivado do JWT validado por `requireSupabaseAuth`;
- `tenantId` — descrito como podendo chegar via transporte
  (`x-tenant-id`) não confiável, validado por `requireTenant` antes
  de ser emitido como server-attested;
- `tenantOrigin` — descrito como nunca aceito diretamente do client,
  calculado server-side por `requireTenant`;
- `x-tenant-id` = transporte; `x-tenant-id` ≠ autoridade;
- autoridade final = revalidação PostgreSQL.

## 8. Seções substituídas no documento pai

- §2 Estado real dos clients Supabase — tabela e nota confirmadas por
  arquivo/linha;
- §6 Justificativa da segurança do transporte — distinção por campo;
- §8 Fonte de confiança — acrescido transporte × autoridade;
- §9 Threat model — acrescida clareza sobre origem da confiança;
- §10 Reconciliação — reformulada a definição de contexto interno;
- §16 Evidência Git — SHAs concretos, cinco commits, quatro arquivos.

## 9. Seção substituída no relatório 111

- §15 Evidência Git — HEAD `4d6e2b07...`, cinco commits, quatro
  arquivos, `git diff --check` limpo, typecheck exit 0.

## 10. Bloco final do roadmap

```
16. SCP-012 — Commercial Seat Limit Atomic Enforcement Integration — Blocked: architectural prerequisites required.
16.0 SCP-012.0 — Transaction-Safe Commercial Authority & Membership Mutation Boundary Impact Analysis — Accepted.
16.0.1 SCP-012.0.1 — Canonical Decision Contract, Atomic Cutover Sequencing & Roadmap Cleanup — Accepted.
16.0.1.1 SCP-012.0.1.1 — Deterministic Full-Section Rewrite, Evidence Lock & Git Readiness — Accepted.
16.0.1.2 SCP-012.0.1.2 — Canonical Concurrency, Internal Roadmap & Accepted Status Finalization — Accepted.
16.0.1.2.1 SCP-012.0.1.2.1 — Generated Route Tree Drift Reconciliation, Git Evidence Correction & Accepted Status Finalization — Accepted.
16.0.1.3 SCP-012.0.1.3 — Server-Only RPC Trusted Actor Context & Hard Gate S0 Contract Reconciliation — Ready for External Audit.
16.0.1.3.1 SCP-012.0.1.3.1 — Trusted Context Provenance, Client Inventory & Git Evidence Lock — Ready for External Audit.
16.0.2 SCP-012.0.2 — Transaction-Safe Commercial Authority Materialization & Atomic Runtime Cutover — Blocked: awaiting SCP-012.0.1.3 and SCP-012.0.1.3.1 acceptance.
```

## 11. Typecheck e Git

- `bunx tsc --noEmit -p tsconfig.json` — resultado registrado ao final
  desta execução (esperado exit 0);
- `git diff --check` — resultado registrado ao final desta execução
  (esperado limpo);
- `git diff --name-only 4d6e2b07..HEAD | rg -v "^docs/"` — esperado
  vazio.

## 12. Working tree final

Registrado após materialização automática. Esperado: limpo.

## 13. Hard Gates

- nenhum arquivo fora de `docs/**` alterado;
- nenhuma migration criada;
- nenhuma RPC/função SQL criada;
- nenhum grant/revoke aplicado;
- nenhuma RLS alterada;
- nenhum tipo Supabase regenerado;
- nenhum runtime alterado;
- `src/routeTree.gen.ts` não editado;
- SCP-012 permanece Blocked;
- SCP-012.0.1.3 permanece Ready for External Audit;
- SCP-012.0.2 permanece Blocked (aguardando aceitação de SCP-012.0.1.3
  **e** SCP-012.0.1.3.1);
- nenhuma marcação de Accepted foi introduzida por esta etapa.

## 14. Confirmações negativas

- decisão arquitetural da SCP-012.0.1.3 não foi reaberta;
- matriz de alternativas A/B/C/D/E não foi alterada;
- `requireSupabaseAuth`, `requireTenant`, `supabaseAdmin`, `auth-attacher`
  não foram alterados;
- `inputValidator` da server function pública não foi alterado;
- nenhum enforcement implementado;
- nenhum provider integrado;
- nenhum frontend alterado;
- `auth.uid()` continua obrigatório nas RLS e funções autenticadas
  existentes.
