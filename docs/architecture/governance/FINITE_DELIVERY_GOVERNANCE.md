# FINITE DELIVERY GOVERNANCE

## Governança Finita de Entrega do RM Prime SaaS / RM Prime OS

**Documento canônico:** `docs/architecture/governance/FINITE_DELIVERY_GOVERNANCE.md`  
**Versão:** 1.0  
**Status:** Normativo e vinculante  
**Aplicação:** imediata após versionamento na branch `main`  
**Repositório:** `MrRodBH/prime-domus-hub`  
**Produto:** Plataforma SaaS White Label para corretores de imóveis e imobiliárias  
**Proprietário da governança:** RM Prime  
**Última revisão:** 2026-07-16

---

## 1. Finalidade

Este contrato estabelece uma governança finita, previsível e auditável para a execução do roadmap arquitetural e de product readiness do RM Prime SaaS / RM Prime OS.

Seu objetivo é impedir:

- etapas sem encerramento;
- crescimento retroativo de escopo;
- criação sucessiva de lotes, sublotes, checkpoints ou correções;
- transformação de toda melhoria possível em requisito bloqueante;
- dependência indefinida de novos prompts;
- absorção de requisitos pertencentes a etapas futuras;
- loops entre implementação, relatório, auditoria e nova implementação;
- perda de visibilidade sobre o roadmap completo.

A governança deve assegurar a relação direta:

```text
etapa planejada
→ contrato congelado
→ execução principal
→ auditoria
→ correção única, quando autorizada
→ estado terminal
→ próxima etapa
```

---

## 2. Escopo

Este contrato aplica-se a:

- fases arquiteturais;
- etapas do roadmap;
- etapas de product readiness;
- implementações executadas pelo Lovable ou por outra plataforma externa;
- prompts de implementação;
- prompts corretivos;
- relatórios de execução;
- auditorias realizadas no ChatGPT;
- runbooks operacionais;
- dependências externas;
- backlog técnico não bloqueante;
- decisões de continuidade do roadmap.

Este contrato não substitui:

- `ARCHITECTURE_CONSTITUTION.md`;
- `SECURITY_ARCHITECTURE.md`;
- ADRs aceitos;
- Impact Analyses aceitas;
- contratos de domínio já materializados;
- invariantes técnicos e de segurança já congelados.

Em caso de conflito, prevalece a regra mais restritiva que preserve segurança, determinismo e finitude da entrega.

---

## 3. Linguagem normativa

Os termos abaixo possuem força normativa:

- **DEVE / MUST:** requisito obrigatório;
- **NÃO DEVE / MUST NOT:** proibição absoluta;
- **PODE / MAY:** opção permitida, sem caráter obrigatório;
- **DEVERIA / SHOULD:** recomendação forte, cuja não aplicação exige justificativa;
- **BLOQUEANTE:** impede aceite ou continuidade;
- **NÃO BLOQUEANTE:** não impede aceite nem avanço do roadmap.

---

## 4. Princípios fundamentais

### 4.1 Finitude

Toda etapa DEVE possuir início, limite de execução e estado terminal previamente definidos.

### 4.2 Escopo congelado

O objetivo, os entregáveis, os testes e o Definition of Done DEVEM ser congelados antes do prompt principal.

### 4.3 Orçamento fixo de prompts

Cada etapa possui, no máximo:

```text
1 prompt principal
+ 1 prompt corretivo consolidado
= 2 prompts de implementação
```

### 4.4 Sem lotes abertos

Não são permitidos múltiplos lotes operacionais criados durante a execução para absorver expansão de escopo.

### 4.5 Planejamento antes da execução

Etapas grandes DEVEM ser decompostas no roadmap antes do primeiro prompt, nunca durante a implementação.

### 4.6 Auditoria não amplia contrato

A auditoria verifica conformidade com o contrato congelado. Ela NÃO DEVE criar requisitos retroativos.

### 4.7 Dependência externa não gera desenvolvimento contínuo

Ausência de staging, credenciais, serviço externo ou infraestrutura autorizada DEVE produzir `Blocked External`, e não novos ciclos de implementação.

### 4.8 Estado terminal obrigatório

Após a auditoria da correção consolidada, a etapa DEVE receber um estado terminal.

---

## 5. Definições

### 5.1 Fase

Agrupamento macro do roadmap, composto por etapas previamente identificadas.

### 5.2 Etapa

Unidade finita do roadmap com:

- objetivo único;
- predecessor;
- entregáveis definidos;
- evidência mínima;
- Definition of Done;
- prompt budget;
- estados terminais;
- sucessor explícito.

Uma etapa que não possa ser concluída com o orçamento de prompts definido está mal dimensionada e DEVE ser replanejada antes da execução.

### 5.3 Execução principal

Primeira e única implementação integral autorizada para uma etapa.

### 5.4 Correção consolidada

Única implementação corretiva permitida após a primeira auditoria, limitada exclusivamente a defeitos bloqueantes dentro do escopo originalmente congelado.

### 5.5 Runbook operacional

Procedimento de execução que:

- não altera código;
- não cria migration;
- não altera contrato;
- apenas executa comandos, coleta evidências e relata resultados.

Runbook não conta como prompt de implementação.

### 5.6 Dependência externa

Recurso necessário que não está sob controle imediato do código ou da etapa, como:

- ambiente não produtivo;
- chave ou credencial autorizada;
- serviço de terceiro;
- aprovação humana;
- configuração administrativa externa.

### 5.7 Defeito bloqueante

Falha objetiva contra o contrato congelado que impede segurança, correção, integridade, testabilidade ou uso pelo sucessor.

### 5.8 Falha de relatório

Ausência ou inconsistência exclusivamente documental no relatório do Lovable, sem evidência de defeito de implementação.

### 5.9 Backlog não bloqueante

Melhoria legítima que não viola o contrato atual e não impede continuidade do roadmap.

### 5.10 Escopo futuro

Requisito pertencente a etapa posterior já planejada ou a novo item de roadmap.

### 5.11 Prompt budget

Quantidade máxima de prompts de implementação permitidos para a etapa.

### 5.12 Estado terminal

Estado que encerra o ciclo decisório da etapa:

- `Accepted`;
- `Accepted with Non-Blocking Backlog`;
- `Blocked External`;
- `Rejected`;
- `Superseded`.

---

## 6. Hierarquia de autoridade

A autoridade do projeto segue esta ordem:

```text
1. Constituição arquitetural e arquitetura de segurança
2. Este contrato de Governança Finita de Entrega
3. ADRs, Impact Analyses e contratos aceitos
4. ROADMAP_ARCHITECTURAL.md e roadmap de product readiness
5. Execution Envelope da etapa
6. Prompt aprovado para execução
7. Relatório factual do Lovable
8. Contexto do chat e memória operacional
```

O relatório do Lovable não pode redefinir:

- arquitetura;
- roadmap;
- escopo;
- Definition of Done;
- prompt budget;
- estados terminais;
- governança.

---

## 7. Mapa obrigatório do roadmap

Antes de iniciar nova etapa, o roadmap DEVE possuir visibilidade das etapas restantes relevantes.

Cada etapa DEVE declarar:

| Campo | Obrigação |
|---|---|
| Identificador | Nome oficial e único |
| Objetivo | Um resultado principal |
| Predecessor | Condição de entrada |
| Entregáveis | Arquivos, contratos ou resultados |
| Evidência mínima | Prova necessária para aceite |
| Dependência externa | Recurso externo conhecido |
| Fora de escopo | Fronteira com sucessores |
| Prompt budget | `1 principal + 1 corretivo` |
| Estados terminais | Saídas permitidas |
| Sucessor | Próxima etapa autorizada |

Não é permitido iniciar uma etapa cuja fronteira com as etapas seguintes esteja indefinida.

---

## 8. Critérios de entrada de uma etapa

Uma etapa somente pode entrar em `Ready for Execution` quando:

- o predecessor estiver em estado compatível;
- o objetivo estiver definido;
- os entregáveis estiverem listados;
- o Definition of Done estiver congelado;
- os testes obrigatórios estiverem definidos;
- as dependências externas estiverem identificadas;
- o fora de escopo estiver explícito;
- o prompt budget estiver registrado;
- o sucessor estiver identificado;
- não houver decisão arquitetural pendente indispensável.

Se qualquer item estiver ausente, a etapa permanece `Planned`.

---

## 9. Execution Envelope

Toda etapa DEVE possuir, antes do prompt principal, um contrato de execução curto e fechado.

### 9.1 Estrutura obrigatória

```text
STAGE_ID
OBJECTIVE
PREDECESSOR
DELIVERABLES
FILES_ALLOWED
MIGRATIONS_ALLOWED
RUNTIME_CHANGES_ALLOWED
RLS_CHANGES_ALLOWED
GRANTS_CHANGES_ALLOWED
TESTS_REQUIRED
EVIDENCE_REQUIRED
DEFINITION_OF_DONE
OUT_OF_SCOPE
EXTERNAL_DEPENDENCIES
PROMPT_BUDGET
TERMINAL_STATES
SUCCESSOR
```

### 9.2 Congelamento

Após o envio do prompt principal, NÃO PODEM crescer retroativamente:

- objetivo;
- entregáveis;
- arquivos obrigatórios;
- testes obrigatórios;
- evidências obrigatórias;
- Definition of Done;
- escopo técnico.

Novos requisitos descobertos devem ser classificados conforme a Seção 14.

---

## 10. Orçamento de prompts

### 10.1 Limite padrão

```text
PROMPT_BUDGET
principal: 1
corretivo: 1
total máximo: 2
```

### 10.2 Prompt principal

O prompt principal DEVE implementar integralmente o Execution Envelope.

### 10.3 Prompt corretivo

Somente pode ser autorizado após a primeira auditoria e somente para defeitos bloqueantes do escopo congelado.

### 10.4 Terceiro prompt

Um terceiro prompt de implementação dentro da mesma etapa é proibido.

Quando a correção consolidada não for suficiente, a auditoria final DEVE escolher:

- `Rejected`;
- `Superseded`;
- `Blocked External`, quando a implementação estiver correta e faltar somente dependência externa.

### 10.5 Complementação factual

Solicitação de dados faltantes no relatório, sem alteração de código, não conta como prompt de implementação.

---

## 11. Proibição de lotes abertos

### 11.1 Regra

Não é permitido criar durante a execução:

- múltiplos lotes operacionais;
- sublotes;
- `A1`, `A2`, `B1`;
- identificadores decimais corretivos;
- checkpoints com novos requisitos;
- ciclos indefinidos de “continuidade”.

### 11.2 Exceção histórica

Lotes já existentes podem permanecer como registro histórico, mas:

- não podem gerar novos sublotes;
- não podem ampliar o prompt budget;
- não podem criar nova autoridade de aceite;
- devem ser reconciliados ao estado terminal da etapa.

### 11.3 Etapa grande

Se uma iniciativa possuir vários resultados independentes, deve ser dividida em etapas oficiais antes da execução.

---

## 12. Estrutura técnica dos prompts para o Lovable

Prompts devem ser técnicos, claros e compactos. Maior precisão não significa maior extensão.

### 12.1 Formatação obrigatória

Todo prompt destinado ao Lovable DEVE ser entregue:

- em um único box de escrita com fundo branco;
- pronto para copiar e colar;
- sem instruções essenciais fora do box;
- sem duplicações narrativas;
- com linguagem normativa.

### 12.2 Estrutura padrão

```text
BASELINE
OBJECTIVE
MANDATORY INSPECTION
MANDATORY CHANGES
PROHIBITED CHANGES
TESTS
DEFINITION OF DONE
FINAL REPORT
```

### 12.3 Qualidade

O prompt DEVE ser CTDD:

- Claro;
- Técnico;
- Didático;
- Detalhado apenas no necessário.

### 12.4 Proibições

O prompt NÃO DEVE:

- explicar repetidamente o mesmo requisito;
- pedir investigação aberta sem fronteira;
- autorizar “corrigir tudo que encontrar”;
- transferir decisões de roadmap ao Lovable;
- permitir novos requisitos fora do Execution Envelope;
- autorizar início da etapa sucessora.

---

## 13. Execução principal

A execução principal deve:

- respeitar integralmente o baseline;
- alterar apenas o escopo autorizado;
- executar todos os testes exigidos;
- não iniciar sucessores;
- não criar novas etapas;
- não alterar governança;
- entregar relatório factual mínimo;
- declarar explicitamente itens não implementados;
- distinguir bloqueio técnico de dependência externa.

Uma entrega parcial não pode ser declarada `Completed`.

---

## 14. Classificação obrigatória dos achados

Todo achado de auditoria DEVE ser classificado antes de gerar qualquer ação.

### 14.1 Classe A — Defeito bloqueante do escopo original

Exemplos:

- contrato implementado incorretamente;
- enum inválido;
- autorização ausente;
- migration incompatível;
- teste obrigatório não executado;
- perda de dados;
- exposição de segurança;
- evidência obrigatória inexistente.

Tratamento:

```text
Autorizar a única correção consolidada disponível.
```

### 14.2 Classe B — Falha apenas no relatório

Exemplos:

- SHA ausente;
- arquivo não listado;
- contagem de testes omitida;
- status textual contraditório sem evidência de defeito no código.

Tratamento:

```text
Solicitar complementação factual.
Não autorizar desenvolvimento adicional.
Não consumir o prompt corretivo.
```

### 14.3 Classe C — Dependência externa

Exemplos:

- staging inexistente;
- credencial autorizada indisponível;
- serviço externo não configurado;
- aprovação administrativa pendente.

Tratamento:

```text
Blocked External.
Nenhum novo prompt de implementação.
```

### 14.4 Classe D — Melhoria não bloqueante

Exemplos:

- abstração adicional;
- log mais detalhado;
- evidência mais elegante;
- generalização futura;
- refatoração estética.

Tratamento:

```text
Registrar em Non-Blocking Backlog.
A etapa pode ser aceita.
```

### 14.5 Classe E — Escopo futuro

Tratamento:

```text
Preservar para o sucessor ou criar item futuro no roadmap.
Não incorporar à etapa atual.
```

### 14.6 Classe F — Problema de dimensionamento

Quando a etapa não pode ser concluída no orçamento definido porque contém vários resultados independentes:

```text
Superseded.
Replanejar como novas etapas antes de nova execução.
```

---

## 15. Correção consolidada

### 15.1 Autorização

A correção consolidada somente é autorizada quando houver pelo menos um defeito Classe A.

### 15.2 Escopo

A correção deve:

- corrigir exclusivamente defeitos Classe A;
- manter o objetivo original;
- não incluir melhorias Classe D;
- não absorver escopo futuro Classe E;
- não criar migration ou runtime adicional sem necessidade direta;
- não reabrir contratos aceitos fora da etapa.

### 15.3 Consolidação

Todos os defeitos Classe A conhecidos devem ser incluídos no mesmo prompt corretivo.

### 15.4 Auditoria final

Após a correção, não existe novo ciclo corretivo.

A auditoria final deve decidir:

- `Accepted`;
- `Accepted with Non-Blocking Backlog`;
- `Blocked External`;
- `Rejected`;
- `Superseded`.

---

## 16. Dependências externas e runbooks

### 16.1 Estado correto

Quando o código estiver pronto, mas a prova depender de recurso externo indisponível:

```text
Implementation: Ready
Operational Verification: Blocked External
```

### 16.2 Congelamento

Ao entrar em `Blocked External`:

- o código deve ser congelado;
- não deve ser criado novo prompt de implementação;
- deve existir um runbook de execução;
- o roadmap deve registrar a dependência;
- o sucessor permanece bloqueado quando depender da prova operacional.

### 16.3 Execução posterior

Quando a dependência existir:

```text
executar runbook
→ coletar evidência
→ auditar resultado
```

### 16.4 Falha do runbook

Se a execução revelar defeito e o prompt corretivo ainda estiver disponível, ele pode ser consumido.

Se a correção já tiver sido utilizada, a etapa deve ser `Rejected` ou `Superseded`.

---

## 17. Backlog não bloqueante

Um achado pode ser classificado como backlog quando:

- não viola segurança atual;
- não quebra contrato aceito;
- não impede o sucessor;
- não causa perda de dados;
- não cria acesso indevido;
- não impede operação prevista;
- não invalida evidência obrigatória.

O backlog deve conter:

```text
ID
Descrição
Motivo de não bloqueio
Etapa futura sugerida
Risco
Prioridade
```

Backlog não bloqueante não pode manter etapa em `In Progress`.

---

## 18. Máquina de estados

### 18.1 Estados preparatórios

```text
Planned
→ Ready for Execution
→ Executing
→ Ready for Audit
```

### 18.2 Primeira auditoria

```text
Ready for Audit
→ Accepted
→ Accepted with Non-Blocking Backlog
→ Corrective Pass Authorized
→ Blocked External
→ Rejected
→ Superseded
```

### 18.3 Após correção

```text
Corrective Pass Authorized
→ Executing Correction
→ Ready for Final Audit
```

### 18.4 Auditoria final

```text
Ready for Final Audit
→ Accepted
→ Accepted with Non-Blocking Backlog
→ Blocked External
→ Rejected
→ Superseded
```

Não existe retorno para `Corrective Pass Authorized` após a auditoria final.

---

## 19. Critérios dos estados terminais

### 19.1 Accepted

Utilizar quando:

- todo Definition of Done foi atendido;
- testes obrigatórios passaram;
- evidências obrigatórias existem;
- não há defeito bloqueante;
- dependências necessárias foram satisfeitas.

### 19.2 Accepted with Non-Blocking Backlog

Utilizar quando:

- o contrato está integralmente atendido;
- restam apenas melhorias Classe D.

### 19.3 Blocked External

Utilizar quando:

- a implementação aplicável está pronta;
- falta exclusivamente dependência externa;
- há runbook definido;
- não há defeito de implementação conhecido que inviabilize a execução futura.

### 19.4 Rejected

Utilizar quando:

- a arquitetura ou implementação é inadequada;
- a correção única falhou;
- há defeito bloqueante remanescente;
- o contrato não pode ser atendido sem reimplementação relevante;
- a solução viola invariantes aceitos.

### 19.5 Superseded

Utilizar quando:

- o escopo estava mal dimensionado;
- a etapa precisa ser substituída por novas etapas planejadas;
- uma decisão arquitetural posterior tornou a etapa obsoleta.

---

## 20. Relatório obrigatório do Lovable

### 20.1 Princípio

O relatório deve conter somente informações necessárias para auditoria e decisão de continuidade.

### 20.2 Campos mínimos

```text
STATUS
STAGE_ID
PROMPT_TYPE: principal | corrective | runbook
BASELINE_HEAD
FINAL_HEAD

FILES_CHANGED
MIGRATIONS_ADDED
RUNTIME_CHANGED
RLS_CHANGED
GRANTS_CHANGED

REQUIREMENTS_IMPLEMENTED
REQUIREMENTS_NOT_IMPLEMENTED
OUT_OF_SCOPE_PRESERVED

TEST_COMMANDS
TEST_EXITS
TESTS_PASSED
TESTS_FAILED
TESTS_SKIPPED

EVIDENCE_CREATED
EXTERNAL_DEPENDENCIES
BLOCKERS
KNOWN_LIMITATIONS

STAGE_STATUS
NEXT_ALLOWED_ACTION
FINAL_COMMIT
```

### 20.3 Campos específicos

O prompt pode acrescentar apenas campos necessários ao contrato da etapa.

### 20.4 Proibições

O relatório NÃO DEVE:

- narrar passo a passo toda a execução;
- repetir integralmente o prompt;
- incluir longos trechos de código;
- declarar aceite arquitetural;
- inventar `Completed` sem evidência;
- omitir requisito não implementado;
- transferir requisito para etapa futura sem autorização.

---

## 21. Regra de auditoria

### 21.1 Fonte padrão

A auditoria deve ser realizada normalmente apenas pelo relatório final do Lovable.

### 21.2 Acesso ao GitHub

O GitHub somente deve ser acessado quando o relatório apresentar inconsistência que impeça decisão segura e quando apenas o repositório puder liberar ou bloquear o roadmap.

Critérios de escalonamento:

- contradição entre baseline e HEAD;
- requisito declarado como implementado, mas sem evidência suficiente;
- divergência em migrations, runtime, RLS ou grants;
- resultado de testes incompatível com o status;
- documentação conflitante;
- suspeita objetiva de contrato incorreto;
- impossibilidade de decidir continuidade apenas pelo relatório.

A inspeção no GitHub deve ser limitada ao ponto inconsistente.

### 21.3 Proibição

Não acessar o GitHub automaticamente em toda auditoria.

---

## 22. Formato obrigatório das auditorias no chat

A resposta de auditoria deve apresentar somente:

```text
1. Síntese
6. Prompt corretivo ou próxima etapa
```

### 22.1 Síntese

A Síntese deve incorporar:

- entrega realizada;
- conformidade com o contrato congelado;
- defeitos bloqueantes;
- dependências externas;
- backlog não bloqueante;
- estado resultante;
- decisão de continuidade.

Não criar seções separadas de:

- Veredito;
- Bloqueios;
- Ressalvas;
- Decisão.

### 22.2 Item 6

O item 6 deve conter exatamente uma das saídas:

```text
A. Próxima etapa autorizada
B. Única correção consolidada autorizada
C. Blocked External — nenhum prompt de implementação
D. Complementação factual do relatório
E. Etapa encerrada como Rejected
F. Etapa encerrada como Superseded
```

Quando houver prompt para o Lovable, ele deve obedecer à Seção 12.

---

## 23. Regra para continuidade do roadmap

A próxima etapa somente pode ser autorizada quando:

- o predecessor estiver `Accepted` ou em estado explicitamente compatível;
- não houver gate bloqueante pendente;
- o roadmap estiver atualizado;
- o sucessor possuir Execution Envelope;
- o prompt budget estiver registrado.

`Blocked External`, `Rejected` ou `Superseded` não autorizam automaticamente o sucessor.

A compatibilidade deve estar declarada no roadmap.

---

## 24. Controle de mudanças da governança

Este contrato não pode ser alterado por:

- Lovable;
- relatório de execução;
- prompt de etapa;
- decisão local de implementação;
- conveniência operacional.

Alterações exigem:

1. proposta explícita;
2. justificativa;
3. análise de impacto sobre roadmap e etapas abertas;
4. aprovação do proprietário do projeto;
5. atualização de versão;
6. commit dedicado;
7. registro no decision log ou artefato equivalente.

Mudanças não podem aumentar retroativamente o prompt budget de etapa em andamento.

---

## 25. Adoção em etapas já iniciadas

### 25.1 Regra de transição

Prompts históricos não invalidam automaticamente uma etapa já aberta, mas não autorizam continuidade ilimitada.

Cada etapa em andamento deve receber um registro de migração contendo:

```text
CURRENT_STAGE
CURRENT_STATUS
ORIGINAL_SCOPE
KNOWN_BLOCKERS
PROMPTS_ALREADY_EXECUTED
REMAINING_IMPLEMENTATION_BUDGET
EXTERNAL_DEPENDENCIES
NEXT_TERMINAL_DECISION
```

### 25.2 Limite após adoção

Nenhuma etapa já iniciada pode receber mais de uma correção consolidada adicional após a adoção deste contrato.

Após essa correção ou auditoria equivalente, a etapa deve receber estado terminal.

### 25.3 Lotes existentes

Lotes existentes passam a ser apenas referências históricas e não podem gerar novos lotes ou sublotes.

---

## 26. Violações de governança

Constituem violação:

- terceiro prompt de implementação na mesma etapa;
- criação de novo lote durante a execução;
- aumento retroativo do Definition of Done;
- incorporação de melhoria não bloqueante como gate;
- uso de dependência externa para justificar desenvolvimento contínuo;
- transferência silenciosa de requisito;
- início de sucessor sem autorização;
- declaração de `Completed` sem evidência;
- auditoria que cria novo requisito fora do contrato;
- relatório que redefine roadmap;
- inspeção automática do GitHub sem inconsistência objetiva.

Diante de violação, a execução deve ser interrompida e reconciliada antes de continuar.

---

## 27. Template de registro da etapa

```text
STAGE_ID:
TITLE:
STATUS:
PREDECESSOR:
SUCCESSOR:

OBJECTIVE:

DELIVERABLES:
- 

EVIDENCE_REQUIRED:
- 

EXTERNAL_DEPENDENCIES:
- none | descrição

OUT_OF_SCOPE:
- 

PROMPT_BUDGET:
- principal: 1
- corrective: 1
- used: 0
- remaining: 2

TERMINAL_STATES:
- Accepted
- Accepted with Non-Blocking Backlog
- Blocked External
- Rejected
- Superseded

EXECUTION_ENVELOPE:
- FILES_ALLOWED:
- MIGRATIONS_ALLOWED:
- RUNTIME_CHANGES_ALLOWED:
- RLS_CHANGES_ALLOWED:
- GRANTS_CHANGES_ALLOWED:
- TESTS_REQUIRED:
- DEFINITION_OF_DONE:
```

---

## 28. Template de classificação de auditoria

```text
FINDING_ID:
DESCRIPTION:
CLASS:
- A Blocking Defect
- B Report Defect
- C External Dependency
- D Non-Blocking Improvement
- E Future Scope
- F Stage Sizing Problem

CONTRACT_REFERENCE:
IMPACT:
REQUIRED_ACTION:
CONSUMES_CORRECTIVE_BUDGET: yes | no
```

---

## 29. Template de decisão de auditoria

```text
STAGE_ID:
AUDIT_TYPE: first | final | runbook

CONTRACT_COMPLIANCE:
BLOCKING_FINDINGS:
REPORT_ONLY_FINDINGS:
EXTERNAL_DEPENDENCIES:
NON_BLOCKING_BACKLOG:

RESULTING_STATE:
CORRECTIVE_BUDGET_USED:
CORRECTIVE_BUDGET_REMAINING:
NEXT_ALLOWED_ACTION:
```

---

## 30. Resumo vinculante

As seguintes regras são absolutas:

```text
1. Toda etapa deve ser dimensionada para um único prompt principal.

2. Cada etapa possui no máximo uma correção consolidada.

3. O limite absoluto é de dois prompts de implementação por etapa.

4. Não são permitidos múltiplos lotes operacionais abertos.

5. Etapas grandes devem ser divididas no roadmap antes da execução.

6. O Definition of Done é congelado antes do prompt principal.

7. Novos requisitos não entram retroativamente na etapa.

8. Todo achado deve ser classificado antes de gerar ação.

9. Dependência externa produz Blocked External, não novo desenvolvimento.

10. Após a correção, a etapa recebe estado terminal obrigatório.

11. Não existe segunda correção dentro da mesma etapa.

12. Cada etapa declara prompt budget e sucessor antes de iniciar.

13. O relatório do Lovable deve conter somente dados necessários à auditoria.

14. A auditoria usa o relatório como fonte padrão e acessa o GitHub apenas diante de inconsistência indispensável.

15. A resposta de auditoria apresenta somente Síntese e prompt/próxima etapa.

16. Prompts para o Lovable são entregues em um único box de escrita, CTDD e sem duplicação.
```

---

## 31. Declaração de vigência

Após versionado na branch `main`, este documento torna-se a autoridade canônica para governança de execução do roadmap do RM Prime SaaS / RM Prime OS.

Toda nova etapa, prompt, relatório, auditoria e decisão de continuidade deve demonstrar conformidade com este contrato.

Qualquer regra anterior incompatível com este documento fica substituída.
