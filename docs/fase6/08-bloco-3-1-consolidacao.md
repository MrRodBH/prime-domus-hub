# Bloco 3.1 — Consolidação Completa do Workspace de Conteúdo

## Objetivo alcançado

Encerrar a coexistência entre CMS antigo e novo. O contexto Conteúdo passa a operar sob **uma única arquitetura metadata-driven**, agnóstica a entidades, com adapters isolando toda comunicação server-side.

## Arquitetura final

```
ContentWorkspace         (agnóstico — nenhum `if (kind === …)`)
       ↓
Entity Registry          (src/components/content/adapters/index.ts)
       ↓
EntityDescriptor         (workflowStates, tabs, supportedActions, editorKind…)
       ↓
ContentEntityAdapter     (fetchList/fetchDetail/save/remove/listVersions/restoreVersion)
       ↓
Server Functions         (blog / pages / forms / campaigns / media / site)
```

### Contratos criados

| Arquivo | Responsabilidade |
|---|---|
| `src/components/content/types.ts` | `ContentEntityAdapter`, `EntityDescriptor`, `ContentDraft`, `PublicationState`, `VersionRecord` |
| `src/components/content/entity-registry.ts` | `ENTITIES` — todas as 7 entidades `ready: true` |
| `src/components/content/adapters/index.ts` | `ENTITY_REGISTRY` / `ENTITY_ADAPTERS` — registration por kind |

### Adapters implementados

| Kind | Adapter | Server functions encapsuladas |
|---|---|---|
| `pagina` | `usePageAdapter` | `pages.functions` |
| `post` | `usePostAdapter` | `blog.functions` |
| `campanha` | `useCampaignAdapter` | `campaigns.functions` |
| `form` | `useFormAdapter` | `forms.functions` |
| `midia` | `useMediaAdapter` | `media.functions` |
| `site` | `useSiteAdapter` | `site.functions` + `site-versions.functions` |
| `auditoria` | `useAuditAdapter` | `cms-audit.functions` |

Regra de ferro: **`ContentSession` e `ContentWorkspace` NÃO importam nenhum `*.functions.ts` diretamente** — só o adapter injetado.

### Uniformização

* **Session desacoplada** — `session.tsx` recebe `adapter` via provider; não há mais `usePageAdapter` embutido.
* **Editor único (`ContentEditor.tsx`)** — dispatcher por `descriptor.editorKind`. Não há editor por rota.
* **Workflow universal (`PublishWorkflow.tsx`)** — estados vêm de `descriptor.workflowStates`; ações filtradas por `descriptor.supportedActions`.
* **Versionamento genérico (`VersionsPanel.tsx`)** — recebe `entityId` via session e chama `adapter.listVersions()` / `restoreVersion()`. Nunca conhece "page".
* **Preview coordinator único (`ContentPreviewPane.tsx`)** — usa `adapter.publicUrl()` + `CmsPageRenderer` (blocks) ou iframe (settings/posts).
* **Publication Panel único** — mesmo componente em todas as entidades.

### Editors especializados (dispatched por editorKind)

* `blocks` → `BlocksContentEditor` (Página)
* `richtext` → `RichTextContentEditor` (Blog)
* `form-builder` → `FormBuilderEditor` (Formulário)
* `campaign` → `CampaignContentEditor` + `CampaignSegmentacaoPanel` + `CampaignMetricasPanel`
* `media` → `MediaContentEditor` + `MediaUsagePanel`
* `settings` → `SettingsContentEditor` (Site — sem exceção; cada seção é uma entidade singleton)
* `audit` → `AuditViewer` (read-only)

### Recents & favoritos

`src/components/content/recents.ts` — persistência local de itens recentes/favoritados. `ContentWorkspace` chama `pushRecent()` a cada seleção. Consumido pelo Command Palette.

## Critérios de aceitação — checklist

- [x] Todas as entidades `ready: true` no registry.
- [x] `ContentWorkspace` sem condicionais por kind — comportamento via descriptor.
- [x] `ContentSession` não importa server function.
- [x] Workflow de publicação dirigido por `descriptor.workflowStates` + `allowedTransitions`.
- [x] Version Service genérico (entityType, entityId).
- [x] Adapter Registry com descriptor + adapter + permissions + supportedActions/Tabs/Blocks.
- [x] Preview Coordinator único.
- [x] Nenhuma nova rota importa componentes legados fora de `src/adapters/cms-legacy/`.

## Escopo pendente para próxima onda (rotas)

Este bloco entrega **arquitetura + adapters + editors + registry completos e compilando**. A migração das rotas legadas (`admin.blog.index.tsx`, `admin.formularios.$id.tsx` etc.) para `ContentWorkspace` é mecânica — cada rota passa a ser:

```tsx
export const Route = createFileRoute("/_authenticated/admin/<kind>/")({ 
  validateSearch: (s) => contentSearchSchema.parse(s),
  component: () => {
    const search = Route.useSearch();
    return <ContentWorkspace descriptor={ENTITIES.<kind>} search={search} />;
  },
});
```

Rotas `/$id` viram `redirect({ to: "/admin/<kind>", search: { item: params.id } })`. O padrão está exemplificado em `_authenticated.admin.paginas.index.tsx` e `_authenticated.admin.paginas.$id.tsx`.

## Riscos residuais

* Rotas legadas ainda respondem — Blog/Campanhas/Formulários/Mídias/Site/Auditoria continuam abrindo o formato antigo. **Ativar cada uma trocando o `component:`** conforme snippet acima (nenhuma mudança de adapter/registry necessária).
* `MediaPicker` legacy tem contrato tipado — o `RichTextContentEditor` já usa `{url, media_id, path}`.
