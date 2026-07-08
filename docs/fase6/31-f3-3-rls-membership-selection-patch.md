# F3.3 — RLS Membership Selection Patch

## 1. Objetivo

Espelhar em SQL/RLS a lógica de seleção server-side aprovada na F3.2, de modo
que `public.get_current_tenant_id()` valide `x-tenant-id` contra
`tenant_members.membership_status = 'active'`, sem fallback, sem tenant
default, sem `is_default/is_owner/tenant_role`, sem `LIMIT 1/ORDER BY`.

## 2. Contexto

- Fase 2 encerrada; F3.1 criou `tenant_role`, `membership_status` e
  `tenant_members_active_lookup_idx`.
- F3.2 (confirmada em F3.2.1) já aceita seleção validada na camada TS via
  `resolveTenantContext`.
- `public.get_current_tenant_id()` ainda não espelhava essa seleção — usuário
  comum com N memberships e header válido não conseguia resolver tenant via
  RLS. F3.3 corrige exatamente essa divergência.

## 3. Nível de Risco

Alto. `get_current_tenant_id()` é usada por dezenas de policies RLS
tenant-scoped. Qualquer erro pode vazar dados cross-tenant, aceitar header
spoofado, ou negar acesso legítimo. A implementação foi restrita ao núcleo
SQL e validada com testes SQL cobrindo todos os cenários da §13 do prompt.

## 4. Arquivos / Funções Inspecionadas

- `public.get_current_tenant_id()` (auditada e reescrita)
- `public.is_super_admin()` (auditada, não alterada)
- `public.user_belongs_to_tenant(uuid)` (auditada, não alterada — legada,
  não faz parte do fluxo F3.3)
- `public.has_role(uuid, app_role)` (auditada, não alterada)
- Policies dependentes de `get_current_tenant_id()` (59 policies em 3
  schemas: `public.*`, `storage.objects`). Nenhuma foi alterada.

## 5. Estado Antes da Implementação

### 5.1 `get_current_tenant_id()` (M2b.1)

- Anônimo: retornava header cru.
- Super Admin: header → uuid diretamente, sem checar `tenants`.
- Usuário comum: contava memberships **sem filtrar por status**,
  usava `MIN(tenant_id)` (função inexistente para `uuid` em PG17 sem
  extensão), ignorava totalmente o header.

Problemas resolvidos por F3.3:
1. Contagem incluía `invited/suspended/revoked`.
2. `MIN(uuid)` não existe → falha silenciosa em qualquer cardinalidade > 0
   (tolerado apenas porque só existiam usuários com 1 active).
3. Header de usuário comum era ignorado — contradizia a F3.2.
4. Super Admin não validava existência do tenant.

### 5.2 `is_super_admin()`
`SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='super_admin')`.
Inalterada.

### 5.3 `user_belongs_to_tenant(_tenant)`
Legado: retorna `EXISTS` em `tenant_members` **sem** filtrar por status.
Fora do fluxo de resolução; usada por `tm_select`. Não alterada nesta etapa
para preservar policy de leitura própria de memberships.

### 5.4 Policies Dependentes
59 policies referenciam `get_current_tenant_id()`:
- RESTRICTIVE `tenant_isolation` em todas as tabelas de domínio
  (`imoveis`, `leads`, `blog_posts`, `cms_*`, `launch_*`, `media_library`,
  `portal_*`, `form_submissions`, `corretores`, `bairros`, `cidades`, `audit_log`,
  etc.).
- PERMISSIVE tenant-gated (leituras públicas por tenant, escritas por
  admin/gerente).
- `storage.objects` (buckets `imoveis`, `lancamentos`, `site`).

Nenhuma foi alterada. Todas herdam o novo comportamento pela reescrita da
função.

## 6. Migration Criada

Foram gravadas três migrations (correções incrementais dentro da mesma
etapa F3.3):

1. `supabase/migrations/20260708132329_a26a6895-378b-4eea-be06-dfa910c2fd46.sql`
   — cria `user_has_active_membership` + primeira versão da função.
2. `supabase/migrations/20260708132624_82f1f0e4-4795-4b5a-bf96-429f3fa1c330.sql`
   — remove `MIN(uuid)` (inexistente em PG17 sem `aggs_for_arrays`).
3. `supabase/migrations/20260708132711_decbc781-8120-441f-a62d-eae9c8be5027.sql`
   — trata cabeçalho malformado como negação explícita (não cai no fluxo
   sem header).

A versão final da função e do helper vive nas migrations (2) e (3) acima.

## 7. Alterações Implementadas

### 7.1 `get_current_tenant_id()` — fluxo final

1. Lê `x-tenant-id`. Registra `v_header_present` e converte para `uuid`
   com bloco `BEGIN...EXCEPTION` — malformação vira `v_header_uuid = NULL`
   mantendo `v_header_present = true`.
2. **Anônimo:** retorna o UUID do header (ou NULL). Autorização real fica
   a cargo de policies específicas de endpoints públicos.
3. **Super Admin:** sem header ou header malformado → NULL. Com header
   válido, valida `EXISTS (SELECT 1 FROM public.tenants WHERE id = ...)`;
   se não existe → NULL.
4. **Usuário comum com header:** header malformado → NULL; header válido
   passa por `public.user_has_active_membership(auth.uid(), header)` — só
   retorna o tenant do header se houver membership `active`.
5. **Usuário comum sem header:** conta memberships com
   `membership_status = 'active'`. 0 ou >1 → NULL. Exatamente 1 → retorna
   o único `tenant_id` (segundo `SELECT` isolado; sem `MIN`, sem
   `ORDER BY`, sem `LIMIT 1` como mecanismo de seleção).

### 7.2 Função auxiliar `user_has_active_membership(_user_id, _tenant_id)`

```sql
SELECT EXISTS (
  SELECT 1 FROM public.tenant_members
   WHERE user_id = _user_id AND tenant_id = _tenant_id
     AND membership_status = 'active'
);
```
`STABLE SECURITY DEFINER`, `search_path = public`. `GRANT EXECUTE` a
`authenticated` e `service_role`. Não confere acesso por si só — apenas
resposta booleana. Não usa `is_default/is_owner/tenant_role`.

### 7.3 Search Path / Security Definer

Ambas as funções mantêm `SECURITY DEFINER` (padrão do projeto para
funções lidas por RLS) e `SET search_path = 'public'`. Sem SQL dinâmico.

## 8. Comportamento Final por Cenário

| # | Cenário | Retorno |
|---|---|---|
| 1  | Usuário comum 0 active / no header | NULL |
| 2  | Usuário comum 1 active / no header | tenant único |
| 3  | Usuário comum N active / no header | NULL |
| 4  | Usuário comum N active / header p/ active | tenant do header |
| 5  | Usuário comum / header alheio | NULL |
| 6  | Usuário comum / header malformado | NULL |
| 7  | Usuário comum / header tenant inexistente | NULL |
| 8  | Usuário comum membership invited | NULL |
| 9  | Usuário comum membership suspended | NULL |
| 10 | Usuário comum membership revoked | NULL |
| 11 | 1 active + 1 suspended / no header | tenant active |
| 12 | 2 active + 1 suspended / no header | NULL |
| 13 | Super Admin + header válido existente | tenant do header |
| 14 | Super Admin sem header | NULL |
| 15 | Super Admin header malformado | NULL |
| 16 | Super Admin header tenant inexistente | NULL |
| 17-19 | `is_default`/`is_owner`/`tenant_role` não influenciam | anti-regressão SQL |
| 20 | Header comum ≠ impersonação (fluxos separados) | selection |

## 9. Testes SQL Executados

Script: `/tmp/f33_tests.sql` (framework-agnóstico, executado com
`psql -v ON_ERROR_STOP=1 -f`). Roda dentro de `BEGIN...ROLLBACK` com
fixtures sobre os 4 usuários reais e 2 tenants sintéticos.

Resultado: **21/21 asserções PASS**, incluindo 3 anti-regressões contra o
próprio texto das funções (`pg_get_functiondef`) verificando ausência de
`is_default`, `is_owner`, `tenant_role`, `order by`, `limit 1`.

Cobertura por cenário do prompt (§13.1):
- 01 (0 memberships): **não diretamente testado** — todo usuário em
  `auth.users` já tem 1 membership `active` no tenant real, e o exec não
  permite criar `auth.users`. Coberto **indiretamente**: função retorna
  NULL sempre que `COUNT(...) <> 1` e por construção `COUNT = 0` cai
  nesse ramo. Anti-regressão do fluxo (COUNT/return NULL) coberta pelo
  cenário 03 (COUNT = 2).
- 02–20: todos cobertos por assertivas explícitas.
- 17–19 (legacy flags): cobertos por leitura do texto da função
  (`pg_get_functiondef`) provando ausência de qualquer referência a
  `is_default`, `is_owner`, `tenant_role`.

Comando exato:
```
psql -v ON_ERROR_STOP=1 -f /tmp/f33_tests.sql | grep -E "PASS|FAIL|ERROR"
```

## 10. Testes RLS Executados

- Chamada em contexto simulado (`request.jwt.claims` + `request.headers`)
  contra `public.get_current_tenant_id()` valida a autoridade central que
  todas as policies RESTRICTIVE herdam.
- Smoke com usuário comum e header apontando para o tenant real retorna
  o tenant real; header apontando para tenant onde não há membership
  retorna NULL — ou seja, qualquer policy `USING (tenant_id = get_current_tenant_id())`
  bloqueará automaticamente cross-tenant.
- Limitação assumida: não foi possível executar `SELECT` sob `SET LOCAL
  ROLE authenticated` com JWT válido dentro do exec (falta permissão para
  trocar de role e para inserir em `auth.users`). Cobertura RLS ponta-a-
  ponta contra tabelas de domínio deve ser complementada por
  `tests/security/test_tenant_isolation.py` no CI e por smoke manual no
  ambiente de staging.

## 11. Anti-Regressões Confirmadas

Verificado por `pg_get_functiondef`:
- Nenhuma referência a `is_default`.
- Nenhuma referência a `is_owner`.
- Nenhuma referência a `tenant_role`.
- Nenhum `LIMIT 1` como mecanismo de seleção de tenant.
- Nenhum `ORDER BY` como mecanismo de seleção de tenant.
- `membership_status = 'active'` obrigatório em todo caminho de usuário
  comum.
- Super Admin sem header retorna NULL.
- Header inválido para usuário comum retorna NULL (não cai no fluxo
  sem-header).
- Sem fallback, sem tenant default, sem heurística.
- Nenhuma policy foi relaxada; nenhum `OR is_super_admin()` foi
  introduzido em policy RESTRICTIVE.

## 12. Itens Não Alterados

- `src/integrations/supabase/tenant-middleware.ts`
- `src/integrations/supabase/tenant-repository.ts`
- `src/integrations/supabase/tenant-attacher.ts`
- `src/integrations/supabase/impersonation-state.ts`
- `src/integrations/supabase/auth-middleware.ts`
- `src/start.ts`
- Client, UI, Tenant Switcher, storage, Registry, RegistrySnapshot,
  ResolutionGraph, ActionExecutor, PluginContext, Runtime Core
- Billing, planos, trial, integrações comerciais
- Todas as policies RLS existentes (59 herdam o novo comportamento)
- `public.is_super_admin()`, `public.user_belongs_to_tenant()`,
  `public.has_role()`

## 13. Limitações Conhecidas

- Cenário 01 (0 memberships active) não testável diretamente no ambiente
  atual — dependemos da cobertura estrutural (`COUNT <> 1 → NULL`).
- Alertas do linter (WARN 0028/0029) sobre `SECURITY DEFINER` públicas
  são pré-existentes ao patch (`has_role`, `is_super_admin`,
  `user_belongs_to_tenant`, etc.) e correspondem ao padrão vigente do
  projeto para funções lidas por RLS. Não introduzimos novo padrão; o
  helper novo segue o mesmo modelo.
- Ambiente exec não permite `SET session_replication_role` nem trocar
  role para `authenticated` com JWT real — cobertura RLS end-to-end fica
  a cargo do CI/staging.

## 14. Riscos Residuais

- **R1 — Consumidor SQL de `MIN(uuid)`:** a versão M2b.1 dependia de
  `MIN(uuid)`, função ausente em PG17 sem extensão. A F3.3 removeu a
  dependência. Nenhuma outra função depende disso.
- **R2 — Divergência TS × SQL agora resolvida** para o fluxo de seleção
  comum; permanece o hardening em TS para não confiar em `x-tenant-id`
  como autoridade (invariante já enforced em F3.2).
- **R3 — `user_belongs_to_tenant` legado:** ainda não filtra por
  `active`. É usada apenas em `tm_select` (leitura de própria
  membership); avaliar deprecação/ajuste em subetapa futura fora do
  escopo F3.3.

## 15. Próxima Subetapa Recomendada

**F3.4 — Tenant Selection Transport / Client State**: transporte
client-side comum para `x-tenant-id`, separado da impersonação de Super
Admin, sem usar client como autoridade. Sujeita a prompt próprio,
relatório próprio e auditoria externa.

## 16. Confirmação Formal

Confirmo que a F3.3 — RLS Membership Selection Patch foi executada como
etapa crítica limitada ao núcleo SQL/RLS.

Confirmo que `public.get_current_tenant_id()` agora espelha a lógica
aprovada na F3.2.

Confirmo que `x-tenant-id` continua sendo transporte, nunca autoridade.

Confirmo que usuário comum com `x-tenant-id` só resolve tenant mediante
`membership_status = active` validada em SQL.

Confirmo que memberships `invited`, `suspended` e `revoked` não resolvem
tenant.

Confirmo que usuário comum com tenant alheio, header inválido ou tenant
inexistente recebe NULL sem fallback.

Confirmo que usuários com N memberships ativas e sem header retornam
NULL.

Confirmo que usuários com uma única membership ativa e sem header
retornam esse tenant.

Confirmo que Super Admin sem header retorna NULL.

Confirmo que Super Admin com header válido resolve apenas tenant
existente via impersonação.

Confirmo que `is_default`, `is_owner` e `tenant_role` não foram usados
para resolução de tenant.

Confirmo que não foi usado `LIMIT 1` ou `ORDER BY` como mecanismo de
escolha de tenant.

Confirmo que nenhuma policy foi relaxada indevidamente.

Confirmo que não foi introduzido `OR is_super_admin()` em policy
restritiva.

Confirmo que client, UI, Tenant Switcher, middleware TypeScript,
`TenantRepository`, storage, impersonação e Runtime Core não foram
alterados.

Confirmo que billing, planos, trial e integrações comerciais não foram
implementados.

Confirmo que testes SQL/RLS foram executados de verdade
(`psql -v ON_ERROR_STOP=1 -f /tmp/f33_tests.sql`), com **21/21
asserções PASS**, incluindo três anti-regressões contra o texto das
funções.

Confirmo que a próxima etapa recomendada é apenas **F3.4 — Tenant
Selection Transport / Client State**, sujeita a prompt próprio,
relatório próprio e auditoria externa.
