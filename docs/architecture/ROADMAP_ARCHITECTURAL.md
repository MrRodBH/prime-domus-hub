# ROADMAP ARCHITECTURAL — RM Prime SaaS

**Status:** Ratificado — PR-M2 blocking correction implementada; exact-head gate obrigatório antes da Full Protected Merge Audit Rerun
**Autoridade:** Single Source of Future Evolution do RM Prime SaaS
**Main auditada:** `ec05fd4edee94feabf8423a129154eb807c52a99`
**Branch de implementação:** `agent/pr-m2-functional-completion`
**HEAD de início da blocking correction:** `be09b190996f512650331206898247a53004c8f8`
**Executor:** ChatGPT GitHub-native

## 1. Estado vinculante atual

```text
PRODUCT = Plataforma SaaS White Label para corretores de imóveis e imobiliárias
REPOSITORY = MrRodBH/prime-domus-hub
BASE_BRANCH = main
IMPLEMENTATION_BRANCH = agent/pr-m2-functional-completion
PULL_REQUEST = 60

PRM2_IMPLEMENTATION_AUTHORIZED = true
PRM2_IMPLEMENTATION_STARTED = true
PRM2_IMPLEMENTATION_COMPLETED = true
PRM2_FINAL_CLOSURE_STATE = Historical — Superseded by Rejected Full Protected Merge Audit
PRM2_BLOCKING_CORRECTION_STATE = Implemented — Exact-Head Gate Required
BF01_RESOLVED = true
BF02_RESOLVED = true
BF03_RESOLVED = true

PRM2_PROTECTED_MERGE_AUDIT_AUTHORIZED = false
PRM2_PROTECTED_MERGE_EXECUTION_AUTHORIZED = false
PRM2_MERGE_AUTHORIZED = false
PRM2_MERGED = false
MERGE_EXECUTED = false
AUTO_MERGE_ENABLED = false

DEPLOY_EXECUTED = false
MANAGED_MIGRATION_EXECUTED = false
REAL_PROVIDER_EXECUTED = false
DCA01_START_AUTHORIZED = false
BCA01_START_AUTHORIZED = false
PRM3_START_AUTHORIZED = false
```

A Full Protected Merge Audit rejeitou o estado anterior por três bloqueios materiais: raw client path authority, foto de corretor sem consumer atômico e CRM Attachments sem boundary funcional. A blocking correction materializa essas três correções e não autoriza merge. O exact-head Release Gate e o artifact integral permanecem predecessores obrigatórios da nova auditoria.

## 2. Proteção vinculante de `main`

```text
RULESET_ID = 20308240
RULESET_NAME = RM Prime — main protected merge gate
RULESET_ENFORCEMENT = active
RULESET_TARGET = refs/heads/main
RULESET_MATCHING_ACTIVE_COUNT = 1
BYPASS_ACTOR_COUNT = 0
CURRENT_USER_CAN_BYPASS = never

PULL_REQUEST_REQUIRED = true
REQUIRED_CONVERSATION_RESOLUTION = true
STRICT_REQUIRED_STATUS_CHECKS = true
FORCE_PUSH_ALLOWED = false
DELETION_ALLOWED = false
```

Required checks:

```text
Consolidated corrective exact-head Release Gate
integration_id = 15368

Typecheck, build and deterministic route generation
integration_id = 15368
```

O ruleset é predecessor obrigatório desta correção. Nenhuma nova criação, alteração ou auditoria operacional do ruleset integra este estágio.

## 3. Invariantes permanentes

1. Architecture First e Impact Analysis antes de mudança estrutural ou runtime relevante.
2. GitHub `main` auditado é a fonte técnica final.
3. Servidor é a única autoridade de tenant, autorização e decisões comerciais.
4. Client, headers e paths enviados pelo client nunca são autoridade.
5. Sem fallback implícito, tenant default, heurística, dual path ou `ORDER BY/LIMIT 1` autoritativo.
6. Ambiguidade falha rápido e fechado.
7. Super Admin sem impersonação explícita não acessa recursos tenant-scoped.
8. `x-tenant-id` é apenas transporte e deve ser revalidado pelo servidor.
9. Storage não confia em bucket, path ou filename enviados pelo client.
10. Signed URL não é autorização primária.
11. Same-Backend Homologation Cell permanece vinculante.
12. Supabase externo não é fallback canônico.
13. Nenhuma etapa sucessora inicia sem predecessor aceito e autorização explícita.

## 4. Estado arquitetural consolidado

| Macro / etapa | Estado vigente |
|---|---|
| Fase 2 — Multi-Tenant Core | Accepted / Closed |
| Fase 3 — Membership Evolution Model | Accepted / Closed |
| Fase 4 — SaaS Commercial Platform | Accepted / Closed |
| LSH-01 | Accepted / Closed |
| LSV-01 | Superseded / terminal |
| LSV-02 | Superseded / terminal |
| LSR-01 | Superseded / terminal |
| LSR-02 | Rejected / terminal |
| FRP-01 | Rejected / terminal |
| HVP-01 | Superseded / historical |
| HRC-01 | Rejected / terminal |
| GNR-01 | Accepted |
| HRR-01 | Accepted |
| HRI-01 | Accepted / Closed |
| RPD-01 | Accepted / Closed |
| PR-M2 Pre-Principal Planning Gate | Accepted / Merged |
| PR-M2 Functional Completion | Blocking Correction Implemented — Exact-Head Gate Required |
| DCA-01 | Planned — Blocked by protected merge of PR-M2 |
| BCA-01 | Planned — Blocked by DCA-01 |
| PR-M3 | Planned — Blocked by BCA-01 |
| Pre-Homologation Release Candidate | Blocked by PR-M3 |
| TH-M1 | Blocked by Release Candidate |
| TH-M2 | Blocked by TH-M1 |
| LSV-03 | Planned — Blocked by TH-M2 |
| Formal Homologation | Blocked by LSV-03 |
| Production | Blocked by Formal Homologation |

Estados `Accepted`, `Rejected`, `Superseded`, `Closed` ou históricos não recuperam budget nem voltam à cadeia executável.

## 5. Caminho crítico executável

```text
PR-M2 — Blocking Correction exact-head gate
→ PR-M2 — Full Protected Merge Audit Rerun
→ protected merge somente após autorização separada
→ DCA-01 — Domain & Cloudflare Activation
→ BCA-01 — Billing & Commercial Activation
→ PR-M3 — Final Product UX/UI
→ Pre-Homologation Release Candidate
→ TH-M1 — Internal End-to-End UAT
→ TH-M2 — Consolidated Remediation
→ LSV-03 — Controlled Security Validation
→ Formal Homologation
→ Production
```

A única próxima ação após sucesso comprovado do exact-head Release Gate e validação do artifact integral é a repetição integral da Full Protected Merge Audit. O merge não é automático e permanece condicionado a autorização posterior do Product Owner.

## 6. PR-M2 — resultado corrente

A PR-M2 materializou as capacidades funcionais previstas no boundary autorizado, incluindo tenant lifecycle, access control, Configuration Center, CMS, CRM, dashboards, portais, marketing, tracking e Super Admin Control Plane.

Fronteiras externas preservadas:

```text
MANAGED_MIGRATION_EXECUTED = false
LIVE_BACKEND_SCHEMA_VERIFIED = false
REAL_PROVIDER_EXECUTED = false
REAL_CREDENTIAL_USED = false
LIVE_TRAFFIC_TESTED = false
LIVE_DOMAIN_ACTIVATION_EXECUTED = false
LIVE_BILLING_ACTIVATION_EXECUTED = false
```

DCA-01 responde pela ativação híbrida de domínios e Cloudflare. BCA-01 responde pela autorização comercial, provider real, checkout, webhooks, portal de cobrança, lifecycle de assinatura, conciliação e receita realizada. PR-M3 somente inicia após BCA-01.

## 7. Evidência integral do diff

O workflow `PR-M2 Consolidated Corrective Gate` deve executar sobre o HEAD exato da branch e publicar:

```text
pr-m2-consolidated-corrective-<HEAD>
pr-m2-full-diff-evidence-<HEAD>
```

A evidência integral contém patch `--binary --full-index`, inventários de arquivos, `git bundle` verificável, chunks determinísticos de até 8 MiB, hashes SHA-256, reconstrução byte a byte e manifesto JSON.

```text
MERGE_REF_USED = false
EXACT_HEAD_MATCH = true
MERGE_BASE_MATCH = true
HEAD_IS_DESCENDANT_OF_BASE = true
BEHIND_BY = 0
```

A existência do artifact não substitui a auditoria externa; ela remove a limitação dos endpoints de diff truncados.

## 8. Historical Planning Snapshot — Superseded by Product Owner Execution Decisions and PR-M2 Final Closure

O planejamento original, a matriz de 248 capacidades, as contagens, os gaps pré-implementação e o caminho antigo `Planned — Blocked` permanecem preservados de forma imutável no commit de entrada:

```text
HISTORICAL_SNAPSHOT_COMMIT = ba737b82cd878d83f539a6142db5612962421e29
HISTORICAL_SNAPSHOT_PATH = docs/architecture/ROADMAP_ARCHITECTURAL.md
HISTORICAL_AUTHORITY = superseded_for_current_execution_state
```

Snapshot imutável:

`https://github.com/MrRodBH/prime-domus-hub/blob/ba737b82cd878d83f539a6142db5612962421e29/docs/architecture/ROADMAP_ARCHITECTURAL.md`

Esse snapshot é evidência temporal, não autoridade vigente contra as decisões posteriores do Product Owner e a evidência final da PR-M2.

## 9. Estado máximo após esta correção

```text
PRM2_BLOCKING_CORRECTION_STATE = Implemented — Exact-Head Gate Required
BF01_RESOLVED = true
BF02_RESOLVED = true
BF03_RESOLVED = true
DIFF_CHECK_PASSED = pending_exact_head_gate
REQUIRED_CHECKS_SUCCESS = pending_exact_head_gate
FULL_DIFF_ARTIFACT_VALID = pending_exact_head_gate
PRM2_PROTECTED_MERGE_AUDIT_AUTHORIZED = false
PRM2_PROTECTED_MERGE_EXECUTION_AUTHORIZED = false
PRM2_MERGE_AUTHORIZED = false
MERGE_EXECUTED = false
NEXT_AUTHORIZED_ACTION = exact-head validation; authorize Full Protected Merge Audit Rerun only after all gates pass
```
