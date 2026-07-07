# IA-004 — Tenant Storage Isolation

**Status:** 🟡 Proposed / Awaiting Audit
**Precedência:** IA-001 (Tenant Middleware) · IA-002 (Client Impersonation Layer) · IA-003 (RLS Policies) · M2b (RLS Implementation) · Patch M2b.1 (get_current_tenant_id cardinality fix)
**Etapa alvo:** M3 — Tenant Storage Isolation
**Autor:** Arquitetura RM Prime SaaS
**Regra de escopo:** Este documento é **exclusivamente análise arquitetural**.
Nenhum arquivo, bucket, path, migration, schema, RLS, policy, código `src/`,
Media Library, Media Picker ou upload pode ser alterado nesta etapa.
**M3 permanece bloqueada até auditoria e aprovação formal desta IA-004.**

---

## 1. Objetivo

Garantir que todos os arquivos armazenados no Supabase Storage do RM Prime SaaS
sejam **isolados por tenant** — tanto uploads novos quanto arquivos legados —
fechando a última camada do modelo multi-tenant zero-trust já materializado nas
camadas de aplicação (IA-001, IA-002) e de banco de dados (M2b + Patch M2b.1).

A M3 complementa:

- **IA-001 / Tenant Middleware** — `requireTenant` provê `tenantId` server-side
  autoritativo para toda escrita/leitura em storage.
- **IA-002 / Tenant Context Propagation** — header `x-tenant-id` só é aceito
  quando emitido pela UI de impersonação de super-admin.
- **M2b / RLS Policies** — RLS RESTRICTIVE em 40 tabelas de domínio garante
  que metadata (`media_library`, `imovel_imagens`, `launch_project_imagens`,
  `launch_pdfs`, `blog_posts`, `cms_pages`, `cms_campaigns` etc.) já é
  tenant-scoped.
- **SECURITY_ARCHITECTURE.md** — estende o Threat Model server-authoritative
  para a superfície de arquivos e signed URLs.

O gap arquitetural residual é: **o path físico no bucket ainda não carrega
`tenantId`**, o que expõe a plataforma a leakage por reuso de path, colisão
entre tenants, signed URL cross-tenant e migração ambígua no futuro
StorageProvider (Fase 4).

---

## 2. Escopo

### Dentro do escopo (análise apenas)

- Buckets existentes: `imoveis`, `lancamentos`, `site` (todos privados).
- Arquivos existentes e paths atuais.
- Padrão futuro de path por tenant.
- Uploads novos.
- Arquivos já cadastrados em `media_library`.
- Imagens de imóveis (`imovel_imagens`).
- Imagens de lançamentos (`launch_project_imagens`).
- PDFs (`launch_pdfs`).
- Vídeos, áudios, outros tipos suportados pela Media Library.
- Campanhas (`cms_campaigns`).
- Páginas CMS (`cms_pages`, `cms_blocks`).
- Blog (`blog_posts`).
- Media Picker (`src/components/admin/MediaPicker.tsx`).
- Server functions de mídia (`src/lib/api/media.functions.ts`).
- URLs assinadas (`createSignedUrl`, TTL, escopo).
- URLs públicas — inexistentes hoje; avaliar se devem permanecer inexistentes.
- Migração de arquivos existentes para o novo padrão de path.
- Rollback seguro da migração.
- Compatibilidade com buckets privados (posição atual).
- Impacto em tenant ativo e cenários de impersonação.
- Impacto em fluxos anônimos (formulários públicos, feeds de portal, campanhas
  públicas) — apenas leitura de mídia.

### Fora do escopo (proibido nesta IA)

- Alterar, mover, criar ou excluir qualquer arquivo.
- Criar, alterar ou excluir bucket.
- Alterar policies de `storage.objects`.
- Alterar `src/` (incluindo Media Picker, Media Library, uploads).
- Alterar banco de dados, RLS, policies, schema, migrations.
- Iniciar qualquer implementação da M3.

---

## 3. Componentes envolvidos

- **Supabase Storage** — provider único hoje.
- **Buckets:**
  - `imoveis` (privado) — imagens de imóveis e galerias.
  - `lancamentos` (privado) — imagens e PDFs de lançamentos.
  - `site` (privado) — Media Library (imagens, PDFs, vídeos, áudios) usada
    por CMS, campanhas, blog, páginas.
- **Tabelas de metadata (todas tenant-scoped, RLS RESTRICTIVE via M2b):**
  - `media_library` — biblioteca central da Media Library.
  - `media_usage` — mapeamento mídia ↔ entidade consumidora.
  - `imovel_imagens` — imagens de imóveis.
  - `launch_project_imagens` — imagens de galerias de lançamento.
  - `launch_pdfs` — folders, tabelas de vendas, memoriais.
  - `blog_posts` — capa/imagens embedadas.
  - `cms_pages` / `cms_blocks` — mídias referenciadas por blocos.
  - `cms_campaigns` — hero, banners.
- **Componentes de UI/adapter:**
  - `MediaPicker` (`src/components/admin/MediaPicker.tsx`).
  - `MediaLibrary` (adminimidias route) e adapter público
    `src/adapters/cms-legacy/index.ts`.
- **Server functions:**
  - `src/lib/api/media.functions.ts` — `listarMidias`, `registrarMidia`,
    `atualizarMidia`, `excluirMidia`, `obterMidiaUrl`, `registrarUsoMidia`,
    `listarUsosMidia`.
  - Uploads diretos ao bucket via `supabase.storage.from(...).upload()`
    executados pelo client após permissão CMS.
- **Signed URLs** — TTL atual `60*60*24*365` (1 ano) em `media.functions.ts`.
- **Governança prévia:**
  - Tenant Middleware (`requireTenant`).
  - `get_current_tenant_id()` (Patch M2b.1 — cardinalidade estrita).
  - RLS RESTRICTIVE M2b sobre metadata.
  - `SECURITY_ARCHITECTURE.md`.

---

## 4. Análise arquitetural

Impacto sobre cada camada:

| Camada / Componente         | Impactado? | Justificativa |
|-----------------------------|:----------:|---------------|
| ResolutionGraph             | NÃO        | Storage Isolation é camada de arquivos/segurança, não runtime de resolução do Workspace. |
| Registry                    | NÃO        | Nenhum novo `kind` ou definição registrável. |
| RegistrySnapshot            | NÃO        | Snapshot imutável não é lido/mutado. |
| ActionExecutor              | NÃO        | Nenhuma nova Action; uploads permanecem em server functions dedicadas. |
| PluginContext               | NÃO        | Plugins não recebem novas capabilities de storage. |
| PluginRegistry              | NÃO        | Sem alteração de contratos de plugin. |
| Bootstrap                   | NÃO        | Sequência de bootstrap intocada. |
| Workspace Runtime           | NÃO        | Runtime do workspace não trafega bytes de arquivos. |
| Tenant Middleware (IA-001)  | NÃO        | Reutilizado sem alterações; passa `tenantId` autoritativo. |
| RLS (M2b + M2b.1)           | NÃO        | Metadata já tenant-scoped; storage é camada complementar. |
| Media Library               | SIM        | Metadata inalterada; apenas caminho físico do arquivo passa a ser tenant-scoped (planejado para M3, não nesta IA). |
| Storage Security            | SIM        | Policies de `storage.objects` deverão ser reescritas para casar com `tenants/{tenantId}/…` (M3). |
| Security Architecture       | SIM (extensão) | Threat Model será ampliado com superfície de arquivos; §12 recebe cross-link. |
| Roadmap                     | SIM (documental) | IA-004 registrada como próximo Gate; M3 bloqueada até aprovação. |

**Runtime protegido:** NÃO — Tenant Storage Isolation pertence à camada de
storage e segurança de arquivos, não ao runtime de resolução do Workspace.

---

## 5. Verificação dos invariantes

### ARCHITECTURE_CONSTITUTION.md

- §4.1 Anti-SQL Leakage — respeitado. Storage não introduz SQL na camada de
  domínio.
- §4.2 No Heuristics — respeitado. Nenhum fallback de bucket público, nenhuma
  heurística de path, nenhuma tentativa de "adivinhar" tenant a partir do
  arquivo.
- §4.3 Multi-Tenant Cardinality — respeitado. `tenantId` sempre vem de
  `requireTenant`; nunca do client.
- §4.4 No Parallel Resolution — respeitado. `ResolutionGraph` intacto.
- §5 Invariantes de Runtime — respeitados (nenhum impacto).
- §7 IA Governance Gate — cumprido por este documento.
- §12 Security Architecture — cumprido; extensão prevista.

### SECURITY_ARCHITECTURE.md

- Client permanece **untrusted** — nenhum dado sensível deriva de payload do
  browser; `tenantId` é resolvido server-side.
- Tenant permanece **server-authoritative** — `requireTenant` e
  `get_current_tenant_id()` continuam únicos oráculos de tenant.
- Storage **não pode confiar em path vindo do client** — path será derivado
  no servidor a partir de `tenantId` e `mediaId`.
- Signed URL **não pode vazar arquivo cross-tenant** — geração e validação
  cabem ao server; TTL e escopo revisados na §12.6.
- Plugin **não pode bypassar storage** — plugins não recebem acesso direto ao
  bucket; qualquer necessidade futura passa por server function autorizada.
- **Nenhum fallback por bucket público** — todos os buckets permanecem
  privados; qualquer exceção exige ADR.
- **Nenhum tenant default** — coerente com Patch M2b.1 (Opção A):
  Super Admin sem impersonação NÃO acessa arquivos tenant-scoped.

---

## 6. Hard Gates

| Gate | Descrição | Resultado |
|-----:|-----------|-----------|
| G0   | Constitution consultada | ✔ |
| G1   | ADRs relevantes consultados | ✔ (ADR-001..004) |
| G2   | Security Architecture consultada | ✔ |
| G3   | Impact Analyses anteriores consultadas | ✔ (IA-001, IA-002, IA-003) |
| G4   | Runtime protegido intocado | ✔ (nenhuma alteração) |
| G5   | Sem novos contratos públicos | ✔ |
| G6   | Sem bypass / heurística / singleton | ✔ |
| G7   | Rollback documentado | ✔ (§12.10) |

**No new Hard Gates introduced.**

---

## 7. Análise de acoplamento

| Item | Resposta |
|---|---|
| Cria dependência cruzada? | Não. Storage permanece dependente apenas de `requireTenant` e de metadata já existente. |
| Cria singleton? | Não. |
| Cria API paralela? | Não. Uploads e leitura permanecem via server functions atuais; apenas o path físico muda. |
| Cria novo fluxo runtime? | Não. |
| Cria fallback? | Não. |
| Cria heurística? | Não. |
| Cria bypass de tenant? | Não — reforça o oposto. |
| Altera ResolutionGraph? | Não. |
| Altera Registry? | Não. |
| Altera PluginContext? | Não. |
| Altera ActionExecutor? | Não. |

---

## 8. Impacto em Multi-tenancy

Cenários analisados (nenhum deve levar a leak):

| Cenário | Comportamento esperado após M3 |
|---|---|
| Arquivo do tenant A acessado por tenant B | Bloqueado por policy em `storage.objects` casando o prefixo `tenants/{tenantId}/` contra `get_current_tenant_id()`. |
| URL assinada reutilizada indevidamente | Escopo limitado + TTL curto (revisar `SIGN_TTL`); revogação por rotação de `mediaId` quando aplicável. |
| Path manipulado pelo client | Ignorado; server sempre reconstrói o path a partir de `tenantId` + `mediaId`. |
| Upload sem tenant | Rejeitado por `requireTenant`. |
| Upload com tenant forjado (header não-super) | Rejeitado por IA-001 §12.2 (impersonação restrita a super-admin). |
| Super-admin **sem** impersonação | Não acessa arquivos tenant-scoped (`get_current_tenant_id()` retorna `NULL`; policy bloqueia). |
| Super-admin **com** impersonação | Acessa arquivos apenas do tenant impersonado. |
| Usuário com múltiplas memberships | `get_current_tenant_id()` retorna `NULL` (Patch M2b.1) → sem acesso; UI de seleção de tenant é pré-requisito (Fase 3). |
| Usuário sem membership | Sem acesso. |
| Anon acessando mídia pública | Somente via signed URL emitida por server function autorizada; branch anon de `get_current_tenant_id()` documentada em §12.6 e no item de atenção futura. |
| Arquivos órfãos sem tenant | Detectados pelo inventário (§12.1); classificados em §12.2 e migrados em §12.5. |
| Arquivos legados sem prefixo | Migração planejada com dupla leitura (legacy path + tenant path) durante rollout (§12.9). |

---

## 9. Impacto em Segurança — Threat Model de Storage

| # | Ameaça | Descrição | Mitigação | Camada |
|---|---|---|---|---|
| T1 | Path traversal | Cliente envia `../` no path | Server ignora path do client; path derivado de `tenantId`+`mediaId`. Validação regex antes de qualquer chamada Storage. | Server function |
| T2 | Forged tenant path | Cliente forja `tenants/<other>/…` | Server descarta; policy `storage.objects` exige que `name LIKE tenants/<get_current_tenant_id()>/%`. | Server + Policy |
| T3 | Signed URL leakage | URL vazada por email/logs | TTL curto (avaliar redução de 1 ano para minutos/horas por caso), escopo por arquivo, sem wildcard. | Server function |
| T4 | Public bucket leakage | Bucket público lista arquivos | Todos os buckets permanecem **privados**; ADR obrigatório para qualquer exceção. | Storage config |
| T5 | Stale signed URL | URL antiga sobrevive à movimentação | Migração usa **copy + delete** com janela documentada; URLs de arquivos migrados invalidadas. | Migration plan |
| T6 | File overwrite | Cliente sobrescreve arquivo de outro tenant | Path tenant-scoped + policy `INSERT` restrita → impossível referenciar path de outro tenant. | Policy |
| T7 | Upload cross-tenant | Super-admin sem impersonação sobe arquivo "sem tenant" | Rejeitado: `get_current_tenant_id()` retorna `NULL`; policy `INSERT` requer prefixo válido. | Policy |
| T8 | Metadata mismatch | `media_library.tenant_id` ≠ prefixo do arquivo | Trigger ou constraint (a definir em M3) valida `arquivo LIKE 'tenants/' || tenant_id || '/%'`. | DB constraint |
| T9 | Orphan files | Arquivos sem linha em `media_library` | Job de reconciliação (fase 4 do rollout); nunca acessíveis por não estarem indexados. | Rollout |
| T10 | Service role misuse | `supabaseAdmin` chamado indevidamente | Uso restrito a server functions autenticadas + `assertCmsPermission`; auditoria de todos os call-sites (`src/lib/api/media.functions.ts` já respeita). | Server function |
| T11 | Media Picker leakage | Picker lista mídia de outro tenant | Query já sob RLS de `media_library`; após M3, signed URL gerada apenas se `media_library.tenant_id = get_current_tenant_id()`. | Server function |

**Observação herdada obrigatória:** a branch anon de `get_current_tenant_id()`
permite transportar `x-tenant-id` para fluxos públicos controlados
(formulários públicos, feeds de portal, campanhas). A IA-004 registra
formalmente que essa branch deve ser reavaliada no Threat Model de storage
ao decidir se algum tipo de mídia é servido anonimamente. **Não exige
correção nesta IA**, mas deve entrar no plano de M3.

---

## 10. Necessidade de ADR

**Decisão:** NÃO — ADR não é necessário nesta etapa.

Justificativa: a M3 aplica **isolamento por tenant dentro do modelo de
storage já existente** (Supabase Storage privado + signed URLs + metadata
tenant-scoped). Não introduz:

- novo modelo oficial de storage;
- nova abstração permanente de storage provider (isso é escopo da **Fase 4 —
  Storage Abstraction Layer**, futuro **ADR-006**);
- mudança de bucket strategy (buckets atuais permanecem);
- mudança de política de privacidade (segue privado);
- mudança de contrato público de mídia (assinaturas de server functions
  permanecem);
- novo padrão arquitetural obrigatório para todos os uploads além da regra
  de path derivado server-side.

Se durante a implementação surgir necessidade de padronizar um
`StorageProvider` ou alterar a política de privacidade, esta IA deverá ser
promovida a ADR-006 antes de qualquer código.

---

## 11. Necessidade de Patch Arquitetural

**Decisão:** NÃO.

Justificativa: nenhuma alteração da Constitution, da Security Architecture ou
de contratos públicos é necessária. Nenhum bypass, nenhuma exceção ao modelo
de tenant isolation. A M3 é aplicação direta dos invariantes já vigentes à
camada de storage.

---

## 12. Estratégia de implementação proposta (para M3 — não executar aqui)

### 12.1 Inventário de storage (dry-run)

Antes de qualquer migração, coletar (via `supabase.storage` + `pg_catalog`):

- Buckets existentes, seus modos (privado/público) e políticas atuais.
- Quantidade e tamanho total de objetos por bucket.
- Paths atuais agrupados por prefixo top-level.
- Interseção com `media_library.arquivo` (arquivos indexados vs não indexados).
- Interseção com `imovel_imagens`, `launch_project_imagens`, `launch_pdfs`,
  `cms_blocks`, `cms_campaigns`, `blog_posts`.
- Objetos com signed URL "quente" recente (heurística por logs, opcional).

Saída: planilha ou relatório `docs/fase6/14-m3-storage-inventory.md`
(a ser criado em M3, **não nesta IA**).

### 12.2 Classificação dos arquivos

- **tenant-scoped media** — mídia da Media Library (`site`), imagens de
  imóveis (`imoveis`) e lançamentos (`lancamentos`), PDFs, vídeos.
- **public tenant media** — mídia servida em páginas públicas do próprio
  tenant (site, blog, landing pages). Ainda assim armazenada sob prefixo
  tenant-scoped; publicação = signed URL emitida por server function
  autorizada.
- **system assets** — nenhum identificado hoje; se surgir, viverá em
  bucket dedicado `system` (fora do escopo da M3).
- **orphan files** — objetos sem correspondência em nenhuma tabela;
  requer reconciliação (arquivar ou remover após dupla checagem).
- **legacy files** — objetos com path atual sem prefixo `tenants/`.
  Alvo primário da migração.
- **global assets** — logos, ícones, thumbs de placeholder embutidos no
  código (`src/assets/…`). Não estão em Storage e permanecem fora de escopo.

### 12.3 Matriz comparativa de estratégias de path (hipóteses)

Nenhuma estratégia abaixo é decisão arquitetural aprovada. Todas
permanecem como **hipóteses técnicas em análise**, a serem ratificadas (ou
substituídas) no início da M3, após auditoria da IA-004. O Roadmap
Arquitetural não antecipa `tenantId/` prefix nem qualquer outro padrão.

Critérios avaliados por hipótese:

- **Segurança** — resistência a leakage cross-tenant e força da validação
  server-side por prefixo/bucket.
- **Performance** — custo de listagem, cache de derivativos e latência de
  signed URL.
- **Complexidade** — esforço de implementação, quantidade de policies
  necessárias, superfície de manutenção.
- **Escalabilidade** — comportamento com N tenants, milhões de objetos, e
  migração futura para `StorageProvider` (Fase 4 / ADR-006).
- **Rollback** — reversibilidade da migração e custo de retorno ao estado
  anterior.
- **Signed URL compat** — facilidade de gerar/validar signed URL por objeto.
- **Aderência Architecture First** — respeito aos invariantes (client não é
  autoridade, sem heurística, sem tenant default, path validável server-side).

| Estratégia (hipótese) | Segurança | Performance | Complexidade | Escalabilidade | Rollback | Signed URL | Vazamento cross-tenant | Aderência Architecture First |
|---|---|---|---|---|---|---|---|---|
| **H1 — `tenants/{tenantId}/media/{filename}`** (prefixo por tenant + domínio único `media`) | Alta — policy `name LIKE 'tenants/' || tid || '/%'` cobre 100% dos objetos com uma única regra. | Alta — prefixo curto, listagem O(log) por tenant, derivativos co-localizados. | Baixa — 1 padrão único de path, 1 família de policies. | Alta — sem limite prático; migração para bucket-per-tenant é copy+rewrite. | Alto — copy+delete reversível; `arquivo_legacy` restaura path antigo. | Ótimo — signed URL por objeto, TTL curto trivial. | Muito baixo se policy correta; risco residual se código emitir path sem `tenantId`. | Alta — path derivado server-side, sem client authority. |
| **H2 — `tenants/{tenantId}/{entity}/{entityId}/{filename}`** (prefixo por tenant + domínio funcional) | Alta — mesma policy raiz; ganho adicional de auditabilidade por entidade. | Alta — colisão zero entre domínios; cache de derivativos por entidade estável. | Média — mais convenções (`properties`, `launches`, `cms/pages`…); documentação obrigatória; risco de deriva se novos domínios não registrarem convenção. | Alta — igual a H1; segmentação favorece jobs por domínio. | Alto — igual a H1; migração pode ser feita por domínio. | Ótimo — signed URL por objeto. | Muito baixo com policy correta; risco residual se novo domínio esquecer prefixo. | Alta — path 100% server-derived; explicitação por domínio reforça auditoria. |
| **H3 — `tenants/{tenantId}/{mediaId}/{filename}`** (prefixo por tenant + `mediaId` opaco) | Alta — policy raiz idêntica; `mediaId` opaco reduz predição de path. | Média/Alta — path curto; sem agrupamento funcional (jobs por domínio precisam de join com metadata). | Média — bom para Media Library; ruim para arquivos ligados diretamente a entidades sem `mediaId` (imagens de imóvel, PDFs). | Média — exige `media_library` como registro central para todo arquivo, o que pode não ser viável para todos os fluxos atuais. | Alto — copy+delete reversível. | Ótimo — `mediaId` estável facilita rotação de derivativos. | Baixo com policy correta. | Média — força centralização em `media_library`; pode conflitar com fluxos que hoje gravam sem passar pela Library. |
| **H4 — Bucket por tenant** (`bucket_{tenantId}`) | Muito alta — isolamento físico; policy pode ser mais simples ("qualquer objeto do bucket X pertence ao tenant X"). | Média — criação e gestão de N buckets; overhead operacional; limites de bucket por projeto no provider. | Alta — provisionamento automático por tenant, ciclo de vida (criação/exclusão), políticas replicadas N vezes, migração de assets legados por bucket. | Baixa/Média — depende do limite de buckets do provider (Supabase possui limites) e do custo de gestão em escala. | Médio — rollback exige recriação de buckets e recopy massivo. | Ótimo — signed URL por objeto continua trivial. | Muito baixo — barreira física entre tenants. | Alta em isolamento; baixa em simplicidade — introduz camada de provisionamento que hoje não existe e aumenta acoplamento com o provider (conflita com neutralidade prevista pela Fase 4 / StorageProvider). |

Notas transversais (aplicáveis a todas as hipóteses):

- Nenhuma hipótese admite path enviado pelo client como autoridade; o servidor
  sempre reconstrói o path a partir de `tenantId` (via `requireTenant` /
  `get_current_tenant_id()`) e de identificadores derivados de metadata.
- Nenhuma hipótese admite bucket público — todos permanecem privados;
  qualquer exceção exige ADR próprio.
- Nenhuma hipótese admite tenant default, fallback implícito ou bypass de
  Super Admin sem impersonação.
- Signed URL é canal de **entrega**, nunca de **autorização primária** — a
  autorização vive na policy de `storage.objects` + validação server-side.
- Todas as hipóteses são compatíveis com a futura Storage Abstraction Layer
  (Fase 4 / ADR-006), com custos de migração distintos (menor para H1/H2,
  maior para H4).

A decisão entre H1, H2, H3 e H4 (ou combinação híbrida — ex.: H2 dentro de
H4) será tomada na abertura da M3, com base em: inventário real (§12.1),
classificação (§12.2), limites do provider, custo operacional e revisão de
segurança.

#### 12.3.1 Exemplo ilustrativo de path (hipótese H2, não aprovado)

A título ilustrativo da hipótese H2 (prefixo por tenant + domínio
funcional), um formato possível seria:

```
tenants/{tenantId}/media/{mediaId}/{filename}
tenants/{tenantId}/media/{mediaId}/{filename}--medium.<ext>
tenants/{tenantId}/media/{mediaId}/{filename}--thumbnail.<ext>
tenants/{tenantId}/properties/{propertyId}/{filename}
tenants/{tenantId}/launches/{launchId}/gallery/{filename}
tenants/{tenantId}/launches/{launchId}/pdfs/{filename}
tenants/{tenantId}/cms/pages/{pageId}/{filename}
tenants/{tenantId}/cms/campaigns/{campaignId}/{filename}
tenants/{tenantId}/blog/{postId}/{filename}
```

Este exemplo **não é decisão aprovada**; serve apenas como referência para
avaliar diretrizes potenciais:

- **Path único por tenant** no primeiro segmento (`tenants/{tenantId}/`) —
  requisito comum a H1/H2/H3 para policy de `storage.objects` baseada em
  prefixo.
- **Path por domínio funcional** (H2) no segundo segmento.
- **Path estável por mediaId/entidadeId** — filenames podem ser rotacionados,
  mas o pai é imutável, permitindo cache de derivativos (medium/thumbnail).
- **Sem dependência de `media_library` no path** — para funcionar tanto para
  arquivos indexados quanto para arquivos ligados diretamente a entidades
  (imagens de imóveis, PDFs de lançamento).

### 12.4 Uploads novos

- `tenantId` obtido exclusivamente via `requireTenant`.
- Payload do client **não pode** conter `tenantId` — server ignora se
  presente.
- Server monta path: `tenants/${tenantId}/${dominio}/${entidadeId}/${filename}`.
- Falha imediata se `requireTenant` não resolver tenant.
- Registrar `media_library.tenant_id`, `media_library.arquivo` coerentes;
  constraint garantirá `arquivo LIKE 'tenants/' || tenant_id || '/%'`.
- Uploads diretos do client passam a exigir path pré-assinado pelo server
  (evita client escolher path livre).

### 12.5 Arquivos existentes — plano de migração

1. **Snapshot de inventário** (§12.1).
2. **Mapeamento arquivo → tenant** via joins com metadata (`media_library`,
   `imovel_imagens`, `launch_*`, `cms_*`, `blog_posts`).
3. **Copy → verify → update reference → delete** (não move destrutivo direto).
4. **Atualizar `arquivo`, `arquivo_medium`, `arquivo_thumbnail`** e demais
   colunas de path em todas as tabelas afetadas, em transação por lote.
5. **Validar integridade** — checksum ou head request em cada novo path.
6. **Manter rollback** — coluna auxiliar `arquivo_legacy` temporária por 1
   ciclo de release; policy transitória permite leitura dos dois prefixos.

### 12.6 Signed URLs

- TTL revisado: hoje `60*60*24*365` (1 ano). Propor **redução drástica** para
  faixa horária/diária, com renovação server-side sob demanda.
- Escopo: sempre por objeto único, nunca por prefixo/wildcard.
- Validação: server só emite se `media_library.tenant_id =
  get_current_tenant_id()` (ou a entidade owner do arquivo pertence ao tenant
  ativo).
- Prevenção de compartilhamento indevido: TTL curto + logging opcional em
  `system_events`.
- Invalidação: novo `mediaId`/novo path em caso de reupload.
- Cache: URLs assinadas não devem ser cacheadas em CDN pública.
- **Nota anon:** a branch anon de `get_current_tenant_id()` permite
  transportar `x-tenant-id` — a M3 deve declarar se e quais tipos de mídia
  aceitam esse fluxo (recomendação inicial: **nenhum** por default).

### 12.7 Media Picker

- Query já sob RLS de `media_library` (M2b garante).
- Após M3, `obterMidiaUrl` só assina se `tenant_id` da mídia = tenant
  efetivo (impersonado ou próprio).
- Super-admin **sem** impersonação: Media Picker mostra vazio para mídia
  tenant-scoped (coerente com Opção A do Patch M2b.1).
- Super-admin **com** impersonação: enxerga apenas a mídia do tenant
  impersonado.
- Nenhuma ordenação/heurística nova.

### 12.8 Buckets públicos vs privados

- Estado atual: `imoveis`, `lancamentos`, `site` são **privados**. Correto.
- Recomendação M3: **manter todos privados**; publicação sempre via signed
  URL server-side.
- Bucket público só seria admissível para assets sem PII e sem valor
  comercial isolado por tenant — hoje **inexistentes**. Qualquer criação
  futura de bucket público exige **ADR-006** (Storage Abstraction) ou ADR
  próprio.

### 12.9 Rollout (fases)

1. **Fase A — Inventário dry-run** (leitura apenas).
2. **Fase B — Piloto** com subconjunto pequeno (ex.: 1 imóvel + 1 mídia CMS
   por tenant), validando policies e signed URLs.
3. **Fase C — Uploads novos tenant-scoped** — código passa a gravar em
   `tenants/{tenantId}/…`; leitura suporta os dois prefixos.
4. **Fase D — Migração de legados** em lotes, com rollback disponível.
5. **Fase E — Validação final** (checksums, contagens, testes E2E).
6. **Fase F — Bloqueio de paths antigos** (policy passa a exigir prefixo
   tenant-scoped; `arquivo_legacy` é removido).

### 12.10 Rollback

- **Copy + delete**, nunca move destrutivo → arquivo antigo permanece
  disponível durante a janela de rollback.
- Coluna `arquivo_legacy` preserva referência original.
- Signed URLs antigas expiram naturalmente por TTL; se TTL longo estiver em
  circulação, rotacionar assinaturas (novo `mediaId` opcional).
- Script reverso: restaura `arquivo = arquivo_legacy` e recopia o objeto para
  o path antigo se necessário.
- Perda de arquivo é impossível por design (nada é deletado antes de
  confirmar leitura no novo path).

### 12.11 Testes

Suíte proposta (a implementar em M3, não aqui):

- Upload normal (tenant ativo) → arquivo em `tenants/{tenantId}/…`.
- Upload cross-tenant forjado → 403.
- Leitura cross-tenant (usuário B tentando URL do tenant A) → 404/403.
- Media Picker cross-tenant → não lista.
- Super-admin sem impersonação → não vê mídia tenant-scoped.
- Super-admin com impersonação → vê apenas mídia impersonada.
- Arquivo legado (pré-migração) → acessível durante rollout, bloqueado após
  Fase F.
- Arquivo órfão → não referenciável.
- Signed URL — TTL respeitado; expiração testada.
- Rollback — restaura acesso ao path antigo.
- Fluxos anônimos (formulário público, feed de portal) — validar que não
  vazam mídia tenant-scoped por meio da branch anon de
  `get_current_tenant_id()`.

---

## 13. Checklist Final

- [x] Constitution consultada
- [x] Security Architecture consultada
- [x] IA-001 consultada
- [x] IA-002 consultada
- [x] IA-003 consultada
- [x] M2b aprovada
- [x] Patch M2b.1 aprovado
- [x] Nenhuma alteração de storage realizada nesta IA
- [x] Nenhum arquivo movido nesta IA
- [x] Nenhum código alterado nesta IA
- [x] Nenhum bucket alterado nesta IA
- [x] Hard Gates G0–G7 validados
- [x] M3 permanece bloqueada até auditoria e aprovação formal da IA-004

---

## Anexo — Observação de segurança herdada

A branch anon de `public.get_current_tenant_id()` ainda permite transportar
`x-tenant-id` para fluxos públicos controlados (formulários públicos, feeds
de portal, campanhas, assets expostos anonimamente). A IA-004 registra
formalmente essa observação para que o Threat Model de storage (§9) da M3
avalie se e quais mídias podem ser servidas por esse caminho. Recomendação
inicial: **nenhuma mídia tenant-scoped** é elegível para leitura anônima —
qualquer exceção deverá ser justificada por ADR próprio.

---

## Declaração de conformidade

Este documento está em conformidade com:

- `ARCHITECTURE_CONSTITUTION.md`
- `SECURITY_ARCHITECTURE.md`
- `IA-001-TenantMiddleware.md`
- `IA-002-ClientImpersonationLayer.md`
- `IA-003-RLSPolicies.md`
- Relatório M2b (`docs/fase6/11-fase-2-m2b-relatorio.md`)
- Relatório M2b Audit Clarification (`docs/fase6/12-m2b-audit-clarification-report.md`)
- Patch M2b.1 (`docs/fase6/13-m2b-1-get-current-tenant-id-cardinality-fix.md`)

**Declaração explícita:**
IA-004 foi criada para análise arquitetural da M3.
**M3 permanece bloqueada até auditoria e aprovação formal da IA-004.**
