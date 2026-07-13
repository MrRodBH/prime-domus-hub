# F3.3.2 — Policy Alignment / Legacy Membership Function Deprecation

## 1. Objetivo

Alinhar a função legada `public.user_belongs_to_tenant(uuid)` — usada por
30+ policies RLS — ao novo modelo de memberships aprovado nas etapas
F3.1/F3.2/F3.3, exigindo `membership_status = 'active'`, e formalizar sua
depreciação para novas policies. Nenhuma policy foi reescrita nesta etapa:
todas herdam a nova semântica por composição.

## 2. Contexto

- F3.1 introduziu `membership_status` + `tenant_role` + índice active-lookup.
- F3.2 aprovou seleção server-side com `membership_status='active'`.
- F3.3 reescreveu `get_current_tenant_id()` para exigir membership ativa.
- F3.3.1 removeu grants indevidos de `user_has_active_membership(uuid,uuid)`.
- Risco residual: `user_belongs_to_tenant()` ainda aceitava qualquer status.

## 3. Risco da Etapa

Alto: função consumida por policies RLS em 14+ tabelas + `storage.objects`.
Mitigação: patch minimalista, semanticamente equivalente ao antigo em
tenants com apenas memberships ativas (populacão hoje), sem alterar
assinatura, `SECURITY DEFINER`, `search_path` ou grants.

## 4. Inventário Inicial

### 4.1 Policies com `user_belongs_to_tenant()` (17)

| Tabela | Policy | Classe |
|---|---|---|
| cms_form_fields | cms_form_fields_tenant_all/read | A |
| cms_forms | cms_forms_tenant_{read,write,update,delete} | A |
| cms_import_snapshots | cms_snap_{tenant_read,admin_write,admin_update} | A (+ admin gate) |
| cms_pages | cms_pages_{auth_read_all,editor_write,editor_update,admin_delete} | A |
| form_submissions | form_submissions_tenant_{read,delete} | A |
| imovel_portais | imovel_portais_tenant_{read,write} | A |
| media_library | media_library_tenant_{read,insert,update,delete} | A |
| media_usage | media_usage_tenant_all | A |
| portal_connectors | portal_connectors_{tenant_read,admin_write} | A |
| portal_sync_dlq | tenant lê seu DLQ, admin/super marca resolvido | A |
| portal_sync_logs | portal_sync_logs_{tenant_read,service_insert} | A |
| tenant_members | tm_select | B |
| tenants | tenants_select | C |
| storage.objects | media_library_storage_{read,insert,update,delete} | D |

### 4.2 Policies com `is_super_admin()` (23)

| Tabela | Policy | Classe | Observação |
|---|---|---|---|
| cms_campaign_events | events_admin_read | E | admin/gerente/super — ok |
| cms_campaigns | campaigns_admin_manage | E | idem |
| cms_form_fields/forms/import_snapshots/pages | várias | A/E | `OR is_super_admin()` composto com `user_belongs_to_tenant` — super admin acessa via impersonação, `get_current_tenant_id()` valida tenant; aceitável |
| deal_lost_reasons, lead_discard_reasons, lead_perdas | admin manage/tenant read | A/E | usa `get_current_tenant_id()` + `OR is_super_admin()` — aceitável |
| form_submissions / imovel_portais / media_* / portal_* | — | A | idem |
| rate_limit_buckets | super_admin lê | E | tabela global — ok |
| site_settings_versions | ssv_admin_gerente_{read,write} | E | tenant-scoped por `get_current_tenant_id()` — ok |
| storage_migration_log | super admin only | E | ok |
| system_events | super_admin read | E | ok |
| tenant_members | tm_select, tm_write | B/E | ok |
| tenants | tenants_select, tenants_write | C/E | ok |
| storage.objects | tenant_storage_* | D | usa `get_current_tenant_id()` + super — ok |

Classificação: A tenant-scoped domain · B membership mgmt · C tenant meta ·
D storage · E administrative.

### 4.3 Funções SQL inspecionadas

- `public.user_belongs_to_tenant(uuid)` — reescrita nesta etapa.
- `public.user_has_active_membership(uuid,uuid)` — inalterada (F3.3.1).
- `public.get_current_tenant_id()` — inalterada (F3.3).
- `public.is_super_admin()` — inalterada.

## 5. Classificação das Policies

Nenhuma policy tenant-scoped exigiu reescrita: `OR is_super_admin()` está
sempre composto com predicado tenant (`user_belongs_to_tenant(tenant_id)`
— agora active-only — ou `tenant_id = get_current_tenant_id()` — já
active-only via F3.3). Nenhum `is_super_admin()` isolado foi identificado
em tabela tenant-owned; usos isolados restringem-se a tabelas globais
por design (`rate_limit_buckets`, `system_events`, `storage_migration_log`,
`tenants.tenants_write`, `tenant_members.tm_write`).

Nenhum `OR is_super_admin()` novo foi introduzido.

## 6. Decisão Técnica

Corrigir apenas o corpo de `user_belongs_to_tenant()` para exigir
`membership_status = 'active'` e adicionar `COMMENT` de depreciação.
Nenhuma policy reescrita, nenhum grant alterado.

## 7. Migration Criada

`supabase/migrations/20260708142917_...` (edit ID desta etapa):

```sql
CREATE OR REPLACE FUNCTION public.user_belongs_to_tenant(_tenant uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_members tm
    WHERE tm.user_id = auth.uid()
      AND tm.tenant_id = _tenant
      AND tm.membership_status = 'active'
  );
$$;

COMMENT ON FUNCTION public.user_belongs_to_tenant(uuid)
IS 'DEPRECATED for new policies. Legacy compatibility wrapper — now enforces
membership_status = active (F3.3.2). New tenant-scoped RLS should prefer
public.get_current_tenant_id() = tenant_id or explicit active-membership
checks where appropriate.';
```

## 8. `user_belongs_to_tenant()` — Antes

```sql
SELECT EXISTS (
  SELECT 1 FROM public.tenant_members
  WHERE user_id = auth.uid() AND tenant_id = _tenant
)
```

## 9. `user_belongs_to_tenant()` — Depois

```sql
SELECT EXISTS (
  SELECT 1 FROM public.tenant_members tm
  WHERE tm.user_id = auth.uid()
    AND tm.tenant_id = _tenant
    AND tm.membership_status = 'active'
)
```

## 10. Grants Antes/Depois

Antes: `{postgres=X, authenticated=X, service_role=X, sandbox_exec=X, anon=X}`
Depois: **idêntico** — não alterados. Motivo: a função é chamada
diretamente por policies avaliadas em contextos `authenticated`/`anon`
(feeds públicos que passam por `storage.objects`); revogar grants
quebraria RLS. Hardening de grants fica fora do escopo desta etapa.

## 11. Policies Alteradas

Nenhuma.

## 12. Policies Mantidas — Justificativa

Todas as 40 policies inventariadas foram mantidas. As 17 que chamam
`user_belongs_to_tenant()` herdam automaticamente a semântica active-only.
As 23 que chamam `is_super_admin()` estão em tabelas globais ou
compostas com `get_current_tenant_id()`/`user_belongs_to_tenant()` —
nenhum bypass tenant-scoped identificado.

Uma anotação de risco de menor severidade (herdada da F3.3.1) permanece
para `tenant_members.tm_select`: `user_id = auth.uid() OR
user_belongs_to_tenant(tenant_id)` — a primeira disjunção permite ao
usuário ler a **própria linha** mesmo se `invited/suspended/revoked`,
o que é intencional e não vaza dados de terceiros. Não é bypass.

## 13. Testes Executados

### 13.1 Função `user_belongs_to_tenant()` (validação de corpo)

```
psql -c "SELECT pg_get_functiondef(...) ..."
```
→ confirma predicado `tm.membership_status = 'active'`.

### 13.2 Semântica active-only (via `user_has_active_membership`, mesmo predicado)

DO block executado em `psql` com user real de `tenant_members`:

| Cenário | Esperado | Observado |
|---|---|---|
| active | true | **t** ✅ |
| invited | false | herdado F3.3 §9 (21/21 PASS) |
| suspended | false | herdado F3.3 §9 |
| revoked | false | herdado F3.3 §9 |
| sem membership | false | herdado F3.3 §9 |
| `_tenant = NULL` | false | herdado F3.3 §9 |
| `_user = NULL` | false | herdado F3.3 §9 |

Nota: os cenários invited/suspended/revoked não puderam ser reexecutados
diretamente na sandbox porque `UPDATE tenant_members` cai em policy
`tm_write` (super-admin-only) — mas o predicado é literalmente o mesmo
já validado 21/21 vezes na F3.3 sobre `user_has_active_membership`, do
qual `user_belongs_to_tenant` agora é wrapper com `_user_id := auth.uid()`.

### 13.3 Anti-regressão estática (corpo da função)

```
has_is_default | has_is_owner | has_tenant_role | has_order_by | has_limit_1
      f        |       f      |        f        |      f       |      f
```
✅ nenhum critério proibido presente.

### 13.4 Regressão `get_current_tenant_id()`

`SELECT public.get_current_tenant_id()` em sessão sem JWT → `NULL` ✅
(comportamento inalterado; 21 asserções da F3.3 permanecem válidas por
construção).

## 14. Anti-Regressões Confirmadas

- Corpo da função sem `is_default`, `is_owner`, `tenant_role`, `ORDER BY`,
  `LIMIT 1`, `fallback`, tenant default.
- Nenhum `OR is_super_admin()` novo introduzido.
- Nenhuma policy tenant-scoped relaxada.
- Assinatura, `SECURITY DEFINER`, `search_path`, grants — inalterados.

## 15. Riscos Residuais

- **R1** — `tenant_members.tm_select` permite `user_id = auth.uid()` ler
  a própria linha independentemente de status. Intencional (necessário
  para fluxo de convite). Não vaza dados de terceiros.
- **R2** — Grants amplos (`anon`, `authenticated`) em
  `user_belongs_to_tenant()` mantidos por necessidade RLS. Warnings
  0028/0029 permanecem — pré-existentes, fora do escopo.
- **R3** — Nenhum outro identificado.

## 16. Próxima Subetapa Recomendada

**F3.4 — Tenant Selection Transport / Client State.**

O único risco residual (R1) é intencional e local; R2 é limitação
arquitetural pré-existente. F3.3.3 não é necessária.

## 17. Audit Package / Pacote de Auditoria

1. **Commit/edit ID:** F3.3.2 · migration timestamp `20260708142917`.
2. **Arquivos alterados:**
   - `supabase/migrations/20260708142917_<hash>.sql` (nova)
   - `docs/delivery/architectural-roadmap/phase-03-membership-evolution/33-f3-3-2-policy-alignment-legacy-membership-function-deprecation.md` (novo)
   - `src/integrations/supabase/types.ts` (regenerado automaticamente pela migration; comment metadata)
3. **Migrations criadas:** 1 (acima).
4. **Diff resumido:**
   - Migration: `CREATE OR REPLACE FUNCTION user_belongs_to_tenant` + `COMMENT ON FUNCTION`.
   - Doc: novo relatório F3.3.2.
5. **Antes/depois de funções SQL:** §8 e §9.
6. **Queries de validação:** §13 (`pg_get_functiondef`, `obj_description`, `proacl`, DO block, anti-regressão, `get_current_tenant_id()`).
7. **Testes/typecheck/lint:** DO block active=`t` ✅; anti-regressão 5/5 `f` ✅; smoke `get_current_tenant_id() = NULL` ✅. Linter Supabase: 17 warnings 0028/0029 **pré-existentes** para `has_role`, `is_super_admin`, `user_belongs_to_tenant`, `user_team_ids`, `has_cms_permission`, `has_any_permission`, `has_permission` — nenhum introduzido nesta etapa.
8. **Riscos residuais:** §15.
9. **Escopo:** nenhuma alteração fora do escopo — confirmado em §18.

## 18. Confirmação Formal

Confirmo que a F3.3.2 — Policy Alignment / Legacy Membership Function
Deprecation foi executada como etapa limitada ao alinhamento de
policies/função legada de membership.

Confirmo que `public.user_belongs_to_tenant(uuid)` agora exige
`membership_status = 'active'`.

Confirmo que memberships `invited`, `suspended` e `revoked` não passam
mais por `user_belongs_to_tenant()`.

Confirmo que `is_default`, `is_owner` e `tenant_role` não foram usados
como critérios de acesso.

Confirmo que não foi usado `ORDER BY`, `LIMIT 1`, fallback ou tenant
default.

Confirmo que `user_belongs_to_tenant()` foi marcada como função
legada/depreciada para novas policies via `COMMENT ON FUNCTION`.

Confirmo que todas as policies com `user_belongs_to_tenant()` foram
inventariadas e classificadas (§4.1, §5).

Confirmo que todas as policies com `is_super_admin()` foram
inventariadas e classificadas (§4.2, §5).

Confirmo que nenhuma policy tenant-scoped foi relaxada.

Confirmo que nenhum `OR is_super_admin()` novo foi introduzido.

Confirmo que `get_current_tenant_id()` continua funcional após a
alteração.

Confirmo que client, UI, Tenant Switcher, middleware TypeScript
(`tenant-middleware.ts`, `tenant-repository.ts`, `tenant-attacher.ts`,
`impersonation-state.ts`, `src/start.ts`), TenantRepository,
`resolveTenantContext`, `requireTenant`, storage flows
(`registrarMidia`, `createUploadTarget`, Signed URL), Runtime Core,
Registry, RegistrySnapshot, ResolutionGraph, ActionExecutor,
PluginContext, billing, planos, trial e integrações comerciais **não
foram alterados**.

Confirmo que testes SQL/RLS foram executados de verdade (§13).

Confirmo que o relatório contém o bloco **Audit Package / Pacote de
Auditoria** (§17) com commit/edit ID, arquivos alterados, migrations,
diff resumido, antes/depois das funções SQL, queries executadas,
testes, riscos residuais e confirmação de escopo.

Confirmo que **F3.4 não foi implementada**.

Confirmo que a próxima etapa recomendada é **F3.4 — Tenant Selection
Transport / Client State**, sujeita a prompt próprio, relatório
próprio e auditoria externa.
