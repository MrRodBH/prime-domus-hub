# Plano: Histórico de Interações do Lead

Conforme exigido pelo documento, apresento o relatório técnico **antes** de qualquer alteração estrutural. Nada será executado sem aprovação.

## 1. Impacto em funcionalidades existentes

Avaliei o sistema atual. A implementação **não altera** nenhuma funcionalidade publicada:

- Tabela `leads`: mantida intacta. Já possui `assigned_to` (corretor dono) e `corretor_id` — usados para checar permissão. Nenhuma coluna removida ou renomeada.
- Kanban (`_authenticated.admin.leads.tsx`): adiciono apenas o botão "Histórico" no rodapé do modal de detalhe já existente. Cards, colunas, drag-and-drop, cores e FunilChart permanecem iguais.
- RLS, políticas e tabelas existentes: sem modificação.
- Secretaria: o botão "Histórico" será renderizado apenas para Admin e dono do lead (checagem via `has_role` + `assigned_to`). Como secretaria já não enxerga dados sensíveis, nada muda para ela.

Único acréscimo estrutural: **2 novas tabelas** (`lead_atividades`, `lead_descartes`) — isoladas, sem alterar nada existente.

## 2. Novas tabelas (migration)

**`lead_atividades`** (histórico permanente, sem exclusão física)
- `lead_id` → leads
- `user_id` → auth.users (autor)
- `user_nome`, `user_perfil` (snapshot para auditoria)
- `tipo` enum: `ligacao | whatsapp | email | visita | video_chamada | reuniao_presencial | outros | descarte | ia_analise`
- `descricao` text not null (obriga texto)
- `metadata` jsonb (para descarte: motivo + detalhes; para IA: prompt/resposta)
- `created_at`, `updated_at`
- Trigger BEFORE DELETE → bloqueia exclusão (mantém auditoria)

**`lead_descartes`**
- `lead_id` (unique — 1 descarte por lead)
- `user_id`, `user_nome`
- `motivo` enum: `sem_contato | nao_e_lead | financeiro | desistiu | aluguel | outros`
- `detalhes` text not null
- `created_at`

**RLS** (sem afetar políticas existentes):
- SELECT/INSERT/UPDATE: `has_role(admin)` OU `leads.assigned_to = auth.uid()`
- DELETE: ninguém (bloqueado)
- GRANTs para `authenticated` e `service_role`

## 3. Backend (server functions novas, em `src/lib/api/historico.functions.ts`)

- `listarHistorico({ leadId })` — retorna atividades + descarte, com nome do corretor (join). Admin/dono apenas.
- `criarAtividade({ leadId, tipo, descricao })` — valida posse, registra snapshot do usuário.
- `editarAtividade({ id, descricao })` — admin ou autor (dono do lead).
- `descartarLead({ leadId, motivo, detalhes })` — valida regra especial: motivo `sem_contato` exige existir registro de `ligacao` + `whatsapp` + `email`; retorna lista de pendências. Cria registro em `lead_descartes` + atividade `descarte` no histórico + muda `leads.status = 'perdido'`.
- `analisarLeadIA({ leadId })` — usa Lovable AI Gateway (`google/gemini-3-flash-preview`) com o histórico como contexto. Retorna `proximas_acoes`, `diagnostico`, `recomendacoes`. Persiste como atividade `ia_analise`.

Filtro por corretor para admin: parâmetro opcional em `adminListarLeads` (já existente — adiciono parâmetro `corretorId` sem alterar chamadas atuais; default = sem filtro).

## 4. Frontend

**Modal de detalhe do lead** (já existe):
- Botão "Histórico" no rodapé (visível só para admin/dono).
- Abre novo dialog `LeadHistoricoDialog`.

**`LeadHistoricoDialog`** (novo componente):
- Lista cronológica de atividades com tag de data/hora `DD/MM/AAAA - HH:mm`, tipo, autor (admin vê nome do corretor), descrição.
- Botão "Nova Atividade" → seleciona tipo → textarea obrigatória → Salvar.
- Botão editar por atividade (admin/dono).
- Botão "Analisar com IA" → exibe resposta estruturada.
- Botão "Descartar Lead" — desabilitado enquanto não há atividade. Abre modal de descarte com select de motivo + textarea. Mostra erro com pendências quando motivo = sem_contato.
- Botão "Fechar".

**Kanban — Funil de Vendas:**
- Adiciono nova barra "Descartes" no bloco `ResultadosBars` (ou estendo `RESULTADO_STAGES` com agregação via `lead_descartes` count). Segue mesmo padrão: Qtde — X%.
- Acima do Kanban: filtro "Corretor" (select) visível apenas para admin.

## 5. Segurança/Auditoria

- `user_nome`/`user_perfil` gravados como snapshot no momento da ação.
- Trigger bloqueia DELETE em `lead_atividades` e `lead_descartes`.
- UPDATE permitido apenas em `descricao` (trigger valida que campos de auditoria não mudam).

## 6. Ordem de execução (após aprovação)

1. Migration (tabelas + RLS + GRANTs + trigger no-delete).
2. `historico.functions.ts` (server fns).
3. Componente `LeadHistoricoDialog` + integração no modal existente.
4. Filtro corretor + barra "Descartes" no FunilChart.

## Pergunta de aprovação

Confirma a criação das 2 tabelas novas (`lead_atividades`, `lead_descartes`) e o pequeno acréscimo de parâmetro opcional `corretorId` em `adminListarLeads` (sem quebrar chamadas atuais)? Nenhum outro ponto do sistema será tocado.
