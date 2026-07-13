# F3.3.3 — Anonymous Tenant Header Hardening / get_current_tenant_id Null-Auth Guard

## 1. Objetivo

Corrigir bloqueador crítico identificado após F3.3.2: `public.get_current_tenant_id()` retornava o UUID informado no header `x-tenant-id` quando `auth.uid()` era `NULL`, permitindo que uma requisição anônima influenciasse o tenant corrente. Esta etapa introduz guarda explícita: `auth.uid() IS NULL → RETURN NULL` incondicional, independentemente do header.

## 2. Problema Confirmado

Inspeção do corpo real da função (via `pg_get_functiondef`) exibiu:

```sql
IF v_uid IS NULL THEN
  RETURN v_header_uuid;
END IF;
```

Comportamento proibido — `x-tenant-id` é transporte, nunca autoridade; usuário anônimo não tem membership, não impersona e não pode resolver tenant privado.

## 3. Migration Criada

- `supabase/migrations/20260708145027_40ef6e97-158c-4a05-bb9c-84fb27c322e6.sql`

Contém apenas um `CREATE OR REPLACE FUNCTION public.get_current_tenant_id()` com o guard adicionado. Nenhuma policy, grant, tabela, trigger ou outra função foi alterada.

## 4. `get_current_tenant_id()` — Antes

```sql
DECLARE v_uid uuid := auth.uid(); ...
BEGIN
  -- lê header x-tenant-id ...
  IF v_uid IS NULL THEN
    RETURN v_header_uuid;   -- ❌ anônimo com header resolvia tenant
  END IF;
  ...
END;
```

## 5. `get_current_tenant_id()` — Depois

```sql
DECLARE v_uid uuid := auth.uid(); ...
BEGIN
  -- F3.3.3 Null-Auth Guard
  IF v_uid IS NULL THEN
    RETURN NULL;            -- ✅ anônimo NUNCA resolve tenant
  END IF;

  -- (leitura do header e demais ramos preservados)
  -- Super Admin: apenas impersonação via header + tenant existente
  -- Usuário comum + header: valida membership_status='active'
  -- Usuário comum sem header: cardinalidade estrita sobre memberships ativas
END;
```

Corpo completo do release conferido via `pg_get_functiondef` (§10).

## 6. Testes Executados

Comando: `psql -v ON_ERROR_STOP=1 --single-transaction` para preservar GUCs entre statements (necessário porque `set_config(..., true)` é transaction-local).

Todos os cenários executados retornaram o valor esperado.

## 7. Testes Anônimos

`request.jwt.claims=''` (sem sub → `auth.uid()` = NULL).

| # | Cenário | Esperado | Observado | Resultado |
|---|---|---|---|---|
| 1 | anon, sem header | NULL | NULL | ✅ PASS |
| 2 | anon, header UUID válido (`1111...`) | NULL | NULL | ✅ PASS |
| 3 | anon, header inválido (`not-a-uuid`) | NULL | NULL | ✅ PASS |
| 4 | anon, header = tenant existente (`9664d189...`) | NULL | NULL | ✅ PASS |

## 8. Testes de Regressão Autenticada

Usuário comum: `6bf9282d-2b7e-4edf-aa6c-8f72072c045d` (1 membership ativa em `9664d189-4a12-4caa-8243-dc73383447e6`).
Super Admin: `1302d850-2a8c-4e17-b7a7-4bef292cd394`.

| # | Cenário | Esperado | Observado | Resultado |
|---|---|---|---|---|
| 1 | comum, 1 active, sem header | `9664d189...` | `9664d189...` | ✅ PASS |
| 2 | comum, header próprio | `9664d189...` | `9664d189...` | ✅ PASS |
| 3 | comum, header alheio | NULL | NULL | ✅ PASS |
| 4 | comum, header inválido | NULL | NULL | ✅ PASS |
| 5 | Super Admin, sem header | NULL | NULL | ✅ PASS |
| 6 | Super Admin, header válido + tenant existente | `9664d189...` | `9664d189...` | ✅ PASS |
| 7 | Super Admin, header de tenant inexistente | NULL | NULL | ✅ PASS |
| 8 | Super Admin, header inválido | NULL | NULL | ✅ PASS |

**Casos N>1 active e invited/suspended/revoked**: já cobertos e aprovados em F3.3 §9 (não há dados de produção com essas cardinalidades atualmente; a lógica correspondente do corpo da função permanece bit-idêntica ao release F3.3.2, apenas precedida pelo guard).

**Anti-regressão estática** (via `pg_get_functiondef`): nenhuma ocorrência de `is_default`, `is_owner`, `tenant_role`, `ORDER BY`, `LIMIT 1`, `fallback`, `tenant default`, nem do padrão proibido `IF v_uid IS NULL THEN RETURN v_header_uuid`. ✅ PASS.

## 9. Policies Dependentes de `get_current_tenant_id()`

Inventário via `pg_policies` filtrando `qual`/`with_check ILIKE '%get_current_tenant_id%'`: **59 policies** afetadas (herdam automaticamente o novo comportamento — usuário anônimo não resolve tenant e portanto perde acesso a qualquer linha tenant-scoped protegida por esta função). Nenhuma policy foi alterada, criada, removida ou relaxada. Nenhum `OR is_super_admin()` introduzido.

## 10. Itens Não Alterados

`resolveTenantContext`, `requireTenant`, `tenant-middleware.ts`, `tenant-repository.ts`, `tenant-attacher.ts`, `impersonation-state.ts`, `src/start.ts`, `client.ts`, `client.server.ts`, `auth-middleware.ts`, `auth-attacher.ts`, `types.ts`, Tenant Switcher, UI, storage upload/download, `registrarMidia`, `createUploadTarget`, Signed URL flows, Runtime Core, Registry, RegistrySnapshot, ResolutionGraph, ActionExecutor, PluginContext, PluginRegistry, Bootstrap, billing, planos, trial, integrações comerciais, `user_belongs_to_tenant()`, `user_has_active_membership()` (apenas inspecionadas).

## 11. Riscos Residuais

- Endpoints públicos que dependiam intencionalmente de leitura anônima via `x-tenant-id` (ex.: renderização de formulários/CMS público) **passam a receber `NULL`** de `get_current_tenant_id()`. Auditoria posterior deve confirmar se algum caminho legítimo requeria o comportamento antigo — caso positivo, a solução correta é uma função dedicada `resolve_public_tenant_id()` chamada apenas em policies explicitamente públicas, jamais reintroduzir header→tenant no ramo anônimo desta função.
- Warnings do linter 0028/0029 (SECURITY DEFINER executáveis) permanecem pré-existentes e fora do escopo desta patch.

## 12. Audit Package / Pacote de Auditoria

**Commit/edit:** F3.3.3 (migration timestamp `20260708145027`).

**Arquivos alterados:**
- `supabase/migrations/20260708145027_40ef6e97-158c-4a05-bb9c-84fb27c322e6.sql` (novo)
- `docs/delivery/architectural-roadmap/phase-03-membership-evolution/34-f3-3-3-anonymous-tenant-header-hardening.md` (novo)

**Diff resumido:**
- Migration: apenas `CREATE OR REPLACE FUNCTION public.get_current_tenant_id()`, com bloco novo inserido logo após a declaração de `v_uid` bloqueando `auth.uid() IS NULL`.

**Antes/depois da função SQL:** §4 e §5.

**Queries de validação executadas:**
1. `SELECT pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_current_tenant_id';` — confirmou presença do guard e ausência de padrões proibidos.
2. Inventário `pg_policies` (§9): 59 policies dependentes, nenhuma alterada.
3. Cenários de execução §7 e §8 (12 cenários, 12 PASS).

**Testes/typecheck/lint:** testes SQL/RLS 12/12 PASS. Nenhum código TS/TSX foi alterado, portanto typecheck/lint não requeridos. Linter Supabase: apenas warnings 0028/0029 pré-existentes.

**Riscos residuais:** §11.

**Alterações fora do escopo:** nenhuma.

## 13. Confirmação Formal

Confirmo que `public.get_current_tenant_id()` agora retorna `NULL` sempre que `auth.uid()` é `NULL`.

Confirmo que `x-tenant-id` de requisição anônima não resolve tenant.

Confirmo que usuário anônimo com header válido, inválido ou tenant existente recebe `NULL`.

Confirmo que a lógica autenticada de usuário comum foi preservada.

Confirmo que a lógica autenticada de Super Admin foi preservada.

Confirmo que não foi usado `is_default`, `is_owner`, `tenant_role`, `ORDER BY`, `LIMIT 1`, fallback ou tenant default.

Confirmo que nenhuma policy foi relaxada.

Confirmo que client, UI, Tenant Switcher, middleware TypeScript, TenantRepository, storage flows, Runtime Core e billing não foram alterados.

Confirmo que F3.4 não foi implementada.

Confirmo que testes SQL/RLS foram executados de verdade.

Confirmo que o relatório contém Audit Package / Pacote de Auditoria completo.
