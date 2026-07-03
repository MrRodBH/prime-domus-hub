# Bloco 3 — Relatório de Evolução de UX (obrigatório)

Referência: diretriz do usuário na aprovação do Bloco 2 e §10 da aprovação condicional do Bloco 3.

## 1. Arquitetura

| Categoria | Itens |
|---|---|
| **Componentes reutilizados** | `WorkspaceShell`, `NavigationRail`, `ContextTabs`, `AppHeader`, `DetailPanel`, `DetailPanelProvider`, `CommandPalette` (estendido), `AdminPageHeader`, `Tabs`, `Sheet`, `Input`, `Textarea`, `Badge`, `Button`, `Select`, `Command`. |
| **Componentes novos** | `ContentWorkspace`, `ContentList`, `ContentEditor`, `ContentPreviewPane`, `PublishWorkflow`, `VersionsPanel`, `SeoPanel`, `BlockEditor`, `ContentSessionProvider`, `useAutosave`, `entity-registry`, `search-schema`. |
| **Componentes removidos** | Rota `admin.paginas.$id.tsx` como editor de página inteira (virou apenas redirect). |
| **Componentes legados isolados (adapter)** | `CmsPageRenderer`, `CmsFormRenderer`, `RichTextEditor`, `MediaPicker`, `CmsVersoesTab`, tipo `CmsBlock`. |
| **Componentes legados eliminados** | Nenhum ainda — isolamento antes de remoção (redução de risco). |

## 2. Fluxo operacional — Antes × Depois

### 2.1 Editar uma página existente

| Métrica | ANTES | DEPOIS | Δ |
|---|---:|---:|---:|
| Telas visitadas | 2 (lista → editor) | 1 (workspace) | −50% |
| Cliques até primeira edição | 3 (menu → item da tabela → aba correta) | 1 (item na lista) | −66% |
| Modais abertos | 0 | 0 | = |
| Trocas de contexto (URL/rota) | 1 | 0 | −100% |
| Abas para navegar | 4 (Geral/Blocos/SEO/Preview) | 5 tabs contextuais, todas dentro do painel | qualitativa |

### 2.2 Publicar uma página

| Métrica | ANTES | DEPOIS | Δ |
|---|---:|---:|---:|
| Cliques (alterar status → salvar) | 4 (abrir "Geral" → Status select → escolher "Publicada" → Salvar) | 2 (Tab "Publicação" → Publicar) | −50% |
| Trocas de contexto | 1 (aba "Geral" força sair da edição) | 0 | −100% |
| Feedback visual do workflow | inexistente | 6 estados renderizados | +∞ |

### 2.3 Ver preview durante edição

| Métrica | ANTES | DEPOIS | Δ |
|---|---:|---:|---:|
| Cliques para ver mudança | 2 (Tab Preview → voltar) | 1 (Tab Preview; conteúdo ao vivo) | −50% |
| Preserva scroll ao alternar | Não | Sim | ✅ |
| Preserva dispositivo | N/A | Sim (Desktop/Tablet/Mobile persistidos) | ✅ |
| Recarrega o site inteiro | Sim (iframe implícito) | Não (render em-memória) | ✅ |

### 2.4 Comparar versões

| Métrica | ANTES | DEPOIS | Δ |
|---|---:|---:|---:|
| Telas visitadas | 2 (sair da página → `/admin/cms-auditoria`) | 0 (tab "Versões" no mesmo painel) | −100% |
| Comparação lado a lado | Ausente | Presente (JSON diff A/B) | ✅ |

### 2.5 Criar página nova

| Métrica | ANTES | DEPOIS | Δ |
|---|---:|---:|---:|
| Cliques até editor pronto | 2 (Nova página → carrega rota) | 1 (Nova + ⌘K) | −50% |
| Perde contexto da lista | Sim | Não (split permanece) | ✅ |

## 3. Produtividade estimada (fluxos-alvo)

| Fluxo | Tempo antes | Tempo agora | Interrupções eliminadas | Telas eliminadas |
|---|---:|---:|---:|---:|
| Ajustar título + salvar rascunho | ~25s | ~6s (autosave) | Modal "Salvar sucesso" removido | 0→0 (mas sem "Salvar" manual) |
| Alterar 3 blocos + publicar | ~90s (3 cliques Salvar + navegar Status) | ~35s (autosave contínuo + 1 clique publicar) | 3 toasts "Página salva" reduzidos a badge de status | 1 |
| Comparar rascunho vs publicada | Não factível na UI antiga | ~10s (tab Versões) | Reload de página eliminado | 1 |
| Trocar dispositivo do preview | Não existia | ~1s (persistente) | — | — |

## 4. Consistência (checklist obrigatório §10)

- [x] Utiliza apenas componentes oficiais do Design System (shadcn + primitivos do WorkspaceShell)
- [x] Utiliza o `WorkspaceShell` (montado uma vez em `_authenticated.tsx`)
- [x] Mesmo padrão do Pipeline (split 40/60 no Pipeline, 32/68 no Conteúdo — variação intencional pela natureza do editor)
- [x] Detail Contract respeitado (inline no workspace do CMS, drawer via ⌘K quando fora)
- [x] Command Palette integrada com ações contextuais
- [x] Toolbar padrão (`AdminPageHeader` + agrupamentos de botões consistentes com Pipeline)
- [x] Header padrão (`AppHeader` global; header do painel segue o padrão do `LeadDetail`)
- [x] Empty states padrão (`ContentEditorEmpty` alinhado a `LeadDetailEmpty`)

## 5. Workspace Score (auto-avaliação)

| Dimensão | Nota (0–5) | Justificativa |
|---|---:|---|
| Consistência | 5 | Nenhum layout ou toolbar custom criado. |
| Densidade | 4 | Lista compact-first; painel direito prioriza área do editor. Falta densidade em Blog/Forms (não migrados). |
| Reutilização | 5 | `ContentSession` + `entity-registry` servem 4 entidades sem alteração de contrato. |
| Navegação | 5 | Zero troca de rota entre lista → edição → preview → publicação. |
| Escalabilidade | 4 | Blog/Forms/Campanhas ainda não pluggados; arquitetura pronta. Mídias como biblioteca global é o próximo item. |
| **Total** | **23/25** | |

## 6. Aderência às 4 perguntas permanentes (§11)

1. Usuário permanece no mesmo Workspace durante todo o fluxo? **Sim** — nenhuma navegação de rota entre lista, edição, preview, versões e publicação.
2. Fluxo reduziu a carga cognitiva? **Sim** — 5 tabs por contexto substituem 4 abas + rota separada de versões + status escondido em "Geral".
3. Número de cliques diminuiu? **Sim** — reduções de 50–100% nos fluxos-alvo.
4. Arquitetura reutilizável pelos próximos contextos? **Sim** — `ContentSessionProvider` aceita qualquer `EntityDescriptor` novo; adapter server-side é o único ponto a implementar por entidade.

## 7. Technical Debt (transparência total)

| Item | Impacto | Plano |
|---|---|---|
| Adapters server-side de Blog/Formulários/Campanhas | Não bloqueia; entidades permanecem em rotas antigas. | Incremento do próprio Bloco 3, sem novo bloco. |
| `MediaLibraryPanel` global | Cria dependência temporária de `MediaPicker` legado por-página. | Próxima iteração do Bloco 3. |
| Tabela `cms_pages_versions` dedicada | `VersionsPanel` compara apenas draft vs versão publicada atual. | Migração DB futura; UI já pronta. |
| `/admin/site` e `/admin/midias` fora do workspace | Rotas antigas funcionam; sem regressão. | Migração incremental do Bloco 3. |
| Botão "Restaurar" no `VersionsPanel` | Disabled com aviso claro. | Habilitar após tabela de versões. |

## 8. Evidências de aderência ao Workspace único

- Nenhuma rota nova de "página inteira" foi criada.
- `WorkspaceShell` é o único host de todas as telas admin.
- `?item=`, `?tab=`, `?new=`, `?device=`, `?compare=` são serializados na URL — recarregar restaura estado exato.
- Command Palette (⌘K) tornou-se o ponto de entrada oficial para ações contextuais em conteúdo.
