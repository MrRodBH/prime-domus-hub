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
| IA-002 · Fase 2.3 — Client Impersonation Layer | 🔴 Próxima |
| M2b — RLS Policies (RESTRICTIVE por tenant) | ⏳ Depende de IA-002 |
| M3 — Storage Isolation (`tenantId/` prefix) | ⏳ Depende de M2b |

#### IA-002 — Client Impersonation Layer (próxima)
- Propagação de `x-tenant-id` do client para server functions.
- Super-admin session switching entre tenants.
- Validação server-side (compõe sobre `requireTenant`) **e** validação
  client-side (guardas de UI para evitar chamadas inconsistentes).
- Depende de IA-001 (concluída).

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

## 6. ADRs Futuros

Serão emitidos quando as respectivas etapas forem implementadas:

- **ADR-005** — Multi-Tenant Evolution Model
- **ADR-006** — Storage Abstraction Strategy
- **ADR-007** — Plugin Marketplace Remote Execution
- **ADR-008** — Workspace Ingestion Architecture

Cada ADR seguirá o formato obrigatório definido em `ADR/README.md`.

---

## 7. Index Cross-Linking

- Constitution → [`ARCHITECTURE_CONSTITUTION.md`](./ARCHITECTURE_CONSTITUTION.md)
- ADRs → [`ADR/`](./ADR/README.md)
- Impact Analysis → [`impact-analysis/`](./impact-analysis/README.md)
- Glossary → [`glossary.md`](./glossary.md)
- Diagrams → [`diagrams/`](./diagrams/)

---

## 8. Manutenção do Roadmap

- Novas decisões futuras identificadas devem ser adicionadas a §3 ou §4.
- Itens promovidos a ADR são **removidos** do Roadmap e passam a viver
  em `ADR/`.
- O Roadmap é versionado junto com a Constituição.
