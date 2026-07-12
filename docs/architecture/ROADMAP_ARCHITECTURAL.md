# ROADMAP ARCHITECTURAL — RM Prime SaaS

**Status:** Ratificado — Fase 6 · GA-03
**Autoridade:** Fonte oficial e única de evolução arquitetural futura
(Single Source of Future Evolution) do RM Prime SaaS.

> Este documento é vinculante. Toda **Impact Analysis (IA)** deve consultá-lo
> antes de ser redigida. Toda decisão arquitetural futura já identificada
> vive aqui até ser promovida a ADR e implementada.

---

## 1. Visão Geral

O sistema de governança arquitetural do RM Prime SaaS é composto por
quatro artefatos complementares e não substituíveis entre si:

| Artefato | Papel |
|---|---|
| **Constitution** (`ARCHITECTURE_CONSTITUTION.md`) | Regras permanentes. SSoT arquitetural. |
| **ADR** (`ADR/ADR-<NNN>-*.md`) | Decisões arquiteturais **já tomadas**, versionadas e imutáveis. |
| **Impact Analysis** (`impact-analysis/IA-<NNN>-*.md`) | Validação **pré-implementação** de uma etapa. |
| **Roadmap** (`ROADMAP_ARCHITECTURAL.md`) | **Evolução futura planejada** e decisões ainda não formalizadas. |

Fluxo:

```
Roadmap  →  IA  →  ADR (se necessário)  →  Implementação  →  Auditoria
```

---

## 2. Estado Atual do Sistema

Componentes e processos estabilizados na Fase 6:

- **ResolutionGraph** estabilizado (ADR-001) — grafo imutável, O(1),
  dispatcher único por `kind`.
- **Registry tri-layer model** (ADR-002) — Registry → Snapshot → Graph,
  responsabilidades exclusivas por camada.
- **Plugin system 4.4** concluído (ADR-003) — sandbox read-only,
  PluginRegistry isolado, PluginLoader, FeatureFlagService, manifest,
  apiVersion `4.3.4`.
- **Workspace Runtime** (ADR-004) — Renderers + TenantContext consumindo
  exclusivamente hooks oficiais.
- **IA Governance ativa** — Gate de Entrada obrigatório antes de qualquer
  implementação (Constitution §7).
- **Tenant Middleware (IA-001 / Fase 2.2)** ✔ **concluída** — módulo
  `src/integrations/supabase/tenant-middleware.ts` implementa `requireTenant`
  com resolução determinística: impersonação restrita a super-admin,
  cardinalidade explícita (1 / N / 0), sem `LIMIT 1`, sem fallback implícito,
  sem singleton. Abstração de acesso a memberships via `TenantRepository`
  (§4.1 Anti-SQL Leakage). Runtime do Workspace intacto.

---

## 3. Próximas Implementações (Ordenadas)

### 🔴 Fase 2 — Multi-Tenant Core

| Etapa | Status |
|---|---|
| IA-001 · Fase 2.2 — `requireTenant` middleware | ✔ Concluída |
| IA-002 · Fase 2.3 — Client Impersonation Layer | ✔ **Concluída** |
| IA-003 · RLS Policies (RESTRICTIVE por tenant) | 🟢 Aprovada em auditoria final |
| M2b · RLS Policies Implementation | 🟢 **Implementada** — aguarda auditoria externa (ver `docs/fase6/11-fase-2-m2b-relatorio.md`) |
| IA-004 · Tenant Storage Isolation | ✔ **Concluída** (`impact-analysis/IA-004-TenantStorageIsolation.md`) — M3 concluída operacionalmente |

#### Fase 2.3 — Client Impersonation Layer ✔
- Header `x-tenant-id` propagado via `attachTenantHeader` (client middleware)
  registrado após `attachSupabaseAuth` em `src/start.ts`.
- Persistência controlada em `localStorage["impersonate_tenant_id"]` gravada
  **exclusivamente** pela UI do Super Admin (`/super`).
- Validação autoritativa server-side via `requireTenant` (IA-001):
  header não-super → `Forbidden`; header inválido/desconhecido → `Invalid tenant`.
- UI mínima: banner de impersonação no `AppHeader` e ação de encerrar em `/super`.
- Runtime do Workspace, ResolutionGraph, Registry, Snapshot, ActionExecutor,
  PluginContext e Bootstrap **não foram modificados**.


#### M2b — RLS Policies (Supabase)
- Políticas RLS **restritivas** por tenant em todas as tabelas do domínio.
- Enforcement zero-trust: nenhuma leitura/escrita fora do tenant ativo.
- Depende de IA-002 (contexto de tenant garantido server-side).

#### M3 — Tenant Storage Isolation ✔ Concluída operacionalmente
- Isolamento por tenant do armazenamento de arquivos (buckets privados mantidos).
- Novos uploads gravam sob path server-authoritative tenant-scoped
  (M3.2 + Patch M3.2.1).
- Signed URLs endurecidas e validadas server-side por tenant
  (M3.4 + Patch M3.4.1).
- Inventário físico de arquivos legados concluído; universo físico a migrar
  identificado como ∅ — todos os objetos já compliant após reclassificação
  do Patch M3.3.1 (M3.3 + Patch M3.3.1).
- Media Picker e biblioteca central de mídia validados sob a arquitetura
  tenant-scoped (M3.5).
- Inconsistências de metadata legada remanescentes preservadas como backlog
  formal (**M3.3.2 — Metadata Rewrite Batch**). Também preservados os
  backlogs **Upload Provenance Token** e **Media Picker Return Contract
  Normalization**. Nenhum destes foi executado — a conclusão da M3 não
  implica execução dos backlogs futuros.
- Base para a futura Storage Abstraction Layer (Fase 4).

### ✅ Fase 3 — Membership Evolution Model — **Formalmente encerrada**

Aprovada e encerrada após F3.7 — Fase 3 Closing Review
(`docs/fase6/42-f3-7-phase-3-closing-review.md`).

| Sub-etapa | Status |
|---|---|
| F3.1 — Membership Schema Foundation | ✔ Concluída |
| F3.2 — Server-Side Tenant Selection (+ F3.2.1) | ✔ Concluída |
| F3.3 — RLS Membership Selection Patch (+ F3.3.1/2/3/4/4.1) | ✔ Concluída |
| F3.4 — Tenant Selection Transport / Client State (+ F3.4.1) | ✔ Concluída |
| F3.5 — Tenant Switcher UX (+ F3.5.1) | ✔ Concluída |
| F3.6 — Membership Roles & Status Validation | ✔ Concluída |
| F3.7 — Fase 3 Closing Review | ✔ Concluída |

Resultado: suporte a múltiplas memberships por usuário, seleção
explícita de tenant server-authoritative, cardinalidade explícita,
UX de Tenant Switcher e domínio tipado de `membership_status` /
`tenant_role`.

### 🔵 Fase 4 — SaaS Commercial Platform

- **Status:** Planejamento arquitetural iniciado via **IA-006** e
  corrigido via **IA-006.1**
  (`docs/architecture/impact-analysis/IA-006-saas-commercial-platform.md`,
  `docs/fase6/44-ia-006-1-roadmap-phase-numbering-rls-correction.md`).
- **Implementation Status:** `BLOCKED` — aguardando aprovação externa
  da IA-006/IA-006.1 antes de qualquer implementação.
- **Fase 4 ainda não está em implementação funcional. SCP-001 ainda não
  foi iniciada.**
- **Escopo futuro:** planos, assinaturas, billing, trial,
  inadimplência, entitlements, feature flags comerciais, status
  comercial do tenant, webhooks de pagamento, integrações Stripe /
  Hotmart / Kiwify, governança comercial Super Admin.
- **Subetapas propostas (PROPOSED):** SCP-001..SCP-010 (ver IA-006 §17).
- **Hard Gates propostos:** SCP-G1..SCP-G9 (ver IA-006 §18).
- **Invariantes preservados:** client nunca é autoridade; servidor é
  autoridade única; `x-tenant-id` é transporte; sem fallback / default /
  heurística / dual path; Super Admin sem impersonação não acessa
  tenant-scoped; `tenant_role` **não** é autorização ampla nem
  autorização comercial; `has_role(auth.uid(), 'admin')` **não** é
  recomendação direta para billing; RLS não é relaxada para billing;
  assinatura não substitui membership e vice-versa. Autorização
  administrativa comercial depende de **Role Reconciliation** prévia
  e de uma função server-side dedicada futura
  (`canManageTenantBilling(userId, tenantId)`).

#### Gates e sequência inicial da Fase 4

1. IA-006 — SaaS Commercial Platform Impact Analysis — Accepted.
2. ADR-005 — Commercial Domain — Accepted.
3. ADR-006 — Billing Provider Abstraction — Accepted.
4. F4.0 — Role Reconciliation / Membership Role Audit — Accepted.
5. SCP-001 — Commercial Domain Model — Accepted.
6. SCP-002 — Billing Provider Abstraction Materialization — Accepted.
7. SCP-003 — Commercial Read Models / Server-Side Access Planning — Accepted.
8. SCP-004 — Commercial Server Read Functions — Accepted.
9. SCP-005 — Commercial Entitlement Runtime Boundary Planning — Accepted.
10. SCP-006 — Commercial Feature Gate Server Runtime — Accepted.
11. SCP-007 — Commercial Feature Key Catalog Planning — Accepted.
12. SCP-008 — Commercial Feature Key Catalog Materialization & Server Validation — Accepted.
13. SCP-009 — Commercial Usage Limit Evaluation Planning — Accepted.
14. SCP-010 — Commercial Seat Limit Runtime Contract & Read Model Planning — Ready for External Audit.
14.1 SCP-010.1 — Authoritative Membership Domain Verification, Contract Determinism & Roadmap Cleanup — Ready for External Audit.
 14.2 SCP-010.2 — Commercial Limit DTO Alignment & Deterministic Documentation Finalization — Ready for External Audit.
 14.3 SCP-010.3 — SCP-010.1 Deterministic Full Rewrite & Final Gate Cleanup — Ready for External Audit.
 15. SCP-011 — Commercial Seat Limit Server Runtime — próxima etapa futura planejada; não iniciada.

Restrições permanentes:
- SCP-004 não implementa billing real completo.
- SCP-004 não implementa billing admin.
- SCP-004 não implementa commercial admin.
- SCP-004 não implementa canManageTenantBilling.
- SCP-004 não implementa provider integration real.
- SCP-004 não implementa adapter real de Stripe, Hotmart ou Kiwify.
- SCP-004 não implementa webhook público real.
- SCP-004 não implementa checkout.
- SCP-004 não implementa customer portal.
- SCP-004 não cria secrets de provider.
- SCP-004 não abre RLS permissiva para usuários finais.
- SCP-004 não permite direct client reads das tabelas comerciais/billing.
- SCP-004 não expõe CommercialAdminDiagnostic em runtime.
- SCP-005 não implementa código runtime.
- SCP-005 não implementa FeatureGate runtime.
- SCP-005 não implementa hook client-side.
- SCP-005 não implementa UI.
- SCP-005 não cria migration.
- SCP-005 não cria tabela.
- SCP-005 não cria RLS policy.
- SCP-005 não cria grant.
- SCP-005 não implementa billing enforcement definitivo.
- SCP-005 não implementa billing real.
- SCP-005 não implementa provider integration real.
- SCP-005 não implementa webhook.
- SCP-005 não implementa checkout.
- SCP-005 não implementa customer portal.
- SCP-005 não cria billing_admin.
- SCP-005 não cria commercial_admin.
- SCP-005 não cria canManageTenantBilling.
- SCP-005 não altera tenant_members.
- SCP-005 não inicia SCP-006.
- SCP-006 não implementa billing real.
- SCP-006 não implementa cobrança, upgrade, downgrade ou cancelamento.
- SCP-006 não implementa checkout.
- SCP-006 não implementa customer portal.
- SCP-006 não implementa webhook.
- SCP-006 não integra Stripe, Hotmart ou Kiwify.
- SCP-006 não cria provider adapter real.
- SCP-006 não cria billing_admin.
- SCP-006 não cria commercial_admin.
- SCP-006 não cria canManageTenantBilling.
- SCP-006 não altera tenant_members.
- SCP-006 não abre RLS permissiva nem grant para usuários finais.
- SCP-006 não permite direct client reads das tabelas comerciais/billing.
- SCP-006 não executa mutation comercial.
- SCP-006 não usa entitlement como substituto de membership authorization.
- SCP-006 não permite Super Admin bypassar entitlement.
- SCP-006 não inicia SCP-007.
- SCP-007 não implementa catálogo runtime.
- SCP-007 não cria migration.
- SCP-007 não cria tabela.
- SCP-007 não cria RLS policy.
- SCP-007 não cria grant.
- SCP-007 não cria seed.
- SCP-007 não cria UI.
- SCP-007 não cria hook client-side.
- SCP-007 não altera getCommercialFeatureDecision.
- SCP-007 não altera decideCommercialFeature.
- SCP-007 não altera normalizeFeatureKey.
- SCP-007 não implementa billing enforcement.
- SCP-007 não implementa provider integration.
- SCP-007 não implementa webhook.
- SCP-007 não implementa checkout.
- SCP-007 não implementa customer portal.
- SCP-007 não cria billing_admin.
- SCP-007 não cria commercial_admin.
- SCP-007 não cria canManageTenantBilling.
- SCP-007 não altera tenant_members.
- SCP-007 não inicia SCP-008.
- SCP-008 não cria migration.
- SCP-008 não cria tabela.
- SCP-008 não cria RLS policy.
- SCP-008 não cria grant.
- SCP-008 não cria seed.
- SCP-008 não cria UI.
- SCP-008 não cria hook client-side.
- SCP-008 não implementa billing real.
- SCP-008 não implementa cobrança, upgrade, downgrade ou cancelamento.
- SCP-008 não implementa provider integration.
- SCP-008 não integra Stripe, Hotmart ou Kiwify.
- SCP-008 não implementa webhook.
- SCP-008 não implementa checkout.
- SCP-008 não implementa customer portal.
- SCP-008 não cria billing_admin.
- SCP-008 não cria commercial_admin.
- SCP-008 não cria canManageTenantBilling.
- SCP-008 não altera tenant_members.
- SCP-008 não abre RLS permissiva nem grant para usuários finais.
- SCP-008 não permite direct client reads das tabelas comerciais/billing.
- SCP-008 não executa mutation comercial.
- SCP-008 não altera membership authorization.
- SCP-008 não permite Super Admin bypassar entitlement.
- SCP-008 não inicia SCP-009.
- SCP-009 não implementa código runtime.
- SCP-009 não altera getCommercialFeatureDecision.
- SCP-009 não altera decideCommercialFeature.
- SCP-009 não altera normalizeFeatureKey.
- SCP-009 não altera feature-catalog.ts.
- SCP-009 não cria migration.
- SCP-009 não cria tabela.
- SCP-009 não cria RLS policy.
- SCP-009 não cria grant.
- SCP-009 não cria seed.
- SCP-009 não cria UI.
- SCP-009 não cria hook client-side.
- SCP-009 não implementa contador de uso.
- SCP-009 não implementa enforcement de limite.
- SCP-009 não emite limit_reached em runtime.
- SCP-009 não implementa billing real.
- SCP-009 não implementa cobrança, upgrade, downgrade ou cancelamento.
- SCP-009 não implementa provider integration.
- SCP-009 não integra Stripe, Hotmart ou Kiwify.
- SCP-009 não implementa webhook.
- SCP-009 não implementa checkout.
- SCP-009 não implementa customer portal.
- SCP-009 não cria billing_admin.
- SCP-009 não cria commercial_admin.
- SCP-009 não cria canManageTenantBilling.
- SCP-009 não altera tenant_members.
- SCP-009 não abre RLS permissiva nem grant para usuários finais.
- SCP-009 não permite direct client reads das tabelas comerciais/billing.
- SCP-009 não executa mutation comercial.
- SCP-009 não altera membership authorization.
- SCP-009 não permite Super Admin bypassar entitlement.
- SCP-009 não inicia SCP-010.

### 🟡 Fase 5 — Storage Abstraction Layer — Provisória
- **Reposicionamento (IA-006.1):** Storage Abstraction Layer permanece
  planejada, mas **não é a próxima macrofase imediata**. A prioridade
  atual pós-Fase 3 é a **Fase 4 — SaaS Commercial Platform**.
- Introdução da interface `StorageProvider`.
- Suporte inicial a Supabase Storage; extensível para S3 / GCS.
- Contrato desacoplado do provider concreto.
- Depende de M3.

### 🟡 Fase 6 — Plugin Marketplace Evolution
- Marketplace remoto de plugins.
- Sistema de **versionamento** de plugin e `apiVersion` compat matrix.
- **Plugin signing / trust layer** — assinatura, verificação e política
  de confiança por tenant.

### 🟡 Fase 7 — Workspace Ingestion System
- Pipeline unificado de upload.
- Engine de importação CSV.
- Ingestão XML / ZIP.
- Framework de ingestão de mídia.

### 🟡 Fase 8 — Observability Layer
- Audit log por tenant.
- Tracing de `ActionExecutor`.
- Replay system (futuro).

---

## 4. Decisões Arquiteturais Futuras (Non-Implemented Rules)

Regras já **acordadas** pelo projeto mas ainda **não implementadas**.
Serão promovidas a ADR ou incorporadas à Constituição quando a etapa
correspondente for iniciada.

### 4.1 Anti-SQL Leakage Rule
A camada de domínio **não pode** depender de strings SQL. SQL deve ser
encapsulado em repositórios.

```
✔ tenantRepository.listByUser(userId)
❌ select * from tenant_members
```

### 4.2 No Heuristics Policy
- Sem fallback implícito.
- Sem lógica de domínio baseada em `LIMIT`.
- Sem suposições silenciosas de ordenação.

### 4.3 Multi-Tenant Cardinality Rule
Cardinalidade é **sempre explícita**. Nenhuma camada assume "um tenant
por usuário". Zero, um ou N são resolvidos de forma declarada.

### 4.4 No Parallel Resolution Rule
`ResolutionGraph` é o **único** sistema de resolução runtime. Resolvers
paralelos, caches semânticos alternativos e dual-paths de resolução são
permanentemente proibidos.

---

## 5. Dependências

```
IA-001 (done)
   ↓
IA-002 (Client Impersonation)
   ↓
M2b (RLS Policies)
   ↓
M3 (Tenant Storage Isolation)
   ↓
Storage Abstraction (Fase 4)

IA-002
   ↓
Membership Evolution (Fase 3)
```

Nenhuma etapa pode ser iniciada antes de suas dependências estarem
aprovadas e implementadas.

---

## 6. Governance Evolution

Consolidação da evolução institucional da governança arquitetural
pós-Fase 2.2. Toda a evolução de governança a partir da conclusão de
IA-001 vive sob esta seção, evitando crescimento horizontal da
documentação e preservando navegabilidade.

### 6.0 GA-02 — Security Architecture Foundation ✔ Completed

Institucionalização da **Arquitetura de Segurança** do RM Prime SaaS
como documentação normativa permanente, executada **antes da
implementação da IA-002**.

- Documento oficial criado: [`security/SECURITY_ARCHITECTURE.md`](./security/SECURITY_ARCHITECTURE.md).
- Constitution atualizada com §12 — Security Architecture.
- IA-002 endurecida (terminologia arquitetural, neutralidade de
  framework, Trust Boundary, Threat Model, Security Boundaries e
  nota de nomenclatura futura).
- Cross-linking arquitetural atualizado (§8).
- **Runtime intacto** — nenhum arquivo `src/` alterado.
- **Hard Gates G0–G7 preservados.**



### 6.1 Post-Phase 2 Governance

Camada de reforço institucional aplicada após a conclusão de IA-001 /
Fase 2.2. Consolida governança de testes, estabilização da abstração de
tenant e preparação da IA-002.

Registrado também como evolução futura de governança institucional
(**não implementar** antes da conclusão completa do bloco Fase 2:
2.2 → 2.3 → M2b → M3):

- **GA-04 — Patch Architecture System**
  - Institucionaliza patches arquiteturais.
  - Cria `docs/architecture/patches/` como diretório oficial.
  - Define template padrão de patch.
- **GA-05 — Versionamento da Arquitetura**
  - Versionamento formal da Constitution, dos ADRs e do Roadmap.
  - Histórico rastreável de evolução arquitetural.
- **GA-06 (Opcional) — Architecture Backlog System**
  - Backlog estruturado de decisões arquiteturais.
  - Status tracking: Proposed · Approved · Scheduled · Implemented · Discarded.
  - Responsável por registrar refinamentos arquiteturais identificados
    durante auditorias que **não exigem IA**, **não exigem ADR** e
    **não exigem Patch Arquitetural**, mas devem permanecer rastreáveis
    até sua implementação ou descarte. Não criado nesta etapa; apenas
    registrada sua responsabilidade futura.

#### 6.1.1 Unit Testing Policy for Core Deterministic Logic

**Rule 1 — Deterministic Logic Coverage.** Toda lógica determinística
central DEVE ter testes unitários. Inclui, no mínimo: tenant resolution,
avaliação de permissões, lógica de autorização, regras de impersonação.

**Rule 2 — Playwright Limitation.** Testes end-to-end (Playwright) **não**
substituem testes unitários. Servem apenas como validação de integração.

**Rule 3 — Framework Independence.** A ausência de um runner de testes
unitários **não** justifica a remoção de especificações. Testes podem
permanecer framework-agnostic, mock-based, ou prontos para adoção de
runner futuro.

**Rule 4 — Test Preservation Policy.** Nenhuma especificação de teste de
lógica determinística pode ser removida por limitação de tooling.

**Rule 5 — Future Tooling Integration.** A adoção de um framework ou
runner de testes unitários poderá ocorrer em futura etapa de governança
ou infraestrutura, sem exigir alterações na intenção, estrutura ou
cobertura das especificações de testes existentes.

Aplicação atual: `src/integrations/supabase/__tests__/tenant-middleware.spec.ts`
cobre os 8 cenários de `resolveTenantContext` (impersonação super-admin
ok/inválida/não-uuid/não-admin, 0/1/N memberships) de forma
framework-agnostic.

#### 6.1.2 Tenant Repository Stabilization Contract

`src/integrations/supabase/tenant-repository.ts` é vinculado a um contrato
permanente:

1. **Stateless** — proibido armazenar estado interno ou cache.
2. **Deterministic** — mesmo input → mesmo output.
3. **No ORM leakage** — proibido expor SQL, query builders ou filtros.
4. **Single Purpose** — exclusivo para tenant membership resolution.
5. **No Business Rules** — o repositório nunca poderá conter regras de
   negócio, decidir comportamento, aplicar heurísticas, realizar
   validações de cardinalidade, decidir tenant ativo, aplicar políticas
   de autorização, ou conter lógica de impersonação. Sua
   responsabilidade limita-se **exclusivamente** à persistência e
   recuperação determinística de dados. Todas as decisões permanecem na
   camada de resolução (`resolveTenantContext`) ou em futuras camadas de
   domínio autorizadas.

**Proibido** evoluir para: caching layer global, ORM abstraction
genérica, repositório multi-entidade. Novas entidades exigem repositórios
próprios e isolados.

#### 6.1.3 IA-002 Preparation

Registrada como próxima etapa. **Não implementar nesta fase.**

Escopo futuro de IA-002:
- Propagação de `x-tenant-id` client → server.
- Enforcement do impersonation boundary server-side (já parcial em §2).
- Validação dupla (client-side UX + server-side auth).
- Session switching seguro para super-admin.

**Status:** `READY FOR IMPACT ANALYSIS`

**Implementation Status:** `BLOCKED`

**Waiting for:**
- Formal approval of IA-002 (Impact Analysis document)

> A liberação atual refere-se **exclusivamente ao início da análise
> arquitetural** (produção do documento IA-002). **Não autoriza** qualquer
> implementação de código. Implementação permanece bloqueada até auditoria
> e aprovação formal da IA-002.

**Hard Gates:** `No new Hard Gates introduced.` Esta etapa reutiliza
integralmente os Hard Gates G0–G7 já institucionalizados.

**Pré-requisitos atendidos:**
- ✔ IA-001 aprovada
- ✔ Tenant Middleware implementado
- ✔ Tenant Repository estabilizado
- ✔ Unit Testing Policy formalizada
- ✔ Governance Hardening concluído
- ✔ Constituição atualizada
- ✔ Roadmap atualizado
- ✔ Hard Gates preservados (G0–G7)

Bloqueia início da implementação: apresentar IA-002 formal (Impact
Analysis) e obter aprovação antes de qualquer código, conforme
Constitution §7.


---

## 7. ADRs Futuros

Serão emitidos quando as respectivas etapas forem implementadas:

- **ADR-005** — Multi-Tenant Evolution Model
- **ADR-006** — Storage Abstraction Strategy
- **ADR-007** — Plugin Marketplace Remote Execution
- **ADR-008** — Workspace Ingestion Architecture

Cada ADR seguirá o formato obrigatório definido em `ADR/README.md`.

---


## 8. Index Cross-Linking

- Constitution → [`ARCHITECTURE_CONSTITUTION.md`](./ARCHITECTURE_CONSTITUTION.md)
- Security Architecture → [`security/SECURITY_ARCHITECTURE.md`](./security/SECURITY_ARCHITECTURE.md)
- ADRs → [`ADR/`](./ADR/README.md)
- Impact Analysis → [`impact-analysis/`](./impact-analysis/README.md)
- Glossary → [`glossary.md`](./glossary.md)
- Diagrams → [`diagrams/`](./diagrams/)


---

## 9. Manutenção do Roadmap

- Novas decisões futuras identificadas devem ser adicionadas a §3 ou §4.
- Itens promovidos a ADR são **removidos** do Roadmap e passam a viver
  em `ADR/`.
- O Roadmap é versionado junto com a Constituição.
