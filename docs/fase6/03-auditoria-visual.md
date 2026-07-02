# Fase 6 — Bloco 0 · Documento 3
# Auditoria Visual

> Método: cada tela recebe nota **0–10** em três eixos:
> - **Hierarquia** (o olho encontra a ação principal em ≤ 1 s?)
> - **Densidade** (informação por pixel é adequada, sem ruído nem vazio inútil?)
> - **Identidade SaaS premium** (parece Notion/Linear/HubSpot ou parece admin genérico?)
>
> Nota final = média aritmética. Meta Fase 6: **≥ 9,0** em todas.

## 1. Referências visuais obrigatórias
- **Linear** — densidade, tipografia, atalhos, Command Palette.
- **Notion** — Detail Panel, sidebar limpa, foco na tarefa.
- **HubSpot** — pipeline, dashboards executivos.
- **ClickUp** — quick actions, múltiplas visões.
- **Figma** — shell permanente, painéis laterais persistentes.

## 2. Notas por tela (estado atual)

| Tela                          | Hier. | Dens. | Ident. | Média | Estado |
| ----------------------------- | ----- | ----- | ------ | ----- | ------ |
| `/admin` (dashboard)          | 5     | 4     | 4      | 4.3   | ruim   |
| `/admin/leads`                | 6     | 6     | 5      | 5.7   | fraco  |
| `/admin/imoveis`              | 6     | 6     | 5      | 5.7   | fraco  |
| `/admin/imoveis/$id`          | 4     | 3     | 4      | 3.7   | ruim   |
| `/admin/lancamentos/$id`      | 3     | 3     | 3      | 3.0   | ruim   |
| `/admin/site`                 | 5     | 5     | 4      | 4.7   | ruim   |
| `/admin/paginas`              | 6     | 5     | 4      | 5.0   | fraco  |
| `/admin/paginas/$id`          | 5     | 4     | 4      | 4.3   | ruim   |
| `/admin/formularios`          | 6     | 5     | 4      | 5.0   | fraco  |
| `/admin/campanhas`            | 6     | 5     | 4      | 5.0   | fraco  |
| `/admin/blog`                 | 7     | 6     | 5      | 6.0   | ok−    |
| `/admin/midias`               | 5     | 5     | 5      | 5.0   | fraco  |
| `/admin/portais`              | 5     | 4     | 4      | 4.3   | ruim   |
| `/admin/corretores`           | 6     | 5     | 5      | 5.3   | fraco  |
| `/admin/equipes`              | 6     | 5     | 5      | 5.3   | fraco  |
| `/admin/perfis`               | 5     | 4     | 4      | 4.3   | ruim   |
| `/admin/auditoria`            | 5     | 5     | 4      | 4.7   | ruim   |
| `/admin/cms-auditoria`        | 5     | 5     | 4      | 4.7   | ruim   |
| `/admin/cms-transferencia`    | 4     | 4     | 3      | 3.7   | ruim   |
| Taxonomias (cidades/bairros/…)| 5     | 4     | 3      | 4.0   | ruim   |
| `/super`                      | 5     | 4     | 4      | 4.3   | ruim   |
| `/super/observabilidade`      | 5     | 5     | 4      | 4.7   | ruim   |
| `/super/dlq`                  | 5     | 4     | 4      | 4.3   | ruim   |

**Média global atual: 4,7 / 10.**

## 3. Heatmap de inconsistências

### 3.1 Entre CRM / CMS / Super
| Elemento              | CRM (leads/imóveis) | CMS (páginas/site) | Super          | Consistente? |
| --------------------- | ------------------- | ------------------ | -------------- | ------------ |
| Shell                 | AdminShell          | AdminShell         | **Outro**      | ❌           |
| Header                | vazio               | vazio              | próprio        | ❌           |
| Sidebar               | mesma               | mesma              | ausente        | ❌           |
| Ação primária         | botão no header     | botão dentro de tab| variado        | ❌           |
| Detalhe de item       | Dialog              | Rota nova          | Rota nova      | ❌           |
| Filtros               | inline              | inline diferente   | ad-hoc         | ❌           |
| Empty state           | às vezes            | às vezes           | raramente      | ❌           |
| Tipografia de título  | `AdminPageHeader`   | mistura            | próprio        | ❌           |

### 3.2 Padrões visuais recorrentes que precisam morrer
- Cabeçalhos gigantes em telas sem ação.
- Cards de estatística com números soltos sem trend/decisão.
- Botões primários em cores diferentes por tela.
- Tabelas sem sticky header, sem coluna de ações persistente.
- Modais de confirmação com estilos variados.
- Uso inconsistente de `--petroleum`, `--gold`, `--linen` — cores da marca
  aparecem em telas administrativas onde deveriam ser neutras.

## 4. Padrão visual alvo (Fase 6)

- **Header 56 px** — denso, um único ponto de identidade da marca.
- **Navigation Rail 240 px** (colapsável para 64 px com ícones).
- **Área de conteúdo** com padding uniforme (24 px) e largura fluida.
- **Detail Panel** 40/60 split (list/detail) ou drawer 640 px lateral.
- **Tipografia:** display para números e H1 de tarefas; sans para tudo o
  mais. Escala reduzida (t: 12 / 14 / 16 / 20 / 28 / 36).
- **Cor:** neutros (linen/petroleum/foreground) no shell; **acento único**
  (gold) reservado para ação primária + estado ativo.
- **Sombra:** ≤ 1 nível (evitar depth teatral).
- **Motion:** apenas em Detail Panel (enter/exit), Command Palette e IA
  drawer. Nada de micro-animações em cards.

## 5. Metas por tela (após Fase 6)

Todas ≥ **9,0**. Especificamente:
- Dashboard, Leads, Imóveis, Lançamentos, Páginas, Portais, Super:
  hierarquia **10**, densidade **9**, identidade **9**.
- Taxonomias e telas administrativas raras: hierarquia **9**, densidade
  **9**, identidade **9** (sem "cair para 7" só porque é tela secundária).

## 6. Conclusão da auditoria visual

O produto está **hoje em 4,7/10**. O gap para o alvo (9,0/10) é
predominantemente de **shell** (header vazio, sem Command Palette, sem
IA, sem tenant switcher, sem Detail Panel) e de **consistência**
(cada tela redesenha padrões que já existem no `AdminUI`). A Fase 6
resolve isso ao mesmo tempo — ao fixar o shell permanente e o DS
imutável, todas as telas subiram por herança.
