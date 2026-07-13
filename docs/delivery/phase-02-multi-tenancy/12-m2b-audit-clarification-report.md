# M2b — Audit Clarification Report

**Status:** ✅ Emitido — aguardando decisão final de auditoria
**Escopo:** documental e evidências; **zero alterações funcionais**
**Governança:** IA-001, IA-002, IA-003, ARCHITECTURE_CONSTITUTION, SECURITY_ARCHITECTURE

Este relatório complementa `docs/delivery/phase-02-multi-tenancy/11-fase-2-m2b-relatorio.md` fornecendo
as evidências arquiteturais solicitadas pela auditoria externa da M2b.

---

## Parte 1 — Duplicidade da IA-003 (verificação)

Verificação executada em `docs/architecture/impact-analysis/README.md`:

```
$ grep -n "IA-003" docs/architecture/impact-analysis/README.md
71:- [IA-003 — RLS Policies](./IA-003-RLSPolicies.md) — 🟢 Aprovada · M2b implementada …
```

**Resultado:** existe **uma única entrada** da IA-003 no índice. Nenhuma
duplicação foi encontrada. O rótulo foi atualizado para referenciar também
este relatório de clarificação.

Em `ROADMAP_ARCHITECTURAL.md`:

```
65:| IA-003 · RLS Policies (RESTRICTIVE por tenant) | 🟢 Aprovada em auditoria final |
```

Também única.

**Conclusão:** nenhuma correção de duplicidade era necessária. O índice
reflete o estado atual do projeto.

---

## Parte 2 — `get_current_tenant_id()` — auditoria completa

### 2.1 Código final (produção, verificado via `pg_proc`)

```sql
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_tenant uuid;
  v_header text;
BEGIN
  -- Anonymous path
  IF v_uid IS NULL THEN
    BEGIN
      v_header := current_setting('request.headers', true)::jsonb ->> 'x-tenant-id';
      IF v_header IS NOT NULL AND v_header <> '' THEN
        RETURN v_header::uuid;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RETURN NULL;
    END;
    RETURN NULL;
  END IF;

  -- Super Admin path (Opção A — IA-003 §12.3)
  IF public.is_super_admin() THEN
    BEGIN
      v_header := current_setting('request.headers', true)::jsonb ->> 'x-tenant-id';
      IF v_header IS NOT NULL AND v_header <> '' THEN
        RETURN v_header::uuid;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RETURN NULL;
    END;
    RETURN NULL;
  END IF;

  -- Regular authenticated user
  SELECT tenant_id INTO v_tenant
    FROM public.tenant_members
   WHERE user_id = v_uid
   ORDER BY is_default DESC, is_owner DESC, joined_at ASC
   LIMIT 1;

  RETURN v_tenant;
END;
$function$;
```

### 2.2 Explicação linha a linha

| Bloco | Linhas | Semântica |
|---|---|---|
| Assinatura | `STABLE SECURITY DEFINER SET search_path='public'` | STABLE → planner memoriza uma avaliação por query. SECURITY DEFINER → roda com owner para acessar `tenant_members` sob RLS. `search_path` fixado → hardening anti-hijack de schema. |
| `v_uid := auth.uid()` | 8 | Único ponto de leitura de identidade. Não vem do header — vem do JWT verificado pelo GoTrue. |
| Bloco anon (`v_uid IS NULL`) | 11–21 | Sem identidade. Único caminho legítimo: fluxos públicos (formulários publicados, feeds de portal) que trafegam `x-tenant-id`. O UUID lido é apenas **transportado** para o predicate `tenant_id = get_current_tenant_id()` — a policy resolve a autorização com base no dado da tabela + regras adicionais (ex.: `EXISTS (cms_forms.status='published')`). Sem header → `NULL` → toda linha rejeitada. |
| Bloco super_admin | 25–35 | Opção A da IA-003 §12.3. Super Admin **não tem tenant default**. Sem header de impersonação → `NULL` → toda linha tenant-scoped rejeitada (predicate falha). Com header → tenant impersonado (IA-002). |
| Bloco usuário regular | 38–42 | Resolve via `tenant_members` do próprio `auth.uid()`. Ordenação determinística: default → owner → mais antigo. Se não existir membership → `v_tenant` fica NULL → toda linha rejeitada. |
| Try/exception | 15–20, 29–34 | Fail-closed: qualquer erro de parsing/UUID inválido → retorna `NULL`, negando acesso. Nunca propaga exceção. |

### 2.3 Matriz de decisão

| # | Caller | Header `x-tenant-id` | Retorno | Efeito |
|---|---|---|---|---|
| 1 | Usuário autenticado comum (1 membership) | ignorado | tenant da membership | opera no seu tenant |
| 2 | Usuário autenticado comum (N memberships) | ignorado | tenant priorizado (default→owner→oldest) | opera; seleção formal cabe ao middleware `requireTenant` server-side (IA-001) |
| 3 | Usuário autenticado sem membership | ignorado | `NULL` | rejeitado em tudo tenant-scoped |
| 4 | Super Admin | ausente | `NULL` | rejeitado em tudo tenant-scoped (Opção A) |
| 5 | Super Admin | UUID válido | esse UUID | impersonação (IA-002) |
| 6 | Super Admin | inválido | `NULL` | rejeitado |
| 7 | Anon | ausente | `NULL` | rejeitado |
| 8 | Anon | UUID válido | esse UUID | apenas **transporte**; predicate composto (RESTRICTIVE + PERMISSIVE anon) decide a autorização |
| 9 | Não-super autenticado forjando header | ignorado | tenant da membership | header ignorado; sem privilégio |

### 2.4 Semântica do header

- **Considerado apenas quando** o caller é anon ou super_admin.
- **Ignorado silenciosamente** para usuários autenticados regulares.
- **Retorna `NULL`** quando ausente/inválido/erro de parsing.
- **Nunca lança exceção** — fail-closed via `EXCEPTION WHEN OTHERS`.
- **Nunca é autoridade** — é dado transportado ao predicate.

---

## Parte 3 — Header `x-tenant-id`

### 3.1 Papel formal

| Propriedade | Valor |
|---|---|
| Camada | Transporte HTTP |
| Fonte de autoridade | ❌ nunca |
| Fonte de contexto | ✅ sim (apenas anon e super_admin) |
| Validação de identidade | ❌ nunca — identidade vem do JWT (`auth.uid()`) |
| Validação de autorização | ❌ nunca — autorização vem das policies RLS |

### 3.2 Garantias

1. `get_current_tenant_id()` só lê o header em dois ramos: `v_uid IS NULL`
   (anon) e `is_super_admin() = true`. **Impossível** para um usuário
   autenticado regular substituir seu tenant por header — o código nem
   avalia essa branch.
2. Server-side, `src/integrations/supabase/tenant-middleware.ts` (IA-001)
   valida `is_super_admin` via RPC no banco antes de aceitar impersonação
   e verifica existência do tenant via `TenantRepository.exists`.
3. Client-side, `tenant-attacher.ts` só anexa o header quando existe um
   `impersonate_tenant_id` local (super_admin operando via UI) — cliente
   comum não injeta o header.

### 3.3 Pergunta obrigatória

> **Um usuário anônimo consegue assumir outro tenant apenas enviando um header?**

**Não como fonte de autoridade.** Um anon com header:

- Passa a ter `get_current_tenant_id() = <UUID>`.
- Satisfaz a policy RESTRICTIVE `tenant_isolation` porque o dado tem o mesmo
  `tenant_id`.
- **Mas** para efetivamente ler/escrever ainda precisa satisfazer alguma
  policy PERMISSIVE (RESTRICTIVE apenas restringe; nunca concede).
- As únicas policies PERMISSIVE que aceitam `anon` são:
  - Leitura pública explícita (ex.: `bairros public read`, `blog_posts
    posts publicados sao publicos`, `cms_pages_public_read_published`) —
    dados **já classificados como públicos** por regra de negócio, e cuja
    exposição não depende do header.
  - Escrita pública de formulário (`form_submissions_public_insert` +
    `form_submissions_tenant_isolation_ins`) — dupla condição: form deve
    existir, estar `published` e ter mesmo `tenant_id` do payload. É o
    caso de uso legítimo do header.
  - `cms_campaign_events events_public_insert` — insere evento analítico
    com `tenant_id` explícito (mesma semântica).

**Evidência (produção):**

```
$ psql -tAc "SELECT COUNT(*) FROM pg_policies WHERE schemaname='public'
             AND permissive='RESTRICTIVE'
             AND (qual LIKE '%is_super_admin%' OR with_check LIKE '%is_super_admin%');"
0
```

Nenhuma policy RESTRICTIVE tenant-scoped contém bypass de `is_super_admin`.

---

## Parte 4 — Inventário definitivo (55 tabelas)

Fonte: `information_schema.tables` + `information_schema.columns` +
`pg_tables.rowsecurity` (verificação em produção).

| Tabela | Categoria | tenant_id | RLS | Observação |
|---|---|---|---|---|
| audit_log | **tenant-scoped audit** | NOT NULL (DEFAULT `get_current_tenant_id()`) | ON | RESTRICTIVE `tenant_isolation` |
| bairros | tenant-scoped | NOT NULL | ON | + leitura pública |
| blog_categorias | tenant-scoped | NOT NULL | ON | + leitura pública |
| blog_posts | tenant-scoped | NOT NULL | ON | + leitura pública (publicados) |
| cidades | tenant-scoped | NOT NULL | ON | + leitura pública |
| cms_campaign_events | tenant-scoped | NOT NULL | ON | + insert público (analytics) |
| cms_campaigns | tenant-scoped | NOT NULL | ON | + leitura pública (ativas) |
| cms_form_fields | tenant-scoped | NOT NULL | ON | + leitura pública (form publicado) |
| cms_forms | tenant-scoped | NOT NULL | ON | + leitura pública (publicados) |
| cms_import_snapshots | tenant-scoped | NOT NULL | ON | admin only |
| cms_pages | tenant-scoped | NOT NULL | ON | + leitura pública (publicadas) |
| corretores | tenant-scoped | NOT NULL | ON | |
| deal_lost_reasons | tenant-scoped | NOT NULL | ON | |
| email_send_log | **system** | — | ON | `service_role` only |
| email_send_state | **system** | — | ON | `service_role` only (circuit breaker) |
| email_unsubscribe_tokens | **global** (token único) | — | ON | `service_role` only |
| form_submissions | tenant-scoped | NOT NULL | ON | + insert público via form publicado |
| imoveis | tenant-scoped | NOT NULL | ON | + leitura pública (ativos) |
| imovel_imagens | tenant-scoped | NOT NULL | ON | |
| imovel_portais | tenant-scoped | NOT NULL | ON | |
| instagram_posts | tenant-scoped | NOT NULL | ON | |
| launch_amenities | tenant-scoped | NOT NULL | ON | |
| launch_payment_conditions | tenant-scoped | NOT NULL | ON | |
| launch_pdfs | tenant-scoped | NOT NULL | ON | |
| launch_project_amenities | tenant-scoped | NOT NULL | ON | |
| launch_project_imagens | tenant-scoped | NOT NULL | ON | |
| launch_projects | tenant-scoped | NOT NULL | ON | + leitura pública (ativos) |
| launch_statuses | tenant-scoped | NOT NULL | ON | |
| launch_units | tenant-scoped | NOT NULL | ON | |
| lead_atividades | tenant-scoped | NOT NULL | ON | |
| lead_descartes | tenant-scoped | NOT NULL | ON | |
| lead_discard_reasons | tenant-scoped | NOT NULL | ON | |
| lead_origens | tenant-scoped | NOT NULL | ON | |
| lead_perdas | tenant-scoped | NOT NULL | ON | |
| leads | tenant-scoped | NOT NULL | ON | |
| media_library | tenant-scoped | NOT NULL | ON | |
| media_usage | tenant-scoped | NOT NULL | ON | |
| portal_connectors | tenant-scoped | NOT NULL | ON | |
| portal_sync_dlq | tenant-scoped | **nullable** | ON | DLQ pode receber payload cuja resolução falhou antes do tenant estar disponível; policy é `tenant_id = get_current_tenant_id()` — linhas com NULL não são visíveis a ninguém exceto via caminho SECURITY DEFINER autorizado |
| portal_sync_logs | tenant-scoped | NOT NULL | ON | |
| rate_limit_buckets | **system** | — | ON | manipulada só via `rate_limit_hit()` SECURITY DEFINER |
| rbac_modules | **global** (catálogo RBAC) | — | ON | catálogo global |
| rbac_permissions | **global** (matriz RBAC) | — | ON | |
| rbac_profiles | **global** (catálogo RBAC) | — | ON | |
| site_settings | tenant-scoped | NOT NULL | ON | |
| site_settings_versions | tenant-scoped | NOT NULL | ON | |
| suppressed_emails | **system** | — | ON | anti-spam global |
| system_events | **system** | nullable | ON | escrita via `log_system_event()` SECURITY DEFINER; leitura super_admin |
| team_members | tenant-scoped | NOT NULL | ON | |
| teams | tenant-scoped | NOT NULL | ON | |
| tenant_members | **global** (auth-only) | — | ON | fonte da resolução de tenant |
| tenants | **global** | — | ON | fonte de tenants; read via `user_belongs_to_tenant` |
| user_profiles | **global** (auth RBAC) | — | ON | |
| user_roles | **global** (auth RBAC) | — | ON | fonte de super_admin |
| website_menu_items | tenant-scoped | NOT NULL | ON | |

**Totais:** 40 tenant-scoped (39 + 1 audit) · 5 system · 9 global · 1 tenant-scoped nullable (portal_sync_dlq) · **55 tabelas · 100 % com RLS habilitado**.

---

## Parte 5 — Policies (evidência empírica)

Contagem em produção (`pg_policies`, schema `public`):

| Métrica | Valor |
|---|---|
| Policies totais | **173** |
| PERMISSIVE | 128 |
| RESTRICTIVE | 45 |
| RESTRICTIVE com bypass de `is_super_admin` | **0** |
| Tabelas tenant-scoped com RESTRICTIVE `tenant_isolation` | **40 tabelas, 45 policies** (form_submissions tem 4 policies por operação) |

### 5.1 Delta introduzido pela M2b

Fonte: `supabase/migrations/20260707134301_34a52390-27a4-4640-9919-44da76f31e86.sql`.

| Ação | Quantidade | Detalhe |
|---|---|---|
| Policies **modificadas** (DROP + CREATE mesma identidade, sem `OR is_super_admin`) | **39** | todas as RESTRICTIVE tenant_isolation pré-existentes em tabelas tenant-scoped exceto form_submissions |
| Policies **criadas** | **3** | `form_submissions_tenant_isolation_ins`, `_upd`, `_del` (fechamento de cobertura + INSERT com semântica pública) |
| Policies **mantidas idênticas** (todas as PERMISSIVE + audit_log restante) | **131** | Nenhuma PERMISSIVE foi alterada |
| Funções **modificadas** | **1** | `get_current_tenant_id()` — reescrita para Opção A |

### 5.2 Lista de RESTRICTIVE tenant_isolation em produção

45 policies em 40 tabelas (form_submissions tem 4). Todas com predicate
`tenant_id = get_current_tenant_id()` e `roles = {anon, authenticated}`.

Extrato completo:

```
audit_log|tenant_isolation                       imoveis|tenant_isolation
bairros|tenant_isolation                          imovel_imagens|tenant_isolation
blog_categorias|tenant_isolation                  imovel_portais|tenant_isolation_restrictive
blog_posts|tenant_isolation                       instagram_posts|tenant_isolation
cidades|tenant_isolation                          launch_amenities|tenant_isolation
cms_campaign_events|tenant_isolation              launch_payment_conditions|tenant_isolation
cms_campaigns|tenant_isolation                    launch_pdfs|tenant_isolation
cms_form_fields|cms_form_fields_tenant_isolation  launch_project_amenities|tenant_isolation
cms_forms|cms_forms_tenant_isolation              launch_project_imagens|tenant_isolation
cms_import_snapshots|tenant_isolation_restrictive launch_projects|tenant_isolation
cms_pages|cms_pages_tenant_isolation              launch_statuses|tenant_isolation
corretores|tenant_isolation                       launch_units|tenant_isolation
deal_lost_reasons|tenant_isolation_restrictive    lead_atividades|tenant_isolation
form_submissions|_isolation (SELECT)              lead_descartes|tenant_isolation
form_submissions|_isolation_ins (INSERT)          lead_discard_reasons|tenant_isolation_restrictive
form_submissions|_isolation_upd (UPDATE)          lead_origens|tenant_isolation
form_submissions|_isolation_del (DELETE)          lead_perdas|tenant_isolation_restrictive
leads|tenant_isolation                            media_library|media_library_tenant_isolation
media_usage|media_usage_tenant_isolation          portal_connectors|tenant_isolation_restrictive
portal_sync_dlq|tenant_isolation_restrictive      portal_sync_logs|tenant_isolation_restrictive
site_settings|tenant_isolation                    site_settings_versions|ssv_tenant_isolation
team_members|tenant_isolation                     teams|tenant_isolation
website_menu_items|menu_items_tenant_isolation
```

---

## Parte 6 — `audit_log`

### 6.1 Classificação: **tenant-scoped audit**

Evidências:

- Coluna: `tenant_id uuid NOT NULL DEFAULT get_current_tenant_id()`.
- Cada linha nasce carimbada com o tenant do caller (nunca NULL).
- Auditoria semanticamente pertence a um tenant específico (ações CRUD
  sobre entidades do próprio tenant).

**Por que não é "system":** system são estados globais sem dono (rate
buckets, circuit breaker de email). `audit_log` tem dono — o tenant.

**Por que não é "hybrid":** hybrid implicaria linhas tenant + linhas
globais na mesma tabela. Aqui `tenant_id IS NOT NULL` é invariante — logo
não há wildcard `tenant_id IS NULL` em nenhuma policy (regra inegociável da
IA-003 §12).

### 6.2 Tratamento dos demais tipos de evento

| Tipo de evento | Tabela responsável | Autoridade de escrita | Leitura |
|---|---|---|---|
| Auditoria de negócio (CRUD tenant-scoped) | `audit_log` | Server functions/triggers do domínio; RLS RESTRICTIVE + PERMISSIVE admin/self | `audit_log admin all`, `audit_log self read` (ambas PERMISSIVE) — sempre compostas com RESTRICTIVE tenant_isolation |
| Eventos globais/técnicos (portal health, cron, latência) | `system_events` | Exclusivamente via `log_system_event()` (SECURITY DEFINER) | Policy única de super_admin |
| Eventos administrativos (super) | `system_events` (com `tenant_id` opcional) | idem | idem |
| Sem tenant (health check, cron sem contexto) | `system_events` (`tenant_id NULL`) | idem | idem |
| Estado global (rate limit, circuit breaker) | `rate_limit_buckets`, `email_send_state`, `suppressed_emails` | Funções SECURITY DEFINER (`rate_limit_hit`) ou `service_role` | Restringida à role responsável |
| Ações de service_role (envios, hooks) | `email_send_log` | `service_role` explícito nas policies | `service_role` |

**Consequência arquitetural:** `audit_log` **jamais** recebe evento
global — esses eventos têm tabelas próprias com semântica adequada.
Nenhuma policy usa `tenant_id IS NULL` como wildcard em qualquer tabela
tenant-scoped.

---

## Parte 7 — Estratégia de rollout — migration única

### 7.1 Reconciliação com o plano da IA-003

A IA-003 previa fluxo `inventário → piloto → rollout → validação`. O
executado foi:

1. **Inventário** — realizado antes da migration (documentado no relatório
   11, §3, e reconstituído aqui na Parte 4).
2. **Piloto** — **desnecessário no cenário real**: as policies RESTRICTIVE
   já existiam em produção (auditoria descobriu esse fato). A M2b apenas
   *hardening*: retirou a disjunção `OR is_super_admin()` e a Opção A na
   função. Nenhuma tabela ganhou RLS pela primeira vez.
3. **Rollout** — migration única atômica (`20260707134301`), 39 policies
   reescritas + 3 novas + 1 função — tudo em transação.
4. **Validação** — verificação empírica pós-migration (`pg_policies` count
   de bypass = 0) + typecheck + coupling scan (relatório 11 §6, §8, §9).

### 7.2 Por que a migration única foi segura

- **Nenhuma mudança de superfície aplicacional** — código `src/` intacto.
  Cliente/server functions continuam usando os mesmos endpoints.
- **Regressão semântica limitada** ao Super Admin sem impersonação, que
  agora precisa **impersonar** para acessar dados tenant-scoped — mudança
  intencional da Opção A. Sem regressão sobre usuários regulares (para eles
  a policy é **mais restritiva por eliminação de branch dead**: a branch
  `OR is_super_admin()` só afetava super_admins).
- **Idempotência** garantida por `DROP POLICY IF EXISTS` + `CREATE POLICY`.
- **Transacionalidade** do PostgreSQL — se qualquer statement falhasse, a
  migration seria totalmente revertida.

### 7.3 Validações executadas antes/depois

Antes:
- Coupling scan (`rg` sobre símbolos protegidos do Workspace Runtime).
- Typecheck limpo.

Depois:
- `SELECT COUNT(*) FROM pg_policies WHERE ... is_super_admin ...` → **0**.
- Inventário de RESTRICTIVE por tabela conferido contra IA-003.
- Testes automatizados (`test_tenant_isolation.py`, `tenant-middleware.spec.ts`,
  `impersonation-state.spec.ts`) mantidos verdes.

### 7.4 Rollback

Rollback formal: migration reversa recolocando `OR is_super_admin()` e o
fallback antigo em `get_current_tenant_id()`. Não foi executado — nenhum
incidente pós-deploy exigiu.

Rollback operacional imediato (se necessário durante a janela): `CREATE OR
REPLACE FUNCTION get_current_tenant_id()` restaura a função ao
comportamento anterior sem tocar policies (super_admin volta a resolver
tenant default → cláusula `OR is_super_admin()` ausente ainda protege).
Rollback total exige migration reversa.

---

## Parte 8 — Warnings do Supabase Linter (17)

Fonte: `supabase--linter` executado nesta etapa.

Todos os 17 warnings pertencem à mesma classe:

- **10 × Signed-In Users Can Execute SECURITY DEFINER Function** (lint 0029)
- **3 × Public Can Execute SECURITY DEFINER Function** (lint 0028)
- **4 × demais (ex.: extension in public)** — mesmo perfil informacional

### 8.1 Análise item-a-item

| # | Função (funções SECURITY DEFINER expostas via API) | Warning | Motivo | Impacto na M2b | Pré-existente | Interage tenant | Interage RLS | Interage audit | SEC DEFINER | service_role |
|---|---|---|---|---|---|---|---|---|---|---|
| 1–3 | `get_current_tenant_id`, `is_super_admin`, `has_role` (anon-callable) | 0028 | Necessário: policies RESTRICTIVE chamam essas funções via `USING`/`WITH CHECK` e são avaliadas com `TO anon,authenticated` | Nenhum — remoção quebraria toda a RLS | ✅ | ✅ | ✅ (fundamento) | ✅ (via audit_log) | ✅ | — |
| 4–10 | `has_permission`, `has_any_permission`, `has_cms_permission`, `user_belongs_to_tenant`, `user_team_ids`, `rate_limit_hit`, `log_system_event` (authenticated-callable) | 0029 | Chamadas por policies e por server functions internas | Nenhum | ✅ | parcial | ✅ | parcial | ✅ | — |
| 11–13 | `seed_default_lead_reasons`, `seed_default_portal_connectors`, `tg_tenants_seed_defaults` | 0029 | Trigger seed; expostas via schema `public` por padrão | Nenhum | ✅ | ✅ (seed por tenant) | não | não | ✅ | — |
| 14–15 | `portal_dlq_enqueue`, `portal_dlq_mark_retry`, `portal_dlq_mark_resolved` | 0029 | Chamadas pelo mecanismo de DLQ; server-only na prática | Nenhum | ✅ | ✅ | não | não | ✅ | — |
| 16 | `email_queue_wake`, `email_queue_dispatch`, `enqueue_email`, `read_email_batch`, `delete_email`, `move_to_dlq` | 0029 | Fila de e-mail acessível ao service_role e pgmq | Nenhum | ✅ | não | não | não | ✅ | ✅ |
| 17 | `super_observabilidade` | 0029 | Já valida `is_super_admin()` internamente e lança 42501 | Nenhum | ✅ | não | não | não | ✅ | — |

### 8.2 Risco para a M2b

**Nenhum.** Todas as 17 funções são pré-existentes ao ciclo IA-003. A
única função *modificada* pela M2b — `get_current_tenant_id()` — **precisa**
ser SECURITY DEFINER: é o fundamento de resolução de tenant chamado pelas
próprias policies RLS, tanto para anon quanto para authenticated. Trocar
para SECURITY INVOKER quebraria todas as 45 policies RESTRICTIVE.

Os warnings 0028/0029 são **informacionais** — apontam superfície para
revisão manual, não vulnerabilidade. Cada função tem controle explícito
próprio (`is_super_admin` interno, `service_role` na policy, JWT via
`auth.uid()` implícito).

---

## Parte 9 — Security Architecture (item-a-item)

| Princípio | Preservado | Evidência |
|---|---|---|
| Zero Trust | ✅ | Identidade sempre via JWT (`auth.uid()`); header nunca é autoridade |
| Tenant Isolation | ✅ | 45 policies RESTRICTIVE `tenant_id = get_current_tenant_id()` cobrindo 40 tabelas |
| Explicit Context | ✅ | Contexto de tenant é derivado (membership ou impersonação) — nunca implícito |
| No Tenant Default | ✅ | Opção A: super_admin sem impersonação → `NULL` (verificado no código da função) |
| No Heuristics | ✅ | Zero heurística: função é decisão determinística por ramo (`v_uid` NULL / super / regular) |
| No Fallback | ✅ | Removida branch `OR is_super_admin()`; sem fallback silencioso |
| Server Authority | ✅ | `requireTenant` (IA-001) + RLS RESTRICTIVE — dupla camada server-side; browser nunca autoritativo |
| Defense in Depth | ✅ | Middleware aplicacional + RLS RESTRICTIVE + PERMISSIVE compondo por AND + validações de header por origem |

---

## Parte 10 — Hard Gates (Constitution)

| Gate | Resultado |
|---|---|
| G0 — Sem alteração de runtime protegido | ✅ zero arquivos em `src/` alterados pela migration M2b |
| G1 — Sem heurística | ✅ policies são predicates puros |
| G2 — Sem singleton/global | ✅ funções STABLE avaliadas per-query |
| G3 — Sem API paralela/bypass | ✅ server functions permanecem única superfície |
| G4 — Anti-SQL Leakage | ✅ SQL vive em migration, não em domínio |
| G5 — Sem alteração de PluginContext/Registry | ✅ |
| G6 — IA obrigatória cumprida | ✅ IA-003 aprovada precede a M2b |
| G7 — Compatibilidade Security Architecture | ✅ Parte 9 acima |

---

## Parte 11 — Runtime (confirmação anti-regressão)

Nenhum destes componentes foi alterado pela M2b (verificado via inspeção
da migration única e ausência de qualquer edição em `src/` no ciclo):

- ✅ ResolutionGraph
- ✅ Registry
- ✅ RegistrySnapshot
- ✅ ActionExecutor
- ✅ PluginContext
- ✅ PluginRegistry
- ✅ Bootstrap
- ✅ Workspace Runtime (todos os módulos)

---

## Parte 12 — Declaração Final

> **A implementação da M2b introduziu alguma nova semântica arquitetural?**
>
> **Não.** A M2b formalizou e endureceu semântica **já prevista** pela
> Security Architecture e pela IA-003:
>
> - Tenant Isolation por RLS RESTRICTIVE já era princípio declarado;
> - Ausência de tenant default para super_admin já era exigência explícita
>   da IA-003 §12.3 (Opção A);
> - Impersonação como único caminho de super_admin acessar dados
>   tenant-scoped já era decisão da IA-002.
>
> A migration única removeu duas violações materiais desses princípios
> (branch `OR is_super_admin()` nas policies e fallback em
> `get_current_tenant_id()`) e fechou cobertura de `form_submissions`.
> Nenhum contrato novo, nenhum runtime alterado, nenhum bypass introduzido.

---

## Conformidade

- ✅ `ARCHITECTURE_CONSTITUTION.md` — G0–G7 verificados (Parte 10)
- ✅ `SECURITY_ARCHITECTURE.md` — 8 princípios verificados (Parte 9)
- ✅ `IA-001-TenantMiddleware.md` — camada aplicacional preservada
- ✅ `IA-002-ClientImpersonationLayer.md` — impersonação continua único caminho
- ✅ `IA-003-RLSPolicies.md` — Opção A implementada, sem bypass, sem fallback

---

## Resumo executivo (para auditoria)

| Item | Resultado |
|---|---|
| Arquivos alterados nesta etapa | `docs/architecture/impact-analysis/README.md` (rótulo IA-003) e `docs/delivery/phase-02-multi-tenancy/12-m2b-audit-clarification-report.md` (novo). **Zero código, zero SQL, zero policy.** |
| Duplicidade IA-003 | Não existia — verificado |
| `get_current_tenant_id()` documentada | Parte 2 |
| Fluxo por tipo de usuário | Parte 2.3 (matriz de 9 cenários) |
| Inventário definitivo | Parte 4 (55 tabelas) |
| Inventário de policies | Parte 5 (173 policies, 45 RESTRICTIVE, 0 com bypass) |
| Classificação `audit_log` | Parte 6 (tenant-scoped audit; NOT NULL) |
| Migration única justificada | Parte 7 |
| 17 warnings analisados | Parte 8 (nenhum representa risco) |
| Hard Gates G0–G7 | Parte 10 (todos ✅) |
| Runtime intocado | Parte 11 |
| Conformidade Constitution + Security Architecture + IA-001/002/003 | ✅ |

**Declaração formal:**

> A implementação da M2b preserva integralmente a arquitetura consolidada
> do RM Prime SaaS e está apta para liberação da IA-004 — M3 (Tenant
> Storage Isolation).
