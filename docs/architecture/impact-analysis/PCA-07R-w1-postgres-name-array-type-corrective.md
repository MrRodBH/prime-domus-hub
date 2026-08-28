# PCA-07R — W1 PostgreSQL `name[]` / `text[]` corrective

## 1. CTDD decision

```text
GATE = PCA-07R_W1_POSTGRES_NAME_ARRAY_TYPE_CORRECTIVE_REPOSITORY_IMPLEMENTATION
SOURCE_MAIN = 9e308ba596956f518a65f14e2df46d449dc9aeca
SOURCE_TREE = aa030014d5532324e21f84f8a02427bd455b70ba
AUTHORITY = PROTECTED_GITHUB_MAIN_ONLY
CANONICAL_BACKEND_AUTHORITY = LOVABLE_MANAGED_BACKEND_ONLY
OWNER_SUPABASE_ACCESS = LOVABLE_ONLY
RESULT = REPOSITORY_CORRECTIVE_MATERIALIZED
```

PCA-07 iniciou a aplicação controlada com preflight live integralmente aderente ao
manifest aceito. W1 foi interrompida antes de `COMMIT` pelo PostgreSQL ao avaliar
`name[] = text[]` na migration `20260728180000_pr_m2_tenant_access_control.sql`.
O erro retornado foi `operator does not exist: name[] = text[]`.
A transação foi revertida: nenhum ledger W1, schema `prm2_rebaseline`, função de
bootstrap ou alteração de cardinalidade persistiu, e W2–W6 não foram iniciadas.

## 2. Root cause e correção mínima

`pg_attribute.attname` possui o tipo de catálogo PostgreSQL `name`. Portanto,
`array_agg(a.attname ORDER BY x.ord)` produz `name[]`, incompatível com os quatro
literais explicitamente tipados como `text[]` usados para identificar índices e
constraints legados de `user_profiles`.

A correção canônica é estritamente local:

```sql
array_agg(a.attname::text ORDER BY x.ord)
```

As quatro ocorrências foram corrigidas nos bytes-fonte. Nenhum DDL, DML,
predicado de tenant, ACL, RLS, segredo ou ordem de wave foi alterado.

| Controle | Antes | Depois |
|---|---:|---:|
| agregações `attname` sem cast | 4 | 0 |
| agregações `attname::text` | 0 | 4 |
| comparações-alvo com `text[]` | 4 | 4 |
| SHA-256 da migration | `fc3a67eca7c46a965d4b1ade51aa87e22c81d2c1d6b0b329bfc2879c9628dab9` | `3a143962333bfd467ef4a4911c46401c8f9980cfb19cb7535ed7c8445f8f806e` |

## 3. Reancoragem e regressão

- Os manifests PCA-04 e PCA-05R passam a travar o novo hash canônico.
- O gerador W1 deixa de corrigir SQL em memória e exige os quatro casts no
  próprio arquivo-fonte.
- As regressões PCA-04, PCA-05R e PCA-07R rejeitam reintrodução de
  `array_agg(a.attname ...)` sem cast.
- A política histórica de imutabilidade PCA-05R abre somente esta exceção
  fail-closed: um único arquivo W1 ainda ausente no ledger, com diff exato de
  quatro casts e teste PCA-07R obrigatório.

## 4. Boundary negativa

```text
SAME_BACKEND_READS = 0
SAME_BACKEND_WRITES = 0
MIGRATION_LEDGER_WRITES = 0
LOVABLE_CALLS = 0
DIRECT_SUPABASE_CALLS = 0
PROVIDER_MUTATION = false
DEPLOY = false
ROADMAP_SITE_UPDATE = false
PR_105_MUTATION = false
```

Esta implementação não autoriza reaplicação de W1. Após auditoria protegida e
merge, PCA-07 deve ser novamente autorizada, repetir o preflight Lovable-managed
e reiniciar em W1; nenhum estado da tentativa revertida pode ser presumido.

## 5. Sucessores ordenados

1. publicar a branch corretiva e abrir PR draft;
2. auditar o head exato, checks, escopo e merge protegido;
3. reconciliar `main` pós-merge;
4. autorizar separadamente o retry Lovable-managed PCA-07 de W1–W6.

Nenhum sucessor é autorizado por este documento.
