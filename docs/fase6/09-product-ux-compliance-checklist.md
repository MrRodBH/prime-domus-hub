# Fase 6 — Product UX Compliance Checklist

> Instrumento **oficial e obrigatório** de auditoria da experiência do
> produto durante todo o Bloco 4 (Product UX Refactor).
>
> Este checklist opera em conjunto com:
> - `docs/fase6/09-product-ux-contract.md` (contrato normativo)
> - `docs/fase6/09-bloco-4-plano-executivo.md` (contrato de escopo)
>
> **Nenhuma etapa do Bloco 4 (4.0 → 4.5) pode ser encerrada sem este
> checklist integralmente preenchido**, com evidências objetivas
> comprovando aderência ao Product UX Contract. Deve ser usado durante
> a implementação (autoavaliação contínua) e reauditado no encerramento
> de cada etapa.

---

## Como usar

1. Copiar este arquivo por etapa como
   `docs/fase6/09-bloco-4-etapa-<n>-ux-checklist.md`.
2. Preencher **cada linha** com `PASS`, `FAIL` ou `N/A` acompanhado de
   evidência (arquivo, commit, screenshot, comando executado, print de
   busca semântica, etc.). Nunca deixar em branco.
3. Qualquer `FAIL` bloqueia o encerramento da etapa. Qualquer desvio
   aceito conscientemente deve ser registrado na seção **Architectural
   Exceptions** com justificativa e plano de absorção (formato
   read-only do Bloco 3.1).
4. Consolidar o **Workspace Score** ao final.

Metadados obrigatórios no topo da cópia:

```
Etapa: 4.x — <nome>
Data:  YYYY-MM-DD
Autor: <responsável>
Escopo auditado: <áreas / rotas / entidades>
```

---

## 1. Product Vision Compliance

| # | Item | Resultado | Evidência / Justificativa |
|---|------|-----------|---------------------------|
| 1.1 | O usuário continua percebendo **um único Workspace** ao navegar entre áreas? | PASS/FAIL | |
| 1.2 | Existe alguma sensação de "mudança de produto" ao alternar áreas? (esperado: **não**) | PASS/FAIL | |
| 1.3 | O **Vision Test** do §1 do UX Contract foi executado nesta etapa? | PASS/FAIL | |
| 1.4 | Resultado do Vision Test aprovado? | PASS/FAIL | |

Resumo desta seção: **PASS/FAIL** — justificativa obrigatória.

---

## 2. Workspace Continuity Compliance

Validar que os elementos permanentes permanecem **únicos e
compartilhados** — nenhuma área implementa versão própria.

| # | Elemento | Único? | Evidência |
|---|----------|--------|-----------|
| 2.1 | `WorkspaceShell` | PASS/FAIL | |
| 2.2 | `AppHeader` | PASS/FAIL | |
| 2.3 | `NavigationRail` | PASS/FAIL | |
| 2.4 | `CommandPalette` | PASS/FAIL | |
| 2.5 | `DetailPanel` | PASS/FAIL | |
| 2.6 | `AiDrawer` contextual (rota + entidade + tenant + permissões) | PASS/FAIL | |
| 2.7 | `NotificationCenter` compartilhado | PASS/FAIL | |

**Áreas com comportamento próprio detectado?** Se sim, registrar em
**Architectural Exceptions** imediatamente.

---

## 3. Workspace Memory Compliance

Validar preservação de estado ao navegar entre entidades e retornar.

```
Filtro................PASS/FAIL
Pesquisa..............PASS/FAIL
Ordenação.............PASS/FAIL
Paginação.............PASS/FAIL
Scroll................PASS/FAIL
Item selecionado......PASS/FAIL
Largura dos painéis...PASS/FAIL
Estado Detail Panel...PASS/FAIL
Estado Inspector......PASS/FAIL
Estado IA.............PASS/FAIL
Histórico Workspace...PASS/FAIL
```

Evidência global (URL search-params, `ui-store`, screenshots antes/depois):

---

## 4. Zero Context Reset Compliance

Executar o roteiro de navegação:

```
Lead → Imóvel → Portal → Conteúdo → Lead
```

| # | Verificação | Resultado | Evidência |
|---|-------------|-----------|-----------|
| 4.1 | Workspace permaneceu montado (sem remount)? | PASS/FAIL | |
| 4.2 | Shell permaneceu montado? | PASS/FAIL | |
| 4.3 | Houve reconstrução completa? (esperado: **não**) | PASS/FAIL | |
| 4.4 | Houve reload? (esperado: **não**) | PASS/FAIL | |
| 4.5 | Houve flash / FOUC? (esperado: **não**) | PASS/FAIL | |
| 4.6 | Houve perda de contexto? (esperado: **não**) | PASS/FAIL | |
| 4.7 | Houve perda de seleção? (esperado: **não**) | PASS/FAIL | |

Metodologia (React DevTools Profiler, `console.log` em `useEffect(..., [])`, screenshots) — descrever.

---

## 5. Workspace Tokens Compliance

Todo painel utilizado nesta etapa pertence às **primitivas** do §5 do
UX Contract:

| Token | Usado? | Onde | Conforme? |
|-------|--------|------|-----------|
| PrimaryPanel | | | PASS/FAIL |
| SecondaryPanel | | | PASS/FAIL |
| ActivityPanel (Timeline / AuditTrail) | | | PASS/FAIL |
| InspectorPanel | | | PASS/FAIL |
| AssistantPanel | | | PASS/FAIL |
| LifecyclePanel | | | PASS/FAIL |
| ActionsPanel | | | PASS/FAIL |

**Novo painel criado fora dos tokens?** → registrar em **Architectural
Exceptions** com justificativa e plano de absorção.

---

## 6. Progressive Workspace Compliance

| # | Item | Resultado | Evidência |
|---|------|-----------|-----------|
| 6.1 | Ausência de spinner central bloqueante | PASS/FAIL | |
| 6.2 | Lazy loading de painéis não críticos | PASS/FAIL | |
| 6.3 | Optimistic selection ao clicar item na lista | PASS/FAIL | |
| 6.4 | Prefetch (hover / rota adjacente) | PASS/FAIL | |
| 6.5 | Carregamento localizado (skeleton por painel) | PASS/FAIL | |
| 6.6 | Carregamento progressivo (dados críticos primeiro) | PASS/FAIL | |

---

## 7. UX Consistency Compliance

| # | Item | Resultado | Evidência |
|---|------|-----------|-----------|
| 7.1 | Animações (duração, easing) consistentes com DS | PASS/FAIL | |
| 7.2 | Atalhos de teclado consistentes (⌘K, Esc, Enter, ↑↓) | PASS/FAIL | |
| 7.3 | Estados de carregamento uniformes | PASS/FAIL | |
| 7.4 | Estados vazios uniformes | PASS/FAIL | |
| 7.5 | Mensagens / toasts padronizados | PASS/FAIL | |
| 7.6 | Hierarquia visual (tipografia, espaçamento) | PASS/FAIL | |
| 7.7 | Componentes 100% do Design System | PASS/FAIL | |

Divergências → **Architectural Exceptions**.

---

## 8. Anti-Patterns Compliance

Auditoria por evidência objetiva (busca no código, lint semântico,
revisão manual). Meta: **0 ocorrências** em cada linha.

| # | Anti-pattern | Ocorrências | Metodologia | Evidência |
|---|--------------|-------------|-------------|-----------|
| 8.1 | Workspace específico por entidade | 0 | | |
| 8.2 | Header específico por área | 0 | | |
| 8.3 | Sidebar específica por área | 0 | | |
| 8.4 | Fluxo exclusivo (fora do padrão Workspace) | 0 | | |
| 8.5 | Command Palette específica | 0 | | |
| 8.6 | Detail Panel incompatível com o padrão | 0 | | |
| 8.7 | `if (kind === …)` no núcleo genérico | 0 | `rg "kind === "` em `workspace/` | |
| 8.8 | `switch (kind)` no núcleo genérico | 0 | `rg "switch \(.*kind"` | |
| 8.9 | Import direto de `*.functions.ts` fora de `adapters/*` | 0 | `rg "\.functions'"` filtrado | |
| 8.10 | Spinner central bloqueante | 0 | | |
| 8.11 | Reload completo em navegação interna | 0 | | |
| 8.12 | Componente fora do Design System | 0 | | |

Se qualquer linha > 0 sem estar em Exceptions aprovadas: **FAIL**.

---

## 9. Performance Compliance

Metas do §9 do UX Contract. Reportar **número** e **percepção**.

| # | Interação | Meta | Medido | Percepção | Resultado |
|---|-----------|------|--------|-----------|-----------|
| 9.1 | Abertura do Workspace | | | | PASS/FAIL |
| 9.2 | Troca de contexto (área → área) | | | | PASS/FAIL |
| 9.3 | Seleção de item na lista | | | | PASS/FAIL |
| 9.4 | Atualização localizada (autosave / mutação) | | | | PASS/FAIL |
| 9.5 | Prefetch (hover → abertura) | | | | PASS/FAIL |
| 9.6 | Autosave (debounce, feedback, não bloqueante) | | | | PASS/FAIL |

---

## 10. UX Regression Test

Roteiro **idêntico** em todas as etapas do Bloco 4. Executar do início
ao fim, sem atalhos, sem recarregar a página.

| # | Passo | Resultado | Observação |
|---|-------|-----------|------------|
| 10.1 | Abrir entidade (área da etapa) | PASS/FAIL | |
| 10.2 | Pesquisar | PASS/FAIL | |
| 10.3 | Aplicar filtros | PASS/FAIL | |
| 10.4 | Selecionar item | PASS/FAIL | |
| 10.5 | Editar | PASS/FAIL | |
| 10.6 | Salvar (autosave ou explícito) | PASS/FAIL | |
| 10.7 | Abrir Detail Panel | PASS/FAIL | |
| 10.8 | Abrir IA | PASS/FAIL | |
| 10.9 | Utilizar Command Palette (⌘K) | PASS/FAIL | |
| 10.10 | Navegar para outra área | PASS/FAIL | |
| 10.11 | Retornar à área anterior | PASS/FAIL | |
| 10.12 | Verificar preservação do contexto (filtros, seleção, scroll, IA) | PASS/FAIL | |

Resultado consolidado do roteiro: **PASS/FAIL**.

---

## 11. Architectural Exceptions

(Formato read-only do Bloco 3.1. Vazio quando não houver.)

| # | Local | Descrição | Motivo | Impacto | Plano de absorção |
|---|-------|-----------|--------|---------|-------------------|
|   |       |           |        |         |                   |

Garantias arquiteturais obrigatórias por exceção: sem fluxo paralelo,
sem persistência divergente, sem editor independente, sem múltiplos
pipelines, sem quebra do Workspace First, sem quebra do metadata-driven.

---

## 12. Workspace Score (resumo consolidado)

```
Workspace Coverage................___%
UX Compliance.....................___%
Workspace Memory..................___%
Continuity........................___%
Workspace Tokens..................___%
Anti-Patterns.....................___   (meta: 0)
Architectural Exceptions..........___   (justificadas na §11)
UX Regression.....................PASS/FAIL
```

Critério de encerramento da etapa:

- Todas as seções (1 a 10) com resultado **PASS**.
- Seção 8 com **0 ocorrências** não justificadas.
- Seção 11 apenas com exceções **read-only** aprovadas.
- Workspace Score 100% (ou 0, quando aplicável).

---

## Integração com o Bloco 4

Este checklist é **obrigatório** para as etapas:

- 4.0 — Extração do núcleo genérico
- 4.1 — Pipeline
- 4.2 — Catálogo
- 4.3 — Distribuição
- 4.4 — Administração
- 4.5 — Encerramento

Cada relatório de etapa deve conter, **além** do relatório técnico:

1. DoD Técnico (Plano Executivo §8).
2. Aderência ao Product UX Contract (§11 do contrato).
3. **Product UX Compliance Checklist** (este documento) integralmente preenchido.
4. Architectural Exceptions (quando existirem).
5. Workspace Score consolidado.

Sem esses cinco artefatos, a etapa **não pode** ser considerada encerrada.
