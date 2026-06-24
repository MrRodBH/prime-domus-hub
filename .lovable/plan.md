
# Plano de homologação RM Prime — 12 itens

Antes de executar, quero alinhar o escopo. São 12 frentes (UI, regras de negócio, auth, banco e novo módulo). Vou agrupar por área e executar em sequência, validando cada item.

## Grupos de trabalho

### A. Painel de Leads / CRM (itens 1, 2, 3, 11)
- **Item 1 — Gráfico Resultados**: corrigir sobreposição título×barras (padding/min-height no container do gráfico) e mudar regra `TOTAL FECHADOS` para contar apenas `status = 'ganho'`. Deixar estrutura preparada para somar valor financeiro futuramente.
- **Item 2 — Valor do Negócio no card de Lead**: nova linha abaixo de "Imóvel de Interesse" exibindo `imoveis.preco` formatado em BRL; "Não informado" quando nulo/sem imóvel.
- **Item 3 — Botões do card de Lead**: rodapé com `flex flex-wrap` controlado (sem wrap no desktop, wrap suave no mobile), gap consistente, sem o "Histórico" cair em linha separada.
- **Item 11 — Novo Lead manual**: botão "Novo Lead" em CRM/Leads. Admin escolhe corretor; corretor cria apenas para si. Campos: nome, e-mail, telefone (máscara BR), origem (default "Cadastro Manual"), imóvel de interesse (select), observações. Server function com `requireSupabaseAuth` + checagem de role.

### B. Autenticação (itens 4, 5, 6)
- **Item 4 — Login após reset**: na `/reset-password`, após `updateUser({ password })` chamar `getSession()`/`refreshSession()` e redirecionar para `/admin` (Dashboard) sem novo login. Confirmar listener `onAuthStateChange` no root.
- **Item 5 — Validação de senha**: mensagens permanentes em PT-BR no formulário (helper text + erro inline). Regra nova: mín. 6 chars, letras + números, sem exigir maiúsculas/especiais. Desativar `password_hibp_enabled` se estiver ligado e conflitar.
- **Item 6 — Máscara de telefone no cadastro de usuário**: aplicar `maskPhoneBR` (já existe em `src/lib/phone-br.ts`) no form de cadastro/edição de corretores/usuários. Validar apenas celular (11 dígitos começando com 9 no 3º dígito). Validação só client-side.

### C. Atribuição de Leads (item 7)
Investigar por que leads novos não estão entrando com `corretor_id` correto. A correção anterior fazia lookup do `corretor_id` em `imoveis` no `enviarLead`, mas o filtro do Kanban provavelmente usa `assigned_to` (auth user_id), não `corretor_id` (FK em `corretores`). Plano:
1. Confirmar schema (`leads.corretor_id` vs `leads.assigned_to`, e `corretores.user_id`).
2. Em `enviarLead`, após obter `corretor_id`, buscar `corretores.user_id` e preencher também `assigned_to` (a RLS atual exige `assigned_to IS NULL`; ajustar política para permitir o backend público setar `assigned_to` derivado do imóvel — via server function autenticada com service role, mantendo segurança).
3. Backfill: rodar UPDATE para preencher `assigned_to` dos leads existentes do Rodolfo com base no `corretor_id`.
4. Validar Kanban + filtro Admin.

### D. Página pública (item 9)
- Prefixar "CRECI MG " antes do número do CRECI no banner Consultor Responsável em `imovel.$slug.tsx` e `lancamentos.$slug.tsx`.

### E. Lançamentos (itens 8, 10)
- **Item 8**: substituir amenity "Quadra" por "Churrasqueira" via migration de UPDATE (mantém id e relações). Confirmar que não existe "Churrasqueira" duplicado.
- **Item 10**: verificar estado atual — `PdfsLancamento`, `UnidadesLancamento`, `CondicoesPagamento`, `InstagramPostManager` parecem existir. Vou auditar cada um e completar o que faltar (provavelmente já 90% pronto; identificar o gap real após inspeção). **Não vou recriar do zero o que já funciona.**

### F. Hierarquia de perfis (item 12)
- Migration na enum `app_role` (já tem `admin`, `corretor`, ...). Adicionar `secretaria` se faltar. Trigger de validação em `user_roles` que impeça combinações inválidas:
  - `secretaria` não coexiste com `admin`/`corretor`.
  - `corretor` não coexiste com `secretaria`.
  - `admin` pode coexistir com `corretor` (admin atua como ambos).
- Atualizar `has_role` continua igual; criar helper `is_secretaria(uid)`.
- Telas: bloquear menu Leads/CRM/Kanban para `secretaria`; permitir visualizar Imóveis e Usuários.
- UI de gestão de usuários: trocar checkboxes livres por radio "Admin / Corretor / Secretaria" + checkbox extra "também é Corretor" só quando Admin.

## Ordem de execução proposta
1. Grupo C (atribuição de leads) — bloqueador de negócio
2. Grupo A (CRM/Leads UI + novo lead manual)
3. Grupo B (auth)
4. Grupo D (CRECI público) — trivial
5. Grupo E (lançamentos) — auditar primeiro
6. Grupo F (perfis) — mais invasivo, por último

## Perguntas antes de começar
1. **Item 7 — assigned_to**: confirmar que o filtro do Kanban filtra por `leads.assigned_to = auth.uid()` do corretor. Se sim, ok preencher `assigned_to` automaticamente no envio público (via service role no backend). Confirma?
2. **Item 11 — Imóvel de Interesse no Lead manual**: pode ser select buscável só entre imóveis publicados? Ou também lançamentos?
3. **Item 12 — Migração de usuários atuais**: hoje algum usuário tem combinação `admin+secretaria` ou `corretor+secretaria`? Se sim, qual prevalece na migração? (sugestão: promover para `corretor` se tiver corretor, senão manter admin; remover secretaria nesses casos)
4. **Item 10 — Gerador de Post Instagram**: o `InstagramPostManager` atual já gera post para imóveis. Você quer **a mesma experiência** dentro do form de Lançamento (botão "Gerar post" que cria post Instagram usando dados do empreendimento) ou algo diferente?

Confirma o plano e me responde as 4 perguntas? Aí executo tudo de uma vez, item por item, com validação ao final.
