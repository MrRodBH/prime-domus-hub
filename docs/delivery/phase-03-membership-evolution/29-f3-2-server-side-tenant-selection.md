# F3.2 — Server-Side Tenant Selection

## 1. Objetivo

Evoluir exclusivamente a camada server-side de resolução de tenant para
permitir que um usuário comum, com múltiplas memberships ativas, possa
ter um tenant selecionado via `x-tenant-id`, desde que essa seleção seja
validada no servidor contra uma membership `active` do próprio usuário.

Regra central preservada: **`x-tenant-id` é transporte, nunca autoridade.**

## 2. Contexto

- Fase 2 encerrada.
- IA-005 aprovada como base analítica da Fase 3.
- F3.1 concluída: `tenant_members` possui `tenant_role`,
  `membership_status`, índice `tenant_members_active_lookup_idx`.
- Nenhuma etapa posterior (F3.3+) implementada aqui.

## 3. Escopo Autorizado

- Alterar `TenantRepository` (adicionar `userHasActiveMembership`,
  filtrar `listByUser` por `membership_status = 'active'`).
- Alterar `resolveTenantContext` (aceitar seleção validada, derivar
  `origin` server-side, separar fluxo Super Admin).
- Atualizar testes framework-agnóstico.
- Este documento.

## 4. Arquivos Alterados

- `src/integrations/supabase/tenant-repository.ts`
- `src/integrations/supabase/tenant-middleware.ts`
- `src/integrations/supabase/__tests__/tenant-middleware.spec.ts`
- `docs/delivery/phase-03-membership-evolution/29-f3-2-server-side-tenant-selection.md` (novo)

## 5. Arquivos Inspecionados e Não Alterados

- `src/integrations/supabase/impersonation-state.ts`
- `src/integrations/supabase/tenant-attacher.ts`
- `src/integrations/supabase/auth-middleware.ts`
- `src/integrations/supabase/auth-attacher.ts`
- `src/integrations/supabase/client.ts` / `client.server.ts`
- `src/start.ts`
- `src/hooks/use-tenant.ts`
- `src/lib/api/uploads.functions.ts` (único consumidor atual de
  `requireTenant`; contrato preservado — segue lendo `context.tenant.tenantId`).
- Todas as funções SQL (`get_current_tenant_id`,
  `user_belongs_to_tenant`, `is_super_admin`).

## 6. Alterações Implementadas

### 6.1 TenantRepository

- `listByUser(userId)` agora filtra por `membership_status = 'active'`.
  Memberships `invited`, `suspended` e `revoked` **não** aparecem para
  fins de cardinalidade nem de resolução automática.
- Novo método `userHasActiveMembership(userId, tenantId)` retorna
  `true` somente quando existe registro em `tenant_members` com o par
  `(user_id, tenant_id)` e `membership_status = 'active'`.
- Nenhum uso de `is_default`, `is_owner`, `tenant_role`, `ORDER BY`,
  `LIMIT 1`, `getDefault`, `getFirst` ou heurística.

### 6.2 resolveTenantContext

Fluxo final:

1. **Super Admin + header** → valida UUID + `repo.exists` →
   `origin = 'impersonation'`.
2. **Super Admin sem header** → erro `Forbidden: no tenant membership`
   (nunca resolve tenant via `tenant_members`).
3. **Usuário comum + header** → valida UUID + `userHasActiveMembership`
   → `origin = 'selection'`. Header malformado → `Invalid tenant
   selection.`; tenant sem membership ativa (alheio, inexistente,
   invited/suspended/revoked) → `Tenant access denied.`.
4. **Usuário comum sem header** → cardinalidade sobre memberships
   ATIVAS: 0 → erro; 1 → `origin = 'single-membership'`; N → erro
   `Multiple tenant memberships. Tenant selection required.`.

### 6.3 requireTenant

Sem mudança estrutural: lê `x-tenant-id`, chama `is_super_admin` RPC,
delega a `resolveTenantContext`. Injeta `context.tenant` inalterado em
formato, agora enriquecido com `origin`.

### 6.4 TenantContext / origin

Adicionado tipo `TenantContextOrigin =
'impersonation' | 'selection' | 'single-membership'` e campo `origin`
no `TenantContext`. Derivação exclusivamente server-side — não há
caminho na assinatura pública para receber `origin` do cliente,
garantia por construção do tipo.

## 7. Condicionantes Obrigatórias Cumpridas

- `x-tenant-id` permanece transporte.
- Servidor é a única autoridade.
- Sem tenant default, sem fallback, sem seleção automática entre N.
- Sem `is_default`, sem `is_owner`, sem `tenant_role` na resolução.
- Sem `LIMIT 1` nem `ORDER BY` para escolher tenant.
- Super Admin sem impersonação não acessa recurso tenant-scoped.
- Impersonação e seleção comum permanecem em fluxos separados,
  auditáveis via `origin`.
- Runtime Core, RLS, migrations, client/UI, storage, billing:
  intocados.

## 8. Comportamento Final por Cenário

### 8.1 Usuário comum sem header
- 0 ativas → `Forbidden: no tenant membership`.
- 1 ativa → resolve automaticamente, `origin=single-membership`.
- N ativas → `Multiple tenant memberships. Tenant selection required.`.

### 8.2 Usuário comum com header válido
- Header aponta para tenant onde o próprio usuário tem membership
  `active` → resolve, `origin=selection`, `impersonation=false`.

### 8.3 Usuário comum com header inválido
- UUID malformado → `Invalid tenant selection.`.
- Tenant alheio, inexistente ou membership não-ativa →
  `Tenant access denied.`.

### 8.4 Membership invited/suspended/revoked
- Nunca conta como ativa. Não permite seleção via header. Não conta
  para cardinalidade automática.

### 8.5 Super Admin com impersonação
- Header UUID + tenant existente → resolve com
  `impersonation=true`, `origin=impersonation`.

### 8.6 Super Admin sem impersonação
- Não acessa recurso tenant-scoped: `Forbidden: no tenant membership`.
  (Mudança intencional em relação ao pré-F3.2: alinhamento com
  `get_current_tenant_id()` — Super Admin sem header já retornava
  NULL na camada SQL.)

## 9. Testes Criados ou Atualizados

`src/integrations/supabase/__tests__/tenant-middleware.spec.ts` foi
expandido para cobrir os cenários obrigatórios (§10 do prompt): Super
Admin com/sem/ inválido header; usuário comum com 0/1/N memberships
ativas com/sem header; header alheio / malformado / inexistente;
memberships invited/suspended/revoked bloqueadas; combinações
active+suspended; `origin` derivado no servidor.

## 10. Testes Executados

Especificação framework-agnóstica; `tsgo --noEmit` verifica os tipos
das mocks (`TenantRepository` completo com `userHasActiveMembership`)
e das asserções sobre `TenantContextOrigin`. Execução das asserções em
runner ocorre via `runTenantMiddlewareSpecs()` (GA-04/GA-05).

## 11. Itens Não Alterados

- `get_current_tenant_id()`, `user_belongs_to_tenant()`, `is_super_admin()`.
- Nenhuma migration criada.
- Nenhuma policy RLS alterada.
- `impersonation-state.ts`, `tenant-attacher.ts`, `attachTenantHeader`,
  `src/start.ts`, `use-tenant.ts` — intocados.
- Storage, UI, Runtime Core, Registry, RegistrySnapshot,
  ResolutionGraph, ActionExecutor, PluginContext — intocados.
- Billing, planos, trial, integrações comerciais — não implementados.

## 12. Limitações Conhecidas

- Camada server-side TypeScript agora aceita seleção validada, porém
  `public.get_current_tenant_id()` (usada por RLS) **ainda não**
  espelha a mesma validação: para usuário comum com N memberships, o
  SQL segue retornando `NULL` mesmo se o header apontar para uma
  membership ativa. Essa discrepância é esperada e será resolvida em
  F3.3.
- Nesta etapa não há transporte client-side comum para
  `x-tenant-id` (usuário comum ainda não envia header pelo fluxo
  oficial). Transporte será F3.4.

## 13. Riscos Residuais

- **R1 — Divergência TS × SQL**: server function decorada com
  `requireTenant` resolve seleção via header para usuário comum com N
  memberships, mas as queries subsequentes sob RLS podem ler
  `get_current_tenant_id() = NULL` e falhar. Mitigado enquanto não
  houver caller comum enviando `x-tenant-id` (nenhum hoje).
  Endereçado formalmente em F3.3.
- **R2 — Super Admin sem header em `uploads`**: consumidor único de
  `requireTenant` agora rejeita Super Admin sem impersonação. Consistente
  com política arquitetural; não é regressão funcional para usuários
  comuns.

## 14. Próxima Subetapa Recomendada

**F3.3 — RLS Membership Selection Patch**: espelhar a seleção validada
em `public.get_current_tenant_id()`, sem confiar no cliente, sem
fallback, sem `is_default`, sem `is_owner`, sem `LIMIT 1`, sem
`ORDER BY`. Sujeita a prompt próprio e auditoria externa.

## 15. Confirmação Formal

Confirmo que a F3.2 — Server-Side Tenant Selection foi executada como
etapa limitada à resolução server-side de tenant.

Confirmo que `x-tenant-id` continua sendo transporte, nunca autoridade.

Confirmo que usuário comum com `x-tenant-id` só resolve tenant mediante
`membership_status = active` validada server-side.

Confirmo que memberships `invited`, `suspended` e `revoked` não
resolvem tenant.

Confirmo que usuário comum com tenant alheio, header inválido ou tenant
inexistente é rejeitado sem fallback.

Confirmo que usuários com N memberships ativas e sem header continuam
exigindo seleção explícita.

Confirmo que usuários com uma única membership ativa e sem header
continuam resolvendo automaticamente.

Confirmo que Super Admin permanece em fluxo separado de impersonação.

Confirmo que `is_default`, `is_owner` e `tenant_role` não foram usados
para resolução de tenant.

Confirmo que `TenantContext.origin` é calculado exclusivamente
server-side.

Confirmo que `get_current_tenant_id()`, RLS, policies, client, UI,
storage, impersonação e Runtime Core não foram alterados.

Confirmo que billing, planos, trial, integrações comerciais e Tenant
Switcher não foram implementados.

Confirmo que a próxima etapa recomendada é apenas F3.3 — RLS
Membership Selection Patch, sujeita a prompt próprio, relatório
próprio e auditoria externa.
