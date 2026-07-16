# 125 — LSV-01: Lead Security Verification & Acceptance

## Estado atual

**LSV-01 — Ready for Final Audit**
(equivalência legada: *Corrective Pass Executed — Awaiting External Audit*).

**REMAINING_IMPLEMENTATION_BUDGET = 0.**

**FINAL_CORRECTIVE_EXECUTED = true.**

Este orçamento corresponde a **uma única correção consolidada final**.
Após a execução dessa correção e sua auditoria, a LSV-01 receberá
obrigatoriamente um estado terminal (**Accepted**, **Superseded**,
**Rejected** ou **Blocked External**). Nenhuma nova correção da LSV-01
será autorizada após esse ponto.

Após a materialização desta correção consolidada final (Canonical
Tenant Context Alignment & Documentation Reconciliation), o estado
documental da etapa passa a ser:

- **LSV_01_STATUS:** *Ready for Final Audit*
  (equivalência legada: *Corrective Pass Executed — Awaiting External Audit*).
- **REMAINING_IMPLEMENTATION_BUDGET:** `0`.
- **FINAL_CORRECTIVE_EXECUTED:** `true`.

O estado terminal (Accepted / Superseded / Rejected / Blocked External)
só pode ser atribuído após auditoria externa final.

**Contratos de governança vinculantes:**
`docs/architecture/governance/FINITE_DELIVERY_GOVERNANCE.md` ·
`docs/architecture/governance/FINITE_ROADMAP_EXECUTION_MAP.md`.

**Predecessor:** LSH-01 (Accepted — External Audit Approval HEAD
`c6769c227e6255a01e1e3a96cac9292e0a72278e`).
**Sucessor imediato após terminal não-rejeitado:** LSV-02.

---

## Escopo congelado da correção final

**Canonical Tenant Context Alignment & Documentation Reconciliation.**

Inclui exclusivamente:

- alinhar o forged-header probe ao contrato SQL canônico;
- alinhar a evidência correspondente;
- alinhar os testes estruturais correspondentes;
- reconciliar a documentação e os scripts documentados;
- preservar o comportamento fail-closed da evidência.

Não inclui:

- execução live completa;
- matriz completa de autorização Lead;
- matriz completa de RLS;
- matriz completa de grants;
- atomicidade `create_manual_lead`;
- rollback sob erro intermediário;
- concorrência;
- encerramento global da segurança Lead;
- criação ou alteração de migrations;
- alterações no runtime aceito da LSH-01.

---

## Contrato canônico de `get_current_tenant_id()`

Fonte de verdade (auditada):
`supabase/migrations/20260707143029_83dd8dc5-0313-45cd-a332-cc188a6f64c2.sql`
(M2b.1 — strict cardinality).

- Anônimo: header `x-tenant-id` respeitado (endpoints públicos) ou `NULL`.
- Super Admin: header `x-tenant-id` respeitado (impersonação) ou `NULL`.
- Usuário comum autenticado: **header `x-tenant-id` ignorado**;
  cardinalidade estrita sobre `public.tenant_members`:
  - `0` memberships → `NULL`;
  - `1` membership → tenant dessa membership;
  - `N` memberships → `NULL`.

Cenário do forged-header probe (single-membership):

- ator: `tenant_a_admin` (1 membership ativa em Tenant A);
- header enviado: `x-tenant-id: <Tenant B>`;
- resultado canônico obrigatório: **Tenant A**;
- `NULL`, Tenant B, outro tenant ou tipo incompatível ⇒ falha fechada.

Afirmações legadas de que "usuário comum com header cross-tenant deve
receber `NULL`" ou de que "Tenant A é resultado inesperado" ficam
formalmente revogadas por esta reconciliação.

---

## Scripts documentados (alinhados a `package.json`)

- `bun run test:lsv-01:harness` — testes estruturais do harness.
- `bun run test:lsv-01:live` — runner live (fail-closed sem target
  autorizado).
- `bun run test:lsv-01:lot-a` — aggregator que executa
  `typecheck`, `build`, `harness`, `live` e a regressão da LSH-01
  (`bun run test:lsh-01`) e persiste os exits na evidência.

---



## Escopo transferido

- execução live de identidade e Tenant Context → **LSV-02**;
- autorização Lead, RLS, grants e impersonação → **LSV-03**;
- atomicidade, rollback, concorrência e fechamento final → **LSV-04**.

Cada etapa possui Execution Envelope inicial registrado em
`FINITE_ROADMAP_EXECUTION_MAP.md`.

---

## Dependência externa

Target Supabase **não produtivo** autorizado (anon key, service role,
project ref adicionado à allowlist) — dependência da LSV-02, não da
correção final da LSV-01.

---

## Regra terminal

Após a auditoria da correção final consolidada, **nenhuma nova
correção da LSV-01 será permitida**. O estado terminal atribuído
decide o desbloqueio da LSV-02:

- **Accepted / Superseded / Blocked External** → LSV-02 desbloqueada;
- **Rejected** → sequência LSV-02 / LSV-03 / LSV-04 permanece bloqueada
  até reconciliação arquitetural explícita.

---

## Histórico legado (rastreabilidade apenas)

Preservado exclusivamente para auditoria histórica; **não é sequência
executável**:

- **Lote A — Isolated Live Security Harness & Identity Matrix
  Foundation:** histórico de construção do harness estrutural,
  environment guard endurecido, factory tipada, cleanup determinístico,
  runner live, aggregator e testes estruturais. Trabalho materializado
  no repositório sob HEADs da LSV-01 anteriores a esta reconciliação.
- **Lote B — Live Authorization, RLS, Grants & Impersonation Matrix:**
  não iniciado. Escopo transferido para **LSV-03**.
- **Lote C — Atomicity, Rollback, Concurrency & Final Closure:** não
  iniciado. Escopo transferido para **LSV-04**.

Nenhum novo Lote, sublote, Lote A1/A2/D ou identificador decimal pode
ser criado dentro da LSV-01.

---

## Baselines vinculantes

- **LSH-01 External Audit Approval HEAD:**
  `c6769c227e6255a01e1e3a96cac9292e0a72278e`
- **LSH-01 Implementation Evidence HEAD:**
  `20265f950b541e2d9f499e747b7577b28fc29a4a`
- **FINITE_DELIVERY_GOVERNANCE materialization:**
  `c1141448fd3c36ef7ae8ff60613c383673fde0d6`

---

## Não escopo

RDA-01, RC-01, PR-M2, PR-M3, TH-M1, TH-M2, dashboard, CMS, host
resolution, domains, billing. Contratos estruturais da LSH-01 não são
reabertos. Nenhuma alteração de runtime, migration, RLS ou grants é
autorizada dentro do escopo remanescente da LSV-01.
