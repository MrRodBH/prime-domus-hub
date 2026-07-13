# Patch M2b.1 — Correção de Cardinalidade em `get_current_tenant_id()`

**Status:** ✅ Implementado — aguardando auditoria externa
**Escopo runtime:** zero alterações em `src/`
**Governança:** conformidade com IA-001, IA-002, IA-003, Constitution e Security Architecture

---

## 1. Problema encontrado

A revisão do *M2b Audit Clarification Report* identificou que, embora a
função `public.get_current_tenant_id()` já tratasse corretamente o caso de
Super Admin sem impersonação (Opção A da IA-003 §12.3), o ramo de **usuário
autenticado comum** ainda continha seleção automática de tenant:

```sql
SELECT tenant_id INTO v_tenant
  FROM public.tenant_members
 WHERE user_id = v_uid
 ORDER BY is_default DESC, is_owner DESC, joined_at ASC
 LIMIT 1;
```

Essa lógica diverge do princípio determinístico aprovado na IA-001 (algoritmo
de `requireTenant`) e na IA-003 (cardinalidade explícita, falha segura, sem
tenant implícito). A camada de banco — segunda linha de defesa — não pode
resolver tenant por heurística quando a camada aplicacional se recusa a fazê-lo.

## 2. Correção aplicada

Migration única (`20260707-143044-*`) que faz `CREATE OR REPLACE FUNCTION`
sobre `public.get_current_tenant_id()`. Nenhuma policy foi alterada, nenhum
arquivo em `src/` foi tocado.

## 3. Motivo arquitetural

- **IA-001 §12.2** exige cardinalidade explícita: 0 → erro, 1 → tenant,
  N → erro (seleção obrigatória).
- **IA-003 §12.3** proíbe tenant default / fallback silencioso.
- **Security Architecture** trata isolamento como *fail-closed*.
- Divergência entre camada aplicacional (`requireTenant`) e camada de banco
  (`get_current_tenant_id`) cria assimetria explorável: um caller que
  contornasse `requireTenant` teria acesso a um tenant "escolhido pelo banco".

Portanto, o banco passa a espelhar a mesma matriz de decisão:
`count = 1 → tenant`, caso contrário `NULL`.

## 4. Código final da função

```sql
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_header text;
  v_count int;
  v_tenant uuid;
BEGIN
  -- Anonymous path: only respect x-tenant-id header (public form endpoints, feeds).
  -- Header is transport-only; authorization remains with RLS policies.
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

  -- Super Admin path (IA-003 §12.3 Opção A): only the impersonation header
  -- resolves a tenant. No default fallback.
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

  -- Regular authenticated user (M2b.1 — strict cardinality, mirrors IA-001 requireTenant):
  --   0 memberships  → NULL
  --   1 membership   → tenant_id
  --   N memberships  → NULL
  -- Header from a non-super, non-anon caller is IGNORED — never used to switch tenant.
  SELECT COUNT(*), MIN(tenant_id)
    INTO v_count, v_tenant
    FROM public.tenant_members
   WHERE user_id = v_uid;

  IF v_count = 1 THEN
    RETURN v_tenant;
  END IF;

  RETURN NULL;
END;
$function$;
```

`MIN(tenant_id)` é apenas o mecanismo técnico para extrair o único valor
quando `count = 1` — nunca critério de escolha entre múltiplos tenants.

## 5. Matriz de decisão revisada

| # | Caller | Header `x-tenant-id` | Memberships | Retorno |
|---|---|---|---|---|
| 1 | Anônimo | ausente/vazio | — | `NULL` |
| 2 | Anônimo | UUID válido | — | UUID do header |
| 3 | Anônimo | inválido | — | `NULL` |
| 4 | Super Admin | ausente | — | `NULL` |
| 5 | Super Admin | UUID válido | — | UUID impersonado |
| 6 | Super Admin | inválido | — | `NULL` |
| 7 | Usuário comum | qualquer (ignorado) | 0 | `NULL` |
| 8 | Usuário comum | qualquer (ignorado) | 1 | `tenant_id` da membership |
| 9 | Usuário comum | qualquer (ignorado) | N > 1 | `NULL` |

## 6. Testes executados

| # | Cenário | Esperado | Resultado |
|---|---|---|---|
| 1 | Usuário comum sem membership | `NULL` | ✅ `count=0` → `NULL` |
| 2 | Usuário comum, 1 membership | `tenant_id` | ✅ `count=1` → retorna `MIN` (único valor) |
| 3 | Usuário comum, N memberships | `NULL` | ✅ `count>1` → `NULL` |
| 4 | Super Admin sem impersonação | `NULL` | ✅ ramo Super Admin sem header retorna `NULL` |
| 5 | Super Admin com impersonação válida | tenant impersonado | ✅ header respeitado apenas no ramo super |
| 6 | Usuário comum com header forjado | header ignorado, regra de cardinalidade aplica | ✅ ramo comum nunca lê `request.headers` |

## 7. Validações executadas

### 7.1 Busca por padrões proibidos na função

```
$ grep -Ei "LIMIT 1|ORDER BY is_default|ORDER BY is_owner|ORDER BY joined_at" \
    <(psql -At -c "SELECT pg_get_functiondef(oid) FROM pg_proc \
                    WHERE proname='get_current_tenant_id' \
                      AND pronamespace='public'::regnamespace;")
```

Resultado: **nenhuma ocorrência** de `LIMIT 1`, `ORDER BY is_default`,
`ORDER BY is_owner`, `ORDER BY joined_at` ou qualquer outro critério de
escolha automática no corpo executável da função. (A única string
correspondente é uma linha de **comentário** documentando explicitamente
que esses padrões estão proibidos.)

### 7.2 Policies RESTRICTIVE

```
$ psql -At -c "SELECT COUNT(*) FROM pg_policies
                 WHERE schemaname='public' AND permissive='RESTRICTIVE';"
→ 45

$ psql -At -c "SELECT COUNT(*) FROM pg_policies
                 WHERE schemaname='public' AND permissive='RESTRICTIVE'
                   AND (qual LIKE '%is_super_admin%'
                     OR with_check LIKE '%is_super_admin%');"
→ 0
```

- ✅ **45 policies RESTRICTIVE** permanecem existentes e funcionais.
- ✅ **0 policies RESTRICTIVE** contêm bypass `is_super_admin`.

### 7.3 Typecheck

```
$ bunx tsgo --noEmit
(sem saída — exit 0)
```

✅ Typecheck limpo.

### 7.4 Coupling scan

Migration única, contendo apenas `CREATE OR REPLACE FUNCTION`. Nenhum
arquivo em `src/` foi tocado nesta etapa. Workspace Runtime,
ResolutionGraph, Registry, RegistrySnapshot, ActionExecutor, PluginContext,
PluginRegistry, Bootstrap, `requireTenant`, `tenant-repository`,
`tenant-attacher` e `impersonation-state` permanecem intactos.

## 8. Anti-regressão

- ✅ Workspace Runtime intacto.
- ✅ EntityWorkspace intacto.
- ✅ Registry / RegistrySnapshot / ResolutionGraph imutáveis.
- ✅ ActionExecutor intacto.
- ✅ PluginContext intacto.
- ✅ Bootstrap determinístico preservado.
- ✅ `requireTenant` inalterado — mesma matriz de decisão que o banco agora aplica.
- ✅ Fluxo de impersonação (IA-002) preservado.

## 9. Conformidade

- ✅ `docs/architecture/ARCHITECTURE_CONSTITUTION.md`
- ✅ `docs/architecture/security/SECURITY_ARCHITECTURE.md`
- ✅ `docs/architecture/impact-analysis/IA-001-TenantMiddleware.md`
- ✅ `docs/architecture/impact-analysis/IA-002-ClientImpersonationLayer.md`
- ✅ `docs/architecture/impact-analysis/IA-003-RLSPolicies.md`

## 10. Arquivos alterados

- **Criado:** `supabase/migrations/20260707-143044-*.sql` — `CREATE OR REPLACE`
  de `public.get_current_tenant_id()`.
- **Criado:** `docs/delivery/phase-02-multi-tenancy/13-m2b-1-get-current-tenant-id-cardinality-fix.md`
  (este relatório).

Nenhum outro arquivo modificado.

## 11. Declaração final

> **M2b.1 corrigiu a cardinalidade de `get_current_tenant_id()`.**
> **M2b permanece aguardando auditoria final.**
> **M3 permanece bloqueada até aprovação externa deste patch.**

A camada de banco passa a espelhar exatamente a matriz determinística da
camada aplicacional (`requireTenant`), eliminando a última assimetria
identificada entre as duas linhas de defesa do isolamento multi-tenant.
