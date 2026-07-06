# IA-002 — Client Impersonation Layer

- **Impact Analysis:** IA-002
- **Fase:** 2.3
- **Status:** `READY FOR IMPACT ANALYSIS`
- **Implementation Status:** `BLOCKED`
- **Waiting for:** Formal approval of IA-002
- **Autor:** Arquitetura RM Prime SaaS
- **Data:** 2026-07-06
- **Predecessor:** [IA-001 — Tenant Middleware](./IA-001-TenantMiddleware.md)
- **Constituição:** [ARCHITECTURE_CONSTITUTION.md](../ARCHITECTURE_CONSTITUTION.md)
- **Roadmap:** [ROADMAP_ARCHITECTURAL.md §6.1.3](../ROADMAP_ARCHITECTURAL.md)

> **Aviso de governança.** Este documento é uma **Impact Analysis**.
> Nenhuma implementação é autorizada por sua existência. A autorização
> refere-se **exclusivamente ao início da análise arquitetural**.
> Implementação permanece **BLOCKED** até auditoria e aprovação formal.

> **Hard Gates:** `No new Hard Gates introduced.` Esta etapa reutiliza
> integralmente os Hard Gates G0–G7 já institucionalizados pela
> Constituição §8.

> **Marco estratégico.** A partir desta IA o projeto entra na fase de
> **segurança operacional do SaaS**. Toda decisão passa a considerar
> isolamento multi-tenant, autenticação, autorização, superfícies de
> ataque e riscos de vazamento de contexto, além da consistência
> arquitetural.

---

## 1. Objetivo da etapa

Definir a **propagação segura do tenant ativo** entre cliente e servidor
durante processos de **impersonação** por super-admins, sem introduzir
novas superfícies de decisão no cliente e preservando a autoridade
server-side estabelecida pela IA-001.

Objetivos específicos:

- Estabelecer o **contrato do header `x-tenant-id`** como veículo único
  de intenção de impersonação client → server.
- Garantir que toda decisão crítica (autorização, cardinalidade,
  validação de tenant) permaneça **server-side**, delegada ao
  `requireTenant` (IA-001).
- Formalizar o **boundary de impersonação**: quem pode impersonar, quando
  o header é aceito, quando é ignorado, quando é rejeitado.
- Assegurar **zero regressão** sobre Runtime do Workspace, Registry,
  Snapshot, ResolutionGraph, ActionExecutor, Plugin Architecture e
  Bootstrap.

---

## 2. Escopo

### Dentro do escopo

- Contrato do header `x-tenant-id`.
- Propagação client → server (attacher já existente em
  `src/integrations/supabase/tenant-attacher.ts`).
- Validação server-side (via `requireTenant` / `resolveTenantContext`).
- Integração explícita com o **Tenant Middleware** (IA-001).
- **Impersonation Boundary**: definição formal do quem/quando/onde.
- UX guardas de UI para prevenir chamadas inconsistentes (best-effort,
  não confiável como decisão de segurança).

### Fora do escopo

- **RLS Policies** (M2b — depende desta IA).
- **Storage isolation** (M3).
- **Workspace Runtime** (renderers, hooks, tenant context UI).
- **Plugin Architecture** e `PluginContext`.
- **ResolutionGraph**, **Registry**, **Snapshot**, **ActionExecutor**.
- **Bootstrap**.
- Alteração de contratos públicos existentes.
- Session switching persistido em servidor (mantém-se client-side em
  `localStorage`, com decisão server-side sempre re-validada).

---

## 3. Componentes envolvidos

| Componente | Papel na IA-002 |
|---|---|
| `src/integrations/supabase/tenant-attacher.ts` | Client middleware que anexa `x-tenant-id` a chamadas de server function. Já existente. |
| `src/integrations/supabase/tenant-middleware.ts` | Servidor. Consumidor autoritativo do header. Reutilizado sem alteração de contrato. |
| `src/integrations/supabase/tenant-repository.ts` | Fonte de verdade para memberships e validação `exists(tenantId)`. Reutilizado sem mudança. |
| `src/integrations/supabase/auth-middleware.ts` | Pré-requisito (`requireSupabaseAuth`). Não modificado. |
| `src/start.ts` | Registro da cadeia de `functionMiddleware` (bearer + tenant header). |
| Camada de UI de super-admin (futura) | Interface para selecionar tenant a impersonar. Escreve `localStorage.impersonate_tenant_id`. **Não** decide autorização. |
| Constituição §3 (Registry, Snapshot, ResolutionGraph, Executor, PluginContext, Bootstrap, Workspace Runtime) | **Não envolvidos.** Isolamento explícito declarado em §4. |

---

## 4. Análise Arquitetural

Para cada componente oficial da Constituição §3, declara-se explicitamente
se a IA-002 introduz alteração.

| Componente | Alterado? | Justificativa |
|---|---|---|
| **Constitution (SSoT)** | NÃO | IA-002 opera dentro das regras vigentes. Nenhuma emenda solicitada. |
| **Registry** | NÃO | Nenhuma nova entrada, tipo ou kind. Registry permanece congelado. |
| **RegistrySnapshot** | NÃO | Snapshot por tenant continua imutável e passivo. |
| **ResolutionGraph** | NÃO | **ResolutionGraph permanece completamente isolado desta etapa.** Sem novos resolvers, sem novo dispatcher, sem novo caminho de resolução. |
| **ActionExecutor** | NÃO | Executor não é tocado. Impersonação não altera execução de actions. |
| **PluginContext / Plugin System** | NÃO | Nenhuma exposição nova a plugins. Sandbox permanece read-only. |
| **Workspace Runtime / Renderer Layer** | NÃO | Nenhum hook, renderer ou provider é alterado. |
| **Bootstrap** | NÃO | Bootstrap não participa da propagação de tenant runtime. |
| **Tenant Middleware (IA-001)** | REUTILIZADO | Sem alteração de contrato. IA-002 apenas formaliza como o header é produzido e propagado. |
| **Client Auth (`requireSupabaseAuth`)** | REUTILIZADO | Sem alteração. |
| **Server Functions** | REUTILIZADAS | Passam a compor `[requireSupabaseAuth, requireTenant]` conforme necessidade individual. Não é mudança arquitetural. |

**Declaração formal:**
> *ResolutionGraph permanece completamente isolado desta etapa.*
> *Registry, Snapshot, ActionExecutor, PluginContext, Workspace Runtime e*
> *Bootstrap permanecem completamente isolados desta etapa.*

---

## 5. Verificação dos Invariantes (Constituição §5)

| # | Invariante | Preservado? | Observação |
|---|---|---|---|
| 1 | Registry Purity | ✔ | Sem execução em Registry. |
| 2 | Registry Freeze | ✔ | Nenhum `register()` pós-bootstrap. |
| 3 | Snapshot Passivity | ✔ | Snapshot não participa. |
| 4 | Tenant Isolation | ✔ | Reforçado: tenant validado server-side, sempre. |
| 5 | Resolution Graph Immutability | ✔ | Grafo não é tocado. |
| 6 | Single Dispatcher | ✔ | Sem novo dispatcher. |
| 7 | Typed Kinds | ✔ | Sem novos kinds. |
| 8 | Plugin Read-Only Sandbox | ✔ | Plugins não veem impersonação. |
| 9 | Executor Purity | ✔ | Executor intocado. |
| 10 | Bootstrap Determinism | ✔ | Bootstrap intocado. |
| 11 | Explicit Contracts | ✔ | Header é contrato tipado, validado por regex UUID + `repo.exists()`. |
| 12 | O(1) Resolution | ✔ | Sem impacto em resolução. |

**Conclusão:** nenhum invariante alterado, adicionado ou removido.

---

## 6. Hard Gates (Constituição §8)

`No new Hard Gates introduced.`

| Gate | Resultado | Justificativa |
|---|---|---|
| **G0 — Governance** | ✔ PASS | Etapa iniciada por IA formal; sem ADR/Patch requeridos (ver §10/§11). |
| **G1 — Plugin Sandbox** | ✔ PASS | Plugins não participam. |
| **G2 — Flag Neutrality** | ✔ PASS | Sem feature flag envolvida na decisão. |
| **G3 — Loader Purity** | ✔ PASS | Loaders não são tocados; regra continua válida. |
| **G4 — Plugin Registry Isolation** | ✔ PASS | Sem imports cruzados. |
| **G5 — Context Read-Only** | ✔ PASS | PluginContext inalterado. |
| **G6 — Core Untouchability** | ✔ PASS | ResolutionGraph / Resolver / Snapshot / Executor / Registry intocados. |
| **G7 — Bootstrap Untouchability** | ✔ PASS | Bootstrap intocado. |

---

## 7. Análise de Acoplamento

| Pergunta | Resposta | Nota |
|---|---|---|
| Aumenta acoplamento? | **NÃO** | Attacher e middleware já se conhecem via contrato do header. IA-002 apenas formaliza. |
| Cria APIs paralelas? | **NÃO** | `requireTenant` continua sendo o único ponto de resolução server-side. |
| Cria singleton? | **NÃO** | Nenhum estado global. `localStorage` é per-browser, não singleton arquitetural. |
| Cria novo fluxo runtime? | **NÃO** | Fluxo oficial (Registry → Snapshot → ResolutionGraph → Renderer → Executor) inalterado. |
| Adiciona heurísticas? | **NÃO** | Decisão é determinística: header presente + super-admin + UUID válido + `exists` → aceita; caso contrário, erro explícito. |
| Adiciona fallback? | **NÃO** | Sem fallback. Falha explícita conforme IA-001. |
| Adiciona resolução paralela? | **NÃO** | Um único caminho de resolução (`resolveTenantContext`). |

Todos negativos, conforme exigido.

---

## 8. Impacto em Multi-tenancy

- **Isolamento preservado.** Cada requisição resolve seu tenant
  server-side; nenhuma cache global é introduzida.
- **Impersonação segura.** O header `x-tenant-id` é **intenção**, não
  autorização. Autorização é derivada exclusivamente de
  `is_super_admin()` server-side + validação `repo.exists(tenantId)`.
- **Validação dupla:**
  - **UX (client-side):** guardas de UI evitam exibir/enviar chamadas
    incoerentes com o tenant selecionado. Não é fronteira de segurança.
  - **Segurança (server-side):** `requireTenant` re-valida a cada
    requisição — regex UUID, super-admin check via RPC, `exists()`.
- **Boundary server-side.** Nenhuma decisão de tenant é aceita porque
  "o cliente disse". O cliente apenas **propõe**; o servidor **decide**.
- **Não confiar em headers do cliente.** Header é validado em todos os
  três eixos (formato, autorização do chamador, existência do tenant).
  Ausência ou invalidez recai no algoritmo de memberships (IA-001 §12.2).

---

## 9. Impacto em Plugins

**Neutralidade total.**

- `PluginContext` não expõe impersonação.
- Plugins não recebem `x-tenant-id`, não interceptam o attacher, não
  leem `localStorage.impersonate_tenant_id`.
- `apiVersion` do PluginContext não muda.
- Nenhum novo método é adicionado, mutador ou leitor.

---

## 10. Necessidade de ADR

**NÃO.**

Justificativa técnica:

- Nenhum componente oficial (Constituição §3) tem seu contrato,
  responsabilidade ou fronteira alterada.
- Nenhum invariante (§5) é criado, removido ou modificado.
- Nenhum Hard Gate (§8) é introduzido.
- O header `x-tenant-id` e seu tratamento server-side já foram
  arquiteturalmente decididos em IA-001 e implementados na Fase 2.2. A
  IA-002 apenas **formaliza a propagação client-side** e o
  **boundary operacional** de impersonação.
- A propagação via `functionMiddleware` é padrão do framework
  (TanStack Start), não uma decisão arquitetural do RM Prime SaaS.

Caso, durante auditoria, seja identificada a necessidade de expor
impersonação a plugins, alterar o contrato de `PluginContext` ou
introduzir estado de sessão server-side, um ADR **deverá** ser aberto
antes da implementação.

---

## 11. Necessidade de Patch Arquitetural

**NÃO.**

Justificativa formal:

- Nenhum arquivo protegido por Hard Gate (G6/G7) é editado.
- Nenhum contrato público em `src/components/workspace/**`,
  `src/registry/**` ou camadas de resolução é alterado.
- A Constituição não é emendada.
- Toda a superfície tocada (attacher, middleware, repository) já foi
  aprovada nas IA-001 e Governance Hardening; IA-002 apenas as
  **compõe operacionalmente**.

Caso a implementação futura demande alteração em qualquer camada
protegida, a IA-002 deverá ser **substituída** por versão que inclua
Patch Arquitetural — não emendada retroativamente.

---

## 12. Estratégia de Implementação

Descrição **arquitetural** apenas. Sem código, sem SQL, sem detalhes de
framework.

### 12.1 Modelo conceitual

Três atores lógicos, três responsabilidades disjuntas:

1. **Client Intent Producer** — camada de UI de super-admin. Registra a
   intenção de impersonar um tenant específico em armazenamento local
   do agente do usuário. Não decide, não valida, não autoriza.
2. **Client Intent Propagator** — middleware client-side que, a cada
   chamada de server function, lê a intenção e a anexa como header
   `x-tenant-id`. Puramente mecânico; não interpreta valor.
3. **Server Authority** — `requireTenant` (IA-001), único ponto que
   **decide** o tenant efetivo, aplicando o algoritmo determinístico já
   ratificado (impersonação → memberships → cardinalidade explícita).

### 12.2 Propagação

```
[UI super-admin]                     [Server Function]
     |                                       ^
     v                                       |
[Intent Store] --read--> [Attacher] --header--
                          (client)
```

- **Intent Store**: chave/valor local, escopo de agente. Presença =
  intenção; ausência = sem intenção.
- **Attacher**: puramente sintático. Só anexa o header se a intenção
  existir e for não-vazia. **Não** valida formato, **não** valida
  autorização — isso é responsabilidade do servidor.
- **Server Authority**: reaplica a rotina completa da IA-001.

### 12.3 Boundary de impersonação

- **Aceita** quando: caller é super-admin comprovado por RPC + header é
  UUID sintaticamente válido + tenant existe.
- **Rejeita explicitamente** com erros determinísticos:
  - caller não é super-admin → `Forbidden: impersonation not allowed`.
  - header malformado → `Invalid tenant`.
  - tenant inexistente → `Invalid tenant`.
- **Ignora** apenas quando o header está ausente. Nesse caso o
  algoritmo prossegue para memberships (IA-001).

### 12.4 Regras invioláveis

- Nenhuma decisão de segurança feita no cliente.
- Nenhum estado de impersonação persistido no servidor entre chamadas.
- Nenhum cache de "último tenant impersonado" no servidor.
- Nenhum fallback (ex.: header inválido → cair em memberships) —
  header inválido é falha imediata.
- Nenhuma heurística de "melhor tenant" quando cardinalidade > 1.
- Nenhum log server-side deve emitir o header sem sanitização.

### 12.5 Testabilidade

`resolveTenantContext` já é puro (IA-001 §6, Unit Testing Policy). Os
cenários adicionais introduzidos pela IA-002 são coberturas de
composição, não de novo algoritmo:

- header presente + caller não super-admin → erro.
- header presente + UUID inválido → erro.
- header presente + tenant inexistente → erro.
- header presente + super-admin + tenant válido → sucesso com
  `impersonation: true`.

Todos já contemplados por `tenant-middleware.spec.ts` (framework-agnostic).

---

## 13. Checklist Final

- [x] Objetivo definido (§1).
- [x] Escopo delimitado, dentro e fora (§2).
- [x] Componentes envolvidos identificados (§3).
- [x] Análise arquitetural componente-a-componente (§4).
- [x] Isolamento explícito de ResolutionGraph, Registry, Snapshot,
      Executor, PluginContext, Bootstrap e Workspace Runtime (§4).
- [x] Verificação de todos os 12 invariantes (§5).
- [x] Hard Gates G0–G7 reavaliados; nenhum novo introduzido (§6).
- [x] Análise de acoplamento com 7 perguntas obrigatórias, todas
      negativas (§7).
- [x] Impacto em multi-tenancy analisado (§8).
- [x] Neutralidade de plugins declarada (§9).
- [x] Necessidade de ADR avaliada — **NÃO** (§10).
- [x] Necessidade de Patch Arquitetural avaliada — **NÃO** (§11).
- [x] Estratégia de implementação puramente arquitetural (§12).
- [x] Nenhum código, SQL ou detalhe de framework introduzido.
- [x] Nenhuma heurística, fallback ou resolução implícita proposta.
- [x] Nenhuma confiança em headers enviados pelo cliente como fonte de
      autoridade.
- [x] Toda decisão crítica permanece server-side.

---

## Anti-regressão

Confirmações formais de que a IA-002 **não** altera:

- ☑ Workspace Runtime.
- ☑ Registry.
- ☑ ResolutionGraph.
- ☑ RegistrySnapshot.
- ☑ Plugin Architecture / PluginContext.
- ☑ ActionExecutor.
- ☑ Bootstrap.

---

## Declaração de conformidade

Este documento está em conformidade formal com a
[`ARCHITECTURE_CONSTITUTION.md`](../ARCHITECTURE_CONSTITUTION.md) v1.0.0,
respeitando §2 (Core Principles), §3 (Official Architecture), §5
(Invariants), §6 (Forbidden Decisions), §7 (Governance Process) e §8
(Hard Gates).

**Implementação permanece BLOCKED** até auditoria e aprovação formal
desta IA-002.
