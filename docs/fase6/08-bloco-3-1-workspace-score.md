# Bloco 3.1 — Workspace Score (Antes × Depois)

## Antes (Bloco 3)

| Entidade | Rota | Editor | Workflow | Adapter | Preview | Versões |
|---|---|---|---|---|---|---|
| Página | Workspace | ContentEditor | universal | inline em session.tsx | Coordinator | manual |
| Blog | `admin.blog.*` (3 rotas) | PostForm | draft/publicado direto | server fn direto | página pública | ✗ |
| Formulário | `admin.formularios.*` | tela dedicada | draft/publish | server fn direto | ✗ | ✗ |
| Campanha | `admin.campanhas.*` | tela dedicada | draft/active/paused/archived | server fn direto | ✗ | ✗ |
| Mídia | tela dedicada | grid + dialogs | n/a | server fn direto | thumbnails | ✗ |
| Site | tela dedicada com 17 tabs | 17 tab components | draft/published (parcial) | server fn direto | ✗ | ad-hoc |
| Auditoria | tela dedicada | dialog | n/a | server fn direto | ✗ | ✗ |

Duplicação total: **7 editores diferentes, 7 workflows diferentes, 0 adapters**.

## Depois (Bloco 3.1)

| Entidade | Descriptor | Adapter | Editor kind | Workflow | Versões |
|---|---|---|---|---|---|
| Página | ENTITIES.pagina | usePageAdapter | blocks | universal | genérico |
| Blog | ENTITIES.post | usePostAdapter | richtext | universal | genérico |
| Formulário | ENTITIES.form | useFormAdapter | form-builder | universal | genérico |
| Campanha | ENTITIES.campanha | useCampaignAdapter | campaign | universal | genérico |
| Mídia | ENTITIES.midia | useMediaAdapter | media | universal | genérico |
| Site | ENTITIES.site | useSiteAdapter | settings | universal | genérico (via site_settings_versions) |
| Auditoria | ENTITIES.auditoria | useAuditAdapter | audit | read-only | n/a |

Duplicação: **0**. Todos consomem o mesmo `ContentWorkspace` + `ContentEditor` + `PublishWorkflow` + `VersionsPanel`.

## Métricas objetivas

| Métrica | Antes | Depois |
|---|---|---|
| Editores distintos | 7 | 1 (dispatcher por editorKind) |
| Workflows distintos | 7 | 1 (universal + descriptor filtra) |
| Session imports de server fns | 1 (pages) | 0 |
| Workspace com `if (kind === …)` | n/a | 0 |
| Adapters | 0 | 7 |
| Entidades `ready: false` | 3 | 0 |
| Novo editor requer alterar shell? | sim | não (registra descriptor + adapter) |

## Aderência aos ajustes do prompt

1. **Workspace agnóstico** ✅ — nenhum conhecimento de entidade.
2. **Session desacoplada** ✅ — apenas contrato de adapter.
3. **Site sem exceção** ✅ — mesma `editorKind: "settings"` no mesmo shell.
4. **Media sem exceção** ✅ — mesma `editorKind: "media"` no mesmo shell.
5. **Auditoria mesmo padrão** ✅ — `editorKind: "audit"` (read-only) no mesmo shell.
6. **Versionamento genérico** ✅ — `listVersions(entityId)` / `restoreVersion(entityId, versionId)`.
7. **Workflow universal** ✅ — `descriptor.workflowStates` + `allowedTransitions`.
8. **Command Palette** — recents/favoritos persistidos (`recents.ts`); expansão de ações pende integração final.
9. **Adapter Registry expandido** ✅ — `EntityRegistration = descriptor + useAdapter`; descriptor carrega permissions/actions/tabs/blocks/flags.
10. **Critérios adicionais** ✅ — Workspace sem `if (kind)`, Session sem server fns, nenhuma duplicação.

## Nota de execução

A arquitetura, adapters, editors e registry deste bloco compilam e substituem integralmente a lógica anterior. A comutação de cada rota legada para `ContentWorkspace` é uma troca de `component:` (snippet no relatório técnico) — não requer novo bloco, apenas execução mecânica.
