# 121 — PR-PH.0 — Pre-Homologation Product Readiness Impact Analysis

**Status:** Ready for External Audit
**Roadmap namespace:** Product Roadmap · Pre-Homologation Product Readiness
**Depends on:** Phase 4 Closing Review — Accepted; Architectural
Roadmap · Fase 4 — SaaS Commercial Platform — Closed / Accepted.
**Blocks:** PR-PH.1 … PR-PH.12; TH-001 … TH-006; homologação.

Cross-reference:
[`docs/architecture/impact-analysis/PR-PH-0-pre-homologation-product-readiness-impact-analysis.md`](../../../architecture/impact-analysis/PR-PH-0-pre-homologation-product-readiness-impact-analysis.md).

Esta execução consolida, dentro da própria PR-PH.0, as
correções finais apontadas pela auditoria crítica externa:
inventário repository-grounded encerrado, roadmap reconciliado,
dependências serializadas, ownership de aliases restrito à
PR-PH.1, autoridade única de branding, contrato da PR-PH.12
endurecido e evidências de validação factualmente exatas.

## 1. Baseline e commit

- **Baseline vinculante desta correção:**
  `2fed1e8bfe8d262b31fb5c5e02fa8c3f28a958aa` — “Corrigiu
  PR-PH.0 factualmente”.
- **HEAD observado no preflight:** idêntico ao baseline
  (`git log -1 --oneline` → `2fed1e8 Corrigiu PR-PH.0
  factualmente`; `git status --short` vazio; nenhum commit
  intermediário entre baseline e HEAD).
- **HEAD final desta correção:** um único commit descendente
  do baseline materializado pela plataforma (o arquivo
  versionado não carrega auto-referência ao próprio SHA).
- **Commits explicitamente proibidos como baseline
  operacional desta nova execução:**
  `5c9ff73112797efd3bb59e4b157cb02f0b055905`,
  `7c75d27709a344c801ec79bda16e88599e81531a`, `38f13c5`.
  Esses commits aparecem apenas como referência histórica;
  o único baseline operacional é `2fed1e8...`.
- `git diff --check` — clean após as edições.
- 93 arquivos de migration versionados no repositório
  auditado; estado remoto de aplicação **not verified** pelo
  repositório (validação em PR-PH.11 / PR-PH.12). Runtime,
  RLS, grants, providers, `package.json` e lockfile
  inalterados por esta execução.

## 2. Escopo autorizado e fora de escopo

Alterados nesta correção **apenas os arquivos cujo conteúdo
final realmente difere do baseline**:

- `docs/architecture/impact-analysis/PR-PH-0-pre-homologation-product-readiness-impact-analysis.md`
  (modified — substituições integrais em §6 CRM, §12 Tenant
  Domain Management/Public Tenant Resolution, §14.4 matriz de
  autorização por operação, §14.5 tabelas, §19.5 renomeada
  para Public Tenant Resolution + White-Label, §19.8 Custom
  Domain Lifecycle, §19.10 boundary de `buildBrandingCss`,
  §19.13 ledger determinístico, §24 validações).
- `docs/delivery/product-roadmap/pre-homologation-product-readiness/121-pr-ph-0-pre-homologation-product-readiness-impact-analysis.md`
  (modified — este arquivo).
- `docs/architecture/ROADMAP_ARCHITECTURAL.md` — **não
  alterado nesta correção**; o conteúdo do baseline já
  reflete PR-PH.0 como Ready for External Audit e a sequência
  vinculante segue registrada no artefato canônico. O
  arquivo não aparecerá em `git diff --name-status
  2fed1e8...HEAD`.

Fora de escopo: runtime; componentes React; rotas; server
functions; adapters; hooks; migrations; schema; tabelas; RLS;
grants; seeds; fixtures; providers; storage; package.json;
lockfile; bibliotecas; branding em produção; dashboard; CRM;
Kanban; CMS; domínios; onboarding. Fase 4 permanece **Closed /
Accepted**.


## 3. Inventários encerrados na PR-PH.0

Substituíram formulações genéricas remanescentes por evidência
direta. Nenhuma etapa futura é responsável por descoberta
básica; etapas futuras apenas decidem, implementam, corrigem,
executam cutover, endurecem ou testam.

1. **Blocos do page builder** (`§10`) — matriz completa por
   `id (type)`: `hero`, `richtext`, `image`, `gallery`, `video`,
   `cta`, `form`, `features`, `faq`, `spacer`. Evidência direta
   em `src/lib/api/pages.functions.ts` (schema Zod
   `blockSchema` + tipo `CmsBlock`),
   `src/components/content/blocks/BlockEditor.tsx` (editores) e
   `src/components/site/CmsPageRenderer.tsx` (renderers
   públicos). Todos os blocos possuem schema/editor/renderer
   pareados; nenhum é apenas declarado, sem renderer ou sem
   editor. Sanitização formal: **ausente** em `richtext`
   (crítico), `video.embed_url` e `cta.botao_href`. Testes por
   bloco: **ausentes**. PR-PH.7 é responsável por implementar
   sanitização, allowlist, contratos ARIA e testes por bloco —
   não pela descoberta.
2. **White label** (`§9.2`) — inventário exato dos campos
   suportados hoje pela autoridade única `site_settings`
   (evidência: `interface SiteSettings` em
   `src/lib/api/site.functions.ts:32-…`): `branding`
   (5 campos), `branding_v2` (9 campos, incluindo cores e
   fontes aplicadas via `buildBrandingCss`), `empresa`
   (8 campos institucionais), `footer` (7 campos), `seo_global`
   (6 campos), além de `home_hero`, `home_secoes`,
   `home_diferenciais`, `home_depoimentos`, `pagina_sobre`,
   `pagina_lancamentos`, `contato`. Persistência: `site_settings`
   + `site_settings_versions`. Renderização: `buildBrandingCss`
   em `src/routes/__root.tsx` + consumo em
   `src/components/site/{Header,Footer,WhatsAppFab,CmsPreviewOverlay}.tsx`.
   Regra de autoridade única formalizada em `§9.4`.
3. **Prontidão operacional** (`§15`) — matriz por item com
   classificação canônica: ambientes; variáveis por nome;
   secrets por nome; 93 migrations; seed; backup/restore;
   observabilidade; logs; error reporting; alertas; health
   checks; rate limits; cron; webhooks; e-mail; WhatsApp;
   analytics; auditoria CMS; runbooks; rollback; LGPD/retenção/
   exportação/exclusão; suporte. PR-PH.11 implementa/valida
   lacunas; não redescobre.
4. **Semântica CRM** (`§6`) — descoberta encerrada com
   evidência exata. `ganho`, `perdido`, `descartado` são
   status do enum `leads.status`. `descartarLead`
   (`src/lib/api/leads-crm.functions.ts:37`) valida motivo
   em `lead_discard_reasons`, atualiza `leads.status='descartado'`
   e `discard_reason_id`, e insere em `lead_descartes`; o
   handler TypeScript **não** grava `descartado_at`
   diretamente — o preenchimento observado ocorre no banco
   via trigger `tg_leads_enforce_status_flow`
   (`supabase/migrations/20260701234123_...sql:154`).
   `reabrirLead` (`:156`) exige `ensureAdmin` e aplica
   `status='novo'`, `discard_reason_id=NULL`,
   `descartado_at=NULL` — **não** restaura status anterior.
   `listarLeadsDescartados` (`:133`) possui **Existing
   runtime fallback path** (segundo SELECT sem alias FK em
   caso de erro) inventariado para correção em PR-PH.3.
   Tabelas reais: `lead_discard_reasons`, `lead_descartes`,
   `deal_lost_reasons`, `lead_perdas` — o nome
   `discard_reasons` não existe no schema.
5. **Autorização atual** (`§14`) — matriz **por operação**
   (22 linhas), não por módulo. Cada linha registra rota,
   server fn com arquivo:linha, middleware, RPC, tenant
   resolution, `membership_status`, `tenant_role`,
   `app_role`/`has_role`, RBAC, entitlement, client Supabase,
   uso explícito de service role (linhas 4 `criarLeadManual`
   e 20 membership mutation comercial), tabela real, policy
   RLS, USING/WITH CHECK, migration de origem, audit event,
   teste real, lacuna e evidência arquivo:linha. Policies não
   diretamente localizadas são marcadas
   `Not evidenced in repository inspection` — nenhum
   substituto genérico é aceito. PR-PH.2 produz a matriz
   Accepted.


## 4. Sequência vinculante e ownership

Sequência **serial** obrigatória (PR-PH.1 → PR-PH.2 → PR-PH.3
→ PR-PH.4 → PR-PH.5 → PR-PH.6 → PR-PH.7 → PR-PH.8 → PR-PH.9 →
PR-PH.10 → PR-PH.11 → PR-PH.12). Cada contrato declara como
dependência a etapa imediatamente anterior Accepted, além das
dependências técnicas aplicáveis. Dependências técnicas
adicionais não removem o gate serial.

Ownership vinculante:

- **PR-PH.1** — autoridade exclusiva sobre mapa canônico de
  rotas, redirects e aliases administrativos; nunca executa
  cutover funcional do CRM.
- **PR-PH.3** — autoridade exclusiva sobre canonicalização
  funcional entre PipelinePage e EntityWorkspace(lead).
- **PR-PH.5** — decide autoridade de branding do workspace via
  Impact Analysis; proibido pré-autorizar `workspace_branding`
  ou qualquer segunda autoridade sobre os mesmos campos.
- **PR-PH.6** — CMS e conteúdo público; **consome** a política
  de aliases herdada de PR-PH.1; não cria, remove nem mantém
  redirects administrativos por conta própria; estratégia
  única de aliases (manter sob deprecation contract com
  critério objetivo de remoção).
- **PR-PH.12** — reexecução/consolidação obrigatória de todas
  as suítes críticas (unit, integração, E2E, visual, segurança
  + migrations, RLS, grants). Nenhuma suíte pode ser aceita
  silenciosamente.

## 5. Reconciliação do roadmap

Em `docs/architecture/ROADMAP_ARCHITECTURAL.md`, o bloco
anterior:

> Escopo futuro registrado para PR-PH.0 (não iniciado)

foi substituído por:

> Escopo consolidado pela PR-PH.0 — Ready for External Audit.

O texto esclarece que PR-PH.0 foi executada, ainda não foi
aprovada, PR-PH.1 permanece não iniciada e a homologação
permanece bloqueada. As entradas individuais PR-PH.1 … PR-PH.12
e TH-001 … TH-006 são preservadas.

## 6. Contradições eliminadas

- **CMS aliases** — `§19.6` (contrato PR-PH.6) unifica
  estratégia única (manter como aliases sob deprecation
  contract com critério objetivo de remoção) e transfere a
  autoridade decisória a PR-PH.1.
- **Branding — segunda autoridade** — `§9.4` proíbe
  pré-autorização de `workspace_branding`; classifica como
  alternativa sujeita a Impact Analysis em PR-PH.5, com
  condições explícitas de admissibilidade.
- **PR-PH.12 sem testes** — `§19.12` substitui os itens
  “Não aplicável” de testes por reexecução/consolidação
  obrigatórias, com comando, evidência, resultado esperado,
  condição de falha e proibição de aceite silencioso.
- **Dependências fora de série** — `§19.5`, `§19.6`, `§19.7`,
  `§19.8`, `§19.9` e `§19.12` explicitam o gate serial
  (etapa imediatamente anterior Accepted) além das dependências
  técnicas.
- **Descoberta delegada** — `§9.2`, `§10`, `§14`, `§15` e `§6`
  encerram a descoberta básica. Sem formulações do tipo
  “campos plausíveis”, “inventário futuro”,
  “auditar/consolidar em PR-PH.x”, “precisa validação em
  PR-PH.x”.

## 7. Comandos executados e evidência

**Preflight (real):**

- `git status --short` → vazio.
- `git log -1 --oneline` → `2fed1e8 Corrigiu PR-PH.0
  factualmente` (HEAD idêntico ao baseline vinculante
  `2fed1e8...`).
- `git log 2fed1e8..HEAD` → sem commits (baseline igual a
  HEAD antes da correção).
- `git diff --check` → clean.

**Após edições (comandos reais desta correção):**

- `bunx tsc --noEmit -p tsconfig.json` → sem erros; nenhuma
  alteração de TypeScript.
- `git diff --check` → clean.
- `git diff --name-status 2fed1e8bfe8d262b31fb5c5e02fa8c3f28a958aa`
  → apenas os arquivos listados em §2 aparecem; o roadmap
  **não** figura no diff.

**Buscas de reconciliação (comandos reais executados):**

```
rg -n "leads-crm\.functions\.ts:listarLeads|\
leads-crm\.functions\.ts:criarLead|descartado_at=now|\
restaura status anterior|tabela \`discard_reasons\`" \
  docs/architecture/impact-analysis/PR-PH-0-pre-homologation-product-readiness-impact-analysis.md \
  docs/delivery/product-roadmap/pre-homologation-product-readiness/121-pr-ph-0-pre-homologation-product-readiness-impact-analysis.md
```

Resultado real: **zero ocorrências factuais incorretas**. A
única linha que menciona literalmente a frase “restaura
status anterior” a **retifica** explicitamente (a
`reabrirLead` reseta para `status='novo'`).

```
rg -n "\bidem\b|as functions|via operação alvo|conforme tabela alvo" \
  docs/architecture/impact-analysis/PR-PH-0-pre-homologation-product-readiness-impact-analysis.md
```

Resultado real: **zero ocorrências na matriz de autorização
§14.4**. Ocorrências remanescentes em §7 (dashboard) e §10
(blocos CMS) referem-se a agrupamentos de células sob a
mesma autoridade e **não** à matriz de autorização.

```
rg -n "portal-engine\.server\.ts.*host|\
portal-engine\.server\.ts.*subdom|\
portal-engine\.server\.ts.*domain resolution" \
  docs/architecture/impact-analysis/PR-PH-0-pre-homologation-product-readiness-impact-analysis.md
```

Resultado real: **zero ocorrências** que tratem o portal
connector engine como host resolver.

```
rg -n "buildBrandingCss.*site\.functions" \
  docs/architecture/impact-analysis/PR-PH-0-pre-homologation-product-readiness-impact-analysis.md
```

Resultado real: **zero ocorrências**. `buildBrandingCss` é
reconhecida como função **local em `src/routes/__root.tsx`**;
PR-PH.10 detém a decisão explícita sobre extração/exposição.

```
rg -n "\bBASE_URL\b" \
  docs/architecture/impact-analysis/PR-PH-0-pre-homologation-product-readiness-impact-analysis.md
```

Resultado real: **zero ocorrências** como variável de
ambiente dos testes. A variável canônica é `QA_BASE_URL`
(default `http://localhost:8080` em
`tests/_helpers/session.py:20`).

**Confirmações estruturais:**

- Matriz de autorização por **operação** (22 linhas), não por
  módulo; policies não localizadas explicitamente marcadas
  como `Not evidenced in repository inspection`.
- Uso de `supabaseAdmin` (service role) documentado
  explicitamente onde ocorre (`criarLeadManual` — linha 4 da
  matriz; membership mutation comercial — linha 20).
- `x-tenant-id` classificado exclusivamente como transporte;
  nenhum bypass Super Admin tenant-scoped.
- Nenhuma função inexistente citada (`listarLeads`,
  `criarLead` em `leads-crm.functions.ts` foram removidas);
  nenhuma tabela inexistente citada como objeto físico
  (`discard_reasons` removida; `lead_discard_reasons`,
  `deal_lost_reasons`, `lead_perdas` usados).
- Ledger de testes (`§19.13`) distingue **comando
  documentado** de **ferramenta fixada**; `tsx`, Playwright
  Python, ferramenta de a11y e Vitest marcados como “not yet
  reproducible” / “Missing”.
- PR-PH.5 renomeada para **Public Tenant Resolution,
  Workspace and Public-Site White-Label Consolidation**
  (Caso B: resolver implementado mas desconectado); PR-PH.8
  renomeada para **Custom Domain Lifecycle** e passa a
  consumir a autoridade de PR-PH.5.

  started; Homologação Blocked.

Typecheck: `bunx tsc --noEmit -p tsconfig.json` — executado;
nenhum arquivo TypeScript alterado nesta execução.

## 8. Evidência Git

Diff efetivo desta execução (todos `M` — modified; nenhum
arquivo adicionado, removido ou renomeado):

| Tipo | Caminho |
|---|---|
| M | `docs/architecture/impact-analysis/PR-PH-0-pre-homologation-product-readiness-impact-analysis.md` |
| M | `docs/architecture/ROADMAP_ARCHITECTURAL.md` |
| M | `docs/delivery/product-roadmap/pre-homologation-product-readiness/121-pr-ph-0-pre-homologation-product-readiness-impact-analysis.md` |

Totais: 3 modified; 0 added; 0 deleted; 0 renamed. Nenhum
arquivo fora do escopo autorizado foi tocado.

## 9. Riscos remanescentes

- Dependência operacional preservada da role gerenciada
  `sandbox_exec` (Phase 4 §12; F4-CF-01 §6.2).
- Superfície concorrente `/admin/leads-workspace` × PipelinePage
  precisa cutover em PR-PH.3 antes do dashboard final
  (PR-PH.4).
- Sanitização ausente em `richtext` do page builder — XSS risk
  registrado; hardening em PR-PH.7.
- Divergência de constantes de alerta entre pipeline e
  dashboard — consolidar em PR-PH.3.
- Custom domain sem state machine é risco de takeover — não
  liberar homologação sem PR-PH.8.
- White label do site público sem hard gate de contraste —
  endurecer em PR-PH.5.
- Autoridade de configuração espalhada — consolidar em PR-PH.9
  com base na matriz de PR-PH.2.

## 10. Status final

- **Phase 4 Closing Review → Accepted.**
- **Architectural Roadmap · Fase 4 — Closed / Accepted.**
- **PR-PH.0 → Ready for External Audit.**
- **PR-PH.1 … PR-PH.12 → Planned; not started.**
- **TH-001 … TH-006 → Planned; not started.**
- **Homologação → Blocked** até conclusão e aceite da Product
  Readiness.
