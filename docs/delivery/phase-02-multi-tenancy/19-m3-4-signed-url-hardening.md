# M3.4 — Signed URL Hardening

**IA-004 — Tenant Storage Isolation**
Status: implementada, aguardando auditoria crítica externa.
Etapa anterior aprovada: M3.2 + Patch M3.2.1 (New Upload Path Enforcement).
Etapa seguinte: **M3.3 — Legacy File Migration (BLOQUEADA até aprovação desta)**.

---

## 1. Resumo Executivo

A M3.4 endurece a **geração de Signed URLs para arquivos tenant-scoped
privados**, reduzindo o blast radius em caso de vazamento:

- **TTL de 365 dias eliminado** dos fluxos tenant-scoped privados.
- **TTLs centralizados** em constantes nomeadas em `src/lib/storage/signed-url.ts`
  (`SIGNED_URL_TTL_PREVIEW_SECONDS = 15 min`, `SIGNED_URL_TTL_DOWNLOAD_SECONDS = 60 min`).
- **Validação server-side obrigatória** (tenant efetivo IA-001 + bucket
  allowlist + prefixo `${tenantId}/` + anti-traversal) antes de qualquer
  chamada a `createSignedUrl` em fluxo tenant-scoped.
- **Cross-tenant signing rejeitado fail-fast** — inclusive na função
  administrativa `adminAssinarUrl`, que antes aceitava bucket/path
  arbitrários do cliente.
- **Assinatura via `media_id`** (`obterMidiaUrl`) passa a resolver o path a
  partir da metadata persistida da `media_library` sob RLS + valida o path
  contra o tenant efetivo.

Nenhuma migração de legado, movimentação de arquivos, alteração de bucket
ou de policy RLS foi executada — escopo restrito a assinatura.

---

## 2. Arquivos Alterados

| Arquivo | Tipo | Motivo |
|---|---|---|
| `src/lib/storage/signed-url.ts` | **novo** | Centraliza TTLs e valida bucket/path tenant-scoped. |
| `src/lib/api/media.functions.ts` | edição | `listarMidias` e `obterMidiaUrl` passam a resolver tenant server-side, validar path e usar TTL curto. Remove `SIGN_TTL = 365d`. |
| `src/lib/api/admin.functions.ts` | edição | `adminAssinarUrl` deixa de aceitar bucket/path arbitrários — agora exige tenant efetivo + allowlist + anti-traversal + TTL 15 min. |
| `docs/delivery/phase-02-multi-tenancy/19-m3-4-signed-url-hardening.md` | **novo** | Este relatório. |
| `docs/architecture/impact-analysis/README.md` | edição | Registra avanço da M3.4. |
| `docs/architecture/impact-analysis/IA-004-TenantStorageIsolation.md` | edição | Marca M3.4 como implementada. |

---

## 3. TTLs

### Antes

| Fluxo | TTL | Local |
|---|---|---|
| Media Library (listar/obter) | **365 dias** | `media.functions.ts` (`SIGN_TTL`) |
| Admin — assinatura arbitrária | **365 dias** | `admin.functions.ts::adminAssinarUrl` |
| Catálogo público (imóveis) | 365 dias | `catalogo.functions.ts` — **público, fora do escopo M3.4** |
| Site branding público | 365 dias | `site.functions.ts` — **público, fora do escopo M3.4** |
| Lançamentos (detalhe/listagem pública) | 24 h | `lancamentos.functions.ts` — **público, mantido** |

### Depois

| Fluxo | TTL novo | Constante |
|---|---|---|
| Media Library — variantes preview (medium/thumbnail) | **15 min** | `SIGNED_URL_TTL_PREVIEW_SECONDS` |
| Media Library — original / download op | **60 min** | `SIGNED_URL_TTL_DOWNLOAD_SECONDS` |
| Admin `adminAssinarUrl` (preview no admin) | **15 min** | `SIGNED_URL_TTL_PREVIEW_SECONDS` |

**Justificativa técnica.** Previews administrativos são consumidos em
segundos após a listagem; 15 min cobre navegação/reload sem manter a URL
utilizável em caso de vazamento. Downloads de originais e PDFs podem ser
interrompidos e retomados; 60 min é limite superior confortável sem
degradar UX. Ambos são **explícitos e nomeados**, sem números mágicos.

### Não alterados nesta etapa

Assinaturas em `catalogo.functions.ts` (365d) e `site.functions.ts`
(365d) servem o **site público** (SSR anônimo). Classificados como
**public website assets** — tratamento próprio documentado em §7 e listado
como risco remanescente para etapa futura dedicada.

---

## 4. Funções de Signed URL Analisadas

| Função | Arquivo | Bucket | Origem do path | Validação M3.4 | TTL |
|---|---|---|---|---|---|
| `listarMidias` | `media.functions.ts` | `site` | `media_library` (server, sob RLS) | tenant + allowlist + anti-traversal + prefixo | 15 min / 60 min |
| `obterMidiaUrl` | `media.functions.ts` | `site` | `media_library.id` (server) | tenant + allowlist + anti-traversal + prefixo | 15 min / 60 min |
| `adminAssinarUrl` | `admin.functions.ts` | client → validado | client → validado | admin + tenant + allowlist + anti-traversal + prefixo | 15 min |
| `signedUrl` (site público) | `site.functions.ts` | server | `site_settings` (server) | **NÃO alterada** (public website assets) | 365 d |
| Assinaturas de catálogo público | `catalogo.functions.ts` | server | tabelas públicas | **NÃO alterada** (public website assets) | 365 d |
| Assinaturas de lançamentos públicos | `lancamentos.functions.ts` | `lancamentos` | server | **NÃO alterada** (público, TTL já curto — 24h) | 24 h |

---

## 5. Validações Server-Side Implementadas

Aplicadas via `validateTenantSignRequest({ bucket, path, tenantId })` em
`src/lib/storage/signed-url.ts`:

- **Autenticação** — todas as funções tenant-scoped usam
  `requireSupabaseAuth`.
- **Tenant efetivo** — resolvido via `supabase.rpc("get_current_tenant_id")`
  (IA-001, corrigido em Patch M2b.1). Header `x-tenant-id` do cliente NÃO
  é lido nas funções de assinatura.
- **Bucket allowlist** — apenas `["site", "imoveis", "lancamentos"]` são
  considerados tenant-scoped privados. Bucket fora da lista → fail-fast.
- **Path shape** — rejeita path vazio, com `..`, com `\` ou começando com `/`.
- **Prefixo tenant** — rejeita path que não comece com `${tenantId}/`.
- **Ownership** — em `obterMidiaUrl`, a query em `media_library` corre sob
  RLS do usuário (IA-003 / M2b), garantindo que só mídia do tenant
  retorne linha.
- **Super Admin sem impersonação** — sem `x-tenant-id` válido e sem
  membership, `get_current_tenant_id()` retorna nulo → assinatura negada.
- **Super Admin com impersonação válida** — tenant efetivo passa a ser o
  impersonado; assinatura permitida somente para paths desse tenant.
- **Branch anônima** — funções acima exigem sessão autenticada (401 caso
  contrário) por meio do middleware. Não há bypass anônimo para arquivos
  tenant-scoped privados. Ver §10.

---

## 6. Media Library

Fluxo endurecido:

```
client solicita URL (media_id, variant)
        │
        ▼
requireSupabaseAuth → tenant efetivo (IA-001)
        │
        ▼
SELECT arquivo/arquivo_medium/arquivo_thumbnail
FROM media_library WHERE id = :id      (RLS aplica)
        │
        ▼
validateTenantSignRequest({ bucket: "site", path, tenantId })
        │
        ▼
supabaseAdmin.storage.from("site").createSignedUrl(path, TTL curto)
```

Confirmações:

- assinatura parte **exclusivamente** da metadata persistida
  (`media_library`) — nunca de path/bucket enviado pelo cliente;
- `bucket` é constante (`"site"`) na server function;
- `tenantId` vem do server;
- `path` é revalidado mesmo tendo sido escrito pelo próprio backend, para
  proteger contra registros legados fora do padrão canônico (que serão
  tratados na M3.3).

---

## 7. Fluxos Públicos vs Tenant-Scoped Privados

| Classe | Exemplos | TTL atual | Anônimo? | Ação M3.4 |
|---|---|---|---|---|
| **Tenant-scoped private (admin)** | Media Library, `adminAssinarUrl` | 15 min / 60 min | não | endurecido nesta etapa |
| **Public website assets** | Branding do site, capas de catálogo, hero images, lançamentos públicos | 24 h – 365 d | sim (SSR público) | **fora do escopo M3.4** — documentado como risco |
| **Public downloads (PDFs de lançamento no site)** | `lancamentos.functions.ts::obterLancamentoPublico` | 24 h | sim | mantido — TTL já razoável |

**Recomendação futura (não implementada):** para public website assets,
avaliar (a) trocar bucket para público com CDN e URLs estáveis, ou (b)
manter Signed URLs porém com TTL na casa das horas + cache no edge. Não
transformar tenant-scoped private em público.

---

## 8. Compatibilidade com Legado

- **Nenhum arquivo legado foi migrado.**
- **Nenhum path legado foi regravado.**
- **Nenhum bucket ou policy alterado.**
- Em `listarMidias`, registros legados cujo path não comece com
  `${tenantId}/` (ex.: eventuais registros antigos gravados antes da M3.2)
  retornam `url = null` em vez de assinatura, ao invés de vazar acesso —
  a normalização definitiva é objetivo da M3.3.

---

## 9. Testes e Cenários

Não há suíte automatizada específica para signed URL neste repositório.
Cenários manuais validados / a serem revalidados em auditoria:

- [x] Usuário autenticado com membership única → assinatura curta emitida.
- [x] Chamada sem sessão → 401 do middleware, sem assinatura.
- [x] `adminAssinarUrl` com `bucket = "outro"` → rejeitado
      (`bucket … fora da allowlist tenant-scoped`).
- [x] `adminAssinarUrl` com `path = "../outra_tenant/file.jpg"` → rejeitado
      (`path inseguro (traversal ou absoluto)`).
- [x] `adminAssinarUrl` com `path = "/etc/passwd"` → rejeitado.
- [x] `adminAssinarUrl` com `path` de outro tenant → rejeitado
      (`path fora do escopo do tenant`).
- [x] `obterMidiaUrl` para `id` inexistente ou de outro tenant → RLS
      derruba a query antes da assinatura.
- [x] Super Admin sem impersonação em tenant-scoped fn → sem tenant
      efetivo, assinatura negada.
- [x] Super Admin com `x-tenant-id` válido → assinatura emitida no tenant
      impersonado; paths de outros tenants continuam rejeitados.
- [x] Usuário comum enviando `x-tenant-id` forjado → header ignorado
      (middleware exige super-admin, IA-001).

---

## 10. Riscos Remanescentes

Encaminhados para etapas seguintes:

- **M3.3 — Legacy File Migration**
  - Registros de `media_library` legados fora do prefixo `${tenantId}/`
    hoje retornam URL nula; migração formal fará a normalização.
  - Arquivos órfãos no bucket `site` (sem row correspondente) não são
    tratados aqui.
- **M3.5 — Media Picker Validation**
  - O `MediaPicker` consome as URLs assinadas retornadas pelo servidor;
    validação adicional de escopo no client-side será feita na M3.5.
- **Patch posterior — upload provenance / token de emissão**
  - Ressalva já registrada no Patch M3.2.1: `registrarMidia` valida
    tenant/domain/path, mas **ainda não prova** que o path foi
    efetivamente emitido por `createUploadTarget`. A M3.4 herda essa
    ressalva; a mitigação (token/HMAC assinado pelo servidor no
    `uploadTarget`) permanece prevista para patch posterior.
- **Public website assets** (`catalogo.functions.ts`, `site.functions.ts`)
  - Mantêm TTL de 365 dias por servir SSR anônimo público; risco
    aceito no contexto público, sujeito a etapa dedicada.

---

## 11. Conformidade Arquitetural

| Documento | Aderência |
|---|---|
| Architecture Constitution | ✔ Não altera Registry/Snapshot/ResolutionGraph/Executor/PluginContext/Bootstrap. |
| Security Architecture | ✔ Reforça “Signed URL não é autorização” (§6). |
| IA-001 (Tenant Middleware) | ✔ Usa `get_current_tenant_id()` server-side. |
| IA-002 (Impersonação) | ✔ Preserva `x-tenant-id` só para super-admin. |
| IA-003 / M2b / Patch M2b.1 | ✔ Depende da cardinalidade corrigida do RPC de tenant. |
| IA-004 | ✔ Executa subetapa M3.4 sem tocar M3.3/M3.5. |
| M3.1 (Inventário) | ✔ Cobre os fluxos catalogados como tenant-scoped privados. |
| M3.2 + Patch M3.2.1 | ✔ Consome contrato server-authoritative de path já estabelecido. |

---

## 12. Confirmação Formal

- Nenhuma migração legada foi executada.
- Nenhum arquivo existente foi movido, renomeado ou apagado.
- Nenhum bucket foi criado, removido ou reconfigurado.
- Nenhuma policy RLS foi alterada.
- M3.3 e M3.5 permanecem **BLOQUEADAS** até auditoria e aprovação formal
  desta M3.4.

---

## 13. Recomendação

Recomenda-se **submeter esta M3.4 a auditoria crítica externa**. Após
aprovação (ou aplicação de patch corretivo), autorizar a M3.3 — Legacy
File Migration.
