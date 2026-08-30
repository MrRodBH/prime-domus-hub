# RM Prime SaaS — Migração Segura e Governança Integral

**Data de corte operacional:** 2026-08-25

**Última reconciliação:** 2026-08-26, durante `PCA-03_GITHUB_NATIVE_PRODUCT_SCHEMA_REBASELINE_CORRECTIVE_PLAN_MATERIALIZATION`

**Repositório:** `MrRodBH/prime-domus-hub`

**Branch canônica:** `main`

**Finalidade:** preservar integralmente a governança e o estado auditável do projeto em novos chats, sem depender do transcript histórico.

---

## 1. Regra de uso deste arquivo

1. Este é o handoff operacional compacto do Projeto ChatGPT.
2. O GitHub `main` revalidado no início de cada execução permanece a fonte técnica final.
3. Este arquivo não autoriza implicitamente um gate posterior.
4. O novo chat deve ler este arquivo integralmente, reauditar o estado remoto e executar somente o gate expressamente autorizado pelo Owner.
5. Documentos históricos incompatíveis não podem reabrir etapas encerradas nem substituir autoridade vigente.
6. Uma divergência de HEAD exige requalificação antes de qualquer write; hash histórico nunca deve ser usado como base cega.

---

## 2. Identidade, comunicação e formato

- Tratar o Owner por **Rodolfo**.
- Responder em português.
- Linguagem técnica, formal, objetiva, auditável e sem retrabalho.
- Instruções devem seguir CTDD: claras, técnicas, didáticas e detalhadas.
- Toda resposta ao Owner deve conter no máximo **10 linhas textuais reais**, incluindo síntese e próximo passo; títulos, bullets, tabelas e linhas de code fence contam individualmente.
- Quando a evidência não couber, registrar o detalhamento no GitHub e retornar somente síntese, decisão e próximo prompt dentro das 10 linhas.
- Em auditorias solicitadas ao Lovable, usar somente:
  - `## Síntese`;
  - `## Prompt para o Lovable corretivo ou próxima etapa`.
- Todo prompt operacional ao Lovable deve ficar em um único box pronto para copiar.
- Executor real deve ser identificado corretamente; não rotular como Lovable uma ação do Owner, GitHub, Cloudflare ou ChatGPT.
- Sínteses devem distinguir fato auditado, inferência, ressalva, bloqueio, decisão e próxima ação.

---

## 3. Produto e autoridades

```text
PRODUCT=Plataforma SaaS White Label para corretores de imóveis e imobiliárias
REPOSITORY=MrRodBH/prime-domus-hub
BASE_BRANCH=main
SAME_BACKEND_SUPABASE_PROJECT_REF=stmcnvzuzlyqammyycxj
PROTECTED_TENANT_ID=9664d189-4a12-4caa-8243-dc73383447e6
```

Ordem de autoridade diante de divergência:

1. GitHub `main` auditado no momento da execução;
2. PRs, issues, workflows e evidências terminais do GitHub;
3. documentos canônicos vigentes no repositório;
4. este arquivo de continuidade;
5. instruções permanentes do Projeto ChatGPT;
6. decisões explícitas posteriores do Owner;
7. Lovable, limitado ao papel autorizado;
8. chats e documentos históricos.

O Lovable não é autoridade final de código, CI ou merge. Relatório do Lovable sem confirmação no GitHub não é prova terminal de repositório.

---

## 4. Governança de execução integral

- `EXECUTION_MODE=end-to-end` quando o Owner autorizar um gate completo.
- Não solicitar novamente autorizações já concedidas dentro do envelope.
- Não interromper por impasse menor quando houver decisão segura dentro do escopo.
- Interromper somente por ação física indelegável, ausência real de credencial/conector obrigatório, drift factual inseguro, risco de mutação fora do escopo ou condição fail-closed sem sucessor autorizado.
- Não usar inatividade como estado terminal.
- Todo término deve emitir uma próxima ação CTDD concreta: continuidade autorizável, correção, rollback, desacoplamento ou estratégia segura.
- Um bloqueio não autoriza ampliar escopo, contornar segurança, usar credenciais alternativas ou criar backend paralelo.
- Ações externas e mutações devem respeitar exatamente a autorização atual; planejamento e leitura não autorizam writes.

---

## 5. Architecture First e entrega finita

- Architecture First é vinculante.
- Impact Analysis é obrigatório antes de mudança estrutural, runtime, banco, RLS, grants, Auth, Storage, provider ou cutover.
- Fluxo canônico:
  `Prompt → execução → relatório → auditoria direta → aprovação/correção → autorização do sucessor`.
- Cada etapa deve ter início, limite, escopo congelado, Definition of Done e estado terminal.
- Budget máximo por etapa:
  - 1 prompt principal;
  - 1 corretivo consolidado.
- Não criar lotes, sublotes ou IDs decimais artificiais para contornar budget.
- Estados terminais válidos:
  - `Accepted`;
  - `Accepted with Non-Blocking Backlog`;
  - `Blocked External`;
  - `Rejected`;
  - `Superseded`.
- Estado histórico, `Superseded` ou `Rejected` não volta a ser autoridade vigente.
- Falhas de PR devem ser corrigidas, revertidas ou isoladas antes do merge; nenhuma falha material pode chegar ao `main`.

---

## 6. GitHub e integridade de entrega

1. Confirmar `main` HEAD/tree e ancestry antes de qualquer branch ou commit.
2. Congelar `FILES_ALLOWED`, testes e proibições do gate.
3. Branch deve nascer do HEAD requalificado.
4. Proibidos force-push, rebase destrutivo, reset destrutivo e auto-merge.
5. Merge protegido por squash somente após auditoria do head exato e gates verdes.
6. Proteger o merge com o SHA esperado do head.
7. Após merge, reauditar `main` e exigir Release Gate pós-merge em sucesso.
8. `bun.lock` deve permanecer byte a byte quando o gate o congelar.
9. Dependência nova exige autorização expressa e integração atômica com lockfile.
10. Não alterar aplicação, migrations, workflows ou documentação fora do allowlist do gate.
11. PR #105 foi fechada administrativamente sem merge/rebase; a branch foi preservada e o backlog BCR permanece na issue #116.

---

## 7. Lovable, Supabase e custódia

- Projeto Lovable canônico: `982b91d8-946d-4103-8eb3-40ddbaeedbf4`.
- O backend gerenciado do projeto canônico é o Same-Backend vinculante.
- O Owner acessa Supabase somente pelo Lovable.
- Não instruir o Owner a abrir dashboard Supabase, executar SQL, usar Supabase CLI, obter `service_role` ou manipular segredo.
- Segredos nunca podem aparecer em chat, prompt, GitHub, logs, evidências ou documentação.
- Lovable pode executar somente inspeção/aplicação do Same-Backend Supabase e regras avançadas de UX/UI, quando expressamente autorizado.
- Lovable jamais pode receber instruções, consultas, correções, validações ou operações de GitHub/repositório; essas ações são exclusivamente GitHub-native.
- Toda governança originada no Lovable — inclusive `.lovable/plan.md`, planos salvos, mensagens, arquivos ou estado de preview — é histórica e não autorizadora, salvo quando o conteúdo exato tiver sido materializado, auditado e aceito no GitHub `main`.
- Se uma regra do Lovable divergir do GitHub, ela deve ser ignorada e substituída pela autoridade vigente do repositório; nunca pode bloquear, reordenar ou reabrir o roadmap.
- O retorno ao Lovable não restaura autoridade histórica: cada uso futuro permanece restrito ao Same-Backend Supabase ou UX/UI avançada, com autorização específica.
- `plan_mode` do Lovable não garante read-only: uma chamada aceita pode escrever `.lovable/plan.md` e sincronizar commit. Não usar Lovable para planejamento de governança, arquitetura ou repositório.
- Preview visual deve ser privado e não produtivo, salvo decisão posterior explícita.
- Produção/publicação no Lovable permanece ação exclusiva do Owner.
- Atualização do roadmap exige autorização explícita por execução. A autorização de 2026-08-25 vale apenas para a atualização pós-SEC-04B desta sequência.
- Não criar variante, projeto paralelo ou backend alternativo sem contrato específico.

---

## 8. Invariantes arquiteturais e de segurança

### Autoridade e multi-tenancy

- Servidor é a única autoridade de tenant, autorização, role, membership, entitlement, preço, status e decisão comercial.
- Client, query string, path, cookie ou header nunca estabelecem autoridade.
- `x-tenant-id` é apenas transporte e deve ser revalidado no servidor.
- Proibidos fallback heurístico, tenant default, dual path, dual authority, `ORDER BY/LIMIT 1` como resolução e primeira linha arbitrária.
- Ambiguidade deve falhar rápido e fechado.
- Super Admin somente acessa recurso tenant-scoped com impersonação explícita e auditável.
- Preservar RLS, grants, policies, boundaries de impersonação e TenantSelectionGate.

### Storage e mídia

- Bucket, path e filename enviados pelo client não são autoridade.
- Signed URL não é autorização primária.
- Upload e media registration permanecem server-authoritative.

### Runtime e domínio comercial

- Read models são server-owned.
- Operação indisponível não pode simular sucesso.
- Preservar `Registry`, `RegistrySnapshot`, `ResolutionGraph`, `ActionExecutor` e `PluginContext`.
- Plano/entitlement permanece interno e provider-agnostic.
- Referência do provider nunca estabelece tenant ou autorização.
- Cobranças recorrentes e extraordinárias permanecem distintas sob o envelope Hybrid Billing aceito.
- `sandbox_exec` não pode ser exposto a JWT, frontend, runtime, secrets ou credenciais sem nova Impact Analysis.

---

## 9. Same-Backend Homologation Cell — hard guards permanentes

- Identificar o projeto exato antes de qualquer mutação.
- Executar preflight de elegibilidade e baseline read-only.
- Proteger registry e objetos canônicos por identificadores estáveis.
- Usar somente fixtures sintéticas e claramente identificadas.
- Exigir no mínimo dois tenants técnicos quando a prova depender de isolamento.
- Não mutar tenant, usuário, domínio ou dado real/preexistente.
- Não limpar resíduos preexistentes sem gate próprio; os tenants `scp0121_*` continuam classificados como resíduo interno protegido.
- Proibir operações destrutivas globais e cleanup por glob/heurística.
- Usar janela de manutenção quando o contrato exigir.
- Preservar autoridade server-side, idempotência, anti-takeover e isolamento.
- Executar cleanup obrigatório de toda fixture criada pelo gate.
- Exigir zero resíduo novo ao término.
- Provar que a baseline protegida permaneceu invariável.
- Encerrar qualquer prova sintética quando iniciar operação real incompatível; HG-14 não pode ser acionado por inferência.
- Same-Backend permanece vinculante; Supabase externo não é fallback canônico.

---

## 10. Estados históricos preservados

- Fases 2, 3 e 4: `Accepted / Closed`.
- `LSH-01`: `Accepted / Closed`.
- `LSV-01`, `LSV-02` e `LSR-01`: `Superseded / terminal`.
- `WRI-01`: `Accepted / Merged / Closed`.
- `DCA-01`: terminal após teardown; não reabrir.
- `DCA-02`: `Accepted / terminal`; sem `custom_metadata` como autoridade.
- `BCA-01`: `Rejected / terminal`; não reabrir.
- BCR runtime: diferido como trilha separada e não bloqueante para construção PR-M3.
- PR #105: `closed/draft/unmerged`; branch preservada, sem reutilização nesta trilha.
- Produção/cutover: não autorizados.

Os anexos de julho que ainda apontam para LSR-02 são históricos e não autorizadores da PR-M3 atual.

---

## 11. Estado terminal — PR-M3-SEC-04B

### Autoridade de entrada

```text
SEC04A_MAIN_HEAD=7fe0231bc92ac3cb205414c351e5549114bb639a
SEC04A_MAIN_TREE=43b7fcc58f441da12d05687067a43711c1a67823
SEC04A_PR=134
SEC04A_TRACKING_ISSUE=133
POST_MERGE_RELEASE_GATE=808/SUCCESS
SEC04B_TRACKING_ISSUE=135
```

### Migration aplicada

```text
MIGRATION_VERSION=20260826002000
MIGRATION_FILE=supabase/migrations/20260826002000_pr_m3_sec_04a_consolidated_security_corrective.sql
MIGRATION_BLOB_SHA=8de35022cdc9fae1e2c9493d1d315c3cee5b062c
MIGRATION_LEDGER_EXACT_STATEMENT_MATCH=true
```

### Resultado

```text
PR_M3_SEC_04B_STATE=Accepted
PR_M3_SEC_04B_RESULT=PASS_SEC04B_TERMINAL
TARGET_TABLES=9
TARGET_FUNCTIONS=5
TABLE_FAILURE_COUNT=0
FUNCTION_FAILURE_COUNT=0
DEFAULT_ACL_FAILURE_COUNT=0
BUSINESS_ROW_COUNT_BEFORE=2
BUSINESS_ROW_COUNT_AFTER=2
BUSINESS_ROW_DML=0
POLICY_WRITES=0
FUNCTION_BODY_WRITES=0
AUTH_STORAGE_TENANT_MEMBERSHIP_DOMAIN_MUTATIONS=0
PROVIDER_WRITES=0
PRODUCTION_CUTOVER=false
```

### Efeito validado

- Grants de `anon`/`authenticated` removidos das 9 relações deny-by-default.
- `EXECUTE` de `anon`/`authenticated` removido das 5 funções server-only.
- `service_role`, RLS e zero-policy posture preservados.
- Resolvers públicos, helpers RLS e RPCs de negócio intencionais preservados.
- Default privileges futuros de `postgres/public` endurecidos.
- Migration reconciliada no ledger do Supabase sem DML de negócio.

---

## 12. Trilhas paralelas e proibições atuais

```text
PR_105_STATE=closed/draft/unmerged
PR_105_MERGE=false
BCR_RUNTIME=deferred_upstream/non_blocking_for_PRM3
PRODUCTION_PUBLISH=false
PRODUCTION_CUTOVER=false
REAL_TENANT_MUTATION=0
EXTERNAL_SUPABASE_FALLBACK=false
```

- Não reabrir, mesclar, rebasear, reconstruir, force-push, reverter ou ampliar PR #105 nesta trilha.
- O incidente LVR-01, no qual `plan_mode` alterou `.lovable/plan.md` e avançou o head da PR #105 de `37d047849696c5cbea2a8d9f971b09ea4375e8d6` para `6cf945b98bee584093633fc6d7678fbc5e1861c5`, deve ser reconciliado somente por evidência GitHub-native forward-only; a PR permanece aberta/draft/não mesclada.
- Não executar Stripe, Cloudflare, Wrangler, webhook, DNS, deploy ou secret write como consequência de SEC-04B.
- Não restaurar grants inseguros como rollback. Falha posterior exige migration forward-only.
- Não usar fix-all de linter.
- Não reabrir SEC-04A; ele permanece histórico repository-first.

---

## 13. Roadmap e inspeção

```text
ROADMAP_PROJECT_ID=4e4c1d1e-899c-4991-80ca-ebc110fbd23f
ROADMAP_PRIVATE_PREVIEW=https://id-preview--4e4c1d1e-899c-4991-80ca-ebc110fbd23f.lovable.app
ROADMAP_UPDATE_AUTHORIZED_FOR_THIS_SEQUENCE=false
ROADMAP_LAST_AUTHORIZED_UPDATE=completed_historical_after_SEC04B
ROADMAP_PRODUCTION_DEPLOY_AUTHORIZED=false
```

O roadmap privado preserva o último estado expressamente autorizado. Nenhuma atualização do site é autorizada por PCA-03; o sucessor vigente é resolvido pela seção 18 e pelo GitHub `main`.

---

## 14. Sucessor correto — não autorizado implicitamente

```text
NEXT_GATE=RESOLVE_FROM_CURRENT_GITHUB_MAIN_AND_OPEN_BACKLOG
NEXT_GATE_MODE=EXPLICIT_OWNER_AUTHORIZATION_REQUIRED
NEXT_GATE_AUTHORIZED=false
```

Regra permanente:

1. resolver o sucessor exclusivamente pelo `main`, pelas issues abertas e pela autorização atual do Owner;
2. não reutilizar instrução histórica do Lovable como gate;
3. manter LVR/variante privada bloqueado enquanto o suporte não corrigir ou esclarecer o contrato do conector;
4. manter BCR/PR #105 separado até gatilho upstream material;
5. permitir planejamento read-only paralelo, mas somente uma trilha mutável por vez;
6. exigir novo gate Architecture First para cada integração externa ou mudança estrutural.

---

## 15. Bootstrap CTDD vigente para o próximo chat

```text
Execute: @GitHub

RM PRIME SAAS — CONTINUIDADE PCA-03

EXECUTION_MODE=read-only_final_audit
REPOSITORY=MrRodBH/prime-domus-hub
BASE_BRANCH=main
EXPECTED_BASE_HEAD=d0632f471942bd638a57555ed5af63c5567e263b
PCA03_BRANCH=agent/pca-03-github-native-product-schema-rebaseline-plan
PCA03_PLAN=docs/architecture/impact-analysis/PCA-03-github-native-product-schema-rebaseline-corrective-plan.md
PR_105_MUTATION=false
LOVABLE_AGENT_CALLS=false
BACKEND_MUTATION=false
PROVIDER_MUTATION=false
PRODUCTION_PUBLISH=false

1. Reaudite o GitHub main e a PR PCA-03 exata.
2. Confirme que somente o plano PCA-03 e este arquivo de continuidade mudaram.
3. Confirme ausência de código, migrations, workflows, backend, provider e PR #105 writes.
4. Audite o plano de paridade, proteção dos 73 resíduos, transações, credenciais e rollback.
5. Não execute PCA-04 nem Same-Backend.
6. Entregue veredito e, somente após autorização específica do Owner,
   execute o merge protegido da PR PCA-03.
```

---

## 16. Política de desempenho e migração futura

1. Usar um chat novo por gate terminal complexo ou fatia vertical relevante.
2. Manter o chat anterior apenas como histórico.
3. Não reenviar transcript completo, mensagens duplicadas ou todos os prompts antigos.
4. Usar GitHub e este único arquivo como memória factual compacta.
5. Manter atualizações intermediárias curtas; evidências completas ficam em PR/issue.
6. Após cada gate terminal, atualizar este mesmo arquivo no repositório; não criar versões concorrentes `v1/v2/v3`.
7. Se houver monitoramento prolongado, usar automação separada e não manter um turno bloqueado por horas.
8. Se um novo chat responder normalmente, a lentidão anterior é classificada como sobrecarga específica do thread; falha local só deve ser considerada se vários chats/navegadores/redes reproduzirem o problema.

---

## 17. Reconciliação vinculante de backlog e autoridade Lovable — LVR-02H

```text
AUDITED_MAIN=5e6f394b555e2de3b4cfdaa20d051003c5c05d71
AUDITED_TREE=22217abe8b655950a39beaf1b9960bf49f714434
PR_105_STATE=closed/draft/unmerged
LOVABLE_GOVERNANCE_AUTHORITY=false
GITHUB_MAIN_FINAL_AUTHORITY=true
```

- `ARCH-12F-01`, `ARCH-12F-04A`, `ARCH-12F-04B`, `ARCH-TENANCY-01`, `DCA-02-BL2` repository proof e `DCA-02-BL1` diagnostic foram compostos e aceitos no `main` pela PR #114.
- `ARCH-12F-02` permanece pendente: `wrangler.jsonc` ainda fixa o nome do Worker e `supabase/config.toml` ainda fixa o project ref; qualquer correção exige gate Architecture First próprio.
- `ARCH-12F-03` permanece diferido upstream e é governado pela issue #116; não bloqueia PR-M3 e não autoriza mutação da PR #105.
- `ARCH-12F-03` revalidou o gatilho Wrangler 4.126.0, rejeitou o ProxyWorker
  ainda sujeito a requeue GET/HEAD e materializou em branch isolada um harness
  oficial `workerd@1.20260825.1`, sem provider/backend/deploy. A prova
  single-dispatch não reabre nem torna a PR #105 fonte de integração.
- O restore PITR real de `DCA-02-BL2` continua pré-produção, isolado e separadamente autorizável; writes de recovery `DCA-02-BL1` permanecem proibidos antes dessa prova terminal.
- Issues históricas devem refletir os estados aceitos, rejeitados ou superseded do `main`; checklist antigo não conserva autoridade executiva.
- O planejamento detalhado das capacidades de domínio, marketing, tracking, landing pages, CRM, notificações e portais fica registrado na evidência LVR-02H e não autoriza implementação ou provedor.

---

## 18. PCA-02/PCA-03 — Rebaseline corretivo do schema de produto

```text
PCA02_RESULT=FAIL_CLOSED_NOT_EXECUTION_READY
PCA03_STATUS=MERGED
PCA03_BASE_HEAD=d0632f471942bd638a57555ed5af63c5567e263b
PCA03_BASE_TREE=4bcf9e0c5ff655f48a63d92b2e60057a7f9f9dae
PCA03_BRANCH=agent/pca-03-github-native-product-schema-rebaseline-plan
PCA03_PR=139
PCA03_MERGED_MAIN=b4034948ef0b27275ccd7dd5f68c8c0a1b4eed5e
PCA03_PLAN=docs/architecture/impact-analysis/PCA-03-github-native-product-schema-rebaseline-corrective-plan.md
SAME_BACKEND_MUTATED=false
PR_105_MUTATED=false
```

- A PCA-02 confirmou 16 migrações PR-M2 ausentes do ledger, 45 tabelas e 57 colunas ainda ausentes no Same-Backend.
- A forma original não é executável: faria DML sobre todos os 74 tenants, incluindo 73 resíduos internos protegidos e 438 conectores.
- O checksum obrigatório dos 73 resíduos permanece `3ece053ddbdfce5161380ec38824ea91`; nenhum gate pode selecioná-los por prefixo, nome ou consulta ampla.
- A migração de portais não pode apagar 888 valores de credenciais; custódia, rotação e remoção exigem cutover reversível e gate destrutivo separado.
- Quatro migrações BCA/BCR existem somente no ledger live e permanecem quarentenadas, não autoritativas e fora da PR #105.
- `migration repair`, `db reset`, down migration, backfill global e adoção implícita de schema live estão proibidos.
- O plano PCA-03 exige manifest de paridade bidirecional, DDL separado de DML, provisionamento server-owned por IDs exatos, restore-cell privado e rollback forward-only.
- A PR documental PCA-03 foi aceita no `main`; seu plano é vinculante para PCA-04 e sucessores.

---

## 19. PCA-04 — Implementação corretiva GitHub-native

```text
PCA04_STATUS=ACCEPTED_MERGED_CLOSED
PCA04_SOURCE_MAIN=b4034948ef0b27275ccd7dd5f68c8c0a1b4eed5e
PCA04_SOURCE_TREE=3331f2b0ed967e4a38156257bdf7cf71100a7e6f
PCA04_BRANCH=agent/pca-04-product-schema-rebaseline-corrective-implementation
PCA04_PR=140
PCA04_EVIDENCE=docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pca-04-product-schema-rebaseline-corrective-implementation.md
PCA04_MANIFEST=docs/architecture/impact-analysis/manifests/PCA-04-product-schema-parity-manifest.json
PCA04_MERGED_MAIN=5e6f394b555e2de3b4cfdaa20d051003c5c05d71
SAME_BACKEND_MUTATED=false
PROVIDER_MUTATED=false
LOVABLE_AGENT_CALLED=false
PR_105_MUTATED=false
```

- As 16 migrações históricas foram corrigidas para transação explícita, DML de
  tenant por UUID exato e retenção de credenciais.
- A migração PCA-04 adiciona baseline server-owned, atômico e idempotente para
  novos tenants e backfill existente somente por manifesto exato com SHA-256.
- Os quatro artefatos BCA/BCR live-only seguem quarentenados; o ledger deve ser
  requalificado em PCA-06 porque a leitura atual foi negada por permissão.
- Nenhuma migração foi aplicada. PCA-05 em restore cell privado e isolado é
  obrigatório antes de qualquer consideração de Same-Backend.
- A PR #140 foi mesclada por squash protegido; nenhuma migration foi aplicada.

## 20. Autoridade de acesso para testes do produto final

```text
OWNER_TEAM_TEST_CANONICAL_URL=https://www.realone.com.br
PRODUCT_SURFACE=RM_PRIME_SAAS_FRONTEND_AND_SERVER_RUNTIME
DEPLOYMENT_PLATFORM=CLOUDFLARE
LOVABLE_PROJECT_CONNECTION=EXISTING_TO_BE_REVALIDATED_BEFORE_CUTOVER
SAME_BACKEND_SUPABASE=REMAINS_BINDING_FOR_DATA_AUTH_AND_STORAGE
TENANT_CUSTOM_DOMAINS=SEPARATE_PRODUCT_CAPABILITY
CURRENT_DEPLOY_OR_CUTOVER_AUTHORIZED=false
```

- Decisão vinculante do Owner em 2026-08-26: `www.realone.com.br` será o ponto
  canônico de acesso da equipe e do Owner para testar o produto SaaS final,
  incluindo frontend e runtime server/API publicados na Cloudflare.
- A conexão existente do domínio ao projeto Lovable deverá ser comprovada por
  leitura antes do gate de deploy; ela não concede ao agente Lovable autoridade
  sobre GitHub, CI/CD, runtime ou regras de governança.
- O Supabase Same-Backend permanece autoridade única de dados, Auth e Storage.
  Esta decisão não autoriza deploy, publicação, DNS, provider write, cutover nem
  substituição das regras de domínio por tenant.

---

## 21. ARCH-12F-02A — Externalização de identificadores de infraestrutura

```text
ARCH12F02A_STATUS=ACCEPTED_MERGED_CLOSED
ARCH12F02A_SOURCE_MAIN=5e6f394b555e2de3b4cfdaa20d051003c5c05d71
ARCH12F02A_SOURCE_TREE=22217abe8b655950a39beaf1b9960bf49f714434
ARCH12F02A_BRANCH=agent/arch-12f-02a-github-native-infrastructure-identifier-externalization
ARCH12F02A_PR=141
ARCH12F02A_MERGED_MAIN=b5bf74a4b9ec2de320518d217710ac35961056db
MIGRATION_FILE_MUTATION=false
BACKEND_MUTATION=false
PROVIDER_MUTATION=false
LOVABLE_AGENT_CALLS=false
```

- `wrangler.jsonc` tornou-se template não implantável; nome do Worker e account
  ID são validados e materializados apenas em arquivo efêmero ignorado, modo
  `0600`, sem `env` Wrangler nomeado.
- `supabase/config.toml` contém somente identidade local neutra; o ref remoto é
  selecionado explicitamente por `supabase link --project-ref` e o estado local
  de link não é versionado.
- Ausência, formato inválido, sufixo de ambiente divergente ou URL/ref Supabase
  incompatíveis falham fechado antes de qualquer provider.
- `ARCH-12F-02B` permanece separado para domínios/remetentes e configuração
  runtime/tenant; nenhum deploy ou cutover foi autorizado.

---

## 22. ARCH-12F-02B — Domínio tenant e remetente runtime

```text
ARCH12F02B_STATUS=IMPLEMENTED_IN_ISOLATED_BRANCH_AWAITING_PROTECTED_PR
ARCH12F02B_SOURCE_MAIN=b5bf74a4b9ec2de320518d217710ac35961056db
ARCH12F02B_SOURCE_TREE=a07ddc8ddc3d3a01554ca74d38eca3d955fa2169
ARCH12F02B_BRANCH=agent/arch-12f-02b-github-native-runtime-tenant-domain-sender-externalization
MIGRATION_FILE_MUTATION=false
BACKEND_MUTATION=false
PROVIDER_MUTATION=false
DEPLOY=false
LOVABLE_AGENT_CALLS=false
```

- Identidade de e-mail, domínio remetente, domínio `From` e origem Auth passam a
  ser entradas server-only obrigatórias, validadas e fail-closed.
- O sitemap deriva a origem canônica do mesmo registro de domínio que resolveu
  o tenant no servidor; headers forwarded não são autoridade.
- Canonicals de páginas públicas são relativos ao host já revalidado e
  redirecionado pelo Domain Authority; `og:url` versionado foi removido.
- Títulos das superfícies institucionais passam a usar a configuração publicada
  do tenant, sem identidade imobiliária fixa no código alterado.
- Nenhuma migration, provider write, backend write, DNS, deploy, cutover,
  produção ou chamada Lovable é autorizada ou executada por este gate.

---

## 23. PCA-05R/PCA-06 — Rehearsal aceito e impacto Same-Backend requalificado

```text
PCA05R_STATUS=ACCEPTED
PCA05R_PRIVATE_CELL_DELETED=true
PCA05R_PRIVATE_CELL_RESIDUE=0
PCA06_SOURCE_MAIN=0221bd1f8dd1f0a3d00a52057af9b621a2764edd
PCA06_SOURCE_TREE=d7112cd8407d3583b7af60745b367709f29a7d4f
PCA06_RESULT=ACCEPTED_READ_ONLY_REQUALIFICATION
CANONICAL_BACKEND_AUTHORITY=LOVABLE_MANAGED_BACKEND_ONLY
OWNER_SUPABASE_ACCESS=LOVABLE_ONLY
SAME_BACKEND_MUTATED=false
PROVIDER_MUTATED=false
DEPLOY=false
PR_105_MUTATED=false
```

- PCA-05R concluiu W1-W6 e o provisionamento sintético R2-R4 em célula privada,
  purgou Auth/dados sintéticos e atingiu aceitação somente após a exclusão
  definitiva do projeto Lovable e retorno direto `404 project_not_found`.
- PCA-06 revalidou pelo Lovable, somente com `SELECT`, que as 17 migrations de
  produto continuam ausentes do ledger e que as 45 tabelas/57 colunas esperadas
  continuam integralmente ausentes do schema físico.
- O ledger foi fechado em 4 correspondências exatas, 4 aliases semânticos —
  um com prelude de execução isolado — e 4 entradas commercial live-only que
  permanecem quarentenadas e não autoritativas.
- O baseline continua com 74 tenants, 73 resíduos protegidos, checksum MD5
  `3ece053ddbdfce5161380ec38824ea91`, 438/444 conectores protegidos e 888 campos
  sensíveis de portal retidos. Prefixo/nome nunca é autoridade de seleção.
- A postura SEC-04B permanece 9/9 relações com RLS, zero policies/client grants,
  `service_role` preservado e cinco funções internas negadas a
  `PUBLIC`/`anon`/`authenticated`.
- DCA-02-BL2/R2 permanece `DEFERRED_NON_BLOCKING` para desenvolvimento, testes
  e homologação, mas bloqueia prontidão/cutover de produção até a prova de
  recoverability pós-homologação.
- Esta materialização é somente GitHub. A aplicação W1-W6 no Same-Backend exige
  gate futuro separado, manifesto imutável de UUIDs exatos, Lovable como único
  executor, preflight live repetido e parada fail-closed na primeira divergência.

---

## 24. PCA-07/PCA-07R — W1 revertida e corretivo PostgreSQL materializado

```text
PCA07_SOURCE_MAIN=9e308ba596956f518a65f14e2df46d449dc9aeca
PCA07_FAILED_WAVE=W1
PCA07_FAILURE=operator does not exist: name[] = text[]
PCA07_FAILURE_BEFORE_COMMIT=true
PCA07_ROLLBACK_VERIFIED=true
PCA07_W1_LEDGER_ROWS=0
PCA07_W2_W6_EXECUTED=false
PCA07R_REPOSITORY_CORRECTIVE=FOUR_ATTNAME_TEXT_CASTS
SAME_BACKEND_MUTATED=false
PROVIDER_MUTATED=false
DEPLOY=false
PR_105_MUTATED=false
```

- O preflight PCA-07 confirmou novamente a baseline exata e o manifesto imutável
  de um único tenant autorizado.
- W1 falhou na migration `20260728180000` porque `pg_attribute.attname` agregava
  para `name[]`, enquanto os literais comparados eram `text[]`.
- A transação falhou antes de `COMMIT`; o ledger W1, o schema temporário e as
  funções de bootstrap permaneceram ausentes. W2–W6 não foram executadas.
- PCA-07R grava `a.attname::text` nas quatro agregações, reancora os manifests e
  remove a antiga transformação apenas em memória do bundle PCA-05R.
- Nenhuma reaplicação live é automática: exige merge protegido, reconciliação de
  `main`, novo preflight Lovable-managed e autorização Owner separada.

---

## 25. PCA-07R2 — W1 persistida sem ledger e reconciliação forense materializada

```text
PCA07R2_SOURCE_MAIN=a28f257c640a128327e9f0ce97974e48679fa05c
PCA07R2_INCIDENT=W1_COMMITTED_WITHOUT_LEDGER_TRANSPORT_DIVERGENCE
PCA07R2_W1_PHYSICAL_POSTCONDITIONS=true
PCA07R2_W1_LEDGER_ROWS=0
PCA07R2_CORRECTIVE_VERSION=20260828160617
PCA07R2_TOP_LEVEL_STATEMENTS=1
PCA07R2_W1_REPLAY=false
PCA07R2_BLIND_MIGRATION_REPAIR=false
PCA07R2_W2_W6_EXECUTED=false
PCA07R2_SAME_BACKEND_WRITES=0
LOVABLE_CALLS=0
DIRECT_SUPABASE_CALLS=0
PROVIDER_MUTATED=false
DEPLOY=false
ROADMAP_SITE_UPDATED=false
PR_105_MUTATED=false
```

- O retry PCA-07R retornou `INVALID_ARGUMENT`, mas persistiu integralmente as
  pós-condições físicas W1 sem registrar as versões `20260728165000` e
  `20260728180000` no ledger. W2-W6 permaneceram bloqueadas.
- A causa exata do transporte não foi presumida. O envelope anterior duplicava
  50.566 bytes de fonte, produzindo no mínimo 101.132 bytes antes do wrapper.
- PCA-07R2 gera uma única instrução `DO`; incorpora as fontes W1 uma vez, valida
  hashes, catálogo, ACL/RLS e invariantes protegidos, mas nunca executa os textos.
- Somente após todas as guardas, a mesma transação reconstrói as duas entradas
  exatas e a atestação PCA-07R2 usando o contrato de seis colunas observado no
  ledger Lovable-managed; três entradas já exatas formam no-op verificado,
  enquanto estado parcial ou divergente falha fechado.
- A aplicação futura deve usar uma fronteira Lovable-managed de instrução única
  que não gere uma entrada concorrente automaticamente e deve comprovar as três
  linhas por postflight read-only antes de W2.
- Esta etapa é somente GitHub. Aplicação Lovable-managed, publicação, PR, merge
  protegido e continuação em W2 exigem gates separados.
- A primeira execução da PR `#166` falhou fechada porque o seletor do teste de
  Closure PCA-05R acionava também o envelope privado legado. PCA-07R2R separa
  `pca_05r_closure` de `pca_05r`, preserva as guardas legadas e não altera SQL,
  estado Same-Backend ou autoridade Lovable-managed.
- A primeira aplicação Lovable-managed do SQL PCA-07R2 canônico falhou antes de
  qualquer `INSERT` com `P0001` de identidade lifecycle; postflight confirmou
  ledger `0/3`. O transporte preservou os 77.171 bytes e o SHA-256 versionado.
- PCA-07R2R2 provou a causa no gerador: um LF (`byte 10`) era acrescentado após
  cada delimitador de abertura, elevando os literais W1 em um byte. O corretivo
  remove somente esses dois prefixos, preserva byte a byte as fontes W1 e passa
  a validar por extração, tamanho e SHA-256 cada literal gerado.
- PCA-07R2R2 permanece repository-only. Nova aplicação exige publicação, PR,
  merge protegido e autorização Lovable-managed separada.

---

## 26. PCA-07 W2 — corretivo atômico e ledger-aware materializado

```text
PCA07_W2_SOURCE_MAIN=2ea96b2710b382944d9dfdcb8cae78eebd238dcf
PCA07_W2_SOURCE_TREE=b6d79b650ce575bee546e66395f97bf7ebd0ace8
PCA07_W2_RESULT=REPOSITORY_CORRECTIVE_IMPLEMENTED_NOT_EXECUTED
PCA07_W2_ENVELOPES=2_MIGRATION_LOCAL_ATOMIC
PCA07_W2_W1_LEDGER_PREREQUISITE=3/3_EXACT
PCA07_W2_LIVE_LEDGER=0/2
PCA07_W2_PORTAL_SECRET_ERASURE=false
PCA07_W2_SAME_BACKEND_WRITES=0
LOVABLE_CALLS=0
DIRECT_SUPABASE_CALLS=0
PROVIDER_MUTATED=false
DEPLOY=false
ROADMAP_SITE_UPDATED=false
PR_105_MUTATED=false
```

- O preflight read-only identificou quatro incompatibilidades: construtor JSON
  acima de 100 argumentos, handle Instagram incompatível com o validador HTTPS,
  dois defaults que recriavam segredos e uma `CHECK NOT VALID` que bloquearia
  atualizações nos 444 conectores com credenciais retidas.
- O builder deriva duas projeções executáveis dos arquivos W2 imutáveis e
  aplica configuração e portal em transações migration-local separadas.
- Cada envelope carrega sua fonte uma vez, grava o ledger dentro da mesma
  transação e executa postflight antes do `COMMIT`; replay cego é proibido.
- A remoção dos segredos e a futura `CHECK` permanecem no gate independente de
  cutover. Esta etapa não acessa nem altera o Same-Backend.

---

## 27. PCA-07 W2R — corretivo da asserção de autoridade UUID

```text
PCA07_W2R_SOURCE_MAIN=29bdcb5e2c643264c693a4d03bb8d52ea19577e6
PCA07_W2R_SOURCE_TREE=90da0cb3aa040174f1b5261c8e7091cbe3cb43d3
PCA07_W2R_PREFLIGHT_RESULT=FAIL_CLOSED_POSTGRES_42883
PCA07_W2R_AUTHORITY_ASSERTION=EXACT_TOTAL_AND_FILTERED_TARGET_COUNT
PCA07_W2R_POSTFLIGHT_LEDGER=0/3
PCA07_W2R_POSTFLIGHT_PHYSICAL=ABSENT
PCA07_W2R_SAME_BACKEND_WRITES=0
LOVABLE_CALLS=0
DIRECT_SUPABASE_CALLS=0
PROVIDER_MUTATED=false
DEPLOY=false
ROADMAP_SITE_UPDATED=false
PR_105_MUTATED=false
```

- O primeiro preflight W2 chegou ao PostgreSQL 17.6 canônico, mas falhou antes
  de qualquer write porque `min(uuid)` e `max(uuid)` não existem.
- O postflight read-only confirmou ledger W2 `0/3`, ausência física integral e
  baseline protegido inalterado.
- W2R exige uma linha total e uma linha igual ao UUID autorizado por contagens
  independentes; não ordena UUIDs nem amplia o manifesto.
- Esta etapa é repository-only. Publicação, PR, merge e novo preflight/aplicação
  Lovable-managed permanecem gates separados.

---

## 28. PCA-07 W3 — corretivo CMS/CRM transport-safe materializado

```text
PCA07_W3_SOURCE_MAIN=65e11c80c22f61929de340606be558cf26012f45
PCA07_W3_SOURCE_TREE=cb206ef3ceb61c49f2e731e716fdf8ee62e1a561
PCA07_W3_RESULT=REPOSITORY_CORRECTIVE_IMPLEMENTED_NOT_EXECUTED
PCA07_W3_ENVELOPES=2_ORDERED_CMS_THEN_CRM
PCA07_W3_LEDGER_BEFORE_IMPLEMENTATION=0/3
PCA07_W3_UUID_AGGREGATE_REWRITES=5
PCA07_W3_TRANSITION_SIGNATURE=INTEGER
PCA07_W3_CANONICAL_MIGRATION_MUTATION=false
PCA07_W3_SAME_BACKEND_WRITES=0
LOVABLE_CALLS=0
DIRECT_SUPABASE_CALLS=0
PROVIDER_MUTATED=false
DEPLOY=false
ROADMAP_SITE_UPDATED=false
PR_105_MUTATED=false
```

- O preflight Lovable-managed e somente leitura confirmou W1/W2 em 3/3 cada,
  W3 ausente e baseline protegido inalterado.
- O PostgreSQL 17.6 canônico não possui `min(uuid)`: cinco agregações CRM são
  projetadas para o primeiro UUID de `array_agg(... ORDER BY ...)` mantendo a
  contagem que rejeita autoridade ambígua.
- A ACL CRM passa a referenciar a assinatura `integer` efetivamente presente no
  backend; a migration canônica permanece byte a byte inalterada.
- CMS e CRM são gerados como dois envelopes atômicos ordenados, compactados sem
  alterar literais e com ledger do exato `current_query()` dentro da transação.
- Esta implementação é repository-only. Aplicação futura permanece exclusiva do
  Lovable e fail-closed sob o manifesto exato de um UUID.

---

## 29. PCA-07 W4 — corretivo Marketing/Tracking transport-safe materializado

```text
PCA07_W4_SOURCE_MAIN=81778245b814eaea0ff54e5333a73f88fd8af12c
PCA07_W4_SOURCE_TREE=93af3337a2f8b957b0193a3ce288be9ed088d832
PCA07_W4_RESULT=REPOSITORY_CORRECTIVE_IMPLEMENTED_NOT_EXECUTED
PCA07_W4_ENVELOPES=2_ORDERED_MARKETING_THEN_TRACKING
PCA07_W4_LEDGER_BEFORE_IMPLEMENTATION=0/2
PCA07_W4_PHYSICAL_BEFORE_IMPLEMENTATION=0/12_TABLES_0/17_FUNCTIONS
PCA07_W4_SEMANTIC_PROJECTIONS=0
PCA07_W4_TRACKING_IDENTIFIERS=1_RAW_1_ACCEPTED_0_REJECTED
PCA07_W4_CANONICAL_MIGRATION_MUTATION=false
PCA07_W4_SAME_BACKEND_WRITES=0
LOVABLE_CALLS=0
DIRECT_SUPABASE_CALLS=0
PROVIDER_MUTATED=false
DEPLOY=false
ROADMAP_SITE_UPDATED=false
PR_105_MUTATED=false
```

- O preflight Lovable-managed e somente leitura confirmou W1/W2/W3 em 3/3,
  W4 ausente, dependências PostgreSQL compatíveis e baseline protegido intacto.
- Marketing e Tracking preservam a semântica canônica e são gerados em dois
  envelopes atômicos ordenados, compactados sem alterar literais.
- Cada envelope registra o exato `current_query()` no ledger e conclui o
  postflight físico, de dados, RLS e ACL antes do `COMMIT`.
- A implementação é repository-only; a aplicação continua exclusiva do Lovable.

---

## 30. PCA-07 W5 — corretivo de inventário final transport-safe materializado

```text
PCA07_W5_SOURCE_MAIN=72cffa66686fd1de26cd48da688814b2c636dfe1
PCA07_W5_SOURCE_TREE=d6f3df55f0d1ae24cc21c14ffa4bae8ab374c7a5
PCA07_W5_RESULT=REPOSITORY_CORRECTIVE_IMPLEMENTED_NOT_EXECUTED
PCA07_W5_ENVELOPES=6_ORDERED_ATOMIC
PCA07_W5_CANONICAL_MIGRATIONS=8
PCA07_W5_LEDGER_BEFORE_IMPLEMENTATION=0/8
PCA07_W5_PHYSICAL_BEFORE_IMPLEMENTATION=0/15_TABLES_0/17_FUNCTIONS
PCA07_W5_SEMANTIC_PROJECTIONS=0
PCA07_W5_CANONICAL_MIGRATION_MUTATION=false
PCA07_W5_SAME_BACKEND_WRITES=0
LOVABLE_CALLS=0
DIRECT_SUPABASE_CALLS=0
PROVIDER_MUTATED=false
DEPLOY=false
ROADMAP_SITE_UPDATED=false
PR_105_MUTATED=false
```

- O preflight Lovable-managed confirmou manifesto exato 1/1, W1–W4 íntegros,
  W5 ausente, dependências compatíveis e baseline protegido intacto.
- CMS inventory, Marketing activation e hardening ficam na mesma transação para
  impedir exposição do predicado intermediário obsoleto `current_version_id`.
- Os oito arquivos canônicos permanecem imutáveis; seis envelopes compactados
  registram o `current_query()` exato e exigem postflight antes do commit.
- A implementação é repository-only; a aplicação permanece exclusiva do Lovable.

---

## 31. PCA-07 W5R — autoridade composta de media library materializada

```text
PCA07_W5R_SOURCE_MAIN=68a52813f0c482f4b6fad51bb0a6a534a8d11a0e
PCA07_W5R_SOURCE_TREE=acc28526a0aada765067afb92228b4c477ef3bbf
PCA07_W5R_RESULT=REPOSITORY_CORRECTIVE_IMPLEMENTED_NOT_EXECUTED
PCA07_W5R_FAILURE_DISPOSITION=TOTAL_TRANSACTION_ROLLBACK
PCA07_W5R_W5_LEDGER_CURRENT=1/8
PCA07_W5R_CORRECTED_ENVELOPE=CMS_MARKETING_HARDENING
PCA07_W5R_MEDIA_LIBRARY_DUPLICATES=0
PCA07_W5R_CANONICAL_MIGRATION_MUTATION=false
PCA07_W5R_SAME_BACKEND_WRITES=0
LOVABLE_CALLS=0
DIRECT_SUPABASE_CALLS=0
PROVIDER_MUTATED=false
DEPLOY=false
PR_105_MUTATED=false
```

- A primeira onda W5 permanece reconciliada e não será reaplicada.
- O segundo envelope falhou de forma transacional e deixou zero artefatos ou ledger parcial.
- A projeção W5R cria a autoridade única `(tenant_id,id)` em `media_library` antes da FK CMS; as migrations canônicas permanecem byte-identical.
- Após merge protegido, o retry começa exclusivamente pelo envelope 2 via Lovable.

---

## 32. PCA-07 W6 — baseline de produto por manifesto exato materializado

```text
PCA07_W6_SOURCE_MAIN=1e166099b54ad6414e5ba21444dab66787726380
PCA07_W6_SOURCE_TREE=3d12751a50df491160850f6880dd104337fb1e3d
PCA07_W6_RESULT=REPOSITORY_ENVELOPE_IMPLEMENTED_NOT_EXECUTED
PCA07_W6_W5_LEDGER=8/8
PCA07_W6_LEDGER_BEFORE_IMPLEMENTATION=0/1
PCA07_W6_EXACT_TENANT_COUNT=1
PCA07_W6_EXISTING_BASELINE=COMPLETE_IDEMPOTENT
PCA07_W6_CANONICAL_MIGRATION_MUTATION=false
PCA07_W6_SAME_BACKEND_WRITES=0
LOVABLE_CALLS=0
DIRECT_SUPABASE_CALLS=0
PROVIDER_MUTATED=false
DEPLOY=false
PR_105_MUTATED=false
```

- W5 foi reconciliada em 8/8, sem exposição de cliente e com baseline protegido intacto.
- W6 permanece ausente no backend e é materializada como um envelope atômico por manifesto exato.
- O tenant autorizado já possui baseline completo; a chamada controlada é idempotente.
- A aplicação futura permanece exclusiva do Lovable após merge protegido.

---

## 33. PCA-07 W6R — autoridade canônica dos nomes do ledger anterior

```text
PCA07_W6R_SOURCE_MAIN=6b5aae433460bcc91672c80d6a2c9b782099b984
PCA07_W6R_SOURCE_TREE=09251fe82f72404af75ce1f4fec3fe7f53575646
PCA07_W6R_RESULT=REPOSITORY_CORRECTIVE_IMPLEMENTED_NOT_EXECUTED
PCA07_W6R_FAILURE_DISPOSITION=TOTAL_TRANSACTION_ROLLBACK
PCA07_W6R_ROOT_CAUSE=NON_CANONICAL_PRIOR_LEDGER_NAME_ASSERTIONS
PCA07_W6R_W6_LEDGER_CURRENT=0/1
PCA07_W6R_CORRECTED_ENVELOPE_BYTES=27449
PCA07_W6R_ORIGINAL_W6_ARTIFACT_PRESERVED=true
PCA07_W6R_CANONICAL_MIGRATION_MUTATION=false
PCA07_W6R_SAME_BACKEND_WRITES=0
LOVABLE_CALLS=0
DIRECT_SUPABASE_CALLS=0
PROVIDER_MUTATED=false
DEPLOY=false
PR_105_MUTATED=false
```

- A aplicação W6 falhou no preflight W2 e sofreu rollback transacional total.
- O corretivo altera apenas as asserções dos nomes canônicos já registrados em W2–W4.
- O envelope W6 histórico e a migration canônica permanecem byte-identical.
- Após merge protegido, somente o envelope W6R corrigido poderá ser aplicado via Lovable.

---

## 34. PCA-07 — fechamento terminal e sucessor provider-agnostic

```text
PCA07_TERMINAL_SOURCE_MAIN=6567ffcd68b6cea12d598ec92dbd673e9bf04818
PCA07_TERMINAL_SOURCE_TREE=1291ab35a601d2a0b81b0e623d59ea3dc2db73ae
PCA07_TERMINAL_RESULT=ACCEPTED_TERMINAL
PCA07_TERMINAL_LEDGER=3/3/3/2/8/1
PCA07_TERMINAL_W5_TABLES_RLS=15/15
PCA07_TERMINAL_W5_FUNCTIONS=17/17
PCA07_TERMINAL_W6_FUNCTIONS=3/3
PCA07_TERMINAL_W6_TRIGGER=1/1
PCA07_TERMINAL_CLIENT_EXPOSURES=0_TABLES_0_FUNCTIONS
PCA07_TERMINAL_EXACT_TENANT_BASELINE=1/7-4/4/4-3/3/36/1
PCA07_NEXT_GATE_SELECTED=PCA-08_PROVIDER_AGNOSTIC_PRODUCT_HOMOLOGATION_ENTRY_READ_ONLY_IMPACT_REQUALIFICATION
PCA07_NEXT_GATE_AUTHORIZED=false
CONTROLLED_HOMOLOGATION_AUTHORIZED=false
PRODUCTION_AUTHORIZED=false
DIRECT_SUPABASE_CALLS=0
```

- W6R foi aplicada exclusivamente pelo Lovable e reconciliada após commit.
- O baseline protegido permaneceu em 74 tenants, 444 conectores, 888 campos sensíveis retidos e 22 objetos/15.826.788 bytes no Storage.
- PCA-08 foi selecionado apenas como gate read-only de decisão; nenhuma homologação, produção, deploy ou mutação de provedor foi autorizada.
- DCA-02-BL2 R2 continua obrigatória após homologação e antes de produção.

---

## 35. PCA-09 — envelope provider-agnostic de entrada em homologação

```text
PCA09_SOURCE_MAIN=6f1fa580863a3f4e3e936912bacfce74e1d4bb01
PCA09_SOURCE_TREE=5db1410e26b093bb7a4ac345641f3a03126b3443
PCA09_RESULT=REPOSITORY_ENVELOPE_IMPLEMENTED_NOT_EXECUTED
PCA09_ENTRY_STATE=BLOCKED_EXTERNAL_EXACT_MAIN_RUNTIME_AND_OPERATOR_PACKET
PCA09_LEDGER=3/3/3/2/8/1
PCA09_LOVABLE_LATEST_COMMIT=9d64c7ac6c1259652a70022db08583139cb368af
PCA09_LOVABLE_CANDIDATE_ELIGIBLE=false
PCA09_EXACT_MAIN_RUNTIME_READY=false
PCA09_MINIMUM_SYNTHETIC_TENANTS=2
PCA09_NEXT_GATE_SELECTED=PCA-10_PROVIDER_AGNOSTIC_EXACT_MAIN_HOMOLOGATION_RUNTIME_READ_ONLY_CAPABILITY_PREFLIGHT
PCA09_NEXT_GATE_AUTHORIZED=false
CONTROLLED_HOMOLOGATION_AUTHORIZED=false
PRODUCTION_AUTHORIZED=false
DIRECT_SUPABASE_CALLS=0
```

- GitHub `main` e o Same-Backend Lovable-managed estão íntegros para a próxima qualificação.
- A publicação Lovable aponta para o head histórico da PR #105 e não é candidata de homologação.
- Nenhum workflow GitHub publica o release candidate exato; runtime e pacote de operador permanecem ausentes.
- PCA-09 absorve controles seguros do runbook histórico sem reabrir HVP-01/HRC-01.
- DCA-02-BL2 R2 permanece não bloqueante para homologação e obrigatória antes de produção.

---

## 36. PCA-11 — envelope do candidato runtime exact-main

```text
PCA11_SOURCE_MAIN=43eb3ff63123e3b0a02b779121e398fec107938f
PCA11_SOURCE_TREE=21a0d13bd0c4620dcdb46c00fe69a23ef779d738
PCA10_RESULT=ACCEPTED_READ_ONLY
PCA11_RESULT=REPOSITORY_ENVELOPE_IMPLEMENTED_NOT_EXECUTED
PCA11_CANDIDATE=CLOUDFLARE_WORKERS/rm-prime-pca11-hml
PCA11_CANDIDATE_MATERIALIZED=false
PCA11_MATERIALIZATION_READY=false
PCA11_ENTRY_STATE=BLOCKED_PREVIEW_HOST_AND_MANAGED_BINDING_COMPATIBILITY
PCA11_BUNDLE=379_MODULES/161_ASSETS/1745.22_KIB_GZIP
PCA11_NEXT_GATE_SELECTED=PCA-11R_CLOUDFLARE_DEDICATED_PREVIEW_HOST_AND_MANAGED_BINDING_COMPATIBILITY_CORRECTIVE_REPOSITORY_IMPLEMENTATION
PCA11_NEXT_GATE_AUTHORIZED=false
CONTROLLED_HOMOLOGATION_AUTHORIZED=false
PRODUCTION_AUTHORIZED=false
DIRECT_SUPABASE_CALLS=0
```

- O candidato selecionado é um novo Worker dedicado; publicação Lovable e Worker histórico permanecem inelegíveis.
- O host versionado `.workers.dev` ainda não possui autoridade explícita e exata no runtime.
- A ponte SPR-03 permanece vinculada ao Worker histórico e não pode transportar bindings para o candidato.
- Nenhum deploy, provider write, segredo, fixture ou operação no Same-Backend ocorreu.
- DCA-02-BL2 R2 permanece obrigatório após homologação e antes de produção.
