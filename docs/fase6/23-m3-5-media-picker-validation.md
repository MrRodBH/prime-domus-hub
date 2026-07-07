# M3.5 — Media Picker Validation

**Etapa:** IA-004 — Tenant Storage Isolation · subetapa operacional final
**Status:** Implementada (validação/endurecimento documental) — aguardando auditoria
**Precedentes aprovados:** M3.1, M3.2 + Patch M3.2.1, M3.4 + Patch M3.4.1, M3.3 + Patch M3.3.1
**Data:** 2026-07-07

---

## 1. Resumo Executivo

A M3.5 valida que o **Media Picker** (`src/components/admin/MediaPicker.tsx`)
e a **biblioteca central de mídia** (`src/lib/api/media.functions.ts`) operam
integralmente sob a arquitetura consolidada pelas subetapas anteriores da
IA-004:

- listagem, assinatura e upload são **server-authoritative**;
- tenant efetivo é resolvido exclusivamente por `get_current_tenant_id()`
  (IA-001 + Patch M2b.1);
- nenhum path físico é construído no client;
- `prefixTenant` **não é utilizado** no MediaPicker nem nos fluxos que ele aciona;
- Signed URLs passam por `validateTenantSignRequest` (M3.4) antes da assinatura;
- upload direto pela biblioteca central usa `createUploadTarget(domain: "media")`
  seguido por `registrarMidia` com revalidação server-side (M3.2 + Patch M3.2.1).

A auditoria da implementação atual confirma que **nenhuma alteração
funcional é necessária** para cumprir o Definition of Done da M3.5. Duas
pendências arquiteturais permanecem formalmente registradas como backlog:

1. **Upload Provenance Token** — Opção B (backlog).
2. **M3.3.2 — Metadata Rewrite Batch** — mantido no backlog.

## 2. Arquivos Alterados / Criados

- **Criado:** `docs/fase6/23-m3-5-media-picker-validation.md` (este relatório).
- **Editado:** `docs/architecture/impact-analysis/README.md` (índice IA-004).
- **Editado:** `docs/architecture/impact-analysis/IA-004-TenantStorageIsolation.md`
  (status da M3.5 e backlog).
- **Nenhum arquivo de código foi alterado** — MediaPicker e server functions
  já estavam em conformidade após M3.2/M3.4/M3.3.

## 3. Fluxo de Listagem

**Origem dos dados:** `listarMidias` (server function em
`src/lib/api/media.functions.ts`) protegida por `requireSupabaseAuth`.

**Tenant resolution:** dentro do handler, `supabase.rpc("get_current_tenant_id")`
resolve o tenant efetivo. Se o RPC retornar `null` (super_admin sem
impersonação, usuário com 0 ou N memberships, ou anônimo sem header autorizado),
a listagem é **abortada com erro estável**.

**Filtros:** `search`, `tipo`, `tag`, `page`, `pageSize` — todos validados por
Zod. **Nenhum `tenant_id`, `bucket` ou `path` é aceito do client.** A query
opera sobre `media_library` filtrada pelas RLS policies do tenant efetivo
(IA-003).

**Biblioteca vazia:** o MediaPicker renderiza estado vazio seguro
(“Nenhuma mídia. Envie arquivos em Mídias”), **sem tentar consultar
Storage diretamente**.

**Ausência de listagem direta em Storage:** confirmado. Toda listagem passa
por `media_library`; objetos físicos sem registro correspondente **não são
enumerados** — em conformidade com M3.3 e Patch M3.3.1.

## 4. Fluxo de Assinatura

**Ponto de entrada UX:** MediaPicker renderiza thumbnails a partir de URLs
assinadas devolvidas por `listarMidias` (que já assina no server) e/ou
`obterMidiaUrl` (para visualizações pontuais).

**Validação server-side:**
- `signIfSafe` chama `validateTenantSignRequest({ bucket: "site", path, tenantId })`
  antes de invocar `supabaseAdmin.storage.from(bucket).createSignedUrl(...)`;
- registros cujo path esteja fora de `{tenantId}/…` são **omitidos silenciosamente**
  (defesa contra legado — M3.3.2 tratará normalização);
- `obterMidiaUrl` valida bucket (allowlist tenant-scoped), prefixo e
  anti-traversal (`..`, `/`, `\`) — falha fast com mensagem estável.

**TTL aplicado (M3.4):**
- Preview (medium/thumbnail): `SIGNED_URL_TTL_PREVIEW_SECONDS = 900s` (15 min);
- Download/original: `SIGNED_URL_TTL_DOWNLOAD_SECONDS = 3600s` (60 min).

**Proibições:** MediaPicker **não** envia bucket/path para o servidor pedindo
assinatura direta. Toda assinatura é acionada por `media_id` ou pela listagem
do próprio tenant.

## 5. Fluxo de Upload

**Habilitação:** o MediaPicker atual (`MediaPicker.tsx`) **não expõe upload
direto** — ele apenas seleciona da biblioteca. Upload é feito na página
`/admin/midias`, que consome os mesmos server functions.

**Contrato server-authoritative:**
1. Client informa **intenção funcional** (`domain: "media"`, originalFileName,
   mimeType, size).
2. `createUploadTarget` (em `src/lib/api/uploads.functions.ts`) gera
   `bucket = "site"`, `path = {tenantId}/media/{storageFileName}` e
   `storageFileName`. Tenant vem de `requireTenant` (IA-001).
3. Client faz upload físico exatamente no `path` recebido.
4. `registrarMidia` recebe `uploadTarget` e revalida:
   - `bucket === "site"`;
   - `path` começa com `{tenantId}/media/`;
   - sem `..`, sem `\`, sem `/` inicial;
   - filename não vazio, sem barras, sem `.` inicial.
5. `media_library` persiste com `tenant_id` server-side.
6. MediaPicker passa a listar via `listarMidias` no tenant efetivo.

**Proibido e verificado como ausente:**
- montagem de path no MediaPicker;
- uso de `prefixTenant` no MediaPicker;
- envio de arquivo livre para `registrarMidia`;
- registro sem `uploadTarget`;
- bucket diferente de `site` para domínio `media`;
- path fora de `{tenantId}/media/…`.

## 6. Fluxo de Seleção

**Retorno atual:** `onChange({ url, media_id, path })`.

- `url` — Signed URL curta (preview), validada server-side;
- `media_id` — chave primária para todas as operações subsequentes
  (`obterMidiaUrl`, `registrarUsoMidia`, `atualizarMidia`);
- `path` — path físico tenant-scoped (`{tenantId}/media/…`), retornado
  por compatibilidade com consumidores atuais que persistem o path em
  campos de conteúdo (blog cover, page hero, etc.).

**Impacto arquitetural:** o `path` retornado ao consumer é o **mesmo path
server-authoritative** validado por `assertMediaPathSafe`; não é path
arbitrário do client. Ainda assim, a preferência arquitetural é que
consumidores futuros persistam `media_id` e resolvam URL/metadata
server-side. Migrar o contrato de todos os consumers (`ImovelForm`,
`LancamentoForm`, `PostForm`, `CmsPaginasTabs`, `GaleriaLancamento`, etc.)
está **fora do escopo da M3.5** e é registrado como backlog opcional
(“Media Picker Return Contract Normalization”).

## 7. Super Admin e Impersonação

Comportamento validado por leitura de `public.get_current_tenant_id()`
(pós-Patch M2b.1) + RLS policies (IA-003):

| Cenário | Resultado |
|---|---|
| Super Admin **sem** impersonação | `get_current_tenant_id()` → `NULL` → `listarMidias`/`obterMidiaUrl`/`registrarMidia` lançam “Tenant efetivo não resolvido”. **Nenhuma listagem, upload ou assinatura tenant-scoped.** |
| Super Admin **com** impersonação válida (`x-tenant-id` reconhecido) | `get_current_tenant_id()` retorna o tenant impersonado. Todas as operações são escopadas a esse tenant, sem cross-tenant leak. |
| Usuário comum com header `x-tenant-id` forjado | Header **é ignorado** para não-super_admin (Patch M2b.1). Tenant permanece o do membership do usuário. |
| Usuário comum com 0 ou N memberships | `get_current_tenant_id()` → `NULL` → mesmas rejeições fail-fast. |
| Anônimo | RLS bloqueia `media_library`; MediaPicker é rota autenticada. |

## 8. Upload Provenance Token

**Decisão: Opção B — Backlog formal.**

### Justificativa técnica

Embora `registrarMidia` já revalide o `uploadTarget` (bucket, prefixo,
anti-traversal, filename sanitizado), a auditoria do Patch M3.2.1 registrou
que **não há prova criptográfica de que o path foi de fato emitido por
`createUploadTarget`**. Um atacante autenticado no próprio tenant, com
conhecimento do formato de path, poderia teoricamente registrar mídia
apontando para um objeto que ele mesmo tenha subido diretamente ao bucket
via política de INSERT (se a policy permitir), sem passar por
`createUploadTarget`.

**Risco atual:** Baixo — mitigado por:
1. RLS de Storage restringe INSERT ao prefixo `{tenantId}/…`, portanto o
   objeto sempre está no próprio tenant;
2. path fora de `{tenantId}/media/…` é rejeitado por `assertMediaPathSafe`;
3. `storageFileName` gerado com UUID reduz colisão/adivinhação;
4. auditoria `cms.midia.upload` em `audit_log` rastreia qualquer inserção.

**Impacto:** um usuário legítimo do tenant poderia registrar como “mídia
oficial” um arquivo enviado fora do fluxo canônico. Não há vazamento
cross-tenant; o risco é de **procedência interna**.

**Proposta futura (Patch — Upload Provenance Token):**
- `createUploadTarget` emite JWT curto (60–120 s) assinado com segredo
  server-only, contendo `{ tenantId, bucket, path, domain, exp }`;
- `registrarMidia` exige o token e valida assinatura + expiração + match
  com o `uploadTarget` recebido;
- token é single-use (cache de `jti` em memória/DB por 5 min).

**Prioridade:** Média-baixa (defesa em profundidade).
**Dependências:** decisão sobre segredo (Supabase vault ou env), TTL,
cache de replay-protection.

## 9. Backlog M3.3.2 — Metadata Rewrite Batch

Preservado **fora do escopo da M3.5**. Reafirmando as 8 inconsistências
pendentes catalogadas no Patch M3.3.1:

- **3+ URLs absolutas** em `blog_posts.imagem_capa`;
- **3 URLs absolutas** em `corretores.foto_url`;
- **1** `site_settings.home_hero.image_path` sem prefixo tenant;
- **1** `corretores.foto_url` inválido.

Normalização será executada pela M3.3.2, com trilha auditável em
`public.storage_migration_log`. **Nenhuma dessas linhas foi tocada
nesta etapa.**

## 10. Testes

**Automatizados:** não foram adicionados testes nesta etapa (implementação
já era conforme). Suíte `tests/security/test_tenant_isolation.py` cobre
isolamento tenant no nível de RLS e continua verde.

**Cenários manuais validados por leitura de código:**

| # | Cenário | Resultado esperado | Verificado |
|---|---|---|---|
| 1 | MediaPicker com `media_library` vazia | Estado vazio, sem listagem em Storage | ✔ |
| 2 | Listagem lista apenas mídias do tenant efetivo | RLS + `get_current_tenant_id()` | ✔ |
| 3 | MediaPicker não consulta Storage diretamente | Não há `supabase.storage.list` no componente | ✔ |
| 4 | MediaPicker não assina URL por bucket/path arbitrário | `signIfSafe`/`validateTenantSignRequest` | ✔ |
| 5 | Assinatura por `media_id` (`obterMidiaUrl`) | Server valida bucket/prefixo/traversal | ✔ |
| 6 | Upload usa `createUploadTarget(domain: "media")` | `uploadTarget` obrigatório em `registrarMidia` | ✔ |
| 7 | Registro usa `registrarMidia` com `uploadTarget` | Schema Zod rejeita sem `uploadTarget` | ✔ |
| 8 | Super Admin sem impersonação falha | RPC retorna `NULL` → erro estável | ✔ |
| 9 | Super Admin com impersonação válida | Opera no tenant impersonado | ✔ |
| 10 | Usuário comum com header forjado não troca tenant | Patch M2b.1 ignora header para não-super_admin | ✔ |
| 11 | Path inválido (traversal/absoluto) falha | `assertMediaPathSafe` / `assertTenantScopedPath` | ✔ |
| 12 | Mídia de outro tenant não aparece | RLS de `media_library` | ✔ |
| 13 | Signed URL expirada tratada com segurança | TTL curto (15/60 min); UI mostra thumbnail quebrada, sem fallback inseguro | ✔ |

**Limitações:** ausência de teste E2E navegando o Media Picker em runtime.
Aceito para esta etapa — cenários cobertos por RLS + validação server-side
tornam o risco de regressão baixo.

## 11. Conformidade Arquitetural

Aderência confirmada a:

- `ARCHITECTURE_CONSTITUTION.md`
- `SECURITY_ARCHITECTURE.md`
- IA-001 — Tenant Middleware
- IA-002 — Client Impersonation Layer
- IA-003 — RLS Policies
- IA-004 — Tenant Storage Isolation
- M3.1 — Storage Inventory & Classification
- M3.2 — New Upload Path Enforcement
- Patch M3.2.1 — Upload Path Enforcement Correction
- M3.4 — Signed URL Hardening
- Patch M3.4.1 — IA-004 Index Fix
- M3.3 — Legacy File Migration
- Patch M3.3.1 — Metadata Normalization & Documentation Fix

## 12. Confirmação Formal

- **Nenhuma metadata legada foi normalizada.**
- **M3.3.2 não foi executada.**
- **Nenhum arquivo foi movido.**
- **Nenhum bucket foi alterado.**
- **Nenhuma policy de Storage foi alterada.**
- **Nenhum fallback inseguro foi criado.**
- **Nenhum TTL de Signed URL foi alterado.**
- **Nenhuma alteração em RLS fora do escopo da IA-004.**
- **Nenhuma revert de M3.2 ou M3.4.**
- **Nenhum tenant default foi criado.**

## 13. Recomendação

**Recomenda-se aprovar a M3.5** e, uma vez aprovada, **encerrar
operacionalmente a IA-004 — Tenant Storage Isolation**, mantendo em
backlog formal:

- **Patch futuro — Upload Provenance Token** (defesa em profundidade,
  prioridade média-baixa);
- **M3.3.2 — Metadata Rewrite Batch** (normalização das 8 inconsistências
  catalogadas, sem urgência operacional);
- **Backlog opcional** — normalização do contrato de retorno do
  MediaPicker para `media_id` puro (não bloqueante).

Nenhum patch corretivo é necessário para aprovação desta etapa.
