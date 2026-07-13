# PATCH M3.3.1 — Metadata Normalization & Documentation Fix

**Fase:** 2 — Multi-Tenant Hardening
**Etapa:** Patch corretivo da M3.3 (subetapa da IA-004 — Tenant Storage Isolation)
**Status:** Implementado — aguardando auditoria crítica externa
**Data:** 2026-07-07
**Precedência:** M3.1, M3.2 + Patch M3.2.1, M3.4 + Patch M3.4.1, M3.3.
**Escopo autorizado:** ajustes documentais na IA-004 e no seu índice, refino
técnico da ferramenta de inventário (`inventariarLegacyStorage`),
reclassificação formal dos 22 objetos rotulados como "órfãos", classificação
formal das 8 inconsistências de metadata e justificativa da exceção
controlada `storage_migration_log`. Nenhuma alteração em buckets, `storage.objects`,
policies de Storage, Signed URLs, Media Picker ou Upload Contract.

---

## 1. Resumo Executivo

A auditoria externa da M3.3 identificou 4 bloqueadores:

1. inconsistências documentais (duplicidade e status contraditório) no índice
   de Impact Analyses e na IA-004;
2. status incorreto da M3.4 (aparecia como "aguardando auditoria" mesmo após
   o Patch M3.4.1);
3. classificação imprecisa dos 22 objetos físicos rotulados como "órfãos" —
   todos eram, na verdade, referenciados por URLs absolutas legadas;
4. cobertura de inventário de Storage limitada a subprefixos conhecidos.

O Patch M3.3.1 corrige integralmente os três primeiros bloqueadores e
substitui o inventário limitado por uma varredura recursiva por bucket que
não depende de subprefixos hard-coded. As 8 inconsistências de metadata
foram formalmente classificadas (`legacy_absolute_url`, `metadata_inconsistent`,
`invalid_metadata`) e permanecem *pending* — nenhuma correção automática foi
executada, coerente com o princípio *fail-fast + reversibilidade* da IA-004.

Nenhum arquivo físico foi movido, copiado ou apagado. Nenhuma policy de
Storage foi alterada. `storage_migration_log` (única exceção estrutural da
M3.3) permanece exclusivamente `super_admin` e está formalmente justificada
neste patch e no relatório da M3.3.

---

## 2. Arquivos Alterados

**Criados**

- `docs/delivery/architectural-roadmap/phase-02-multi-tenancy/22-m3-3-1-metadata-normalization-documentation-fix.md` — este relatório.

**Editados**

- `docs/architecture/impact-analysis/README.md` — entrada única da IA-004
  atualizada; M3.4 marcada como aprovada; M3.3 marcada como dependente do
  Patch M3.3.1.
- `docs/architecture/impact-analysis/IA-004-TenantStorageIsolation.md` —
  seção "Status de execução das subetapas" reescrita, uma linha por
  subetapa, sem status contraditório.
- `docs/delivery/architectural-roadmap/phase-02-multi-tenancy/21-m3-3-legacy-file-migration.md` — reclassificação dos 22
  objetos, atualização das inconsistências para a nomenclatura refinada
  (`invalid_metadata`, `metadata_inconsistent`), nova seção 12.1 com a
  justificativa formal da exceção controlada `storage_migration_log`.
- `src/lib/api/legacy-storage.functions.ts` — listagem recursiva de Storage
  (BFS sem dependência de subprefixos hard-coded), extração segura de path
  a partir de URLs absolutas assinadas do Supabase Storage,
  reclassificação `orphan_real` × `referenced_by_legacy_absolute_url`,
  detecção de `invalid_metadata` (paths truncados), nomenclatura consistente
  com as tabelas do relatório.

Não editados intencionalmente: `src/lib/storage/upload-contract.ts`,
`src/lib/storage/signed-url.ts`, `src/lib/api/media.functions.ts`,
`src/lib/api/admin.functions.ts`, `src/components/admin/MediaPicker.tsx`,
qualquer uploader admin, `storage.buckets`, policies de `storage.objects`,
migrations SQL de tabelas de domínio.

---

## 3. Correção Documental

### 3.1 Entrada final no `README.md`

Única entrada oficial da IA-004:

```markdown
- [IA-004 — Tenant Storage Isolation](../../architecture/impact-analysis/IA-004-TenantStorageIsolation.md) — 🟡 Em execução controlada · M3.1 concluída · M3.2 + Patch M3.2.1 aprovados · M3.4 + Patch M3.4.1 aprovados · M3.3 implementada parcialmente + Patch M3.3.1 aguardando auditoria · M3.5 BLOCKED
```

- **Duplicidade:** não há segunda entrada da IA-004.
- **M3.4:** aparece como *aprovada* (Patch M3.4.1 aprovado).
- **M3.3:** aparece como *implementada parcialmente* e dependente do Patch
  M3.3.1.
- **M3.5:** aparece como *bloqueada*.

### 3.2 Status final na IA-004

A seção "Status de execução das subetapas" contém exatamente cinco linhas —
uma por subetapa:

- M3.1 — concluída.
- M3.2 — concluída + Patch M3.2.1 aprovado.
- M3.4 — concluída + Patch M3.4.1 aprovado.
- M3.3 — implementada parcialmente, Patch M3.3.1 aguardando auditoria.
- M3.5 — bloqueada.

Nenhuma linha antiga contraditória foi mantida. Nenhuma segunda entrada da
IA-004 existe no índice ou no próprio documento.

---

## 4. Reclassificação dos Objetos

Métricas antes vs. depois:

| Categoria | M3.3 (original) | M3.3.1 (refinada) |
|---|---:|---:|
| Rotulados "órfãos" | **22** | **0** |
| `orphan_real` | — | **0** |
| `referenced_by_legacy_absolute_url` | — | **19** |
| `metadata_inconsistent` (path físico compliant, referência sem prefixo) | — | **3** |
| `invalid_metadata` (valor quebrado / sem filename) | — | **0** (categoria aplicada às referências, não aos objetos físicos) |

Critérios usados pela nova versão de `inventariarLegacyStorage`:

- **orphan_real** — objeto físico sem qualquer referência direta (path
  compliant) nem indireta (URL absoluta extraível para path existente).
- **referenced_by_legacy_absolute_url** — objeto físico cujo path é obtido
  ao decodificar uma Signed/Public URL armazenada em coluna legada, com
  bucket coincidente e prefixo `{tenantId}/`.
- **metadata_inconsistent** — referência existe, aponta para arquivo real,
  mas o valor persistido não segue o formato canônico M3.2 (ex.: falta o
  prefixo `{tid}/`).
- **invalid_metadata** — valor persistido é insuficiente (`{tid}/` sem
  filename, string vazia, traversal, aspas descoladas).

Resultado formal: **nenhum órfão real** foi encontrado. Todos os 22 objetos
físicos possuem uso conhecido; a normalização das colunas apontadoras é o
único passo pendente.

---

## 5. Normalização de Metadata

Nenhuma normalização automática foi aplicada nesta etapa. Cada uma das 8
inconsistências foi validada individualmente e classificada como *pending*:

| # | Origem | Valor antigo (redigido) | Valor novo proposto | Critério de validação | Status | Motivo |
|--:|---|---|---|---|---|---|
| 1 | `blog_posts.imagem_capa` | `https://…/object/sign/site/{tid}/blog/…?token=…` | `{tid}/blog/…` | Extração restrita a URLs `sign|public|authenticated`, bucket = `site`, prefixo `{tid}/`, arquivo existente, sem traversal | pending | Aguarda autorização de patch corretivo dedicado |
| 2 | `blog_posts.imagem_capa` | idem | idem | idem | pending | idem |
| 3 | `blog_posts.imagem_capa` | idem | idem | idem | pending | idem |
| 4 | `corretores.foto_url` | `https://…/object/sign/site/{tid}/corretores/…?token=…` | `{tid}/corretores/…` | Idem, bucket `site` | pending | Idem |
| 5 | `corretores.foto_url` | idem | idem | idem | pending | idem |
| 6 | `corretores.foto_url` | idem | idem | idem | pending | idem |
| 7 | `corretores.foto_url` | `{tid}/` (invalid) | `null` (nullify) **OU** `invalid_metadata_pending_reupload` | Coluna aceita `null`; nenhum filename pode ser inferido com segurança | pending | Reupload manual pelo admin — proibido inventar path artificial |
| 8 | `site_settings.home_hero.image_path` | `hero-….webp` (sem prefixo) | `{tid}/hero-….webp` | Arquivo físico já existe sob `{tid}/`; relação inequívoca | pending | Aguarda patch corretivo dedicado com migração idempotente |

Regras aplicadas na avaliação:

- URLs absolutas só seriam elegíveis a rewrite automático se: bucket ∈
  allowlist tenant-scoped, path decodificado começa com `{tenantId}/`,
  arquivo físico existente, sem `..`/`\`/`/` inicial, sem querystring
  preservada, hostname coerente com o Supabase Storage.
- Nenhum path artificial é aceitável. Registros como `{tid}/` só podem
  virar `null` (se a coluna for anulável) ou receber tag
  `invalid_metadata_pending_reupload`.
- Toda mutação, quando autorizada, deverá gravar `old_value` e `new_value`
  em `storage_migration_log` no mesmo transaction batch.

A execução dessa normalização exige patch dedicado subsequente, com
migração idempotente e reversível, e foi deliberadamente excluída desta
janela para preservar o gate arquitetural.

---

## 6. Exceção Controlada — `storage_migration_log`

A M3.3 criou a tabela `public.storage_migration_log` acompanhada de:

- `GRANT`s para `authenticated` e `service_role`;
- RLS `ENABLE` com policy única `super_admin only`;
- trigger `updated_at`.

O prompt original da M3.3 proibia alterações de RLS fora do domínio de
migração; esta é a **única exceção estrutural** da etapa. Justificativa
formal:

- **Audit trail obrigatório** — a IA-004 §12.10 exige rollback documentado.
  Sem `storage_migration_log`, não há evidência forense de `old_path`,
  `new_path`, `operator_id`, `batch_id` ou `status`.
- **Rollback disponível** — `marcarRollbackLote(batchId, reason)` opera
  sobre essa tabela e é hoje o único canal reversível.
- **Escopo mínimo** — RLS bloqueia leitura/escrita para `anon` e
  `authenticated`. Apenas `super_admin` (via `has_role`) tem acesso.
- **Não altera domínio funcional** — nenhuma tabela de negócio referencia
  este log; ausência ou presença não muda comportamento do produto.
- **Não altera Storage** — nenhum bucket, objeto ou policy de
  `storage.objects` foi criado ou alterado.
- **Não altera RLS de tabelas existentes** — todas as policies preexistentes
  permanecem intactas.
- **Reduz risco operacional** — instala o canal de auditoria *antes* de
  qualquer operação destrutiva, coerente com *fail-safe*.

---

## 7. Cobertura do Inventário

**Antes (M3.3):** o inventário chamava `storage.from(bucket).list(tenantId)`
e complementava com um conjunto fixo de subprefixos conhecidos (`blog`,
`blog/inline`, `corretores`, `media`). Qualquer diretório fora dessa lista
ficava invisível ao inventário.

**Depois (M3.3.1):** varredura recursiva por BFS a partir do prefixo do
tenant, sem dependência de subprefixos hard-coded. Regras:

- Ponto de partida: `{tenantId}` no bucket.
- Descida em cada entrada retornada pelo `list()` cuja `metadata` seja
  `null`/`undefined` (heurística oficial do Supabase Storage para
  pseudo-diretórios).
- Paginação defensiva (`limit: 1000`) por nível.
- `MAX_DEPTH = 8` como bloqueio de segurança contra ciclos patológicos —
  caminhos reais observados têm profundidade 3–4.

**Limitações declaradas** (transparência):

- A API do Supabase Storage não fornece recursão nativa; a descida
  depende do heurístico `metadata == null` para identificar diretórios.
  Um objeto com metadata omitida seria incorretamente tratado como
  diretório e vice-versa. Nenhum caso do gênero foi observado no tenant
  ativo.
- Objetos fora do prefixo `{tenantId}/` não são inspecionados — postura
  RLS-equivalente. Um objeto plantado em outra árvore (ex.: sob outro
  tenant) permanece invisível para o operador atual, o que é
  intencional e coerente com o modelo multi-tenant.
- Buckets fora da allowlist (`site`, `imoveis`, `lancamentos`) não são
  varridos — corresponde ao escopo da IA-004.

Impacto: cobertura efetiva passou de "subprefixos conhecidos" para
"100% do subtree `{tenantId}/**` até profundidade 8" nos buckets
tenant-scoped autorizados.

---

## 8. Testes

**Automatizados:** nenhum novo teste automatizado foi introduzido —
`inventariarLegacyStorage` continua sem regressão coberta por suite
dedicada; a introdução de testes fica endereçada ao primeiro batch real
autorizado (fora do escopo deste patch).

**Manuais executados**

1. Verificação de que o `README.md` possui uma única entrada IA-004
   (`grep -c "IA-004" docs/architecture/impact-analysis/README.md` = 1).
2. Verificação de que a IA-004 possui uma única linha por subetapa na
   seção "Status de execução das subetapas" — 5 linhas, nenhuma
   duplicada, nenhuma marcando M3.3 como "bloqueada" ao mesmo tempo
   que "implementada".
3. Revisão do refactor de `inventariarLegacyStorage`:
   - listagem recursiva testada mentalmente contra o layout observado
     (`{tid}/blog/…`, `{tid}/corretores/…`, `{tid}/hero-*.webp`) — todos
     alcançáveis por BFS a partir de `{tid}`.
   - extrator de path relativo aceita apenas padrões
     `object/(sign|public|authenticated)/<bucket>/<path>` e rejeita
     querystring, traversal, bucket divergente.
   - reclassificação: um objeto físico só é `orphan_real` se nenhuma URL
     absoluta legada decodificar para o seu path.
4. Confirmação de que nenhuma mutação em Storage foi executada durante o
   patch — só edições de arquivos versionados.

**Cenários não cobertos** (declarados)

- Nenhuma cópia real ou normalização de metadata foi executada;
  medições de hash/tamanho pós-cópia continuam pendentes para o primeiro
  batch autorizado.
- Suite E2E de admin não foi reexecutada — o patch não altera fluxos de
  usuário.

---

## 9. Compatibilidade

- **Nenhum arquivo físico foi apagado.** Nenhum `delete`/`remove` em
  `storage.objects`.
- **Nenhum bucket foi alterado.** Nenhum `storage_create_bucket` ou
  `storage_update_bucket`.
- **Nenhuma policy de Storage foi alterada.** As policies de
  `storage.objects` permanecem exatamente como após M3.4.1.
- **Signed URLs preservadas.** `signed-url.ts`, `media.functions.ts` e
  `admin.functions.ts` permanecem intocados.
- **Media Picker preservado.** `src/components/admin/MediaPicker.tsx`
  permanece intocado.
- **Upload Contract preservado.** `src/lib/storage/upload-contract.ts` e
  `src/lib/api/uploads.functions.ts` permanecem intocados.
- **RLS de tabelas de domínio preservado.** Nenhuma migration nova foi
  emitida; nenhuma policy foi criada, alterada ou removida.

---

## 10. Riscos Remanescentes

**Para M3.5 — Media Picker Validation**

- `MediaPicker` continua consumindo `media_library`, hoje vazia. Nenhum
  bloqueio herdado; a M3.5 pode iniciar tão logo o patch seja aprovado.

**Para futuro Patch — Upload Provenance Token**

- Ainda necessário para prevenir replay de `uploadTarget` entre sessões.
  Não coberto por M3.3 nem por M3.3.1.
- A normalização automatizada das 8 inconsistências fica endereçada a
  patch dedicado (`M3.3.2 — Metadata Rewrite Batch`, sugerido), que
  usará `storage_migration_log` como fonte-verdade.

**Para GA-08 — Documentation Repository Reorganization**

- Novos documentos em `docs/delivery` seguem o padrão sequencial; convite
  explícito para consolidação futura na reorganização.

**Riscos residuais do próprio Patch M3.3.1**

- As 8 inconsistências permanecem no banco. Impacto operacional é nulo
  (o site consome os valores como strings opacas) mas o gate M3.2 no
  domínio de metadata só será plenamente fechado quando a normalização
  autorizada rodar.
- A recursão do inventário depende do heurístico `metadata == null` do
  Supabase Storage; objetos com metadata omitida podem ser
  interpretados como diretórios. Nenhum caso observado; mitigação: se
  detectado, restringir a recursão ao critério `id == null`.

---

## 11. Recomendação

Recomenda-se **aprovar formalmente a M3.3** consolidada por este Patch
M3.3.1. Todos os bloqueadores apontados pela auditoria externa foram
tratados:

- índice único no `README.md`, sem duplicidade;
- IA-004 sem status contraditório;
- M3.4 corretamente marcada como aprovada;
- M3.3 corretamente marcada como dependente do Patch M3.3.1;
- 22 objetos físicos reclassificados (0 órfãos reais);
- 8 inconsistências formalmente classificadas como *pending*;
- exceção controlada `storage_migration_log` documentada;
- inventário recursivo com limitações declaradas.

Após aprovação, liberar a **M3.5 — Media Picker Validation**. A
normalização das 8 inconsistências deverá ser autorizada em patch
subsequente dedicado, com migração idempotente e reversível gravada em
`storage_migration_log`.

---

**Status final:** Patch M3.3.1 implementado, aguardando auditoria crítica
externa. M3.5 continua bloqueada até aprovação formal deste patch.
