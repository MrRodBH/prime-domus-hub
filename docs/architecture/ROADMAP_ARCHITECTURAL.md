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
| IA-004 · Tenant Storage Isolation | 🟡 **Proposed / Awaiting Audit** (`impact-analysis/IA-004-TenantStorageIsolation.md`) |
| M3 · Tenant Storage Isolation Implementation | ⛔ **Blocked** until IA-004 approval |

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

#### M3 — Storage Isolation
- Prefixação de objetos por `tenantId` no bucket ativo.
- Migração dos assets existentes para o novo esquema de path.
- Base para a futura Storage Abstraction Layer (Fase 4).
- Depende de M2b.

### 🟡 Fase 3 — Membership Evolution Model
- Suporte a **múltiplas memberships por usuário**.
- Estratégia de **seleção explícita de tenant** (UI + protocolo).
- Remoção de qualquer suposição implícita de cardinalidade (§4.3).
- Depende de IA-002.

### 🟡 Fase 4 — Storage Abstraction Layer
- Introdução da interface `StorageProvider`.
- Suporte inicial a Supabase Storage; extensível para S3 / GCS.
- Contrato desacoplado do provider concreto.
- Depende de M3.

### 🟡 Fase 5 — Plugin Marketplace Evolution
- Marketplace remoto de plugins.
- Sistema de **versionamento** de plugin e `apiVersion` compat matrix.
- **Plugin signing / trust layer** — assinatura, verificação e política
  de confiança por tenant.

### 🟡 Fase 6 — Workspace Ingestion System
- Pipeline unificado de upload.
- Engine de importação CSV.
- Ingestão XML / ZIP.
- Framework de ingestão de mídia.

### 🟡 Fase 7 — Observability Layer
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
M3 (Storage Isolation)
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
