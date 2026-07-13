# Fase 2.3 — Client Impersonation Layer · Relatório Técnico

**Status:** ✔ Implementada — aguardando auditoria
**IA de referência:** `docs/architecture/impact-analysis/IA-002-ClientImpersonationLayer.md`
**Governança:** `ARCHITECTURE_CONSTITUTION.md`, `SECURITY_ARCHITECTURE.md`

---

## 1. Escopo executado

Propagação segura do contexto de tenant do client para o server via header
`x-tenant-id`, com autoridade final **exclusivamente** server-side em
`requireTenant` (IA-001).

O header é **transporte de contexto**, nunca autoridade.

## 2. Arquivos

### Criados / atualizados nesta fase

| Arquivo | Papel |
|---|---|
| `src/integrations/supabase/__tests__/tenant-middleware.spec.ts` | +3 cenários: empty header, stale impersonation (ex-super), tenant hopping |
| `docs/architecture/ROADMAP_ARCHITECTURAL.md` | Fase 2.3 marcada `✔ Concluída`; M2b promovido a NEXT (pending IA-003) |
| `docs/delivery/architectural-roadmap/phase-02-multi-tenancy/10-fase-2-3-relatorio.md` | Este relatório |

### Já em vigor (implementados em blocos anteriores e agora oficializados como Fase 2.3)

| Arquivo | Papel |
|---|---|
| `src/integrations/supabase/tenant-attacher.ts` | Middleware client — lê `localStorage["impersonate_tenant_id"]` e anexa `x-tenant-id` |
| `src/start.ts` | Registra `attachTenantHeader` **depois** de `attachSupabaseAuth` no `functionMiddleware` |
| `src/integrations/supabase/tenant-middleware.ts` | Autoridade server-side (`requireTenant`) |
| `src/integrations/supabase/tenant-repository.ts` | Acesso determinístico a memberships / existência de tenant |
| `src/routes/_authenticated.super.index.tsx` | UI Super Admin: iniciar / encerrar impersonação |
| `src/components/workspace/AppHeader.tsx` | Banner visível de impersonação ativa |
| `src/components/workspace/WorkspaceShell.tsx` | Exposição do estado de impersonação no shell |

## 3. Fluxo de propagação

1. Super Admin, em `/super`, clica **Entrar** em um tenant. UI grava
   `localStorage["impersonate_tenant_id"] = tenantId` (UUID) e navega.
2. `attachTenantHeader` (client middleware) lê o valor e injeta o header
   `x-tenant-id` em **toda** chamada de `createServerFn`.
3. No server, `requireTenant` (composto sobre `requireSupabaseAuth`) executa
   `resolveTenantContext`:
   - lê `x-tenant-id` da request;
   - checa `is_super_admin` via RPC autoritativa (server-side, SECURITY DEFINER);
   - super + UUID válido + tenant existente → contexto marcado `impersonation: true`;
   - qualquer falha → `Error` (`Forbidden` / `Invalid tenant`), sem fallback.
4. UI expõe banner de impersonação e ação de encerrar (remove a chave e
   invalida caches).

## 4. Garantias de segurança

| Ameaça | Mitigação |
|---|---|
| **Forged header** por usuário comum | `requireTenant` re-checa `is_super_admin` server-side → `Forbidden` |
| **Tenant hopping** entre chamadas | Cada chamada re-resolve isoladamente; sem cache global |
| **Stale impersonation** (ex-super) | RPC `is_super_admin` executada por request; header vira `Forbidden` no instante da revogação |
| **Impersonação de tenant inexistente** | `repo.exists(uuid)` → `Invalid tenant` |
| **UUID malformado / injeção** | Regex UUID v4 antes de qualquer query |
| **Cross-tenant leak** | Autoridade única em `requireTenant`; nenhum caminho paralelo |
| **Header em user comum sem impersonação** | Attacher só envia se `localStorage` estiver setado; setter é UI-only para super |

## 5. Testes

`src/integrations/supabase/__tests__/tenant-middleware.spec.ts` — 11 cenários
determinísticos (framework-agnostic conforme Unit Testing Policy):

1. super sem impersonação, 1 membership → resolve
2. super com impersonação válida → header vence
3. super com UUID inválido → `Invalid tenant`
4. super com UUID desconhecido → `Invalid tenant`
5. **não-super enviando header (forged)** → `Forbidden`
6. usuário comum com 1 membership → resolve
7. usuário comum com N memberships → seleção explícita exigida
8. usuário sem memberships → `Forbidden`
9. **empty header** → tratado como sem impersonação
10. **stale impersonation (ex-super)** → `Forbidden`
11. **tenant hopping** — 3 resolves sucessivos independentes

## 6. Typecheck & Coupling scan

- `bunx tsgo --noEmit` → **0 erros**.
- `rg "ResolutionGraph|RegistrySnapshot|ActionExecutor|PluginContext|PluginRegistry|bootstrapWorkspaceRegistries"`
  nos módulos tocados → único hit é o **comentário** em
  `tenant-middleware.ts` que declara explicitamente a NÃO-alteração desses
  runtimes. Nenhum import, nenhum acoplamento.

## 7. Runtime protegido (confirmações)

| Componente | Estado |
|---|---|
| Workspace Runtime | Intacto |
| ResolutionGraph | Intacto |
| Registry | Intacto |
| Snapshot | Intacto |
| ActionExecutor | Intacto |
| PluginContext | Intacto |
| Bootstrap | Intacto |
| Hard Gates G0–G7 | Preservados |

## 8. Riscos remanescentes

- Persistência de impersonação em `localStorage` após logout — **resolvida pelo Patch 2.3.1**.
- Sem UI de switcher para usuários multi-membership — fora de escopo da Fase 2.3; contemplado no roadmap pós-Fase 2.
- Ausência de auditoria persistente de impersonação — candidato a IA futura de Security Audit Trail.

## 9. Conformidade

Declaro conformidade explícita com:

- `ARCHITECTURE_CONSTITUTION.md` — nenhum invariante violado.
- `SECURITY_ARCHITECTURE.md` — trust boundary respeitada; header
  categorizado como *untrusted transport*; autoridade em `requireTenant`.
- `IA-002-ClientImpersonationLayer.md` — escopo, regras e proibições
  seguidas integralmente.

## 10. Próxima etapa

**Aguardando auditoria do Patch 2.3.1.** Após aprovação: criar
`docs/architecture/impact-analysis/IA-003-RLSPolicies.md` para iniciar M2b.

---

## 11. Patch 2.3.1 — Security Hardening: Impersonation Local State Cleanup

**Status:** ✔ Implementado — aguardando auditoria
**Categoria:** Security Hardening (não altera Constitution, Security
Architecture, IA-002, ADRs, Hard Gates ou Runtime).

### 11.1 Motivação

O valor `localStorage["impersonate_tenant_id"]` podia sobreviver a
transições de sessão. A segurança da plataforma nunca foi comprometida —
`requireTenant` re-avalia autoridade a cada chamada —, mas o estado
residual gerava ruído operacional, UX inconsistente e envio desnecessário
de `x-tenant-id`. O patch introduz limpeza determinística em todos os
pontos de transição.

### 11.2 Arquivos modificados / criados

| Arquivo | Papel |
|---|---|
| `src/integrations/supabase/impersonation-state.ts` **(novo)** | Fonte única do estado local: `get`/`set`/`clear`/`subscribe` + `clearImpersonationOnServerRejection` |
| `src/integrations/supabase/use-impersonation.ts` **(novo)** | Hook React (`useSyncExternalStore`) — leitura reativa e SSR-safe |
| `src/integrations/supabase/__tests__/impersonation-state.spec.ts` **(novo)** | 5 specs framework-agnostic |
| `src/integrations/supabase/tenant-attacher.ts` | Passa a ler o estado via módulo único |
| `src/components/workspace/WorkspaceShell.tsx` | Assina `SIGNED_OUT` (Regra 2) + limpeza na inicialização para não-Super (Regra 5) + estado visual reativo (Regra 6) |
| `src/components/workspace/AppHeader.tsx` | `signOut()` limpa o estado antes do `supabase.auth.signOut()` (Regra 1) |
| `src/routes/_authenticated.super.index.tsx` | Usa `setImpersonationTenantId` / `clearImpersonationTenantId` e o hook `useImpersonation` (Regras 3 e 6) |

Nenhum arquivo de runtime protegido (`ResolutionGraph`, `Registry`,
`Snapshot`, `ActionExecutor`, `PluginContext`, `PluginRegistry`,
`Bootstrap`, `Workspace Runtime`) foi tocado. `requireTenant` e
`tenant-repository` permanecem inalterados.

### 11.3 Eventos que executam limpeza

| Evento | Regra | Mecanismo |
|---|---|---|
| Logout via UI (menu → Sair) | 1 | `AppHeader.signOut()` chama `clearImpersonationTenantId()` antes do `supabase.auth.signOut()` |
| Evento `SIGNED_OUT` do Supabase Auth | 2 | `WorkspaceShell` — `supabase.auth.onAuthStateChange` |
| Encerramento manual (banner "Encerrar impersonação") | 3 | `_authenticated.super.index.tsx` — `clearImpersonation()` + `qc.invalidateQueries()` |
| Rejeição server-side (`Forbidden` / `Invalid tenant` / `Tenant not found` / `Impersonation not allowed`) | 4 | `clearImpersonationOnServerRejection(err)` — heurística conservadora, disponível para call sites que capturem o erro. **Não aplicada globalmente** para preservar previsibilidade (justificativa técnica: aplicar globalmente exigiria um interceptor client transversal que não existe hoje; o utilitário está pronto e será acionado quando IA futura formalizar o observador de erros de tenant) |
| Inicialização com usuário não-Super | 5 | `WorkspaceShell` — `useEffect([isSuper, impersonating])` |
| Sincronização estado persistido ↔ visual ↔ transporte | 6 | Fonte única `impersonation-state.ts` + hook `useImpersonation` (`useSyncExternalStore`) — `tenant-attacher` lê o mesmo módulo |

### 11.4 Fluxo completo de limpeza

1. **UI** chama `clearImpersonationTenantId()` (Regras 1, 3) OU o
   listener de auth dispara em `SIGNED_OUT` (Regra 2) OU o `useEffect`
   de bootstrap detecta usuário não-Super com estado residual (Regra 5).
2. `impersonation-state.ts` remove a chave do `localStorage` e emite
   para todos os assinantes.
3. `useImpersonation` (via `useSyncExternalStore`) re-renderiza o banner
   em `AppHeader` e o painel de status em `/super` — estado visual =
   estado persistido.
4. Na próxima chamada de `createServerFn`, `attachTenantHeader` lê o
   estado (agora `null`) e **não** envia mais `x-tenant-id`.

### 11.5 Testes

`src/integrations/supabase/__tests__/impersonation-state.spec.ts` —
5 specs framework-agnostic (Unit Testing Policy):

1. set → get → clear roundtrip.
2. string vazia persistida é tratada como `null` (defesa contra
   estados residuais malformados).
3. `subscribeImpersonation` dispara em set/clear e para após `unsub()`.
4. `isImpersonationRejection` reconhece as 4 mensagens do server e
   ignora erros não relacionados / `null`.
5. `clearImpersonationOnServerRejection` só limpa quando há estado
   presente **E** o erro casa — no-op nos demais casos.

Cobertura de cenários da spec original preservada (11 specs em
`tenant-middleware.spec.ts` intactos).

### 11.6 Typecheck

`bunx tsgo --noEmit` → **0 erros**.

### 11.7 Coupling scan

```
rg "ResolutionGraph|RegistrySnapshot|ActionExecutor|PluginContext|PluginRegistry|bootstrapWorkspaceRegistries" \
   src/integrations/supabase/impersonation-state.ts \
   src/integrations/supabase/use-impersonation.ts \
   src/integrations/supabase/tenant-attacher.ts \
   src/integrations/supabase/__tests__/impersonation-state.spec.ts
```
→ **0 hits.** Nenhum acoplamento com runtimes protegidos.

### 11.8 Runtime protegido — confirmação

| Componente | Estado |
|---|---|
| Workspace Runtime | Intacto |
| ResolutionGraph | Intacto |
| Registry | Intacto |
| RegistrySnapshot | Intacto |
| ActionExecutor | Intacto |
| PluginContext | Intacto |
| PluginRegistry | Intacto |
| Bootstrap | Intacto |
| `requireTenant` | Intacto |
| `tenant-repository` | Intacto |
| Hard Gates G0–G7 | Preservados |
| Contratos públicos | Preservados |

### 11.9 Segurança — reafirmação explícita

- O client permanece **ambiente não confiável**.
- O header `x-tenant-id` permanece **transporte de contexto**, nunca
  autoridade.
- Nenhuma decisão crítica ocorre no navegador.
- Toda autoridade permanece em `requireTenant` (IA-001 / IA-002).
- A limpeza é *defense-in-depth*: mesmo sem ela o servidor rejeitaria
  header inválido; com ela, o cliente para de enviá-lo, reduzindo
  superfície e ruído.

### 11.10 Conformidade

- `ARCHITECTURE_CONSTITUTION.md` — nenhum invariante violado.
- `SECURITY_ARCHITECTURE.md` — trust boundary preservada.
- `IA-002-ClientImpersonationLayer.md` — regras e proibições respeitadas
  integralmente; nenhuma alteração de escopo.

### 11.11 Declaração final

O **Patch 2.3.1 concluiu o hardening da Fase 2.3.** Após aprovação
desta auditoria, a Fase 2.3 é considerada definitivamente encerrada e
fica autorizada a elaboração da **IA-003 — RLS Policies** (M2b).

