# F3.5 — Tenant Switcher UX

**Status:** Implementada e pronta para auditoria.
**Escopo:** UX + transporte. Nenhuma alteração server-side, RLS, SQL functions, grants, migrations, Storage ou Runtime Core.

---

## 1. Objetivo

Implementar a UX do Tenant Switcher para usuários comuns consumindo a base aprovada em F3.4/F3.4.1:

- `listSelectableTenants` (server-side, `active-only`) — fonte única
- `tenant-selection-state` — estado local (`selected_tenant_id`)
- `use-tenant-selection` — hook reativo
- `reconcileSelection(activeIds)` — reconciliação obrigatória
- `tenant-attacher` (F3.4.1) — precedência SA impersonação > seleção comum > sem header (**não foi alterado**)

## 2. Contexto consumido de F3.4/F3.4.1

Nenhum arquivo aprovado na F3.4/F3.4.1 foi modificado. A F3.5 é estritamente aditiva:

- `src/lib/api/tenant-selection.functions.ts` — reutilizado via `useServerFn`
- `src/integrations/supabase/tenant-selection-state.ts` — `reconcileSelection`, `setSelectedTenantId`, `clearSelectedTenantId`
- `src/integrations/supabase/use-tenant-selection.ts` — `useSelectedTenantId`
- `src/integrations/supabase/tenant-attacher.ts` — **intocado** (justificativa: não foi necessário para integrar a UX; a precedência aprovada em F3.4.1 já contempla o cenário)
- `src/integrations/supabase/use-impersonation.ts` — utilizado para detectar impersonação ativa

## 3. Arquivos alterados

| Arquivo | Descrição |
|---|---|
| `src/components/workspace/AppHeader.tsx` | Monta `<TenantSwitcher />` no header; oculto quando há impersonação SA (mantém badge existente). |
| `src/components/workspace/WorkspaceShell.tsx` | Envolve `<Outlet />` em `<TenantSelectionGate />`. |

## 4. Arquivos criados

| Arquivo | Descrição |
|---|---|
| `src/components/workspace/tenant/tenant-selection-cardinality.ts` | Lógica pura `resolveCardinalityAction(activeIds, currentSelection)` — 4 estados. |
| `src/components/workspace/tenant/TenantSwitcher.tsx` | Dropdown no header — carrega `listSelectableTenants`, chama `reconcileSelection`, aplica cardinalidade, permite troca. |
| `src/components/workspace/tenant/TenantSelectionRequired.tsx` | `<TenantSelectionGate />` — bloqueia conteúdo tenant-scoped quando N>1 sem seleção ou 0 tenants ativos. |
| `src/integrations/supabase/__tests__/tenant-selection-cardinality.spec.ts` | 7 specs cobrindo a matriz de cardinalidade. |
| `run-tenant-specs.ts` | Runner unificado das 3 suítes tenant (state + attacher + cardinality). |
| `docs/fase6/39-f3-5-tenant-switcher-ux.md` | Este relatório. |

## 5. Confirmações de escopo

- **Migrations:** nenhuma criada. `ls supabase/migrations/ | wc -l` inalterado.
- **SQL functions:** nenhuma alteração. `get_current_tenant_id`, `has_role`, `user_belongs_to_tenant`, `is_super_admin` intocadas.
- **RLS policies:** nenhuma alteração.
- **Grants:** nenhuma alteração.
- **Storage / policies de Storage:** nenhuma alteração.
- **Runtime Core / Registry / ResolutionGraph / ActionExecutor / PluginContext:** nenhuma alteração.
- **Billing / planos / roles avançadas / `tenant_role`:** não tocados.
- **`tenant-attacher.ts`:** **não alterado** — precedência aprovada na F3.4.1 já era suficiente.
- **F3.6 / SaaS Commercial Platform / Storage Abstraction Layer:** não implementadas.

## 6. UX implementada

### Fluxo do TenantSwitcher (header)

1. `useQuery(['tenant-selection','selectable'])` chama `listSelectableTenants` server-side.
2. Em `onSuccess`, `useEffect` executa:
   - `const reconciled = reconcileSelection(activeIds)`
   - `resolveCardinalityAction(activeIds, reconciled)` produz uma ação determinística.
3. Ações:
   - `none` → limpa seleção residual, nada renderiza no header além de "Sem organização".
   - `auto-select` → `setSelectedTenantId(t)` e `qc.invalidateQueries()` (permitido apenas quando `activeIds.length === 1`).
   - `keep` → seleção válida mantida.
   - `require-selection` → header exibe rótulo âmbar "Selecione uma organização"; gate bloqueia conteúdo.
4. Troca manual: `setSelectedTenantId(newId)` + `qc.invalidateQueries()`. `tenant-attacher` (F3.4.1) anexa o novo `x-tenant-id` nas próximas chamadas.

### Estados renderizados

| Estado | Trigger | UI |
|---|---|---|
| Loading | `query.isLoading` | Ícone spinner + "Carregando…" |
| Erro | `query.isError` | Mensagem controlada + "Tentar novamente" (`query.refetch()`) |
| 0 tenants | `tenants.length === 0` | Header: "Sem organização". Gate: empty state "Nenhuma organização ativa disponível…" |
| 1 tenant | Auto-selecionado | Header mostra nome do tenant |
| N tenants + seleção válida | `keep` | Header mostra nome atual, dropdown lista todos com check no ativo |
| N tenants + sem seleção | `require-selection` | Header em âmbar + gate bloqueia `<Outlet />` com "Selecione uma organização" |

## 7. Uso de `listSelectableTenants`

Fonte única. Consumido via `useServerFn(listSelectableTenants)` em dois lugares que **compartilham o mesmo `queryKey`** (`['tenant-selection','selectable']`), portanto apenas **uma requisição** por ciclo:

- `TenantSwitcher.tsx`
- `TenantSelectionRequired.tsx` (Gate)

`staleTime: 60_000` para evitar refetch agressivo. `enabled: !skip` desliga a query em contextos Super Admin/impersonação.

## 8. Reconcile no bootstrap

Chamado dentro do `useEffect` do `TenantSwitcher` **toda vez** que `query.isSuccess` transiciona ou `activeIds` muda:

```ts
const reconciled = reconcileSelection(activeIds);
const action = resolveCardinalityAction(activeIds, reconciled);
```

Garante:
- seleção persistida válida permanece;
- seleção persistida ausente da lista active-only é limpa;
- lista vazia limpa a seleção;
- nenhuma seleção inválida sobrevive.

## 9. Comportamento por cardinalidade (Hard Gate §4.3)

Encapsulado em função pura `resolveCardinalityAction`:

- **0** → `{kind:"none"}` — nenhum tenant, nada anexado.
- **1 sem seleção** → `{kind:"auto-select", tenantId: activeIds[0]}` — auto-seleção derivada **exclusivamente da cardinalidade server-side active-only**.
- **1 com seleção** → `keep`.
- **N sem seleção válida** → `{kind:"require-selection"}` — o header não escolhe, o gate bloqueia. Nada de "primeiro tenant", `ORDER BY`, `LIMIT 1`, `is_default`, `is_owner`, `tenant_role` ou fallback.
- **N com seleção válida** → `keep`.

## 10. Separação Super Admin impersonation × seleção comum

- `TenantSwitcher` recebe `impersonating` do `WorkspaceShell` (via `useImpersonation()`). Quando truthy, o **componente inteiro não renderiza** — o header mostra o badge de impersonação já existente. Query fica `enabled:false`.
- `TenantSelectionGate` também desativa a query e libera `<Outlet />` quando `impersonating` OR `isSuper` — impede que Super Admin sem impersonação seja bloqueado pelo gate.
- Precedência de header (`tenant-attacher.ts` F3.4.1): impersonação SA > seleção comum > sem header. **Nenhuma alteração**.
- Nenhum campo/estado de impersonação é escrito por `TenantSwitcher`. Impersonação continua sendo escrita apenas pelo Super Panel existente.

## 11. Segurança

- `x-tenant-id` continua sendo **transporte**; autoridade é server-side (`requireTenant`, `get_current_tenant_id`, RLS).
- Client **não** consulta `tenant_members` (grep abaixo).
- Client **não** filtra `membership_status`, `tenant_role`, `is_owner`, `is_default`.
- Payload da função server-side permanece mínimo: `{tenantId, name, slug}`.
- Nenhuma decisão de autorização client-side.

Verificação:

```
$ grep -rn "tenant_members\|membership_status" src/components src/integrations src/lib/api/tenant-selection.functions.ts | grep -v ".spec\|comments"
src/lib/api/tenant-selection.functions.ts:  .from("tenant_members")     ← server function, autorizada
src/lib/api/tenant-selection.functions.ts:  .eq("membership_status",…)  ← server-side, hard-coded 'active'
```

Nenhuma ocorrência client-side em `src/components/**` ou hooks.

## 12. Testes

**Comando:** `bunx tsx --tsconfig tsconfig.json ./run-tenant-specs.ts`

**Resultado:**
```
✓ tenant-selection-state:        8 passed, 0 failed
✓ tenant-attacher:               7 passed, 0 failed
✓ tenant-selection-cardinality:  7 passed, 0 failed
TOTAL: 22 passed, 0 failed
```

Cobertura F3.5 (`tenant-selection-cardinality.spec.ts`):
- 0 tenants → `none` (inclusive com seleção stale)
- 1 tenant + sem seleção → `auto-select` correto
- 1 tenant + seleção válida → `keep`
- N tenants + sem seleção → `require-selection` (sem `tenantId` vazando)
- N tenants + seleção válida → `keep`
- N tenants + seleção stale → `require-selection`
- N>1 nunca faz auto-select

Cobertura preservada:
- `tenant-selection-state`: reconcile, rejection cleanup, roundtrip (8/8)
- `tenant-attacher`: precedência SA > seleção > vazio (7/7)

## 13. Typecheck

**Comando:** `bunx tsgo --noEmit`
**Resultado:** ✅ sem erros.

## 14. Lint

Não executado nesta etapa (`bun lint` roda ESLint em todo o repositório; F3.5 tocou apenas 2 arquivos existentes com edits pontuais). O typecheck estrito cobre erros de import/tipos.

## 15. Riscos residuais

1. **Refetch em troca de tenant** — usamos `qc.invalidateQueries()` global. Se alguma query for cara e não tenant-scoped, haverá refetch desnecessário. Otimização futura: introduzir um `queryKey` prefix `['tenant', tenantId, …]` para invalidação segmentada.
2. **Gate cobre apenas `<Outlet />` do WorkspaceShell** — rotas Super (`/super`) e o próprio header nunca são bloqueados. Alinhado com F3.4/F3.4.1, mas se surgir rota nova fora do shell exigindo tenant, precisará repetir o padrão.
3. **Sem tela cheia dedicada de "onboarding sem tenant"** — hoje é apenas um empty state. F3.5 não é UX final de onboarding; se produto pedir CTA de solicitar acesso, será etapa futura.
4. **Sem realtime** — a lista `listSelectableTenants` é `staleTime: 60_000`. Convite/revogação de membership recente pode demorar até 60s ou uma invalidação para aparecer. Não é regressão.
5. **`useServerFn` durante SSR do `WorkspaceShell`** — não aplicável: `WorkspaceShell` roda sob `_authenticated` (`ssr: false`).

## 16. Pendências futuras

- F3.6 (fora do escopo) — Tenant Switcher com melhorias de UX (busca, favoritos, avatar por tenant) e telemetria.
- Introduzir `queryKey` tenant-prefixado para invalidação segmentada (item 15.1).

## 17. Conclusão

F3.5 implementada e pronta para auditoria.

- UX funcional: dropdown no header + gate no shell.
- Fonte única server-side: `listSelectableTenants`.
- `reconcileSelection(activeIds)` executado em todo bootstrap/refresh.
- Cardinalidade determinística; sem heurística/fallback/tenant default.
- Impersonação SA e seleção comum totalmente separadas.
- Nenhuma alteração em RLS, SQL functions, grants, migrations, Storage ou Runtime Core.
- Nenhuma consulta client-side a `tenant_members`.
- 22/22 testes passando; typecheck limpo.

---

## 18. Audit Package

**Edit ID / commit:** gerenciado pelo Lovable (esta etapa).

**Arquivos alterados (2):**
- `src/components/workspace/AppHeader.tsx` — +2 imports, monta `<TenantSwitcher />` no bloco de ações do header (oculto em impersonação).
- `src/components/workspace/WorkspaceShell.tsx` — +1 import, envolve `<Outlet />` em `<TenantSelectionGate isSuper={!!isSuper}>`.

**Arquivos criados (6):**
- `src/components/workspace/tenant/tenant-selection-cardinality.ts`
- `src/components/workspace/tenant/TenantSwitcher.tsx`
- `src/components/workspace/tenant/TenantSelectionRequired.tsx`
- `src/integrations/supabase/__tests__/tenant-selection-cardinality.spec.ts`
- `run-tenant-specs.ts`
- `docs/fase6/39-f3-5-tenant-switcher-ux.md`

**Migrations:** nenhuma.
**SQL functions:** nenhuma alteração (antes = depois).
**RLS policies:** nenhuma alteração.
**Grants:** nenhuma alteração.
**Storage:** nenhuma alteração.
**Runtime Core:** nenhuma alteração.

**Diff resumido:**
- `AppHeader.tsx`: adiciona import `TenantSwitcher`; substitui o bloco condicional do badge por `impersonating ? <badge/> : <TenantSwitcher/>`.
- `WorkspaceShell.tsx`: adiciona import `TenantSelectionGate`; envolve `<Outlet/>` em `<TenantSelectionGate isSuper={!!isSuper}>…</TenantSelectionGate>`.
- Novos arquivos conforme §4.

**Queries/inspeções executadas:**
- `grep -rn "tenant_members" src/components src/integrations src/hooks` → 0 ocorrências client-side.
- `grep -rn "membership_status\|is_default\|is_owner\|tenant_role" src/components src/integrations src/hooks` → 0 ocorrências client-side.

**Testes:** `run-tenant-specs.ts` → 22/22 PASS.
**Typecheck:** `bunx tsgo --noEmit` → OK.
**Lint:** não executado.

**Confirmações:**
- ✅ Não houve alteração fora do escopo.
- ✅ F3.6 não foi implementada.
- ✅ Runtime Core não foi alterado.
- ✅ `tenant_members` não é consultado diretamente no client.
- ✅ `membership_status` não é filtrado no client.
- ✅ `listSelectableTenants` é a fonte única do switcher.
- ✅ `reconcileSelection(activeTenantIds)` executa no carregamento da lista active-only.
- ✅ Precedência F3.4.1 (impersonação SA > seleção comum > sem header) preservada.
- ✅ `tenant-attacher.ts` intocado.
