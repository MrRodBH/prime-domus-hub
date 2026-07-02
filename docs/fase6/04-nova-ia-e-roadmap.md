# Fase 6 — Bloco 0 · Documento 4
# Nova Arquitetura de Informação + Roadmap de Migração

> Este documento define a nova IA orientada por **áreas de trabalho** (não
> módulos), a matriz de preservação de URLs, o antes/depois por tela com
> ganhos mensuráveis, e a ordem de migração progressiva.

## 1. Arquitetura de Informação — novo modelo

### 1.1 Navigation Rail (áreas de trabalho)

| # | Área          | O que o usuário faz aqui                                                | Conteúdo interno                                 |
| - | ------------- | ----------------------------------------------------------------------- | ------------------------------------------------ |
| 1 | Início        | Ver o que precisa da minha atenção agora                                | Feed de decisões + KPIs + IA                     |
| 2 | Pipeline      | Trabalhar leads e conversões                                            | Leads, funil, atendimentos, follow-ups           |
| 3 | Catálogo      | Cuidar de tudo que é imóvel                                             | Imóveis, Lançamentos, Unidades                   |
| 4 | Conteúdo      | Publicar no site                                                        | Páginas, Blog, Formulários, Campanhas, Mídias, Site & Branding |
| 5 | Distribuição  | Garantir que o catálogo chega nos canais                                | Portais, Feeds, Integrações                      |
| 6 | Administração | Cuidar do meu tenant                                                    | Pessoas & Acesso, Taxonomias, Auditoria, Preferências |
| 7 | Operação      | (só Super) Cuidar da plataforma                                         | Tenants, Observabilidade, DLQ, Billing global    |

**Nada mais.** Sete linhas na Rail. Tudo o mais é acessado por:
- **Command Palette (⌘K)** — universal.
- **Detail Panel** — abre entidade sem sair da lista.
- **Header** — busca, IA, notificações, tenant, avatar.
- **Quick Actions** — atalhos contextuais na Toolbar.

### 1.2 Header (56 px, permanente)

```
[Logo · Tenant]   [⌘K Busca / Ação universal]        [IA] [🔔] [Plano] [Avatar]
```

Elementos:
- **Tenant switcher** (só Super): impersonate substitui contexto sem
  trocar de shell.
- **Command Palette** ocupa o centro do Header.
- **IA drawer**: sempre 1 clique de distância; recebe contexto da tela
  ativa (rota + entidade selecionada + tenant + permissões).
- **Notificações**: central única (portais com erro, leads novos, IA
  sugestões, versões publicadas).
- **Plano**: chip com plano atual + limite (uso de features).
- **Avatar**: menu de conta, preferências, sair.

### 1.3 Detail Panel (padrão para qualquer entidade)

Modos:
- **Split 40/60**: usado em listas de trabalho (Leads, Imóveis, Páginas).
- **Drawer 640 px**: usado em criação rápida ou entidades leves
  (Taxonomias, Formulários simples, Usuários).
- **Fullscreen**: só em editores densos (Rich text de post/página) — e
  ainda dentro do AppShell (fullscreen do painel, não da rota).

Regra de exceção: uma tela vira "rota-página" só se **não couber em
Detail Panel nem em Drawer** e o usuário fica **mais** do que **30 s**
imerso — hoje, só o editor de página CMS satisfaz isso.

## 2. Matriz de preservação de URLs

**Estratégia adotada:** manter URLs atuais como âncoras técnicas, sem
prefixo novo. A UI não mostra a rota. Redirecionar apenas onde consolidar
telas.

| Área          | URL atual                              | URL Fase 6                             | Ação           |
| ------------- | -------------------------------------- | -------------------------------------- | -------------- |
| Início        | `/admin`                               | `/admin`                               | mantém         |
| Pipeline      | `/admin/leads`                         | `/admin/leads`                         | mantém         |
| Catálogo      | `/admin/imoveis`, `/admin/lancamentos` | mesmos + `/admin/catalogo` (agregado)  | mantém + adiciona |
| Conteúdo      | `/admin/paginas`, `/admin/blog`, `/admin/formularios`, `/admin/campanhas`, `/admin/midias`, `/admin/site` | mantém todos | mantém |
| Distribuição  | `/admin/portais`                       | `/admin/portais`                       | mantém         |
| Administração | `/admin/corretores`, `/admin/equipes`, `/admin/perfis`, `/admin/auditoria`, `/admin/cidades`, `/admin/bairros`, `/admin/origens`, `/admin/motivos` | `/admin/pessoas`, `/admin/taxonomias`, `/admin/auditoria` | consolidar (com redirects 301 client-side) |
| CMS aux       | `/admin/cms-auditoria`                 | vira aba de `/admin/paginas`           | redirect       |
| CMS aux       | `/admin/cms-transferencia`             | vira ação em `/admin/site`             | redirect       |
| Operação      | `/super`, `/super/observabilidade`, `/super/dlq` | mesmas rotas, **mesmo shell**  | mantém, muda shell |

Redirects declarados em `beforeLoad` das rotas antigas (client-side, sem
mudar backend).

## 3. Antes/Depois por tela — ganhos mensuráveis

| Tela                    | Antes (cliques → tarefa) | Depois (cliques → tarefa)      | Ganho    |
| ----------------------- | ------------------------ | ------------------------------ | -------- |
| Ver detalhe de lead     | 2 (linha + modal)        | 1 (linha → Detail Panel)       | −50%     |
| Registrar interação     | 4 (modal → aba → form → salvar) | 2 (Quick Action → salvar) | −50%     |
| Publicar imóvel em portal | 6 (2 áreas diferentes)  | 2 (Quick Action "Distribuir")  | −67%     |
| Criar página do zero    | 4 (menu → botão → template → editar) | 1 (⌘K: "Criar página")   | −75%     |
| Buscar entidade         | ∞ (não existe)           | 1 (⌘K)                         | ∞        |
| Trocar tenant (Super)   | 3                        | 1 (Header)                     | −67%     |
| Editar imóvel           | tira do contexto da lista | mantém contexto (Detail Panel) | qual.    |
| Ver portais com erro    | tela separada, sem alerta| chip no Header + notif         | qual.    |

Ganho médio esperado: **−55% de cliques** nas tarefas top-10 +
**busca universal** onde hoje não existe.

## 4. Roadmap de migração (blocos 1 → 7)

Cada bloco é validado pelo ciclo completo (Diretriz #13) **antes** de
iniciar o próximo. Nenhum bloco altera dois shells ao mesmo tempo.

### Bloco 1 — Shell permanente + Design System congelado
Entrega: `WorkspaceShell` (AppShell), Header 56 px, Navigation Rail 240/64 px,
Command Palette, IA drawer, Detail Panel, NotificationCenter, TenantSwitcher,
Toolbar, Filters, QuickActions. 14 componentes do DS imutáveis. Documentar
em `05-product-guidelines.md`.
Migração: `/admin` (Início) reconstruído dentro do novo shell. Todas as
demais rotas continuam funcionando via `AdminShell` legado até serem
migradas. Regra: **não existe tela nova sem passar pelo novo shell.**

### Bloco 2 — Área Pipeline (Leads)
Migra `/admin/leads` para split 40/60 + timeline + quick actions + IA
"próxima ação".

### Bloco 3 — Área Catálogo (Imóveis + Lançamentos)
Migra `/admin/imoveis*` e `/admin/lancamentos*`. Edição em Detail Panel /
drawer. Quick Action "Distribuir".

### Bloco 4 — Área Conteúdo (CMS unificado)
Fusão de `/admin/site`, `/admin/paginas`, `/admin/formularios`,
`/admin/campanhas`, `/admin/blog`, `/admin/midias`, `/admin/cms-auditoria`,
`/admin/cms-transferencia`. Preview lateral persistente.

### Bloco 5 — Área Distribuição (Portais)
Migra `/admin/portais` + chip no Header + notificações de erro.

### Bloco 6 — Área Administração + Billing Engine
Consolida Pessoas & Acesso, Taxonomias, Auditoria. Adiciona Billing
Engine (tabelas `billing_*` com RLS, feature flags via `has_feature()` /
`within_limit()`, UI CRUD, atribuição de plano, lifecycle). Layer
agnóstica para gateway (Stripe/Paddle/Hotmart/Kirvano/Eduzz/Monetizze/
PerfectPay) — **arquitetura, sem integração** nesta fase.

### Bloco 7 — Área Operação (Super Admin dentro do mesmo shell) + polimento
Migra `/super*` para o **mesmo AppShell**, com Tenant Switcher no Header.
Regressão visual, responsividade tablet/mobile, a11y, performance
percebida, relatório final de homologação.

## 5. Regras de validação por bloco (Diretriz #13)

Ordem obrigatória, **sem pular etapa**:

1. Build passa (`vite build`).
2. Typecheck passa (`tsgo`).
3. Lint passa.
4. Testes automatizados passam (`tests/`).
5. Responsividade verificada (desktop / tablet / mobile).
6. A11y verificada (foco visível, atalhos, ARIA em Command Palette e Panel).
7. Regressão visual (comparação com print anterior).
8. Validação visual manual pelo usuário (screenshots em PR).
9. Relatório técnico do bloco.
10. **Aprovação explícita do usuário → só então inicia o próximo bloco.**

## 6. Guardrails permanentes

- Nenhum bloco pode introduzir um shell novo, um header próprio, ou uma
  Sidebar paralela.
- Nenhum bloco pode adicionar componente novo sem que ele esteja no DS
  (`05-product-guidelines.md`) — se precisar, primeiro atualiza o DS,
  depois usa.
- Nenhum bloco pode expor terminologia técnica ("Módulo X", "Versão Y",
  nome de tabela) na UI.
- Nenhum bloco pode aumentar a contagem de rotas na Navigation Rail
  além de 7.

## 7. Conclusão

Esta arquitetura entrega o objetivo da Fase 6: um único produto SaaS
onde o usuário **não percebe** onde termina o CRM, começa o CMS, ou está
o Billing. Ele vê apenas o Workspace.
