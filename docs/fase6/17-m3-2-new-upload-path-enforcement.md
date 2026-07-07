# M3.2 — New Upload Path Enforcement (Relatório Técnico)

**Etapa:** IA-004 › M3 › **M3.2**  
**Status:** Implementada — aguardando auditoria externa  
**Escopo:** Autoridade server-side sobre bucket, path e filename de **novos uploads**.  
**Não executado:** M3.3 (Legacy Migration), M3.4 (Signed URL Hardening), M3.5 (Media Picker).

---

## 1. Resumo Executivo

A M3.2 elimina a autoridade do client sobre o path físico de Storage. Antes,
todo call site chamava `prefixTenant(...)` — helper client-side que lia um
cache local (`tenant-cache.ts`) e concatenava `{tenantId}/...` na origem. Um
client comprometido, um bug de estado, ou uma manipulação manual do bundle
podiam, em tese, montar um path apontando para outro tenant e depender
apenas da política RLS de Storage como última linha de defesa.

A partir desta etapa:

- O client envia apenas **intenção funcional** (domain, entityId?, variant?,
  originalFileName, mimeType, size).
- O servidor **resolve** o tenant efetivo via `requireTenant` (IA-001),
  **valida** a ownership da entidade (quando aplicável), **gera** o filename
  físico, e **constrói** o path final `{tenantId}/{subPath}/{storageFileName}`.
- Qualquer path arbitrário enviado pelo client é **ignorado por construção**
  (o contrato de entrada não aceita `path`).

---

## 2. Arquivos Alterados

| Caminho | Tipo | Motivo |
| --- | --- | --- |
| `src/lib/storage/upload-contract.ts` | **novo** | Contrato client-safe: enum fechado `UploadDomain` + tipos `CreateUploadTargetInput/Result`. |
| `src/lib/api/uploads.functions.ts` | **novo** | Server function `createUploadTarget`: autoridade sobre tenant + bucket + path + filename. |
| `src/components/admin/ImovelForm.tsx` | refatoração | Upload de imagens de imóvel via `createUploadTarget` (`domain: "imoveis"`). |
| `src/components/admin/LancamentoForm.tsx` | refatoração | Upload de capa via `createUploadTarget` (`domain: "lancamento-capa"`). |
| `src/components/admin/GaleriaLancamento.tsx` | refatoração | Upload da galeria via `createUploadTarget` (`domain: "lancamento-galeria"`). |
| `src/components/admin/PdfsLancamento.tsx` | refatoração | Upload de PDFs via `createUploadTarget` (`domain: "lancamento-pdf"`, variant validada server-side). |
| `src/components/admin/PostForm.tsx` | refatoração | Capa de post via `createUploadTarget` (`domain: "blog-cover"`). |
| `src/components/admin/RichTextEditor.tsx` | refatoração | Imagem inline via `createUploadTarget` (`domain: "blog-inline"`). |
| `src/components/admin/CmsPaginasTabs.tsx` | refatoração | Hero das páginas Sobre/Anuncie via `createUploadTarget` (`domain: "cms-page"`, variant validada). |
| `src/routes/_authenticated.admin.corretores.tsx` | refatoração | Foto de corretor via `createUploadTarget` (`domain: "corretor-foto"`). |
| `docs/fase6/17-m3-2-new-upload-path-enforcement.md` | novo | Este relatório. |
| `docs/architecture/impact-analysis/README.md` | atualização | Registro de progresso da IA-004 / M3.2. |

`src/lib/tenant-cache.ts` **não** foi removido — `prefixTenant()` deixa de
ser chamado por qualquer fluxo de upload, mas o cache permanece disponível
enquanto outras camadas o consumirem. Nenhum arquivo legado, bucket ou
política foi alterado.

---

## 3. Contrato de Upload

### 3.1 Entrada aceita do client

```ts
type CreateUploadTargetInput = {
  domain: UploadDomain;             // enum FECHADO
  originalFileName: string;         // apenas metadata / base para filename físico
  mimeType?: string | null;
  size?: number | null;
  entityId?: string | null;         // obrigatório para imoveis / lancamento-*
  variant?: string | null;          // sub-tipo controlado (pdfKind, pageVariant)
};
```

### 3.2 Saída autoritativa do servidor

```ts
type CreateUploadTargetResult = {
  bucket: string;         // resolvido pelo servidor
  path: string;           // `${tenantId}/${subPath}/${storageFileName}`
  storageFileName: string;// gerado pelo servidor
  tenantId: string;
  domain: UploadDomain;
};
```

### 3.3 Autoridade

| Responsabilidade | Autoridade |
| --- | --- |
| Resolver tenantId | **Servidor** (`requireTenant` → IA-001 / M2b.1) |
| Escolher bucket | **Servidor** (mapa domain → bucket) |
| Construir path | **Servidor** (template fechado por domain) |
| Gerar storageFileName | **Servidor** (`<8-uuid>-<sanitized><.ext>`) |
| Nome original | Client (persistido apenas como metadata) |
| Mime type / size | Client (informativo; podem ser reforçados no server) |
| Prefixo `{tenantId}/…` | **Servidor** (o client pode receber o path autoritativo gerado pelo servidor para executar o upload físico, mas não pode construir, alterar ou escolher esse path) |
| `path` completo | **Recusado** — não existe no schema de entrada |

### 3.4 Client não pode mais enviar

- Path físico completo ou parcial.
- Prefixo de tenant.
- Nome de bucket.
- Filename físico (apenas o nome original).
- Slug / entityId sem validação server-side.
- Sub-kind livre (variant tem enum fechado por domain).

---

## 4. Estratégia de Path

Adotada, para novos uploads, a hipótese **H2 (sem prefixo `tenants/`)** da
IA-004 — coerente com o padrão emergente identificado na M3.1 e com as
policies RLS de Storage já em produção:

```
{tenantId}/{subPath}/{storageFileName}
```

| Domain | Bucket | subPath |
| --- | --- | --- |
| `imoveis` | `imoveis` | `{entityId}` |
| `lancamento-capa` | `lancamentos` | `{slug}/capa` |
| `lancamento-galeria` | `lancamentos` | `{slug}/galeria` |
| `lancamento-pdf` | `lancamentos` | `{slug}/{pdfKind}` |
| `blog-cover` | `site` | `blog` |
| `blog-inline` | `site` | `blog/inline` |
| `cms-page` | `site` | `{pageVariant}` (`sobre` \| `anuncie`) |
| `corretor-foto` | `site` | `corretores` |
| `media` | `site` | `media` |

**Justificativa:** preserva 100% da compatibilidade com as políticas RLS já
auditadas em M2b/M2b.1 (que assumem `storage.foldername(name)[1] = tenant`),
elimina a necessidade de qualquer migração de legado nesta etapa e mantém a
performance de leitura já observada.

Para `lancamento-*`, o `slug` deixa de ser enviado pelo client — o servidor
busca `launch_projects.slug` a partir do `entityId` (SELECT sob RLS, portanto
cross-tenant retorna `null` e a função aborta). Isso já garante ownership
mesmo antes de qualquer verificação adicional.

---

## 5. Validações Server-Side

Implementadas em `src/lib/api/uploads.functions.ts`:

| Categoria | Validação |
| --- | --- |
| **Tenant** | `requireTenant` → 0 memberships / N memberships / super-admin sem impersonação → **fail-fast**. |
| **Domain** | Zod `z.enum(UPLOAD_DOMAINS)` — enum fechado. |
| **Entity ownership (imoveis)** | `SELECT id FROM imoveis WHERE id = entityId` sob RLS do usuário; ausência → erro. |
| **Entity ownership (lancamentos)** | `SELECT id, slug FROM launch_projects WHERE id = entityId` sob RLS; ausência → erro. |
| **entityId format** | Regex UUID v4-ish. |
| **variant (lancamento-pdf)** | Enum fechado `{ pdfs, book, planta, memorial }`. |
| **variant (cms-page)** | Enum fechado `{ sobre, anuncie }`. |
| **Filename** | NFD-strip, remove `\\` / `/`, colapsa `..`, remove `^\\.+`, whitelist `[a-zA-Z0-9._-]`, trunca em 120 chars. |
| **Storage filename** | Gerado pelo servidor com prefixo `crypto.randomUUID().slice(0,8)` → previne colisão. |
| **Extension** | Regex `\\.[a-zA-Z0-9]{1,8}$` — extensões arbitrárias e binárias sem extensão são normalizadas. |
| **Path traversal** | Impossível por construção: o servidor concatena strings sanitizadas; o client não injeta separadores. |
| **Super Admin (sem impersonação)** | `requireTenant` já rejeita → não recebe `tenantId`, upload aborta antes de tocar em Storage. |
| **Super Admin (com impersonação válida)** | `requireTenant` retorna o tenant impersonado; upload prossegue normal. |
| **Header `x-tenant-id` forjado por usuário comum** | Ignorado por `requireTenant` (IA-001 §12.2) — não muda tenant. |
| **Mime type** | Recebido como metadata informativa. Reforço estrito por domain fica para uma etapa posterior (fora do escopo M3.2). |

Permissões CMS por domain seguem sendo aplicadas nas server functions de
persistência (`adminAdicionarImagem`, `adminAdicionarImagemLancamento`,
`adminAdicionarPdfLancamento`, `registrarMidia`, `atualizarSiteSettings`,
etc.), agora recebendo o `path` já autoritativo.

---

## 6. Compatibilidade com Legado

- Nenhum arquivo existente foi lido, copiado, movido, sobrescrito ou removido.
- Nenhum path legado foi regravado no banco.
- Buckets permanecem inalterados (`imoveis`, `lancamentos`, `site`, todos
  privados).
- Leituras existentes (Signed URLs curadas por `adminAssinarUrl`,
  `obterMidiaUrl`, `listarMidias`) continuam funcionando sem alteração: elas
  operam sobre `path` armazenado, seja ele o novo formato ou o pré-existente.
- Registros antigos que já usavam `{tenantId}/...` (via `prefixTenant`)
  continuam válidos — o novo formato é o mesmo padrão, apenas gerado no
  servidor.

---

## 7. Riscos Remanescentes

| Risco | Endereça em |
| --- | --- |
| Uploads antigos com caminhos legados não conformes ao novo template canônico | **M3.3 — Legacy File Migration** |
| Signed URLs com TTL de 365 dias (`SIGN_TTL` em `media.functions.ts` e `lancamentos.functions.ts`) | **M3.4 — Signed URL Hardening** |
| Media Picker (`src/components/admin/MediaPicker.tsx`) e fluxo de upload da biblioteca central de mídias — `registrarMidia` ainda aceita `arquivo` como string arbitrária no schema | **M3.5 — Media Picker Validation** (endurecer `registrarMidia` para exigir path começando com `{tenantId}/media/`) |
| Enforcement de mime-type por domain (ex.: PDFs só em `lancamento-pdf`) | pode virar patch M3.2.x ou entrar em M3.5 |
| Bucket `imoveis` e `lancamentos` são privados; políticas RLS de Storage já validadas na M2b, não revisadas nesta etapa | fora do escopo M3.2 |

---

## 8. Testes

**Automatizados:** não foram criados testes novos nesta etapa — o projeto
possui testes Python em `tests/` para camadas superiores; a suíte de
unit tests de `tenant-middleware` já cobre o algoritmo de resolução usado
por `requireTenant`.

**Cenários testáveis manualmente / recomendados para auditoria:**

| # | Cenário | Resultado esperado |
| --- | --- | --- |
| 1 | Upload sem sessão | Rejeitado por `requireSupabaseAuth`. |
| 2 | Usuário multi-membership sem impersonação | Rejeitado por `requireTenant` (cardinality). |
| 3 | Super Admin sem impersonação chama `createUploadTarget` | `requireTenant` retorna erro; upload não ocorre. |
| 4 | Super Admin com impersonação válida | Path final começa com o tenant impersonado. |
| 5 | Usuário comum envia header `x-tenant-id` forjado | Header ignorado; tenant resolvido por membership. |
| 6 | Client tenta enviar `path`/`bucket`/`storageFileName` | Schema Zod rejeita — não existem no `inputValidator`. |
| 7 | `domain` fora do enum | `z.enum` rejeita antes do handler. |
| 8 | `entityId` de outro tenant para `imoveis`/`lancamento-*` | SELECT sob RLS retorna vazio → erro "Imóvel/Lançamento inexistente ou fora do tenant efetivo". |
| 9 | `originalFileName = "../../../etc/passwd"` | Sanitização remove `..` e `/` → filename físico seguro. |
| 10 | Dois uploads com o mesmo nome original | Colisão impossível — cada storageFileName recebe prefixo UUID. |
| 11 | Path final devolvido | Sempre `${tenantId}/…` com `tenantId` retornado pelo servidor. |
| 12 | Storage RLS bloquearia se algum path fosse forjado | Confirmação secundária — policies M2b continuam ativas. |

---

## 9. Conformidade Arquitetural

| Norma | Aderência |
| --- | --- |
| **Architecture Constitution** | ✔ Sem tocar em Registry / Snapshot / ResolutionGraph / Executor / PluginContext / Bootstrap. |
| **Security Architecture** | ✔ Client autoridade zero sobre boundary crítica; server é a única fonte de verdade sobre tenant × bucket × path × filename. |
| **IA-001 — Tenant Middleware** | ✔ `createUploadTarget` compõe sobre `requireTenant`; nenhuma heurística de tenant. |
| **IA-002 — Client Impersonation** | ✔ `attachTenantHeader` permanece no start; super-admin com impersonação funciona; usuário comum não pode forjar tenant. |
| **IA-003 — RLS Policies** | ✔ Formato de path `{tenantId}/…` continua compatível com todas as policies auditadas em M2b. |
| **M2b + Patch M2b.1** | ✔ `get_current_tenant_id()` continua sendo a autoridade SQL para tenants; middleware TS espelha o mesmo algoritmo. |
| **Invariantes permanentes** | ✔ Sem novo bucket, sem alteração de policy, sem migração de dado, sem fallback implícito. |

---

## 10. Confirmação Formal

- Nenhuma migração legada foi executada.
- Nenhum arquivo existente em Storage foi movido, copiado ou removido.
- Nenhum bucket foi alterado.
- Nenhuma policy RLS foi alterada (nem de tabela, nem de Storage).
- Nenhum registro de banco foi reescrito.
- Nenhuma alteração fora do escopo declarado da M3.2.
- **M3.3 permanece BLOQUEADA** até auditoria e aprovação formal desta etapa.

---

## 11. Recomendação para Próxima Etapa

Recomenda-se **avançar para M3.3 — Legacy File Migration** após auditoria
externa deste relatório, com plano detalhado de inventário de paths não
conformes ao template canônico (se houver) antes de qualquer migração.

Alternativamente, é aceitável reordenar para **M3.4 — Signed URL Hardening**
primeiro (reduzir TTL de 365 d), já que hoje é a exposição mais alta em
tempo/blast-radius e não depende de M3.3. Deixo essa decisão para o
auditor / product owner arquitetural.
