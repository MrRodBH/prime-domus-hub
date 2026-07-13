# F3.4.1 — Tenant Attacher Fix & Lifecycle Cleanup Wiring

## 1. Objetivo

Patch corretivo restrito da F3.4. Resolve os bloqueadores levantados pela
auditoria externa: (i) transporte do `x-tenant-id` para seleção comum de
tenant, (ii) wiring mínimo de limpeza de `selected_tenant_id` em
logout / `SIGNED_OUT` / troca de usuário e (iii) testes explícitos do
resolvedor de header + comprovação de typecheck. Nenhum RLS, SQL, policy,
grant ou migration é tocado. Não avança para F3.5.

## 2. Bloqueadores corrigidos

| # | Bloqueador da auditoria | Correção |
|---|-------------------------|----------|
| 1 | `return next(...)` antecipado em `tenant-attacher.ts` tornava a seleção comum inalcançável | Reescrito com extração de função pura `resolveTenantTransportHeader`; middleware lê ambas as fontes e delega. Não há mais early return que anule a seleção comum. |
| 2 | Seleção comum nunca virava `x-tenant-id` | Middleware agora chama `getSelectedTenantId()` quando não há impersonação; se retornar valor, o header é anexado. |
| 3 | Limpeza em `logout` / `SIGNED_OUT` / troca de usuário adiada para F3.5 | Wiring adicionado em `AppHeader.signOut()` e `WorkspaceShell` (mesmo ponto onde `impersonation-state` já é limpo), incluindo detecção de troca de `user.id`. |
| 4 | Falta de testes do transporte real do header | Nova suíte `tenant-attacher.spec.ts` cobre 7 cenários da função pura (matriz completa de precedência). |
| 5 | Typecheck/lint sem comando + resultado explícitos | Executado `bunx tsgo --noEmit` — exit 0, sem output. |

## 3. Escopo implementado

| Arquivo | Ação | Função |
|---------|------|--------|
| `src/integrations/supabase/tenant-attacher.ts` | alterado | Extrai `resolveTenantTransportHeader` (pura) + middleware que resolve as duas fontes de forma mutuamente exclusiva |
| `src/components/workspace/AppHeader.tsx` | alterado | `signOut()` limpa também `selected_tenant_id` antes de `supabase.auth.signOut()` |
| `src/components/workspace/WorkspaceShell.tsx` | alterado | `onAuthStateChange` limpa `selected_tenant_id` em `SIGNED_OUT` e em troca de `user.id` (`SIGNED_IN` / `USER_UPDATED`) |
| `src/integrations/supabase/__tests__/tenant-attacher.spec.ts` | novo | 7 specs framework-agnostic do resolvedor de header |
| `docs/delivery/phase-03-membership-evolution/38-f3-4-1-tenant-attacher-fix-lifecycle-cleanup.md` | novo | Este relatório |

Nenhum outro arquivo alterado. Nenhum arquivo criado fora dos autorizados
pelo §4 do prompt.

## 4. Escopo não implementado

Confirmado que **não** houve:

- F3.5 — Tenant Switcher UX;
- componente visual novo de qualquer tipo;
- alteração de RLS / policies / grants;
- alteração de SQL functions (`get_current_tenant_id`, `is_super_admin`,
  `user_belongs_to_tenant`, `user_has_active_membership`);
- migration (zero migrations criadas);
- alteração de `resolveTenantContext` / `requireTenant` /
  `TenantRepository` / `listSelectableTenants`;
- alteração de Storage / Media / Upload Provenance / Runtime Core /
  Registry / RegistrySnapshot / ResolutionGraph / ActionExecutor /
  PluginContext / billing / trial / Stripe / Hotmart / Kiwify / GA-08.

## 5. Correção do tenant-attacher

**Antes (versão problemática relatada pela auditoria — early return
tornava seleção comum inalcançável):**

```ts
const impersonating = getImpersonationTenantId();
return next({ headers: impersonating ? { "x-tenant-id": impersonating } : {} });
// ↓ inalcançável ↓
if (impersonating) { return next({ headers: { "x-tenant-id": impersonating } }); }
const selected = getSelectedTenantId();
if (selected) { return next({ headers: { "x-tenant-id": selected } }); }
return next({ headers: {} });
```

**Depois (F3.4.1):**

```ts
export function resolveTenantTransportHeader(input: {
  impersonationTenantId: string | null;
  selectedTenantId: string | null;
}): Record<string, string> {
  if (input.impersonationTenantId) return { "x-tenant-id": input.impersonationTenantId };
  if (input.selectedTenantId)     return { "x-tenant-id": input.selectedTenantId };
  return {};
}

export const attachTenantHeader = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const impersonationTenantId = getImpersonationTenantId();
    const selectedTenantId = impersonationTenantId ? null : getSelectedTenantId();
    const headers = resolveTenantTransportHeader({ impersonationTenantId, selectedTenantId });
    return next({ headers });
  },
);
```

**Precedência final:** impersonação Super Admin > seleção comum > sem
header.

- `getSelectedTenantId()` é **alcançável**: só é curto-circuitado (para
  `null`) quando há impersonação ativa — e nesse caso o resultado final
  já teria sido a impersonação de qualquer forma. Isso preserva o
  invariante "nunca combinar as duas fontes" e é o único ponto onde a
  leitura de seleção comum é suprimida.
- Impersonação Super Admin **continua prevalecendo** por checagem
  literal `if (input.impersonationTenantId)` antes de qualquer branch de
  seleção comum.
- A função pura não valida tenant, não faz query, não é autoridade —
  apenas transporte.

## 6. Lifecycle cleanup

Wiring implementado no **mesmo ponto central** que já limpa
`impersonation-state` (sem introduzir UI nova, sem nova rota, sem novo
componente):

### 6.1. `AppHeader.signOut()` — logout explícito

```ts
clearImpersonationTenantId();
clearSelectedTenantId();        // ← F3.4.1
await supabase.auth.signOut();
navigate({ to: "/auth", replace: true });
```

Ambos os estados locais são limpos **antes** do `signOut`, evitando que
qualquer requisição em voo carregue header de tenant após a sessão ter
sido invalidada.

### 6.2. `WorkspaceShell` — `SIGNED_OUT` e troca de usuário

```ts
useEffect(() => {
  let lastUserId: string | null = null;
  void supabase.auth.getUser().then(({ data }) => { lastUserId = data.user?.id ?? null; }).catch(() => {});
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") {
      clearImpersonationTenantId();
      clearSelectedTenantId();
      lastUserId = null;
      return;
    }
    if (event === "SIGNED_IN" || event === "USER_UPDATED") {
      const uid = session?.user?.id ?? null;
      if (lastUserId && uid && uid !== lastUserId) {
        clearImpersonationTenantId();
        clearSelectedTenantId();
      }
      lastUserId = uid;
    }
  });
  return () => data.subscription.unsubscribe();
}, []);
```

- **SIGNED_OUT**: limpa `selected_tenant_id` determinística e
  automaticamente (não depende de o usuário passar pelo botão).
- **Troca de usuário na mesma aba** (`SIGNED_IN`/`USER_UPDATED` com
  `user.id` diferente do último visto): limpa seleção — seleção do
  usuário anterior não pode vazar para a nova sessão.
- **Sem UI nova**: reaproveita o `useEffect` já existente e o
  unsubscribe já existente. Não há novo componente, rota ou dropdown.
- **Sem F3.5**: não renderiza switcher, não lista tenants, não permite
  selecionar. Apenas limpa.
- **Sem duplicidade de listener**: o único `onAuthStateChange` de
  lifecycle continua sendo este; o listener do `__root.tsx` (documentado
  no knowledge) trata apenas invalidação de query cache.

## 7. Reconciliação de seleção persistida

**Opção C — não aplicável nesta etapa.** Justificativa técnica: a única
superfície client-side que carrega a lista active-only é
`listSelectableTenants`, e ela ainda não é consumida em nenhum ponto de
bootstrap (será consumida pelo switcher da F3.5). Implementar bootstrap
de `reconcileSelection` aqui exigiria decidir *quando* buscar a lista —
decisão que pertence ao contrato de UX da F3.5.

Mitigações que tornam esta pendência **BAIXO**:

1. `clearTenantSelectionOnServerRejection` (F3.4) cobre a **primeira**
   requisição inválida — o server rejeita, o estado local é limpo, a
   próxima requisição sai sem header e o server responde
   "Tenant selection required" (F3.2), que a F3.5 usará para exigir
   nova seleção.
2. Lifecycle cleanup (§6) elimina o cenário mais frequente de "tenant
   revogado offline" — troca de usuário e logout já limpam.
3. F3.5 terá **hard gate obrigatório** para chamar
   `reconcileSelection(activeIds)` no bootstrap do switcher.

## 8. Testes executados

**Novo:** `src/integrations/supabase/__tests__/tenant-attacher.spec.ts`
— 7 specs cobrindo a matriz completa de precedência:

1. sem impersonação + sem seleção → `{}`;
2. só impersonação → header de impersonação;
3. só seleção → header de seleção;
4. impersonação + seleção → impersonação vence;
5. seleção `""` (falsy) → `{}`;
6. impersonação `""` + seleção válida → cai para seleção;
7. matriz completa: nunca mais de 1 header.

**Re-executado:** `tenant-selection-state.spec.ts` (F3.4) — sem
regressão.

**Comando único executado:**

```bash
bunx tsx -e "
import('./src/integrations/supabase/__tests__/tenant-attacher.spec.ts').then(async m => {
  const r = await m.runTenantAttacherSpecs(); console.log('ATTACHER', JSON.stringify(r));
});
import('./src/integrations/supabase/__tests__/tenant-selection-state.spec.ts').then(async m => {
  const r = await m.runTenantSelectionStateSpecs(); console.log('STATE', JSON.stringify(r));
});
"
```

**Resultado:**

```
STATE    {"passed":8,"failed":0}
ATTACHER {"passed":7,"failed":0}
```

**Total:** 15 passed, 0 failed.

**Testes de lifecycle (SIGNED_OUT / troca de usuário):** cobertos por
inspeção manual do código + tests unitários dos helpers
`clearSelectedTenantId` / `clearImpersonationTenantId` já existentes
nas suítes de `tenant-selection-state.spec.ts` e
`impersonation-state.spec.ts`. Testes de integração do `useEffect`
exigem harness React DOM (jsdom) que o projeto não expõe hoje neste
runner framework-agnostic; a limitação está registrada como risco
**BAIXO** no §12.

## 9. Typecheck / lint

**Typecheck:**

```bash
$ bunx tsgo --noEmit
# exit code: 0, sem output
```

**Lint:** o `package.json` do projeto não expõe script `lint`
dedicado; o pipeline de build padrão do template roda `eslint` como
parte do build automático (fora do controle deste patch). Não há
regressão de tipos nos 5 arquivos alterados.

## 10. Anti-regressão

```bash
$ rg -n "tenant_members|membership_status|is_default|is_owner|tenant_role|ORDER BY|LIMIT 1|fallback|tenant default" \
     src/integrations/supabase/tenant-attacher.ts \
     src/components/workspace/AppHeader.tsx \
     src/components/workspace/WorkspaceShell.tsx \
     src/integrations/supabase/__tests__/tenant-attacher.spec.ts
(sem matches)
```

Confirmado:

- ❌ client não lê `tenant_members` para popular seletor;
- ❌ client não filtra `membership_status`;
- ❌ `is_default` não usado;
- ❌ `is_owner` não usado;
- ❌ `tenant_role` não usado como resolvedor;
- ❌ `ORDER BY` / `LIMIT 1` não usado;
- ❌ fallback não usado;
- ❌ tenant default não usado;
- ✅ `selected_tenant_id` é limpo em logout, `SIGNED_OUT` e troca de
  usuário;
- ✅ `getSelectedTenantId()` é alcançável em `tenant-attacher.ts` (§5);
- ✅ as duas fontes nunca são combinadas (spec #7).

## 11. SQL / RLS / migrations

- **Migrations criadas:** **NENHUMA**. `ls supabase/migrations/` sem
  arquivo novo desta fase.
- **SQL functions alteradas:** **NENHUMA**
  (`get_current_tenant_id`, `is_super_admin`, `user_belongs_to_tenant`,
  `user_has_active_membership` intocadas — herdadas de F3.3.3/F3.3.2).
- **Policies alteradas:** **NENHUMA**.
- **Grants alterados:** **NENHUM**.

## 12. Riscos residuais

| Risco | Classificação | Nota |
|-------|---------------|------|
| Reconciliação `reconcileSelection` no bootstrap ainda pertence a F3.5 | **BAIXO** | Coberto por `clearTenantSelectionOnServerRejection` na primeira falha; lifecycle cleanup elimina o cenário mais frequente. |
| Testes de integração do `useEffect` de `onAuthStateChange` não rodam no runner atual | **BAIXO** | Helpers unitários cobertos; código do effect é linear e revisado. |
| `USER_UPDATED` com refresh de token não deve disparar cleanup (uid igual) | **JUSTIFICADO** | Comparação `uid !== lastUserId` impede cleanup em refresh. |
| Nenhum risco CRÍTICO / ALTO / MÉDIO identificado | — | — |

## 13. Decisão recomendada

**Opção A — F3.4 aprovada após patch F3.4.1.**

- ✅ `tenant-attacher.ts` corrigido, seleção comum transportada;
- ✅ impersonação Super Admin mantém precedência absoluta;
- ✅ lifecycle cleanup implementado (logout, `SIGNED_OUT`, troca de
  usuário);
- ✅ 15/15 testes passando (7 novos do attacher + 8 do state);
- ✅ typecheck limpo (`bunx tsgo --noEmit` exit 0);
- ✅ zero alteração em RLS / SQL / policies / grants / migrations;
- ✅ zero alteração fora do escopo autorizado.

## 14. Audit Package / Pacote de Auditoria

- **Commit / edit ID:** este edit (F3.4.1 — Tenant Attacher Fix &
  Lifecycle Cleanup Wiring). Commit SHA não exposto pelo conector
  Lovable ao agente; conteúdo essencial reproduzido acima.
- **Arquivos alterados (exatos):**
  - `src/integrations/supabase/tenant-attacher.ts` *(alterado)*
  - `src/components/workspace/AppHeader.tsx` *(alterado)*
  - `src/components/workspace/WorkspaceShell.tsx` *(alterado)*
  - `src/integrations/supabase/__tests__/tenant-attacher.spec.ts` *(novo)*
  - `docs/delivery/phase-03-membership-evolution/38-f3-4-1-tenant-attacher-fix-lifecycle-cleanup.md` *(novo)*
- **Migrations criadas:** **NENHUMA**.
- **Diff resumido por arquivo:**
  - `tenant-attacher.ts`: extração de `resolveTenantTransportHeader`
    (pura) + middleware refatorado para usá-la; leitura de
    `getSelectedTenantId` só quando impersonação é null;
  - `AppHeader.tsx`: import + `clearSelectedTenantId()` antes de
    `supabase.auth.signOut()`;
  - `WorkspaceShell.tsx`: import + `onAuthStateChange` estendido para
    limpar seleção em `SIGNED_OUT` e em troca de `user.id`;
  - `tenant-attacher.spec.ts`: 7 specs cobrindo matriz de precedência.
- **Antes/depois das funções SQL alteradas:** **nenhuma função SQL
  alterada** (§11).
- **Queries / inspeções executadas:**
  - `rg` anti-regressão nos 4 arquivos alterados (§10) — 0 matches;
  - `ls supabase/migrations/` — nenhum arquivo novo desta fase;
  - `bunx tsgo --noEmit` — exit 0.
- **Resultado dos testes:** `ATTACHER {"passed":7,"failed":0}` +
  `STATE {"passed":8,"failed":0}`.
- **Riscos residuais:** §12.
- **Alterações fora do escopo:** **nenhuma**.

## 15. Verificação de acesso para auditoria

- Relatório salvo em
  `docs/delivery/phase-03-membership-evolution/38-f3-4-1-tenant-attacher-fix-lifecycle-cleanup.md`.
- Deve estar acessível via conector Lovable (`get_diff`, `list_files`,
  `read_file`, `list_edits`).
- Limitação conhecida: o conector Lovable não expõe **commit SHA** ao
  agente; o Audit Package usa "edit ID" descritivo. Conteúdo final dos
  arquivos alterados está reproduzido no relatório (§5, §6) e na spec
  (§8) para permitir auditoria offline.

## 16. Confirmação formal

Confirmo que a F3.4.1 corrigiu o retorno antecipado em `tenant-attacher.ts`.

Confirmo que `getSelectedTenantId()` agora é alcançável quando não há
impersonação Super Admin.

Confirmo que a precedência final é: impersonação Super Admin > seleção
comum > sem header.

Confirmo que seleção comum válida agora é transportada via `x-tenant-id`.

Confirmo que `x-tenant-id` continua sendo transporte, não autoridade.

Confirmo que Super Admin impersonation permanece separado da seleção
comum.

Confirmo que logout limpa `selected_tenant_id`.

Confirmo que `SIGNED_OUT` limpa `selected_tenant_id`.

Confirmo que troca de usuário limpa `selected_tenant_id`.

Confirmo que não foi implementado Tenant Switcher UX.

Confirmo que F3.5 não foi implementada.

Confirmo que nenhuma SQL function crítica foi alterada.

Confirmo que nenhuma policy RLS foi alterada.

Confirmo que nenhuma migration foi criada.

Confirmo que nenhum grant foi alterado.

Confirmo que nenhum fluxo de Storage, Runtime Core, Registry,
RegistrySnapshot, ResolutionGraph, ActionExecutor, PluginContext ou
billing foi alterado.

Confirmo que os testes do attacher foram criados e passaram (7/7).

Confirmo que os testes do `tenant-selection-state` continuam passando
(8/8).

Confirmo que typecheck foi executado (`bunx tsgo --noEmit`, exit 0) e
lint dedicado não existe como script no projeto — delegado ao pipeline
de build (justificativa registrada em §9).

Confirmo que o relatório contém Audit Package / Pacote de Auditoria
completo.

Confirmo que a recomendação final é **Opção A — F3.4 aprovada após
patch F3.4.1**, conforme evidência real (§8, §9, §11).
