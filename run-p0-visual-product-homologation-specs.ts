import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveP0HomologationEntry } from "./src/lib/p0-homologation-entry";
import {
  alternarEtapaPlaybookComercialSintetico,
  avancarEtapaRolloutSintetico,
  aplicarDecisaoComercialSintetica,
  calcularComparativoPlaybooksSinteticos,
  calcularMonitoramentoResultadosRolloutSintetico,
  calcularHistoricoDecisoesRolloutsSinteticos,
  calcularAprendizadoCruzadoRolloutsSinteticos,
  calcularPortfolioExperimentosSinteticos,
  calcularResumoExperimentosPlaybooksSinteticos,
  calcularResumoPortfolioExperimentosSinteticos,
  calcularResumoRolloutsSinteticos,
  calcularResumoMonitoramentoRolloutsSinteticos,
  calcularProgressoRolloutSintetico,
  calcularProgressoPlaybookSintetico,
  calcularResumoPlaybooksComerciaisSinteticos,
  calcularResumoResultadosPlaybooksSinteticos,
  calcularResumoDecisoesComerciaisSinteticas,
  calcularInsightsComerciaisSinteticos,
  calcularPrevisaoSintetica,
  calcularRelatorioComercialSintetico,
  criarExperimentoComparativoPlaybookSintetico,
  registrarDecisaoOwnerPortfolioSintetica,
  registrarResultadoEtapaRolloutSintetico,
  pausarRolloutSintetico,
  registrarResultadoPlaybookComercialSintetico,
  registrarResultadoVersaoExperimentoSintetico,
  reaplicarAprendizadoEmNovoPlaybookSintetico,
  retomarRolloutSintetico,
  reverterRolloutSintetico,
  removerExperimentoPorPlaybookMelhoriaSintetico,
  removerPlaybookMelhoriaContinuaPorOrigem,
  removerResultadoPlaybookComercialSintetico,
  sincronizarPlaybookComDecisaoSintetica,
  sincronizarRolloutComDecisaoOwnerSintetica,
  simularReaplicacaoAprendizadoEntreRolloutsSinteticos,
} from "./src/components/demo/demo-data";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
let assertions = 0;

function ok(value: unknown, message: string): asserts value {
  assert.ok(value, message);
  assertions += 1;
}

const requiredFiles = [
  "src/routes/demonstracao.tsx",
  "src/routes/design-system.tsx",
  "src/components/demo/DemoWorkspace.tsx",
  "src/components/demo/demo-data.ts",
  "src/components/demo/SyntheticWorkflowDialogs.tsx",
];

for (const path of requiredFiles) {
  ok(existsSync(resolve(root, path)), `a superfície visual deve conter ${path}`);
}

const demonstration = read(requiredFiles[0]);
const designSystem = read(requiredFiles[1]);
const workspace = read(requiredFiles[2]);
const data = read(requiredFiles[3]);
const workflows = read(requiredFiles[4]);
const syntheticForecast = data;
const dialog = read("src/components/ui/dialog.tsx");
const routeTree = read("src/routeTree.gen.ts");
const auth = read("src/routes/auth.tsx");
const contexts = read("src/components/workspace/contexts.ts");
const dashboardFeed = read("src/components/dashboard/DashboardInsightFeed.tsx");
const publicTenantGuards = read("src/lib/public-tenant-read-guards.ts");
const rootRoute = read("src/routes/__root.tsx");
const serverErrorPage = read("src/lib/error-page.ts");
const serverEntry = read("src/server.ts");
const priorityAdminSurfaces = [
  "src/routes/_authenticated.admin.marketing.tsx",
  "src/routes/_authenticated.admin.tracking.tsx",
  "src/routes/_authenticated.admin.portais.tsx",
]
  .map(read)
  .join("\n");
const combinedPublicSurface = `${demonstration}\n${designSystem}\n${workspace}\n${data}\n${workflows}`;

for (const route of ["/demonstracao", "/design-system"]) {
  ok(routeTree.includes(route), `a árvore gerada deve registrar ${route}`);
}

ok(demonstration.includes("ssr: false"), "a demonstração deve evitar dependências SSR");
ok(designSystem.includes("ssr: false"), "os padrões visuais devem evitar dependências SSR");
ok(auth.includes('to="/demonstracao"'), "a tela de acesso deve oferecer a demonstração");
ok(
  demonstration.includes("Demonstração da plataforma — Real One"),
  "a demonstração deve identificar a Real One como plataforma SaaS",
);
ok(
  workspace.includes("Plataforma SaaS") && workspace.includes("Empresa demonstrativa"),
  "o app shell deve distinguir a plataforma do tenant",
);
ok(
  data.includes("realone.com.br") && data.includes("rmprimeimoveis.com.br"),
  "a interface deve apresentar os domínios nos contextos corretos",
);
ok(
  workspace.includes("rmprimeimoveis.com.br/imoveis") &&
    !workspace.includes("realone.com.br/imoveis"),
  "a prévia do site deve usar o domínio do tenant, não o domínio da plataforma",
);
ok(
  designSystem.includes("Domínio da plataforma") &&
    designSystem.includes("Domínio da primeira empresa"),
  "a biblioteca visual deve documentar a separação de identidade",
);
ok(
  publicTenantGuards.includes('"/demonstracao", "/design-system"'),
  "a demonstração e os padrões visuais devem abrir sem consultar tenant",
);
ok(
  rootRoute.includes("Não foi possível carregar esta página") &&
    serverErrorPage.includes("Não foi possível carregar esta página"),
  "as mensagens de falha devem permanecer em PT-BR",
);
ok(
  serverEntry.includes('request.headers.get("x-forwarded-host") ?? request.headers.get("host")') &&
    serverEntry.includes("status: 302") &&
    serverEntry.includes("location: homologationEntry"),
  "a entrada do runtime deve priorizar o host público encaminhado antes da resolução comercial",
);
assert.equal(
  resolveP0HomologationEntry("https://realone.com.br/"),
  "https://realone.com.br/demonstracao",
);
assertions += 1;
assert.equal(
  resolveP0HomologationEntry("https://www.realone.com.br/?origem=teste"),
  "https://www.realone.com.br/demonstracao",
);
assertions += 1;
assert.equal(
  resolveP0HomologationEntry(
    "https://id-preview--982b91d8-946d-4103-8eb3-40ddbaeedbf4.lovable.app/",
  ),
  "https://id-preview--982b91d8-946d-4103-8eb3-40ddbaeedbf4.lovable.app/demonstracao",
);
assertions += 1;
assert.equal(
  resolveP0HomologationEntry("https://preview--prime-domus-hub.lovable.app/"),
  "https://preview--prime-domus-hub.lovable.app/demonstracao",
);
assertions += 1;
assert.equal(
  resolveP0HomologationEntry("http://runtime-interno/", "realone.com.br"),
  "https://realone.com.br/demonstracao",
);
assertions += 1;
assert.equal(
  resolveP0HomologationEntry(
    "http://runtime-interno/",
    "id-preview--982b91d8-946d-4103-8eb3-40ddbaeedbf4.lovable.app",
  ),
  "https://id-preview--982b91d8-946d-4103-8eb3-40ddbaeedbf4.lovable.app/demonstracao",
);
assertions += 1;
assert.equal(
  resolveP0HomologationEntry("https://realone.com.br/", "dominio-nao-autorizado.example"),
  null,
);
assertions += 1;
for (const url of [
  "https://realone.com.br/auth",
  "https://realone.com.br/imoveis",
  "https://outro-dominio.example/",
]) {
  assert.equal(resolveP0HomologationEntry(url), null);
  assertions += 1;
}

for (const moduleLabel of [
  "Visão geral",
  "Funil de vendas",
  "Imóveis",
  "Leads",
  "Agenda da equipe",
  "Campanhas",
  "Análises",
  "Inteligência artificial",
  "Sites e páginas",
  "Integrações",
]) {
  ok(workspace.includes(moduleLabel), `o módulo deve usar label PT-BR: ${moduleLabel}`);
}

for (const integration of [
  "Meta Ads",
  "Google Ads",
  "Meta Pixel",
  "API de Conversões",
  "Google Tag Manager",
  "Instagram",
  "WhatsApp",
  "Portais imobiliários",
]) {
  ok(data.includes(integration), `a central deve representar ${integration}`);
}

for (const forbiddenSecret of [
  "SUPABASE_SERVICE_ROLE_KEY",
  "CLOUDFLARE_API_TOKEN",
  "password:",
  "service_role",
]) {
  ok(
    !combinedPublicSurface.includes(forbiddenSecret),
    `a superfície pública não deve conter ${forbiddenSecret}`,
  );
}

for (const forbiddenProviderImport of [
  "@/integrations/supabase",
  "cloudflare-adapter",
  "useMutation",
  "createServerFn",
]) {
  ok(
    !combinedPublicSurface.includes(forbiddenProviderImport),
    `a demonstração deve permanecer sintética: ${forbiddenProviderImport}`,
  );
}

for (const forbiddenVisibleLabel of [
  "server-owned",
  "Data completeness",
  'label: "Pipeline"',
  'label: "Tracking"',
  'label: "Tenants"',
  'label: "Control Plane"',
  'label: "DLQ"',
]) {
  ok(
    !`${workspace}\n${contexts}\n${dashboardFeed}`.includes(forbiddenVisibleLabel),
    `a interface prioritária não deve exibir label técnico em inglês: ${forbiddenVisibleLabel}`,
  );
}

for (const forbiddenPriorityLabel of [
  'title="loading"',
  'title="empty"',
  'title="error"',
  ">Connectors<",
  ">Providers<",
  ">Conversion events<",
  ">Retry<",
  ">Cancel<",
  "Selecione um connector.",
  "Selecione um provider.",
  'label="Slug persistido"',
]) {
  ok(
    !priorityAdminSurfaces.includes(forbiddenPriorityLabel),
    `a operação prioritária deve apresentar PT-BR amigável: ${forbiddenPriorityLabel}`,
  );
}

const paletteEntries = data.match(/#[0-9a-f]{6}/gi) ?? [];
ok(new Set(paletteEntries).size >= 7, "os gráficos devem usar ao menos sete cores distintas");
ok(workspace.includes("ResponsiveContainer"), "os gráficos devem responder à largura da tela");
ok(workspace.includes("<Legend"), "gráficos multissérie devem apresentar legenda");
ok(workspace.includes("lg:hidden"), "a navegação deve oferecer modo móvel");
ok(workspace.includes("lg:flex"), "a navegação deve oferecer modo desktop");
ok(workspace.includes("dados inteiramente fictícios"), "o caráter sintético deve estar explícito");
ok(
  workspace.includes('from "sonner"') && workspace.includes("Nenhum dado real foi alterado."),
  "ações de homologação devem responder sem persistir dados reais",
);
ok(
  workspace.includes("propriedadesFiltradas") && workspace.includes("leadsFiltrados"),
  "as buscas de imóveis e contatos devem filtrar os dados sintéticos",
);
ok(
  (workspace.match(/aria-live="polite"/g) ?? []).length >= 2,
  "resultados das buscas devem ser anunciados de forma acessível",
);
ok(
  workspace.includes("Nenhum imóvel encontrado") &&
    workspace.includes("Nenhum contato corresponde à busca"),
  "as buscas devem apresentar estados vazios amigáveis",
);
ok(
  workspace.includes("window.location.hash.slice(1)") &&
    workspace.includes('window.addEventListener("hashchange"'),
  "cada módulo deve poder ser aberto por um endereço compartilhável",
);
ok(
  workspace.includes('aria-label="Filtrar imóveis por disponibilidade"') &&
    workspace.includes('aria-label="Ordenar imóveis"'),
  "o catálogo deve oferecer filtros sintéticos funcionais e autoexplicativos",
);
ok(
  workspace.includes('aria-label="Filtrar contatos por prioridade"') &&
    workspace.includes("prioridadeLead"),
  "a gestão de leads deve filtrar prioridades sintéticas na própria tela",
);
ok(
  workspace.includes('className="grid gap-3 p-4 md:hidden"') &&
    workspace.includes('className="hidden overflow-x-auto md:block"'),
  "leads devem usar cartões no celular e tabela em telas maiores",
);
ok(
  workspace.includes("Bom trabalho, equipe comercial") &&
    !workspace.includes("Bom trabalho, Rodolfo"),
  "a demonstração pública deve acolher owner e equipe sem personalização fixa",
);
for (const workflowTitle of [
  "Novo contato de demonstração",
  "Cadastrar imóvel de demonstração",
  "Planejar campanha de demonstração",
  "Criar página de demonstração",
  "Criar proposta de demonstração",
  "Atualizar negociação de demonstração",
  "Gerenciar tarefas de demonstração",
]) {
  ok(workflows.includes(workflowTitle), `a homologação deve oferecer a jornada: ${workflowTitle}`);
}
ok(
  (workflows.match(/evento\.preventDefault\(\)/g) ?? []).length === 8,
  "os oito formulários devem permanecer sob controle local",
);
ok(
  workflows.includes("permanece apenas nesta sessão") &&
    workflows.includes("será descartado ao recarregar"),
  "os formulários devem explicar a persistência exclusivamente em memória",
);
ok(
  workflows.includes('role="alert"') && workflows.includes("Informe o nome completo do contato"),
  "validações devem apresentar mensagens amigáveis em PT-BR",
);
ok(
  workspace.includes("setLeadsCriados") &&
    workspace.includes("setImoveisCriados") &&
    workspace.includes("setCampanhasCriadas") &&
    workspace.includes("setPaginasCriadas"),
  "registros sintéticos devem aparecer imediatamente nas quatro jornadas",
);
ok(
  workflows.includes('rotulo="Imóvel de interesse"') &&
    workflows.includes("imovelSelecionado: string") &&
    workspace.includes("Imóvel vinculado:"),
  "o novo contato deve selecionar um imóvel disponível na mesma sessão",
);
ok(
  workspace.includes("onEncaminharAoFunil") &&
    workspace.includes("Contato encaminhado ao funil") &&
    workspace.includes('selecionarModulo("funil")'),
  "a gestão de leads deve encaminhar o contato sintético ao funil",
);
ok(
  workspace.includes("contatosEncaminhados") && workspace.includes("Jornada sintética"),
  "o funil deve destacar os contatos encaminhados durante a sessão",
);
ok(
  workflows.includes('rotulo="Página de destino"') &&
    workflows.includes("paginaDestino: string") &&
    workflows.includes("paginaTitulo: string"),
  "o planejamento da campanha deve associar uma página disponível",
);
ok(
  workspace.includes("campanhaCriadaDaSessao") && workspace.includes("Página de destino"),
  "a campanha criada deve exibir sua página de destino",
);
ok(
  workspace.includes("Associada a 1 campanha sintética") &&
    workspace.includes("campanhasCriadas.filter"),
  "a área de sites deve informar as campanhas associadas ao rascunho",
);
ok(
  workflows.includes("Simular captação de lead") &&
    workflows.includes('rotulo="Campanha de origem"') &&
    workflows.includes("Página associada à campanha"),
  "a campanha deve oferecer uma captação sintética com página e origem explícitas",
);
ok(
  workflows.includes("Consentimento fictício confirmado") &&
    workflows.includes('rotulo="Nome completo do lead"') &&
    workflows.includes('rotulo="Telefone com DDD"'),
  "a captação deve validar dados e consentimento em PT-BR",
);
ok(
  workflows.includes("campanhaOrigem: campanha.nome") &&
    workflows.includes("paginaOrigem: campanha.paginaDestino") &&
    workflows.includes("captadoPorCampanha: true") &&
    workflows.includes("encaminhadoAoFunil: true"),
  "o lead captado deve preservar atribuição e entrar automaticamente no funil",
);
ok(
  workspace.includes("captarLeadDaCampanha") &&
    workspace.includes("Lead captado e enviado ao funil") &&
    workspace.includes("totalLeads") &&
    workspace.includes("Indicadores atualizados pela jornada sintética"),
  "a jornada deve atualizar campanha, funil e Dashboard na mesma sessão",
);
ok(
  workspace.includes("Campanha de origem:") && workspace.includes("contatoCriado.campanhaOrigem"),
  "Leads e funil devem mostrar a campanha e a página de origem",
);
ok(
  workflows.includes("Acompanhar lead de demonstração") &&
    workflows.includes('rotulo="Situação da qualificação"') &&
    workflows.includes("Registro do atendimento") &&
    workflows.includes('rotulo="Próxima etapa do funil"'),
  "o acompanhamento deve apresentar campos amigáveis em PT-BR",
);
ok(
  workflows.includes('rotulo="Data da visita"') &&
    workflows.includes('rotulo="Horário da visita"') &&
    workflows.includes("Agendamento fictício da visita"),
  "o acompanhamento deve permitir agendar uma visita exclusivamente fictícia",
);
ok(
  workflows.includes('"Novos contatos"') &&
    workflows.includes('"Em atendimento"') &&
    workflows.includes('"Visita agendada"') &&
    workflows.includes("proximaEtapaPermitida") &&
    workflows.includes("Avançar para"),
  "o funil deve permitir somente a próxima etapa controlada",
);
ok(
  workflows.includes("Marque o lead como qualificado antes de avançar") &&
    workflows.includes("Escolha uma data de hoje ou futura") &&
    workflows.includes("Informe o horário da visita fictícia"),
  "o acompanhamento deve validar qualificação e visita em PT-BR",
);
ok(
  workspace.includes("salvarAcompanhamento") &&
    workspace.includes('titulo: "Atendimento registrado"') &&
    workspace.includes('titulo: "Lead qualificado"') &&
    workspace.includes('titulo: "Avanço de etapa"') &&
    workspace.includes('titulo: "Visita agendada"'),
  "a jornada deve registrar um histórico temporal do atendimento",
);
ok(
  workspace.includes("contatosCriadosNaEtapa") &&
    workspace.includes('contato.etapa === "Novo contato"') &&
    workspace.includes("AcompanharLeadSinteticoDialog"),
  "o contato deve mover de coluna e continuar acompanhável no funil",
);
ok(
  workspace.includes("Indicadores do acompanhamento nesta sessão") &&
    workspace.includes('rotulo="Leads qualificados"') &&
    workspace.includes('rotulo="Visitas agendadas"') &&
    workspace.includes('rotulo="Avanços no funil"'),
  "o Dashboard deve refletir qualificação, visita e avanços da sessão",
);
ok(
  workflows.includes('rotulo="Valor proposto (R$)"') &&
    workflows.includes('rotulo="Validade da proposta"') &&
    workflows.includes("Condições da proposta") &&
    workflows.includes("Criar proposta fictícia"),
  "a proposta deve registrar valor, validade e condições em PT-BR",
);
ok(
  workflows.includes("Registro da negociação") &&
    workflows.includes('rotulo="Resultado da negociação"') &&
    workflows.includes('rotulo="Motivo do resultado"'),
  "a negociação deve registrar conversa, resultado e motivo amigável",
);
for (const motivo of [
  "Condições aceitas pelo cliente",
  "Imóvel aderente às necessidades",
  "Valor acima do esperado",
  "Cliente escolheu outro imóvel",
  "Financiamento não aprovado",
]) {
  ok(workflows.includes(motivo), `a decisão deve oferecer o motivo amigável: ${motivo}`);
}
ok(
  workflows.includes("Proposta fictícia criada") &&
    workflows.includes("Visita agendada → Proposta enviada") &&
    workflows.includes('tipo: "Proposta"'),
  "a criação da proposta deve avançar o funil e entrar no histórico",
);
ok(
  workflows.includes('titulo: estado === "Ganha" ? "Negócio ganho" : "Negócio perdido"') &&
    workflows.includes("Proposta enviada → ${etapaDestino}") &&
    workflows.includes('tipo: "Resultado"'),
  "ganho ou perda deve produzir resultado terminal auditável no histórico",
);
ok(
  data.includes('nome: "Negócio perdido"') &&
    data.includes('cor: "bg-rose-500"') &&
    workspace.includes('contato.etapa === "Negócio perdido"'),
  "o funil deve representar visualmente a etapa terminal de negócio perdido",
);
ok(
  workspace.includes("salvarPropostaSintetica") &&
    workspace.includes("PropostaEFechamentoSinteticoDialog") &&
    workspace.includes("Jornada concluída:"),
  "Funil e Leads devem operar a proposta e expor seu resultado",
);
ok(
  workspace.includes("Indicadores da proposta e fechamento nesta sessão") &&
    workspace.includes('rotulo="Propostas criadas"') &&
    workspace.includes('rotulo="Em negociação"') &&
    workspace.includes('rotulo="Negócios ganhos"') &&
    workspace.includes('rotulo="Negócios perdidos"'),
  "o Dashboard deve refletir proposta, negociação, ganho e perda",
);
ok(
  workspace.includes("valorNegociosGanhosSinteticos") &&
    workspace.includes("38_700_000 + valorNegociosGanhosSinteticos"),
  "o valor geral de vendas deve incorporar somente negócios sintéticos ganhos",
);
ok(
  workflows.includes('rotulo="Tarefa"') &&
    workflows.includes("Próxima ação") &&
    workflows.includes('rotulo="Responsável pela tarefa"') &&
    workflows.includes('rotulo="Prazo da tarefa"') &&
    workflows.includes('rotulo="Horário da tarefa"') &&
    workflows.includes('rotulo="Prioridade"'),
  "a tarefa deve usar campos claros e autoexplicativos em PT-BR",
);
for (const valorAmigavel of [
  "Ana Ribeiro",
  "Bruno Lima",
  "Camila Torres",
  "Diego Martins",
  "Alta",
  "Média",
  "Baixa",
]) {
  ok(
    workflows.includes(valorAmigavel),
    `a distribuição da tarefa deve oferecer a opção amigável: ${valorAmigavel}`,
  );
}
ok(
  workflows.includes("Escolha um prazo de hoje ou futuro") &&
    workflows.includes("Informe o horário da tarefa fictícia para organizar a agenda") &&
    workflows.includes("Descreva a próxima ação com pelo menos 10 caracteres"),
  "prazo, horário e descrição da tarefa devem ter validações amigáveis",
);
ok(
  workflows.includes("Tarefa de acompanhamento criada") &&
    workflows.includes("Responsável distribuído") &&
    workflows.includes("Tarefa concluída") &&
    workflows.includes('tipo: "Tarefa"'),
  "criação, distribuição e conclusão devem entrar no histórico do lead",
);
ok(
  workspace.includes("salvarTarefaSintetica") &&
    workspace.includes('acao === "Criar"') &&
    workspace.includes("tarefa.responsavel") &&
    workspace.includes("historicoAtendimento: [...item.historicoAtendimento, ...novosEventos]"),
  "o estado local deve manter tarefa, responsável e histórico no mesmo lead",
);
ok(
  workspace.includes("GerenciarTarefasSinteticasDialog") &&
    workspace.includes("ResumoTarefasSinteticas") &&
    workspace.includes("Todas as tarefas foram concluídas"),
  "Funil e Leads devem exibir e operar as tarefas da sessão",
);
ok(
  workspace.includes("Tarefas e alertas da equipe nesta sessão") &&
    workspace.includes('rotulo="Tarefas pendentes"') &&
    workspace.includes('rotulo="Alta prioridade"') &&
    workspace.includes('rotulo="Vencem hoje"') &&
    workspace.includes('rotulo="Tarefas concluídas"'),
  "o Dashboard deve refletir prazos, prioridades e conclusão das tarefas",
);
ok(
  workspace.includes("ordemPrioridade") &&
    workspace.includes("a.prazo.localeCompare(b.prazo)") &&
    workspace.includes("Alertas ativos") &&
    workspace.includes("Nenhum alerta pendente nesta sessão"),
  "os alertas devem ordenar prioridade e prazo e possuir estado vazio amigável",
);
ok(
  workspace.includes("AgendaDaEquipe") &&
    workspace.includes("Visão diária") &&
    workspace.includes("Visão semanal") &&
    workspace.includes('htmlFor="agenda-data-referencia"'),
  "a agenda deve oferecer visões diária e semanal com data de referência",
);
ok(
  workspace.includes('htmlFor="agenda-responsavel"') &&
    workspace.includes("Todos os responsáveis") &&
    workspace.includes("responsavelSelecionado"),
  "a agenda deve filtrar compromissos por responsável com rótulo claro",
);
ok(
  workspace.includes("criarEventosAgendaSintetica") &&
    workspace.includes('tipo: "Visita" as const') &&
    workspace.includes('tipo: "Tarefa" as const'),
  "visitas e tarefas devem compor uma agenda unificada em memória",
);
ok(
  workspace.includes("identificarConflitosAgenda") &&
    workspace.includes("Conflito de horário") &&
    workspace.includes("Sem conflitos neste período"),
  "a agenda deve identificar conflitos fictícios e explicar quando não há conflito",
);
ok(
  workspace.includes("calcularCargaEquipeSintetica") &&
    workspace.includes("Carga equilibrada") &&
    workspace.includes("Atenção à carga") &&
    workspace.includes("Nenhuma carga pendente neste período"),
  "a agenda deve resumir a carga dos responsáveis com estados amigáveis",
);
ok(
  workspace.includes("Carga da equipe nesta sessão") &&
    workspace.includes('rotulo="Compromissos na agenda"') &&
    workspace.includes('rotulo="Conflitos de horário"') &&
    workspace.includes('rotulo="Responsáveis ativos"') &&
    workspace.includes('rotulo="Maior carga individual"'),
  "o Dashboard deve refletir agenda, conflitos e carga da equipe",
);
ok(
  workspace.includes('useState<CenarioPrevisao>("Realista")') &&
    workspace.includes("Previsão compartilhada com o Dashboard") &&
    workspace.includes("compartilhado com o Funil durante esta sessão"),
  "Dashboard e Funil devem compartilhar o cenário escolhido somente em memória",
);
for (const cenario of ["Conservador", "Realista", "Otimista"]) {
  ok(
    syntheticForecast.includes(cenario) && workspace.includes("SeletorCenarioPrevisao"),
    `a previsão deve oferecer o cenário amigável ${cenario}`,
  );
}
for (const probabilidadeAmigavel of [
  "Chance inicial",
  "Em avaliação",
  "Boa chance",
  "Chance alta",
  "Confirmado",
  "Encerrado",
]) {
  ok(
    syntheticForecast.includes(probabilidadeAmigavel),
    `a etapa deve explicar sua probabilidade como ${probabilidadeAmigavel}`,
  );
}
ok(
  workspace.includes("Receita prevista por etapa") &&
    workspace.includes("Valor em cada etapa × probabilidade ajustada pelo cenário") &&
    workspace.includes('layout="vertical"'),
  "o Dashboard deve explicar e representar a previsão por etapa em gráfico responsivo",
);
ok(
  workspace.includes("Metas fictícias por responsável") &&
    workspace.includes("Realizado") &&
    workspace.includes("% previsto"),
  "o Dashboard deve apresentar meta, realizado e previsão por responsável",
);
for (const responsavel of ["Amanda Reis", "Lucas Prado", "Bruno Lima", "Camila Torres"]) {
  ok(
    syntheticForecast.includes(responsavel),
    `a demonstração deve conter a meta fictícia de ${responsavel}`,
  );
}
ok(
  workspace.includes("Probabilidade de fechamento") &&
    workspace.includes("Receita prevista:") &&
    workspace.includes("Potencial no funil"),
  "o Funil deve refletir probabilidade, previsão e potencial por etapa",
);

const previsaoConservadora = calcularPrevisaoSintetica({
  cenario: "Conservador",
  contatos: [],
  valoresImoveis: {},
});
const previsaoRealista = calcularPrevisaoSintetica({
  cenario: "Realista",
  contatos: [],
  valoresImoveis: {},
});
const previsaoOtimista = calcularPrevisaoSintetica({
  cenario: "Otimista",
  contatos: [],
  valoresImoveis: {},
});
assert.equal(Math.round(previsaoConservadora.totalPrevisto), 26_032_000);
assertions += 1;
assert.equal(Math.round(previsaoRealista.totalPrevisto), 31_315_000);
assertions += 1;
assert.equal(Math.round(previsaoOtimista.totalPrevisto), 36_444_000);
assertions += 1;
ok(
  previsaoConservadora.totalPrevisto < previsaoRealista.totalPrevisto &&
    previsaoRealista.totalPrevisto < previsaoOtimista.totalPrevisto,
  "os três cenários devem produzir previsões crescentes e determinísticas",
);
for (const previsao of [previsaoConservadora, previsaoRealista, previsaoOtimista]) {
  assert.equal(
    Math.round(previsao.metasResponsaveis.reduce((total, meta) => total + meta.previsao, 0)),
    Math.round(previsao.totalPrevisto),
  );
  assertions += 1;
}
ok(
  workspace.includes('useState<PeriodoRelatorioComercial>("Últimos 30 dias")') &&
    workspace.includes('useState<FiltroResponsavelRelatorio>("Toda a equipe")') &&
    workspace.includes(
      "Os filtros são compartilhados entre Dashboard e Análises somente durante esta sessão",
    ),
  "Dashboard e Análises devem compartilhar filtros comerciais apenas em memória",
);
for (const periodo of ["Últimos 7 dias", "Últimos 30 dias", "Últimos 90 dias"]) {
  ok(data.includes(periodo), `o relatório deve oferecer o período amigável ${periodo}`);
}
ok(
  workspace.includes("Período do relatório") &&
    workspace.includes("Responsável comercial") &&
    workspace.includes("Toda a equipe"),
  "os filtros do relatório devem ter rótulos autoexplicativos em PT-BR",
);
ok(
  workspace.includes("Resumo comercial do período") &&
    workspace.includes("Leads no relatório") &&
    workspace.includes("Receita realizada") &&
    workspace.includes("Receita prevista"),
  "o Dashboard deve refletir o relatório comercial sintético",
);
ok(
  workspace.includes("Conversão por etapa") &&
    workspace.includes("Taxa de conversão (%)") &&
    workspace.includes("Desempenho fictício por responsável"),
  "Análises deve apresentar conversão e desempenho por responsável",
);
ok(
  workspace.includes("Meta, realizado e previsto") &&
    workspace.includes('name="Meta"') &&
    workspace.includes('name="Realizado"') &&
    workspace.includes('name="Previsto"'),
  "os gráficos devem comparar meta, realizado e previsto com legendas em PT-BR",
);
ok(
  workspace.includes("Simular exportação") &&
    workspace.includes("Exportação simulada pronta") &&
    workspace.includes("nenhum arquivo foi gerado") &&
    !workspace.includes("createObjectURL") &&
    !workspace.includes("download="),
  "a exportação deve ser somente simulada, sem criar arquivo ou download",
);
ok(
  data.includes("calcularInsightsComerciaisSinteticos") &&
    data.includes("taxaConversaoAnterior") &&
    data.includes("distanciaMetaPrevista"),
  "o motor deve calcular insights e variações comerciais de forma determinística",
);
ok(
  workspace.includes("Insights comerciais explicáveis") &&
    workspace.includes("Como foi calculado") &&
    workspace.includes("Evidência sintética"),
  "Dashboard e Análises devem explicar cálculo e evidência dos insights",
);
ok(
  workspace.includes("Alerta de desempenho") &&
    data.includes("Conversão abaixo da referência") &&
    data.includes("Previsão abaixo da meta") &&
    data.includes('unidade: "p.p."'),
  "a interface deve alertar variações de conversão e meta com unidades claras",
);
ok(
  workspace.includes("Próximas ações sugeridas") &&
    workspace.includes("Justificativa explicável") &&
    workspace.includes("Impacto esperado") &&
    workspace.includes("Resultado esperado"),
  "as recomendações devem apresentar justificativa, impacto e resultado esperado em PT-BR",
);
ok(
  workspace.includes("Recomendações comerciais explicáveis") &&
    workspace.includes("Filtros compartilhados com Dashboard e Análises") &&
    workspace.includes("Como a IA chegou a esta leitura?"),
  "IA deve refletir filtros compartilhados e explicar sua leitura",
);
ok(
  workspace.includes("Nenhuma ação será executada automaticamente") &&
    workspace.includes("Aceitar recomendação de") &&
    workspace.includes("Adiar recomendação de") &&
    workspace.includes("Dispensar recomendação de"),
  "as decisões devem permanecer sob controle humano e somente simuladas",
);
ok(
  workspace.includes("Central de decisões comerciais") &&
    workspace.includes("Visão do owner e da equipe") &&
    workspace.includes("Aguardando decisão") &&
    workspace.includes("Decisão atual:"),
  "Dashboard, Análises e IA devem refletir a Central de Decisões em PT-BR",
);
ok(
  workspace.includes("Recomendação aceita na simulação") &&
    workspace.includes("Recomendação adiada na simulação") &&
    workspace.includes("Recomendação dispensada na simulação") &&
    workspace.includes("não gerou nenhuma ação real"),
  "aceitar, adiar e dispensar devem produzir somente confirmações sintéticas",
);
ok(
  data.includes("aplicarDecisaoComercialSintetica") &&
    data.includes("calcularResumoDecisoesComerciaisSinteticas") &&
    workspace.includes("useState<DecisoesComerciaisSinteticas>({})"),
  "o estado da Central de Decisões deve existir exclusivamente em memória",
);
ok(
  workspace.includes("Playbooks comerciais aceitos") &&
    workspace.includes("Orientação para execução") &&
    workspace.includes("Prazo fictício") &&
    workspace.includes("Critério de conclusão"),
  "Dashboard, Análises e IA devem orientar a execução dos playbooks aceitos em PT-BR",
);
ok(
  workspace.includes("Concluir etapa") &&
    workspace.includes("Reabrir etapa") &&
    workspace.includes("Progresso simulado:") &&
    workspace.includes("nenhuma ação externa executada"),
  "o progresso do playbook deve ser controlável, reversível e somente simulado",
);
ok(
  data.includes("sincronizarPlaybookComDecisaoSintetica") &&
    data.includes("alternarEtapaPlaybookComercialSintetico") &&
    workspace.includes("useState<PlaybooksComerciaisSinteticos>({})"),
  "playbooks e progresso devem existir exclusivamente em memória",
);
ok(
  workspace.includes("Resultado e aprendizado") &&
    workspace.includes("Resultado fictício") &&
    workspace.includes("Impacto esperado") &&
    workspace.includes("Comparação explicável") &&
    workspace.includes("Aprendizado explicável") &&
    workspace.includes("Efetividade sintética:"),
  "Dashboard, Análises e IA devem explicar resultado, comparação, aprendizado e efetividade",
);
ok(
  workspace.includes("Conclua as 3 etapas para registrar o resultado fictício.") &&
    workspace.includes("Registrar resultado") &&
    workspace.includes("useState<ResultadosPlaybooksComerciaisSinteticos>({})"),
  "o aprendizado deve depender da conclusão e permanecer exclusivamente em memória",
);
ok(
  workspace.includes("Central de melhoria contínua") &&
    workspace.includes("Comparação de efetividade por responsável") &&
    workspace.includes("Prática fictícia mais eficaz"),
  "Dashboard, Análises e IA devem comparar playbooks e práticas por responsável",
);
ok(
  workspace.includes("Recomendação explicável de melhoria") &&
    workspace.includes("Reaplicar aprendizado") &&
    workspace.includes("Novos playbooks por aprendizado reaplicado"),
  "a melhoria contínua deve explicar a recomendação e permitir reaplicação simulada",
);
ok(
  data.includes("calcularComparativoPlaybooksSinteticos") &&
    data.includes("reaplicarAprendizadoEmNovoPlaybookSintetico") &&
    workspace.includes("useState<PlaybooksMelhoriaContinuaSinteticos>({})"),
  "comparação e reaplicação devem permanecer exclusivamente em memória",
);
ok(
  workspace.includes("Laboratório de experimentos de playbook") &&
    combinedPublicSurface.includes("Versão A — prática atual") &&
    combinedPublicSurface.includes("Versão B — prática aprimorada"),
  "Dashboard, Análises e IA devem comparar versões claras do playbook",
);
ok(
  workspace.includes("Hipótese do experimento") &&
    workspace.includes("Critério fictício de sucesso") &&
    workspace.includes("Resultado simulado") &&
    workspace.includes("Recomendação explicável:") &&
    workspace.includes("Hipótese confirmada:") &&
    workspace.includes("Hipótese não confirmada:"),
  "cada experimento deve explicar hipótese, critério, resultado e recomendação em PT-BR",
);
ok(
  workspace.includes("Manter") &&
    workspace.includes("Ajustar") &&
    workspace.includes("Encerrar") &&
    workspace.includes("useState<ExperimentosPlaybooksSinteticos>({})"),
  "as três recomendações devem existir somente no estado em memória",
);
ok(
  workspace.includes("Portfólio consolidado de experimentos") &&
    workspace.includes("Priorizar por impacto e confiança") &&
    workspace.includes("Como a prioridade foi calculada"),
  "Dashboard, Análises e IA devem apresentar o portfólio e sua priorização explicável",
);
ok(
  workspace.includes("Critérios explicáveis para decidir") &&
    workspace.includes("Recomendação atual:") &&
    workspace.includes("Decisão do owner:"),
  "o portfólio deve explicar os critérios, a recomendação e a decisão humana",
);
ok(
  workspace.includes('(["Escalar", "Repetir", "Arquivar"]') &&
    workspace.includes("onRegistrarDecisaoPortfolio") &&
    data.includes("registrarDecisaoOwnerPortfolioSintetica"),
  "o owner deve poder simular escalar, repetir ou arquivar sem ação externa",
);
ok(
  data.includes("pontuacaoImpacto * 0.6 + pontuacaoConfianca * 0.4") &&
    data.includes("delete experimentoRevalidado.decisaoOwner"),
  "a prioridade deve ser transparente e uma nova evidência deve invalidar decisão anterior",
);
ok(
  workspace.includes("Governança de rollout dos experimentos") &&
    workspace.includes("Público fictício da etapa") &&
    workspace.includes("Etapas de expansão fictícia"),
  "Dashboard, Análises e IA devem acompanhar público, etapas e progresso do rollout",
);
ok(
  workspace.includes("Limites de segurança") &&
    workspace.includes("Critérios explicáveis de pausa") &&
    workspace.includes("Critérios explicáveis de reversão"),
  "a governança deve explicar limites, pausa e reversão em PT-BR",
);
ok(
  workspace.includes("Avançar rollout de") &&
    workspace.includes("Pausar rollout de") &&
    workspace.includes("Retomar rollout de") &&
    workspace.includes("Reverter rollout de"),
  "os controles humanos do rollout devem ter rótulos acessíveis e amigáveis",
);
ok(
  workspace.includes("useState<RolloutsExperimentosSinteticos>(") &&
    data.includes("sincronizarRolloutComDecisaoOwnerSintetica"),
  "os rollouts devem permanecer exclusivamente em memória e vinculados à decisão aprovada",
);
ok(
  workspace.includes("Monitoramento de resultados e aprendizado") &&
    workspace.includes("Evidências fictícias por etapa") &&
    workspace.includes("Efetividade média"),
  "Dashboard, Análises e IA devem acompanhar os resultados fictícios por etapa",
);
ok(
  workspace.includes("Aprendizado consolidado") &&
    workspace.includes("Por que esta recomendação") &&
    workspace.includes("Limite fictício: 80%"),
  "o monitoramento deve explicar desvios, consolidar aprendizados e manter o limite visível",
);
ok(
  workspace.includes("Recomendação:") &&
    workspace.includes("Continuar") &&
    workspace.includes("Pausar") &&
    workspace.includes("Reverter"),
  "a recomendação simulada deve cobrir continuar, pausar e reverter",
);
ok(
  workspace.includes("não avança, pausa ou reverte automaticamente") &&
    workspace.includes("useState<RolloutsExperimentosSinteticos>(") &&
    data.includes("registrarResultadoEtapaRolloutSintetico"),
  "resultados e recomendações devem permanecer em memória e sob decisão humana",
);

ok(
  workspace.includes("Histórico de decisões e aprendizado cruzado") &&
    workspace.includes("Comparação entre experimentos") &&
    workspace.includes("Padrões entre experimentos"),
  "Dashboard, Análises e IA devem comparar experimentos e consolidar padrões explicáveis",
);
ok(
  workspace.includes("Trilha explicável das recomendações") &&
    workspace.includes("Simular reaplicação segura") &&
    workspace.includes("A simulação não altera clientes, campanhas, sistemas externos ou decisões reais"),
  "o histórico deve rastrear recomendações e preservar a simulação exclusivamente em memória",
);
ok(
  data.includes("calcularHistoricoDecisoesRolloutsSinteticos") &&
    data.includes("calcularAprendizadoCruzadoRolloutsSinteticos") &&
    data.includes("simularReaplicacaoAprendizadoEntreRolloutsSinteticos"),
  "histórico, comparação e reaplicação devem usar funções sintéticas determinísticas",
);

const relatorio30Dias = calcularRelatorioComercialSintetico({
  periodo: "Últimos 30 dias",
  responsavel: "Toda a equipe",
  resumoPrevisao: previsaoRealista,
});
assert.deepEqual(
  {
    leads: relatorio30Dias.totais.leads,
    visitas: relatorio30Dias.totais.visitas,
    propostas: relatorio30Dias.totais.propostas,
    ganhos: relatorio30Dias.totais.ganhos,
    perdidos: relatorio30Dias.totais.perdidos,
  },
  { leads: 421, visitas: 173, propostas: 68, ganhos: 35, perdidos: 23 },
);
assertions += 1;
assert.equal(relatorio30Dias.totais.meta, 52_000_000);
assertions += 1;
assert.equal(relatorio30Dias.totais.realizado, 4_900_000);
assertions += 1;
assert.equal(Math.round(relatorio30Dias.totais.previsto), 31_315_000);
assertions += 1;
assert.deepEqual(
  relatorio30Dias.conversaoEtapas.map((etapa) => etapa.etapa),
  [
    "Novos contatos",
    "Em atendimento",
    "Visita agendada",
    "Proposta enviada",
    "Negócio fechado",
    "Negócio perdido",
  ],
);
assertions += 1;
assert.equal(relatorio30Dias.conversaoEtapas[0].taxa, 100);
assertions += 1;

const relatorio7Dias = calcularRelatorioComercialSintetico({
  periodo: "Últimos 7 dias",
  responsavel: "Toda a equipe",
  resumoPrevisao: previsaoRealista,
});
const relatorio90Dias = calcularRelatorioComercialSintetico({
  periodo: "Últimos 90 dias",
  responsavel: "Toda a equipe",
  resumoPrevisao: previsaoRealista,
});
ok(
  relatorio7Dias.totais.leads < relatorio30Dias.totais.leads &&
    relatorio30Dias.totais.leads < relatorio90Dias.totais.leads,
  "os períodos devem produzir volumes crescentes e determinísticos",
);
const relatorioAmanda = calcularRelatorioComercialSintetico({
  periodo: "Últimos 30 dias",
  responsavel: "Amanda Reis",
  resumoPrevisao: previsaoRealista,
});
assert.equal(relatorioAmanda.desempenho.length, 1);
assertions += 1;
assert.equal(relatorioAmanda.desempenho[0].responsavel, "Amanda Reis");
assertions += 1;
assert.equal(relatorioAmanda.totais.leads, 128);
assertions += 1;
const insightsEquipe = calcularInsightsComerciaisSinteticos({ relatorio: relatorio30Dias });
assert.equal(Math.round(insightsEquipe.variacaoConversao * 10) / 10, 0.9);
assertions += 1;
assert.equal(Math.round(insightsEquipe.coberturaMetaPrevista * 10) / 10, 60.2);
assertions += 1;
assert.equal(Math.round(insightsEquipe.distanciaMetaPrevista * 10) / 10, -39.8);
assertions += 1;
assert.equal(insightsEquipe.insights.length, 3);
assertions += 1;
assert.equal(insightsEquipe.alertas.length, 2);
assertions += 1;
assert.equal(insightsEquipe.recomendacoes.length, 4);
assertions += 1;
assert.equal(insightsEquipe.alertas[0].unidade, "p.p.");
assertions += 1;
ok(
  insightsEquipe.recomendacoes.every((recomendacao) => recomendacao.impactoEsperado.length > 20),
  "cada recomendação deve informar impacto esperado amigável",
);
const decisoesVazias = {};
const decisaoAmandaAceita = aplicarDecisaoComercialSintetica({
  decisoes: decisoesVazias,
  periodo: "Últimos 30 dias",
  recomendacao: insightsEquipe.recomendacoes[0],
  estado: "Aceita",
});
const decisaoLucasAdiada = aplicarDecisaoComercialSintetica({
  decisoes: decisaoAmandaAceita,
  periodo: "Últimos 30 dias",
  recomendacao: insightsEquipe.recomendacoes[1],
  estado: "Adiada",
});
const decisoesDoRecorte = aplicarDecisaoComercialSintetica({
  decisoes: decisaoLucasAdiada,
  periodo: "Últimos 30 dias",
  recomendacao: insightsEquipe.recomendacoes[2],
  estado: "Dispensada",
});
assert.deepEqual(
  calcularResumoDecisoesComerciaisSinteticas({
    decisoes: decisoesDoRecorte,
    periodo: "Últimos 30 dias",
    recomendacoes: insightsEquipe.recomendacoes,
  }),
  { Pendente: 1, Aceita: 1, Adiada: 1, Dispensada: 1 },
);
assertions += 1;
assert.deepEqual(decisoesVazias, {});
assertions += 1;
assert.deepEqual(
  calcularResumoDecisoesComerciaisSinteticas({
    decisoes: decisoesDoRecorte,
    periodo: "Últimos 7 dias",
    recomendacoes: insightsEquipe.recomendacoes,
  }),
  { Pendente: 4, Aceita: 0, Adiada: 0, Dispensada: 0 },
);
assertions += 1;
const playbooksVazios = {};
const playbooksAmanda = sincronizarPlaybookComDecisaoSintetica({
  playbooks: playbooksVazios,
  periodo: "Últimos 30 dias",
  recomendacao: insightsEquipe.recomendacoes[0],
  estado: "Aceita",
});
const playbookAmanda = Object.values(playbooksAmanda)[0];
assert.equal(Object.keys(playbooksAmanda).length, 1);
assertions += 1;
assert.equal(playbookAmanda.responsavel, "Amanda Reis");
assertions += 1;
assert.equal(playbookAmanda.etapas.length, 3);
assertions += 1;
ok(
  playbookAmanda.prazoFicticio.includes("fictício") &&
    playbookAmanda.etapas.every(
      (etapa) => etapa.orientacao.length > 20 && etapa.criterioConclusao.length > 20,
    ),
  "cada playbook deve conter prazo e três etapas orientadas com critérios claros",
);
const playbooksAmandaComEtapa = alternarEtapaPlaybookComercialSintetico({
  playbooks: playbooksAmanda,
  playbookId: playbookAmanda.id,
  etapaId: playbookAmanda.etapas[0].id,
});
assert.equal(calcularProgressoPlaybookSintetico(playbooksAmandaComEtapa[playbookAmanda.id]), 33);
assertions += 1;
assert.deepEqual(
  calcularResumoPlaybooksComerciaisSinteticos({
    playbooks: playbooksAmandaComEtapa,
    decisoes: decisaoAmandaAceita,
    periodo: "Últimos 30 dias",
    recomendacoes: insightsEquipe.recomendacoes,
  }),
  { playbooksAtivos: 1, totalEtapas: 3, etapasConcluidas: 1, progressoMedio: 33 },
);
assertions += 1;
let playbooksAmandaConcluido = playbooksAmandaComEtapa;
for (const etapa of playbookAmanda.etapas.slice(1)) {
  playbooksAmandaConcluido = alternarEtapaPlaybookComercialSintetico({
    playbooks: playbooksAmandaConcluido,
    playbookId: playbookAmanda.id,
    etapaId: etapa.id,
  });
}
assert.equal(calcularProgressoPlaybookSintetico(playbooksAmandaConcluido[playbookAmanda.id]), 100);
assertions += 1;
const resultadosVazios = {};
const resultadoAntesDaConclusao = registrarResultadoPlaybookComercialSintetico({
  resultados: resultadosVazios,
  playbook: playbooksAmandaComEtapa[playbookAmanda.id],
  recomendacao: insightsEquipe.recomendacoes[0],
  faixa: "Dentro do esperado",
});
assert.equal(resultadoAntesDaConclusao, resultadosVazios);
assertions += 1;
const resultadoAmandaDentro = registrarResultadoPlaybookComercialSintetico({
  resultados: resultadosVazios,
  playbook: playbooksAmandaConcluido[playbookAmanda.id],
  recomendacao: insightsEquipe.recomendacoes[0],
  faixa: "Dentro do esperado",
});
assert.deepEqual(
  {
    faixa: resultadoAmandaDentro[playbookAmanda.id].faixa,
    efetividade: resultadoAmandaDentro[playbookAmanda.id].efetividade,
    impactoEsperado: resultadoAmandaDentro[playbookAmanda.id].impactoEsperado,
  },
  {
    faixa: "Dentro do esperado",
    efetividade: 76,
    impactoEsperado: insightsEquipe.recomendacoes[0].impactoEsperado,
  },
);
assertions += 1;
ok(
  resultadoAmandaDentro[playbookAmanda.id].comparacaoExplicavel.length > 40 &&
    resultadoAmandaDentro[playbookAmanda.id].aprendizadoExplicavel.length > 40,
  "o resultado concluído deve explicar a comparação e o aprendizado em PT-BR",
);
assert.deepEqual(
  calcularResumoResultadosPlaybooksSinteticos({
    resultados: resultadoAmandaDentro,
    playbooks: playbooksAmandaConcluido,
    decisoes: decisaoAmandaAceita,
    periodo: "Últimos 30 dias",
    recomendacoes: insightsEquipe.recomendacoes,
  }),
  { playbooksConcluidos: 1, resultadosRegistrados: 1, efetividadeMedia: 76 },
);
assertions += 1;
const resultadoAmandaAcima = registrarResultadoPlaybookComercialSintetico({
  resultados: resultadoAmandaDentro,
  playbook: playbooksAmandaConcluido[playbookAmanda.id],
  recomendacao: insightsEquipe.recomendacoes[0],
  faixa: "Acima do esperado",
});
assert.equal(Object.keys(resultadoAmandaAcima).length, 1);
assertions += 1;
assert.equal(resultadoAmandaAcima[playbookAmanda.id].efetividade, 94);
assertions += 1;
const resultadosAmandaRemovidos = removerResultadoPlaybookComercialSintetico(
  resultadoAmandaAcima,
  playbookAmanda.id,
);
assert.deepEqual(resultadosAmandaRemovidos, {});
assertions += 1;
assert.deepEqual(resultadosVazios, {});
assertions += 1;
const playbooksAmandaReaberto = alternarEtapaPlaybookComercialSintetico({
  playbooks: playbooksAmandaComEtapa,
  playbookId: playbookAmanda.id,
  etapaId: playbookAmanda.etapas[0].id,
});
assert.equal(calcularProgressoPlaybookSintetico(playbooksAmandaReaberto[playbookAmanda.id]), 0);
assertions += 1;
const playbooksRemovidos = sincronizarPlaybookComDecisaoSintetica({
  playbooks: playbooksAmandaComEtapa,
  periodo: "Últimos 30 dias",
  recomendacao: insightsEquipe.recomendacoes[0],
  estado: "Adiada",
});
assert.deepEqual(playbooksRemovidos, {});
assertions += 1;
assert.deepEqual(playbooksVazios, {});
assertions += 1;
let playbooksAmandaEBruno = sincronizarPlaybookComDecisaoSintetica({
  playbooks: playbooksAmandaConcluido,
  periodo: "Últimos 30 dias",
  recomendacao: insightsEquipe.recomendacoes[2],
  estado: "Aceita",
});
const playbookBruno = Object.values(playbooksAmandaEBruno).find(
  (playbook) => playbook.responsavel === "Bruno Lima",
);
ok(playbookBruno, "a comparação deve incluir o playbook fictício de Bruno Lima");
for (const etapa of playbookBruno.etapas) {
  playbooksAmandaEBruno = alternarEtapaPlaybookComercialSintetico({
    playbooks: playbooksAmandaEBruno,
    playbookId: playbookBruno.id,
    etapaId: etapa.id,
  });
}
const resultadosAmandaEBruno = registrarResultadoPlaybookComercialSintetico({
  resultados: resultadoAmandaDentro,
  playbook: playbooksAmandaEBruno[playbookBruno.id],
  recomendacao: insightsEquipe.recomendacoes[2],
  faixa: "Dentro do esperado",
});
const comparativoPlaybooks = calcularComparativoPlaybooksSinteticos({
  resultados: resultadosAmandaEBruno,
  periodo: "Últimos 30 dias",
  recomendacoes: insightsEquipe.recomendacoes,
});
assert.deepEqual(
  comparativoPlaybooks.map(({ posicao, responsavel, efetividade }) => ({
    posicao,
    responsavel,
    efetividade,
  })),
  [
    { posicao: 1, responsavel: "Bruno Lima", efetividade: 81 },
    { posicao: 2, responsavel: "Amanda Reis", efetividade: 76 },
  ],
);
assertions += 1;
ok(
  comparativoPlaybooks.every(
    (item) =>
      item.praticaEficaz.length > 20 &&
      item.justificativaPratica.length > 40 &&
      item.recomendacaoMelhoria.length > 40 &&
      item.justificativaMelhoria.length > 40,
  ),
  "cada comparação deve explicar prática, recomendação e justificativa em PT-BR",
);
const playbooksMelhoriaVazios = {};
const playbooksMelhoriaBruno = reaplicarAprendizadoEmNovoPlaybookSintetico({
  playbooks: playbooksMelhoriaVazios,
  comparacao: comparativoPlaybooks[0],
});
const novoPlaybookBruno = Object.values(playbooksMelhoriaBruno)[0];
assert.deepEqual(
  {
    responsavel: novoPlaybookBruno.responsavel,
    origemPlaybookId: novoPlaybookBruno.origemPlaybookId,
    aprendizadoBase: novoPlaybookBruno.aprendizadoBase,
    quantidadeEtapas: novoPlaybookBruno.etapas.length,
  },
  {
    responsavel: "Bruno Lima",
    origemPlaybookId: playbookBruno.id,
    aprendizadoBase: resultadosAmandaEBruno[playbookBruno.id].aprendizadoExplicavel,
    quantidadeEtapas: 3,
  },
);
assertions += 1;
assert.equal(
  reaplicarAprendizadoEmNovoPlaybookSintetico({
    playbooks: playbooksMelhoriaBruno,
    comparacao: comparativoPlaybooks[0],
  }),
  playbooksMelhoriaBruno,
);
assertions += 1;
assert.deepEqual(
  removerPlaybookMelhoriaContinuaPorOrigem(playbooksMelhoriaBruno, playbookBruno.id),
  {},
);
assertions += 1;
assert.deepEqual(playbooksMelhoriaVazios, {});
assertions += 1;
const experimentosVazios = {};
const experimentosBruno = criarExperimentoComparativoPlaybookSintetico({
  experimentos: experimentosVazios,
  playbook: novoPlaybookBruno,
});
const experimentoBruno = Object.values(experimentosBruno)[0];
assert.deepEqual(
  {
    responsavel: experimentoBruno.responsavel,
    playbookMelhoriaId: experimentoBruno.playbookMelhoriaId,
    quantidadeVersoes: experimentoBruno.versoes.length,
    rotulos: experimentoBruno.versoes.map((versao) => versao.rotulo),
    valorCriterio: experimentoBruno.valorCriterio,
  },
  {
    responsavel: "Bruno Lima",
    playbookMelhoriaId: novoPlaybookBruno.id,
    quantidadeVersoes: 2,
    rotulos: ["Versão A — prática atual", "Versão B — prática aprimorada"],
    valorCriterio: 80,
  },
);
assertions += 1;
assert.equal(
  criarExperimentoComparativoPlaybookSintetico({
    experimentos: experimentosBruno,
    playbook: novoPlaybookBruno,
  }),
  experimentosBruno,
);
assertions += 1;
assert.deepEqual(calcularResumoExperimentosPlaybooksSinteticos(experimentosBruno), {
  experimentosAtivos: 1,
  versoesAvaliadas: 0,
  comparacoesConcluidas: 0,
});
assertions += 1;
assert.deepEqual(calcularResumoPortfolioExperimentosSinteticos(experimentosBruno), {
  experimentosNoPortfolio: 1,
  prioridadesAltas: 0,
  prontosParaEscalar: 0,
  decisoesDoOwner: 0,
});
assertions += 1;
assert.equal(
  registrarDecisaoOwnerPortfolioSintetica({
    experimentos: experimentosBruno,
    experimentoId: experimentoBruno.id,
    decisao: "Escalar",
  }),
  experimentosBruno,
);
assertions += 1;
const experimentoBrunoVersaoAAbaixo = registrarResultadoVersaoExperimentoSintetico({
  experimentos: experimentosBruno,
  experimentoId: experimentoBruno.id,
  versaoId: "versao-a",
  faixa: "Abaixo do critério",
});
const experimentoBrunoEscalavel = registrarResultadoVersaoExperimentoSintetico({
  experimentos: experimentoBrunoVersaoAAbaixo,
  experimentoId: experimentoBruno.id,
  versaoId: "versao-b",
  faixa: "Acima do critério",
});
const portfolioEscalavel = calcularPortfolioExperimentosSinteticos(experimentoBrunoEscalavel);
assert.deepEqual(
  {
    diferencaVersaoB: portfolioEscalavel[0].diferencaVersaoB,
    impacto: portfolioEscalavel[0].impacto,
    confianca: portfolioEscalavel[0].confianca,
    prioridade: portfolioEscalavel[0].prioridade,
    pontuacaoPrioridade: portfolioEscalavel[0].pontuacaoPrioridade,
    recomendacaoAtual: portfolioEscalavel[0].recomendacaoAtual,
  },
  {
    diferencaVersaoB: 33,
    impacto: "Alto",
    confianca: "Alta",
    prioridade: "Alto",
    pontuacaoPrioridade: 93,
    recomendacaoAtual: "Escalar",
  },
);
assertions += 1;
const experimentoBrunoComDecisao = registrarDecisaoOwnerPortfolioSintetica({
  experimentos: experimentoBrunoEscalavel,
  experimentoId: experimentoBruno.id,
  decisao: "Escalar",
});
assert.equal(experimentoBrunoComDecisao[experimentoBruno.id].decisaoOwner?.decisao, "Escalar");
assertions += 1;
assert.deepEqual(calcularResumoPortfolioExperimentosSinteticos(experimentoBrunoComDecisao), {
  experimentosNoPortfolio: 1,
  prioridadesAltas: 1,
  prontosParaEscalar: 1,
  decisoesDoOwner: 1,
});
assertions += 1;
const rolloutsVazios = {};
assert.equal(
  sincronizarRolloutComDecisaoOwnerSintetica({
    rollouts: rolloutsVazios,
    experimento: experimentoBruno,
  }),
  rolloutsVazios,
);
assertions += 1;
const rolloutsBruno = sincronizarRolloutComDecisaoOwnerSintetica({
  rollouts: rolloutsVazios,
  experimento: experimentoBrunoComDecisao[experimentoBruno.id],
});
const rolloutBruno = Object.values(rolloutsBruno)[0];
assert.deepEqual(
  {
    responsavel: rolloutBruno.responsavel,
    estado: rolloutBruno.estado,
    etapas: rolloutBruno.etapas.map(({ titulo, percentualPublico }) => ({
      titulo,
      percentualPublico,
    })),
  },
  {
    responsavel: "Bruno Lima",
    estado: "Não iniciado",
    etapas: [
      { titulo: "Piloto interno", percentualPublico: 10 },
      { titulo: "Expansão controlada", percentualPublico: 40 },
      { titulo: "Cobertura ampliada", percentualPublico: 100 },
    ],
  },
);
assertions += 1;
ok(
  rolloutBruno.limitesSeguranca.every((limite) => limite.length > 40) &&
    rolloutBruno.criteriosPausa.every((criterio) => criterio.length > 35) &&
    rolloutBruno.criteriosReversao.every((criterio) => criterio.length > 40),
  "o rollout aprovado deve explicar limites e critérios preventivos",
);
assert.deepEqual(calcularResumoRolloutsSinteticos(rolloutsBruno), {
  rolloutsGovernados: 1,
  emAndamento: 0,
  pausados: 0,
  concluidos: 0,
});
assertions += 1;
const rolloutsBrunoEtapa1 = avancarEtapaRolloutSintetico({
  rollouts: rolloutsBruno,
  rolloutId: rolloutBruno.id,
});
assert.deepEqual(
  {
    estado: rolloutsBrunoEtapa1[rolloutBruno.id].estado,
    progresso: calcularProgressoRolloutSintetico(rolloutsBrunoEtapa1[rolloutBruno.id]),
  },
  { estado: "Em andamento", progresso: 33 },
);
assertions += 1;
assert.equal(
  registrarResultadoEtapaRolloutSintetico({
    rollouts: rolloutsBruno,
    rolloutId: rolloutBruno.id,
    etapaId: "piloto-interno",
    faixa: "Dentro do limite",
  }),
  rolloutsBruno,
);
assertions += 1;
const rolloutsBrunoMonitorado = registrarResultadoEtapaRolloutSintetico({
  rollouts: rolloutsBrunoEtapa1,
  rolloutId: rolloutBruno.id,
  etapaId: "piloto-interno",
  faixa: "Dentro do limite",
});
assert.deepEqual(
  calcularMonitoramentoResultadosRolloutSintetico(
    rolloutsBrunoMonitorado[rolloutBruno.id],
  ),
  {
    resultadosRegistrados: 1,
    efetividadeMedia: 86,
    alertasSeguranca: 0,
    violacoes: 0,
    recomendacao: "Continuar",
    explicacaoRecomendacao:
      "Os resultados fictícios permanecem dentro dos limites e sustentam continuidade controlada.",
    aprendizadoConsolidado:
      "1 etapa(s) dentro do limite, 0 em atenção e 0 com violação. 0 alerta(s) simulado(s) no total.",
  },
);
assertions += 1;
assert.deepEqual(calcularResumoMonitoramentoRolloutsSinteticos(rolloutsBrunoMonitorado), {
  resultadosMonitorados: 1,
  dentroDoLimite: 1,
  emAtencao: 0,
  limitesViolados: 0,
});
assertions += 1;
const historicoBruno = calcularHistoricoDecisoesRolloutsSinteticos(rolloutsBrunoMonitorado);
assert.deepEqual(
  {
    total: historicoBruno.length,
    faixa: historicoBruno[0]?.faixa,
    recomendacao: historicoBruno[0]?.recomendacao,
    efetividade: historicoBruno[0]?.efetividade,
  },
  { total: 1, faixa: "Dentro do limite", recomendacao: "Continuar", efetividade: 86 },
);
assertions += 1;
const rolloutBrunoComparado = {
  ...rolloutsBrunoMonitorado[rolloutBruno.id],
  id: "rollout-comparado",
  experimentoId: "experimento-comparado",
  responsavel: "Amanda Reis" as const,
  titulo: "Experimento comparado fictício",
};
const rolloutsCruzados = registrarResultadoEtapaRolloutSintetico({
  rollouts: {
    ...rolloutsBrunoMonitorado,
    [rolloutBrunoComparado.id]: rolloutBrunoComparado,
  },
  rolloutId: rolloutBrunoComparado.id,
  etapaId: "piloto-interno",
  faixa: "Atenção",
});
const aprendizadoCruzado = calcularAprendizadoCruzadoRolloutsSinteticos(rolloutsCruzados);
assert.deepEqual(
  {
    comparados: aprendizadoCruzado.comparacoes.length,
    sucesso: aprendizadoCruzado.padroes.sucesso,
    atencao: aprendizadoCruzado.padroes.atencao,
    risco: aprendizadoCruzado.padroes.risco,
    fonte: aprendizadoCruzado.fonteRecomendada?.rolloutId,
  },
  { comparados: 2, sucesso: 1, atencao: 1, risco: 0, fonte: rolloutBruno.id },
);
assertions += 1;
const rolloutsComReaplicacao = simularReaplicacaoAprendizadoEntreRolloutsSinteticos({
  rollouts: rolloutsCruzados,
  origemRolloutId: rolloutBruno.id,
  destinoRolloutId: rolloutBrunoComparado.id,
});
assert.deepEqual(
  {
    origem: rolloutsComReaplicacao[rolloutBrunoComparado.id].aprendizadoReaplicado?.origemRolloutId,
    recomendacao:
      rolloutsComReaplicacao[rolloutBrunoComparado.id].aprendizadoReaplicado?.recomendacaoRastreada,
    momento: rolloutsComReaplicacao[rolloutBrunoComparado.id].aprendizadoReaplicado?.simuladoEm,
  },
  { origem: rolloutBruno.id, recomendacao: "Continuar", momento: "Agora, nesta sessão" },
);
assertions += 1;
assert.equal(
  simularReaplicacaoAprendizadoEntreRolloutsSinteticos({
    rollouts: rolloutsCruzados,
    origemRolloutId: rolloutBrunoComparado.id,
    destinoRolloutId: rolloutBruno.id,
  }),
  rolloutsCruzados,
);
assertions += 1;

const rolloutsBrunoAtencao = registrarResultadoEtapaRolloutSintetico({
  rollouts: rolloutsBrunoMonitorado,
  rolloutId: rolloutBruno.id,
  etapaId: "piloto-interno",
  faixa: "Atenção",
});
assert.deepEqual(
  {
    desvio:
      rolloutsBrunoAtencao[rolloutBruno.id].etapas[0].resultado?.desvioDoLimite,
    recomendacao: calcularMonitoramentoResultadosRolloutSintetico(
      rolloutsBrunoAtencao[rolloutBruno.id],
    ).recomendacao,
  },
  { desvio: -4, recomendacao: "Pausar" },
);
assertions += 1;
const rolloutsBrunoViolado = registrarResultadoEtapaRolloutSintetico({
  rollouts: rolloutsBrunoAtencao,
  rolloutId: rolloutBruno.id,
  etapaId: "piloto-interno",
  faixa: "Limite violado",
});
assert.deepEqual(
  {
    efetividade:
      rolloutsBrunoViolado[rolloutBruno.id].etapas[0].resultado?.efetividade,
    alertas:
      rolloutsBrunoViolado[rolloutBruno.id].etapas[0].resultado?.alertasSeguranca,
    recomendacao: calcularMonitoramentoResultadosRolloutSintetico(
      rolloutsBrunoViolado[rolloutBruno.id],
    ).recomendacao,
  },
  { efetividade: 68, alertas: 2, recomendacao: "Reverter" },
);
assertions += 1;
const rolloutsBrunoPausado = pausarRolloutSintetico({
  rollouts: rolloutsBrunoEtapa1,
  rolloutId: rolloutBruno.id,
});
assert.equal(rolloutsBrunoPausado[rolloutBruno.id].estado, "Pausado");
assertions += 1;
assert.equal(
  avancarEtapaRolloutSintetico({
    rollouts: rolloutsBrunoPausado,
    rolloutId: rolloutBruno.id,
  }),
  rolloutsBrunoPausado,
);
assertions += 1;
const rolloutsBrunoRetomado = retomarRolloutSintetico({
  rollouts: rolloutsBrunoPausado,
  rolloutId: rolloutBruno.id,
});
assert.equal(rolloutsBrunoRetomado[rolloutBruno.id].estado, "Em andamento");
assertions += 1;
const rolloutsBrunoRevertido = reverterRolloutSintetico({
  rollouts: rolloutsBrunoRetomado,
  rolloutId: rolloutBruno.id,
});
assert.deepEqual(
  {
    estado: rolloutsBrunoRevertido[rolloutBruno.id].estado,
    progresso: calcularProgressoRolloutSintetico(rolloutsBrunoRevertido[rolloutBruno.id]),
  },
  { estado: "Revertido", progresso: 33 },
);
assertions += 1;
assert.equal(
  avancarEtapaRolloutSintetico({
    rollouts: rolloutsBrunoRevertido,
    rolloutId: rolloutBruno.id,
  }),
  rolloutsBrunoRevertido,
);
assertions += 1;
let rolloutsBrunoConcluido = rolloutsBruno;
for (const _etapa of rolloutBruno.etapas) {
  rolloutsBrunoConcluido = avancarEtapaRolloutSintetico({
    rollouts: rolloutsBrunoConcluido,
    rolloutId: rolloutBruno.id,
  });
}
assert.deepEqual(
  {
    estado: rolloutsBrunoConcluido[rolloutBruno.id].estado,
    progresso: calcularProgressoRolloutSintetico(rolloutsBrunoConcluido[rolloutBruno.id]),
    resumo: calcularResumoRolloutsSinteticos(rolloutsBrunoConcluido),
  },
  {
    estado: "Concluído",
    progresso: 100,
    resumo: { rolloutsGovernados: 1, emAndamento: 0, pausados: 0, concluidos: 1 },
  },
);
assertions += 1;
assert.equal(
  sincronizarRolloutComDecisaoOwnerSintetica({
    rollouts: rolloutsBruno,
    experimento: experimentoBrunoComDecisao[experimentoBruno.id],
  }),
  rolloutsBruno,
);
assertions += 1;
assert.deepEqual(rolloutsVazios, {});
assertions += 1;
const experimentoBrunoParaRepetir = registrarResultadoVersaoExperimentoSintetico({
  experimentos: experimentoBrunoComDecisao,
  experimentoId: experimentoBruno.id,
  versaoId: "versao-b",
  faixa: "Próximo do critério",
});
const portfolioParaRepetir = calcularPortfolioExperimentosSinteticos(experimentoBrunoParaRepetir);
assert.deepEqual(
  {
    diferencaVersaoB: portfolioParaRepetir[0].diferencaVersaoB,
    recomendacaoAtual: portfolioParaRepetir[0].recomendacaoAtual,
    decisaoOwner: portfolioParaRepetir[0].decisaoOwner,
  },
  { diferencaVersaoB: 21, recomendacaoAtual: "Repetir", decisaoOwner: undefined },
);
assertions += 1;
assert.deepEqual(
  sincronizarRolloutComDecisaoOwnerSintetica({
    rollouts: rolloutsBruno,
    experimento: experimentoBrunoParaRepetir[experimentoBruno.id],
  }),
  {},
);
assertions += 1;
const experimentoBrunoVersaoAAlta = registrarResultadoVersaoExperimentoSintetico({
  experimentos: experimentoBrunoParaRepetir,
  experimentoId: experimentoBruno.id,
  versaoId: "versao-a",
  faixa: "Acima do critério",
});
const experimentoBrunoParaArquivar = registrarResultadoVersaoExperimentoSintetico({
  experimentos: experimentoBrunoVersaoAAlta,
  experimentoId: experimentoBruno.id,
  versaoId: "versao-b",
  faixa: "Abaixo do critério",
});
const portfolioParaArquivar = calcularPortfolioExperimentosSinteticos(experimentoBrunoParaArquivar);
assert.deepEqual(
  {
    diferencaVersaoB: portfolioParaArquivar[0].diferencaVersaoB,
    impacto: portfolioParaArquivar[0].impacto,
    confianca: portfolioParaArquivar[0].confianca,
    prioridade: portfolioParaArquivar[0].prioridade,
    pontuacaoPrioridade: portfolioParaArquivar[0].pontuacaoPrioridade,
    recomendacaoAtual: portfolioParaArquivar[0].recomendacaoAtual,
  },
  {
    diferencaVersaoB: -25,
    impacto: "Baixo",
    confianca: "Alta",
    prioridade: "Médio",
    pontuacaoPrioridade: 54,
    recomendacaoAtual: "Arquivar",
  },
);
assertions += 1;
assert.deepEqual(experimentosVazios, {});
assertions += 1;
const experimentoBrunoVersaoAManter = registrarResultadoVersaoExperimentoSintetico({
  experimentos: experimentosBruno,
  experimentoId: experimentoBruno.id,
  versaoId: "versao-a",
  faixa: "Acima do critério",
});
assert.deepEqual(
  experimentoBrunoVersaoAManter[experimentoBruno.id].versoes[0].resultado && {
    efetividade:
      experimentoBrunoVersaoAManter[experimentoBruno.id].versoes[0].resultado.efetividade,
    recomendacao:
      experimentoBrunoVersaoAManter[experimentoBruno.id].versoes[0].resultado.recomendacao,
    atingiuCriterio:
      experimentoBrunoVersaoAManter[experimentoBruno.id].versoes[0].resultado.atingiuCriterio,
  },
  { efetividade: 86, recomendacao: "Manter", atingiuCriterio: true },
);
assertions += 1;
const experimentoBrunoVersaoBAjustar = registrarResultadoVersaoExperimentoSintetico({
  experimentos: experimentoBrunoVersaoAManter,
  experimentoId: experimentoBruno.id,
  versaoId: "versao-b",
  faixa: "Próximo do critério",
});
assert.deepEqual(
  experimentoBrunoVersaoBAjustar[experimentoBruno.id].versoes[1].resultado && {
    efetividade:
      experimentoBrunoVersaoBAjustar[experimentoBruno.id].versoes[1].resultado.efetividade,
    recomendacao:
      experimentoBrunoVersaoBAjustar[experimentoBruno.id].versoes[1].resultado.recomendacao,
    atingiuCriterio:
      experimentoBrunoVersaoBAjustar[experimentoBruno.id].versoes[1].resultado.atingiuCriterio,
  },
  { efetividade: 79, recomendacao: "Ajustar", atingiuCriterio: false },
);
assertions += 1;
assert.deepEqual(calcularResumoExperimentosPlaybooksSinteticos(experimentoBrunoVersaoBAjustar), {
  experimentosAtivos: 1,
  versoesAvaliadas: 2,
  comparacoesConcluidas: 1,
});
assertions += 1;
const experimentoBrunoVersaoBEncerrar = registrarResultadoVersaoExperimentoSintetico({
  experimentos: experimentoBrunoVersaoBAjustar,
  experimentoId: experimentoBruno.id,
  versaoId: "versao-b",
  faixa: "Abaixo do critério",
});
assert.deepEqual(
  experimentoBrunoVersaoBEncerrar[experimentoBruno.id].versoes[1].resultado && {
    efetividade:
      experimentoBrunoVersaoBEncerrar[experimentoBruno.id].versoes[1].resultado.efetividade,
    recomendacao:
      experimentoBrunoVersaoBEncerrar[experimentoBruno.id].versoes[1].resultado.recomendacao,
    atingiuCriterio:
      experimentoBrunoVersaoBEncerrar[experimentoBruno.id].versoes[1].resultado.atingiuCriterio,
  },
  { efetividade: 61, recomendacao: "Encerrar", atingiuCriterio: false },
);
assertions += 1;
ok(
  experimentoBrunoVersaoBEncerrar[experimentoBruno.id].versoes.every(
    (versao) =>
      Boolean(versao.resultado?.leituraExplicavel.length) &&
      Boolean(versao.resultado?.justificativaRecomendacao.length),
  ),
  "cada versão avaliada deve explicar a leitura e a recomendação",
);
assert.deepEqual(
  removerExperimentoPorPlaybookMelhoriaSintetico(
    experimentoBrunoVersaoBEncerrar,
    novoPlaybookBruno.id,
  ),
  {},
);
assertions += 1;
assert.deepEqual(experimentosVazios, {});
assertions += 1;
const insightsAmanda = calcularInsightsComerciaisSinteticos({ relatorio: relatorioAmanda });
assert.equal(insightsAmanda.recomendacoes.length, 1);
assertions += 1;
assert.deepEqual(
  {
    responsavel: insightsAmanda.recomendacoes[0].responsavel,
    proximaAcao: insightsAmanda.recomendacoes[0].proximaAcao,
  },
  { responsavel: "Amanda Reis", proximaAcao: "Retomar propostas após visita" },
);
assertions += 1;
const relatorioLucas = calcularRelatorioComercialSintetico({
  periodo: "Últimos 30 dias",
  responsavel: "Lucas Prado",
  resumoPrevisao: previsaoRealista,
});
const insightsLucas = calcularInsightsComerciaisSinteticos({ relatorio: relatorioLucas });
ok(
  insightsLucas.variacaoConversao < 0 && insightsLucas.alertas[0].tom === "Atenção",
  "a queda de conversão filtrada deve gerar alerta de atenção",
);
for (const forbiddenPersistence of ["localStorage", "sessionStorage", "fetch(", "axios"]) {
  ok(
    !`${workspace}\n${workflows}\n${syntheticForecast}`.includes(forbiddenPersistence),
    `as jornadas cruzadas devem permanecer somente em memória: ${forbiddenPersistence}`,
  );
}
ok(
  dialog.includes('className="sr-only">Fechar</span>'),
  "o fechamento dos diálogos deve usar PT-BR",
);
ok(
  designSystem.includes("Os rótulos ficam sempre visíveis"),
  "a biblioteca deve registrar rótulos claros em PT-BR",
);
ok(
  designSystem.includes("Gráficos responsivos"),
  "a biblioteca deve documentar gráficos responsivos",
);

console.log(`P0 visual product homologation gate passed (${assertions} assertions).`);
