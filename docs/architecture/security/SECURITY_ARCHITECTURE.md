# SECURITY ARCHITECTURE — RM Prime SaaS

**Versão:** 1.0.0
**Status:** Ratificado — GA-02 · Security Architecture Foundation
**Autoridade:** Documento oficial e único para todas as decisões
permanentes de segurança da plataforma. Extensão normativa da
[`ARCHITECTURE_CONSTITUTION.md`](../ARCHITECTURE_CONSTITUTION.md).

> Em caso de conflito entre este documento e implementações, prompts,
> relatórios ou documentações secundárias, prevalece o presente
> `SECURITY_ARCHITECTURE.md` — subordinado exclusivamente à Constituição.

---

## 1. Missão

Estabelecer a base normativa permanente para autenticação, autorização,
isolamento multi-tenant, impersonação, proteção de storage, segurança
de plugins, propagação de contexto e superfícies de ataque no RM Prime
SaaS. Este documento existe para garantir que decisões de segurança
sejam:

- **Arquiteturais** — não incidentais.
- **Permanentes** — versionadas e auditáveis.
- **Server-authoritative** — nunca dependentes do cliente.
- **Neutras a framework** — independentes de React, TanStack, Supabase
  ou qualquer stack específica.

---

## 2. Security Principles

Princípios normativos. Todos obrigatórios e não negociáveis.

| Princípio | Definição normativa |
|---|---|
| **Server Authority** | O servidor é a única autoridade sobre identidade, tenant, permissão e autorização. |
| **Zero Trust Client** | Nada enviado pelo cliente (headers, cookies, body, storage) é aceito como decisão de segurança sem revalidação server-side. |
| **Tenant Isolation** | Todo dado, sessão, storage, cache e superfície runtime é escopado por tenant. Vazamento cross-tenant é falha crítica. |
| **Explicit Authorization** | Toda operação sensível declara explicitamente sua exigência de permissão. Sem autorização implícita. |
| **Least Privilege** | Cada camada, papel e integração recebe o mínimo de privilégio necessário. |
| **Fail Fast** | Falhas de contrato, validação ou autorização falham no ponto mais próximo da causa. |
| **Immutable Runtime** | Superfícies de decisão de segurança não são mutáveis em runtime. |
| **Plugin Isolation** | Plugins nunca podem bypassar autorização, isolamento de tenant ou contratos de segurança. |
| **Defense in Depth** | Múltiplas camadas independentes protegem cada superfície crítica. |

---

## 3. Trust Boundaries

Modelo oficial de fronteiras de confiança:

```
Browser
   ↓  (untrusted)
Client
   ↓  (untrusted transport payload)
Transport
   ↓  (TLS + integrity, no authority)
Server Validation
   ↓  (authentication + input validation)
Tenant Middleware
   ↓  (tenant resolution + authorization)
Business Layer
   ↓  (domain rules)
Database
   ↓  (RLS enforcement)
```

Regras normativas:

- **Browser → Client:** confiança zero. Extensões, DevTools e ataques
  locais podem manipular qualquer valor.
- **Client → Transport:** o cliente propõe intenções; nunca decide.
- **Transport → Server:** o servidor **sempre** re-valida, mesmo que o
  cliente já tenha validado.
- **Server → Business:** o `Tenant Middleware` é a fronteira única de
  resolução autoritativa do tenant ativo.
- **Business → Database:** RLS é a última linha de defesa; nunca a
  primeira.

---

## 4. Authentication

- Autenticação é responsabilidade exclusiva do servidor.
- O cliente **jamais** decide se um usuário está autenticado — apenas
  reflete o estado retornado pelo servidor.
- Todo `Access Token` é validado server-side em cada requisição
  autenticada (`requireSupabaseAuth`).
- Sessões expiradas, revogadas ou inválidas falham explicitamente.
- Sem "sessão implícita", sem "melhor esforço", sem fallback silencioso.

---

## 5. Authorization

- Autorização é derivada exclusivamente de dados **server-side**
  (papéis, memberships, políticas).
- Nenhum papel é aceito a partir de storage local, cookies não-assinados
  ou headers do cliente.
- `is_super_admin()` e verificações equivalentes são resolvidas
  server-side por função de banco / RPC, jamais inferidas.
- Toda rota autenticada declara sua exigência de autorização via
  middleware composicional (ex.: `[requireSupabaseAuth, requireTenant]`).
- Ausência de declaração de autorização = rota rejeitada.

---

## 6. Tenant Isolation

- Cada requisição é resolvida a um único `tenantId` server-side pelo
  `Tenant Middleware` (IA-001).
- Cardinalidade explícita: 0, 1 ou N memberships são tratados de forma
  determinística. **Sem `LIMIT 1` implícito.**
- Nenhum cache global de tenant é permitido no servidor.
- Snapshot por tenant permanece imutável e passivo (Constitution §3.2).
- Cross-tenant reads/writes são falhas críticas e devem ser bloqueados
  em três camadas: aplicação, middleware, RLS.

---

## 7. Impersonation

Regras permanentes de impersonação:

1. **Somente super-admin** pode iniciar impersonação.
2. **Validação server-side obrigatória** — o cliente apenas propõe a
   intenção; o servidor decide.
3. **Auditoria obrigatória** — toda impersonação bem-sucedida deve
   gerar registro auditável (implementação futura, ver §11).
4. **Nenhuma decisão client-side** — presença/ausência de header,
   estado de UI, flag local — nada disso autoriza impersonação.
5. **Sem estado server-side persistente** entre chamadas — cada
   requisição re-valida integralmente.
6. **Sem fallback implícito** — header inválido falha; não "cai" em
   memberships.
7. **Sem exposição a plugins** — `PluginContext` nunca recebe estado
   de impersonação.

Detalhamento operacional: ver
[`IA-002-ClientImpersonationLayer.md`](../impact-analysis/IA-002-ClientImpersonationLayer.md).

---

## 8. Storage Security

Preparação normativa para M3 (Storage Isolation). **Nenhuma
implementação nesta etapa.**

- Todo objeto armazenado é prefixado por `tenantId`.
- Nenhuma leitura/escrita cross-tenant é permitida no bucket.
- URLs assinadas expiram em janela mínima necessária.
- Uploads exigem tenant resolvido server-side antes de escrita.
- Storage Abstraction Layer (Fase 4) preservará este contrato.

---

## 9. Plugin Security

Alinhado à Constitution §3.5 e ADR-003:

- `PluginContext` é **read-only**; nenhum mutador exposto.
- Plugins não acessam Registry base, Snapshot mutável, ResolutionGraph
  writable, ou estado de sessão.
- Plugins não recebem tokens de autenticação, headers de propagação de
  contexto ou estado de impersonação.
- `apiVersion` é fixo por release e define superfície permitida.
- Futuro Plugin Marketplace (Fase 5) exigirá assinatura e trust layer
  antes de qualquer execução privilegiada.

---

## 10. Threat Model

Modelo consolidado. Ameaças rastreadas pela plataforma:

| Ameaça | Descrição | Mitigação | Camada responsável |
|---|---|---|---|
| **Forged tenant header** | Cliente forja `x-tenant-id` para acessar tenant alheio. | Validação server-side: super-admin check + UUID regex + `repo.exists()`. Header é intenção, não autorização. | Tenant Middleware |
| **Tenant hopping** | Usuário legítimo tenta acessar tenants sem membership. | Resolução determinística por memberships (IA-001); RLS restritiva (M2b). | Tenant Middleware + Database |
| **Privilege escalation** | Usuário não-admin tenta assumir papéis privilegiados. | Papéis derivados server-side por RPC/tabela dedicada; nunca lidos do cliente. | Authorization |
| **Replay attack** | Reuso de token/header capturado. | TLS + expiração curta de tokens; validação de assinatura de sessão em cada chamada. | Transport + Authentication |
| **Stale impersonation session** | Super-admin mantém impersonação após revogação. | Sem estado server-side de impersonação; cada chamada re-valida `is_super_admin()` + `exists(tenantId)`. | Tenant Middleware |
| **Cross-tenant data leak** | Query mal-escopada retorna dados de outro tenant. | Defense in depth: filtro por `tenantId` no repositório + RLS RESTRICTIVE. | Business + Database |
| **Plugin bypass** | Plugin tenta ler/mutar contexto de segurança. | `PluginContext` read-only; imports proibidos por Hard Gates G1/G4/G5. | Plugin Architecture |
| **Storage cross-tenant access** | Bucket path adivinhável leva a tenant alheio. | Prefixação obrigatória por `tenantId` (M3); URLs assinadas curtas. | Storage |

Novas ameaças identificadas em auditoria devem ser adicionadas a esta
tabela junto com sua mitigação e camada responsável.

---

## 11. Audit Trail

Preparação para observabilidade formal. **Não implementado nesta etapa.**

Diretrizes futuras:

- Toda impersonação bem-sucedida gera registro auditável (ator, tenant
  alvo, timestamp, contexto).
- Toda falha de autorização gera registro (sem vazar dados sensíveis).
- Toda alteração de papel gera registro imutável.
- Logs de auditoria são escopados por tenant e nunca expõem tokens,
  headers de sessão ou segredos.
- Retenção mínima e política de acesso definidas na Fase 7
  (Observability Layer).

---

## 12. Security Invariants

Invariantes permanentes. **Nenhum pode ser removido sem Emenda
(Constitution §10).**

1. **Server is the single authority.**
2. **Client never decides tenant.**
3. **Tenant isolation is mandatory.**
4. **No plugin may bypass authorization.**
5. **Every impersonation must be validated server-side.**
6. **Business logic never trusts transport data.**
7. **Only super-admin may impersonate.**
8. **No impersonation state is persisted server-side between calls.**
9. **Every authenticated route declares its authorization.**
10. **RLS is the last line of defense, never the first.**

---

## Cross-Links

- Constitution → [`../ARCHITECTURE_CONSTITUTION.md`](../ARCHITECTURE_CONSTITUTION.md)
- Roadmap → [`../ROADMAP_ARCHITECTURAL.md`](../ROADMAP_ARCHITECTURAL.md)
- Impact Analysis → [`../impact-analysis/README.md`](../impact-analysis/README.md)
- IA-001 (Tenant Middleware) → [`../impact-analysis/IA-001-TenantMiddleware.md`](../impact-analysis/IA-001-TenantMiddleware.md)
- IA-002 (Client Impersonation Layer) → [`../impact-analysis/IA-002-ClientImpersonationLayer.md`](../impact-analysis/IA-002-ClientImpersonationLayer.md)
- ADRs → [`../ADR/README.md`](../ADR/README.md)
- Glossary → [`../glossary.md`](../glossary.md)
- Diagrams → [`../diagrams/`](../diagrams/)
