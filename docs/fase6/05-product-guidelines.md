# Fase 6 — Bloco 0 · Documento 5
# Product Guidelines (Constituição do Produto)

> Este documento é **vinculante** para toda implementação da Fase 6 em
> diante. Qualquer PR que viole uma regra aqui **é rejeitado**,
> independentemente da qualidade do código.
>
> Ordem de precedência quando houver conflito:
> **Princípios (doc 00) > Guidelines (este doc) > DS > Código.**

## 1. Princípios de UX (não negociáveis)

1. **Workspace First** — shell permanente, sem troca de contexto visual.
2. **Tarefa antes de tabela** — cada tela é desenhada em torno da tarefa,
   não do schema.
3. **Uma decisão por tela** — se o usuário precisa tomar duas decisões
   independentes, são duas telas / dois painéis.
4. **Detail Panel > Rota nova** — abrir entidade nunca deve tirar o
   usuário da lista.
5. **⌘K é o atalho universal** — tudo o que pode ser feito na UI pode ser
   feito pelo Command Palette.
6. **IA é nativa, não plugada** — recebe contexto automaticamente
   (tela + entidade + tenant + permissões + histórico).
7. **Consistência acima de criatividade** — repetir padrão sempre vence
   inventar novo.

## 2. AppShell — comportamento obrigatório

- Montado **uma única vez** no root autenticado. Nunca desmontado por
  navegação entre rotas.
- Estrutura fixa: `Header (56 px) + Rail (240 px / 64 px) + Content`.
- Transição entre rotas: apenas o **conteúdo interno** muda; Header,
  Rail, Palette, IA, Notif, Toolbar permanentes.
- `AppShell` **proibido** de re-renderizar por mudança de rota (memoização
  obrigatória, `React.memo` + estado em contexto próprio).
- Nenhum código de rota pode substituir/complementar o Header ou Rail.

## 3. Detail Panel — padrão default

- Todo item de lista **abre em Detail Panel**, nunca em rota nova, salvo
  a exceção formal (§ 3.1).
- Modos: **split 40/60** (padrão em listas de trabalho), **drawer 640 px**
  (criação rápida / entidade leve), **fullscreen dentro do shell** (editor
  denso).
- Atalhos obrigatórios: `Esc` fecha; `←/→` navega entre itens da lista;
  `⌘S` salva; `⌘Enter` confirma ação primária.
- URL reflete a entidade aberta (`?item=<id>`) para deep-linking, sem
  trocar de rota.

### 3.1 Exceção "rota-página"
Uma tela vira rota-página **apenas se**:
- não couber em Detail Panel/drawer/fullscreen do painel; **e**
- exigir imersão > 30 s (editor rich text de página CMS/blog).

Toda exceção precisa ser documentada em ADR no PR que a introduz.

## 4. Command Palette (⌘K) — inventário mínimo

O Palette deve suportar, no lançamento do Bloco 1:

- **Navegar** — para qualquer área ou tela existente.
- **Buscar** — leads, imóveis, lançamentos, páginas, posts, formulários,
  campanhas, mídias, usuários, tenants (Super), taxonomias.
- **Criar** — lead, imóvel, lançamento, página, post, formulário, campanha,
  usuário, taxonomia.
- **Agir** — publicar, arquivar, distribuir, encerrar, atribuir, agendar
  follow-up.
- **IA** — "Perguntar ao assistente…" leva a IA com contexto.
- **Preferências** — tema, atalhos, ajuda.

Regra: **toda nova ação de UI precisa ser registrada no Palette** no
mesmo PR que a introduz.

## 5. IA nativa — contrato

- Sempre recebe: rota atual, entidade selecionada (se houver), tenant,
  permissões do usuário, histórico da conversa.
- Nunca inventa dado — quando precisa, chama server functions existentes.
- Respostas com ações executáveis geram Quick Actions clicáveis no drawer.
- Modelo default: `google/gemini-3-flash-preview` via Lovable AI Gateway.
  Nunca expor `LOVABLE_API_KEY` no client.
- Histórico persistido por usuário + tenant.

## 6. Design System — imutável

**14 componentes oficiais** da Fase 6. Nada fora dessa lista pode ser
usado em telas de produto.

| # | Componente         | Fonte                          |
| - | ------------------ | ------------------------------ |
| 1 | `AppShell`         | novo, Bloco 1                  |
| 2 | `AppHeader`        | novo, Bloco 1                  |
| 3 | `NavigationRail`   | novo, Bloco 1                  |
| 4 | `CommandPalette`   | novo, Bloco 1                  |
| 5 | `AiDrawer`         | novo, Bloco 1                  |
| 6 | `DetailPanel`      | novo, Bloco 1                  |
| 7 | `NotificationCenter` | novo, Bloco 1                |
| 8 | `TenantSwitcher`   | novo, Bloco 1                  |
| 9 | `PageHeader`       | evolução de `AdminPageHeader`  |
| 10| `Toolbar`          | evolução de `AdminToolbar`     |
| 11| `Filters`          | evolução de `AdminFilters`     |
| 12| `Table`            | evolução de `AdminTable`       |
| 13| `Stats`            | evolução de `AdminStats`       |
| 14| `EmptyState`       | evolução de `AdminEmptyState`  |

**Regra 6.1** — Componente novo só pode ser usado após:
1. ser adicionado ao DS,
2. ter storybook/exemplo em `src/components/workspace/__docs__`,
3. ter teste de a11y básico.

**Regra 6.2** — Cores hardcoded (`text-white`, `bg-[#...]`) **proibidas**.
Só tokens semânticos de `src/styles.css`.

## 7. Padrões por tipo de tela

### 7.1 Lista (Leads, Imóveis, Páginas…)
```
[PageHeader] título tarefa + Quick Actions primárias
[Toolbar]   busca contextual + Filters + botão + Novo (⌘N)
[Table]     linhas com ação padrão "abrir Detail Panel"
[DetailPanel] split 40/60 quando um item está selecionado
```

### 7.2 Dashboard / Início
```
[PageHeader] "Olá, {nome}. O que precisa da sua atenção hoje?"
[Stats]     4 KPIs — cada um clicável, leva ao feed filtrado
[Feed de decisões] lista priorizada (ação sugerida por linha)
[AI Suggestions] card lateral com próximas ações
```

### 7.3 Formulário (dentro de Detail Panel)
- Ordem = ordem de decisão do usuário, nunca ordem do schema.
- Campos irrelevantes na decisão atual são **omitidos**, não colapsados.
- Autosave em campo (debounce 800 ms) + indicador "Salvo às HH:MM".
- Erros inline no campo, nunca em modal.
- Ação primária no rodapé do painel (sticky).

### 7.4 Editor denso (rich text)
- Fullscreen dentro do AppShell.
- Preview lateral persistente.
- Toolbar do editor no topo do painel (não no Header do shell).

## 8. Filtros — gramática única

- Barra horizontal no topo da Toolbar.
- Chips removíveis, ordem estável.
- Sempre com "Salvar visualização" (persiste em `user_views`).
- Operadores unificados: `é / não é / contém / começa com / está entre /
  vazio / preenchido`.
- **Proibido** um filtro exclusivo de uma tela — se precisar, generaliza.

## 9. Tabelas — regras

- Sticky header sempre.
- Coluna de ações sticky à direita (Detail Panel, Quick Actions, menu).
- Densidade default `comfortable`; opção `compact` na Toolbar.
- Paginação servidor-side para > 100 registros.
- Ordenação clicável no header, com indicador.

## 10. Responsividade

- **Desktop (≥ 1280 px)**: split 40/60 disponível; Rail expandida.
- **Tablet (768–1279 px)**: split colapsa em drawer 640 px; Rail em 64 px.
- **Mobile (< 768 px)**: Rail em bottom-tab (5 áreas principais + "Mais");
  Header vira 48 px; Detail Panel = fullscreen; Palette abre em modal.
- Nenhum layout pode quebrar; nenhuma tela pode ter scroll horizontal.

## 11. Performance percebida (checklist obrigatório)

- Skeleton para toda lista/painel/dashboard (nunca spinner central).
- Optimistic UI para toda ação Quick Action.
- Preload de rotas irmãs no hover do link.
- Detail Panel abre em < 100 ms (dado local); dado remoto entra depois.
- Command Palette abre em < 50 ms.
- Cache de listas por 60 s (`staleTime` no React Query).

## 12. Acessibilidade

- Foco visível **sempre** (`ring-2 ring-ring`).
- Atalhos anunciados em `?` (help overlay).
- Palette e Panel com `role="dialog"` correto, focus trap, `Esc` fecha.
- Contraste AA mínimo, AAA em títulos.
- Suporte a navegação teclado 100% (tab order previsível).

## 13. Naming (o que aparece na UI)

- **Nada** de nome de tabela ("user_roles", "cms_versions").
- **Nada** de "Módulo X" ou "Sistema Y".
- Verbos no infinitivo em ações ("Publicar", "Distribuir", "Encerrar").
- Substantivos concretos em títulos ("Leads", "Imóveis", "Portais").
- Português brasileiro sempre. Inglês só em código.

## 14. Checklist de aceitação por tela

Toda tela precisa passar em **todos** os itens antes de PR:

- [ ] Está dentro do `AppShell` permanente.
- [ ] Responde às 4 perguntas (objetivo/decisão/ação/informação) por escrito
      no PR.
- [ ] Usa apenas componentes do DS (§ 6).
- [ ] Ação primária ≤ 1 clique (Quick Action, botão sticky, ou ⌘Enter).
- [ ] Suporta ⌘K para navegar até ela e para agir dentro dela.
- [ ] Tem estado vazio, carregando, erro e "sem permissão".
- [ ] Tem cobertura mínima de teste (smoke).
- [ ] Passa a11y (foco, atalhos, ARIA).
- [ ] Responsivo em desktop/tablet/mobile.
- [ ] Sem terminologia técnica na UI.
- [ ] Nota ≥ 9,0 na auditoria visual (doc 03).

## 15. Governança do documento

- Alterações a este documento exigem PR próprio, aprovado antes de
  qualquer PR de produto que o toque.
- Este documento é **fonte de verdade** para revisores. Se o código
  diverge, o código está errado.
