# PR-M2 — Product Owner Execution Decisions

## Status

**Active and binding for PR-M2 implementation and the future delivery sequence**

```text
DECISION_DATE = 2026-07-28
DECISION_AUTHORITY = Product Owner — Rodolfo
EXECUTION_MODEL = ChatGPT GitHub-native
LOVABLE_EXECUTOR_AUTHORIZED_FOR_PRM2 = false

PRM2_IMPLEMENTATION_AUTHORIZED = true
PRM2_IMPLEMENTATION_BRANCH = agent/pr-m2-functional-completion
PRM2_IMPLEMENTATION_PR = 60

DCA01_REQUIRED = true
BCA01_REQUIRED = true
HYBRID_INTEGRATION_POLICY = binding
DOCUMENTATION_CHANGE_POLICY = living_audited_documentation
UI_CONTRACT_COMPLETENESS = mandatory
```

## 1. Autoridade e efeito

Este documento registra decisões explícitas do Product Owner e prevalece, dentro do escopo abaixo, sobre qualquer trecho documental anterior que ainda:

- trate o modelo de integração como indefinido quando a alternativa `HYBRID` estiver disponível;
- classifique Domain/Cloudflare Activation ou Billing/Commercial Activation como escopo futuro sem etapa executável nomeada;
- trate documentação funcional, arquitetural ou de produto como imutável após descoberta de evidência nova em testes ou implementação;
- omita da futura interface opções operacionais já previstas nos contratos do produto.

O histórico não deve ser reescrito. Trechos antigos permanecem como evidência temporal, mas não possuem autoridade vigente contra estas decisões.

## 2. Correção permanente de governança do executor

```text
LOVABLE_PROMPT_BUDGET = applicable_only_when_lovable_executes
LOVABLE_FINITE_PROMPT_SCOPE = applicable_only_when_lovable_executes

CHATGPT_GITHUB_NATIVE_PROMPT_BUDGET = not_applicable
CHATGPT_GITHUB_NATIVE_COMMIT_LIMIT = none
CHATGPT_GITHUB_NATIVE_ITERATION_LIMIT = none
CHATGPT_GITHUB_NATIVE_INTERNAL_DECOMPOSITION = allowed
```

A execução GitHub-native pode utilizar múltiplos commits, ciclos de teste, correções e decomposição técnica dentro de uma única branch e de um único Pull Request principal. O executor não deve criar auditorias ou prompts intermediários apenas para revalidar fatos que não mudaram no GitHub.

A arquitetura, a segurança, a revisão do diff e o Release Gate exact-head permanecem obrigatórios.

## 3. Política vinculante de integração híbrida

Sempre que uma integração possuir opções `MANUAL`, `AUTOMATED` e `HYBRID`, o modelo canônico será:

```text
INTEGRATION_MODEL = HYBRID
```

O modelo híbrido significa que o produto deve suportar simultaneamente:

1. operação assistida/manual para contingência, onboarding inicial, provedores sem API suficiente e recuperação operacional;
2. operação automatizada por API, webhook, feed, job ou adapter quando tecnicamente disponível;
3. status, diagnóstico, retry, idempotência, auditoria e rollback coerentes entre os dois caminhos;
4. seleção explícita do modo por configuração autorizada, nunca por heurística silenciosa;
5. nenhuma duplicação de autoridade, tenant resolution ou regra comercial.

A política aplica-se, no mínimo, a:

```text
DOMAINS_AND_CLOUDFLARE = HYBRID
PORTAL_CONNECTORS = HYBRID
META_ADS = HYBRID
GOOGLE_ADS = HYBRID
LINKEDIN_ADS = HYBRID
TIKTOK_ADS = HYBRID
FUTURE_MARKETING_CHANNELS = HYBRID_WHEN_MANUAL_AND_AUTOMATED_MODES_EXIST
```

`HYBRID` não autoriza fallback heurístico. Cada caminho deve ser explícito, validado, observável e tenant-scoped.

## 4. Sequência obrigatória do roadmap

A sequência futura passa a ser:

```text
PR-M2 — Functional Completion
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

DCA-01 e BCA-01 são obrigatórias e devem ser concluídas antes da PR-M3, para que a interface final seja construída sobre contratos operacionais reais, e não placeholders.

A existência dessas etapas não reabre Fases 2, 3 ou 4. Elas ativam e completam capacidades de produto sobre as fundações aceitas.

## 5. DCA-01 — Domain & Cloudflare Activation

DCA-01 terá como resultado obrigatório um fluxo híbrido completo para domínios:

```text
DOMAIN_INTEGRATION_MODEL = HYBRID
CLOUDFLARE_INTEGRATION_MODEL = HYBRID
```

Escopo mínimo:

- cadastro e validação de domínio customizado;
- configuração manual assistida e automação por API;
- geração e verificação de DNS/TXT;
- lifecycle de SSL;
- canonical host;
- redirects;
- anti-takeover;
- publicação e despublicação;
- rollback;
- credential references seguras;
- jobs, retries e idempotência;
- status e diagnósticos operacionais;
- auditoria;
- isolamento por tenant;
- Super Admin tenant-scoped somente por impersonação explícita.

## 6. BCA-01 — Billing & Commercial Activation

BCA-01 terá como resultado obrigatório a ativação comercial real, preservando os contratos da Fase 4.

Escopo mínimo e ordem arquitetural:

1. authorization boundary específico para billing/commercial admin;
2. provider real de billing;
3. subscription lifecycle operacional;
4. checkout;
5. webhooks idempotentes do provider;
6. customer billing portal;
7. conciliação de pagamentos e transições;
8. MRR e receita realizada;
9. status, auditoria e diagnósticos comerciais;
10. superfícies tenant e Super Admin coerentes com os limites de autoridade.

Mapeamento das capacidades já catalogadas:

```text
COM-017 = BCA-01 authorization foundation
COM-013 = BCA-01 real provider
COM-014 = BCA-01 checkout
COM-015 = BCA-01 provider webhooks
COM-016 = BCA-01 customer portal
COM-019 = BCA-01 realized MRR and revenue
```

## 7. Contrato obrigatório para a futura PR-M3

A documentação de backend, domínio, integrações e produto deve chegar à PR-M3 sem lacunas que obriguem novo redesenho funcional.

Para cada área, a documentação deve enumerar todas as opções previstas, incluindo:

- estados;
- transições;
- modos manual, automatizado e híbrido;
- permissões;
- erros determinísticos;
- empty states;
- loading e retry states;
- diagnostics;
- rollback e recovery;
- filtros e cardinalidades;
- visibilidade tenant e Super Admin;
- restrições de impersonação;
- opções habilitadas, indisponíveis e futuras;
- contratos de API, adapters e dados necessários à interface.

```text
UI_MAY_HIDE_SUPPORTED_OPERATIONAL_OPTION = false
UI_MAY_INVENT_UNDOCUMENTED_AUTHORITY = false
UI_MUST_REPRESENT_ALL_SUPPORTED_STATES = true
UI_MUST_REPRESENT_HYBRID_MODES = true
```

A PR-M3 permanece responsável pela apresentação final, densidade, composição, hierarquia, responsividade, acessibilidade e UX/UI profissional. Ela não deve precisar redefinir regras de domínio que deveriam estar fechadas nas etapas anteriores.

## 8. Política de documentação viva e auditada

Todas as áreas documentais do sistema estão flexibilizadas para alterações necessárias descobertas durante:

- implementação;
- testes determinísticos;
- testes end-to-end;
- auditoria direta do GitHub;
- UAT;
- validação de segurança;
- evolução funcional aprovada pelo Product Owner.

Essa flexibilidade não significa ausência de governança. Toda alteração deve:

1. refletir evidência real ou decisão explícita;
2. preservar histórico e marcar conteúdo superseded quando aplicável;
3. manter uma única autoridade vigente por assunto;
4. atualizar contratos correlatos para evitar divergência entre arquitetura, produto e interface;
5. ser versionada no GitHub e auditável no diff;
6. preservar invariantes de tenant, autorização, segurança e fail-closed;
7. não restaurar estados `Rejected`, `Superseded` ou apenas históricos como autoridade atual.

```text
DOCUMENTATION_IS_IMMUTABLE = false
DOCUMENTATION_IS_ARBITRARILY_MUTABLE = false
DOCUMENTATION_IS_LIVING_VERSIONED_AND_AUDITABLE = true
TEST_DISCOVERY_MAY_CHANGE_DOCUMENTATION = true
PRODUCT_OWNER_DECISION_MAY_CHANGE_DOCUMENTATION = true
```

## 9. Estado atual da PR-M2

```text
PRM2_IMPLEMENTATION_AUTHORIZED = true
PRM2_IMPLEMENTATION_STARTED = true
PRM2_IMPLEMENTATION_BRANCH = agent/pr-m2-functional-completion
PRM2_IMPLEMENTATION_PR = 60
PRM2_IMPLEMENTATION_PR_DRAFT = true
PRM2_EXECUTOR = ChatGPT GitHub-native

DCA01_STATE = Planned — Required after PR-M2
BCA01_STATE = Planned — Required after DCA-01
PRM3_STATE = Planned — Blocked by BCA-01
```

A PR-M2 continua em execução incremental no PR #60. DCA-01 e BCA-01 não devem ser iniciadas dentro da PR-M2, mas suas fundações e contratos necessários não podem ser removidos ou contraditos.