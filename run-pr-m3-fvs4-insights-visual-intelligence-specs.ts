import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  classifyDashboardReadError,
  dashboardDateRange,
  formatDashboardCurrency,
  toDashboardReadModel,
  type DashboardStatsSource,
} from "./src/components/dashboard/dashboard-read-model";
import { dashboardInsightsSearchSchema } from "./src/components/dashboard/search-schema";

const root = process.cwd();
const baseSha = process.env.PR_M3_FVS4_BASE_SHA ?? "2f31f433f8c6a3ceeb5f311f9242519ee9a310ca";
let assertions = 0;
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const git = (...args: string[]) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
function ok(value: unknown, message: string): asserts value {
  assert.ok(value, message);
  assertions += 1;
}
function equal<T>(actual: T, expected: T, message: string) {
  assert.equal(actual, expected, message);
  assertions += 1;
}

const allowlist = new Set([
  "src/routes/_authenticated.admin.index.tsx",
  "src/components/dashboard/DashboardInsightsReadOnlyPage.tsx",
  "src/components/dashboard/DashboardMetricGrid.tsx",
  "src/components/dashboard/DashboardVisualizations.tsx",
  "src/components/dashboard/DashboardInsightFeed.tsx",
  "src/components/dashboard/hooks/useDashboardInsightsReadModel.ts",
  "src/components/dashboard/dashboard-read-model.ts",
  "src/components/dashboard/search-schema.ts",
  "run-pr-m3-fvs4-insights-visual-intelligence-specs.ts",
  "package.json",
  ".github/workflows/release-gate.yml",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m3-fvs4-insights-visual-intelligence-evidence.md",
]);
const localUntracked =
  process.env.GITHUB_ACTIONS === "true" ? "" : git("ls-files", "--others", "--exclude-standard");
const changed = new Set(
  [
    git("diff", "--name-only", `${baseSha}...HEAD`),
    git("diff", "--name-only"),
    git("diff", "--cached", "--name-only"),
    localUntracked,
  ]
    .flatMap((output) => output.split("\n"))
    .filter(Boolean),
);
for (const path of changed) ok(allowlist.has(path), `changed path must be allowlisted: ${path}`);
ok(changed.size > 0, "FVS4 must contain a non-empty diff");
ok(changed.size <= allowlist.size, "FVS4 must not exceed its twelve-path allowlist");
equal(
  read("bun.lock"),
  `${git("show", `${baseSha}:bun.lock`)}\n`,
  "bun.lock must remain byte-for-byte unchanged",
);

const route = read("src/routes/_authenticated.admin.index.tsx");
const page = read("src/components/dashboard/DashboardInsightsReadOnlyPage.tsx");
const metricGrid = read("src/components/dashboard/DashboardMetricGrid.tsx");
const visualizations = read("src/components/dashboard/DashboardVisualizations.tsx");
const feed = read("src/components/dashboard/DashboardInsightFeed.tsx");
const hook = read("src/components/dashboard/hooks/useDashboardInsightsReadModel.ts");
const modelSource = read("src/components/dashboard/dashboard-read-model.ts");
const searchSource = read("src/components/dashboard/search-schema.ts");
const shell = read("src/components/workspace/WorkspaceShell.tsx");
const authenticatedRoute = read("src/routes/_authenticated.tsx");
const workflow = read(".github/workflows/release-gate.yml");
const sources = { route, page, metricGrid, visualizations, feed, hook, modelSource, searchSource };

ok(route.includes("DashboardInsightsReadOnlyPage"), "admin index must render FVS4 page");
ok(
  route.includes("dashboardInsightsSearchSchema.parse"),
  "URL filters must pass strict validation",
);
equal((shell.match(/<Outlet \/>/g) ?? []).length, 1, "workspace must retain exactly one Outlet");
equal(
  (authenticatedRoute.match(/component: WorkspaceShell/g) ?? []).length,
  1,
  "authenticated tree must retain exactly one WorkspaceShell",
);
ok(shell.includes("<TenantSelectionGate"), "TenantSelectionGate must remain authoritative");
ok(shell.includes("impersonating"), "impersonation context must remain visible");

ok(hook.includes("dashboardStats"), "hook must consume dashboardStats");
ok(hook.includes("adminListarCorretores"), "hook must consume privileged broker read");
ok(
  hook.includes("useServerFn(dashboardStats)"),
  "dashboard transport must use the existing server function",
);
ok(hook.includes('"read-only"'), "query keys must declare read-only intent");
ok(!hook.includes("effectiveScope"), "hook must not project effective scope into UI authority");
ok(!hook.includes("actorKind"), "hook must not project actor kind into UI authority");

for (const forbidden of [
  "useMutation",
  "mutationFn",
  "adminCriar",
  "adminAtualizar",
  "adminExcluir",
  "transicionar",
  "optimistic",
  "DndContext",
  "DragOverlay",
  "NovoLeadDialog",
  "onPublish",
]) {
  for (const [name, source] of Object.entries(sources)) {
    ok(!source.includes(forbidden), `${name} must not contain mutable surface ${forbidden}`);
  }
}
for (const forbidden of [
  "stripe",
  "cloudflare",
  "wrangler",
  "webhook",
  "checkout",
  "invoice",
  "provider diagnostics",
  "supabase.from",
  "CLOUDFLARE_API_TOKEN",
  "STRIPE_SECRET_KEY",
]) {
  for (const source of Object.values(sources)) {
    ok(
      !source.toLocaleLowerCase().includes(forbidden.toLocaleLowerCase()),
      `frontend slice must not contain ${forbidden}`,
    );
  }
}

const brokerId = "3f26c6ba-44da-48e0-982d-632a64a0d7b1";
const parsed = dashboardInsightsSearchSchema.parse({
  period: "30d",
  origin: "Indicação",
  broker: brokerId,
});
equal(parsed.period, "30d", "period must be validated presentation state");
equal(parsed.broker, brokerId, "broker filter must remain an opaque validated server input");
const custom = dashboardInsightsSearchSchema.parse({
  period: "custom",
  from: "2026-08-01",
  to: "2026-08-25",
});
equal(custom.from, "2026-08-01", "custom start must be preserved");
for (const forbiddenSearch of [
  { tenant_id: "client-authority" },
  { role: "admin" },
  { scope: "global" },
  { price: 900000 },
  { command: "publish" },
]) {
  assert.throws(() => dashboardInsightsSearchSchema.parse(forbiddenSearch), /unrecognized/i);
  assertions += 1;
}
assert.throws(() => dashboardInsightsSearchSchema.parse({ period: "custom" }), /datas/i);
assertions += 1;
assert.throws(
  () =>
    dashboardInsightsSearchSchema.parse({ period: "custom", from: "2026-08-25", to: "2026-08-01" }),
  /posterior/i,
);
assertions += 1;

const source: DashboardStatsSource = {
  resumo: {
    leads: { atual: 42, anterior: 35, deltaPct: 20 },
    visitas: { atual: 18, conversao: 42.9 },
    propostas: { atual: 9, conversao: 50 },
    vendas: { atual: 3, perdidas: 2, descartadas: 1, vgv: 2450000 },
  },
  funil: [
    { etapa: "Novo", quantidade: 42, conversao: 100, perda: 0 },
    { etapa: "Venda", quantidade: 3, conversao: 33.3, perda: 6 },
  ],
  alertas: { semAtendimento: 2, semFollowup: 1, visitasSemFeedback: 0, propostasParadas: 1 },
  serie: [{ data: "2026-08-25", leads: 4, visitas: 2, propostas: 1, vendas: 1, vgv: 850000 }],
  origens: [{ nome: "Indicação", quantidade: 20, percentual: 47.6, conversao: 10 }],
  taxas: [{ label: "Lead → Venda", atual: 7.1, meta: 5 }],
  desempenho: { leads: 10, visitas: 5, propostas: 2, vendas: 1, vgv: 850000 },
  ranking: [
    {
      corretor_id: brokerId,
      user_id: "server-user",
      nome: "Ana Silva",
      leads: 10,
      visitas: 5,
      propostas: 2,
      vendas: 1,
      conversao: 10,
      vgv: 850000,
    },
  ],
  insights: [{ tipo: "performance", mensagem: "Volume cresceu 20%." }],
  isPrivileged: true,
  effectiveScope: "global",
  actorKind: "owner",
  timezone: "America/Sao_Paulo",
  metricRegistry: [
    {
      metricKey: "leads_received",
      label: "Leads recebidos",
      formula: "count(distinct lead.id)",
      periodBoundary: "inclusive_start_inclusive_end",
      cardinality: "scalar",
    },
  ],
  operationalMetrics: {
    activeProperties: 14,
    publishedProperties: 10,
    marketingIngestionEvents: 5,
    portalPublications: 2,
    crmAlerts: { first_response_overdue: 2 },
  },
  dataCompleteness: "complete",
};
const model = toDashboardReadModel(source);
equal(model.summary[0]?.value, 42, "read model must preserve server-owned lead count");
equal(model.ranking[0]?.nome, "Ana Silva", "read model must preserve server-owned ranking label");
equal(model.dataCompleteness, "complete", "partial data must never be accepted");
ok(model.hasActivity, "quantitative server data must produce a complete state");
const serialized = JSON.stringify(model);
for (const forbiddenAuthority of [
  "effectiveScope",
  "actorKind",
  "isPrivileged",
  "corretor_id",
  "user_id",
]) {
  ok(
    !serialized.includes(forbiddenAuthority),
    `read model must strip authority field ${forbiddenAuthority}`,
  );
}
ok(formatDashboardCurrency(2450000).includes("2.450.000"), "currency must use pt-BR formatting");
const range = dashboardDateRange(
  "custom",
  { from: "2026-08-01", to: "2026-08-25" },
  new Date("2026-08-25T12:00:00-03:00"),
);
ok(range.inicio.includes("2026-08-01"), "custom range must retain the initial day");
ok(
  range.fim.includes("2026-08-26") || range.fim.includes("2026-08-25"),
  "custom range must cover the final local day",
);
equal(
  classifyDashboardReadError(new Error("dashboard_permission_denied")),
  "denied",
  "permission failures must be denied",
);
equal(
  classifyDashboardReadError(new Error("dashboard_broker_binding_required")),
  "unavailable",
  "binding failures must be unavailable",
);
equal(classifyDashboardReadError(new Error("network")), "error", "unknown failures must be errors");

for (const state of ["loading", "empty", "denied", "unavailable", "error"]) {
  ok(page.includes(`\"${state}\"`), `page must implement deterministic ${state} state`);
}
ok(page.includes('data-dashboard-mode="read-only"'), "complete state must be explicitly read-only");
ok(
  page.includes("sm:text-4xl") && page.includes("xl:grid-cols"),
  "page must include responsive 375/768/1440 progression",
);
ok(
  visualizations.includes("ResponsiveContainer"),
  "real quantitative data must use existing Recharts",
);
ok(
  visualizations.includes("isAnimationActive={false}"),
  "charts must respect reduced motion by disabling animation",
);
ok((visualizations.match(/<table/g) ?? []).length >= 1, "charts must include a tabular equivalent");
ok(visualizations.includes("Resumo textual do funil"), "funnel must include a textual equivalent");
ok(
  visualizations.includes('role="img"') && visualizations.includes("aria-labelledby"),
  "charts must have accessible names and descriptions",
);
ok(feed.includes('aria-live="polite"'), "server-owned insights must announce changes politely");
ok(
  feed.includes("Data completeness") && feed.includes("Completo"),
  "data completeness must be visible",
);

for (const path of [
  "src/routes/_authenticated.admin.imoveis.index.tsx",
  "src/routes/_authenticated.admin.imoveis.$id.tsx",
  "src/components/properties/PropertyInventoryReadOnlyPage.tsx",
  "src/components/properties/PropertyInventoryReadOnlyGrid.tsx",
  "src/components/properties/PropertyInventoryReadOnlyDetail.tsx",
  "src/components/properties/hooks/usePropertyInventoryReadModel.ts",
  "src/components/properties/property-inventory-read-model.ts",
  "src/components/properties/search-schema.ts",
]) {
  equal(
    read(path),
    `${git("show", `${baseSha}:${path}`)}\n`,
    `FVS3 contract must remain exact: ${path}`,
  );
}

const pkg = JSON.parse(read("package.json")) as {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};
const basePkg = JSON.parse(git("show", `${baseSha}:package.json`)) as typeof pkg;
assert.deepEqual(pkg.dependencies, basePkg.dependencies, "FVS4 must not add runtime dependencies");
assert.deepEqual(
  pkg.devDependencies,
  basePkg.devDependencies,
  "FVS4 must not add development dependencies",
);
assertions += 2;
ok(
  pkg.scripts?.["test:pr-m3-fvs4"]?.includes(
    "run-pr-m3-fvs4-insights-visual-intelligence-specs.ts",
  ),
  "focused script must execute FVS4 matrix",
);
ok(
  pkg.scripts?.["verify:release"]?.includes("test:pr-m3-fvs4"),
  "release verification must include FVS4",
);
ok(
  workflow.includes("Verify PR-M3-FVS4 authenticated insights and visual intelligence read-only"),
  "Release Gate must run FVS4 matrix",
);
ok(workflow.includes("PR_M3_FVS4_BASE_SHA"), "remote matrix must use the exact event base");

console.log(`PR-M3-FVS4 insights and visual intelligence specs: ${assertions} assertions passed.`);
