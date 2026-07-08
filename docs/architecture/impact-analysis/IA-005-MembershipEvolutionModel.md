# IA-005 — Membership Evolution Model

**Status:** 🟡 Impact Analysis (documental) — aguardando auditoria externa
**Tipo:** Impact Analysis / Arquitetura / Segurança / Dados / UX / Preparação para Fase 3
**Precedência:** IA-001 (Tenant Middleware) · IA-002 (Client Impersonation Layer) · IA-003 / M2b + Patch M2b.1 (RLS Policies) · IA-004 / M3 (Tenant Storage Isolation) · Fase 2 Closing Review ([`27`](../../fase6/27-phase-2-closing-review.md))
**Etapa alvo (futura):** Fase 3 — Membership Evolution Model
**Autor:** Arquitetura RM Prime SaaS

> **Escopo desta IA:** exclusivamente documental e analítico.
> Nenhum código, migration, RLS, middleware, impersonação, storage,
> UI ou runtime foi alterado.

---

## 1. Objetivo

Analisar o impacto técnico, arquitetural, de segurança, de dados, de UI e de
roadmap para a **evolução do modelo de memberships** do RM Prime SaaS,
preparando a futura implementação da **Fase 3 — Membership Evolution Model**
sem iniciar código.

O objetivo é responder a pergunta central:

> **Como evoluir o modelo de memberships para suportar usuários com N
> tenants, papéis por tenant, seleção explícita, e futura base comercial
> (planos/assentos/billing), sem violar as garantias conquistadas na
> Fase 2 — Multi-Tenant Core?**

Esta IA é o **Gate de Entrada** obrigatório (§7 da Constituição) para
qualquer implementação futura relacionada a memberships, seleção de tenant,
tenant switcher, planos, assentos ou billing.

---

## 2. Contexto Arquitetural

A Fase 2 — Multi-Tenant Core foi formalmente encerrada. O estado consolidado é:

| IA / Etapa | Status |
|---|---|
| IA-001 — Tenant Middleware | ✔ Concluída |
| IA-002 — Client Impersonation Layer + Patch 2.3.1 | ✔ Concluída |
| IA-003 / M2b — RLS Policies + Patch M2b.1 | ✔ Concluída |
| IA-004 / M3 — Tenant Storage Isolation | ✔ Concluída |
| Fase 2 Closing Review | ✔ Aprovada |

A regra de cardinalidade multi-tenant vigente (server-authoritative) é:

```
0 memberships → NULL / erro controlado
1 membership → tenant_id
N memberships → NULL, exceto com seleção explícita validada ou impersonação válida
```

Materializada simultaneamente em:

- **`resolveTenantContext`** (IA-001, `src/integrations/supabase/tenant-middleware.ts`)
- **`get_current_tenant_id()`** (Patch M2b.1) — mesma cardinalidade estrita
  no banco, sem `LIMIT 1`, sem `ORDER BY`, sem `is_default`, sem `is_owner`.

Documentos oficiais aplicáveis:

- `docs/architecture/ARCHITECTURE_CONSTITUTION.md`
- `docs/architecture/security/SECURITY_ARCHITECTURE.md`
- `docs/architecture/ROADMAP_ARCHITECTURAL.md`
- `docs/architecture/impact-analysis/IA-001..IA-004`
- `docs/fase6/27-phase-2-closing-review.md`

---

## 3. Estado Atual

### 3.1 Modelo de dados (inspecionado no repositório)

Tabelas relevantes ao modelo atual de memberships:

- **`public.tenants`** — 10 colunas. Entidade tenant.
- **`public.tenant_members`** — 5 colunas, 2 policies. Vínculo `user_id ↔ tenant_id`.
  - Estrutura observada: `id`, `user_id`, `tenant_id`, `created_at`,
    e um índice `tenant_members_user_idx (user_id)`.
  - **Não** possui hoje campos `role`, `is_default`, `is_owner`, `status`
    (`active`/`suspended`), `invited_at`, `accepted_at` ou `seat_id`.
- **`public.user_roles`** — 4 colunas, 2 policies. Papéis **globais** por
  usuário (`app_role`: `super_admin`, `admin`, `corretor`, `secretaria`, …).
  Não é tenant-scoped.
- **`public.user_profiles`** — vínculo `user_id ↔ rbac_profiles.id`
  (perfil RBAC), sincronizado por trigger a partir de `user_roles`.
- **`public.rbac_profiles` / `rbac_modules` / `rbac_permissions`** — RBAC de
  permissões por módulo / ação / escopo (`global` / `equipe` / `próprio`).
  Não é tenant-scoped por design atual.
- **`public.teams` / `team_members`** — subdivisão intra-tenant (equipes),
  ortogonal ao vínculo `tenant_members`.

### 3.2 Backend / Server Authority

- **`requireTenant`** (`src/integrations/supabase/tenant-middleware.ts`) —
  compõe sobre `requireSupabaseAuth`, chama `is_super_admin`, delega para
  `resolveTenantContext`.
- **`resolveTenantContext`** — algoritmo puro com 3 etapas: impersonação
  (super-admin + UUID válido + tenant existente), memberships (sem LIMIT,
  sem ORDER BY), cardinalidade explícita.
- **`TenantRepository`** (`tenant-repository.ts`) — `listByUser`, `exists`.
  Sem `getDefault`, sem `getOwner`.
- **`get_current_tenant_id()`** (SQL, `SECURITY DEFINER`) — mesma
  cardinalidade estrita; para super-admin exige header; para usuário comum
  ignora header.
- **`is_super_admin()`** (SQL) — consulta `user_roles.role = 'super_admin'`.

### 3.3 Client / UI

- **`attachTenantHeader`** (`tenant-attacher.ts`) — anexa `x-tenant-id`
  **apenas** quando super-admin está impersonando (fonte única:
  `impersonation-state.ts`, Patch 2.3.1).
- **Não existe** hoje UI de seleção de tenant para usuário comum com N
  memberships (o cenário é bloqueado no server com erro `"Multiple tenant
  memberships. Tenant selection required."`).
- **`use-tenant.ts`** — hook client-side de leitura; nunca autoridade.

### 3.4 RLS / Segurança

- 40+ tabelas de domínio com RLS RESTRICTIVE tenant-scoped via
  `get_current_tenant_id()` e `user_belongs_to_tenant()` (M2b + Patch M2b.1).
- `tenant_members`: 2 policies (read scoping).
- `user_roles`: self-read + admin-all.
- Storage: paths tenant-scoped (M3.2 + Patch M3.2.1) e signed URL hardening
  (M3.4 + Patch M3.4.1).

### 3.5 Runtime Core

Registry / RegistrySnapshot / ResolutionGraph / ActionExecutor /
PluginContext / Bootstrap **não conhecem memberships** e **não devem**
conhecer. O tenant atravessa a fronteira exclusivamente pelo
`TenantContext` server-side e pela chave de snapshot por tenant.

---

## 4. Problema a Resolver

O modelo atual sustenta a Fase 2, mas apresenta as seguintes lacunas para
evolução SaaS:

1. **Usuários com N memberships são funcionalmente bloqueados** — o server
   corretamente rejeita, mas não existe caminho legítimo de seleção
   explícita.
2. **Não há noção de papel por tenant** — `user_roles` é global; um usuário
   que participe de 2 tenants não pode ter papéis distintos em cada.
3. **Não há status de membership** (`active`, `invited`, `suspended`,
   `revoked`) — bloqueia convites, offboarding e futuros limites por plano.
4. **Não há noção de assento (seat)** — bloqueia planos comerciais.
5. **Não há status comercial de tenant** (`trial`, `active`, `past_due`,
   `suspended`) — bloqueia billing.
6. **Não há vínculo entre membership e plano/produto** — bloqueia SaaS
   comercial.
7. **UI não expõe troca de tenant** — mesmo que o backend passasse a
   suportar seleção explícita, não há superfície de UX.

Todas as lacunas devem ser resolvidas **sem** reintroduzir tenant default,
seleção automática, `LIMIT 1`, `ORDER BY`, `is_default`, `is_owner`,
fallback ou heurística.

---

## 5. Escopo da Análise

- Modelo de dados de memberships, papéis por tenant, status, assentos.
- Impacto em `requireTenant`, `resolveTenantContext`, `TenantRepository`.
- Impacto em `get_current_tenant_id()` e funções SQL de suporte.
- Impacto em RLS e policies existentes.
- Superfície de UI necessária para seleção explícita de tenant.
- Interação com Super Admin / impersonação.
- Preparação **arquitetural** para billing / planos / assentos (sem
  implementar).
- Comparação de alternativas de resolução de tenant (client, server,
  session, JWT claim, persistência).
- Riscos e mitigações.

---

## 6. Fora do Escopo

- Implementação de qualquer código, migration, policy, função SQL, server
  function, middleware, hook, componente ou rota.
- Implementação de billing, planos, assentos, trial, upgrade/downgrade,
  Stripe, Hotmart, Kiwify ou qualquer integração comercial.
- Implementação de tenant switcher.
- Alteração de `get_current_tenant_id`, `requireTenant`,
  `resolveTenantContext`, `TenantRepository`, impersonação, storage,
  Super Admin.
- Alteração de Runtime Core (Registry / Snapshot / ResolutionGraph /
  ActionExecutor / PluginContext / Bootstrap).
- Execução de GA-08 (Documentation Repository Reorganization).
- Execução de Upload Provenance Token.
- Execução de M3.3.2 (Metadata Rewrite Batch).
- Execução de Storage Abstraction Layer.
- Criação de novos Hard Gates.

---

## 7. Superfícies Impactadas

### 7.1 Dados / Schema

**Estado atual:** `tenant_members(id, user_id, tenant_id, created_at)`;
sem papel, sem status, sem assento.

**Impacto futuro (recomendação, não implementação):**

- Estender `tenant_members` com:
  - `role` (enum tenant-scoped, ex.: `owner`, `admin`, `member`, `viewer`)
    — distinta do `app_role` global.
  - `status` (enum: `active`, `invited`, `suspended`, `revoked`).
  - `invited_at`, `accepted_at`, `suspended_at`.
- Introduzir tabela futura `tenant_billing_status` (ou colunas em `tenants`)
  para `plan`, `seats_limit`, `billing_status` (`trial`/`active`/`past_due`/
  `suspended`) — **fora do escopo desta IA implementar**.
- **Proibido** introduzir `is_default` ou `is_owner` como critério de
  resolução automática de tenant.
- **Proibido** introduzir "última tenant usada" como autoridade server-side.

### 7.2 Server Functions / Backend

- `resolveTenantContext` deve, na Fase 3, aceitar `x-tenant-id` também para
  usuário comum, **desde que** validado contra membership `active` do
  próprio usuário. A regra de N memberships deixa de ser erro terminal e
  passa a exigir seleção explícita.
- `TenantRepository.listByUser` continua sem `LIMIT`, sem `ORDER BY`.
  Ganha filtro por `status = 'active'`.
- Novo método `TenantRepository.userHasActiveMembership(userId, tenantId)`
  (nome ilustrativo) — validação O(1) usada por `resolveTenantContext`.
- Nova (ou estendida) server function `listMyTenants()` — enumera
  memberships ativas do usuário para a UI de seleção.

### 7.3 Tenant Middleware

- `requireTenant` mantém composição sobre `requireSupabaseAuth`.
- Etapa 1 (impersonação super-admin) permanece **inalterada** e
  **separada** do fluxo de seleção comum.
- Etapa 2 passa a distinguir:
  - **Sem header**: 0 → erro; 1 → resolve; N → erro "seleção requerida".
  - **Com header** (não super-admin): valida membership ativa; se válido,
    resolve; caso contrário, erro.
- **Proibido** compartilhar código de decisão entre impersonação e seleção
  comum: são fluxos distintos, com validações distintas e trilhas de
  auditoria distintas.

### 7.4 RLS / Segurança

- `get_current_tenant_id()` deve espelhar `resolveTenantContext`:
  aceitar header para usuário comum **somente após** validar membership
  ativa contra `tenant_members`. Isso exige **nova revisão de RLS** e
  potencial extensão da função (uma implementação insegura reintroduziria
  spoofing).
- Policies existentes (M2b) continuam válidas — a resolução de tenant é
  encapsulada em `get_current_tenant_id`.
- Nova função SQL sugerida: `user_has_active_membership(_user_id, _tenant)`
  — espelho SQL da validação server-side.
- Super Admin **continua** sem acesso tenant-scoped sem impersonação
  explícita.

### 7.5 Client / UI

- Tenant Switcher (novo, Fase 3):
  - Exibido **apenas** se `listMyTenants()` retornar ≥ 2 memberships ativas.
  - Persistência local (`localStorage`) é **preferência de UX**, nunca
    autoridade. Cada request valida no server.
  - Reload / múltiplas abas / logout / expiração de sessão devem cair no
    fluxo padrão: se a preferência local for inválida, UI força nova
    seleção.
- Usuário com 1 membership: seleção implícita server-side, sem UI.
- Usuário com 0 memberships: tela de "sem acesso" (não é responsabilidade
  desta IA especificar).
- Super Admin: usa a UI de **impersonação** existente, não o Tenant
  Switcher comum. Fluxos não podem se confundir.

### 7.6 Super Admin / Impersonação

- Impersonação continua fluxo separado, com origem única
  (`impersonation-state.ts`, Patch 2.3.1).
- `attachTenantHeader` **não** deve ser reaproveitado para envio do
  header de seleção comum sem uma segunda origem de estado, para evitar
  contaminação cruzada.
- Recomendação: introduzir, na Fase 3, `attachSelectedTenantHeader`
  separado, ou unificar sob um "tenant transport middleware" que ainda
  distinga origem (`impersonation` vs `selection`) para telemetria e
  auditoria.
- Servidor **nunca** confunde impersonação com seleção: `TenantContext`
  já carrega `impersonation: boolean` — manter e expandir com
  `origin: 'impersonation' | 'selection' | 'single-membership'`.

### 7.7 Futuro Billing / Planos

Requisitos **arquiteturais** que a Fase 3 deve preservar (implementação
posterior, fora do escopo desta IA):

- `tenants.billing_status` gates de RLS/policies (ex.: negar escrita se
  `suspended`).
- `seats_limit` validado no fluxo de convite/aceite de membership.
- Feature flags comerciais **não podem** roteirizar arquitetura (Hard Gate
  G2 — Flag Neutrality). Só habilitam/desabilitam features de negócio.
- Integrações Stripe/Hotmart/Kiwify vivem em `/api/public/*` (webhooks
  assinados) — fora desta IA.

### 7.8 Plugin / Runtime Core

**Impacto: nenhum.** Registry, RegistrySnapshot, ResolutionGraph,
ActionExecutor, PluginContext, Plugin Loader, Feature Flags, Workspace
Runtime e Bootstrap **não devem** ser alterados pela Fase 3. A chave
`tenantId` do snapshot continua sendo o único ponto de contato entre
tenant e runtime. Qualquer proposta em contrário deve reabrir esta IA e
justificar formalmente contra a Constituição §3 e §6.

---

## 8. Invariantes Arquiteturais

A Fase 3 **deve** preservar, item por item:

1. Cliente nunca é autoridade.
2. Servidor é autoridade única de tenant.
3. Tenant context é sempre explícito.
4. **Não** existe tenant default.
5. **Não** existe fallback automático.
6. **Não** existe seleção automática entre N memberships.
7. **Não** existe inferência implícita.
8. **Não** existe heurística.
9. **Não** existe `LIMIT 1` como resolução de tenant.
10. **Não** existe `ORDER BY` para escolher tenant.
11. `is_default` / `is_owner` não são critérios de resolução automática.
12. Super Admin sem impersonação não acessa recursos tenant-scoped.
13. `x-tenant-id` é transporte, nunca autoridade.
14. Usuário comum com header forjado não troca tenant (validado server-side).
15. RLS não depende de confiança no client.
16. Membership não é bypass de RLS.
17. Billing futuro não enfraquece isolamento tenant.
18. Runtime Core permanece intocado.

---

## 9. Alternativas Avaliadas

### 9.1 Alternativa A — Seleção via header client-side sem validação

**Descrição:** UI define `x-tenant-id`; server confia.
**Avaliação:** **REJEITADA.** Viola invariantes 1, 2, 13, 14, 15.
Reintroduz spoofing trivial. Membership vira bypass de RLS.

### 9.2 Alternativa B — Header client-side validado server-side a cada request

**Descrição:** UI envia `x-tenant-id`; `resolveTenantContext` e
`get_current_tenant_id()` validam contra membership ativa a cada request.
**Avaliação:** **RECOMENDADA.**
- Preserva server authority (invariantes 1, 2, 13, 14, 15).
- Compatível com Fase 2: apenas amplia a etapa 2 de `resolveTenantContext`
  para aceitar header validado quando `!isSuperAdmin`.
- Sem estado server-side novo além do que já existe em `tenant_members`.
- Custo por request: um `SELECT EXISTS` indexado em
  `tenant_members(user_id, tenant_id)` — trivial.
- Simétrico ao fluxo de impersonação já auditado.
- Requer atualização coordenada de `get_current_tenant_id()` (Patch SQL) e
  do middleware server-side, ambos como etapas futuras auditáveis.

### 9.3 Alternativa C — Tenant session server-side

**Descrição:** Sessão persistida no servidor (ex.: tabela `tenant_sessions`
ou cookie assinado) representa "tenant ativo".
**Avaliação:** **Não recomendada agora.**
- Introduz estado server-side novo, com invalidação, expiração, múltiplas
  abas e sincronização.
- Risco de virar "tenant default" disfarçado.
- Complexidade desproporcional ao ganho sobre a Alternativa B.
- Pode ser reavaliada quando/se billing exigir sessão comercial rica.

### 9.4 Alternativa D — Claim/JWT customizado

**Descrição:** `tenant_id` embutido em custom claim do JWT Supabase.
**Avaliação:** **Não recomendada agora.**
- Latência de propagação (claim só atualiza em refresh).
- Risco de estado obsoleto (membership revogada após emissão).
- Transforma token em autoridade indevida — aumenta blast radius em caso
  de leak.
- Compatibilidade limitada com o modelo atual (RLS já resolve via
  `get_current_tenant_id`, sem depender de claim).
- Pode ser considerada como otimização futura, jamais como autoridade
  primária.

### 9.5 Alternativa E — Membership "ativa" persistida (server ou client)

**Descrição:** Marcar uma membership como "ativa" (flag no banco ou em
localStorage) e usar como resolução automática.
**Avaliação:** **REJEITADA.**
- Persistida no server → tenant default disfarçado. Viola invariantes 4, 6, 11.
- Persistida no client → preferência de UX legítima, **mas nunca
  autoridade**. Permitida apenas como hint para pré-selecionar o header,
  jamais como decisão server-side.

---

## 10. Recomendação Técnica

Adotar a **Alternativa B — Header client-side validado server-side a cada
request** como base da Fase 3, com as seguintes diretrizes obrigatórias:

1. **`x-tenant-id` permanece transporte**, jamais autoridade.
2. **`resolveTenantContext`** ganha ramo explícito para usuário comum com
   header: valida membership ativa; se inválida, erro. Sem fallback.
3. **`get_current_tenant_id()`** recebe patch SQL espelhando a mesma
   validação — nunca aceita header sem checar `tenant_members`.
4. **`tenant_members`** ganha `role` (tenant-scoped) e `status`
   (`active`/`invited`/`suspended`/`revoked`). Sem `is_default`, sem
   `is_owner`.
5. **UI Tenant Switcher** aparece somente para ≥ 2 memberships ativas.
   Persistência local é preferência, revalidada a cada request.
6. **Super Admin / Impersonação** mantém fluxo separado, estado separado
   (`impersonation-state.ts`) e header enviado por middleware distinto.
7. **`TenantContext`** ganha campo `origin: 'impersonation' | 'selection'
   | 'single-membership'` para auditoria.
8. **Billing / planos / assentos**: apenas reservar campos e contratos;
   não implementar nesta fase.
9. **Runtime Core**: intocado.
10. **GA-08, Upload Provenance Token, M3.3.2, Storage Abstraction Layer**:
    fora desta IA.

Toda a evolução deve ser fragmentada em sub-etapas auditáveis (padrão M3.x
da Fase 2), cada uma precedida por relatório e seguida de auditoria
externa.

---

## 11. Riscos e Mitigações

| # | Risco | Severidade | Mitigação |
|---|---|---|---|
| R1 | Reintrodução de tenant default | **Bloqueador** | Proibição explícita em contrato + revisão de PR + Hard Gate G0. |
| R2 | Seleção automática entre N memberships | **Bloqueador** | `resolveTenantContext` mantém erro se não houver header validado. |
| R3 | Bypass de Super Admin (usuário comum ganha impersonação) | **Bloqueador** | Fluxos e middlewares separados; `origin` distinto em `TenantContext`. |
| R4 | Header spoofing (usuário comum troca para tenant alheio) | **Alto** | Validação server-side obrigatória em `resolveTenantContext` e `get_current_tenant_id()`. |
| R5 | Inconsistência client ↔ server (localStorage stale) | **Médio** | Server é autoridade; UI força re-seleção em falha de validação. |
| R6 | Usuário sem membership após revogação em mid-session | **Médio** | Cada request revalida; erro terminal com UX de re-login/seleção. |
| R7 | Membership suspensa/inativa aceita indevidamente | **Alto** | Filtrar por `status = 'active'` em `listByUser` e na validação. |
| R8 | Tenant suspenso por inadimplência aceito | **Médio** | Preparar campo `billing_status`; policies futuras negam escrita. Fora desta IA implementar. |
| R9 | Membership órfã (usuário/tenant deletado) | **Baixo** | FKs com `ON DELETE CASCADE` já existentes; manter. |
| R10 | Role inválida ou inconsistente por tenant | **Médio** | Enum SQL + validação; separar `app_role` global de `tenant_role`. |
| R11 | RLS com cardinalidade incorreta | **Bloqueador** | Patch SQL de `get_current_tenant_id()` seguirá padrão M2b.1 (sem `LIMIT`, sem `ORDER BY`) e será auditado. |
| R12 | Regressão em `requireTenant` | **Alto** | Testes de `tenant-middleware.spec.ts` estendidos antes do merge. |
| R13 | Contaminação impersonação ↔ seleção | **Alto** | Estado separado, middlewares separados, `origin` em `TenantContext`. |
| R14 | Acoplamento prematuro com billing | **Médio** | Campos reservados sem lógica; billing tratado em IA própria futura. |
| R15 | Alteração indevida do Runtime Core | **Bloqueador** | Hard Gates G6/G7; IA-005 declara "impacto nulo". |
| R16 | Claim JWT usado como autoridade | **Alto** | Alternativa D rejeitada; contrato proíbe. |
| R17 | Membership vira bypass de RLS | **Bloqueador** | RLS continua avaliando `get_current_tenant_id()`; membership apenas habilita seleção, não concede acesso. |
| R18 | Futura limitação de assentos sem contrato | **Baixo** | Reservar `seats_limit` no design; validar em fluxo de convite. |

---

## 12. Definition of Done para Implementação Futura

Uma implementação da Fase 3 só será considerada apta a iniciar quando:

- [ ] Esta IA-005 aprovada em auditoria externa.
- [ ] Sub-etapas planejadas em formato M-x (ex.: M4.1 schema, M4.2
  middleware, M4.3 SQL patch, M4.4 UI switcher, M4.5 billing prep).
- [ ] Cada sub-etapa com relatório próprio em `docs/fase6/`.
- [ ] `tenant-middleware.spec.ts` e novos testes SQL cobrindo:
  seleção válida, seleção inválida, membership suspensa, tenant
  inexistente, impersonação vs seleção, cardinalidade 0/1/N.
- [ ] Auditoria externa de cada sub-etapa antes da próxima.
- [ ] Nenhuma alteração no Runtime Core.
- [ ] Nenhum billing implementado.

---

## 13. Decisão / Gate de Saída

**Recomendação:** aprovar a IA-005 como base analítica para a Fase 3 —
Membership Evolution Model, autorizando planejamento (não implementação)
das sub-etapas segundo a **Alternativa B**.

**Gate de Saída (auditoria externa) deve validar:**

- Nenhuma implementação foi realizada nesta IA.
- Nenhuma migration foi criada.
- Nenhuma policy RLS foi alterada.
- Middleware, impersonação, storage, UI e runtime intocados.
- Recomendação técnica compatível com invariantes da Fase 2.
- Riscos R1–R18 corretamente classificados.
- Separação estrita entre impersonação (Super Admin) e seleção comum de
  tenant preservada.
- Nenhum acoplamento prematuro com billing.
- Runtime Core preservado.

---

## Apêndice A — Documentos revisados

- `docs/architecture/ARCHITECTURE_CONSTITUTION.md`
- `docs/architecture/security/SECURITY_ARCHITECTURE.md`
- `docs/architecture/ROADMAP_ARCHITECTURAL.md`
- `docs/architecture/impact-analysis/IA-001-TenantMiddleware.md`
- `docs/architecture/impact-analysis/IA-002-ClientImpersonationLayer.md`
- `docs/architecture/impact-analysis/IA-003-RLSPolicies.md`
- `docs/architecture/impact-analysis/IA-004-TenantStorageIsolation.md`
- `docs/fase6/13-m2b-1-get-current-tenant-id-cardinality-fix.md`
- `docs/fase6/27-phase-2-closing-review.md`

## Apêndice B — Arquivos / schema inspecionados (leitura apenas)

- `src/integrations/supabase/tenant-middleware.ts`
- `src/integrations/supabase/tenant-repository.ts`
- `src/integrations/supabase/tenant-attacher.ts`
- `src/integrations/supabase/impersonation-state.ts`
- `src/integrations/supabase/auth-middleware.ts`
- `src/start.ts`
- `src/lib/api/tenant.functions.ts`
- Função SQL `public.get_current_tenant_id()` (SECURITY DEFINER)
- Função SQL `public.is_super_admin()`
- Função SQL `public.user_belongs_to_tenant()`
- Tabelas: `tenants`, `tenant_members`, `user_roles`, `user_profiles`,
  `rbac_profiles`, `rbac_modules`, `rbac_permissions`, `teams`,
  `team_members`.

---

## Confirmação Formal

Confirmo que a **IA-005 — Membership Evolution Model** foi criada como
Impact Analysis documental.

Confirmo que **nenhuma implementação foi realizada**.

Confirmo que **nenhuma migration foi criada**.

Confirmo que **nenhuma policy RLS foi alterada**.

Confirmo que **nenhum fluxo de middleware, impersonation, storage, UI ou
runtime foi alterado**.

Confirmo que a IA-005 **preserva os invariantes da Fase 2 — Multi-Tenant
Core**.

Confirmo que qualquer implementação futura dependerá de **auditoria e
aprovação explícita** antes da execução.
