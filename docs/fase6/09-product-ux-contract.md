# Fase 6 — Product UX Contract

# Contrato arquitetural de experiência do RM Prime OS

> Este documento é **normativo**. Toda decisão de UX tomada no Bloco 4 (e
> nos blocos seguintes da Fase 6) deve obedecer a este contrato. Qualquer
> divergência exige justificativa arquitetural explícita, registrada como
> Architectural Exception (formato herdado do Bloco 3.1) e aprovada antes
> da implementação. Este contrato prevalece sobre o Plano Executivo,
> sobre os descriptors de entidade e sobre qualquer preferência local
> de componente.

---

## 1. Product Vision

O RM Prime OS é **um único Workspace operacional**. Não é uma coleção
de módulos justapostos, não é um portal com várias ferramentas embutidas
e não é um agregador de telas administrativas.

Regras de percepção do produto:

- O usuário **nunca** deve sentir que "saiu de um módulo" e "entrou em
  outro". Trocar de área muda o **contexto de trabalho**; o produto
  permanece o mesmo.
- Header, Navigation Rail, Command Palette, IA Drawer, Notification
  Center e Detail Panel são elementos **do produto**, não de uma área.
  Eles não podem ser recriados por contexto.
- A identidade visual (tipografia, tokens, densidade, raios, sombras,
  animações) é única. Cada área **especializa** o Workspace via
  `EntityDescriptor`; nenhuma área **redefine** o Workspace.

Teste de validação (Vision Test):
> Faça o usuário navegar entre Leads → Imóveis → Portais → Conteúdo em
> 20 segundos. Se, em qualquer momento, ele hesitar por não reconhecer
> o produto, o contrato foi violado.

## 2. Workspace Continuity

Continuidade é a garantia de que a mudança de contexto **não altera o
modelo mental** do usuário. Em qualquer área migrada da Fase 6, o
usuário deve encontrar sempre:

- Mesma **navegação** (Rail, Header, Command Palette, breadcrumbs).
- Mesma **organização visual** (Primary/Secondary/Activity/Inspector).
- Mesmos **atalhos de teclado** (⌘K, `?`, `E`, `/`, `Esc`, `?`).
- Mesmo **comportamento** de abrir/fechar Detail Panel, salvar, publicar,
  arquivar, versionar.
- Mesma **hierarquia de informações** (título, status, metadados,
  ações, corpo).
- Mesma **localização das ações** (primárias no Header do Detail Panel;
  secundárias em overflow; destrutivas em confirmação padrão).
- Mesma **forma de edição** (Editor por metadados; autosave; publish
  workflow unificado).

O que muda entre áreas: **os dados** e **os labels do descriptor**.
Nada mais.

## 3. Workspace Memory

O Workspace deve **preservar automaticamente**, entre navegações e
recargas, o contexto operacional do usuário. O estado é persistido em
URL (search params) sempre que possível e em `localStorage` quando o
estado é local à sessão (densidade, largura de painéis, tema).

Estado que **deve** ser preservado:

- Filtros aplicados por lista.
- Pesquisa ativa (`q`).
- Ordenação (`sort`).
- Paginação / cursor.
- Posição de scroll da lista (restaurada ao voltar).
- Item selecionado (`item=...`).
- Largura dos painéis (split Primary/Secondary).
- Abas abertas dentro do Detail Panel.
- Estado do Detail Panel (aberto/fechado, colapsado).
- Estado do Inspector Panel.
- Estado da IA (thread ativa, contexto da entidade selecionada).
- Histórico recente do Workspace (últimos itens abertos por área).

**Proibido:** reinicializar filtros, resetar scroll, fechar Detail Panel
ou perder a seleção ao alternar de área e voltar. Alternância entre
áreas é reversível e não destrutiva.

## 4. Zero Context Reset

Mudar de entidade **não é** reconstruir a interface.

Regras técnicas de implementação (obrigatórias para o `EntityWorkspace`):

- Um único `EntityWorkspace` fica montado sob `WorkspaceShell` durante
  toda a sessão. Alternar entidades **substitui apenas o descriptor**.
- `WorkspaceShell`, `NavigationRail`, `AppHeader`, `CommandPalette`,
  `AiDrawer`, `NotificationCenter`, `DetailPanel` **não desmontam** ao
  trocar de área.
- Transições entre áreas não devem provocar `Suspense fallback` visível
  no shell — apenas em painéis internos que estejam efetivamente
  aguardando dados novos.
- Nenhuma área pode declarar seu próprio `RootLayout`, sua própria
  `Sidebar` ou seu próprio `Header`.

**Proibido:**

- Reconstrução completa da árvore de componentes ao trocar de área.
- Recarregamento de rota inteira quando basta invalidar uma query.
- Mudança perceptível de layout (shift, flash, jump) entre áreas.
- Perda de contexto do usuário sem ação explícita do próprio usuário.

## 5. Workspace Tokens (Primitivas Universais)

O Workspace expõe um conjunto **fixo** de primitivas. Cada entidade
apenas escolhe **quais primitivas usar** e **com que conteúdo
especializado**. Não é permitido criar primitivas novas por entidade.

| Token              | Papel                                                | Especializações permitidas                        |
|--------------------|------------------------------------------------------|---------------------------------------------------|
| `PrimaryPanel`     | Lista / grid / kanban da entidade                    | Colunas, filtros, densidade                       |
| `SecondaryPanel`   | Detalhe do item selecionado (split ou drawer)        | Layout do conteúdo do descriptor                  |
| `ActivityPanel`    | Fluxo cronológico de eventos                         | Timeline (Pipeline) · Audit Trail (Admin) · Versões (Conteúdo) |
| `InspectorPanel`   | Metadados, propriedades e relações                   | SEO, taxonomias, atributos                        |
| `AssistantPanel`   | IA contextual (drawer lateral)                       | Prompt inicial, actions por entidade              |
| `LifecyclePanel`   | Estados e transições (draft, publicado, arquivado)   | Rótulos e regras de transição                     |
| `ActionsPanel`     | Ações primárias / secundárias / destrutivas          | Quick actions por descriptor                      |

Exemplos de mapeamento:

```text
Conteúdo → ActivityPanel = VersionsPanel + PublishWorkflow
Pipeline → ActivityPanel = TimelinePanel
Admin    → ActivityPanel = AuditTrailPanel
Distrib. → ActivityPanel = IntegrationStatusPanel
```

Regra: se uma entidade "precisa" de um painel novo, ela na verdade
precisa de uma **especialização** de uma primitiva existente. Se nenhuma
primitiva serve, o contrato é reaberto — não a entidade.

## 6. Progressive Workspace

O Workspace deve **priorizar a interação imediata**. Ordem obrigatória
de carregamento perceptível:

1. `WorkspaceShell` (síncrono, já montado).
2. `PrimaryPanel` (lista) — primeira renderização com skeleton de linhas,
   nunca com spinner central.
3. `SecondaryPanel` (Detail) — carrega ao selecionar item; skeleton
   segmentado por seção.
4. `InspectorPanel` — carrega junto com o Detail, mas seções pesadas
   (relacionamentos, contadores) podem ser diferidas.
5. `ActivityPanel` — carrega após o Detail; paginado.
6. `AssistantPanel` — lazy até o usuário abrir (⌘J).
7. Histórico, contadores agregados e componentes auxiliares — lazy.

Regras:

- **Nenhum spinner central de página** após a montagem inicial do shell.
- Todo carregamento subsequente é **local** ao painel que aguarda dados.
- Toda navegação entre itens da mesma lista usa **optimistic UI**
  (seleção imediata, dados carregam depois no Detail).
- `React.lazy` / `Suspense` para painéis não-críticos.
- Prefetch on hover em itens da lista (via TanStack Query).

## 7. UX Consistency Rules

Regras invariantes entre todas as áreas migradas:

- **Animações**: mesma curva (`ease-out`), mesma duração base (150 ms
  para hover/focus; 200 ms para painéis; 300 ms para transições de
  contexto). Reduzido a `prefers-reduced-motion`.
- **Estados de carregamento**: sempre skeleton com a **forma** do
  conteúdo final. Nunca spinner central. Nunca "Loading...".
- **Estados vazios**: título + descrição + 1 ação primária. Mesmo
  layout em todas as áreas.
- **Estados de erro**: título + causa em linguagem humana + ação de
  retry. Mesmo componente em todas as áreas.
- **Mensagens**: mesmas frases para as mesmas operações (Salvo,
  Publicado, Arquivado, Duplicado). Copy centralizada.
- **Posição das ações**: primária à direita, destrutiva em overflow,
  secundárias entre as duas.
- **Hierarquia visual**: um único H1 por Detail Panel; metadados em
  linha secundária; corpo em `PrimaryPanel` do Detail.
- **Componentes do DS**: exclusivamente `src/components/ui/*` (shadcn)
  e primitivas do Workspace. Nenhum componente ad-hoc por entidade.

Justificativa arquitetural exigida para qualquer desvio.

## 8. Workspace Navigation Contract

Regras únicas de navegação, válidas em todas as áreas:

- **Troca de contexto (área)**: clique na Rail ou ⌘K → navegar. Sem
  reload. Sem perda de estado da área destino se já visitada.
- **Abrir Detail Panel**: clique em item da lista, ou `Enter` na linha
  focada, ou deep-link com `?item=<id>`. Sempre atualiza a URL.
- **Fechar Detail Panel**: `Esc`, clique no `X`, ou clique fora (drawer).
  URL volta ao estado anterior (`?item` removido).
- **Command Palette (⌘K)**: navegação global, ações globais, busca
  cross-entity. Mesma interação em toda a plataforma.
- **Teclado**: `↑/↓` navega na lista, `Enter` abre, `Esc` fecha, `E`
  edita, `/` foca busca, `?` mostra atalhos, `⌘S` salva, `⌘⇧P` publica.
- **Histórico**: `back/forward` do navegador respeita seleção, filtros,
  aba interna. Cada estado significativo empurra entrada no history.
- **Deep-links**: toda combinação (área + filtros + item + aba) é
  representável por URL. URL é a fonte de verdade.
- **Retorno ao contexto anterior**: `Esc` no Detail devolve foco ao
  item na lista. `back` do navegador retorna à área anterior com estado
  preservado.

## 9. Performance Contract

Metas expressas como **experiência percebida**, com métricas técnicas
apenas como proxy.

- **Abertura do Workspace**: shell interativo em < 100 ms após
  navegação (a partir da rota já autenticada). Nunca há tela branca
  entre áreas.
- **Troca de área**: 0 flash de layout; skeleton local se necessário;
  nunca spinner central.
- **Seleção de item**: Detail Panel visível em < 50 ms (optimistic);
  dados chegam depois.
- **Autosave**: nunca bloqueia edição. Indicador discreto de estado.
- **Publish / ações longas**: feedback imediato + toast final. Nunca
  modal bloqueante.
- **Atualização localizada**: uma mutação atualiza apenas o painel
  afetado; nunca força re-render do shell.
- **Prefetch**: hover em item da lista dispara prefetch da query do
  Detail.

Métricas-alvo (proxies, não substitutos do teste percebido):

- TTI da área após troca: ≤ 100 ms.
- CLS entre áreas: 0.
- INP mediano: ≤ 100 ms.

## 10. Anti-Patterns (Proibições Explícitas)

Comportamentos **proibidos** durante toda a Fase 6. Cada item abaixo é
motivo automático de rejeição de PR:

- Criar um `Workspace` específico para uma entidade (ex.: `LeadsWorkspace`,
  `ImoveisWorkspace`). Existe **um** `EntityWorkspace`.
- Criar `Header` diferente por contexto.
- Criar `Sidebar` / `Rail` específica por área.
- Criar fluxo de edição exclusivo de uma entidade (formulário próprio,
  autosave próprio, publish próprio).
- Criar `CommandPalette` específica por área.
- Criar `Detail Panel` com layout incompatível com as primitivas do §5.
- Usar `if (kind === '...')` ou `switch (kind)` no núcleo do Workspace
  (`EntityWorkspace`, `EntitySessionProvider`, `EntityEditor`,
  `EntityList`, `EntityPreviewPane`). Regra herdada do Bloco 3.1.
- Introduzir novo padrão de navegação (novo shell, novo tab-bar,
  novo esquema de rotas paralelas).
- Criar componentes de UI fora do Design System.
- Criar Architectural Exceptions **sem** registro documentado no
  relatório de auditoria da etapa correspondente.
- Ler `*.functions.ts` diretamente em componentes de UI — sempre via
  `adapter`.
- Recarregar rota inteira quando basta invalidar uma query.
- Introduzir spinner central após a montagem do shell.

## 11. UX Definition of Done

Complementa o DoD técnico do Plano Executivo (doc 09 §8). O Bloco 4 só
encerra quando **todos** os critérios abaixo estiverem verdadeiros e
comprovados por auditoria:

- [ ] O usuário **não percebe** mudança de produto ao alternar entre
      áreas (Vision Test do §1 aprovado por ao menos 2 usuários reais).
- [ ] Todos os Workspaces obedecem ao **Workspace Navigation Contract** (§8).
- [ ] Todos preservam contexto conforme **Workspace Memory** (§3).
- [ ] Todos utilizam exclusivamente as **primitivas do §5**.
- [ ] Todos seguem as **UX Consistency Rules** (§7).
- [ ] Nenhum Anti-Pattern do §10 presente no código (auditoria automatizada
      + revisão manual).
- [ ] Metas do **Performance Contract** (§9) atingidas nas rotas migradas.
- [ ] Zero exceções de UX não documentadas. Cada exceção existente segue
      o formato read-only do Bloco 3.1 e é aprovada no relatório final.

---

## 12. Three-Domain Rule (Multi-Domain Validation Test) — normativo desde Etapa 4.1.a

Toda nova capacidade adicionada ao contrato do Workspace (novo campo de
`EntityDescriptor`, novo método de `EntityAdapter`, nova primitiva do §5,
nova chave de search-state, novo registry) só é considerada **genérica** —
e portanto aceita no núcleo — se puder ser reutilizada em pelo menos **três
domínios distintos**, cobrindo obrigatoriamente:

1. **Conteúdo** — Páginas, Blog, Formulários, Campanhas, Mídias, Site, Auditoria.
2. **Operacional** — Pipeline (Leads), Contratos, Investidores, Comissões,
   Corretores e demais domínios de CRM/negócio.
3. **Terceiro domínio independente** — Administração / Super Admin,
   Relatórios / Analytics globais, Configurações de sistema ou entidades
   técnicas (logs, integrações, permissões, chaves API, billing).

Regras derivadas:

- **Nomenclatura**: identificadores no core devem ser semanticamente
  genéricos (`filters`, `views`, `actions`, `panels`). Nomes com semântica
  de domínio (`leadFilters`, `contentActions`, `adminPanels`) são
  automaticamente rejeitados.
- **Prova em código**: a capacidade só é considerada "estabilizada" após
  ser exercitada por descriptors reais de pelo menos um representante de
  cada um dos três domínios. Até lá, permanece marcada como *provisional*
  no relatório da etapa.
- **Falha no critério**: se a capacidade não passa no teste dos três
  domínios, ela deve ser (i) reprojetada para maior generalidade, (ii)
  fatiada em duas capacidades genéricas distintas, ou (iii) removida do
  escopo. Não é permitido aceitá-la como "feature de um único domínio"
  nem migrá-la para um escape hatch funcional (`*Fn`) no core.
- **Escopo**: esta regra se aplica exclusivamente ao **núcleo** do
  Workspace (`EntityWorkspace`, `EntityDescriptor`, `EntityAdapter`,
  registries, search schema). Componentes específicos de domínio,
  registrados via registry, seguem regras próprias e não precisam ser
  reutilizáveis.

Princípio inegociável derivado:

> **O Workspace não evolui para suportar um domínio específico.**
> **Um novo domínio só é incorporado como prova de que o Workspace já
> suporta qualquer coisa.**

---

## Governança

- Este contrato é referenciado pelo Plano Executivo do Bloco 4 (doc 09)
  como **dependência obrigatória**.
- Toda etapa (4.0 → 4.5) deve, ao encerrar, apresentar uma **checagem de
  aderência ao contrato** na sua seção de DoD parcial.
- Alterar este contrato exige nova aprovação explícita do usuário. Não
  é permitido flexibilizá-lo durante a implementação para acomodar um
  descriptor específico — o descriptor é que se adapta ao contrato.
