# Fase 6 — Bloco 4 · Plano Executivo

# Product UX Refactor — Consolidação do Workspace único da plataforma

> Este documento define o escopo, a arquitetura e os critérios de
> aceitação do Bloco 4 **antes** de qualquer produção de código.
> Nenhuma implementação será iniciada sem aprovação explícita deste plano.

---

## 1. Objetivo

Consolidar o padrão **Workspace** — hoje comprovado em 100% do contexto
Conteúdo (Bloco 3.1) — como **linguagem operacional única da
plataforma**, eliminando divergências de UX, terminologia e navegação
entre os contextos restantes:

- **Pipeline** (Leads / Atendimentos / Follow-ups)
- **Catálogo** (Imóveis / Lançamentos / Unidades)
- **Distribuição** (Portais / Feeds / Integrações)
- **Administração** (Pessoas & Acesso / Taxonomias / Auditoria / Preferências)
- **Operação** (Super — Tenants / Observabilidade / DLQ / Billing global)

O Bloco 4 **não entrega novas funcionalidades de negócio**. Ele entrega
**uniformidade estrutural** — mesma shell, mesmas primitivas, mesma
ergonomia — para que o usuário perceba o produto como **um único
Workspace**, e não como um conjunto de módulos justapostos.

## 2. Funcionalidades contempladas

Do lado do usuário, as capacidades que o Bloco 4 garante em TODOS os
contextos migrados:

1. **Shell permanente único** (`WorkspaceShell`) com Header 56 px,
   Navigation Rail (7 áreas), Command Palette (⌘K), IA Drawer,
   NotificationCenter, TenantSwitcher.
2. **Padrão Lista + Detail Panel** (split 40/60 ou drawer 640 px)
   substituindo modais e navegação rota-a-rota.
3. **Toolbar padronizada**: busca local + filtros salvos + Quick Actions
   contextuais.
4. **Command Palette universal**: entidades de todos os contextos
   indexadas na mesma pesquisa.
5. **Preview / Timeline / Ações rápidas** conforme a natureza do
   contexto (Pipeline: timeline; Catálogo: preview do card; Distribuição:
   status por portal; Administração: audit trail).
6. **IA contextual**: o drawer recebe rota + entidade selecionada +
   tenant + permissões — igual ao já vigente em Conteúdo.

Nenhum novo campo de dado, nenhum novo relatório, nenhum novo fluxo de
negócio. Se aparecer demanda funcional durante o bloco, ela é
**registrada e adiada** para o bloco temático correspondente.

## 3. Arquitetura proposta

### 3.1 Reuso direto do que foi consolidado no Bloco 3.1

O Bloco 3.1 provou que é possível operar N entidades com **uma única
implementação de Workspace** dirigida por metadados. Bloco 4 promove
esse padrão de "Workspace de Conteúdo" para **Workspace genérico da
plataforma**, extraindo os componentes que ainda vivem em
`src/components/content/`:

```text
src/components/content/            src/components/workspace/
├── ContentWorkspace.tsx     →     EntityWorkspace.tsx
├── ContentList.tsx          →     EntityList.tsx
├── ContentEditor.tsx        →     EntityEditor.tsx
├── ContentPreviewPane.tsx   →     EntityPreviewPane.tsx
├── PublishWorkflow.tsx      →     LifecyclePanel.tsx        (opcional)
├── VersionsPanel.tsx        →     VersionsPanel.tsx         (mantém)
├── session.tsx              →     EntitySessionProvider.tsx
├── entity-registry.ts       →     entity-registry.ts        (movido)
└── adapters/*               →     adapters/*                (movido)
```

O `ContentWorkspace` **permanece** como um wrapper fino que apenas
injeta o descriptor de Conteúdo no `EntityWorkspace` genérico —
mantendo compatibilidade sem regressão.

### 3.2 Descriptor genérico

O `EntityDescriptor` (hoje `ContentDescriptor`) já é agnóstico. Bloco 4
apenas remove nomes ligados a "Content" e generaliza:

```ts
type EntityDescriptor = {
  kind: string;                       // 'lead' | 'imovel' | 'portal' | ...
  labels: { singular: string; plural: string };
  layout: 'split' | 'drawer' | 'fullscreen';
  editorKind: string;                 // resolvido pelo editor-registry
  detailPanel?: string;               // Timeline | Preview | AuditTrail | ...
  adapter: EntityAdapterHook;
  metadata: EntityMetadata;
};
```

Sem `if (kind === …)` em nenhum ponto do Workspace, da Session, do
Editor ou dos painéis de detalhe. Regra herdada do Bloco 3.1.

### 3.3 Registros por área (novos)

Cada área ganha um arquivo de descriptors sob
`src/components/workspace/entities/`:

- `pipeline.ts` — `lead`, `atendimento`, `followup`
- `catalog.ts` — `imovel`, `lancamento`, `unidade`
- `distribution.ts` — `portal`, `feed`, `integracao`
- `admin.ts` — `pessoa`, `equipe`, `perfil`, `taxonomia`, `auditoria`
- `super.ts` — `tenant`, `dlqItem`, `billingPlan`

Cada descriptor traz seu **adapter** (usa server functions existentes)
e sua **metadata** (colunas, filtros, quick actions). Nenhum dado novo
no banco.

### 3.4 Rotas

Preserva URLs conforme matriz do documento 04. Cada rota vira uma linha
de três componentes:

```tsx
export const Route = createFileRoute('/_authenticated/admin/leads')({
  validateSearch: entitySearchSchema,
  component: () => <EntityWorkspace descriptor={ENTITIES.lead} />,
});
```

Consolidações (Administração):

- `/admin/corretores`, `/admin/equipes`, `/admin/perfis` → `/admin/pessoas` (com abas internas)
- `/admin/cidades`, `/admin/bairros`, `/admin/origens`, `/admin/motivos` → `/admin/taxonomias`

Redirects declarados em `beforeLoad`, client-side.

## 4. Impacto esperado na experiência do usuário

- **−55% de cliques** nas 10 tarefas críticas (meta herdada do doc 04).
- **Zero mudança de shell** ao navegar entre áreas — mesmo Header,
  mesma Rail, mesmo Command Palette, mesmo Detail Panel.
- **Busca universal** funcionando em Pipeline, Catálogo, Distribuição
  e Administração (hoje só existe em Conteúdo).
- **Terminologia consistente**: mesmo texto para Publicar / Arquivar /
  Duplicar / Versões / Auditoria em todos os contextos onde a operação
  existe.
- **IA contextual em todo lugar** — não só no CMS.

## 5. Componentes criados ou reutilizados

### Reutilizados (movidos e generalizados)

- `ContentWorkspace` → `EntityWorkspace`
- `ContentList` → `EntityList`
- `ContentEditor` → `EntityEditor`
- `ContentPreviewPane` → `EntityPreviewPane`
- `ContentSessionProvider` → `EntitySessionProvider`
- `VersionsPanel`, `SeoPanel`, `PublishWorkflow`, `hooks/useAutosave`
- `entity-registry`, `adapters/*`, `types.ts`, `search-schema.ts`

### Criados (novos, dentro do DS)

- `TimelinePanel` (Pipeline)
- `AuditTrailPanel` (Administração / Super)
- `IntegrationStatusPanel` (Distribuição)
- `TabbedWorkspace` — wrapper para áreas com subentidades relacionadas
  (Pessoas, Taxonomias)
- 5 arquivos de descriptors por área (pipeline / catalog / distribution
  / admin / super)

### Proibido criar

- Novo shell, nova Sidebar, novo Header, novo esquema de rotas.
- Novo componente fora do Design System.
- Novo padrão de modal / formulário / lista.

## 6. Dependências dos blocos anteriores

- **Bloco 0 / 0.1** — Shell (`WorkspaceShell`, Header, Rail, Command
  Palette, IA Drawer) já operacional. **OK**.
- **Bloco 3** — Editor por metadados, adapters, sessão, autosave,
  versionamento. **OK**.
- **Bloco 3.1** — 100% do Conteúdo migrado, zero coexistência, zero
  parallel flows, `if (kind === …)` = 0 no núcleo. **OK — encerrado**.
- **Product UX Contract** (`docs/fase6/09-product-ux-contract.md`) —
  **dependência obrigatória e normativa**. Documento que define os
  comportamentos obrigatórios da plataforma (Vision, Continuity, Memory,
  Zero Context Reset, Workspace Tokens, Progressive Workspace,
  Consistency Rules, Navigation Contract, Performance Contract,
  Anti-Patterns, UX DoD). **Todas as etapas do Bloco 4 deverão respeitar
  este contrato**; qualquer conflito entre este Plano Executivo e o
  contrato é resolvido a favor do contrato.
- **Product UX Compliance Checklist**
  (`docs/fase6/09-product-ux-compliance-checklist.md`) — **instrumento
  oficial de auditoria** da experiência do produto durante todo o
  Bloco 4. Transforma o UX Contract em processo objetivo de validação
  (PASS/FAIL por item, com evidência). **Nenhuma etapa (4.0 → 4.5)
  poderá ser considerada concluída sem este checklist integralmente
  preenchido**, acompanhado das evidências objetivas que comprovem a
  aderência ao Product UX Contract. Deve ser copiado por etapa como
  `09-bloco-4-etapa-<n>-ux-checklist.md`, preenchido durante a
  implementação e reauditado no encerramento.

Nenhuma dependência de infraestrutura externa, migration de banco,
nova secret ou nova conexão.

## 7. Riscos arquiteturais identificados

| # | Risco                                                                          | Severidade | Mitigação                                                                                            |
|---|--------------------------------------------------------------------------------|-----------|------------------------------------------------------------------------------------------------------|
| 1 | Renomear `ContentWorkspace` → `EntityWorkspace` quebra imports em N rotas      | Média     | Manter `ContentWorkspace` como re-export/wrapper durante o bloco; remover apenas na sub-etapa final. |
| 2 | Descriptors de Pipeline/Catálogo forçarem `if (kind === …)` no núcleo genérico | Alta      | Validar cada descriptor contra o mesmo lint semântico do Bloco 3.1 antes de aceitar merge.          |
| 3 | Consolidação de rotas Admin quebrar deep-links salvos por usuários             | Média     | Redirects 301 client-side declarados em `beforeLoad`, com testes por rota antiga.                    |
| 4 | Tentação de adicionar features durante a migração                              | Alta      | DoD proíbe. Qualquer demanda vira issue no bloco temático (5/6/7).                                   |
| 5 | Adapters de Pipeline/Catálogo colidirem com server functions instáveis         | Média     | Adapters são camada fina — se a server function falta, o descriptor entra como `ready: false` e é tratado como exceção documentada, nunca oculto. |
| 6 | Detail Panel de Distribuição precisar de realtime (status portal)              | Baixa     | Reusar hook já existente do NotificationCenter; se não bastar, escopo vira "read-only + refresh manual" e é anotado como Architectural Exception. |
| 7 | Regressão visual em telas migradas                                             | Média     | Screenshot comparativo por rota, exigido no relatório final.                                         |

## 8. Definition of Done (critérios objetivos de conclusão)

O Bloco 4 só pode ser encerrado quando **TODOS** os itens abaixo forem
verdadeiros e evidenciados por auditoria:

### 8.1 Cobertura estrutural

- [ ] 100% das rotas de Pipeline, Catálogo, Distribuição e Administração
      renderizando `EntityWorkspace` (ou o wrapper compatível).
- [ ] 0 rotas de admin utilizando shell antigo (`AdminShell` legado).
- [ ] 0 componentes de lista/formulário fora de `src/components/workspace/`
      referenciados diretamente por rotas dessas áreas.

### 8.2 Consistência arquitetural

- [ ] 0 ocorrências de `if (kind === …)` ou `switch (kind)` em:
      `EntityWorkspace`, `EntitySessionProvider`, `EntityEditor`,
      `EntityList`, `EntityPreviewPane`.
- [ ] 0 imports diretos de `*.functions.ts` fora de `adapters/*`.
- [ ] 100% dos descriptors novos com adapter + metadata + editorKind
      preenchidos; 0 `ready: false` não documentados.

### 8.3 Navegação e busca

- [ ] Command Palette indexando **todas** as entidades das áreas
      migradas, com resultados clicáveis abrindo Detail Panel na rota
      correta.
- [ ] Deep-links legados (`/admin/corretores`, `/admin/cidades`, etc.)
      redirecionando para as novas URLs consolidadas.

### 8.4 Qualidade e regressão

- [ ] `bun run build` OK.
- [ ] `tsgo --noEmit` = 0 erros.
- [ ] Lint OK.
- [ ] Testes automatizados existentes passando.
- [ ] Screenshots comparativos (antes × depois) para cada rota migrada,
      anexos ao relatório final.
- [ ] Responsividade verificada (desktop / tablet / mobile) nas rotas
      migradas.
- [ ] A11y: foco visível, atalhos de teclado, ARIA em Detail Panel e
      Command Palette validados.

### 8.5 Documentação

- [ ] `docs/fase6/09-bloco-4-relatorio-tecnico.md` — o que mudou, onde,
      por quê.
- [ ] `docs/fase6/09-bloco-4-ux-evolution.md` — antes × depois por área,
      com métricas de cliques.
- [ ] `docs/fase6/09-bloco-4-auditoria-final.md` — matriz de cobertura,
      indicadores, exceções arquiteturais (se houver, no formato
      read-only do Bloco 3.1).

### 8.6 Aderência ao Product UX Contract

Todos os critérios do §11 (UX Definition of Done) do
`docs/fase6/09-product-ux-contract.md` são condição obrigatória de
encerramento do Bloco 4, **em adição** aos critérios técnicos acima.
Cada etapa (4.0 → 4.5) deve apresentar, em seu DoD parcial, uma
checagem explícita de aderência ao contrato — incluindo Vision Test
(§1), Workspace Memory (§3), Zero Context Reset (§4), Primitivas (§5),
Consistency Rules (§7), Navigation Contract (§8), Performance Contract
(§9) e ausência de Anti-Patterns (§10).

## 9. Estratégia de migração

Substituição incremental, uma área por vez, sem coexistência prolongada.
Cada sub-etapa segue **o mesmo ciclo da Diretriz #13** e só encerra
quando o DoD parcial estiver 100% verde.

### Etapa 4.0 — Extração do núcleo genérico (pré-requisito)

1. Mover `src/components/content/{Workspace,List,Editor,Preview,Session,…}`
   para `src/components/workspace/entities/*` renomeando para `Entity*`.
2. Manter `src/components/content/ContentWorkspace.tsx` como
   re-export/wrapper: `export const ContentWorkspace = (p) =>
   <EntityWorkspace {...p} />`. Zero regressão em Conteúdo.
3. Typecheck + build + smoke-test de todas as rotas de Conteúdo.

**Gate:** Conteúdo 100% funcional pós-extração. Se não, rollback.

### Etapa 4.1 — Pipeline (Leads)

- Descriptors: `lead`, `atendimento`, `followup`.
- Painel de detalhe: `TimelinePanel`.
- Migrar `/admin/leads` (e sub-rotas) para `EntityWorkspace`.
- Redirects para deep-links legados.

**Gate parcial:** rotas antigas removidas ou redirecionadas; DoD 8.1/8.2
verde para Pipeline.

### Etapa 4.2 — Catálogo (Imóveis + Lançamentos)

- Descriptors: `imovel`, `lancamento`, `unidade`.
- Painel de detalhe: `EntityPreviewPane` (card do imóvel) + Quick Action
  "Distribuir".
- Migrar `/admin/imoveis*` e `/admin/lancamentos*`.

**Gate parcial:** DoD 8.1/8.2 verde para Catálogo.

### Etapa 4.3 — Distribuição (Portais)

- Descriptors: `portal`, `feed`, `integracao`.
- Painel de detalhe: `IntegrationStatusPanel`.
- Chip no Header + notificação de erro reaproveitando `NotificationCenter`.

**Gate parcial:** DoD 8.1/8.2 verde para Distribuição.

### Etapa 4.4 — Administração

- Descriptors: `pessoa`, `equipe`, `perfil`, `taxonomia`, `auditoria`.
- Consolidação de rotas: `/admin/pessoas`, `/admin/taxonomias`,
  `/admin/auditoria` (com `TabbedWorkspace`).
- Painel de detalhe: `AuditTrailPanel` onde aplicável.
- Redirects declarados para todas as rotas antigas.

**Gate parcial:** DoD 8.1/8.2 verde para Administração.

### Etapa 4.5 — Encerramento (Super fica para o Bloco 5)

- Remoção do wrapper `ContentWorkspace` se e somente se todos os
  imports diretos tiverem sido migrados.
- Auditoria arquitetural final (8.1 a 8.5).
- Relatórios técnicos e de UX.

**Gate final:** DoD completo verde → aprovação explícita do usuário.

### Regra de sequenciamento

Nenhuma etapa começa antes da anterior ser validada. Nenhuma etapa pode
ser fundida com outra. Em caso de bloqueio duro numa etapa, o Bloco 4 é
**pausado** e o usuário é chamado — não há atalho.

## 10. O que este bloco NÃO faz

Para evitar escopo criativo:

- Não migra Operação (Super) — vai para o Bloco 5.
- Não implementa Billing Engine — vai para o Bloco 6.
- Não altera nenhum schema do banco.
- Não introduz novas server functions de negócio.
- Não cria novas telas fora do padrão Workspace.
- Não altera terminologia ou copy fora do necessário para consistência.

---

## Aprovação necessária

Este plano é o **contrato de escopo** do Bloco 4 e opera em conjunto
com o **Product UX Contract** (`docs/fase6/09-product-ux-contract.md`),
que é o **contrato de experiência** e prevalece em caso de conflito.

### Critério de início da Etapa 4.0

A Etapa 4.0 só pode ser iniciada após:

1. Revisão e aprovação explícita deste Plano Executivo revisado.
2. Criação e aprovação do `docs/fase6/09-product-ux-contract.md`.
3. Validação de que **todas** as etapas do Bloco 4 (4.0 → 4.5) estão
   aderentes ao contrato — verificação registrada no início de cada
   etapa e reauditada no encerramento.

Após aprovação, a Etapa 4.0 (extração do núcleo genérico) inicia como
primeira entrega verificável, e cada etapa seguinte só começa com o
gate parcial anterior fechado **e** com a checagem de aderência ao
Product UX Contract aprovada.
