# IA-001 — Tenant Middleware (Fase 2.2)

**Status:** Proposed
**Etapa alvo:** Fase 2 · 2.2 — `requireTenant` middleware
**Autoridade:** [ARCHITECTURE_CONSTITUTION.md](../ARCHITECTURE_CONSTITUTION.md)

---

## 1. Objetivo da etapa
Resolver, de forma determinística e server-side, **qual `tenantId` está
ativo em cada server function autenticada**, para que toda leitura/escrita
no Supabase ocorra sob o tenant correto (com respeito a super-admin
impersonation), sem depender do cliente para declarar tenant em código
de negócio.

Benefício esperado: base sólida e única para as etapas 2.3 (bearer +
`x-tenant-id`), M2b (policies RESTRICTIVE por tenant) e M3 (storage por
tenant), eliminando risco de vazamento cross-tenant.

## 2. Escopo
**Dentro:**
- Novo arquivo `src/integrations/supabase/tenant-middleware.ts` exportando
  `requireTenant` (composto sobre `requireSupabaseAuth`).
- Resolução de `tenantId` a partir de `tenant_members(user_id)`.
- Suporte a impersonação: quando o usuário for super-admin **e** o header
  `x-tenant-id` estiver presente, usa esse valor.
- Fail-fast quando usuário não pertence a nenhum tenant e não é super-admin.

**Fora:**
- Não altera policies RLS (M2b).
- Não altera storage (M3).
- Não altera client-side attacher (2.3, IA separada).
- Não introduz cache global de tenants (a resolver, se necessário, em IA futura).
- Não toca Workspace, Registry, Snapshot, ResolutionGraph, Renderer,
  ActionExecutor, PluginContext, PluginRegistry, Bootstrap.

## 3. Componentes envolvidos
- `src/integrations/supabase/tenant-middleware.ts` (novo).
- Server functions que passarem a compor com `requireTenant` (fora do escopo desta IA — cada adoção é etapa própria).
- Tabela `public.tenant_members` e função `public.is_super_admin()` (leitura apenas).

Nenhum componente do runtime do Workspace é tocado.

## 4. Análise Arquitetural
| Componente | Alterado? | Justificativa |
|---|---|---|
| ResolutionGraph | **NÃO** | Middleware é infra de auth/tenant, não participa da resolução runtime do Workspace. |
| Registry | **NÃO** | Não registra nada em registries do Workspace. |
| RegistrySnapshot | **NÃO** | Snapshot é por tenant no Workspace; middleware apenas descobre `tenantId` server-side. |
| ActionExecutor | **NÃO** | Executor permanece função pura; middleware é externo ao pipeline de actions. |
| PluginContext | **NÃO** | Sandbox de plugin não é tocado. |
| Bootstrap | **NÃO** | Bootstrap permanece determinístico e único; não depende de middleware server-side. |
| Contratos Públicos | **NÃO** | Contratos oficiais (§3 da Constituição) inalterados. Novo símbolo `requireTenant` é contrato **novo** da camada de auth, não alteração de contrato existente. |

## 5. Verificação dos Invariantes (§5)
1. **Registry Purity** — preservado (middleware não muta registry).
2. **Registry Freeze** — preservado.
3. **Snapshot Passivity** — preservado.
4. **Tenant Isolation** — **reforçado** (esta etapa consolida isolamento server-side).
5. **Resolution Graph Immutability** — preservado.
6. **Single Dispatcher** — preservado.
7. **Typed Kinds** — preservado.
8. **Plugin Read-Only Sandbox** — preservado.
9. **Executor Purity** — preservado.
10. **Bootstrap Determinism** — preservado.
11. **Explicit Contracts** — preservado; `requireTenant` expõe `tenantId: string` tipado em `context`.
12. **O(1) Resolution** — preservado (não afeta lookup do grafo).

## 6. Hard Gates (§8)
- **G0 — Governance:** aprovado. Esta IA precede a implementação.
- **G1 — Plugin Sandbox:** aprovado. Nada em `plugins/*` é tocado.
- **G2 — Flag Neutrality:** aprovado. Não há flag envolvida.
- **G3 — Loader Purity:** aprovado. `PluginLoader` intocado.
- **G4 — Plugin Registry Isolation:** aprovado. `PluginRegistry` intocado.
- **G5 — Context Read-Only:** aprovado. `PluginContext` intocado.
- **G6 — Core Untouchability:** aprovado. Registry/Snapshot/ResolutionGraph/Executor intocados.
- **G7 — Bootstrap Untouchability:** aprovado. `bootstrap` intocado.

## 7. Análise de Acoplamento
| Pergunta | Resposta |
|---|---|
| Aumenta acoplamento? | Não — introduz novo módulo isolado; server functions o consomem por composição opt-in. |
| Cria dependências cruzadas? | Não — depende apenas de `requireSupabaseAuth` e do banco. |
| Adiciona responsabilidades a componentes existentes? | Não. |
| Introduz singleton? | Não — o middleware é uma função por request. |
| Cria APIs paralelas? | Não — é a **única** forma oficial de obter `tenantId` em server functions. |
| Cria novo fluxo de resolução runtime? | Não — não participa do fluxo do Workspace (§4). |
| Adiciona fallback? | Não — comportamento é explícito: super-admin + header → impersona; senão membership; senão erro. |
| Adiciona heurísticas? | Não — regras determinísticas e ordenadas. |
| Altera runtime do Workspace? | Não. |

## 8. Impacto em Multi-tenancy
- **Tenant isolation server-side:** reforçado. Toda serverFn que adotar
  `requireTenant` opera sob tenant explícito.
- **Impersonação:** permanece segura — só efetiva quando `is_super_admin(userId)`
  é `true`; header enviado por não-admin é ignorado.
- **Storage:** inalterado nesta etapa (endereçado em M3/IA-004).
- **Policies RLS:** inalteradas nesta etapa (endereçadas em M2b/IA-003).

## 9. Impacto em Plugins
- `PluginContext`: inalterado.
- `PluginRegistry`: inalterado e isolado.
- `PluginLoader`: inalterado e neutro.
- `FeatureFlagService`: inalterado e neutro.

## 10. Necessidade de ADR
**NÃO.** A etapa não introduz nova camada arquitetural, não altera
contratos oficiais (§3), não modifica invariantes (§5) e não muda o fluxo
oficial (§4). Trata-se de infraestrutura interna à camada de autenticação
já existente.

Caso, na implementação, seja necessário promover `requireTenant` a
contrato oficial multi-módulo com semântica arquitetural (ex.: caching
cross-request, injeção em fluxos de resolução), abrir ADR antes.

## 11. Necessidade de Patch Arquitetural
**NÃO.** Nenhuma responsabilidade, contrato oficial, runtime ou processo
de governança é alterado.

## 12. Estratégia de Implementação

### 12.1. Modelo conceitual

A resolução de tenant é modelada como um **algoritmo determinístico de
resolução de contexto**, não como uma consulta SQL. A origem das
memberships (banco, cache, serviço interno, federação de identidade) é
detalhe de implementação e pode mudar sem alterar o algoritmo. Este
desacoplamento preserva o princípio de baixo acoplamento da arquitetura.

O algoritmo possui quatro etapas determinísticas:

1. Resolver contexto de impersonação (quando aplicável).
2. Resolver memberships do usuário.
3. Validar cardinalidade do resultado.
4. Produzir um único `tenantId` ou falhar de forma explícita.

### 12.2. Algoritmo oficial de resolução

**Etapa 1 — Impersonação (`x-tenant-id` presente):**
- Se o header `x-tenant-id` existir:
  - validar que `is_super_admin(userId)` é `true`;
  - validar que o `tenantId` informado é válido;
  - usar esse tenant;
  - caso contrário, falhar com erro explícito (`Forbidden: impersonation not allowed` ou `Invalid tenant`).

**Etapa 2 — Resolução por memberships (sem `x-tenant-id`):**
- Consultar **todas** as memberships válidas do usuário. **Proibido usar
  `LIMIT 1`** como regra de resolução — a cardinalidade deve ser
  observável pelo algoritmo.

**Etapa 3 — Validação de cardinalidade:**
- **Caso A — exatamente 1 membership:** usar esse tenant automaticamente.
  Este é exatamente o comportamento atual do sistema; nenhuma mudança
  funcional é introduzida.
- **Caso B — múltiplas memberships:** falhar de forma explícita:
  `Multiple tenant memberships. Tenant selection required.` O middleware
  **não pode** escolher arbitrariamente, aplicar heurísticas, usar
  ordenações implícitas do banco, nem retornar a primeira linha. A seleção
  explícita de tenant será endereçada em etapa futura própria (fora do
  escopo desta IA).
- **Caso C — nenhuma membership:** falhar com `Forbidden: no tenant membership`.

### 12.3. Notas arquiteturais

- A infraestrutura fica preparada para evolução futura (múltiplas
  memberships, seleção explícita, federação) **sem** implementar essas
  capacidades agora.
- Uma limitação temporária do produto (1 membership por usuário) **não**
  é incorporada como regra permanente da infraestrutura.
- Nenhuma escolha implícita é feita pelo middleware.

### 12.4. Passos operacionais

1. Criar `src/integrations/supabase/tenant-middleware.ts` compondo com
   `requireSupabaseAuth`; expor `requireTenant`.
2. Implementar as três etapas do algoritmo 12.2 exatamente na ordem
   descrita, com erros explícitos por cenário.
3. Testes: unit cobrindo os três casos (A/B/C) e os dois ramos de
   impersonação (super-admin ok, não super-admin rejeitado); Playwright
   cobrindo super-admin sem impersonação, super-admin impersonando e
   usuário comum com 1 membership.
4. Rollback: reverter apenas o arquivo novo — nada existente passa a
   depender dele nesta etapa.
5. Validação: `tsgo --noEmit` limpo; `rg` scans confirmando ausência de
   import cruzado com `workspace/`, `plugins/`, `resolution/`, `registry/`,
   `runtime/`.

## 13. Checklist Final
- ☐ Constituição consultada
- ☐ ADR necessário? — Não
- ☐ Patch necessário? — Não
- ☐ Hard Gates aprovados (G0–G7)
- ☐ Runtime preservado
- ☐ Contratos preservados
- ☐ Invariantes preservados
- ☐ Arquitetura preservada

> **Gate:** implementação de Fase 2.2 está **liberada** somente após esta
> IA ser aprovada. Fase 2.3, M2b e M3 exigem IAs próprias (IA-002, IA-003,
> IA-004) antes de qualquer código.
