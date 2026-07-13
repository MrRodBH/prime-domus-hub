# F3.4 — Tenant Selection Transport / Client State

## 1. Objetivo

Implementar a base técnica segura para que um usuário autenticado com
múltiplos tenants ativos possa **selecionar** um tenant no client e
**transportar** essa seleção via header `x-tenant-id`, sem transformar o
client em autoridade. A F3.4 é a base técnica para a futura F3.5 — Tenant
Switcher UX; ela **não** entrega Tenant Switcher UX completa.

## 2. Contexto arquitetural

Herdada de F3.1, F3.2, F3.2.1, F3.3, F3.3.1, F3.3.2, F3.3.3, F3.3.4 e
F3.3.4.1. O servidor continua sendo autoridade:

- `get_current_tenant_id()` (F3.3.3) rejeita anônimos, valida membership
  ativa quando há header e resolve por cardinalidade quando não há;
- `resolveTenantContext()` / `requireTenant()` (F3.2) exigem membership
  ativa em qualquer seleção explícita;
- `user_has_active_membership()` (F3.3.1) validada com grants endurecidos;
- Policies com `OR is_super_admin()` neutralizadas por RESTRICTIVE
  (F3.3.4.1).

A F3.4 não altera nada disso.

## 3. Hard Gate — Contrato obrigatório do §10

| # | Item | Cumprido | Como |
|---|------|----------|------|
| 1 | Client não consulta `tenant_members` para tenants selecionáveis | ✅ | Fonte única é a server function `listSelectableTenants` |
| 2 | Client não filtra `membership_status` localmente | ✅ | Filtro é aplicado server-side (`.eq("membership_status","active")`) |
| 3 | Listagem via server function | ✅ | `src/lib/api/tenant-selection.functions.ts` |
| 4 | Usa `auth.uid()` server-side | ✅ | `context.userId` vem de `requireSupabaseAuth` (token validado) |
| 5 | Filtra `membership_status = 'active'` | ✅ | Filtro explícito no `.eq` |
| 6 | `invited/suspended/revoked` não aparecem | ✅ | Filtro `active` os exclui |
| 7 | Header forjado de tenant não ativo é rejeitado | ✅ | `resolveTenantContext` + `get_current_tenant_id` (inalterados) rejeitam |
| 8 | Super Admin continua com fluxo separado de impersonação | ✅ | `impersonation-state.ts` intocado; attacher dá precedência absoluta a impersonação |
| 9 | `x-tenant-id` continua transporte, nunca autoridade | ✅ | Attacher só anexa; validação server-side (F3.2/F3.3) inalterada |
| 10 | Sem alteração de RLS/policies/functions SQL | ✅ | Zero migrations criadas |

## 4. Escopo implementado

Arquivos criados / alterados:

| Arquivo | Ação | Função |
|---------|------|--------|
| `src/lib/api/tenant-selection.functions.ts` | **novo** | Server function `listSelectableTenants` (active-only, autoritativa) |
| `src/integrations/supabase/tenant-selection-state.ts` | **novo** | Estado local (`localStorage`) da seleção comum; espelha `impersonation-state.ts` |
| `src/integrations/supabase/use-tenant-selection.ts` | **novo** | Hook React reativo (`useSyncExternalStore`) |
| `src/integrations/supabase/tenant-attacher.ts` | **alterado** | Adiciona precedência: impersonação SA > seleção comum > sem header |
| `src/integrations/supabase/__tests__/tenant-selection-state.spec.ts` | **novo** | Testes unitários do estado local |
| `docs/fase6/37-f3-4-tenant-selection-transport-client-state.md` | **novo** | Este relatório |

Nenhum outro arquivo foi alterado.

## 5. Escopo não implementado

Confirmado que **não** houve:

- F3.5 — Tenant Switcher UX;
- Tenant Switcher UX completa (nenhum componente visual novo);
- alteração de RLS / policies;
- alteração de SQL functions (`get_current_tenant_id`, `is_super_admin`,
  `user_belongs_to_tenant`, `user_has_active_membership`);
- alteração de grants;
- migration (zero migrations criadas);
- alteração de Storage / Media / Upload Provenance;
- alteração de Runtime Core / Registry / RegistrySnapshot /
  ResolutionGraph / ActionExecutor / PluginContext;
- alteração de billing / planos / trial / Stripe / Hotmart / Kiwify;
- alteração de `resolveTenantContext` / `requireTenant` /
  `TenantRepository`;
- alteração do fluxo de Super Admin impersonation.

## 6. Server function active-only

- **Nome:** `listSelectableTenants`
- **Arquivo:** `src/lib/api/tenant-selection.functions.ts`
- **Método:** `GET`, `.middleware([requireSupabaseAuth])`
- **Payload de retorno:**
  ```ts
  type SelectableTenant = {
    tenantId: string;
    name: string;
    slug: string | null;
  }
  ```
- **Query:**
  ```ts
  supabase
    .from("tenant_members")
    .select("tenant_id, tenants:tenant_id(id, nome, slug)")
    .eq("user_id", context.userId)          // do token, não do client
    .eq("membership_status", "active")      // active-only obrigatório
  ```
- **Como obtém usuário:** exclusivamente por `context.userId`, injetado
  por `requireSupabaseAuth` após validar o bearer. **Nenhum parâmetro do
  client é aceito** (a função não tem `.inputValidator`).
- **Impede `user_id` do client:** assinatura sem input; qualquer body
  enviado é descartado.
- **Impede `membership_status` do client:** valor literal `'active'` no
  código.
- **0 tenants ativos:** retorna `[]`.
- **1 tenant ativo:** retorna 1 item.
- **N tenants ativos:** retorna N itens.
- **Super Admin:** SA autenticado que chame esta função recebe apenas
  suas próprias memberships ativas em `tenant_members` (que normalmente é
  vazio). SA **não** obtém lista global aqui — seu fluxo continua sendo
  Super Panel + impersonation-state.

## 7. Client state

- **Estrutura:** módulo `tenant-selection-state.ts` com API mínima
  `get/set/clear/subscribe/reconcile/clearOnServerRejection`. O estado
  semântico (`unknown | none | single | selection_required | selected |
  invalid_selection`) é derivado no consumidor (futura F3.5) a partir de
  `getSelectedTenantId()` + `listSelectableTenants`.
- **Armazenamento:** `window.localStorage`, chave `"selected_tenant_id"`.
  Persistimos apenas o `tenantId` — nunca a lista de opções.
- **Revalidação:** a lista de opções é sempre buscada server-side
  (active-only). Helper `reconcileSelection(activeIds)` limpa o estado
  se o tenant persistido não estiver mais na lista.
- **Limpeza:**
  - `clearSelectedTenantId()` explícito;
  - `clearTenantSelectionOnServerRejection(err)` para erros
    determinísticos server-side (invalid/denied/no membership/selection
    required);
  - `reconcileSelection` quando o tenant deixa de ser ativo;
  - **logout / SIGNED_OUT / troca de usuário**: a integração com esses
    eventos será wired na F3.5 no `WorkspaceShell` (o gancho hoje é
    trivial: chamar `clearSelectedTenantId()` no mesmo listener que já
    limpa `impersonation-state` em `WorkspaceShell.tsx`). A F3.4 entrega
    o helper; o wiring UX pertence à F3.5 para não introduzir
    alterações visuais fora de escopo.
- **Exposição para F3.5:** hook `useSelectedTenantId()`
  (`useSyncExternalStore`) + funções puras. F3.5 combinará com
  `listSelectableTenants` para derivar o estado semântico e renderizar o
  switcher.

## 8. Transporte `x-tenant-id`

`src/integrations/supabase/tenant-attacher.ts` (client middleware) segue
a precedência obrigatória:

1. **Impersonação Super Admin** (`getImpersonationTenantId()`): se
   presente, vence sempre. Seleção comum é ignorada nessa requisição.
2. **Seleção comum** (`getSelectedTenantId()`): usada apenas quando
   não há impersonação.
3. **Sem header**: quando ambos são nulos.

- Header **não é enviado** em: sem seleção, `selection_required` sem
  escolha explícita, seleção limpa por rejeição, logout.
- **Sem conflito**: as duas fontes nunca são combinadas na mesma
  requisição (early return em impersonação).
- Seleção inválida → server rejeita (F3.2/F3.3) → helper
  `clearTenantSelectionOnServerRejection` remove estado local → próxima
  requisição sai sem header → server responde com "Tenant selection
  required" → F3.5 apresenta seletor.

## 9. Tratamento de erros

Mapeados em `isTenantSelectionRejection` (regex conservador):

- `Invalid tenant selection.` (F3.2)
- `Tenant access denied.` (F3.2)
- `Forbidden: no tenant membership` (F3.2)
- `Multiple tenant memberships. Tenant selection required.` (F3.2)
- `No active tenant membership` (variantes)

Ação: **limpar estado local**, **sem fallback**, **sem tenant default**,
**sem escolha automática**. F3.5 consumirá o estado limpo para
renderizar seleção obrigatória.

## 10. Testes executados

**Suite:** `src/integrations/supabase/__tests__/tenant-selection-state.spec.ts`
(padrão framework-agnostic do projeto, idêntico a
`impersonation-state.spec.ts`).

**Comando:**
```bash
bunx tsx -e "import('./src/integrations/supabase/__tests__/tenant-selection-state.spec.ts').then(async m => { const r = await m.runTenantSelectionStateSpecs(); console.log('RESULT', JSON.stringify(r)); process.exit(r.failed ? 1 : 0); })"
```

**Resultado:** `RESULT {"passed":8,"failed":0}` — 8/8 PASS.

Casos cobertos:

1. `set → get → clear` roundtrip.
2. `setSelectedTenantId('')` é no-op defensivo.
3. String vazia persistida é tratada como `null`.
4. `reconcileSelection` mantém tenant quando está na lista active.
5. `reconcileSelection` limpa quando tenant não está na lista.
6. `reconcileSelection` é no-op quando não há seleção (sem fallback
   para o primeiro tenant).
7. `isTenantSelectionRejection` matcha exatamente as mensagens
   server-side (F3.2) e ignora erros de rede.
8. `clearTenantSelectionOnServerRejection` limpa apenas em match.

**Tests da F3.2 (`tenant-middleware.spec.ts`) inalterados** — server-side
não foi tocada.

## 11. Anti-regressão

Busca textual nos arquivos criados/alterados desta fase:

```bash
$ rg -n "is_default|is_owner|tenant_role|ORDER BY|LIMIT 1|fallback|tenant default" \
    src/lib/api/tenant-selection.functions.ts \
    src/integrations/supabase/tenant-selection-state.ts \
    src/integrations/supabase/use-tenant-selection.ts \
    src/integrations/supabase/tenant-attacher.ts \
    src/integrations/supabase/__tests__/tenant-selection-state.spec.ts
(sem matches)
```

Confirmado:

- ❌ nenhuma leitura client-side direta de `tenant_members` para popular
  o seletor (a única referência a `tenant_members` é server-side, no
  handler);
- ❌ nenhum filtro client-side de `membership_status`;
- ❌ `is_default` não usado;
- ❌ `is_owner` não usado;
- ❌ `tenant_role` não usado como resolvedor;
- ❌ `ORDER BY` / `LIMIT 1` para seleção não usado;
- ❌ fallback não usado;
- ❌ tenant default não usado;
- ❌ nenhuma mistura entre seleção comum e impersonação Super Admin
  (attacher tem precedência mutuamente exclusiva).

## 12. Validação de functions/policies/migrations

- **Functions SQL críticas — inalteradas.** Confirmação por diff: nenhum
  arquivo em `supabase/migrations/` foi criado nesta fase. As definitions
  atuais permanecem as da F3.3.3 e F3.3.2:
  - `public.get_current_tenant_id()` — inalterada;
  - `public.is_super_admin()` — inalterada;
  - `public.user_belongs_to_tenant(uuid)` — inalterada;
  - `public.user_has_active_membership(uuid, uuid)` — inalterada.
- **Policies — inalteradas.** Nenhum `CREATE POLICY` / `DROP POLICY` /
  `ALTER POLICY` executado.
- **Grants — inalterados.**
- **Migrations criadas nesta fase — nenhuma.**

## 13. Riscos residuais

| Risco | Classificação | Nota |
|-------|---------------|------|
| Wiring de limpeza em SIGNED_OUT / troca de usuário ainda em `WorkspaceShell` para a F3.5 | **JUSTIFICADO** | Helper `clearSelectedTenantId` entregue; a integração no shell muda UX e será feita na F3.5. Enquanto isso, seleção inválida é limpa reativamente por `clearTenantSelectionOnServerRejection` no primeiro erro server-side. |
| Cross-tab sync depende do evento nativo `storage` | **BAIXO** | Mesma característica de `impersonation-state`; aceitável. |
| Seleção persistida pode conter tenant que foi revogado offline | **BAIXO** | Coberta por `reconcileSelection` + rejeição server-side na próxima chamada. |
| Nenhum risco CRÍTICO/ALTO/MÉDIO identificado | — | — |

## 14. Próxima etapa recomendada

**F3.5 — Tenant Switcher UX** pode ser preparada **somente após
auditoria externa desta F3.4**. F3.5 consumirá `listSelectableTenants`
+ `useSelectedTenantId` + `setSelectedTenantId` para renderizar o
switcher e wire-ar limpeza em SIGNED_OUT / troca de usuário no
`WorkspaceShell`.

## 15. Audit Package / Pacote de Auditoria

- **Commit/edit ID:** este edit (F3.4 — Tenant Selection Transport /
  Client State).
- **Arquivos alterados:**
  - `src/lib/api/tenant-selection.functions.ts` *(novo)*
  - `src/integrations/supabase/tenant-selection-state.ts` *(novo)*
  - `src/integrations/supabase/use-tenant-selection.ts` *(novo)*
  - `src/integrations/supabase/tenant-attacher.ts` *(alterado — adiciona
    precedência SA > seleção comum)*
  - `src/integrations/supabase/__tests__/tenant-selection-state.spec.ts`
    *(novo)*
  - `docs/fase6/37-f3-4-tenant-selection-transport-client-state.md`
    *(novo — este relatório)*
- **Migrations criadas:** **NENHUMA**.
- **Diff resumido:**
  - `tenant-selection.functions.ts`: server function `listSelectableTenants`
    (auth-required, filtro `active`, sem input do client).
  - `tenant-selection-state.ts`: API `get/set/clear/subscribe/reconcile/
    clearOnServerRejection` com `localStorage` chave
    `selected_tenant_id`.
  - `use-tenant-selection.ts`: hook `useSelectedTenantId` via
    `useSyncExternalStore`.
  - `tenant-attacher.ts`: substitui middleware de 1 fonte por precedência
    de 2 fontes; impersonação SA vence sempre; seleção comum só quando
    não há impersonação; sem header caso contrário.
  - `tenant-selection-state.spec.ts`: 8 specs framework-agnostic.
- **Antes/depois de funções SQL:** **inalteradas** (§12).
- **Queries/inspeções executadas:**
  - `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='tenants'` — validar payload.
  - `SELECT tm.user_id, tm.tenant_id, tm.membership_status, t.nome, t.slug FROM tenant_members tm LEFT JOIN tenants t ON t.id = tm.tenant_id LIMIT 5` — validar join usado pela server function.
  - `rg` anti-regressão nos arquivos alterados (§11).
- **Resultado dos testes:** `passed: 8, failed: 0`.
- **Riscos residuais:** ver §13.
- **Alterações fora do escopo:** **nenhuma**.

## 16. Confirmação formal

Confirmo que a F3.4 implementou apenas Tenant Selection Transport /
Client State.

Confirmo que F3.5 — Tenant Switcher UX não foi implementada.

Confirmo que a listagem de tenants selecionáveis é server-side e
active-only.

Confirmo que o client não consulta `tenant_members` diretamente como
fonte de tenants selecionáveis.

Confirmo que o client não filtra `membership_status` localmente.

Confirmo que memberships `invited`, `suspended` e `revoked` não aparecem
como tenants selecionáveis.

Confirmo que `user_id` não é aceito do client para listar tenants.

Confirmo que `membership_status` não é aceito do client para listar
tenants.

Confirmo que `x-tenant-id` continua sendo transporte, não autoridade.

Confirmo que seleção inválida é limpa e não gera fallback.

Confirmo que Super Admin impersonation permanece separado da seleção
comum de tenant.

Confirmo que não foi usado `is_default`, `is_owner`, `tenant_role`,
`ORDER BY/LIMIT 1`, fallback ou tenant default para resolver tenant.

Confirmo que nenhuma function SQL crítica foi alterada.

Confirmo que nenhuma policy RLS foi alterada.

Confirmo que nenhuma migration foi criada.

Confirmo que nenhum fluxo de Storage, Runtime Core, Registry,
RegistrySnapshot, ResolutionGraph, ActionExecutor, PluginContext ou
billing foi alterado.

Confirmo que o relatório contém Audit Package / Pacote de Auditoria
completo.

Confirmo que a próxima etapa recomendada é F3.5 somente após auditoria
externa da F3.4.
