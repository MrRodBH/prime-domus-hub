# SCP-012 — Commercial Seat Limit Atomic Enforcement Integration

**Status:** Ready for External Audit
**Blocks:** None — Phase 4 closure (F4-CF-01) is planned after external acceptance.

## 1. Baseline confirmado

Antes desta etapa (confirmado por inventário no repositório):

- `public.resolve_commercial_seat_decision(uuid,uuid,text,integer)` era a
  única autoridade comercial runtime para `users.seats` (SCP-012.0.2 /
  0.2.1 / 0.2.2, Accepted).
- `getCommercialSeatLimitDecision` delega exclusivamente para a RPC.
- Não existe fallback TypeScript produtivo para a decisão.
- `public.mutate_tenant_membership` era a única primitive de mutation
  runtime de `public.tenant_members` (SCP-012.0.3, Accepted), sem
  enforcement comercial.
- `membership-mutation-boundary.server.ts` chama exclusivamente a RPC
  via `supabaseAdmin`; zero escrita direta em `tenant_members` no
  runtime TypeScript.
- `authenticated` possui apenas `SELECT` em `tenant_members`. `anon` sem
  privilégios. `service_role` administrativo.
- Ambas as RPCs restritas a *function owner* + `service_role`.
- Nenhuma UI / rota de produto consome o boundary hoje.
- Working tree inicial limpo (`git status --short` vazio).

## 2. Arquitetura final

Uma única RPC — `public.mutate_tenant_membership` — assume, em uma única
transação PostgreSQL:

1. Validação primitiva de parâmetros.
2. **Lock canônico**: `SELECT id FROM public.tenants WHERE id = _tenant_id
   FOR UPDATE`. É a primeira linha bloqueada pela função. Tenant
   inexistente → `Tenant not found`.
3. Revalidação do Trusted Actor Context (existência + super_admin vs
   owner ativo).
4. Validação de target user + `targetRole` (owner rejeitado).
5. Carga do estado atual da membership alvo.
6. Owner protection.
7. **Planejamento**: computa `previousStatus/Role`, `newStatus/Role`,
   `changed`, `seat_delta` sem executar DML.
8. **Enforcement**: se `seat_delta = +1`, chama
   `public.resolve_commercial_seat_decision(actor, tenant, origin, 1)`.
9. Se `allowed != true`, aborta a transação com
   `RAISE EXCEPTION 'commercial_seat_limit_denied' USING
   ERRCODE='P0001', DETAIL=v_decision::text`.
10. Caso contrário, executa o DML planejado (`INSERT` ou `UPDATE`).
11. Retorna o mesmo DTO whitelisted da SCP-012.0.3.

A substituição via `CREATE OR REPLACE FUNCTION` mantém assinatura,
nome, DTO, `LANGUAGE plpgsql`, `VOLATILE`, `SECURITY DEFINER`,
`search_path = public, pg_temp`, sem SQL dinâmico, sem fallback, sem
`DELETE` físico, sem mutation de owner. Não existe segunda RPC. A
versão anterior sem enforcement foi eliminada no mesmo commit.

## 3. Ordem do lock

O lock em `public.tenants` é adquirido **imediatamente após** a
validação primitiva de parâmetros e **antes** de qualquer leitura de
`tenant_members` (target ou actor), da revalidação de Trusted Actor
Context, da chamada ao resolver comercial e de qualquer `INSERT`/
`UPDATE`. Uma única linha é bloqueada por transação, sempre para o
mesmo `_tenant_id`. Tenants diferentes bloqueiam linhas diferentes
(isolamento comprovado pelo Cenário D). O lock é liberado apenas ao
final da transação.

Nenhum `pg_advisory_xact_lock`, tabela de lock, ordem variável ou
liberação manual foi introduzido.

## 4. Planejamento antes do DML

O planejamento é integralmente concluído antes do primeiro `INSERT`/
`UPDATE`. Nenhuma linha de `tenant_members` é escrita antes de:

- o lock estar adquirido;
- o Trusted Actor Context estar revalidado;
- a proteção de owner estar aplicada;
- o `seat_delta` estar classificado;
- a decisão comercial ter sido executada (quando aplicável) e permitida.

## 5. Classificação de delta (server-side, PostgreSQL)

| Operation           | Transição alvo                     | changed | seat_delta |
|---------------------|-------------------------------------|---------|------------|
| create_membership   | (nada) → active                     | true    | +1         |
| change_role         | role != prev                        | true    | 0          |
| change_role         | role == prev                        | false   | 0          |
| suspend             | active → suspended                  | true    | -1         |
| suspend             | suspended → suspended               | false   | 0          |
| reactivate          | suspended → active                  | true    | +1         |
| reactivate          | active → active                     | false   | 0          |
| revoke              | active|invited → revoked            | true    | -1         |
| revoke              | suspended → revoked                 | true    | 0          |
| revoke              | revoked → revoked                   | false   | 0          |

Transições fora dessa tabela são erros de domínio (`membership_not_found`,
`invalid_transition_to_*`, `change_role_not_permitted_on_revoked`,
`membership_already_exists`).

## 6. Regra de enforcement

- `seat_delta = +1`: chamar `resolve_commercial_seat_decision(actor,
  tenant, origin, 1)`. O argumento `1` é literal — nunca vem do client
  nem é derivado no TypeScript. Se `decision.allowed != true`, aborta
  toda a transação com `commercial_seat_limit_denied` carregando o
  DTO canônico no `DETAIL`.
- `seat_delta = 0`: resolver não é chamado. `change_role` e no-ops
  passam mesmo com billing_blocked ou limite atingido.
- `seat_delta = -1`: resolver não é chamado. `suspend active` / `revoke
  active|invited` reduzem uso mesmo com billing_blocked, limite
  atingido, billing_unknown, billing_attention_required, not_entitled,
  not_evaluated.

## 7. Contrato do erro `commercial_seat_limit_denied`

- `message = commercial_seat_limit_denied` — igualdade **exata**.
- `ERRCODE = P0001`.
- `DETAIL` contém exatamente o JSON de `CommercialLimitDecision`:
  `tenantId`, `featureKey`, `allowed`, `reason`, `source`, `limit`,
  `used`, `requestedIncrement`, `remaining`.
- Nenhuma row interna, stack, secret ou tenant divergente é incluído.
- A DTO de sucesso permanece imutável (SCP-012.0.3), sem `limit`,
  `used`, `remaining`, `billingStatus`, `commercialDecision`.

O parser (`membership-mutation-enforcement-error.ts`) usa igualdade
exata sobre `message` — substrings, prefixos, sufixos ou wrappers
(por exemplo `"prefix commercial_seat_limit_denied"`,
`"commercial_seat_limit_denied suffix"`,
`"commercial_seat_limit_denied_other"`) retornam `null` e são tratados
como erro determinístico do boundary, não como negação estruturada.
Além disso, o parser exige `DETAIL` presente, `JSON.parse` bem-sucedido,
`validateSeatDecisionResponse` aprovado com `tenantId` esperado,
`requestedIncrement = 1`, e `allowed = false`. Qualquer desvio lança
determinístico. Nenhuma decisão é recomputada em TypeScript e nenhuma
nova consulta ao banco é feita.

A forma real do erro Supabase/PostgREST observada nos runners
(`error.message === "commercial_seat_limit_denied"`,
`error.code === "P0001"`, `error.details` string JSON) é verificada
pelo helper `validateRealCommercialDenial` do runner atômico
(cenários A, B, C, E e F, além do cenário J via boundary).

## 8. Boundary TypeScript

`membership-mutation-boundary.server.ts` continua sendo a única
escrita autorizada — uma chamada à RPC via `supabaseAdmin`, validador
semântico da membership, binding de `targetRole`, `seatDelta` não
exposto ao client. Adiciona apenas o parser de erro comercial: se o
erro corresponde à negação canônica válida, lança
`CommercialSeatLimitDeniedError` com a decisão validada; caso
contrário, o erro é reembalado como falha determinística do boundary
(zero conversão silenciosa).

O helper `membership-seat-delta.ts` permanece disponível para
paridade/observabilidade e é executado **após** o DTO de sucesso; ele
não autoriza nada, não decide se o resolver será chamado, não cria
fallback e não executa compensação após commit. A autoridade do
enforcement está integralmente na função SQL.

## 9. ACL final

Verificado por `pg_proc.proacl`, `aclexplode` e `has_function_privilege`
(inspeção pós-migration):

| Função                                | Grantee       | EXECUTE |
|---------------------------------------|---------------|---------|
| `mutate_tenant_membership(6-arg)`     | postgres      | ✓ (owner) |
| `mutate_tenant_membership(6-arg)`     | service_role  | ✓        |
| `mutate_tenant_membership(6-arg)`     | anon          | ✗        |
| `mutate_tenant_membership(6-arg)`     | authenticated | ✗        |
| `mutate_tenant_membership(6-arg)`     | sandbox_exec  | ✗        |
| `mutate_tenant_membership(6-arg)`     | PUBLIC        | ✗        |
| `resolve_commercial_seat_decision`    | postgres      | ✓ (owner) |
| `resolve_commercial_seat_decision`    | service_role  | ✓        |
| `resolve_commercial_seat_decision`    | anon          | ✗        |
| `resolve_commercial_seat_decision`    | authenticated | ✗        |
| `resolve_commercial_seat_decision`    | sandbox_exec  | ✗        |
| `resolve_commercial_seat_decision`    | PUBLIC        | ✗        |

Uma assertion dinâmica dentro da migration (via `pg_proc`, `aclexplode`
e `pg_roles`) aborta caso qualquer grantee além de owner + service_role
possua `EXECUTE` em qualquer das duas funções.

`public.tenant_members` permanece inalterada:
- `PUBLIC` sem privilégio.
- `anon` sem privilégio.
- `authenticated` = `SELECT` (nenhum `INSERT`/`UPDATE`/`DELETE`).
- `service_role` administrativo.

## 10. Ausência de caminhos alternativos

Inventário confirmado:

- Zero `INSERT`/`UPDATE`/`UPSERT`/`DELETE` direto em `tenant_members`
  no runtime TypeScript (`rg 'from\\(.tenant_members.\\).*\\.(insert|update|upsert|delete)' src/` → 0).
- Zero segunda RPC de mutation.
- Zero função legada sem enforcement (a versão sem enforcement foi
  substituída no mesmo commit).
- Zero feature flag SQL versus TypeScript.
- Zero fallback de decisão.
- Zero enforcement após a mutation.
- Zero compensating transaction.

Migrations históricas que ainda inserem em `tenant_members` são
exclusivamente de bootstrap/seed e não runtime.

## 11. Adaptação do harness existente

`run-membership-mutation-parity-specs.ts` provisiona agora, além de
`tenant + owner + super_admin`, um plano sintético `commercial_plans`
com `commercial_plan_entitlements(users.seats = 100)` e uma
`tenant_subscriptions(status='active')`. Cleanup fail-closed remove
tenants, memberships, subscriptions, entitlements, planos e usuários
auth criados; residual checks impedem falso positivo. Nenhum bypass de
enforcement foi introduzido; nenhuma flag de ambiente desativa o
limite. Todos os 14 cenários originais continuam passando.

## 12. Runner de concorrência

`run-commercial-seat-atomic-enforcement-specs.ts` executa contra
PostgreSQL real com clientes service-role independentes e requisições
realmente concorrentes (`Promise.all`). Cada cenário de negação valida
o erro real através do helper `validateRealCommercialDenial`, que
exige `error.message === "commercial_seat_limit_denied"` (igualdade
exata), `error.code === "P0001"`, `error.details` string não vazia, e
`validateSeatDecisionResponse` aprovado sobre o `DETAIL` real. O
cenário J executa `executeMembershipMutation` — o boundary
server-only real — e observa `CommercialSeatLimitDeniedError` com
`decision` estruturado sendo lançado. Resultados finais (10 cenários):

| Cenário | Descrição                                                  | Resultado |
|---------|------------------------------------------------------------|-----------|
| A       | limit=used, 2 creates concorrentes → 2 negações reais validadas | ✓        |
| B       | 1 unidade livre, 2 creates → 1 aplicado, 1 negação real         | ✓        |
| C       | capacidade=2, 4 creates → 2 aplicados, 2 negações reais          | ✓        |
| D       | cross-tenant → locks independentes, ambos aplicam                | ✓        |
| E       | denied create → target sem row, DETAIL real validado             | ✓        |
| F       | denied reactivate → membership permanece suspended, DETAIL real  | ✓        |
| G       | billing_blocked → suspend active aplica (delta −1)               | ✓        |
| H       | billing_blocked → change_role aplica (delta 0)                   | ✓        |
| I       | reactivate no-op em active → sem chamada ao resolver             | ✓        |
| J       | boundary server-only converte negação real em CommercialSeatLimitDeniedError | ✓ |

Zero over-allocation observada. Zero fixture residual — o cleanup
fail-closed executa verificação residual explícita para
`tenant_members`, `tenant_subscriptions`, `tenant_entitlements`,
`tenants`, `commercial_plan_entitlements`, `commercial_plans` e
`auth.users`, e trata erro de consulta residual como falha do cleanup
(nunca como comprovação de ausência). O runner de membership
(`run-membership-mutation-parity-specs.ts`) executa 14 cenários com
verificação residual equivalente, agora incluindo
`commercial_plan_entitlements` por `plan_id`. O parser unitário
possui 14 casos (13 originais + a asserção de rejeição de substring).

## 13. Confirmações negativas

- Zero UI / frontend / rota nova.
- Zero invitation flow, zero criação de `auth.users` no runtime de
  produto (usuários auth só existem como fixtures nos runners).
- Zero DELETE físico de membership.
- Zero mutation de owner, zero transferência, zero segundo owner.
- Zero lock adicional; um único `FOR UPDATE` em `public.tenants`.
- Zero grant de escrita a `authenticated`.
- Zero segundo resolver comercial; a autoridade continua sendo a RPC
  `resolve_commercial_seat_decision`.
- Zero snapshot comercial, zero reservation table, zero pool paralelo.
- Zero SDK de provider real (Stripe/Hotmart/Kiwify) tocado.
- Zero mudança em `storage.media_limit` ou qualquer outro entitlement.
- Zero alteração em `client.server.ts`, `client.ts`, `auth-middleware`,
  `types.ts`, `.env`, `supabase/config.toml`.

## 14. Riscos ou limitações reais

- O boundary continua sendo consumido apenas por harnesses. Uma
  eventual UI de gestão de equipe deverá converter
  `CommercialSeatLimitDeniedError` em mensagem de produto — o contrato
  estruturado já expõe `reason/limit/used/remaining` para essa
  finalidade.
- `resolve_commercial_seat_decision` continua marcada `STABLE`. Dentro
  da mesma transação e sob o lock do tenant sua releitura de
  `tenant_members` (via `COUNT` em `active|invited`) permanece
  consistente. Cenários A–D provam isso; se, em evolução futura, a
  função for reescrita para depender de estado volátil, o *invariant*
  precisará ser reavaliado.
- F4-CF-01 permanece como checkpoint planejado após a aceitação da
  SCP-012 e antes do fechamento formal da Fase 4.

## 15. Bloco final do roadmap

```
16. SCP-012 — Commercial Seat Limit Atomic Enforcement Integration —
Ready for External Audit.

16.0   SCP-012.0   — Accepted.
16.0.1 SCP-012.0.1 — Accepted.
16.0.2 SCP-012.0.2 — Accepted.
16.0.3 SCP-012.0.3 — Accepted.
```

## 16. Arquivos criados / alterados

- created `supabase/migrations/*_commercial_seat_atomic_enforcement.sql`
- created `src/lib/api/commercial/membership-mutation-enforcement-error.ts`
- created `src/integrations/supabase/__tests__/commercial-seat-limit-denied-parser.spec.ts`
- created `run-commercial-seat-atomic-enforcement-specs.ts`
- edited  `src/lib/api/commercial/membership-mutation-boundary.server.ts`
- edited  `run-membership-mutation-parity-specs.ts`
- edited  `run-tenant-specs.ts`
- edited  `docs/architecture/ROADMAP_ARCHITECTURAL.md`
- created `docs/architecture/impact-analysis/SCP-012-commercial-seat-limit-atomic-enforcement-integration.md` (this file — substitui o placeholder da preflight anterior)
- created `docs/delivery/architectural-roadmap/phase-04-saas-commercial-platform/118-scp-012-commercial-seat-limit-atomic-enforcement-integration.md`
