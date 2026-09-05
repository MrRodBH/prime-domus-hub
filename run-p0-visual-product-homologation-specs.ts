import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveP0HomologationEntry } from "./src/lib/p0-homologation-entry";

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
for (const forbiddenPersistence of ["localStorage", "sessionStorage", "fetch(", "axios"]) {
  ok(
    !`${workspace}\n${workflows}`.includes(forbiddenPersistence),
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
