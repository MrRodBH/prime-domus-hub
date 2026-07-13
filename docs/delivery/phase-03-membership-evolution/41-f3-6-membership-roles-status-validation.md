# F3.6 — Membership Roles & Status Validation

## Objetivo

Consolidar validação server-side de `membership_status` e `tenant_role`
como base tipada, determinística e auditável para futuras camadas de
autorização, **sem alterar a semântica de resolução de tenant já
aprovada nas etapas F3.2 → F3.5** e **sem transformar `tenant_role` em
autorização ampla nesta etapa**.

## Estado inicial encontrado

### Schema real de `public.tenant_members`

```
tenant_id          uuid              NOT NULL
user_id            uuid              NOT NULL
is_owner           boolean           NOT NULL DEFAULT false
is_default         boolean           NOT NULL DEFAULT true
joined_at          timestamptz       NOT NULL DEFAULT now()
tenant_role        tenant_role       NOT NULL DEFAULT 'viewer'
membership_status  membership_status NOT NULL DEFAULT 'active'
invited_at         timestamptz       NULL
accepted_at        timestamptz       NULL
suspended_at       timestamptz       NULL
revoked_at         timestamptz       NULL
updated_at         timestamptz       NOT NULL DEFAULT now()

PK (tenant_id, user_id)
Index tenant_members_active_lookup_idx (user_id, tenant_id, membership_status)
Policies: tm_select (SELECT), tm_write (ALL, super_admin only)
```

### Domínio real (enums Postgres)

`membership_status`:
```
active | invited | suspended | revoked
```

`tenant_role` (**domínio específico deste projeto**, preservado):
```
owner | admin | manager | broker | captador | secretaria | viewer
```

Ambas as colunas são `NOT NULL` e tipadas por enum — o próprio Postgres
já rejeita `null` e valores fora do domínio. **Nenhuma CHECK constraint
adicional é necessária.**

### Distribuição atual dos dados

```
membership_status: active(4)
tenant_role:       owner(1), admin(3)
combinação:        active/owner(1), active/admin(3)
nulos:             0/0/4
```

### Inconsistências encontradas

Nenhuma inconsistência de tipo. **Risco documentado**: 3 memberships
active carregam `tenant_role = 'admin'`, herdadas do backfill da F3.1.
Se `tenant_role` for futuramente conectada a autorização real, essas
memberships precisam de reconciliação explícita — vide §Recomendação.

## Arquivos criados

- `src/integrations/supabase/membership-types.ts`
- `src/integrations/supabase/membership-validation.ts`
- `src/integrations/supabase/__tests__/membership-validation.spec.ts`
- `docs/delivery/phase-03-membership-evolution/41-f3-6-membership-roles-status-validation.md` (este)

## Arquivos alterados

- `run-tenant-specs.ts` — integra a nova suíte ao runner unificado.

## Migrations / SQL functions / RLS / Grants / Storage / Runtime Core

- **Migrations:** nenhuma. Enums já restringem o domínio; não há dado
  incompatível a corrigir; criar CHECK duplicada seria ruído.
- **SQL functions:** nenhuma alteração.
- **RLS policies:** nenhuma alteração.
- **Grants:** nenhuma alteração.
- **Storage:** nenhuma alteração.
- **Runtime Core:** nenhuma alteração.

## Helpers / types criados

`membership-types.ts`:
- `MEMBERSHIP_STATUSES` (const readonly tuple)
- `MembershipStatus` (union)
- `ACTIVE_MEMBERSHIP_STATUS` (constante única do valor operacional)
- `TENANT_ROLES` (const readonly tuple, domínio real do projeto)
- `TenantRole` (union)

`membership-validation.ts` — funções puras, sem I/O, sem fallback,
sem coerção silenciosa:
- `isMembershipStatus`
- `isActiveMembershipStatus`
- `assertMembershipStatus`
- `isTenantRole`
- `assertTenantRole`
- `isTenantAdminRole` *(inerte — não é enforcement nesta etapa)*
- `isTenantOwnerRole` *(inerte — não é enforcement nesta etapa)*

## Validações server-side consolidadas

`membership_status = 'active'` permanece o critério **único e obrigatório**
para operação tenant-scoped, já enforced em:

- `get_current_tenant_id()` (SQL, `SECURITY DEFINER`) — todas as branches
  usam `membership_status = 'active'`.
- `user_belongs_to_tenant()` / `user_has_active_membership()` (SQL,
  `SECURITY DEFINER`).
- `resolveTenantContext` (`src/integrations/supabase/tenant-middleware.ts`)
  via `TenantRepository` cujo `listByUser` e `userHasActiveMembership`
  filtram `membership_status = 'active'`.
- `listSelectableTenants` (`src/lib/api/tenant-selection.functions.ts`)
  filtra `membership_status = 'active'`.

A F3.6 **não altera** essa semântica; apenas expõe helpers tipados
reutilizáveis.

## Confirmações de contrato

- `tenant_role` **NÃO** virou autorização ampla — helpers de role são
  base futura, marcados explicitamente como inertes.
- `tenant_role` **NÃO** é usado como resolvedor de tenant.
- `is_owner` e `is_default` continuam **ignorados** como resolvedores.
- Client **não** consulta `tenant_members` diretamente.
- Client **não** filtra `membership_status`.
- Super Admin sem impersonação **continua sem** acesso tenant-scoped.
- Sem tenant default, sem fallback, sem heurística, sem `ORDER BY /
  LIMIT 1` para resolução.

## Testes executados

`bunx tsx --tsconfig tsconfig.json ./run-tenant-specs.ts`

```
✓ tenant-selection-state:      8 passed, 0 failed
✓ tenant-attacher:             7 passed, 0 failed
✓ tenant-selection-cardinality:7 passed, 0 failed
✓ tenant-gate:                12 passed, 0 failed
✓ membership-validation:      10 passed, 0 failed
TOTAL: 44 passed, 0 failed
```

Nova suíte cobre:
- domínio de `membership_status` bate exatamente com o enum do banco;
- domínio de `tenant_role` bate exatamente com o enum do banco
  (project-specific: inclui `broker`, `captador`, `secretaria`);
- `isMembershipStatus` / `isTenantRole` rejeitam null, undefined,
  string vazia, case incorreto, valor fora do domínio, tipos não-string;
- `isActiveMembershipStatus` retorna true APENAS para `'active'`;
  `invited` / `suspended` / `revoked` retornam false;
- `assertMembershipStatus` / `assertTenantRole` lançam erro sem fallback
  (sem coerção para `active`, sem promoção para `admin`/`member`);
- helpers `isTenantAdminRole` / `isTenantOwnerRole` são estritos e não
  aplicam fallback.

## Typecheck

`bunx tsgo --noEmit` — sem erros.

## Lint

Não executado nesta etapa (o projeto usa `eslint.config.js` mas o
runner do repositório não expõe script `lint` obrigatório para
mudanças pontuais deste porte; os arquivos criados seguem o padrão
das suítes existentes já aprovadas em F3.4/F3.5).

## Riscos residuais

1. **Overgrant histórico (`tenant_role = 'admin'` em 3 memberships)** —
   herança do backfill da F3.1. Sem impacto atual porque `tenant_role`
   não autoriza nada, mas exige reconciliação antes de qualquer uso
   como enforcement.
2. **`is_owner` / `is_default` ainda presentes no schema** — colunas
   legadas, ignoradas por todos os fluxos. Recomenda-se deprecar em
   etapa dedicada.
3. **Ausência de CHECK adicional para `tenant_role`** — desnecessária
   hoje (enum cobre), mas se o enum receber novos valores no futuro,
   `TENANT_ROLES` (const TS) precisa ser atualizada em sincronia.

## Recomendação para futura Role Reconciliation

Antes de conectar `tenant_role` a autorização real, executar etapa
dedicada que:
- audita cada `tenant_role = 'admin'` remanescente do backfill;
- reclassifica para o role apropriado (`owner` / `manager` / `viewer`
  etc.) com aprovação humana;
- decide o destino de `is_owner` / `is_default` (deprecação ou remoção);
- só então introduz helpers `requireTenantAdmin` / policies dependentes
  de role, com testes de bypass e testes de RLS end-to-end.

## Escopo — confirmação

Não implementados nesta etapa: F3.7, billing, planos, trial, Stripe,
Hotmart, Kiwify, permissões avançadas por role, RBAC completo, painel
de gestão de usuários, convite, seats, Super Admin global permissions
refactor, Storage Abstraction Layer, alterações em Runtime Core.

## Conclusão

Domínio tipado, validação pura e determinística, sem fallback, sem
coerção, sem enforcement de role. `membership_status = 'active'`
permanece o único critério operacional. Nenhuma regressão em F3.4/F3.5.

---

## Audit Package

- **Status:** F3.6 implementada e pronta para auditoria.
- **Arquivos criados:** `membership-types.ts`, `membership-validation.ts`,
  `membership-validation.spec.ts`, este relatório.
- **Arquivos alterados:** `run-tenant-specs.ts`.
- **Migrations:** nenhuma.
- **SQL functions:** nenhuma alteração.
- **RLS policies:** nenhuma alteração.
- **Grants:** nenhuma alteração.
- **Storage:** nenhuma alteração.
- **Runtime Core:** nenhuma alteração.
- **Schema tenant_members encontrado:** ver §Estado inicial.
- **Distribuição membership_status:** `active=4`.
- **Distribuição tenant_role:** `owner=1, admin=3`.
- **Inconsistências encontradas:** nenhuma de tipo; risco de overgrant
  histórico documentado.
- **Constraints criadas:** nenhuma — enums já cobrem o domínio.
- **Testes:** 44/44 PASS (5 suítes).
- **Typecheck:** clean.
- **Lint:** não executado (justificado).
- **Riscos residuais:** ver §Riscos residuais.
- **Confirmações:** F3.7 não implementada; billing não implementado;
  permissões avançadas por role não implementadas; `tenant_role` NÃO
  usado como autorização ampla nem como resolvedor; `membership_status
  = 'active'` obrigatório mantido; client não consulta `tenant_members`
  nem filtra `membership_status`; Super Admin sem impersonação sem
  acesso tenant-scoped; RLS não relaxado; Runtime Core não alterado.
