# LVR-01 — Preflight somente leitura: capacidade UX/UI privada

Escopo desta entrega: relatório de capacidade/limitações + plano de validação UX/UI read-only.
Nenhuma materialização, nenhuma edição de arquivo, nenhum acesso a backend, nenhum publish/deploy.
Nenhuma operação ou instrução de repositório.

## 1. Variantes privadas / drafts isolados

Capacidade nativa disponível: **não**.

- O workspace opera com **um único estado de código ativo** e **um único preview** vinculado a ele.
- Não existe mecanismo de "variante privada" paralela: qualquer estado alternativo só existiria substituindo o conteúdo do workspace atual (materialização), o que está fora de autorização aqui.
- O histórico de versões do projeto funciona como linha temporal linear de restauração, não como branch privado coexistente.

Consequência: revisão visual de dois estados ao mesmo tempo não é possível nativamente.

## 2. Escolher um commit-base exato já reconhecido pelo projeto

Capacidade parcial.

- O projeto reconhece pontos de versão do próprio histórico do workspace e permite restaurar um deles.
- Restaurar é **substitutivo**, não aditivo: o preview passa a refletir aquele estado e o estado atual sai do ar até nova restauração.
- Um estado externo ao histórico do workspace não é "selecionável"; ele só entra por materialização de conteúdo — operação que exige autorização explícita e não é coberta por LVR-01.

## 3. Isolamento de preview e garantias de não publicação

- Preview e produção são **superfícies separadas**: o preview reflete o estado de trabalho; o site publicado permanece congelado no último publish.
- Alterar/restaurar o workspace **não** altera o site publicado; publicação só ocorre por ação explícita de publish.
- Limitação de isolamento: o preview **não é privado por conteúdo** — ele é único por projeto. Quem acompanha o preview vê o estado corrente, seja qual for.
- Limitação crítica de isolamento de dados: preview e produção compartilham **o mesmo backend**. Portanto o preview não é um ambiente isolado para dados/auth; qualquer escrita feita durante revisão visual atinge dados reais.

## 4. Limitações conhecidas para validar responsividade, autenticação real e matriz visual

- **Responsividade**: validável no preview via viewports reais de navegador. Sem limitação relevante além de fontes/imagens remotas.
- **Autenticação real**: exige sessão real do backend compartilhado. Rotas autenticadas não renderizam sem sessão; e como o backend é compartilhado, testar login usa identidades reais — validação autenticada deve usar identidade de homologação, nunca criar/alterar dados de tenant real.
- **Estados de tenant/host**: estados que dependem de resolução por host (domínio/slug) podem não resolver no host de preview, resultando em erro de rota em vez de tela válida. Isso limita a auditoria visual de telas dependentes de contexto de tenant.
- **Matriz visual**: não existe captura de matriz de screenshots nativa versionada; a matriz é executada sob demanda e as evidências são artefatos avulsos, não estado do projeto.
- **Sem variante**: não há como validar A/B de duas versões simultaneamente; a comparação é sequencial (restaura A, audita, restaura B, audita).

## 5. Preservação da versão publicada para rollback visual

Estratégia recomendada, sem materialização:

1. Tratar o **último publish como baseline imutável de rollback visual** — ele não é afetado por mudanças de workspace.
2. Registrar, antes de qualquer restauração futura, o ponto de versão atual do workspace, para permitir retorno ao estado de trabalho.
3. Capturar, como evidência de baseline, a matriz visual do site publicado (leitura apenas) antes de qualquer auditoria de estado alternativo — assim o "antes" fica documentado fora do projeto.
4. Não publicar durante ciclos de auditoria: o rollback visual é simplesmente "não publicar".
5. Rollback de produção, se algum dia necessário, é reversão para o estado publicado anterior — decisão de Owner, fora do escopo deste preflight.

## 6. Matriz de validação UX/UI recomendada (read-only)

### Viewports
| Classe | Resolução | Foco |
| --- | --- | --- |
| Mobile | 375x812 | overflow horizontal, alvos de toque >=44px, navegação colapsada |
| Tablet | 768x1024 | quebra de grid, tabelas/listas densas, sidebar intermediária |
| Desktop | 1440x900 | densidade, largura máxima de conteúdo, uso de espaço lateral |

### Estados por tela auditada
| Estado | Como observar (sem escrita) | Critério de aceite |
| --- | --- | --- |
| Loading | primeira renderização / navegação | skeleton ou spinner estável, sem salto de layout |
| Empty | filtro sem resultado (estado de URL) | mensagem explicativa + ação de saída clara |
| Error | rota/consulta indisponível | mensagem legível, sem stack técnica exposta, caminho de recuperação |
| Permission denied | identidade sem permissão | tela dedicada, sem tela em branco e sem dado parcial vazando |
| Success/padrão | dados existentes | hierarquia visual, títulos, densidade consistente |

### Acessibilidade
- Ordem de foco previsível; foco visível em todos os controles.
- Operação completa por teclado (tabs, listas, diálogos, fechamento por Esc).
- `aria-current` / `aria-selected` corretos em navegação e listas.
- `aria-live` para transições assíncronas (loading -> resultado/erro).
- Contraste mínimo AA para texto e estados desabilitados.
- Imagens com alt significativo; ícones puramente decorativos com `aria-hidden`.
- Um único H1 por tela e hierarquia de headings sem salto.

### Regras de execução da auditoria
- Somente leitura: nenhuma criação, edição ou exclusão de registros durante a matriz.
- Estados de filtro/seleção obtidos por estado de URL, não por mutação.
- Evidências (screenshots/observações) tratadas como artefatos externos.

## 7. Conclusão de capacidade

| Requisito | Status nativo |
| --- | --- |
| Variante privada/draft isolado | Não disponível |
| Seleção de commit-base exato do histórico do projeto | Disponível, porém substitutivo |
| Isolamento de código preview vs publicado | Disponível |
| Isolamento de dados preview vs produção | **Não disponível** (backend compartilhado) |
| Garantia de não publicação | Disponível (publish é sempre explícito) |
| Auditoria de responsividade | Disponível |
| Auditoria autenticada | Condicional (identidade real do backend compartilhado) |
| Matriz visual versionada no projeto | Não disponível |

Bloqueio estrutural para "preview privado de um estado alternativo, sem tocar o estado atual": **não existe capacidade nativa**. Qualquer caminho passa por materialização substitutiva do workspace, que requer autorização explícita do Owner e não está autorizada nesta execução.

## 8. Próxima decisão do Owner (nada será executado sem escolha)

- (A) Encerrar em LVR-01 apenas com este relatório.
- (B) Autorizar execução da matriz UX/UI read-only sobre o estado **atual** do preview, sem alterar código.
- (C) Autorizar, em execução separada, materialização substitutiva de um estado-base específico para revisão visual, com plano de retorno ao estado atual.
