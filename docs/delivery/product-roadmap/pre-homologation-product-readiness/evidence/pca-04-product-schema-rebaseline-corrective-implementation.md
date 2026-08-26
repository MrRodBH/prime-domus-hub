# PCA-04 — Product Schema Rebaseline Corrective Implementation

## 1. Controle terminal

```text
GATE=PCA-04_GITHUB_NATIVE_PRODUCT_SCHEMA_REBASELINE_CORRECTIVE_IMPLEMENTATION
STATUS=IMPLEMENTED_IN_ISOLATED_BRANCH_AWAITING_PROTECTED_PR
SOURCE_MAIN=b4034948ef0b27275ccd7dd5f68c8c0a1b4eed5e
SOURCE_TREE=3331f2b0ed967e4a38156257bdf7cf71100a7e6f
BRANCH=agent/pca-04-product-schema-rebaseline-corrective-implementation
PULL_REQUEST=140
SAME_BACKEND_MUTATED=false
PROVIDER_MUTATED=false
LOVABLE_AGENT_CALLED=false
PR_105_MUTATED=false
PRODUCTION_PUBLISHED=false
```

PCA-04 materializa somente o pacote GitHub-native previsto por PCA-03. Nenhuma
migração foi aplicada, nenhum ledger foi reparado e nenhum tenant foi alterado.

## 2. Correções materializadas

1. As 16 migrações PR-M2 agora possuem `BEGIN/COMMIT` explícito.
2. A seleção histórica de tenant usa exclusivamente UUIDs fornecidos por sessão,
   hash SHA-256 determinístico e referência de autorização do Owner.
3. Na ausência desses três controles, a seleção retorna zero tenants.
4. RBAC, configuração, portais, CMS, CRM, marketing e tracking não executam mais
   DML amplo sobre `public.tenants`.
5. Resíduos legados não selecionados permanecem recuperáveis; contratos para
   novos writes usam constraints `NOT VALID` quando validar o legado seria
   destrutivo ou bloquearia a onda estrutural.
6. `feed_token` e `webhook_secret` são integralmente retidos. Hash verifier não
   é tratado como backup nem autoriza remoção do segredo.
7. A nova migração `20260826185014` instala provisionamento server-owned,
   transacional e idempotente para novos tenants pelo UUID exato de `NEW.id`.
8. Backfill de tenant existente só pode usar array exato, SHA-256 e autorização;
   a primitiva unitária não é concedida ao `service_role`.

## 3. Baseline funcional de novo tenant

Uma única transação materializa e confirma:

| Componente | Invariante |
|---|---:|
| configuração canônica publicada | 1 |
| pipeline comercial default | 1 |
| estágios CRM fechados | 7 |
| conectores de marketing | 4 |
| versões/mapeamentos de marketing | 4 / 4 |
| conectores/versões de tracking | 3 / 3 |
| bindings de eventos de tracking | 36 |
| configuração de consentimento | 1 |

Meta Ads e Google Ads nascem sem credencial, inativos e `not_live_verified`.
Nenhum provider é chamado e nenhum sucesso externo é simulado.

## 4. Manifesto de paridade

O manifesto machine-readable vinculante está em:

`docs/architecture/impact-analysis/manifests/PCA-04-product-schema-parity-manifest.json`

Ele registra os hashes SHA-256 das 17 migrações, ondas, classe de DML, rollback,
quatro versões live-only quarentenadas e proibições. A releitura atual do ledger
Same-Backend foi negada pelo conector por permissão; o snapshot PCA-02 foi
preservado sem fabricar hashes. PCA-06 deve atualizar as classificações e hashes
live antes de qualquer write.

## 5. Verificações executadas

| Verificação | Resultado |
|---|---|
| head/tree de origem | PASS — iguais à autorização |
| PCA-04 structural specs | PASS |
| 9 suítes PR-M2 de regressão | PASS |
| parser PostgreSQL real | PASS — 17/17 arquivos |
| hash do manifesto | PASS — 17/17 arquivos |
| lint do novo verificador | PASS |
| build Vite/Nitro | PASS |
| typecheck global | BASELINE BLOCKED — erros TanStack preexistentes fora da allowlist |
| release verifier composto | ENVIRONMENT BLOCKED — runtime `bun` ausente; componentes acima executados com Node/npm |
| `git diff --check` | PASS |

O CLI Supabase estável `2.115.0` não conseguiu inicializar o diretório read-only
`/root/.supabase` deste ambiente. A criação da migração usou o timestamp UTC do
sistema como fallback auditado; nenhuma chamada foi repetida após a confirmação
da restrição ambiental.

## 6. Backlogs e momento correto

| Backlog | Momento autorizado |
|---|---|
| ARCH-12F-02 / #107 | gate próprio antes da homologação e de rehearsal dependente de bindings |
| ARCH-12F-03 / #116 | após correção upstream/harness; antes de billing comercial |
| DCA-02-BL2 | prova PITR isolada antes de qualquer rebaseline/cutover live |
| DCA-02-BL1 | após BL2 e antes de provisionamento automático de domínio real |
| Lovable private variant | somente após resposta/correção oficial e novo gate do Owner |
| portal credential cutover | gate destrutivo separado após custódia, rotação e rollback provados |
| órfãos de reasons | gate de integridade separado com manifesto exato |
| live-only BCA/BCR | PCA-06/comercial; sem adoção da PR #105 |

Nenhuma dessas trilhas foi antecipada por PCA-04.

## 7. Rollback

- Antes do merge: fechar a PR e remover somente o branch isolado.
- Após merge e antes de backend: revert GitHub auditável.
- Durante rehearsal: rollback transacional da onda com retenção de evidência.
- Após commit em qualquer backend: nova migração forward-only.
- `db reset`, down migration, rewrite histórico e `migration repair` cego seguem
  proibidos.

## 8. Próximo gate

O próximo ato permitido é auditoria final do diff/head/tree e merge protegido da
PR PCA-04 mediante autorização específica do Owner. A execução do pacote exige
depois `PCA-05_ISOLATED_RESTORE_CELL_SCHEMA_REBASELINE_REHEARSAL`; Same-Backend
continua fora de escopo até PCA-06 e nova autorização explícita.
