import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

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
];

for (const path of requiredFiles) {
  ok(existsSync(resolve(root, path)), `a superfície visual deve conter ${path}`);
}

const demonstration = read(requiredFiles[0]);
const designSystem = read(requiredFiles[1]);
const workspace = read(requiredFiles[2]);
const data = read(requiredFiles[3]);
const routeTree = read("src/routeTree.gen.ts");
const auth = read("src/routes/auth.tsx");
const contexts = read("src/components/workspace/contexts.ts");
const dashboardFeed = read("src/components/dashboard/DashboardInsightFeed.tsx");
const priorityAdminSurfaces = [
  "src/routes/_authenticated.admin.marketing.tsx",
  "src/routes/_authenticated.admin.tracking.tsx",
  "src/routes/_authenticated.admin.portais.tsx",
]
  .map(read)
  .join("\n");
const combinedPublicSurface = `${demonstration}\n${designSystem}\n${workspace}\n${data}`;

for (const route of ["/demonstracao", "/design-system"]) {
  ok(routeTree.includes(route), `a árvore gerada deve registrar ${route}`);
}

ok(demonstration.includes("ssr: false"), "a demonstração deve evitar dependências SSR");
ok(designSystem.includes("ssr: false"), "os padrões visuais devem evitar dependências SSR");
ok(auth.includes('to="/demonstracao"'), "a tela de acesso deve oferecer a demonstração");

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
  designSystem.includes("Labels ficam sempre visíveis"),
  "a biblioteca deve registrar labels claros",
);
ok(
  designSystem.includes("Gráficos responsivos"),
  "a biblioteca deve documentar gráficos responsivos",
);

console.log(`P0 visual product homologation gate passed (${assertions} assertions).`);
