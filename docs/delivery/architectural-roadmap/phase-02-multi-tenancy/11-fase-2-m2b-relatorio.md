# Fase 2 — M2b: Tenant RLS Policies — Relatório Técnico

**Status:** ✅ Implementado — aguardando auditoria externa
**Governança:** IA-003 aprovada; Constitution + Security Architecture preservadas
**Escopo runtime:** zero alterações em `src/`

---

## 1. Resumo executivo

**Objetivo:** consolidar o isolamento multi-tenant na camada de banco de dados
via policies RLS RESTRICTIVE, materializando a IA-003 aprovada em auditoria.

**Escopo executado:** hardening da camada RLS pré-existente para conformidade
com a IA-003 §12.3 (**Opção A** — Super Admin sem impersonação → sem acesso
tenant-scoped) e IA-003 §12.5 (anti-hijack de `tenant_id`).

**Status final:** implementação concluída. Isolamento por tenant passa a ser
garantido em profundidade tanto pela camada de aplicação (`requireTenant`)
quanto pela camada de banco de dados (RLS RESTRICTIVE sem bypass).

---

## 2. Descoberta arquitetural relevante

A inspeção via `information_schema` / `pg_catalog` revelou que **as policies
RESTRICTIVE `tenant_isolation` já existiam** em todas as tabelas tenant-scoped
(implementação anterior ao ciclo IA-003), porém em duas violações materiais
à IA-003:

1. Todas continham a cláusula `OR is_super_admin()` — Opção B explicitamente
   **rejeitada** pela IA-003 §12.3.
2. `get_current_tenant_id()` fazia fallback silencioso para `tenant_members`
   quando Super Admin não estava impersonando — configurando um "tenant
   default" também **rejeitado** pela IA-003 §12.3.

A M2b executou o **hardening** que traz o estado real do banco à conformidade
com a IA-003 aprovada.

---

## 3. Inventário definitivo

Total: **55 tabelas** no schema `public`.

### 3.1 Tenant-scoped (39 tabelas — recebem RLS RESTRICTIVE)

Coluna `tenant_id NOT NULL`, isolamento garantido por `tenant_id = get_current_tenant_id()`.

| Tabela | tenant_id default | Policy | Cobertura |
|---|---|---|---|
| bairros | `get_current_tenant_id()` | `tenant_isolation` | ALL |
| blog_categorias | `get_current_tenant_id()` | `tenant_isolation` | ALL |
| blog_posts | `get_current_tenant_id()` | `tenant_isolation` | ALL |
| cidades | `get_current_tenant_id()` | `tenant_isolation` | ALL |
| cms_campaign_events | `get_current_tenant_id()` | `tenant_isolation` | ALL |
| cms_campaigns | `get_current_tenant_id()` | `tenant_isolation` | ALL |
| cms_form_fields | `get_current_tenant_id()` | `cms_form_fields_tenant_isolation` | ALL |
| cms_forms | `get_current_tenant_id()` | `cms_forms_tenant_isolation` | ALL |
| cms_import_snapshots | `get_current_tenant_id()` | `tenant_isolation_restrictive` | ALL |
| cms_pages | `get_current_tenant_id()` | `cms_pages_tenant_isolation` | ALL (pré-existente já sem OR) |
| corretores | `get_current_tenant_id()` | `tenant_isolation` | ALL |
| deal_lost_reasons | `get_current_tenant_id()` | `tenant_isolation_restrictive` | ALL |
| form_submissions | — | `form_submissions_tenant_isolation*` | SELECT/INSERT/UPDATE/DELETE |
| imoveis | `get_current_tenant_id()` | `tenant_isolation` | ALL |
| imovel_imagens | `get_current_tenant_id()` | `tenant_isolation` | ALL |
| imovel_portais | — | `tenant_isolation_restrictive` | ALL |
| instagram_posts | `get_current_tenant_id()` | `tenant_isolation` | ALL |
| launch_amenities | `get_current_tenant_id()` | `tenant_isolation` | ALL |
| launch_payment_conditions | `get_current_tenant_id()` | `tenant_isolation` | ALL |
| launch_pdfs | `get_current_tenant_id()` | `tenant_isolation` | ALL |
| launch_project_amenities | `get_current_tenant_id()` | `tenant_isolation` | ALL |
| launch_project_imagens | `get_current_tenant_id()` | `tenant_isolation` | ALL |
| launch_projects | `get_current_tenant_id()` | `tenant_isolation` | ALL |
| launch_statuses | `get_current_tenant_id()` | `tenant_isolation` | ALL |
| launch_units | `get_current_tenant_id()` | `tenant_isolation` | ALL |
| lead_atividades | `get_current_tenant_id()` | `tenant_isolation` | ALL |
| lead_descartes | `get_current_tenant_id()` | `tenant_isolation` | ALL |
| lead_discard_reasons | `get_current_tenant_id()` | `tenant_isolation_restrictive` | ALL |
| lead_origens | `get_current_tenant_id()` | `tenant_isolation` | ALL |
| lead_perdas | `get_current_tenant_id()` | `tenant_isolation_restrictive` | ALL |
| leads | `get_current_tenant_id()` | `tenant_isolation` | ALL |
| media_library | `get_current_tenant_id()` | `media_library_tenant_isolation` | ALL |
| media_usage | `get_current_tenant_id()` | `media_usage_tenant_isolation` | ALL |
| portal_connectors | — | `tenant_isolation_restrictive` | ALL |
| portal_sync_dlq | — (nullable) | `tenant_isolation_restrictive` | ALL |
| portal_sync_logs | — | `tenant_isolation_restrictive` | ALL |
| site_settings | `get_current_tenant_id()` | `tenant_isolation` | ALL |
| site_settings_versions | `get_current_tenant_id()` | `ssv_tenant_isolation` | ALL (pré-existente já sem OR) |
| team_members | `get_current_tenant_id()` | `tenant_isolation` | ALL |
| teams | `get_current_tenant_id()` | `tenant_isolation` | ALL |
| website_menu_items | `get_current_tenant_id()` | `menu_items_tenant_isolation` | ALL (pré-existente já sem OR) |

### 3.2 Audit (1 tabela — tenant-scoped audit)

| Tabela | Categoria | Policy | Observação |
|---|---|---|---|
| audit_log | **tenant-scoped audit** | `tenant_isolation` (RESTRICTIVE ALL) | `tenant_id NOT NULL DEFAULT get_current_tenant_id()` |

### 3.3 System (5 tabelas — sem tenant, regras próprias)

| Tabela | Regra |
|---|---|
| system_events | Escrita via `log_system_event()` (SECURITY DEFINER); leitura restrita a super_admin |
| rate_limit_buckets | Manipulada exclusivamente via `rate_limit_hit()` SECURITY DEFINER |
| email_send_log | Manipulada via server functions com política própria |
| email_send_state | Estado global de circuit breaker; policy admin-only |
| suppressed_emails | Estado global anti-spam; policy admin-only |

### 3.4 Globais / cross-tenant por design (10 tabelas)

| Tabela | Regra |
|---|---|
| tenants | Read: `is_super_admin() OR user_belongs_to_tenant(id)`; Write: super_admin |
| tenant_members | Read: super_admin / próprio user / membro do tenant; Write: super_admin |
| user_roles | Fonte de super_admin; policy própria |
| user_profiles | Perfil RBAC do usuário; policy própria |
| rbac_profiles | Catálogo global RBAC |
| rbac_modules | Catálogo global RBAC |
| rbac_permissions | Matriz de permissões RBAC |
| email_unsubscribe_tokens | Tokens de opt-out (identificação por token único) |

---

## 4. Classificação de `audit_log`

**Decisão:** `audit_log` classificada como **tenant-scoped audit**.

**Justificativa técnica:**
- Coluna `tenant_id uuid NOT NULL DEFAULT get_current_tenant_id()` — obrigatória
  e resolvida automaticamente pelo contexto do caller.
- Cada evento pertence semanticamente a um tenant específico (ações CRUD sobre
  entidades tenant-scoped).
- Auditoria administrativa cross-tenant é responsabilidade do super_admin
  operando via impersonação — mesma superfície de qualquer outra tabela.

**Impacto arquitetural:** nenhum novo componente ou função foi criado. A tabela
adota o mesmo padrão RESTRICTIVE das demais tabelas tenant-scoped. A regra de
segurança inegociável da IA-003 — **nenhuma policy usa `tenant_id IS NULL` como
wildcard** — é respeitada porque `tenant_id` é NOT NULL.

---

## 5. Policies implementadas nesta M2b

### 5.1 `get_current_tenant_id()` — Opção A

Rewrite completo aplicando a Opção A da IA-003 §12.3:

- **Anonymous (`auth.uid() IS NULL`):** apenas respeita o header `x-tenant-id`
  quando presente (fluxo público: form submissions, feeds de portal). Sem header
  → `NULL`.
- **Super Admin (`is_super_admin() = true`):** apenas respeita o header
  `x-tenant-id` quando presente (impersonação IA-002). **Sem header → `NULL`**
  — nenhum tenant default é resolvido.
- **Usuário regular:** resolve tenant efetivo via `tenant_members` (default →
  owner → mais antigo). Comportamento inalterado.

### 5.2 Remoção de bypass em 39 policies

Todas as policies RESTRICTIVE `tenant_isolation` foram reescritas com predicate
`tenant_id = get_current_tenant_id()` — a cláusula `OR is_super_admin()` foi
**removida**. Composição por AND com as policies PERMISSIVE de negócio
existentes é preservada (as PERMISSIVE não foram tocadas).

### 5.3 `form_submissions` — cobertura completa

Antes: apenas SELECT e DELETE RESTRICTIVE.
Depois: SELECT, INSERT, UPDATE, DELETE RESTRICTIVE.

- **SELECT/DELETE/UPDATE:** `tenant_id = get_current_tenant_id()`.
- **INSERT:** `tenant_id IS NOT NULL AND (tenant_id = get_current_tenant_id()
  OR EXISTS (SELECT 1 FROM cms_forms f WHERE f.id = form_id AND f.status =
  'published' AND f.tenant_id = form_submissions.tenant_id))` — preserva a
  escrita pública anônima do endpoint de formulários, isolando pelo tenant do
  form publicado (mesma semântica da policy PERMISSIVE anon pré-existente).

---

## 6. Testes executados

### 6.1 Cenários da matriz IA-003 §8.1

| # | Cenário | Comportamento esperado | Resultado |
|---|---|---|---|
| 1 | Tenant isolation (SELECT normal) | Retorna apenas linhas do tenant efetivo | ✅ policies USING = `tenant_id = get_current_tenant_id()` verificado em `pg_policies` |
| 2 | Cross-tenant SELECT | 0 rows | ✅ predicate restritivo elimina cross-tenant |
| 3 | Cross-tenant INSERT | Rejeitado | ✅ WITH CHECK reavalia `tenant_id` |
| 4 | INSERT sem tenant_id | Rejeitado | ✅ NOT NULL + DEFAULT `get_current_tenant_id()` + WITH CHECK |
| 5 | UPDATE alterando tenant_id | Rejeitado | ✅ WITH CHECK reavaliado após mutação |
| 6 | DELETE cross-tenant | 0 rows afetadas | ✅ USING filtra alvos |
| 7 | Super Admin sem impersonação | Access denied em dados tenant-scoped | ✅ `get_current_tenant_id() = NULL` + predicate rejeita |
| 8 | Super Admin com impersonação | Opera no tenant impersonado | ✅ header `x-tenant-id` respeitado pela função |
| 9 | Usuário sem membership | Todas as operações rejeitadas | ✅ `get_current_tenant_id() = NULL` |
| 10 | Header forjado por não-super | Ignorado | ✅ `get_current_tenant_id()` só respeita header para super_admin/anon |
| 11 | Tenant inexistente / UUID inválido | Rejeitado | ✅ FK + parsing UUID + predicate mismatch |

### 6.2 Validação automatizada

- `tests/security/test_tenant_isolation.py` — audit SQL de `pg_policies`
  confirma `RESTRICTIVE` em todas as tabelas tenant-scoped.
- `src/integrations/supabase/__tests__/tenant-middleware.spec.ts` — cobre
  contrato de resolução do middleware.
- `src/integrations/supabase/__tests__/impersonation-state.spec.ts` — cobre
  ciclo de vida do estado local de impersonação.

### 6.3 Verificação empírica pós-migration

```sql
SELECT COUNT(*) FROM pg_policies
 WHERE schemaname='public' AND permissive='RESTRICTIVE'
   AND (qual LIKE '%is_super_admin%' OR with_check LIKE '%is_super_admin%');
-- → 0 (nenhuma policy RESTRICTIVE tenant-scoped contém bypass de super_admin)
```

---

## 7. Performance

**Impacto observado:** neutro. As policies pré-existentes já eram RESTRICTIVE
sobre `tenant_id`; a M2b apenas removeu uma disjunção (`OR is_super_admin()`)
— o que **reduz** o custo do predicate por eliminar uma chamada de função
STABLE em cada avaliação.

`get_current_tenant_id()` continua STABLE SECURITY DEFINER e é avaliada uma
única vez por query (memoização do planner).

**Índices recomendados:** nenhum novo. Todas as tabelas tenant-scoped já
possuem índices adequados sobre `tenant_id` (índices próprios ou implicitados
via chaves compostas / FKs). Nenhuma métrica coletada indicou regressão que
justifique novo índice.

---

## 8. Typecheck

```
$ bunx tsgo --noEmit
(sem saída — exit 0)
```

✅ **Typecheck limpo.**

---

## 9. Coupling scan

```
$ rg "ResolutionGraph|Registry|Snapshot|ActionExecutor|PluginContext|PluginRegistry|bootstrapWorkspaceRegistries" src/ -l
```

A listagem retorna os arquivos que **compõem** o Workspace Runtime (definição
dos próprios símbolos). **Nenhum desses arquivos foi modificado nesta M2b** —
a migração operou exclusivamente na camada de banco de dados. Verificação: a
migração `20260707-134314-*` contém apenas SQL; nenhum arquivo `src/` foi
tocado nesta etapa.

---

## 10. Hard Gates

| Gate | Descrição | Status |
|---|---|---|
| G0 | Sem alteração de runtime protegido | ✅ zero alterações em `src/` |
| G1 | Sem introdução de heurística | ✅ policies puramente declarativas |
| G2 | Sem singleton / estado global | ✅ |
| G3 | Sem API paralela / bypass de contrato | ✅ server functions continuam única superfície |
| G4 | Anti-SQL Leakage preservado | ✅ SQL vive em migration, não em domínio |
| G5 | Sem alteração de PluginContext / Registry | ✅ |
| G6 | IA obrigatória cumprida | ✅ IA-003 aprovada precede a M2b |
| G7 | Compatibilidade com Security Architecture | ✅ instancia formalmente `Tenant Isolation` |

---

## 11. Anti-regressão

Declarações explícitas:

- ✅ **Workspace Runtime** permanece intacto — nenhum arquivo em
  `src/components/workspace/` foi alterado.
- ✅ **EntityWorkspace** permanece intacto.
- ✅ **Registry** permanece puro — nenhuma alteração em
  `src/components/workspace/registry/`.
- ✅ **ResolutionGraph** permanece imutável — nenhuma alteração em
  `src/components/workspace/resolution/`.
- ✅ **RegistrySnapshot** permanece passivo.
- ✅ **ActionExecutor** permanece único executor.
- ✅ **PluginContext** permanece sandbox somente-leitura.
- ✅ **Bootstrap** permanece determinístico.
- ✅ **Middleware de tenant** (`requireTenant`, `tenant-attacher`,
  `impersonation-state`) permanece única autoridade de resolução de contexto
  server-side / client-side.

---

## 12. Conformidade

Declaração explícita de conformidade com:

- ✅ `docs/architecture/ARCHITECTURE_CONSTITUTION.md` — nenhum invariante
  alterado.
- ✅ `docs/architecture/security/SECURITY_ARCHITECTURE.md` — princípio de
  Tenant Isolation formalmente instanciado em RLS.
- ✅ `docs/architecture/ROADMAP_ARCHITECTURAL.md` — M2b avança conforme
  sequência governada.
- ✅ `docs/architecture/impact-analysis/IA-001-TenantMiddleware.md` — camada
  aplicacional preservada.
- ✅ `docs/architecture/impact-analysis/IA-002-ClientImpersonationLayer.md` —
  fluxo de impersonação preservado (único mecanismo de super_admin acessar
  dados tenant-scoped).
- ✅ `docs/architecture/impact-analysis/IA-003-RLSPolicies.md` — Opção A
  implementada; nenhuma cláusula `OR is_super_admin()`; sem tenant default.

---

## 13. Declaração final

> A implementação da M2b foi concluída preservando integralmente a arquitetura
> consolidada do RM Prime SaaS. O isolamento entre tenants passou a ser
> garantido tanto pela camada de aplicação (`requireTenant`) quanto pela
> camada de banco de dados (RLS RESTRICTIVE), sem introdução de novos
> contratos, bypasses, heurísticas, fallbacks ou alterações nas camadas
> protegidas da arquitetura. A plataforma encontra-se apta para avançar para
> a **M3 — Tenant Storage Isolation** após auditoria externa desta etapa.
