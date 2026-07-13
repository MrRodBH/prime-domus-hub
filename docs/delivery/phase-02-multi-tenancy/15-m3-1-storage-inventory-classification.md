# M3.1 — Storage Inventory & Classification

**Fase:** 2 — Multi-Tenant Hardening
**Etapa:** M3.1 (subetapa analítica da M3 — Tenant Storage Isolation)
**Status:** Concluída — pronta para auditoria externa
**Data:** 2026-07-07
**Escopo:** Descoberta e documentação. Nenhuma alteração funcional, de schema, de bucket, de policy ou de arquivo foi realizada.
**Referências normativas:** `ARCHITECTURE_CONSTITUTION.md`, `SECURITY_ARCHITECTURE.md`, `ROADMAP_ARCHITECTURAL.md`, `ADR-001..004`, `IA-004 — Tenant Storage Isolation`, IA-001, IA-002, IA-003, Patch 2.3.1, Patch M2b.1.

---

## 1. Resumo Executivo

A auditoria de descoberta da M3.1 identificou que a arquitetura de Storage do RM Prime SaaS **já implementa, de fato, uma primeira camada de isolamento por tenant**, executada em migrations aplicadas em 2026-07-01, anteriores à formalização da IA-004. Os três buckets existentes (`imoveis`, `lancamentos`, `site`) já possuem policies RESTRICTIVE-shape na tabela `storage.objects` que exigem que `(storage.foldername(name))[1] = get_current_tenant_id()::text` (ou `is_super_admin()`), e todos os call sites de `supabase.storage.from(...).upload(...)` no `src/` utilizam o helper `prefixTenant(...)`, que antepõe `{tenantId}/` ao path.

Portanto, a M3 **não parte de estado zero**: parte de uma implementação preexistente, funcional, porém **nunca formalmente auditada, documentada nem coberta por gate arquitetural**. O objetivo real da M3 passa a ser:

1. **Consolidar e auditar** o isolamento já em produção;
2. **Endurecer** os pontos que ainda dependem de decisão do client (o próprio `prefixTenant`);
3. **Formalizar** a estratégia H1/H2/H3/H4 à luz do padrão de facto que emergiu;
4. **Cobrir os gaps identificados** (branch anônima de `get_current_tenant_id`, Signed URLs via `supabaseAdmin` que bypassa RLS, ausência de validação server-side de path em `.upload`).

Nenhum arquivo foi movido, copiado, removido ou renomeado. Nenhum bucket foi criado, alterado ou removido. Nenhuma policy foi modificada. Nenhuma migration nova foi criada.

---

## 2. Buckets

| Bucket | Finalidade | Público? | Objetos (contagem observada) | Utilização atual | Dependências | Possibilidade de descontinuação |
|---|---|---|---|---|---|---|
| `imoveis` | Imagens de imóveis (fotos da galeria por imóvel) | Privado | 0 objetos observados na inspeção (`storage.objects`) | Ativo — receber uploads via `ImovelForm` | `imovel_imagens.url` (path), `imoveis.imagem_capa` (referência simbólica) | Não — bucket de negócio |
| `lancamentos` | Capa, galeria e PDFs de lançamentos imobiliários | Privado | 0 objetos observados | Ativo — `LancamentoForm`, `GaleriaLancamento`, `PdfsLancamento` | `launch_projects.imagem_capa`, `launch_project_imagens.storage_path`, `launch_pdfs.storage_path` | Não — bucket de negócio |
| `site` | Ativos institucionais (branding, blog, biblioteca de mídias, uploads CMS, fotos de corretores) | Privado | 22 objetos, todos já prefixados com `{RM_TENANT_ID}/…` | Ativo — múltiplos editores CMS + `media_library` + Blog + Corretores | `site_settings.value` (JSONB), `blog_posts.imagem_capa`, `corretores.foto_url`, `media_library.arquivo/arquivo_medium/arquivo_thumbnail` | Não — bucket institucional multiuso |

Todos os três buckets são **privados** — não há bucket público em uso. Toda leitura passa por `createSignedUrl`, gerada por server functions (majoritariamente via `supabaseAdmin`, ver §5).

Observação de baseline: a inspeção retornou 0 objetos em `imoveis` e `lancamentos` no momento da auditoria — não indica descontinuação; indica que o ambiente atual concentra dados institucionais em `site`. Os buckets seguem ativos no código de upload.

---

## 3. Inventário dos Arquivos

Classificação por categoria funcional observada nos call sites:

| Categoria | Bucket | Aproximação | Classificação (§7) |
|---|---|---|---|
| Imagens de imóveis (capa + galeria) | `imoveis` | 0 observado | **Tenant Scoped** |
| Capas de lançamentos | `lancamentos` | 0 observado | **Tenant Scoped** |
| Galeria de lançamentos | `lancamentos` | 0 observado | **Tenant Scoped** |
| PDFs de lançamentos (memorial, tabela, brochura) | `lancamentos` | 0 observado | **Tenant Scoped** |
| Blog — capas | `site` (`{tid}/blog/…`) | subset dos 22 | **Tenant Scoped** |
| Blog — inline (RichTextEditor) | `site` (`{tid}/blog/inline/…`) | subset dos 22 | **Tenant Scoped** |
| Corretores — foto | `site` (`{tid}/corretores/…`) | subset dos 22 | **Tenant Scoped** |
| CMS Página "Sobre" | `site` (`{tid}/sobre-…`) | subset dos 22 | **Tenant Scoped** |
| CMS Página "Anuncie" | `site` (`{tid}/anuncie-…`) | subset dos 22 | **Tenant Scoped** |
| Branding institucional (hero, logo) | `site` (`{tid}/hero-…`, `{tid}/logo-…`) | subset dos 22 | **Tenant Scoped** |
| Biblioteca de mídias (CMS Media Library) | `site` (`{tid}/media/…`) | ver §8 | **Tenant Scoped** |
| Assets do sistema (favicon, ícones da app) | Não estão em Storage — vivem em `public/` e `src/assets/` | — | **System Asset** |
| Legacy (pré-prefixo) | Nenhum encontrado — a migration de 2026-07-01 já reescreveu paths não-prefixados | 0 | **Legacy** — ausente |
| Orphan (sem row em BD) | Não inventariado nesta etapa — requer cross-join `storage.objects × colunas de path` em subetapa dedicada | Desconhecido | **Orphan** — pendente |
| Unknown | Nenhum path observado fora do padrão `{uuid-tenant}/...` no bucket `site` | 0 | **Unknown** — ausente |

---

## 4. Inventário das Tabelas com Referência a Storage

| Tabela | Coluna(s) | Tipo de referência | Bucket alvo | Padrão de path atual | `tenant_id` presente? | Observações |
|---|---|---|---|---|---|---|
| `imovel_imagens` | `url` (path bucket) | Path relativo (não URL absoluta) | `imoveis` | `{tenantId}/{imovelId}/{ordem}-{filename}` | Não diretamente — herdado via `imoveis.tenant_id` | Migration `20260701210935` já prefixou linhas legadas |
| `imoveis` | `imagem_capa` (símbolo — capa é `imovel_imagens.principal=true`) | Referência lógica | `imoveis` | idem | Sim (`tenant_id`) | — |
| `launch_project_imagens` | `storage_path` | Path relativo | `lancamentos` | `{tenantId}/{slug}/galeria/{rand}-{filename}` | Via `launch_projects.tenant_id` | Prefixado pela migration |
| `launch_projects` | `imagem_capa` | Path relativo | `lancamentos` | `{tenantId}/{slug}/capa/{rand}-{filename}` | Sim | Prefixado pela migration |
| `launch_pdfs` | `storage_path` | Path relativo | `lancamentos` | `{tenantId}/{slug}/{kind}/{rand}-{filename}` | Via `launch_projects` | Prefixado pela migration |
| `blog_posts` | `imagem_capa` | Path relativo | `site` | `{tenantId}/blog/{rand}-{filename}` | Sim (`tenant_id`) | Prefixado pela migration |
| `corretores` | `foto_url` | Path relativo | `site` | `{tenantId}/corretores/{rand}-{filename}` | Sim (`tenant_id`) | Prefixado pela migration |
| `site_settings` | `value` (JSONB) — chaves `branding.*_url`, hero, etc. | Path relativo dentro de JSONB | `site` | `{tenantId}/hero-…`, `{tenantId}/logo-…` | Sim (`tenant_id`) | Migration usa JSONB walker; risco residual em chaves adicionadas depois |
| `media_library` | `arquivo`, `arquivo_medium`, `arquivo_thumbnail` | Path relativo | `site` | `{tenantId}/media/{...}` | Sim (`tenant_id`) | Policies dedicadas exigem `foldername[2]='media'` |
| `media_usage` | `media_id` (FK), `entidade`, `entidade_id`, `campo` | Indireção | — | — | Sim (via `media_library`) | Registro de uso, não path |
| `cms_pages`, `cms_forms`, `cms_campaigns`, `cms_import_snapshots` | Blocos JSONB podem referenciar mídias via `media_id` ou URL assinada | Indireto | — | — | Sim | Sem coluna dedicada de path |

Não há tabelas que armazenem **URLs absolutas** de Storage — todas armazenam **path relativo ao bucket**. Isso é aderente à IA-004.

---

## 5. Inventário do Código

### 5.1 Uploads (client-side, com prefixo `prefixTenant`)

| Local | Bucket | Path construído | Autoridade sobre o path | Autoridade sobre o bucket |
|---|---|---|---|---|
| `src/components/admin/ImovelForm.tsx:258` | `imoveis` | `prefixTenant(\`${form.id}/${prefix}-${sanitized}\`)` | **Client** | **Client** |
| `src/components/admin/LancamentoForm.tsx:210` | `lancamentos` | `prefixTenant(\`${slug}/capa/…\`)` | **Client** | **Client** |
| `src/components/admin/GaleriaLancamento.tsx:69` | `lancamentos` | `prefixTenant(\`${slug||projectId}/galeria/…\`)` | **Client** | **Client** |
| `src/components/admin/PdfsLancamento.tsx:108` | `lancamentos` | `prefixTenant(\`${slug||projectId}/${kind}/…\`)` | **Client** | **Client** |
| `src/components/admin/PostForm.tsx:112` | `site` | `prefixTenant(\`blog/…\`)` | **Client** | **Client** |
| `src/components/admin/RichTextEditor.tsx:128` | `site` | `prefixTenant(\`blog/inline/…\`)` | **Client** | **Client** |
| `src/components/admin/CmsPaginasTabs.tsx:157, :321` | `site` | `prefixTenant(\`sobre-…\`)` / `prefixTenant(\`anuncie-…\`)` | **Client** | **Client** |
| `src/routes/_authenticated.admin.corretores.tsx:215` | `site` | `prefixTenant(\`corretores/…\`)` | **Client** | **Client** |
| Media Library upload | `site` | Path `{tid}/media/…` construído no client (via adapter) | **Client** | **Client** |

**Observação crítica (§6, §11, §12):** todo upload hoje é **client-authoritative** para bucket e path. A defesa contra path arbitrário é feita **exclusivamente pela RLS** em `storage.objects`, que confere `foldername[1] = get_current_tenant_id()`. Isso é seguro **desde que** `get_current_tenant_id()` seja incorruptível — e no path autenticado comum, é (Patch M2b.1). Porém: não há validação server-side adicional (whitelist de bucket, whitelist de subpasta, sanitização de filename além do que o client faz).

### 5.2 Downloads / Signed URL generation

| Local | Bucket | TTL | Cliente Supabase | Escopo tenant |
|---|---|---|---|---|
| `src/lib/api/media.functions.ts:36,38,41,172` | `site` | `SIGN_TTL = 365d` | `supabaseAdmin` (bypassa RLS) | Filtro por `media_library` RLS |
| `src/lib/api/catalogo.functions.ts:108,184,232,237,251` | `imoveis`/`lancamentos` | 365d | Cliente publishable server-side (rota pública) | Filtragem via `x-tenant-id` header no anon path |
| `src/lib/api/admin.functions.ts:883` | (variável) | 365d | `context.supabase` (RLS ativa como usuário) | RLS |
| `src/lib/api/lancamentos.functions.ts:453,496` | `lancamentos` | 24h | Cliente contextual | Filtragem via query anterior |
| `src/lib/api/site.functions.ts:26` | (variável) | `SIGN_TTL` | `supabaseAdmin` | — |

**Nota:** Signed URLs geradas via `supabaseAdmin` **bypassam RLS**. Isso é aceitável quando o **path passado** já foi previamente resolvido por uma query que respeita RLS (padrão observado em `media.functions.ts` e `catalogo.functions.ts`), mas requer inspeção formal para confirmar que nenhum caller aceita path arbitrário do client. Ver §8 (Riscos).

### 5.3 Exclusão

| Local | Bucket | Cliente |
|---|---|---|
| `src/lib/api/admin.functions.ts:191` | `imoveis` | `context.supabase` (RLS) |
| `src/lib/api/lancamentos.functions.ts:193,418` | `lancamentos` | `context.supabase` (RLS) |
| `src/lib/api/lancamentos.functions.ts:404` | `lancamentos` | `context.supabase` (RLS) |
| `src/lib/api/media.functions.ts:147` | `site` | `supabaseAdmin` (bypass; paths derivados da row `media_library` já filtrada por RLS) |

### 5.4 Atualização

Não há caminhos de "atualização in-place" de arquivo — o padrão é **remove + upload novo** (upsert opcional em alguns pontos institucionais como `CmsPaginasTabs`). `PdfsLancamento` usa `upsert: true` implícito não observado; `RichTextEditor`, `PostForm`, `LancamentoForm`, `GaleriaLancamento`, `ImovelForm`, `_authenticated.admin.corretores` usam `{ upsert: false }`.

---

## 6. Fluxo Atual

```
Upload (client)
   ↓
[componente admin]
   └─ prefixTenant(path) — usa cache global `currentTenantId` (setado no mount do AdminShell via useTenantIdInit)
   └─ supabase.storage.from(bucket).upload(path, file)
        └─ RLS storage.objects (INSERT WITH CHECK):
              bucket_id ∈ {imoveis, lancamentos, site}
              AND (is_super_admin() OR foldername[1] = get_current_tenant_id()::text)
   ↓
Persistência
   └─ INSERT/UPDATE na tabela de negócio (imovel_imagens, launch_*, blog_posts, media_library, corretores, site_settings)
   └─ Registrado apenas o PATH relativo (não URL)
   ↓
Referência
   └─ Coluna dedicada (url/storage_path/imagem_capa/foto_url) ou JSONB (site_settings.value)
   ↓
Consulta
   └─ Server function busca a row (RLS ativa) → recebe path
   ↓
Download
   └─ createSignedUrl(path, TTL) via supabaseAdmin ou cliente contextual
   └─ Cliente recebe URL assinada → <img src=...>
   ↓
Remoção
   └─ Server function ou client action → supabase.storage.remove([path]) → RLS DELETE valida foldername[1]
```

---

## 7. Classificação Consolidada

| Classe | Presença observada | Observação |
|---|---|---|
| **Tenant Scoped** | Praticamente 100% do inventário atual | Todos os 22 objetos do bucket `site` seguem o padrão `{tenantId}/…` |
| **Public Shared** | 0 | Nenhum bucket público em uso |
| **System Asset** | Fora do Storage (vive em `public/`, `src/assets/`) | Não requer migração |
| **Legacy** | 0 | Migração de prefixamento já executada em 2026-07-01 |
| **Orphan** | Indeterminado | Requer cross-check `storage.objects` vs colunas de path em subetapa dedicada (recomendado M3.1.b) |
| **Unknown** | 0 observado | Nenhum path fora do padrão nas amostras inspecionadas |

---

## 8. Riscos

| # | Risco | Severidade | Descrição |
|---|---|---|---|
| R1 | `prefixTenant` executa 100% no client | **Alta** | Fonte do prefixo é `getCurrentTenantIdSync()` — cache em memória alimentado no mount. Um cliente comprometido pode alterar `currentTenantId` e enviar path com outro tenant. **Mitigado por RLS** `tenant_storage_insert` que compara com `get_current_tenant_id()` (server-side). Sem RLS, seria uma falha crítica. Não há defesa em profundidade além da RLS. |
| R2 | Branch anônima de `get_current_tenant_id()` confia no header `x-tenant-id` | **Alta** | Fluxos anônimos (feeds públicos, form submissions públicos) resolvem tenant a partir de header cruazero. Para Storage, isso significa que uma request anônima com `x-tenant-id` forjado poderia **ler** objetos de outro tenant se alguma policy de Storage viesse a habilitar `anon` — atualmente **não habilita**, então o risco é *latente*, não *ativo*. |
| R3 | Signed URLs geradas via `supabaseAdmin` bypassam RLS | **Média** | `media.functions.ts`, `site.functions.ts`, `catalogo.functions.ts` usam `supabaseAdmin.storage.createSignedUrl(path, ...)`. Seguro **apenas** se o path vier de uma query prévia sob RLS. Nenhum call site atualmente aceita path arbitrário direto do client, mas não há guard formal — auditoria caso a caso recomendada. |
| R4 | TTL de 365 dias em Signed URLs institucionais | **Média** | `SIGN_TTL = 60*60*24*365`. Uma URL vazada permanece válida por 1 ano. Contradiz o princípio de expiração curta com refresh. |
| R5 | Validação server-side de path inexistente para uploads | **Média** | Nenhum server function intermedeia `.upload()`. Todo upload vai direto client → Storage, defendido só pela RLS. Não há validação de MIME, tamanho, nome sanitizado ou whitelist de subpasta no server. |
| R6 | `site_settings` JSONB walker é heurístico | **Baixa** | A migration `20260701210935` prefixou strings JSONB que "parecem" bucket paths (`LIKE '%/%'`, não `http%`). Novas chaves adicionadas pós-migração precisam repetir a lógica manualmente. |
| R7 | Ausência de coluna canônica `tenant_id` em `imovel_imagens` e `launch_project_imagens` | **Baixa** | Tenant é derivado via FK ao pai. Aceitável arquiteturalmente, mas exige RLS de tabela dependa do JOIN — não afeta Storage diretamente. |
| R8 | Orphan detection não implementado | **Baixa** | Não existe rotina para detectar objetos em `storage.objects` sem row correspondente em BD. Pode gerar consumo indevido de storage e vazamento se alguém emitir Signed URL "adivinhando" path. |
| R9 | Ausência de segregação por tipo/subpasta consistente entre buckets | **Baixa** | `imoveis` usa `{tenant}/{imovelId}/…` (H2-ish); `lancamentos` usa `{tenant}/{slug}/{tipo}/…` (H2 híbrido com slug); `site` mistura `{tenant}/blog/…`, `{tenant}/corretores/…`, `{tenant}/media/…`, `{tenant}/sobre-…`, `{tenant}/hero-…`. A convenção não é uniforme. |

---

## 9. Gap Analysis

| # | Problema | Impacto | Recomendação | Prioridade |
|---|---|---|---|---|
| G1 | `prefixTenant` client-authoritative | Depende exclusivamente de RLS para segurança | Introduzir helper server-side `buildTenantPath(context, entity, filename)` chamado por server function; client passa apenas `entity` + `filename` | **Obrigatório** (M3.2) |
| G2 | Uploads sem intermediação server-side | Sem validação MIME/tamanho/whitelist além de RLS | Server function `iniciarUpload` que retorna path assinado (`createSignedUploadUrl`) restringindo bucket, path e tempo | **Obrigatório** (M3.2) |
| G3 | TTL de 1 ano em Signed URLs | Vazamento de longa duração | Reduzir para 1h institucional / 24h público com refresh sob demanda via server function | **Recomendado** (M3.4) |
| G4 | Branch anônima confia em `x-tenant-id` header | Latente para Storage | Substituir por resolução server-side por host (já parcialmente implementada em `tenant.server.ts`) ou por token assinado por request | **Obrigatório** (endurecimento paralelo, tratado em Patch IA-004.1 ou M3.4) |
| G5 | `supabaseAdmin.createSignedUrl` sem guard | Assinatura de path arbitrário se caller aceitar input externo | Adicionar utilitário `signOwnedPath(context, path)` que valida `foldername[1] = tenantId` antes de assinar | **Obrigatório** (M3.4) |
| G6 | Ausência de detecção de órfãos | Consumo indevido e superfície de ataque | Rotina periódica ou comando manual `M3.1.b` que cruza `storage.objects` × colunas de path | **Recomendado** (M3.1.b, pós-aprovação desta) |
| G7 | Convenção de subpasta não uniforme | Manutenção e migração futura mais complexas | Padronizar `{tenantId}/{entity}/{entityId}/{filename}` (H2) na M3.2 para novos uploads | **Recomendado** (M3.2) |
| G8 | `site_settings` JSONB walker heurístico | Regressão silenciosa se nova chave introduzida | Migrar strings de branding para colunas dedicadas ou adotar convenção estruturada `{tenant}/branding/…` fiscalizada em código | **Opcional** (M3 ou posterior) |
| G9 | Nenhum teste automatizado cross-tenant específico para Storage | Regressão pode passar despercebida | Adicionar suíte Playwright que tenta ler `{outroTenant}/…` como usuário comum e valida 403 | **Recomendado** (M3.5) |

---

## 10. Reavaliação das Estratégias H1–H4

Com base no inventário — e no fato de que a implementação atual **já emergiu como uma variante de H2 sem `tenants/` prefix** — a análise técnica é:

| Estratégia | Padrão | Compatível com estado atual? | Prós | Contras | Recomendação técnica preliminar |
|---|---|---|---|---|---|
| **H1** — `tenants/{tenantId}/media/{filename}` | Flat por tenant, todos os arquivos em `media/` | Não — quebra os 22 objetos já persistidos que usam `{tenantId}/blog/`, `{tenantId}/corretores/`, etc. | Simples | Perde semântica por entidade; força migração completa | **Rejeitada** |
| **H2** — `tenants/{tenantId}/{entity}/{entityId}/{filename}` | Estruturado por entidade | Parcialmente — a implementação atual é `{tenantId}/{entity ou slug}/…` **sem** `tenants/` prefix | Aderente à convenção emergente; rastreabilidade; RLS já compatível (`foldername[1]`) | Requer padronização do segundo nível | **Recomendada — variante sem `tenants/` prefix**, mantendo `{tenantId}/{entity}/…` para preservar compatibilidade e evitar migração desnecessária dos 22 objetos existentes |
| **H3** — `tenants/{tenantId}/{mediaId}/{filename}` | Flat com UUID | Não — perde semântica por entidade | Ótimo para deduplicação | Perde legibilidade e rastreabilidade | **Rejeitada** |
| **H4** — Bucket por tenant | Isolamento no plano físico | Não — exigiria N buckets, quebra `media_library`, `catalogo`, todo o código atual | Isolamento máximo | Custo operacional inviável para SaaS multi-tenant com centenas de tenants; limites da plataforma; RLS já resolve o problema | **Rejeitada** para o modelo atual |

**Recomendação preliminar (a decidir formalmente na M3.2):** adotar oficialmente **H2 sem prefixo `tenants/`** — o padrão emergente já implementado — e formalizá-lo como norma na Constitution:

```
{tenantId}/{entity}/{entityIdOrSlug?}/{sanitizedFilename}
```

onde `entity ∈ {imoveis, lancamentos, blog, corretores, media, branding, sobre, anuncie, hero, logo}` (a lista final deve ser fixada e validada por whitelist server-side na M3.2).

Esta recomendação **não é decisão** — é insumo para a auditoria decidir se aceita a normalização do padrão emergente ou se demanda migração para `tenants/` prefix (com custo operacional).

---

## 11. Conformidade Arquitetural

| Invariante | Estado | Observação |
|---|---|---|
| Client nunca é autoridade | **Parcialmente violado** | `prefixTenant` é client-side. Mitigado por RLS mas viola defesa em profundidade — G1 |
| Server é autoridade única | **Parcialmente violado** | Uploads não passam por server function — G2 |
| Tenant context explícito | ✔ | `get_current_tenant_id()` (M2b.1) é determinística no path autenticado |
| Storage não confia em path do client | **Parcialmente violado** | RLS confia em `foldername[1]` que vem do client, porém compara com `get_current_tenant_id()` server-side; não há whitelist adicional |
| Ausência de fallback | ✔ | Nenhum fallback observado em Storage |
| Ausência de heurística | **Parcial** | `site_settings` JSONB walker é heurístico (G8) |
| Ausência de tenant default | ✔ | M2b.1 removeu qualquer default |
| Fail-fast | ✔ | RLS bloqueia imediatamente; `prefixTenant` lança se cache não carregado |
| Validação server-side | **Insuficiente** | Só RLS. Sem validação MIME, tamanho, path whitelist server-side (G2) |
| Branch anônima segura | **Latente** | Confia em `x-tenant-id` header — não afeta Storage hoje mas herda risco (G4) |

**Aderência à IA-004:** parcial. A **intenção** da IA-004 (isolamento por tenant no path) está implementada. A **defesa em profundidade** proposta pela IA-004 (intermediação server-side, endurecimento de Signed URLs, whitelist) está pendente e deve ser materializada nas subetapas M3.2, M3.4 e M3.5.

**Aderência à Constitution / Security Architecture / ADRs vigentes:** parcial — os desvios acima estão dentro do escopo esperado da M3 e são exatamente os alvos a endurecer nas subetapas seguintes. Nenhum desvio novo introduzido — todos os pontos identificados são estado herdado, agora explicitamente inventariado.

**Aderência ao Roadmap:** ✔ — a M3 permanece bloqueada; esta etapa é analítica.

---

## 12. Evidências

**Buckets (via inspeção `storage.buckets` + config):**
- `imoveis` — privado
- `lancamentos` — privado
- `site` — privado

**Objetos observados (via `SELECT bucket_id, COUNT(*), MIN(name), MAX(name) FROM storage.objects GROUP BY bucket_id`):**
- `site`: 22 objetos, todos `9664d189-4a12-4caa-8243-dc73383447e6/…`
- `imoveis`, `lancamentos`: 0 objetos observados

**Policies em `storage.objects`:**
```
media_library_storage_(read|insert|update|delete)  — foldername[1] = user_belongs_to_tenant + foldername[2]='media'
tenant_storage_(read|insert|update|delete)         — foldername[1] = get_current_tenant_id()::text OR is_super_admin()
```

**Call sites de upload (client, todos com `prefixTenant`):**
- `ImovelForm.tsx:258`, `LancamentoForm.tsx:210`, `GaleriaLancamento.tsx:69`, `PdfsLancamento.tsx:108`, `PostForm.tsx:112`, `RichTextEditor.tsx:128`, `CmsPaginasTabs.tsx:157,321`, `_authenticated.admin.corretores.tsx:215`

**Helper client-authoritative:**
```ts
// src/lib/tenant-cache.ts:16
export function prefixTenant(path: string): string {
  const tid = getCurrentTenantIdSync();
  const prefix = `${tid}/`;
  return path.startsWith(prefix) ? path : `${prefix}${path.replace(/^\/+/, "")}`;
}
```

**Signed URL generators:**
- `media.functions.ts` (SIGN_TTL 365d, via supabaseAdmin)
- `catalogo.functions.ts` (365d, cliente publishable)
- `admin.functions.ts:883` (365d, cliente contextual)
- `lancamentos.functions.ts:453,496` (24h, cliente contextual)
- `site.functions.ts:26` (SIGN_TTL, supabaseAdmin)

**Migration histórica que já executou parte da M3:**
- `supabase/migrations/20260701210935_187b23d1-*.sql` — prefixamento de objetos e policies `tenant_storage_*`
- `supabase/migrations/20260701223254_bf5e6d86-*.sql` — policies `media_library_storage_*`

---

## 13. Confirmação Formal

- ✔ Nenhuma implementação foi realizada.
- ✔ Nenhum bucket foi criado, alterado ou removido.
- ✔ Nenhum arquivo foi movido, copiado ou excluído.
- ✔ Nenhuma policy foi modificada.
- ✔ Nenhuma migration foi criada.
- ✔ Nenhuma alteração no `src/`, schema, RLS, Storage, Media Picker, upload, download ou Signed URL foi executada.
- ✔ Nenhuma alteração funcional foi introduzida.

Esta etapa é exclusivamente de descoberta e documentação, aderente às proibições do §13 do prompt oficial.

---

## 14. Declaração de Compatibilidade

Este documento é compatível com:

- `ARCHITECTURE_CONSTITUTION.md` — nenhum invariante alterado; desvios existentes explicitados e categorizados como alvos da M3.
- `SECURITY_ARCHITECTURE.md` — modelo de ameaças estendido informalmente aqui (§8); formalização definitiva na M3.2.
- `IA-001 — Tenant Middleware` — `get_current_tenant_id()` (M2b.1) é a fonte confiável usada pelas policies de Storage.
- `IA-002 — Tenant Context Propagation` — cache client `currentTenantId` é derivado do context propagado; endurecimento previsto em G1/G2.
- `IA-003 — RLS Policies` — RLS em `storage.objects` segue o mesmo padrão RESTRICTIVE-shape das tabelas de negócio.
- `IA-004 — Tenant Storage Isolation` — este relatório fornece o inventário exigido pelo §5 da IA-004 e reavalia formalmente H1–H4.
- `Roadmap Architectural` — M3 permanece bloqueada; M3.1 concluída pendente auditoria.

**Declaração explícita:**

> A M3.1 — Storage Inventory & Classification foi concluída em caráter estritamente analítico e documental. O inventário produzido preserva integralmente a arquitetura consolidada do RM Prime SaaS e habilita a auditoria externa da estratégia técnica proposta antes de qualquer implementação da M3.2 — New Upload Path Enforcement. A M3 (e todas as suas subetapas M3.2–M3.5) permanece bloqueada até aprovação formal deste relatório.

---

**Próximo passo autorizado após aprovação:** elaboração do prompt oficial da **M3.2 — New Upload Path Enforcement**, endereçando os gaps G1, G2 e G7 acima com intermediação server-side (`createSignedUploadUrl`) e whitelist de bucket/entity.
