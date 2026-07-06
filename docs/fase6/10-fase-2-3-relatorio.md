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
| `docs/fase6/10-fase-2-3-relatorio.md` | Este relatório |

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

- Persistência em `localStorage` sobrevive a logout; mitigado pela
  re-validação server-side a cada chamada, mas convém adicionar cleanup
  em `SIGNED_OUT` (candidato a micro-refino no Backlog GA-06, sem IA).
- Sem UI de switcher para usuários multi-membership (fora de escopo 2.3;
  contemplado no roadmap pós-Fase 2).
- Ausência de auditoria persistente de impersonação (candidato natural a
  IA futura de Security Audit Trail).

## 9. Conformidade

Declaro conformidade explícita com:

- `ARCHITECTURE_CONSTITUTION.md` — nenhum invariante violado.
- `SECURITY_ARCHITECTURE.md` — trust boundary respeitada; header
  categorizado como *untrusted transport*; autoridade em `requireTenant`.
- `IA-002-ClientImpersonationLayer.md` — escopo, regras e proibições
  seguidas integralmente.

## 10. Próxima etapa

**Aguardando auditoria externa.** Após aprovação: criar
`docs/architecture/impact-analysis/IA-003-RLSPolicies.md` para iniciar M2b.
