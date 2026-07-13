# Bloco 3 — CMS como Workspace de Conteúdo (Relatório Técnico)

Este documento registra a implementação técnica do Bloco 3 e as decisões arquiteturais aprovadas condicionalmente pelo usuário (11 diretrizes obrigatórias).

## 1. Escopo entregue

- **Páginas** (`cms_pages`) — migrada integralmente para o novo Workspace de Conteúdo (entidade de referência, análoga a Leads no Pipeline).
- **Blog, Formulários, Campanhas** — registrados no `entity-registry` com `ready: false`. A arquitetura já os suporta; migração operacional deles é etapa incremental do próprio Bloco 3 (não requer novo bloco).
- **Mídias e Site (branding/menu/versões)** — mantêm o formato atual por enquanto; entram na próxima iteração do Bloco 3 sem alteração arquitetural (o `MediaLibraryPanel` global e o Site como split de configuração serão adicionados sobre o mesmo shell).

## 2. Novos módulos

| Caminho | Papel |
|---|---|
| `src/adapters/cms-legacy/index.ts` | Adapter Layer §9 — isola componentes legados (`CmsPageRenderer`, `RichTextEditor`, `MediaPicker`, `CmsVersoesTab`) do novo workspace. |
| `src/components/content/entity-registry.ts` | §7 — declara entidades, blocos suportados, tabs e prontidão. |
| `src/components/content/search-schema.ts` | §2 — Zod: `item`, `tab`, `status`, `q`, `sort`, `density`, `device`, `new`, `compare`. URL como fonte única. |
| `src/components/content/hooks/useAutosave.ts` | §2 — debounce 900ms, estados `idle/editing/saving/saved/error`, `Ctrl+S` força flush. |
| `src/components/content/session.tsx` | §2 — `ContentSession` como fonte única: draft, autosave, workflow, preview coordinator, adapter server-side. |
| `src/components/content/blocks/BlockEditor.tsx` | §7 — editor de blocos agnóstico à entidade, alimentado por `descriptor.supportedBlocks`. |
| `src/components/content/SeoPanel.tsx` | Tab SEO — consome `useContentSession`. |
| `src/components/content/ContentPreviewPane.tsx` | §3 — preview persistente sem iframe (usa `CmsPageRenderer` diretamente) preservando scroll/device; toggle Desktop/Tablet/Mobile. |
| `src/components/content/VersionsPanel.tsx` | §6 — comparação A↔B lado a lado (JSON diff textual). Arquitetura pronta p/ histórico dedicado. |
| `src/components/content/PublishWorkflow.tsx` | §4 — 6 estados de workflow (`editing→saved→ready_to_publish→published→updated→archived`), ações desacopladas da edição. |
| `src/components/content/ContentEditor.tsx` | Painel direito; tabs por contexto: `Conteúdo · SEO · Preview · Versões · Publicação`. |
| `src/components/content/ContentList.tsx` | Painel esquerdo denso, filtros por status + busca. Seleção via `?item=`. |
| `src/components/content/ContentWorkspace.tsx` | Split layout (32%/68%) do contexto Conteúdo. |

## 3. Rotas

| Rota | Papel |
|---|---|
| `/_authenticated/admin/paginas/` | Workspace único (list + editor split). |
| `/_authenticated/admin/paginas/$id` | **Redirect** para `/admin/paginas?item=<id>`; `?item=novo` vira `?new=1`. |
| `/_authenticated/admin/blog\|formularios\|campanhas` | Inalteradas (rotas antigas continuam funcionando até serem plugadas no `ContentWorkspace`). |

## 4. UI Store (adições)

`src/components/workspace/ui-store.ts` recebeu `previewDevice: "desktop" | "tablet" | "mobile"` — persistente entre reloads (Bloco 3 §3).

## 5. Command Palette (Bloco 3 §8)

Adicionadas: busca por páginas, ações contextuais (abrir preview / publicação / versões), alternar dispositivo do preview. Novas ações contextuais só aparecem quando há `?item=` ativo.

## 6. Detail Contract (Bloco 2 §1) — respeitado

- `/admin/paginas` → **inline** (split), igual ao Pipeline.
- ⌘K globalmente **navega** para o workspace (nunca abre drawer com estado próprio) — regra "1 painel ativo por entidade".

## 7. Componentes oficiais utilizados (Bloco 3 §9)

Somente: `WorkspaceShell`, `AdminPageHeader`, `Tabs`, `Sheet` (via `DetailPanel`), `Input`, `Textarea`, `Select`, `Badge`, `Button`, `Command`. Zero layout custom fora desses primitivos.

## 8. Arquitetura para blocos reutilizáveis (§7)

`BlockEditor` recebe `descriptor.supportedBlocks` — mesmo componente serve página, campanha, futuros landing templates. Blocos suportados por entidade são declarativos.

## 9. Publicação como workflow (§4)

`PublicationState` cobre `editing → saved → ready_to_publish → published → updated → archived`. UI já renderiza os 6 estados; ações disponíveis: **Publicar**, **Despublicar**, **Arquivar**, **Reabrir**. Aprovação por revisor e agendamento ficam como próxima iteração (arquitetura pronta).

## 10. Preview sem recarregar (§3)

Preview é renderizado em-memória via `CmsPageRenderer` no próprio painel React, alimentado pelo `draft` do `ContentSession`. Consequência: **scroll preservado**, **device preservado**, **atualização instantânea sem iframe reload**. Estrutura preparada para migrar futuramente para `iframe srcdoc` + HMR parcial sem quebrar o contrato.

## 11. Adapter Layer para legado (§9)

Todo módulo legado é acessado via `@/adapters/cms-legacy`. Nenhum arquivo novo importa `@/components/admin/*` diretamente. Migração incremental sem risco.

## 12. Server functions

**Nenhuma** foi alterada. `salvarPagina`, `obterPaginaAdmin`, `excluirPagina`, `listarPaginas` continuam idênticas. Auditoria e permissão CMS (`assertCmsPermission`) continuam intactas.

## 13. Aderência às 4 perguntas obrigatórias (§11)

1. Usuário permanece no Workspace durante todo o fluxo? ✅ (nenhuma troca de rota entre lista, edição, preview, versões e publicação)
2. Fluxo reduziu carga cognitiva? ✅ (10 abas antigas → 5 tabs por contexto)
3. Número de cliques diminuiu? ✅ (ver `07-bloco-3-ux-evolution.md`)
4. Arquitetura reutilizável para próximos contextos? ✅ (`ContentSession` + `entity-registry` servem Catálogo, Distribuição futuros)

## 14. Technical Debt restante

- `Blog`, `Formulários`, `Campanhas`: precisam de adapter server-side análogo ao `usePageAdapter` para plugarem no `ContentSessionProvider`.
- `MediaLibraryPanel` global (§5) ainda não implementado — descrito no plano.
- `Restaurar versão` no `VersionsPanel` está como CTA disabled — depende de tabela `cms_pages_versions` dedicada.
- Rotas `/admin/blog/*`, `/admin/formularios/*`, `/admin/campanhas/*` ainda usam o formato antigo (funcionais, mas fora do workspace).
- `/admin/site` e `/admin/midias` também aguardam migração — sem regressão funcional.
- Nenhum componente legado foi eliminado neste bloco (apenas isolados via adapter). Eliminação virá quando cada entidade migrar.
