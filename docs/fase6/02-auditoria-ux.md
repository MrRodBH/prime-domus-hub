# Fase 6 — Bloco 0 · Documento 2
# Auditoria de UX

> Método: cada tela é interrogada com as 4 perguntas obrigatórias
> (Diretriz #3, princípio "UX orientada por tarefas"):
>
> 1. **Objetivo** — para que o usuário abre esta tela?
> 2. **Decisão** — que decisão ele precisa tomar aqui?
> 3. **Ação principal** — qual é a única ação que não pode faltar?
> 4. **Informação necessária** — que dados são indispensáveis para agir?
>
> Tudo o que não responde a essas 4 perguntas é **ruído** e será cortado
> ou movido para o Detail Panel / Command Palette / Toolbar.

## 1. Diagnóstico transversal

### 1.1 Violações de Workspace First
| Violação                                       | Onde                          |
| ---------------------------------------------- | ----------------------------- |
| Shell diferente entre `/admin` e `/super`      | AdminShell vs Super           |
| Edição sempre em rota nova (não Detail Panel)  | 100% das telas de edição      |
| Lead detalhado em Dialog (modal), não painel   | `/admin/leads`                |
| Header vazio (sem busca, IA, notif, tenant)    | AdminShell header             |
| Terminologia técnica visível                   | "Versionamento", "Exportar/Importar", "Cadastros", "Sistema" |
| Ausência de Command Palette                    | Toda a aplicação              |
| Ausência de IA nativa contextual               | Toda a aplicação              |

### 1.2 Violações de densidade / clareza
| Padrão-problema                                | Ocorrência                    |
| ---------------------------------------------- | ----------------------------- |
| Cabeçalhos gigantes com eyebrow + título + descrição em telas que já são autoexplicativas | Todas as `AdminPageHeader` sem ação clara |
| Cards decorativos sem valor de decisão         | Dashboard `/admin`            |
| Formulários organizados por tabela, não por decisão | ImovelForm, LancamentoForm |
| Ações primárias escondidas dentro de tabs      | CmsPaginasTabs, CmsFase1Tabs  |
| Scroll vertical desnecessário (campos vazios visíveis) | ImovelForm, LancamentoForm |
| Tabelas sem toolbar unificada (filtros diferentes por tela) | 100% das listas  |
| Vazios sem `AdminEmptyState` (só uma mensagem) | Portais, Campanhas, Motivos   |

### 1.3 Cliques excessivos (fluxos-chave)

| Fluxo                                | Cliques hoje | Meta Fase 6 |
| ------------------------------------ | ------------ | ----------- |
| Ver detalhe de um lead               | 2 (linha + modal) | 1 (row → Detail Panel) |
| Converter lead em atendimento        | 5+           | 2           |
| Publicar imóvel em portal            | 6+ (2 áreas) | 2 (Quick Action) |
| Criar página CMS a partir de template| 4            | 1 (Command Palette: "Criar página") |
| Trocar tenant (Super Admin)          | 3            | 1 (Header)  |
| Buscar entidade qualquer             | ∞ (sem busca)| 1 (⌘K)      |

## 2. Auditoria por tela (top 15 telas mais usadas)

Formato: **[Tela] → 4 perguntas → problemas → o que fica no conteúdo,
o que vai para o shell.**

### 2.1 `/admin` — Dashboard do tenant
- **Objetivo:** entender a saúde do negócio agora.
- **Decisão:** onde eu preciso atuar hoje?
- **Ação principal:** ir para o lead/imóvel/página que precisa de atenção.
- **Informação necessária:** leads novos, funil, imóveis parados, portais com erro, IA sugestões.

Problemas: cards de contagem sem decisão associada; sem "próxima ação
recomendada"; sem link direto para o item que precisa de ação.

Reformulação: dashboard vira **feed de decisões** (lista priorizada) +
KPIs à direita. Cada linha do feed abre Detail Panel.

### 2.2 `/admin/leads`
- **Objetivo:** trabalhar o pipeline.
- **Decisão:** quem eu atendo agora?
- **Ação principal:** abrir lead → registrar interação → agendar próximo passo.
- **Informação necessária:** lead + histórico + próximo passo sugerido.

Problemas: detalhe em Dialog; sem timeline; sem quick actions; filtros
inconsistentes com outras listas.

Reformulação: lista + Detail Panel (40/60) com timeline, quick actions
(WhatsApp, ligar, agendar, encerrar), IA sugerindo próxima ação.

### 2.3 `/admin/imoveis`
- **Objetivo:** manter o catálogo em ordem.
- **Decisão:** qual imóvel editar/publicar/despublicar/distribuir?
- **Ação principal:** editar imóvel; distribuir em portais.
- **Informação necessária:** foto, endereço, preço, status, portais ativos.

Problemas: distribuição em portais é outra tela; edição navega para
página cheia; sem preview.

Reformulação: linha clicada abre Detail Panel com preview + tabs
(dados, mídias, portais, histórico). Quick Action "Distribuir".

### 2.4 `/admin/imoveis/novo` e `/admin/imoveis/$id`
- **Objetivo:** cadastrar / atualizar imóvel.
- **Decisão:** publicar ou salvar rascunho?
- **Ação principal:** salvar + publicar.
- **Informação necessária:** só os campos do próximo passo (progressivo).

Problemas: página cheia, tira do contexto da lista; muitos campos
irrelevantes visíveis; sem autosave.

Reformulação: mesma edição dentro de Detail Panel (drawer 640 px);
formulário em passos por decisão (identificação → localização →
características → mídias → publicação). Autosave.

### 2.5 `/admin/lancamentos` (+ novo/$id)
Mesmos problemas de imóveis, agravados por 5 sub-features
(`Unidades`, `Galeria`, `Pdfs`, `Condições`, `Lazer`) empilhadas na
página. Reformulação: Detail Panel com tabs internas; sub-features viram
seções dobradas por padrão.

### 2.6 `/admin/site`
- **Objetivo:** ajustar como o site público aparece.
- **Decisão:** o que publicar / alterar visualmente?
- **Ação principal:** salvar + ver preview.

Problemas: sobrepõe com `/admin/paginas`; sem preview lateral; muitas
abas de configuração.

Reformulação: agrupa em Detail Panel de "Site" com preview lateral fixo;
tabs (Branding, SEO, Header/Footer, Redes) internas ao painel.

### 2.7 `/admin/paginas` + `$id`
Reformulação: lista + Detail Panel com editor + preview lado a lado.
Publicar/versionar como Quick Actions.

### 2.8 `/admin/formularios` + `$id`
Sobrepõe com Campanhas. Fundir na tarefa "Capturar leads" — formulário é
uma modalidade de campanha.

### 2.9 `/admin/campanhas` + `$id`
Mesmo tratamento — Detail Panel, edição contextual.

### 2.10 `/admin/blog`
Já é próximo do ideal. Falta: Detail Panel para edição rápida, IA para
sugestão de título/SEO, preview lateral.

### 2.11 `/admin/midias`
- **Ação principal:** encontrar mídia. Hoje: scroll infinito sem filtros
  fortes. Reformulação: filtros unificados + seleção múltipla + Quick
  Actions (usar em página, otimizar, arquivar).

### 2.12 `/admin/portais`
- **Objetivo:** garantir distribuição funcionando.
- **Decisão:** algo está com erro? republicar?
- **Ação principal:** re-sincronizar / ajustar token.

Problemas: escondido em grupo "Distribuição" com 1 item; erros de portal
não aparecem no dashboard nem no imóvel.

Reformulação: Portais viram **status permanente no Header** (chip com
badge); tela detalhada só quando o usuário quer administrar.

### 2.13 `/admin/corretores`, `/admin/equipes`, `/admin/perfis`
Três telas para "quem tem acesso a quê". Fundir em "Pessoas & Acesso"
com abas internas (Usuários, Equipes, Perfis).

### 2.14 `/admin/cidades`, `/admin/bairros`, `/admin/origens`, `/admin/motivos`
Taxonomias. Tirar da Sidebar. Editáveis via Command Palette e via
Detail Panel do Admin. Manter uma tela consolidada em Administração →
Taxonomias.

### 2.15 `/super` (Super Admin)
- **Objetivo:** cuidar da plataforma.
- **Decisão:** algum tenant/serviço requer intervenção?

Problemas: shell diferente do produto → viola Workspace First.

Reformulação: **mesmo AppShell**, área "Operação" da Navigation Rail,
com Tenant Switcher no Header (impersonate = trocar contexto do
Workspace, sem trocar de shell).

## 3. Ranking de dor (para priorizar o roadmap do doc 04)

| Rank | Tela / fluxo                                    | Dor   |
| ---- | ----------------------------------------------- | ----- |
| 1    | Detalhe de Lead (modal, sem timeline)           | Alta  |
| 2    | Distribuição de imóvel em portais               | Alta  |
| 3    | Edição de imóvel/lançamento (página cheia)      | Alta  |
| 4    | Ausência de busca global / Command Palette      | Alta  |
| 5    | Header vazio (sem tenant, IA, notif)            | Alta  |
| 6    | Dashboard sem "próxima ação"                    | Média |
| 7    | Site & Branding vs Páginas sobrepostos          | Média |
| 8    | Formulários vs Campanhas sobrepostos            | Média |
| 9    | Taxonomias como telas de 1ª classe              | Média |
| 10   | Super Admin com shell separado                  | Alta (viola Workspace First) |

## 4. Conclusão da auditoria

O produto atual **falha nas 4 perguntas** na maior parte das telas.
As UIs foram construídas espelhando o schema, não a tarefa. O shell é
mínimo e não carrega os componentes permanentes exigidos pela Fase 6.

O redesenho (doc 04) parte de: **tarefas primeiro, tabelas depois,
shell antes de tudo**.
