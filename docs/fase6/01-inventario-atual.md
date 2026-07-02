# Fase 6 — Bloco 0 · Documento 1
# Inventário do estado atual

> Objetivo: mapear **tudo** o que o produto tem hoje — rotas, telas, menus,
> formulários, dashboards, fluxos e cliques — antes de propor qualquer
> mudança. Base factual para as auditorias (docs 02 e 03) e para o
> redesenho de arquitetura de informação (doc 04).

## 1. Rotas autenticadas (área do produto)

Fonte: `src/routes/_authenticated.*.tsx`.

### 1.1 Tenant (`/admin/*`) — 27 rotas
Shell: `src/components/admin/AdminShell.tsx` (Sidebar fixa 64 px + Header 64 px).

| Rota                             | Tela / Tarefa aparente          | Componente principal                     |
| -------------------------------- | -------------------------------- | ---------------------------------------- |
| `/admin`                         | Dashboard do tenant              | `_authenticated.admin.index.tsx`         |
| `/admin/leads`                   | Lista de leads (CRM)             | `_authenticated.admin.leads.tsx`         |
| `/admin/imoveis`                 | Lista de imóveis                 | `_authenticated.admin.imoveis.index.tsx` |
| `/admin/imoveis/novo`            | Criar imóvel                     | `.imoveis.novo.tsx` + `ImovelForm`       |
| `/admin/imoveis/$id`             | Editar imóvel                    | `.imoveis.$id.tsx` + `ImovelForm`        |
| `/admin/lancamentos`             | Lista de lançamentos             | `.lancamentos.index.tsx`                 |
| `/admin/lancamentos/novo`        | Criar lançamento                 | `.lancamentos.novo.tsx` + `LancamentoForm` |
| `/admin/lancamentos/$id`         | Editar lançamento                | `.lancamentos.$id.tsx`                   |
| `/admin/site`                    | Configurações do site + branding | `.site.tsx`                              |
| `/admin/paginas`                 | Lista de páginas do CMS          | `.paginas.index.tsx`                     |
| `/admin/paginas/$id`             | Editar página                    | `.paginas.$id.tsx`                       |
| `/admin/formularios`             | Lista de formulários             | `.formularios.index.tsx`                 |
| `/admin/formularios/$id`         | Editar formulário                | `.formularios.$id.tsx`                   |
| `/admin/campanhas`               | Lista de campanhas               | `.campanhas.index.tsx`                   |
| `/admin/campanhas/$id`           | Editar campanha                  | `.campanhas.$id.tsx`                     |
| `/admin/blog`                    | Lista de posts                   | `.blog.index.tsx`                        |
| `/admin/blog/novo`               | Criar post                       | `.blog.novo.tsx` + `PostForm`            |
| `/admin/blog/$id`                | Editar post                      | `.blog.$id.tsx`                          |
| `/admin/midias`                  | Biblioteca de mídias             | `.midias.tsx`                            |
| `/admin/cms-auditoria`           | Versões do CMS                   | `.cms-auditoria.tsx`                     |
| `/admin/cms-transferencia`       | Exportar/importar                 | `.cms-transferencia.tsx`                 |
| `/admin/cidades`                 | Cidades                          | `.cidades.tsx`                           |
| `/admin/bairros`                 | Bairros                          | `.bairros.tsx`                           |
| `/admin/origens`                 | Origens de leads                 | `.origens.tsx`                           |
| `/admin/motivos`                 | Motivos de CRM                   | `.motivos.tsx`                           |
| `/admin/portais`                 | Portais/feeds                    | `.portais.tsx`                           |
| `/admin/corretores`              | Usuários do tenant               | `.corretores.tsx`                        |
| `/admin/equipes`                 | Equipes                          | `.equipes.tsx`                           |
| `/admin/perfis`                  | Perfis & permissões              | `.perfis.tsx`                            |
| `/admin/auditoria`               | Auditoria                        | `.auditoria.tsx`                         |

### 1.2 Super Admin (`/super/*`) — 4 rotas
Shell: escopo separado, layout distinto de `/admin`.

| Rota                        | Tarefa aparente         |
| --------------------------- | ----------------------- |
| `/super`                    | Painel executivo global |
| `/super/observabilidade`    | Métricas de plataforma  |
| `/super/dlq`                | Dead-letter queue       |
| (implícito) `/super/tenants`| Impersonate tenant      |

### 1.3 Público (`/*`) — fora do escopo da Fase 6
`/`, `/imoveis`, `/imovel/$slug`, `/lancamentos`, `/lancamentos/$slug`,
`/blog`, `/contato`, `/anuncie`, `/sobre`, `/privacidade`, `/p/$slug`,
`/auth`, `/reset-password`, `/unsubscribe`. Não são reformadas na Fase 6.

## 2. Sidebar atual (AdminShell)

Grupos como declarados em `AdminShell.tsx`:

```
principal      → Dashboard
CRM            → Leads, Imóveis
CMS            → Site & Branding, Páginas, Formulários, Campanhas,
                 Blog, Mídias, Versionamento, Exportar/Importar
Cadastros      → Cidades, Bairros, Origens de Leads, Motivos de CRM
Distribuição   → Portais
Sistema        → Usuários, Equipes, Perfis & Permissões, Auditoria
```

**Observações imediatas** (detalhadas no doc 02):
- 6 grupos + link Super Admin flutuante = 7 zonas na Sidebar.
- Terminologia oscila entre técnica ("Versionamento", "Exportar/Importar")
  e de negócio ("Leads").
- "Lançamentos" **não aparece** na Sidebar apesar de ter 3 rotas próprias.
- "Cadastros" é uma pasta guarda-chuva sem tarefa clara.
- "Sistema" mistura usuários (operação diária) com auditoria (compliance).

## 3. Header atual

`AdminShell` — 64 px, contém apenas: botão de menu mobile + link "↗ Ver site".
Não há: busca global, Command Palette, IA, notificações, tenant switch,
avatar/menu do usuário. Todo o peso está na Sidebar.

## 4. Formulários e telas de edição (heavy)

| Tela                     | Componente                                | Notas                        |
| ------------------------ | ----------------------------------------- | ---------------------------- |
| Editar imóvel            | `ImovelForm.tsx`                          | Formulário longo, muitas abas|
| Editar lançamento        | `LancamentoForm.tsx` + `UnidadesLancamento`, `GaleriaLancamento`, `PdfsLancamento`, `CondicoesPagamento`, `LazerPicker` | Página cheia, várias sub-features |
| Editar post              | `PostForm.tsx` + `RichTextEditor`         | Página cheia                 |
| Editar página CMS        | `CmsPaginasTabs` + `CmsMenuTab` + `CmsVersoesTab` | Tabs internas          |
| Site & Branding          | `.site.tsx` + `CmsFase1Tabs`              | Múltiplas abas               |
| Lead — detalhe/histórico | `LeadHistoricoDialog`                     | **Dialog**, não painel       |

Todas as edições substanciais **navegam para uma rota nova**, tirando o
usuário da lista. Nenhuma usa Detail Panel lateral.

## 5. Dashboards existentes

- **`/admin`** — dashboard do tenant. Cards de contagem + gráficos simples.
  Não usa `AdminStats`/`AdminChartContainer` de forma consistente.
- **`/super`** — dashboard executivo global.
- **`/super/observabilidade`** — métricas técnicas.
- Não existe dashboard por "área de trabalho" (Pipeline, Catálogo, etc.).

## 6. Fluxos observáveis

### 6.1 Lead → conversão
1. Lead cai em `/admin/leads` (tabela).
2. Clique no lead abre `LeadHistoricoDialog` (modal, não painel).
3. Não há timeline unificada, quick actions, ou próximo passo sugerido.
4. Para converter em atendimento: usuário sai da tela.

### 6.2 Publicar imóvel em portais
1. `/admin/imoveis/novo` — cria imóvel (página cheia).
2. Retorna à lista `/admin/imoveis`.
3. Vai até `/admin/portais` (outra área da Sidebar) para configurar feed.
4. Distribuição não é ação contextual do imóvel: é tela separada.

### 6.3 Publicar página no site
1. `/admin/paginas` → escolher página → `/admin/paginas/$id`.
2. Editar em tabs (`CmsPaginasTabs`), sem preview lateral.
3. Publicar em botão dentro da página.
4. Ir a `/admin/site` para configurações que afetam a mesma página.

### 6.4 Trocar tenant (Super Admin)
1. `/super` → escolher tenant → `impersonate_tenant_id` em `localStorage`.
2. Banner amarelo aparece em `/admin`.
3. Não há indicador permanente no Header do produto.

## 7. Componentes de UI já disponíveis (Design System embrionário)

`src/components/admin/ui/`:
- `AdminPageHeader`, `AdminSection`, `AdminEmptyState`
- `AdminStats`, `AdminToolbar`, `AdminFilters`, `AdminCards`, `AdminCard`
- `AdminTable`, `AdminModal`, `AdminFormSection`, `AdminChartContainer`

Cobrem ~60% dos casos, mas:
- Uso é **irregular** entre telas (muitas ainda rolam layout próprio).
- Não existem: `WorkspaceShell`, `CommandPalette`, `DetailPanel`,
  `QuickActions`, `NotificationCenter`, `AiDrawer`, `NavigationRail`,
  `TenantSwitcher`.

## 8. Rotas duplicadas / redundantes

- `/admin/cms-auditoria` (versões do CMS) vs `/admin/auditoria` (auditoria
  geral) — mesma palavra, escopos diferentes.
- `/admin/site` e `/admin/paginas` compartilham responsabilidades (branding,
  SEO global, header, footer aparecem em ambos parcialmente).
- `/admin/formularios` e `/admin/campanhas` sobrepõem-se para captura de leads.
- `Cidades`, `Bairros`, `Origens de Leads`, `Motivos de CRM` são
  **taxonomias**, agrupadas hoje como "Cadastros" — tratadas como telas
  de igual peso a Leads.

## 9. Contagens agregadas

| Métrica                          | Valor atual |
| -------------------------------- | ----------- |
| Rotas autenticadas (tenant+super)| 31          |
| Itens na Sidebar tenant          | 17          |
| Grupos na Sidebar                | 6           |
| Componentes de shell permanentes | 0           |
| Componentes de DS admin          | 12          |
| Telas com Detail Panel           | 0           |
| Telas com Command Palette        | 0           |
| Telas com IA integrada           | 0           |
| Telas com Quick Actions          | 0           |

## 10. Conclusão do inventário

O produto hoje é uma coleção de **31 páginas técnicas** organizadas por
**6 rótulos de módulos**, servida por um shell mínimo (Sidebar + Header
vazio). Toda edição substancial é uma navegação de página cheia; toda
tarefa cross-área exige o usuário sair de onde está.

Este é o ponto de partida contra o qual as auditorias (docs 02 e 03) vão
medir a distância até o objetivo Workspace First.
