# F3.5.1 — Tenant Switcher UX Confirmation & Corrective Patch

## 1. Estado real encontrado antes da correção

Auditoria dos 4 arquivos alvo:

| Arquivo | Achado |
|---|---|
| `src/components/workspace/WorkspaceShell.tsx` | ✅ Já continha **exatamente 1** `<Outlet />`, dentro de `<TenantSelectionGate isSuper={!!isSuper}>`. **Sem duplicação.** |
| `src/components/workspace/AppHeader.tsx` | ⚠️ Não havia `{impersonating && (` residual, mas o `else` renderizava `TenantSwitcher` para **qualquer** usuário não-impersonando — inclusive Super Admin sem impersonação. **Faltava guarda `!isSuper`.** |
| `src/components/workspace/tenant/TenantSwitcher.tsx` | ⚠️ Não recebia `isSuper`; `disabled = Boolean(impersonating)` apenas. Super Admin sem impersonação executaria `listSelectableTenants`. |
| `src/components/workspace/tenant/TenantSelectionRequired.tsx` | ⚠️ `if (!query.isSuccess) return <>{children}</>;` liberava conteúdo tenant-scoped durante loading/erro — regressão relatada pela auditoria. |

**Confirmação explícita:**
- `<Outlet />` duplicado no WorkspaceShell: **NÃO** havia.
- `{impersonating && (` residual no AppHeader: **NÃO** havia.
- `TenantSwitcher` considerava `isSuper`: **NÃO**.
- `TenantSelectionGate` liberava children em loading/erro: **SIM** (regressão real).

## 2. Correções aplicadas

### 2.1 `AppHeader.tsx`
Introduzida branch `!isSuper ? <TenantSwitcher ... /> : null`, `isSuper` é encaminhado ao switcher.

```tsx
{impersonating ? (
  <span>Impersonando {impersonating.slice(0,8)}…</span>
) : !isSuper ? (
  <TenantSwitcher impersonating={impersonating} isSuper={isSuper} />
) : null}
```

### 2.2 `TenantSwitcher.tsx`
Adotada **Opção A** (prop explícita + guarda defensiva interna):
```ts
const disabled = Boolean(impersonating) || Boolean(isSuper);
useQuery({ ..., enabled: !disabled });
if (disabled) return null;
```
Super Admin sem impersonação **não dispara** `listSelectableTenants` nem renderiza dropdown, mesmo se algum caller esquecer a guarda externa.

### 2.3 `TenantSelectionRequired.tsx` (gate)
Estados controlados e mutuamente exclusivos:
- `skip` (SA ou impersonação) → renderiza `children`;
- `loading` → EmptyState com spinner (**não libera children**);
- `error` → EmptyState com botão “Tentar novamente”;
- `0 tenants` → EmptyState “Nenhuma organização ativa”;
- `N tenants` sem seleção válida → EmptyState “Selecione uma organização”;
- caso contrário → renderiza `children`.

A decisão foi extraída para helper puro `tenant-gate-decision.ts` para testabilidade determinística.

### 2.4 `WorkspaceShell.tsx`
Nenhuma mudança necessária — já estava correto. Um teste estrutural agora impede regressão de `<Outlet />` duplicado.

## 3. Arquivos alterados / criados

Alterados:
- `src/components/workspace/AppHeader.tsx`
- `src/components/workspace/tenant/TenantSwitcher.tsx`
- `src/components/workspace/tenant/TenantSelectionRequired.tsx`
- `run-tenant-specs.ts`

Criados:
- `src/components/workspace/tenant/tenant-gate-decision.ts` (helper puro)
- `src/integrations/supabase/__tests__/tenant-gate.spec.ts` (testes gate + guardas estruturais)
- `docs/delivery/architectural-roadmap/phase-03-membership-evolution/40-f3-5-1-tenant-switcher-ux-confirmation-corrective-patch.md` (este relatório)

## 4. Diff resumido

- **AppHeader**: bloco de header direito passou de `impersonating ? badge : <TenantSwitcher/>` para `impersonating ? badge : !isSuper ? <TenantSwitcher isSuper .../> : null`.
- **TenantSwitcher**: prop `isSuper` adicionada; `disabled = Boolean(impersonating) || Boolean(isSuper)`.
- **TenantSelectionGate**: substituído `if (!query.isSuccess) return children` por estados `loading` / `error` visuais dedicados.

## 5. Confirmações negativas (escopo blindado)

- Nenhuma migration criada/alterada.
- Nenhuma SQL function alterada (`get_current_tenant_id`, `has_role`, `is_super_admin`, `list_selectable_tenants`, etc.).
- Nenhuma policy RLS alterada.
- Nenhum GRANT alterado.
- Nenhuma alteração em Storage (buckets, políticas, paths).
- Nenhuma alteração em Runtime Core (`tenant-attacher`, `tenant-middleware`, `auth-middleware`, `client.ts`, `client.server.ts`).
- `listSelectableTenants` **não** foi alterada.
- `reconcileSelection` **não** foi alterada.

## 6. Testes executados

Comando: `bunx tsx --tsconfig tsconfig.json ./run-tenant-specs.ts`

```
✓ tenant-selection-state:        8 passed, 0 failed
✓ tenant-attacher:               7 passed, 0 failed
✓ tenant-selection-cardinality:  7 passed, 0 failed
✓ tenant-gate:                  12 passed, 0 failed
TOTAL:                          34 passed, 0 failed
```

Cobertura da suíte `tenant-gate` inclui:
- skip para Super Admin;
- skip para impersonação;
- **bloqueio** durante loading;
- **bloqueio** em erro;
- bloqueio com 0 tenants;
- bloqueio com N tenants + sem seleção;
- bloqueio com N tenants + seleção stale;
- allow com seleção válida;
- allow com exatamente 1 tenant (reconciliado);
- guarda estrutural: WorkspaceShell tem exatamente 1 `<Outlet />` e está dentro do gate;
- guarda estrutural: TenantSwitcher combina `impersonating || isSuper` no `disabled` e usa `enabled: !disabled`;
- guarda estrutural: AppHeader ramifica em `!isSuper` antes de renderizar o switcher e encaminha `isSuper`.

## 7. Typecheck

`bunx tsgo --noEmit` — **PASS** (sem erros/avisos).

## 8. Runner React/component

Não há runner React de componentes configurado no projeto (documentado nas etapas anteriores). Compensado por:
- helper puro `tenant-gate-decision.ts` testado unitariamente;
- guardas estruturais textuais (regex sobre o próprio código-fonte) que reprovam regressão de `<Outlet />` duplicado, ausência de `isSuper` no switcher e ausência da branch `!isSuper` no header.

## 9. Riscos residuais

- Guardas estruturais são baseadas em regex/substring: refatorações agressivas (ex.: renomear `TenantSelectionGate`) exigirão atualizar o spec correspondente. Aceito como custo pela cobertura sem runner React.
- O gate depende da mesma `queryKey` (`["tenant-selection", "selectable"]`) usada pelo switcher; qualquer mudança futura na chave precisa ser sincronizada nos dois pontos.

## 10. Conclusão

**F3.5.1 implementada e pronta para auditoria.**

F3.5 permanece **não aprovada** — aprovação final depende da auditoria externa desta correção.
