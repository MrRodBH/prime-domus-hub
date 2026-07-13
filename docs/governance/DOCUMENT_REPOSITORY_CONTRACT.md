# Document Repository Contract

## Status

Ready for External Audit



**Governance:** GA-08 — Documentation Repository Reorganization.
**Autoridade:** Este contrato é normativo para toda a documentação do
RM Prime SaaS e prevalece sobre convenções ad-hoc anteriores.

---

## 1. Objetivo e autoridade

Este contrato define a estrutura canônica, as regras de classificação e
os processos de auditoria do repositório documental do RM Prime SaaS.
Ele é vinculante para qualquer novo documento e é aplicado
retroativamente pela GA-08.1 sobre o conjunto de 128 relatórios legados
migrados do diretório `docs/fase6/`.

Fontes de autoridade cruzada:

- `docs/architecture/ARCHITECTURE_CONSTITUTION.md`
- `docs/architecture/ROADMAP_ARCHITECTURAL.md`
- `docs/architecture/impact-analysis/GA-08.0-documentation-repository-structure-audit-controlled-migration-plan.md`
- `docs/architecture/impact-analysis/GA-08.1-documentation-repository-controlled-migration.md`

## 2. Classificação documental

Todo documento em `docs/**` pertence a **uma** das três classes
mutuamente exclusivas:

- **Architecture** — documentos arquiteturais canônicos: Constituição,
  Roadmap, ADRs, Impact Analyses, diagramas, glossário, segurança e
  documentos de domínio comercial.
- **Delivery** — evidências e relatórios de execução, agrupados pela
  macrofase ou iniciativa oficial em que a etapa foi executada.
- **Governance** — contratos, políticas e processos de governança
  documental (incluindo este contrato).

## 3. Estrutura canônica

```text
docs/
├── architecture/
│   ├── ADR/
│   ├── commercial/
│   ├── diagrams/
│   ├── impact-analysis/
│   ├── security/
│   ├── ARCHITECTURE_CONSTITUTION.md
│   ├── ROADMAP_ARCHITECTURAL.md
│   └── glossary.md
├── delivery/
│   ├── product-ux-refactor/
│   ├── phase-02-multi-tenancy/
│   ├── phase-03-membership-evolution/
│   └── phase-04-saas-commercial-platform/
└── governance/
    └── DOCUMENT_REPOSITORY_CONTRACT.md
```

## 4. Regra para `docs/architecture/`

- Contém apenas documentos arquiteturais canônicos.
- Sua estrutura interna foi preservada integralmente pela GA-08.1.
- Nenhum relatório de execução pode ser criado dentro de
  `docs/architecture/`. Impact Analyses (IA-*, SCP-*, GA-*) são
  arquiteturais, não relatórios de execução.

## 5. Regra para `docs/delivery/`

- Contém exclusivamente evidências e relatórios de execução.
- Cada relatório vive sob o diretório correspondente à macrofase ou
  iniciativa registrada em `ROADMAP_ARCHITECTURAL.md`.
- Diretórios canônicos atualmente definidos:
  - `product-ux-refactor/` — refatoração de UX/Workspace (prefixos 00–09).
  - `phase-02-multi-tenancy/` — Fase 2 — Multi-Tenant Core (prefixos 10–27).
  - `phase-03-membership-evolution/` — Fase 3 — Membership Evolution
    Model (prefixos 28–42).
  - `phase-04-saas-commercial-platform/` — Fase 4 — SaaS Commercial
    Platform (prefixos 43–108 e continuidade).
- Novos diretórios genéricos de relatórios estão proibidos. Toda
  iniciativa nova requer entrada explícita no roadmap antes de existir
  como diretório em `docs/delivery/`.

## 6. Regra para `docs/governance/`

- Contém contratos, políticas e processos de governança documental.
- Não recebe relatórios de execução nem documentos arquiteturais.

## 7. Nomenclatura de relatórios

- Nome de arquivo preserva o padrão histórico:
  `<prefixo>-<slug-kebab-case>.md`.
- `<prefixo>` é o número cronológico global de criação do relatório,
  atribuído pela ordem histórica e mantido estável após a migração.
- O prefixo **não determina sozinho** o diretório. O diretório é
  derivado da macrofase/iniciativa registrada no roadmap.
- Renomear relatórios existentes está proibido; qualquer correção
  documental é feita por patch (§9).

## 8. Status documental

### 8.1 Status permitidos

Os status canônicos permitidos para qualquer documento arquitetural,
de entrega ou de governança são exatamente:

```text
Draft
Proposed
Ready for External Audit
Accepted
Blocked — <motivo determinístico>
```

`Blocked — <motivo determinístico>` é reservado para etapas que não
podem avançar por prerequisite arquitetural, segurança, evidência
insuficiente ou bloqueio externo. O motivo deve ser textual, curto e
determinístico.

### 8.2 Regra para documentos novos

Todo documento criado após a GA-08.1 deve possuir:

- um único heading `## Status`;
- uma única linha canônica com o status real do documento;
- nenhum token de status entre crases;
- nenhum status duplicado ou intercalado com versões antigas.

### 8.3 Regra para documentos materialmente alterados

Documento histórico que seja materialmente alterado após a GA-08.1
deve ter seu Status normalizado ao formato canônico quando essa
normalização estiver dentro do escopo aprovado da etapa em execução.
Documentos fora do escopo aprovado não são modificados apenas por
uniformização estética.

### 8.4 Exceção para o acervo legado (grandfathering)

Os 128 relatórios movidos pela GA-08.1 constituem acervo histórico
preservado. Eles podem manter formatos anteriores, incluindo:

```text
**Status:** ...
status textual histórico
ausência de heading ## Status
```

Essa preservação é apenas retrospectiva e não constitui recomendação
para novos documentos. Qualquer normalização massiva do acervo legado
deve ser planejada em etapa futura específica, sem reescrita
indiscriminada do histórico.

### 8.5 Escopo do futuro gate GA-08.2

O gate automatizado da GA-08.2 deve validar prioritariamente:

- documentos novos criados após a GA-08.1;
- documentos materialmente modificados após a GA-08.1;
- documentos arquiteturais ativos;
- contratos de governança ativos.

O gate não pode declarar automaticamente inválidos os 128 relatórios
históricos migrados pela GA-08.1 apenas por sua formatação anterior
ao presente contrato.



## 9. Tratamento de patches

- Correções documentais posteriores à publicação de um relatório são
  aplicadas como novos relatórios de patch (ex.: `SCP-XYZ.N`), nunca
  reescrevendo o histórico do arquivo original salvo quando a auditoria
  externa autorizar reescrita determinística de seções específicas.
- Reescritas determinísticas de seções seguem o padrão da SCP-012.0.1.1
  (Deterministic Full-Section Rewrite): substituição integral de
  seções identificadas por heading canônico, sem coexistência de
  versões antigas e novas.

## 10. Closing reviews

- Cada macrofase encerra com um relatório de closing review em
  `docs/delivery/<macrofase>/`, contendo o encerramento formal da
  fase, referências cruzadas aos relatórios internos e status final.
- O closing review não substitui Impact Analyses arquiteturais.

## 11. Links relativos

- Todos os links entre documentos devem ser relativos e resolver com
  sucesso a partir do arquivo de origem.
- Links absolutos http/https, `mailto:` e âncoras internas (`#…`) são
  ignorados pelo validador.
- É proibido publicar um documento com links relativos quebrados.

## 12. Movimentação com `git mv`

- Toda movimentação de documento existente deve preservar o histórico
  Git. O método autoritativo é `git mv`.
- Em ambientes de execução onde `git mv` esteja indisponível, uma
  movimentação equivalente (`mv` seguido de verificação de hash
  antes/depois) é aceitável desde que:
  - o conteúdo permaneça idêntico byte-a-byte antes das atualizações
    de referências internas;
  - o mapa antigo → novo esteja completo;
  - nenhum arquivo tenha sido perdido, duplicado ou renomeado.
- O `git` reconstruirá o rename por similaridade de conteúdo.

## 13. Diretórios proibidos

- `docs/fase6/` — caminho legado, removido pela GA-08.1, proibido para
  qualquer novo documento.
- Qualquer novo diretório genérico de relatórios criado fora da
  estrutura canônica (§3).

## 14. Processo de auditoria

- Cada etapa que altere `docs/**` deve descrever expressamente o
  escopo permitido, os arquivos criados/movidos/alterados e as
  confirmações negativas correspondentes.
- Auditorias read-only não podem alterar arquivos.
- Substituições de referências devem usar mapa individual
  antigo → novo. Substituições genéricas de diretório sem mapa são
  proibidas.

## 15. Gate de falha

Uma etapa documental **falha** e não pode ser aceita quando:

- a macrofase de um novo relatório não puder ser determinada;
- um novo relatório for criado fora da estrutura canônica (§3);
- houver referência ativa a `docs/fase6/` fora do allowlist explícito
  desta etapa de governança;
- houver link relativo quebrado sob `docs/**`;
- houver duplicidade de status, heading `## Status` múltiplo ou
  colisão com tokens canônicos fora de blocos de evidência marcados;
- houver alteração de código, testes, migrations, schema, RLS,
  grants, providers ou frontend em uma etapa exclusivamente documental.
