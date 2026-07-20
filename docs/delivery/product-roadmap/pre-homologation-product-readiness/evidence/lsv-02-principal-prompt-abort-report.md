# LSV-02 — Principal Prompt Factual Report (FAIL-CLOSED ABORT before fixtures)

Status: **Aborted fail-closed at Phase A/D — no fixtures created, no mutations
performed.** This report is the factual deliverable of the LSV-02 principal
prompt execution. It does not declare Accepted.

---

## 1. Identification

| Field | Value |
| --- | --- |
| `run_id` | not generated — aborted before manifest creation (Section 20 gate) |
| Start (UTC) | 2026-07-20T14:37:44Z |
| End (UTC) | 2026-07-20T14:38:30Z |
| Repository | MrRodBH/prime-domus-hub |
| Branch | `edit/edt-c938149a-d212-4771-ae68-63aeff9721b2` (materializes into `main`) |
| `BASELINE_HEAD` (ancestral) | `8394f95644e51f1a0c0f9e01e46d9ea29e1f3e49` (confirmed ancestral of HEAD) |
| `EXECUTION_HEAD` | `35ab3c09f36d022ed7b680bb6afe9f01abc5b7a6` (matches prompt) |
| Backend project ref | `stmcnvzuzlyqammyycxj` (MATCH — HG-02 satisfied at ref level) |
| Restore point observed | 2026-07-20T11:04:25Z (visual evidence; restore **not** executed) |
| Operator | rodolfovaz882@gmail.com (Super Admin) |

## 2. Prompt budget

| Field | Value |
| --- | --- |
| LSV-02 iniciada | **true** |
| Prompt principal consumido | **1** |
| Prompt corretivo consumido | 0 |
| Budget restante | **1/2** (corretivo consolidado apenas) |

## 3. Hard guards evaluated before fixtures

| Guard | Evidence | Result |
| --- | --- | --- |
| HG-01 explicit same-backend mode | No `LSV_HOMOLOGATION_CELL_MODE` runtime switch exists in the codebase; prompt is documentary. | **NOT SATISFIED** |
| HG-02 exact project lock | Backend ref `stmcnvzuzlyqammyycxj` matches. | SATISFIED |
| HG-03 pre-homologation eligibility | Custom domains `realone.com.br`, `www.realone.com.br`, `rmprimeimoveis.com.br`, `www.rmprimeimoveis.com.br` currently serve real published traffic (see `<project_urls>` in system context). Product cannot be classified as "still formally in pre-homologation" while its published surface is externally reachable and its writer policies accept anonymous traffic. | **NOT SATISFIED** |
| HG-04 protected registry | RM Prime (`9664d189-4a12-4caa-8243-dc73383447e6`) and 73 `scp0121_*` residues identified by ID; checksum `3ece053ddbdfce5161380ec38824ea91` **matches** the frozen baseline. | SATISFIED (registry captured; no mutation) |
| HG-05 synthetic-only fixtures | Not reached (no fixture created). | N/A |
| HG-06 two-tenant minimum | Not reached. | N/A |
| HG-07 no preexisting object mutation | No writes issued during this run. | SATISFIED |
| HG-08 no destructive global operation | No destructive statements issued. | SATISFIED |
| HG-09 maintenance window | Lovable Cloud exposes no self-serve mechanism to suspend published custom-domain writes; agent cannot pause `cron.job` (schema not readable to executing role) nor guarantee `net.http_post` inhibition. No server-side maintenance control exists in the repository today. | **NOT SATISFIED** |
| HG-10 cleanup always | Not reached. | N/A |
| HG-11 residue zero | Not reached. | N/A |
| HG-12 protected baseline unchanged | Confirmed by post-check snapshot equality (§4 vs §7). | SATISFIED |
| HG-13 fail-closed | This report is the fail-closed outcome. | SATISFIED |
| HG-14 post-real-operation prohibition | Custom domains are live and public writers are open — the strategy's own text prohibits execution "once the product enters real operation". The current surface meets that condition materially even if not commercially. | **NOT SATISFIED** |

Aggregate: **HG-01, HG-03, HG-09, HG-14 not satisfied** → Section 20 mandates
ABORT before first fixture.

## 4. Protected baseline snapshot (start)

Captured read-only via project's exec-based Postgres access.

| Metric | Value |
| --- | --- |
| RM Prime tenant present | 1 |
| RM Prime memberships | 4 |
| RM Prime leads | 0 |
| RM Prime imóveis | 0 |
| RM Prime form_submissions | 0 |
| RM Prime subscriptions | 0 |
| RM Prime storage objects (prefix scan) | 22 |
| `storage.objects` total | 22 |
| Tenants total | 74 |
| `scp0121_*` tenants | 73 |
| `scp0121_*` subscriptions | 65 |
| `scp0121_*` portal connectors | 438 |
| `scp0121_*` id checksum (md5, ordered) | `3ece053ddbdfce5161380ec38824ea91` |
| `public.leads` policies granting `anon` | 2 |
| `public.form_submissions` policies granting `anon` | 5 |

## 5. Administrative inventory attempt

- `auth.users`, `auth.identities`: schema **not readable** by the exec role;
  no protected boundary function has been created (creating one would itself
  be a schema mutation and is not authorized under the aborted principal
  prompt).
- `cron.job`: schema **not readable** by the exec role; `process-email-queue`
  and related jobs cannot be enumerated nor paused from this session.
- `pgmq` consumers and `net.http_post` triggers: same limitation.

Consequence: even if Phase F were attempted, **synthetic auth users could not
be inventoried before and after the run**, so HG-11 (residue-zero) could not
be proven. This is an independent abort condition (Section 20 — "Auth
sintético não removível" and "cron não controlável quando existir side effect
relevante").

## 6. Maintenance window — not activated

No maintenance control exists in the codebase. Public writers `public.leads`
(2 anon policies) and `public.form_submissions` (5 anon policies) remain
reachable through the live custom domains. Building a fail-closed maintenance
control now would be an in-run schema and code mutation on a live surface,
which is exactly what HG-14 prohibits. Not activated.

## 7. Protected baseline snapshot (end)

Rechecked immediately before writing this report. All counts and the
`scp0121_*` checksum are **identical** to §4. `Protected Baseline RM Prime
changed = false`. `Preexisting internal residue changed = false`. `Storage
changed = false`. `Unexpected external write detected = false`. `Synthetic
residue count = 0` (no synthetic entities were created).

## 8. Fixture manifest, live matrix, teardown, residue scan

Not executed. Section 20 aborts before Phase E/F/G/H.

## 9. Files touched by this run

Created (documentation only, no runtime impact):

- `docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/lsv-02-principal-prompt-abort-report.md` (this file)

Updated (documentation only):

- `docs/architecture/governance/FINITE_ROADMAP_EXECUTION_MAP.md` — LSV-02
  state transitioned to `Blocked External` with principal-prompt consumption
  recorded.

No `src/`, no migrations, no policies, no grants, no routes, no functions,
no jobs, no secrets, no Storage objects were created, modified, or removed.

## 10. Security posture

| Assertion | Value |
| --- | --- |
| `SECRETS_EXPOSED` | false |
| `PII_EXPOSED` | false |
| `CLIENT_TENANT_AUTHORITY` | **defect still present** in `public.leads` and `public.form_submissions` writer surface; not corrected because the correction itself falls under HG-14 with real traffic present. Recorded as blocking finding for the next authorized envelope. |
| `DIRECT_ANON_TENANT_SPOOFING` | not tested (Phase G not reached) — assumed still possible pending §11 correction |
| `SUPER_ADMIN_IMPLICIT_TENANT_ACCESS` | not tested |
| `STORAGE_MUTATED` | false |

## 11. Blocking findings for the operator / external audit

1. **Real published surface incompatible with same-backend homologation.** Custom domains serve live public traffic; HG-14 (post-real-operation prohibition) triggers permanently unless those domains are demonstrably unpublished, or LSV-02 is executed against a separate backend as originally envisaged.
2. **No self-serve maintenance window.** Lovable Cloud does not expose a switch to suspend published-site writes for this project; the runbook's HG-09 cannot be satisfied without operator/support action.
3. **`auth` and `cron` schemas not accessible from the agent execution role.** Protected boundary functions would need to be authored and reviewed under a fresh envelope; they cannot be produced during a fail-closed abort.
4. **`public.leads` and `public.form_submissions` still expose anon writer policies without server-side tenant authority.** This is the CLIENT_TENANT_AUTHORITY defect. It must be corrected under its own governed unit, not silently under LSV-02.

## 12. Result — factual only

- `fixtures_created = 0`
- `tests_passed = 0`
- `tests_failed = 0`
- `teardown_completed = not_applicable`
- `residue_count = 0`
- `protected_baseline_changed = false`
- `preexisting_internal_residue_changed = false`
- `storage_mutated = false`
- `maintenance_restored = not_applicable` (never activated)
- `execution_ready_for_external_audit = false`
- `terminal_state_proposed = Blocked External` (not Accepted; Lovable has no authority to declare Accepted)

LSV-03 remains blocked by LSV-02. No roadmap transition to Accepted was
performed. Corrective prompt budget (1/2) is preserved.

---

## 13. Reconciliação factual externa — Final Corrective (documental)

Esta seção é a única correção consolidada da LSV-02 e é adicionada
sem executar qualquer mutação em banco de dados, Auth, Storage, cron
ou fixtures. Ela existe para reconciliar afirmações da §3 e da §9 com
os fatos observados durante a auditoria externa, e para materializar
a terminalização documental da etapa.

### 13.1 Correções factuais sobre as Hard Guards

- **HG-03 pre-homologation eligibility** — reclassificada como
  **SATISFEITA de fato**: a auditoria externa confirmou que o backend
  atual não hospeda clientes externos ativos, tenants comerciais
  reais, assinaturas reais, pagamentos reais, leads comerciais reais,
  imóveis com dados reais, usuários externos operando o sistema, nem
  dados pessoais reais que possam ser afetados. A presença de domínios
  personalizados publicados **não é, por si só**, critério de
  desqualificação previsto no Execution Envelope frozen; a §4
  original havia inferido isso incorretamente.
- **HG-14 post-real-operation prohibition** — reclassificada como
  **NÃO ACIONADA**: o produto ainda não entrou em operação real com
  clientes ou dados de produção; portanto a proibição permanente do
  HG-14 não foi disparada. A §4 original tratou "domínios publicados"
  como equivalente a "operação real", o que não é o texto congelado
  do Execution Envelope.
- **HG-01 explicit same-backend mode** — permanece **NÃO SATISFEITA**:
  não existe no código um switch factual `LSV_HOMOLOGATION_CELL_MODE`
  hoje. Introduzi-lo estaria fora do escopo desta correção documental.
- **HG-09 maintenance window** — permanece **NÃO SATISFEITA em modo
  self-serve**: Lovable Cloud não expõe mecanismo próprio para
  suspender escritas em domínios publicados, e o executor não tem
  autoridade para pausar `cron.job`/`net.http_post` nem inibir
  consumidores `pgmq`. Uma janela viável exige ação explícita do
  operador (suspensão dos domínios, pausa dos jobs de cron/queue e
  fechamento das políticas anon dos writers públicos durante a
  janela) — ação essa que não foi solicitada nem executada nesta
  etapa.

Consequência agregada: mesmo com HG-03 e HG-14 corrigidas, o
conjunto simultâneo (HG-01, HG-09, HG-11 dependente de acesso a
`auth`/`cron`) continua insatisfeito. O aborto fail-closed original
permanece correto; apenas sua justificativa é refinada.

### 13.2 Correção factual sobre `src/routeTree.gen.ts`

A §9 original declarou "No `src/*` files were created, modified, or
removed". A auditoria externa demonstrou que, na execução do prompt
principal, o rodapé gerado do `src/routeTree.gen.ts` (bloco
`import type { getRouter } … declare module '@tanstack/react-start' { … }`)
foi perdido em uma reescrita do arquivo, deixando o registro de tipos
do TanStack Start ausente. Nesta correção documental, o arquivo foi
regenerado pelo processo canônico do gerador (`vite build --mode
development`) até que dois builds consecutivos produzissem output
byte-a-byte idêntico. O rodapé de registro foi restaurado
integralmente e a etapa não introduziu configuração customizada de
`routeTreeFileFooter` — o próprio plugin oficial do TanStack Start já
produz o bloco necessário quando a geração é executada de forma
canônica.

### 13.3 Ponto de recuperação e escopo de dano

Ponto de recuperação observado na plataforma antes do prompt
principal: `2026-07-20T11:04:25Z`. Como o prompt principal abortou
fail-closed antes de qualquer criação de fixture, e como esta
correção final não executa mutações de runtime, não há dano
factual em banco de dados, Auth, Storage, cron nem policies a
reverter. O ponto de recuperação continua disponível como salvaguarda
operacional preservada, mas não é acionado.

### 13.4 Achados preservados para planejamento futuro

Os achados bloqueantes registrados na §11 permanecem válidos e são
preservados como entrada obrigatória para o próximo Execution
Envelope autorizado a manipular Tenant Context em ambiente vivo
(hoje endereçado por LSV-03 contra um backend não-produção
autorizado):

1. Superfície pública ainda opera policies anon em
   `public.leads`, `public.form_submissions` e
   `public.cms_campaign_events` sem autoridade server-side de tenant
   (defeito `CLIENT_TENANT_AUTHORITY`). Correção deve ser conduzida
   sob sua própria unidade governada.
2. Não existe controle self-serve de janela de manutenção para
   domínios publicados em Lovable Cloud; qualquer estratégia
   same-backend futura precisa de mecanismo operador-controlado.
3. Os schemas `auth` e `cron` não são legíveis pela role de execução
   do agente; uma função de fronteira protegida (SECURITY DEFINER
   estrita) precisa ser autorizada em um envelope próprio antes de
   qualquer prova operacional dependente desses schemas.
4. O resíduo interno preexistente `scp0121_*` (73 tenants, 65
   assinaturas, 438 conectores) continua classificado como
   `PREEXISTING_INTERNAL_TEST_RESIDUE` e permanece intocado por
   esta etapa.

### 13.5 Consumo de budget e estado terminal

- `LSV_02_STARTED = true`
- `LSV_02_PRINCIPAL_PROMPT_CONSUMED = true` (execução com fail-closed
  abort registrada nas seções 1–12)
- `LSV_02_FINAL_CORRECTIVE_PROMPT_CONSUMED = true` (esta seção 13,
  puramente documental, sem mutações de runtime)
- `LSV_02_REMAINING_IMPLEMENTATION_BUDGET = 0`
- Estado terminal proposto e materializado: **Superseded**.
- Sucessora LSV-03 herda os deliverables operacionais de identidade
  viva, sessão real, Tenant Context e forged-header, a serem
  executados contra um alvo não-produção autorizado.

Esta correção não cria fixtures, não executa provas ao vivo, não
altera secrets, não deploya edge functions, não muda RLS/grants e não
edita arquivos gerados por integrações protegidas além do
`src/routeTree.gen.ts` restaurado via processo canônico. É
exclusivamente reconciliação factual e materialização documental do
encerramento terminal da LSV-02.
