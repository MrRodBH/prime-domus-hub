# Phase 4 Closing Review — SaaS Commercial Platform Formal Closure, Managed-Role Trust Boundary Reconciliation & Product Readiness Gate

**Status:** Accepted (external audit)
**Depends on:** IA-006 / ADR-005 / ADR-006 / F4.0 / SCP-001 … SCP-012
(all Accepted) and F4-CF-01 (Accepted, external audit).
**Blocks:** PR-PH.0 (Ready for External Audit) and homologation.

**Architectural Roadmap · Fase 4 — SaaS Commercial Platform —
Closed / Accepted.**

Nota de reconciliação: onde este documento e artefatos derivados
descrevem o contrato dos cenários de rejeição do harness, a leitura
correta do payload de sucesso ausente é `data == null` (ausência
canônica de payload) — a redação `data === null` deve ser lida com
essa semântica. Nenhum runtime, harness ou migration é alterado por
esta nota; a correção é exclusivamente redacional.

## 1. Baseline

- Working tree limpo na entrada (`git status --short` vazio).
- Último commit de entrada: `de84190 Closed F4-CF-01 harness gates`.
- Aceite externo formal recebido para **F4-CF-01**. Preservados como
  Accepted: **IA-006**, **ADR-005**, **ADR-006**, **F4.0**, **SCP-001
  a SCP-012** com todas as subetapas SCP-010.x / SCP-011.x / SCP-012.0.x.
- Nenhuma alteração de runtime produtivo, migrations, RLS, grants,
  schema, frontend, provider integrations, billing provider, checkout,
  webhooks ou customer portal foi executada por esta revisão.

## 2. Escopo da revisão

Este é um checkpoint de encerramento **exclusivamente documental**
sobre uma Fase cujos aceites arquiteturais estão consolidados.
Objetivos executados:

1. Materialização Accepted da F4-CF-01 nos três locais canônicos
   (impact analysis F4-CF-01, relatório 119, `ROADMAP_ARCHITECTURAL.md`).
2. Reconciliação formal da postura de ACL entre plano de aplicação e
   plano operacional gerenciado (`sandbox_exec` como exceção do trust
   boundary operacional, formalizada em `SECURITY_ARCHITECTURE.md §3.1`
   e F4-CF-01 §6.2).
3. Endurecimento do contrato strict dos seis cenários de rejeição do
   harness canônico (SQLSTATE obrigatório + mensagem por
   igualdade/prefixo canônico + ausência de payload híbrido de sucesso).
4. Auditoria integral da cadeia IA-006 → SCP-012 → F4-CF-01
   (documentação, migrations, banco, boundaries, testes).
5. Registro da PR-PH.0 como próximo bloco vinculante antes da
   homologação — não iniciado nesta revisão.

## 3. Escopo consolidado da Fase 4 (arquitetura aceita)

- **IA-006** — SaaS Commercial Platform Impact Analysis.
- **ADR-005** — Commercial Domain.
- **ADR-006** — Billing Provider Abstraction.
- **F4.0** — Role Reconciliation / Membership Role Audit.
- **SCP-001** — Commercial Domain Model.
- **SCP-002** — Billing Provider Abstraction Materialization.
- **SCP-003** — Commercial Read Models / Server-Side Access Planning.
- **SCP-004** — Commercial Server Read Functions.
- **SCP-005** — Commercial Entitlement Runtime Boundary Planning.
- **SCP-006** — Commercial Feature Gate Server Runtime.
- **SCP-007** — Commercial Feature Key Catalog Planning.
- **SCP-008** — Commercial Feature Key Catalog Materialization & Server Validation.
- **SCP-009** — Commercial Usage Limit Evaluation Planning.
- **SCP-010** — Commercial Seat Limit Runtime Contract & Read Model Planning (+ SCP-010.1…SCP-010.5.4).
- **SCP-011** — Commercial Seat Limit Server Runtime (+ SCP-011.1…SCP-011.3.3).
- **SCP-012** — Commercial Seat Limit Atomic Enforcement Integration (+ SCP-012.0…SCP-012.0.3).
- **F4-CF-01** — Phase 4 Repository Integrity, Documentation Placement & Runtime Consistency.

## 4. Modelo comercial materializado

- Domínio: `commercial_plans`, `commercial_plan_entitlements`,
  `commercial_entitlement_definitions`, `tenant_subscriptions`,
  `tenant_entitlements`, `tenant_billing_provider_mappings`,
  `billing_provider_definitions`, `billing_events`,
  `billing_event_transitions`.
- Runtime único de decisão: `public.resolve_commercial_seat_decision`
  (STABLE, SECURITY DEFINER, `search_path = public, pg_temp`).
- Runtime único de mutation com enforcement atômico:
  `public.mutate_tenant_membership` (SECURITY DEFINER,
  `search_path = public, pg_temp`, lock canônico `tenants FOR UPDATE`).
- Boundary server-only único: `membership-mutation-boundary.server.ts`.
- Parser fail-closed de negação comercial:
  `membership-mutation-enforcement-error.ts` (igualdade exata).
- Zero dual path, zero fallback TypeScript, zero enforcement
  pós-commit, zero recomputação comercial no client, zero direct
  client read das tabelas comerciais restritas.

## 5. Boundaries de runtime

- **Client → Server:** transporte apenas; nenhuma decisão de tenant,
  entitlement ou seat é aceita do cliente. `x-tenant-id` é intenção.
- **Server (authenticated) → Business:** `requireSupabaseAuth` +
  `requireTenant` produzem o Trusted Actor Context. Nenhuma leitura
  direta das tabelas comerciais restritas por rotas do produto.
- **Business → Database:** apenas `supabaseAdmin` (service_role)
  chama as duas RPCs; RLS + ACL bloqueiam todos os demais principais
  de aplicação.
- **Database → Business:** RPCs revalidam integralmente o Trusted
  Actor Context, bloqueiam owner mutation e retornam DTO whitelisted.

## 6. ACL física vs autoridade acessível à aplicação

A distinção formal está registrada em
`SECURITY_ARCHITECTURE.md §3.1` (Application trust boundary vs
Managed operational trust boundary) e detalhada em
`F4-CF-01 §6.1/§6.2`.

Resumo:

- **Application trust boundary — fechado:**
  `EXECUTE` em `resolve_commercial_seat_decision` e
  `mutate_tenant_membership` restrito a function owner (`postgres`)
  + `service_role`. `anon`, `authenticated`, `authenticator`,
  `PUBLIC` = sem privilégio. `tenant_members` = `authenticated` só
  `SELECT`. Nenhum principal de aplicação é membro de
  `sandbox_exec` (`pg_has_role` = false).
- **Managed operational trust boundary — aceito com dependência:**
  `sandbox_exec` é role operacional gerenciada pela plataforma
  (`bypassrls=t`, mas `superuser=f`, `createrole=f`, `createdb=f`,
  `replication=f`), assumível apenas por `postgres` e
  `supabase_admin`. Após a migration `20260714001218_*.sql`, a
  plataforma reprovisiona `EXECUTE` nas duas RPCs e
  `SELECT`+`INSERT` em `tenant_members` para essa role — evento
  externo à aplicação. Zero uso em `src/`, secrets, configuração
  ou frontend.

Ver F4-CF-01 §8.2 para o dump independente do catálogo.

## 7. RLS

- `tenant_members`: policies `tm_select` / `tm_write` escopadas a
  `authenticated`; sem grant público. Mutation por rota do produto
  só ocorre via `service_role` a partir do server boundary.
- Demais tabelas comerciais (`commercial_plans`,
  `commercial_plan_entitlements`, `tenant_subscriptions`,
  `tenant_entitlements`, `tenant_billing_provider_mappings`,
  `billing_events`, `billing_event_transitions`,
  `billing_provider_definitions`,
  `commercial_entitlement_definitions`): sem grant para `anon` /
  `authenticated`; leitura por rotas do produto passa pelas
  server functions dedicadas.
- Nenhuma policy foi criada, alterada ou removida nesta revisão.

## 8. Migrations

Nenhuma migration criada, alterada ou removida nesta revisão.
Reclosure fail-closed permanece em
`20260714001218_174dfdbe-2a4e-40ff-adbc-79068e369823.sql`. Migrations
anteriores (SCP-011.*, SCP-012.0.*, F4.0, SCP-001…SCP-010) permanecem
imutáveis com ordem temporal válida e nomes únicos.

## 9. Testes

Cinco runners cobrem o contrato aceito:

| Runner                                              | Foco                                             | Resultado |
|-----------------------------------------------------|--------------------------------------------------|-----------|
| `run-tenant-specs.ts`                               | tenant middleware + membership + comerciais unit | 233 / 0   |
| `run-membership-mutation-parity-specs.ts`           | boundary + ACL + paridade RPC                    | 14 / 0    |
| `run-commercial-seat-atomic-enforcement-specs.ts`   | concorrência + fail-closed                       | 10 / 0    |
| `run-commercial-sql-parity-specs.ts` (normal)       | decision × TS × expected + rejection + structural| 17+6+1    |
| `run-commercial-sql-parity-specs.ts` (injected)     | fail-closed lifecycle (`exit 1`, zero resíduos)  | pass      |

Rejection contract endurecido nesta revisão: SQLSTATE `22023`
obrigatório (código ausente reprova), mensagem por igualdade exata
ou prefixo canônico declarado (`startsWith`), `data === null` e
`error` presente. Sem tolerância a substring arbitrária.

## 10. Concorrência

- `mutate_tenant_membership` mantém lock canônico
  `SELECT id FROM public.tenants WHERE id = _tenant_id FOR UPDATE`
  como primeira linha bloqueada; enforcement em transação única.
- `run-commercial-seat-atomic-enforcement-specs.ts` cobre stress
  concorrente sem over-allocation, com fail-closed real de
  `commercial_seat_limit_denied` em `DETAIL` JSON.
- Zero enforcement pós-commit; zero compensating transaction; zero
  snapshot / reservation externo.

## 11. Limitações aceitas

- Provider billing real (Stripe, Hotmart, Kiwify), checkout, customer
  portal, webhooks públicos reais, upgrade/downgrade/cancelamento
  reais, invitation flow, UI comercial, dashboards finais — todos
  fora do escopo da Fase 4 e planejados para blocos futuros
  (PR-PH.0 e blocos comerciais posteriores).
- Cobertura numérica `MAX_SAFE_INTEGER` da RPC no plano de banco
  fica limitada por `numeric(14,2)` de `tenant_entitlements.
  value_decimal`; teto lógico da RPC coberto por testes unitários.
- Dependência da segurança operacional da plataforma gerenciada
  para preservar `sandbox_exec` como role não assumível por
  aplicação (§6, `SECURITY_ARCHITECTURE.md §3.1`).

## 12. Product Readiness gate (PR-PH.0)

Registrado como bloco vinculante antes da homologação, **não
iniciado**:

- Tenant Workspace Information Architecture;
- menus internos configuráveis;
- dashboard final por papel;
- CRM e Kanban final;
- Data-Dense Premium Dark Interface;
- branding do workspace e do site público;
- CMS e landing pages;
- custom domain por tenant;
- onboarding e configuration center;
- roles e autoridade de configuração;
- Product UX/UI Final Consistency Review;
- Environment & Operational Readiness;
- Pre-Homologation Product Closing Review;
- Test & Homologation Impact Analysis.

## 13. Achados

### Classe A — encerrados

- Materialização Accepted da F4-CF-01 nos três locais canônicos.
- Reconciliação documental do plano ACL (aplicação vs operacional
  gerenciado).

### Classe B — encerrados

- Rejection contract strict com SQLSTATE obrigatório e mensagem
  canônica (exact/prefix).
- Alegação anterior "byte-for-byte" do catálogo substituída por
  "selected canonical fields unchanged" (semântica real do harness).
- ACL de aplicação das RPCs comerciais permanece fechada; exceção
  operacional gerenciada de `sandbox_exec` formalizada como
  dependência de plataforma e fora do trust boundary de aplicação.

### Classe C — futuros

- Remoção definitiva do reprovisionamento automático de
  `sandbox_exec` (coordenação com plataforma).
- Provider billing real, checkout, customer portal, webhooks reais,
  UI comercial, dashboards, Kanban final, custom domain, onboarding,
  CMS/landing pages, homologação.

## 14. Go / No-Go

- **Application-plane hard gates:** todos passam.
  - SQLSTATE obrigatório nos seis rejection tests: passa.
  - Mensagens validadas por exact/startsWith: passa.
  - Ausência de payload híbrido nos erros: passa.
  - RLS não permissiva: passa.
  - Zero uso de `sandbox_exec` por aplicação: passa
    (`rg -n "sandbox_exec" src/` → 1 hit, comentário na spec).
  - `anon` / `authenticated` / `authenticator` não podem assumir
    `sandbox_exec`: passa (`pg_has_role` = false).
  - Runners: 233 + 14 + 10 + (17+6+1) passed; execução injetada
    encerra com exit 1 e zero resíduos.
  - Zero migration, zero runtime produtivo, zero frontend, zero
    provider, zero secret alterado nesta revisão.
- **Managed operational plane:** dependência aceita e documentada.

Decisão: **Go — Phase 4 Closing Review Ready for External Audit.**

## 15. Confirmações negativas

- Zero migration nova.
- Zero alteração em lógica de RPC, RLS, grants ou schema.
- Zero alteração em runtime produtivo ou frontend.
- Zero implementação de provider real, checkout, customer portal
  ou webhook público real.
- Zero início da PR-PH.0.
- Zero mutação do catálogo `commercial_entitlement_definitions`.
- Zero renumeração retroativa.
- Zero secret exposto.

## 16. Riscos remanescentes

- Dependência da segurança operacional da plataforma gerenciada
  para manter `sandbox_exec` como role operacional não assumível
  por aplicação.
- Homologação depende de PR-PH.0, não iniciada.
