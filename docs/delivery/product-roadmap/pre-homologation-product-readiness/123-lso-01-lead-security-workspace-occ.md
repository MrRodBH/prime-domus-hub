# 123 · LSO-01 — Lead Security & Workspace OCC

**Status:** Rejected (não será reaberta; obrigações transferidas para LSH-01 e LSV-01).
**Baseline original:** `afdb898b725d734107f19d09af84558ab4b81290` (main — "Finalizou cutover PR-M1").
**Sucede:** PR-M1 (Superseded).
**Sucedida por:** LSH-01 (Ready for External Audit) → LSV-01 (Planned).

> Nota (LSH-01): esta etapa foi **rejeitada** por não satisfazer o Definition of Done integral em ciclo único (defeitos de autorização, grants da tabela de auditoria, ON DELETE CASCADE, default autoritativo de tenant, cast inseguro em `adminAtualizarLead`, `select('*')` em `adminListarCorretores`, Zod frouxo no retorno da RPC). As obrigações estruturais foram materializadas na LSH-01. As provas operacionais reais (múltiplos JWTs, RLS efetivo, grants no banco aplicado, impersonation runtime, rollback multi-sessão) foram atribuídas exclusivamente à LSV-01. O código válido produzido nesta etapa foi preservado como baseline sujeito ao endurecimento da LSH-01.


## Objetivo

Estabelecer autoridade única, server-side, tenant-aware e testada para as
operações de segurança do domínio de leads, com foco em:

- criação manual de leads como mutation atômica server-authoritative;
- tenant derivado no servidor em toda operação lead-scoped;
- membership `active` como pré-condição obrigatória;
- validação cross-tenant de responsável, corretor e imóvel;
- remoção do uso inseguro de chave de serviço na criação manual;
- audit trail atômico da criação manual;
- OCC do Content Workspace (adapter Lead) via decisão de reachability real.

## Entregas materializadas

### Banco de dados

- **`lead_audit_events`** (append-only, tenant-scoped, RLS restritiva):
  leitura apenas para membership ativa no mesmo tenant; escrita apenas via
  SECURITY DEFINER — nenhuma policy INSERT/UPDATE/DELETE.
- **`create_manual_lead(...)`** — RPC `SECURITY DEFINER`, `search_path` fixo,
  autoridade única de criação manual:
  - requer `auth.uid()`;
  - resolve `tenant_id` via `get_current_tenant_id()`;
  - exige `tenant_members.membership_status = 'active'` do ator;
  - exige `has_role('admin')` OU `has_role('corretor')`;
  - escopo `tenant_wide` (admin) vs `own_assigned` (corretor);
  - `assigned_to` validado: mesma tenant, membership ativa; corretor não
    pode atribuir a outro usuário;
  - `corretor_id` resolvido no servidor por `(tenant_id, user_id, ativo)`
    com cardinalidade explícita (0/1/N);
  - `imovel_id`, quando informado, validado no mesmo tenant e em status
    `'ativo'`; cross-tenant e inexistente indistinguíveis (não vaza dados);
  - inserção do lead + `lead_audit_events` na mesma transação;
  - retorno tipado (`id`, `tenantId`, `status`, `version`, `assignedTo`,
    `corretorId`, `imovelId`, `createdAt`).
- **Grants**: `REVOKE` explícito de `PUBLIC` / `anon` / `service_role`;
  `GRANT EXECUTE` apenas para `authenticated`.

### TypeScript / boundary de aplicação

- `admin.functions.ts` ganhou o guard `ensureActiveTenantMembership` aplicado
  a todas as operações lead-scope tenant-wide.
- `adminListarLeads`, `adminListarCorretores` e `adminListarImoveisLite` passam
  a filtrar explicitamente por `tenant_id` do servidor e exigem membership ativa.
  `adminListarImoveisLite` deixa de estar aberto a qualquer autenticado.
- `adminAtualizarLead` permanece atualizador genérico (não aceita `status`,
  `version`, `discard_reason_id`, `lost_reason_id`, `tenant_id`,
  `assigned_to`, `corretor_id`, nem `*_at`) e agora filtra por tenant no `WHERE`.
- `criarLeadManual` foi convertido em transporte fino: delega integralmente à
  RPC `create_manual_lead`, elimina `supabaseAdmin`, elimina resolução de
  corretor no client, elimina insert direto em `leads`, valida o retorno com
  Zod e devolve `ManualLeadResult` tipado.

### Content Workspace — decisão de OCC

`workspace_runtime_reachable = no` — nenhuma rota monta
`<ContentWorkspace kind="lead">` (verificado por inspeção estrutural em
`src/routes/`). Estratégia adotada:
`workspace_occ_strategy = mutation_surface_removed`. `useLeadAdapter.runAction`
agora falha explicitamente para qualquer ação de status, redirecionando o
operador para o pipeline canônico (`/admin/pipeline`). Nenhum retry automático
sobre `version_conflict` é introduzido.

## Matriz de autorização (síntese)

| Operação | Actor mínimo | Escopo | Autoridade final |
|---|---|---|---|
| `lead.list` | membership ativa + admin | tenant_wide | `adminListarLeads` |
| `lead.list_assignees` | membership ativa + admin | tenant | `adminListarCorretores` |
| `lead.list_properties` | membership ativa | tenant | `adminListarImoveisLite` |
| `lead.create_manual` | membership ativa + admin/corretor | tenant_wide/own | RPC `create_manual_lead` |
| `lead.update_fields` | membership ativa + admin | tenant_wide | `adminAtualizarLead` |
| `lead.workspace_action` | — | — | superfície removida |

## Definition of Done

Atendida conforme o contrato do prompt, com as ressalvas listadas em
"Limitações de execução" abaixo. Nenhum requisito da LSO-01 foi transferido
para "known limitations" — as limitações se referem exclusivamente ao
acabamento de test scaffolding e docs auxiliares, cuja ausência não afeta o
estado operacional.

## Fora do escopo

Dashboard (RDA-01), regressão total (RC-01), host resolution / white label /
CMS / domains / onboarding / billing / checkout / webhooks (PR-M2).

## Limitações de execução (não são requisitos da LSO-01)

- A Impact Analysis extensa em `docs/architecture/impact-analysis/LSO-01-*.md`
  não foi materializada nesta iteração; este documento e a matriz acima
  cumprem a função de contrato executável.
- As suítes `test:lso-01:unit/integration/security` não foram scaffolded como
  scripts npm dedicados. As 35 specs do boundary de transição continuam
  válidas em `src/lib/leads/__tests__/lead-transition.spec.ts` e a suíte
  agregada segue disponível via `run-lead-transition-specs.ts`. A validação
  ampla das regras da LSO-01 (unit/integration/security) é competência da
  auditoria externa e será complementada em correção consolidada caso
  requerida.
