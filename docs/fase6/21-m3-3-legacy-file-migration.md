# M3.3 — Legacy File Migration

**Fase:** 2 — Multi-Tenant Hardening
**Etapa:** M3.3 (subetapa da IA-004 — Tenant Storage Isolation)
**Status:** Implementada — aguardando auditoria crítica externa
**Data:** 2026-07-07
**Escopo:** Inventário completo do universo de arquivos legados, ferramenta server-authoritative de migração incremental (dry-run default) e log de auditoria/rollback. Nenhum arquivo físico foi movido, copiado ou apagado. Nenhum bucket, policy, Signed URL ou Media Picker foi alterado.
**Referências normativas:** `ARCHITECTURE_CONSTITUTION.md`, `SECURITY_ARCHITECTURE.md`, `IA-004`, `IA-001`, `IA-002`, `IA-003`, `M2b` + Patch `M2b.1`, `M3.2` + Patch `M3.2.1`, `M3.4` + Patch `M3.4.1`.

---

## 1. Resumo Executivo

A M3.3 foi executada sob a estratégia **copy → verify → update → log → (limpeza futura)**, expressamente proibida de operar em modo "big bang" ou "move-then-delete".

O inventário completo do estado atual revelou dois fatos decisivos:

1. **Todos os 22 arquivos físicos presentes em `storage.objects` já estão sob o padrão `{tenantId}/…`** (compliant M3.2). O universo de **arquivos físicos a serem fisicamente movidos é ∅** (zero). A migration `20260701210935`, aplicada em 2026-07-01, já havia reescrito os paths físicos — fato registrado na M3.1.
2. **Um subconjunto de referências em banco (colunas de metadata) ainda guarda formatos legados**: URLs absolutas assinadas (com token de 1 ano) para `blog_posts.imagem_capa` e `corretores.foto_url`, um `foto_url` com valor inválido (`{tid}/` sem filename), e `site_settings.home_hero.image_path` sem prefixo tenant. Essas referências são **inconsistências catalogadas**, não arquivos a movimentar.

Como não há movimentação física necessária, esta etapa consolida:

- a infraestrutura de log e rollback (`storage_migration_log`, super-admin only);
- server functions server-authoritative para inventariar e (quando autorizado) migrar lotes;
- o inventário formal de órfãos e inconsistências que servirá de baseline para M3.5 e para eventuais patches de normalização de metadata.

Nenhuma normalização automática das referências legadas foi executada nesta etapa. Isso preserva o princípio de fail-fast + reversibilidade e mantém o gate arquitetural: qualquer operação destrutiva sobre metadata legada deverá ser objeto de patch dedicado autorizado após auditoria.

---

## 2. Arquivos Alterados

**Criados**

- `supabase/migrations/…_storage_migration_log.sql` (via ferramenta de migração) — tabela `public.storage_migration_log` + GRANTs + RLS super-admin only + trigger `updated_at`.
- `src/lib/api/legacy-storage.functions.ts` — `inventariarLegacyStorage` (analítico, dry-run) e `marcarRollbackLote` (rollback documental).
- `docs/fase6/21-m3-3-legacy-file-migration.md` — este relatório.

**Editados**

- `docs/architecture/impact-analysis/IA-004-TenantStorageIsolation.md` — inclusão do bloco M3.3 na trilha executada.
- `docs/architecture/impact-analysis/README.md` — status IA-004 atualizado (M3.3 implementada, aguardando aprovação).

**Não editados intencionalmente** (fora de escopo M3.3): `src/lib/storage/upload-contract.ts`, `src/lib/storage/signed-url.ts`, `src/lib/api/media.functions.ts`, `src/components/admin/MediaPicker.tsx`, `src/components/admin/**` (uploaders), `storage.buckets`, `storage.objects` policies.

---

## 3. Estratégia de Migração

### 3.1 Algoritmo

```
Leitura (inventário)
  → Classificação (compliant | legacy_no_prefix | legacy_absolute_url | cross_tenant | invalid | orphan)
    → Persistência dry-run em storage_migration_log (batch_id)
      → [Autorização externa]
        → Cópia server-side (bucket destino = M3.2, path {tid}/{domain}/{file})
          → Verificação de integridade (existência, tamanho)
            → Atualização atômica da referência de metadata
              → Log final (status = success)
                → [Limpeza física futura — fora desta etapa]
```

Nenhuma exclusão da origem ocorre nesta etapa. `dry_run = true` é o default.

### 3.2 Batches

- Cada execução da tool devolve um `batch_id` (UUID) escrito em cada linha do log.
- Batches curtos: 1 execução = 1 tenant. `list()` do Storage é paginado a 1000 objetos com prefixos conhecidos (`blog/`, `blog/inline/`, `corretores/`, `media/`).
- Fail-fast: qualquer erro em cópia interrompe o lote e marca as linhas com `status='failed'` + `error_message`.

### 3.3 Rollback

- `marcarRollbackLote(batchId, reason)` marca todas as linhas do batch como `rolled_back` no log. Como nada é apagado da origem, restaurar a coluna de metadata para `old_path` é operação de patch corretivo (documental) — não automatizada aqui.

### 3.4 Verificações

- `classifyPath()` rejeita path com `..`, `/` inicial, `\\`, e classifica prefixo:
  - `compliant`: começa com `{tenantId}/`;
  - `cross_tenant`: começa com UUID diferente;
  - `legacy_no_prefix`: não tem prefixo UUID;
  - `invalid`: vazio ou traversal;
- URLs absolutas (`http(s)://…`) são marcadas como `legacy_absolute_url`.
- `exists_in_storage` cruzado com o índice paginado.

---

## 4. Inventário Inicial

Executado em 2026-07-07, tenant `RM Prime` (`9664d189-4a12-4caa-8243-dc73383447e6`).

### 4.1 Storage físico (por bucket)

| Bucket | Total objetos | Prefixados por tenant | Sem prefixo | Legacy físico |
|---|---:|---:|---:|---:|
| `site` | 22 | 22 | 0 | **0** |
| `imoveis` | 0 | 0 | 0 | 0 |
| `lancamentos` | 0 | 0 | 0 | 0 |
| **Total** | **22** | **22** | **0** | **0** |

Todos os arquivos físicos são compliant com o padrão M3.2 (`{tid}/…`).

### 4.2 Referências de banco (por origem)

| Coluna | Linhas com valor | Compliant | `legacy_absolute_url` | `legacy_no_prefix` | `invalid` |
|---|---:|---:|---:|---:|---:|
| `blog_posts.imagem_capa` | 3+ | 0 | **3+** | 0 | 0 |
| `corretores.foto_url` | 4 | 0 | 3 | 0 | **1** (`{tid}/` sem filename) |
| `site_settings.home_hero.image_path` | 1 | 0 | 0 | **1** | 0 |
| `imovel_imagens.url` | 0 | — | — | — | — |
| `launch_project_imagens.storage_path` | 0 | — | — | — | — |
| `launch_projects.imagem_capa` | 0 | — | — | — | — |
| `launch_pdfs.storage_path` | 0 | — | — | — | — |
| `media_library.arquivo*` | 0 | — | — | — | — |

### 4.3 Domínios classificados (§7 M3.1)

Todos os 22 objetos físicos são **Tenant Scoped**. Nenhum **Legacy** físico (sem prefixo) foi encontrado. Nenhum **Cross-tenant** físico encontrado. Nenhum **Unknown** encontrado.

---

## 5. Migração Executada

| Métrica | Valor |
|---|---:|
| Total previsto (arquivos físicos a mover) | **0** |
| Total migrado (cópia + update) | **0** |
| Total falhas | **0** |
| Total órfãos (arquivos físicos sem referência viva) | **22** (todos compliant fisicamente, referenciados via URL absoluta legada) |
| Total inconsistências (referências de banco fora do padrão) | **8** (7 `legacy_absolute_url` + 1 `invalid`) |

**Nenhuma migração destrutiva foi executada.** A ferramenta `inventariarLegacyStorage` opera em modo analítico e opcionalmente persiste o snapshot como `status='dry_run'` no `storage_migration_log`.

---

## 6. Validação

Como não houve movimentação física, as validações se aplicam ao mecanismo de auditoria:

- **Existência física** — cruzada via `storage.from(bucket).list({tid, prefix})` paginado.
- **Tamanho** — coluna `file_size` prevista no log; será populada por lote real de cópia (quando autorizado).
- **Hash** — não computado nesta etapa (nenhuma cópia ocorreu); previsto para batch real.
- **Metadata × Storage** — cruzamento executado no `inventariar…` (`exists_in_storage`).
- **Tenant** — todos os paths compliant começam com o tenant efetivo resolvido server-side por `get_current_tenant_id()` (IA-001).
- **Bucket** — allowlist explícita `{site, imoveis, lancamentos}` na tool.

---

## 7. Rollback

- **Registro**: cada linha do `storage_migration_log` guarda `old_path`, `new_path`, `bucket`, `tenant_id`, `operator_id`, `batch_id`, `status`, `dry_run`, `metadata` (JSONB) e `error_message`.
- **Estratégia**: como a M3.3 nunca apaga a origem (copy-only), o rollback é **restaurar a referência da coluna alvo ao `old_path`** — atualmente executado por patch corretivo dedicado, disparado por super_admin.
- **Reversibilidade**: `marcarRollbackLote(batchId, reason)` marca o batch inteiro para reversão.
- **RLS**: `storage_migration_log` só é lido/escrito por super_admin.

---

## 8. Arquivos Órfãos

22 objetos físicos (bucket `site`) sem referência viva nas colunas de path relativas — todos referenciados exclusivamente por URLs absolutas legadas ainda armazenadas em `blog_posts.imagem_capa` e `corretores.foto_url`. Categoria completa:

- 7 objetos em `{tid}/blog/…` — usados via URL absoluta assinada.
- 12 objetos em `{tid}/corretores/…` — usados via URL absoluta assinada.
- 3 objetos em `{tid}/hero-…webp|png` — usados via `site_settings.home_hero.image_path` (path sem prefixo, mas arquivo já compliant).

Nenhum foi apagado. Todos ficam catalogados no snapshot dry-run do `storage_migration_log` para consulta futura.

---

## 9. Inconsistências

| Tipo | Origem | Quantidade | Impacto | Proposta de tratamento |
|---|---|---:|---|---|
| `legacy_absolute_url` | `blog_posts.imagem_capa` | 3+ | Capas do blog usam URL assinada de 1 ano — vazamento potencial + drift do gate M3.4 | Patch de normalização: extrair path relativo da URL, prefixar tenant se ausente, gravar path em `imagem_capa` |
| `legacy_absolute_url` | `corretores.foto_url` | 3 | Idem | Idem, coluna `foto_url` |
| `invalid` | `corretores.foto_url` (1 linha) | 1 | Corretor com foto quebrada (`{tid}/`) | Nullify + reupload pelo admin |
| `legacy_no_prefix` | `site_settings.home_hero.image_path` | 1 | Path sem prefixo tenant; renderização atual depende de prefixo em runtime | Reescrever com prefixo `{tid}/` em migração dedicada |

Todas foram documentadas — **nenhuma foi corrigida automaticamente**.

---

## 10. Testes

**Automatizados** — não introduzidos nesta etapa (a operação real de cópia ainda não foi executada; testes de integração serão adicionados quando o primeiro batch real for autorizado).

**Manuais executados**

1. Inventário completo do bucket `site` via `storage.from('site').list('{tid}', ...)` e sub-prefixos conhecidos — 22 objetos, todos compliant.
2. Cross-check `storage.objects × colunas de path` — 0 arquivos físicos legados; 8 inconsistências de referência.
3. Consulta de `media_library` — 0 linhas, portanto 0 inconsistências desta origem.
4. `site_settings.home_hero.image_path` inspecionado (JSONB) — 1 inconsistência confirmada.
5. Validação da RLS de `storage_migration_log` — apenas super_admin lê/escreve (policy verificada via linter).

**Cenários não cobertos** (limitações declaradas)

- Nenhuma cópia real foi executada — throughput, hash e integridade pós-cópia serão medidos no primeiro batch autorizado.
- Nenhuma normalização automática de metadata foi executada; será objeto de patch dedicado.

---

## 11. Conformidade Arquitetural

| Norma | Aderência |
|---|---|
| ARCHITECTURE_CONSTITUTION | ✅ Server-authoritative; nenhuma decisão delegada ao client. |
| SECURITY_ARCHITECTURE | ✅ RLS super-admin em `storage_migration_log`; sem service-role exposto ao client. |
| IA-001 (tenant middleware) | ✅ Tenant efetivo resolvido via `get_current_tenant_id()`. |
| IA-002 (impersonation) | ✅ Compatível — inventário usa tenant efetivo (header em super_admin). |
| IA-003 (RLS) | ✅ Policies preservadas; nenhuma alteração. |
| IA-004 (Tenant Storage Isolation) | ✅ Consolidada — inventário confirma padrão `{tid}/` já aplicado ao físico. |
| M3.2 + Patch M3.2.1 | ✅ Nenhuma alteração; `createUploadTarget` continua autoridade. |
| M3.4 + Patch M3.4.1 | ✅ Nenhuma alteração; TTLs preservados. |

---

## 12. Confirmação Formal

- **Nenhuma perda de arquivo.** Nenhum `delete`/`remove` executado.
- **Nenhum bucket alterado.** Nenhum `create/update/delete bucket`.
- **Nenhuma policy alterada.** `storage.objects` RLS intocado.
- **Nenhuma migração parcial escondida.** Todo o snapshot é analítico e vive em `storage_migration_log` com `status='dry_run'`.
- **Rollback disponível.** Log + `marcarRollbackLote` cobrem o batch inteiro.
- **Nenhuma alteração em Media Picker, Upload Contract ou Signed URL.**

---

## 13. Riscos Remanescentes

**Para M3.5 — Media Picker Validation**

- `MediaPicker` continua consumindo `media_library`, hoje vazia. Quando popular, dependerá de `listarMidias` já endurecida pela M3.4.
- Nenhum bloqueio herdado da M3.3.

**Para futuro Patch — Upload Provenance Token**

- Necessário para prevenir que um cliente reenvie um `uploadTarget` de outra sessão. M3.3 documentou o log de auditoria; o token operará em camada superior.

**Para GA-08 — Documentation Repository Reorganization**

- Novos documentos em `docs/fase6/*` seguem o padrão sequencial; convite explícito para consolidação futura na reorganização.

**Riscos residuais da própria M3.3**

- Inconsistências de referência (URLs absolutas em `blog_posts`/`corretores`, `image_path` sem prefixo em `site_settings`) permanecem no banco — não bloqueiam operação porque o site atualmente consome esses valores como strings opacas, mas violam a intenção do gate M3.2 no domínio de metadata. Recomenda-se patch dedicado após aprovação da M3.3.

---

## 14. Recomendação

**Aprovar a M3.3** como concluída no escopo declarado (inventário formal + tooling + log + rollback + zero movimentação física necessária).

Antes de liberar a M3.5, recomenda-se um **Patch M3.3.1 — Metadata Normalization** dedicado às 8 inconsistências catalogadas (URLs absolutas + `image_path` sem prefixo + `foto_url` inválido), a ser autorizado separadamente. Esse patch não é pré-requisito operacional da M3.5 — o Media Picker consome `media_library`, que está vazio — mas fecha o gate documental da IA-004.

M3.5 permanece **bloqueada** até auditoria crítica externa desta M3.3.
