# Fase 6 — Bloco 0.1 · Operacionalização da Arquitetura de UX

> Este documento converte os princípios do Bloco 0 em **regras
> determinísticas de implementação**. Nenhuma decisão de UX/código da
> Fase 6 pode ser interpretativa. Se um item de código conflita com
> qualquer regra aqui, o código está errado.
>
> Ordem de precedência: **00-principios > 05-guidelines > este doc > DS > código.**
>
> Este documento **não contém código de produto**. Apenas especificação.

---

## 1. Hierarquia oficial obrigatória

Estrutura **única** do produto, sem variações:

```
Workspace  (nível global — AppShell permanente)
└── Contexto  (nível primário de navegação — Nav Rail)
    └── Entidade  (nível operacional — listas, cards, itens)
        └── Detail Panel  (nível de interação profunda)
```

### Regras obrigatórias
1. **Contexto** é sempre navegação principal (Nav Rail). Nunca escondido em menu, dropdown ou tab.
2. **Entidade nunca aparece como item de navegação primária.** Entidade vive dentro de um contexto.
3. Toda entidade abre por:
   - **Detail Panel** (padrão), ou
   - **Drawer 640 px** (exceção formal, casos leves).
4. **Proibido** criar nova rota-página para uma entidade quando Detail Panel for viável.
5. Rota-página só é permitida sob a exceção formal do doc 05 §3.1 (editor denso, imersão > 30 s), documentada em ADR no PR.

---

## 2. Estado global de UI — persistência obrigatória

Todo estado abaixo é **por usuário** e sobrevive a reload/logout dentro do mesmo tenant.

### 2.1 Sidebar / Nav Rail
- Estados: `expanded` (240 px) | `collapsed` (64 px).
- Persistência: `localStorage` (`ui.rail.state`) **+** sincronizado no perfil do usuário (`profiles.ui_prefs.rail_state`).
- Regra: **nunca resetar em reload.** Restaura antes do primeiro paint (evita layout shift).

### 2.2 Contexto ativo
- Persistente por usuário (`profiles.ui_prefs.last_context`).
- Ao autenticar, restaura último contexto acessado.
- Fallback padrão: **Início**.

### 2.3 Filtros
- Persistência por (usuário × contexto).
- Tabela dedicada `user_views` (nome, contexto, filtros JSON, `is_default`, `is_shared`).
- Filtros ativos sobrevivem à navegação intra-contexto.

### 2.4 Tabelas
- Densidade persistente por (usuário × contexto):
  - `compact` (default),
  - `comfortable`,
  - `spacious`.
- Persistência: `profiles.ui_prefs.table_density[<contexto>]`.

### 2.5 Detail Panel
- Estado `open/closed` persistente por sessão (não sobrevive a logout).
- **Apenas 1 Detail Panel ativo por contexto.** Sem stack.
- Abrir novo item **substitui** o anterior (com `←/→` para navegar entre itens da lista).
- URL reflete entidade aberta via `?item=<id>` (deep-linkable, sem trocar de rota).

---

## 3. Fluxos críticos obrigatórios (base de validação)

Todos os fluxos abaixo devem ser executáveis **sem sair do AppShell** e **sem recarregar página**.

### CRM
- Criar Lead
- Qualificar Lead
- Converter Lead em Proposta
- Marcar Lead como Perdido

### CMS
- Criar Página
- Editar Página
- Publicar Página
- Criar Campanha

### Imóveis
- Criar Imóvel
- Publicar Imóvel
- Associar Portais

### Super Admin
- Criar Tenant
- Gerenciar Planos
- Impersonar Tenant

### Sistema
- Busca global (⌘K)
- Executar ação global (⌘K)
- Criar entidade via Command Palette

Cada fluxo é caso de teste obrigatório em `tests/` antes do fechamento do bloco correspondente.

---

## 4. Detail Panel — especificação obrigatória

### Comportamento técnico fechado
- **Posição:** lado direito (right panel).
- **Largura desktop (≥ 1280 px):** 40% do viewport (mín 480 px, máx 720 px).
- **Tablet (768–1279 px):** drawer 80% do viewport.
- **Mobile (< 768 px):** drawer full-screen.
- **Nunca substitui navegação global.** Header, Nav Rail e Toolbar permanecem visíveis (exceto mobile).

### Regras
- 1 Detail Panel ativo por contexto. Abrir novo item substitui.
- Atalhos obrigatórios: `Esc` fecha · `←/→` navega itens · `⌘S` salva · `⌘Enter` confirma ação primária.
- URL: `?item=<id>` (deep-link).
- Skeleton em < 100 ms; dado remoto entra depois.

### Exceções (rota-página)
Permitido **apenas** em:
- Formulário multi-etapa complexo (wizard > 4 passos).
- Configuração sistêmica profunda (billing, integrações críticas).
- Editor denso (rich text, > 30 s de imersão).

Toda exceção exige ADR no PR.

---

## 5. Command Palette (⌘K) — inventário operacional mínimo

Obrigatório no lançamento do Bloco 1.

### Navegação
- ir para Início
- ir para Pipeline
- ir para Catálogo
- ir para Conteúdo
- ir para Distribuição
- ir para Administração
- ir para Operação (Super)

### Criação
- novo lead
- novo imóvel
- nova página
- nova campanha
- novo tenant (Super)
- novo plano (Super)

### Ações globais
- publicar site
- exportar CMS
- importar CMS
- alterar tenant
- ativar modo impersonação

### Busca global
- leads
- imóveis
- páginas
- campanhas
- tenants (Super)

### Regra de expansão
Toda nova ação de UI **deve** ser registrada no Palette no mesmo PR que a introduz. Sem exceção.

---

## 6. IA contextual — contrato obrigatório

Toda tela injeta, sem exceção, o payload:

```json
{
  "tenant_id": "",
  "user_id": "",
  "contexto": "",
  "entidade_atual": "",
  "permissoes": [],
  "historico_acao": [],
  "viewport": "desktop|tablet|mobile"
}
```

### Capacidades da IA
- Ler contexto.
- Sugerir ações.
- Gerar conteúdo.
- **Executar ações não destrutivas** diretamente (via Quick Actions).
- **Ações destrutivas** (delete, publish, unassign, impersonate) exigem **confirmação explícita** do usuário.

Modelo default: `google/gemini-3-flash-preview` via Lovable AI Gateway.
Chave `LOVABLE_API_KEY` nunca no client.
Histórico persistido por (usuário × tenant).

---

## 7. Design System — regras imutáveis

- **14 componentes oficiais** (doc 05 §6). Nenhum componente novo em telas sem passar antes pelo DS.
- Novo componente deve **nascer no DS**, com storybook e teste de a11y, antes de ser usado em produto.
- **Proibido no admin:**
  - Hero decorativo.
  - Layout decorativo (cards ornamentais, ilustrações grandes, banners).
  - Densidade baixa por escolha estética.
- Layout **sempre orientado a ação**, nunca a apresentação.
- Cores hardcoded proibidas. Só tokens semânticos de `src/styles.css`.

---

## 8. Critérios de aceitação (obrigatório por bloco)

Nenhum bloco da Fase 6 avança sem validar **todos** os itens:

- [ ] Hierarquia Workspace → Contexto → Entidade → Detail Panel respeitada.
- [ ] Persistência de estado (Rail, contexto, filtros, densidade, panel) funcional e verificada.
- [ ] Todos os fluxos críticos do bloco executáveis sem sair do AppShell.
- [ ] Command Palette navega, cria e age em tudo do bloco.
- [ ] IA recebe payload contextual completo em toda tela do bloco.
- [ ] Densidade e aproveitamento de tela auditados (nota ≥ 9,0 no doc 03).
- [ ] Build, typecheck, lint, testes, a11y, responsividade validados (doc 04 §5).
- [ ] Aprovação explícita do usuário.

---

## 9. Entregável

Este arquivo: `docs/fase6/06-bloco-0-1-operacionalizacao.md`.

Estrutura seguida:
1. Hierarquia oficial
2. Estado global da UI
3. Fluxos críticos
4. Detail Panel spec
5. Command Palette spec
6. IA contextual contract
7. Design System rules
8. Critérios de aceitação

---

## 10. Regra final

Somente após **aprovação explícita** deste documento, o **Bloco 1 (AppShell + Design System)** pode ser iniciado.

Qualquer implementação iniciada antes dessa aprovação será rejeitada em revisão, independentemente de qualidade técnica.
