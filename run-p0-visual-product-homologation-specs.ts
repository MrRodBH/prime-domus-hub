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
]) {
  ok(workflows.includes(workflowTitle), `a homologação deve oferecer a jornada: ${workflowTitle}`);
}
ok(
  (workflows.match(/evento\.preventDefault\(\)/g) ?? []).length === 4,
  "os quatro formulários devem permanecer sob controle local",
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
