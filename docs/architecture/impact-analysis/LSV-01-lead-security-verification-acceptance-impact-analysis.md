# LSV-01 — Lead Security Verification & Acceptance — Impact Analysis

## 1. Status

**Status:** Superseded (terminal).

**REMAINING_IMPLEMENTATION_BUDGET = 0.**
**FINAL_CORRECTIVE_EXECUTED = true.**
**ADDITIONAL_CORRECTION_ALLOWED = false.**

Terminal HEAD: `1db73e5f1df4021a384333f02de256b3fdab0cba`.

Governança vinculante:
`docs/architecture/governance/FINITE_DELIVERY_GOVERNANCE.md` e
`docs/architecture/governance/FINITE_ROADMAP_EXECUTION_MAP.md`
(materialização `c1141448fd3c36ef7ae8ff60613c383673fde0d6`).

A correção consolidada final (**Canonical Tenant Context Alignment
& Documentation Reconciliation**) foi executada e auditada. Nenhuma
nova correção da LSV-01 é permitida. Os artefatos construídos e
corrigidos permanecem como baseline vinculante da LSV-02.

Escopo transferido: execução live e identidade → **LSV-02**
(Planned / Blocked External); autorização/RLS/grants/impersonação →
**LSV-03**; atomicidade/rollback/concorrência/fechamento → **LSV-04**.
Lotes A/B/C são histórico apenas para rastreabilidade e não são
sequência executável.


## 2. Predecessor e autoridade herdada

Predecessor: **LSH-01 (Accepted)**. External Audit Approval HEAD:
`c6769c227e6255a01e1e3a96cac9292e0a72278e`. Implementation Evidence
HEAD: `20265f950b541e2d9f499e747b7577b28fc29a4a`. Baseline do Lote B da
LSH-01: `768f1f6789bf31421771b97722145a5cb5a1b5a4`.

A LSV-01 herda o contrato canônico de autorização Lead, o boundary
tipado, a matriz de operações, o contrato de impersonação (SQL + TS) e
o audit trail append-only. A LSV-01 não reabre nenhum desses contratos:
verifica-os operacionalmente sob JWTs reais.

Sucessor imediato: **LSV-02** (Planned — Blocked External;
LSV-02 permanece bloqueada até o provisionamento e autorização do
target Supabase não produtivo). RDA-01 permanece **Planned — Blocked
by LSV-04**, conforme `FINITE_ROADMAP_EXECUTION_MAP.md`.

## 3. Objetivo da verificação

Provar operacionalmente, em ambiente isolado autorizado, que:

- RLS aplicada nas tabelas Lead-related é efetiva sob usuários reais;
- os grants materializados pela LSH-01 são efetivos em runtime;
- o contrato canônico de impersonação bloqueia forjadura de header;
- a autoridade `create_manual_lead` é atômica lead + evento;
- rollback ocorre sob erro intermediário sem trilha órfã;
- Super Admin, admin (`app_role`), corretor, secretaria, captador,
  suspenso e sem-membership recebem exatamente a decisão prevista pela
  matriz;
- nenhum caminho consome tenant vindo do client.

## 4. Modelo de ameaça

Cobertura operacional (não estrutural):

- ataque cross-tenant por header forjado;
- ataque cross-tenant por seleção implícita de tenant;
- escalonamento por `admin` (app_role) ≠ Super Admin;
- escrita direta em `lead_audit_events` por usuário autenticado;
- exclusão silenciosa de auditoria via CASCADE;
- `select("*")` residual em rotas administrativas Lead;
- `update` sem rowCount em `adminAtualizarLead`;
- `search_path` hijack em `create_manual_lead`;
- fabricação de JWT ou reuso de service role como usuário operacional;
- concorrência disparando ordem inesperada de eventos.

## 5. Ambiente autorizado

Targets permitidos:

- `local` — Supabase local (`supabase start`);
- `ephemeral` — projeto Supabase efêmero;
- `staging` — projeto explicitamente autorizado para LSV-01.

Target proibido: `production`. Não inferir segurança por ausência de
dados, nome genérico, URL conhecida, presença de service role, ou
fornecimento pelo ambiente Lovable.

## 6. Proteção contra produção

Configuração explícita obrigatória:

```
LSV_TEST_MODE=1
LSV_TEST_TARGET=local|ephemeral|staging
LSV_ALLOWED_PROJECT_REF=<ref autorizado>
LSV_SUPABASE_URL=<target>
LSV_SUPABASE_ANON_KEY=<target>
LSV_SUPABASE_SERVICE_ROLE_KEY=<target>
```

O environment guard (`tests/security/lsv-01/environment-guard.ts`)
falha fechado com código `LSV_TEST_TARGET_NOT_AUTHORIZED` quando:

- `LSV_TEST_MODE` ≠ `1`;
- `LSV_TEST_TARGET` ausente ou não reconhecido;
- `LSV_ALLOWED_PROJECT_REF` ausente ou divergente do project ref
  extraído de `LSV_SUPABASE_URL`;
- URL, anon key ou service role key ausentes;
- rótulo de target ou project ref contém indício de produção.

O guard não imprime secrets, JWTs ou service role keys. O project ref
é reportado apenas em forma redigida (`prefix***suffix`).

## 7. Matriz de tenants

Dois tenants isolados criados pelo setup administrativo:

- `tenantA` — contém `propertyA`, `leadAAssigned` (atribuído a
  `tenant_a_corretor_assigned`) e `leadAUnassigned`;
- `tenantB` — contém `propertyB` e `leadB`.

Não usar tenant default, real, existente ou fallback. IDs vêm sempre
do row retornado pelo insert do banco.

## 8. Matriz de identidades

Todas materializadas via Auth real + membership real:

| Alias | Tenant slot | Functional role | Membership | Super Admin | Auth |
|-------|-------------|-----------------|------------|-------------|------|
| tenant_a_admin | tenantA | admin | active | no | yes |
| tenant_a_corretor_assigned | tenantA | corretor | active | no | yes |
| tenant_a_corretor_unassigned | tenantA | corretor | active | no | yes |
| tenant_a_unauthorized_role | tenantA | secretaria | active | no | yes |
| tenant_b_admin | tenantB | admin | active | no | yes |
| tenant_b_corretor | tenantB | corretor | active | no | yes |
| suspended_member | tenantA | corretor | suspended | no | yes |
| removed_or_no_membership_user | none | — | none | no | yes |
| super_admin | none | — | none | yes | yes |
| anonymous | none | — | none | no | no |

`super_admin` é configurado exclusivamente pelo mecanismo canônico que
faz `public.is_super_admin() = true`. `admin` (app_role) ≠ Super Admin.

## 9. Contrato de fixtures

- runId opaco, não sensível, prefixado `lsv01-<runId>`;
- setup idempotente por runId;
- cardinalidade explícita — nunca `LIMIT 1`, nunca "primeiro tenant";
- factory rejeita duplicidade e ordem implícita;
- todos os IDs devolvidos pelo banco no insert;
- contexto imutável após setup;
- `resources` mínimos: `propertyA`, `propertyB`, `leadAAssigned`,
  `leadAUnassigned`, `leadB`.

## 10. Contrato de sessões e JWTs

- toda identidade autenticada obtém sessão via `signInWithPassword`
  contra o target autorizado;
- um cliente Supabase por identidade, com `MemoryStorage` isolada;
- clientes nunca compartilham storage adapter, token, refresh token,
  cookie, header mutável ou instância global;
- service role usada exclusivamente em setup/teardown;
- JWTs nunca são versionados, logados ou impressos — apenas
  `fingerprintToken` irreversível de 8 chars é permitido em reports.

## 11. Matriz de operações (transferida)

Transferida para **LSV-03**. Cobrirá as 5 operações Lead:
`lead.list`, `lead.list_assignees`, `lead.list_properties`,
`lead.create_manual`, `lead.update_fields` — e ausência de
`lead.workspace_action`.

## 12. Matriz de RLS (transferida)

Transferida para **LSV-03**. Alvos: `leads`, `lead_audit_events`,
`tenant_members`, `corretores`, `imoveis`, sob cada identidade da
matriz.

## 13. Matriz de grants (transferida)

Transferida para **LSV-03**. Verificação operacional dos `GRANT`s e
`REVOKE`s consolidados pela LSH-01, com atenção especial a
`lead_audit_events` (zero DML direto para `authenticated`,
`service_role`, `anon`).

## 14. Matriz de impersonação (transferida)

Transferida para **LSV-03**. Cenários canônicos (7):

- header ausente;
- header válido do tenant autorizado (Super Admin);
- header válido de outro tenant (Super Admin);
- header UUID inválido;
- header vazio;
- header forjado por usuário comum;
- header válido em conjunto com `is_super_admin = false`.

## 15. Matriz de atomicidade e rollback (transferida)

Transferida para **LSV-04**. Cobrirá:

- `create_manual_lead` como transação única lead + audit;
- rollback sob erro em cada etapa;
- concorrência sob criação simultânea;
- ausência de auditoria órfã e ausência de lead sem auditoria.

## 16. Cleanup e idempotência

Cleanup em bloco `finally`. Ordem: audit events → leads → properties
→ corretores → memberships → tenants → usuários Auth. Nunca contornar
`ON DELETE RESTRICT` de `lead_audit_events` alterando a política de
produção — apenas o ambiente isolado autorizado executa o teardown
administrativo.

Resultado exigido:

```
fixtures_created > 0
fixtures_cleaned = fixtures_created
orphaned_fixtures = 0
```

## 17. Evidências e redaction

Cada execução produz:

```
passed
failed
skipped
fixtures_created
fixtures_cleaned
orphaned_fixtures
environment_target
project_ref_redacted
```

Nunca são emitidos: JWTs, refresh tokens, cookies de sessão, service
role, anon key, senhas, tokens completos, prefixos de token
reutilizáveis. É permitido apenas: alias, user UUID, tenant UUID,
role, membership status, sucesso/falha, `fingerprintToken`
irreversível de 8 chars.

## 18. Lotes históricos (rastreabilidade apenas)

Preservados exclusivamente como referência auditável; **não são
sequência executável** após FRR-01:

- **Lote A — Isolated Live Security Harness & Identity Matrix
  Foundation:** histórico de construção do harness estrutural
  (environment guard, factories, session/client factory, matriz de
  identidades, runner, aggregator, testes estruturais).
- **Lote B — Live Authorization, RLS, Grants & Impersonation
  Matrix:** não iniciado; escopo transferido para **LSV-03**.
- **Lote C — Atomicity, Rollback, Concurrency & Final Closure:** não
  iniciado; escopo transferido para **LSV-04**.

Novos lotes, sublotes ou identificadores decimais são proibidos
dentro da LSV-01.

## 19. Definition of Done (correção final consolidada)

Escopo autorizado: **Canonical Tenant Context Alignment &
Documentation Reconciliation**.

Contrato canônico de `public.get_current_tenant_id()` (fonte de verdade:
`supabase/migrations/20260707143029_83dd8dc5-0313-45cd-a332-cc188a6f64c2.sql`,
M2b.1 — strict cardinality):

- usuário comum: o header `x-tenant-id` é **ignorado**;
- zero memberships ativas → `NULL`;
- exatamente uma membership ativa → tenant dessa membership;
- múltiplas memberships ativas → `NULL`;
- Super Admin: header respeitado (impersonação) ou `NULL`;
- anônimo: header respeitado (endpoints públicos) ou `NULL`.

Cenário do forged-header probe (single-membership):

- ator autenticado: `tenant_a_admin` (uma membership ativa em `tenantA`);
- header enviado: `x-tenant-id: <tenantB>`;
- resultado canônico obrigatório: **`tenantA`**;
- `tenantB`, `NULL`, qualquer outro tenant ou tipo incompatível ⇒ falha
  fechada (contract drift).

Requisitos da correção final:

- forged-header probe alinhado ao contrato canônico acima
  (`forgedValue === tenantA`, com rejeição estrita de `NULL`, `tenantB`,
  outros tenants e tipos incompatíveis);
- evidência persistida com campos `forged_header_requested_tenant`,
  `forged_header_effective_tenant`, `forged_header_cross_tenant_gain`,
  `forged_header_canonical_contract_verified`,
  `forged_header_denial_verified` e `canonical_migration_path`;
- persistência de evidência fail-closed: sucesso exige
  `evidence.evidence_persisted === true` na snapshot final em disco;
- testes estruturais correspondentes reconciliados;
- documentação da LSV-01 reconciliada;
- scripts documentados alinhados com `package.json`
  (`test:lsv-01:harness`, `test:lsv-01:live`, `test:lsv-01:lot-a`);
- nenhum runtime, migration, RLS ou grant alterado;
- REMAINING_IMPLEMENTATION_BUDGET consumido para 0;
- LSV-01 recebeu estado terminal **Superseded**; nenhuma nova
  correção é permitida.

## 20. Fora de escopo

RDA-01, RC-01, PR-M2, dashboard, CMS, host resolution, domains,
billing. Escopo estrutural da LSH-01 (contratos de autorização,
migrations, boundary tipado, matriz de operações) — a LSV-01 apenas
verifica; não redefine.

