# Fase 6 — Princípios Arquiteturais Obrigatórios

> Documento-âncora. Toda decisão de UX, IA, componente, rota, permissão, dado,
> billing ou automação da Fase 6 deve ser validada contra este documento.
> Se um item da implementação conflitar com qualquer princípio abaixo, a
> implementação está errada — não o princípio.

## 1. Workspace First

O RM Prime OS é **um único produto SaaS**. Não é um conjunto de módulos.
O usuário nunca deve sentir "estou saindo do CRM e entrando no CMS".

- O **AppShell é permanente** durante toda a sessão autenticada.
- Header, Navigation Rail, Command Palette, IA, Detail Panel, Toolbar,
  Sistema de Filtros, Notificações e Quick Actions **nunca são
  reconstruídos** entre telas — apenas o conteúdo interno muda.
- Navegar entre "áreas" **não pode** provocar flash, remontagem visual,
  reset de estado global, ou troca de layout.
- As rotas (`/admin/leads`, `/admin/imoveis`, `/super`, …) existem apenas
  como implementação técnica; **não influenciam a experiência do usuário**
  e não devem aparecer como conceito na UI (breadcrumbs técnicos, títulos
  "Módulo X", etc. estão proibidos).
- Referências obrigatórias de UX: **Notion, Linear, HubSpot, ClickUp, Figma.**

## 2. Navegação orientada por fluxo de trabalho

A Navigation Rail agrupa **áreas de trabalho do usuário**, não módulos
técnicos. Nomes candidatos (a serem confirmados no doc `04-nova-ia-e-roadmap`):

- **Pipeline** — leads, funil, atendimento, follow-up.
- **Catálogo** — imóveis + lançamentos + unidades (mesma coisa para o usuário).
- **Conteúdo** — páginas, formulários, blog, campanhas, mídias.
- **Distribuição** — portais, feeds, integrações externas.
- **Administração** — configurações do tenant, usuários, equipes, perfis.
- **Operação** — Super Admin, observabilidade, DLQ, auditoria global.
- **Assistente** — IA nativa (sempre acessível pelo Header).

Toda decisão de navegação deve **reduzir a percepção de troca de sistema**.

## 3. UX orientada por tarefas

Cada tela responde à pergunta:

> "Qual é a principal tarefa que o usuário deseja executar neste momento?"

A interface é construída **em torno dessa tarefa**, nunca em torno das
tabelas do banco. Um schema é implementação; a tarefa é o produto.

Efeitos práticos:
- Nada de "cadastro de X" como título. O título descreve a tarefa
  ("Distribuir um imóvel", "Publicar uma página", "Encerrar o lead").
- Formulários são organizados pela ordem de decisão do usuário, não pela
  ordem das colunas da tabela.
- Campos sem valor para a tarefa atual são **omitidos por padrão**, não
  escondidos em accordions vazios.

## 4. Componentes permanentes

Os seguintes componentes são **permanentes** e vivem no AppShell:

| Componente         | Responsabilidade                                    |
| ------------------ | --------------------------------------------------- |
| AppShell           | Layout raiz persistente, monta uma única vez.       |
| Header             | Contexto, busca, IA, notificações, tenant, avatar. |
| Navigation Rail    | Áreas de trabalho (não módulos).                    |
| Command Palette    | Ação universal (⌘K). Navega, cria, executa.        |
| IA                 | Drawer sempre disponível, com contexto da tela.     |
| Detail Panel       | Abre entidades lateralmente. Nunca vira página.     |
| Toolbar            | Ações contextuais da tela ativa.                    |
| Sistema de Filtros | Barra de filtros unificada, mesma gramática.        |
| Notificações       | Central única, com estado persistente.              |
| Quick Actions      | Ações rápidas contextuais (⌘+N, ⌘+K, ⌘+/…).        |

Somente o **conteúdo interno** de cada componente pode variar. Estrutura,
posição, tokens e comportamento **não**.

## 5. Objetivo final

Ao final da Fase 6, o usuário **não deve conseguir identificar** onde
termina o CRM, onde começa o CMS, ou onde está o Billing.

Ele deve perceber apenas **um único produto SaaS**: consistente,
integrado, moderno, rápido e altamente produtivo.

## 6. Regra de rejeição

Qualquer PR, tela, componente, ou proposta de implementação que:

- reconstrua o shell,
- provoque troca visual de contexto,
- exponha nomes de módulos técnicos ao usuário,
- crie um layout novo em vez de reusar os permanentes,
- ou trate a UI como espelho do schema,

**deve ser rejeitada na revisão**, independentemente da qualidade do código.
