import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  classifyOperationsReadError,
  filterOperationsRecords,
  formatOperationsCurrency,
  toOperationsReadModel,
  type OperationsSource,
} from "./src/components/operations/operations-read-model";
import { operationsSearchSchema } from "./src/components/operations/search-schema";

const root = process.cwd();
const baseSha = process.env.PR_M3_FVS5_BASE_SHA ?? "915978b2658a4de35f13521365c68c148217c140";
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
  "src/routes/_authenticated.admin.crm-operacoes.tsx",
  "src/components/operations/OperationsReadOnlyPage.tsx",
  "src/components/operations/OperationsMetricGrid.tsx",
  "src/components/operations/OperationsCollections.tsx",
  "src/components/operations/OperationsAlertFeed.tsx",
  "src/components/operations/hooks/useOperationsReadModel.ts",
  "src/components/operations/operations-read-model.ts",
  "src/components/operations/search-schema.ts",
  "run-pr-m3-fvs5-operations-read-only-specs.ts",
  "package.json",
  ".github/workflows/release-gate.yml",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m3-fvs5-operations-read-only-evidence.md",
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
ok(changed.size > 0, "FVS5 must contain a non-empty diff");
ok(changed.size <= allowlist.size, "FVS5 must not exceed its twelve-path allowlist");
equal(
  read("bun.lock"),
  `${git("show", `${baseSha}:bun.lock`)}\n`,
  "bun.lock must remain byte-for-byte unchanged",
);

const route = read("src/routes/_authenticated.admin.crm-operacoes.tsx");
const page = read("src/components/operations/OperationsReadOnlyPage.tsx");
const metricGrid = read("src/components/operations/OperationsMetricGrid.tsx");
const collections = read("src/components/operations/OperationsCollections.tsx");
const alertFeed = read("src/components/operations/OperationsAlertFeed.tsx");
const hook = read("src/components/operations/hooks/useOperationsReadModel.ts");
const modelSource = read("src/components/operations/operations-read-model.ts");
const searchSource = read("src/components/operations/search-schema.ts");
const serverApi = read("src/lib/api/tenant-crm-functional.functions.ts");
const shell = read("src/components/workspace/WorkspaceShell.tsx");
const authenticatedRoute = read("src/routes/_authenticated.tsx");
const workflow = read(".github/workflows/release-gate.yml");
const sources = {
  route,
  page,
  metricGrid,
  collections,
  alertFeed,
  hook,
  modelSource,
  searchSource,
};

ok(route.includes("OperationsReadOnlyPage"), "CRM route must render the FVS5 page");
ok(
  route.includes("operationsSearchSchema.parse"),
  "presentation URL state must use strict parsing",
);
equal((shell.match(/<Outlet \/>/g) ?? []).length, 1, "workspace must retain exactly one Outlet");
equal(
  (authenticatedRoute.match(/component: WorkspaceShell/g) ?? []).length,
  1,
  "authenticated tree must retain exactly one WorkspaceShell",
);
ok(shell.includes("<TenantSelectionGate"), "TenantSelectionGate must remain authoritative");
ok(shell.includes("impersonating"), "impersonation context must remain visible");

const readFunctions = [
  "getTenantCrmFunctionalRegistry",
  "listTenantCrmContacts",
  "listTenantCrmCalendarEvents",
  "listTenantCrmVisits",
  "listTenantCrmProposals",
  "listTenantCrmAutomationRules",
  "listTenantCrmSlaPolicies",
  "listTenantCrmAlerts",
] as const;
for (const name of readFunctions) {
  ok(hook.includes(name), `hook must consume ${name}`);
  const start = serverApi.indexOf(`export const ${name}`);
  ok(start >= 0, `${name} must exist in the server API`);
  const next = serverApi.indexOf("export const ", start + 13);
  const block = serverApi.slice(start, next < 0 ? undefined : next);
  ok(block.includes('createServerFn({ method: "GET" })'), `${name} must be a GET server function`);
}
ok(hook.includes("Promise.all"), "the eight server reads must resolve as one complete snapshot");
ok(hook.includes('"read-only"'), "query identity must declare read-only intent");

for (const forbidden of [
  "useMutation",
  "mutationFn",
  "saveTenantCrm",
  "resolveTenantCrm",
  "exportTenantCrm",
  "importTenantCrm",
  "consumeTenantCrm",
  "deleteTenantCrm",
  'method: "POST"',
  "DndContext",
  "DragOverlay",
  "optimistic",
  "toast.success",
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

const parsed = operationsSearchSchema.parse({ section: "alerts", q: "primeira resposta" });
equal(parsed.section, "alerts", "section must be validated presentation state");
equal(parsed.q, "primeira resposta", "local search must be preserved");
for (const forbiddenSearch of [
  { tenant: "client-authority" },
  { tenant_id: "client-authority" },
  { role: "admin" },
  { scope: "global" },
  { status: "resolved" },
  { command: "export" },
]) {
  assert.throws(() => operationsSearchSchema.parse(forbiddenSearch), /unrecognized/i);
  assertions += 1;
}

const source: OperationsSource = {
  registry: {
    schemaVersion: 1,
    capabilities: ["contacts", "calendar", "visits", "proposals"],
    timezone: "America/Sao_Paulo",
    externalCommunication: "adapter_not_implemented_until_factual_adapter",
  },
  contacts: [
    {
      id: "contact-1",
      tenant_id: "must-not-project",
      created_by: "must-not-project",
      name: "Ana Prime",
      email: "ana@example.com",
      phone: "+55 31 99999-0000",
      status: "active",
      updated_at: "2026-08-25T12:00:00-03:00",
    },
  ],
  calendar: [
    {
      id: "calendar-1",
      title: "Retorno consultivo",
      event_type: "follow_up",
      starts_at: "2026-08-26T10:00:00-03:00",
      status: "scheduled",
      timezone: "America/Sao_Paulo",
      assigned_user_id: "must-not-project",
    },
  ],
  visits: [
    {
      id: "visit-1",
      property_id: "property-opaque",
      lead_id: "must-not-project-as-key",
      scheduled_at: "2026-08-27T14:00:00-03:00",
      status: "confirmed",
      feedback: null,
    },
  ],
  proposals: [
    {
      id: "proposal-1",
      amount: 1250000,
      status: "sent",
      valid_until: "2026-09-01",
      terms: { authority: "must-not-project" },
    },
  ],
  automation: [
    {
      id: "automation-1",
      rule_key: "follow_up_overdue_alert",
      configuration: { afterMinutes: 120 },
      active: true,
    },
  ],
  sla: [{ id: "sla-1", policy_key: "first_response", threshold_minutes: 30, active: true }],
  alerts: [
    {
      id: "alert-1",
      alert_key: "first_response_overdue",
      severity: "high",
      state: "open",
      tenant_id: "must-not-project",
      created_at: "2026-08-25T12:00:00-03:00",
    },
  ],
};
const model = toOperationsReadModel(source);
equal(model.contacts[0]?.title, "Ana Prime", "contact label must be projected");
equal(
  model.metrics.find((metric) => metric.key === "alerts")?.value,
  1,
  "open alert count must be factual",
);
equal(
  model.communicationAvailability,
  "unavailable",
  "communication must remain explicitly unavailable",
);
equal(model.capabilityCount, 4, "capability count must originate on the server");
ok(model.totalRecords === 7, "complete model must count all returned collections");
ok(formatOperationsCurrency(1250000).includes("1.250.000"), "currency must use pt-BR formatting");
equal(
  filterOperationsRecords(model.contacts, "ana").length,
  1,
  "local search must filter projected records",
);
equal(
  filterOperationsRecords(model.contacts, "inexistente").length,
  0,
  "local search must not invent matches",
);
const serialized = JSON.stringify(model);
for (const forbiddenAuthority of [
  "tenant_id",
  "created_by",
  "assigned_user_id",
  "lead_id",
  "role",
  "effectiveScope",
  "actorKind",
  "terms",
]) {
  ok(
    !serialized.includes(forbiddenAuthority),
    `read model must strip authority field ${forbiddenAuthority}`,
  );
}
equal(
  classifyOperationsReadError(new Error("crm_scope_denied")),
  "denied",
  "permission failures must be denied",
);
equal(
  classifyOperationsReadError(new Error("tenant selection required")),
  "unavailable",
  "workspace selection failures must be unavailable",
);
equal(
  classifyOperationsReadError(new Error("network")),
  "error",
  "unknown failures must be errors",
);

for (const state of ["loading", "empty", "denied", "unavailable", "error"]) {
  ok(page.includes(`"${state}"`), `page must implement deterministic ${state} state`);
}
ok(page.includes('data-operations-mode="complete-read-only"'), "complete state must be explicit");
ok(
  page.includes("sm:text-4xl") && page.includes("xl:grid-cols"),
  "page must cover 375/768/1440 progression",
);
ok(metricGrid.includes("motion-safe:"), "motion must be gated by reduced-motion preference");
ok(collections.includes("aria-current="), "section navigation must expose current position");
ok(
  collections.includes('aria-label="Seções operacionais"'),
  "section navigation must have an accessible name",
);
ok(alertFeed.includes('aria-live="polite"'), "server-owned alerts must announce changes politely");
ok(alertFeed.includes("sem resolução ou comando"), "unavailable alert operations must be explicit");
ok(
  collections.includes("min-w-0") && page.includes("overflow-hidden"),
  "surfaces must prevent material overflow",
);

for (const path of [
  "src/routes/_authenticated.admin.index.tsx",
  "src/components/dashboard/DashboardInsightsReadOnlyPage.tsx",
  "src/components/dashboard/DashboardMetricGrid.tsx",
  "src/components/dashboard/DashboardVisualizations.tsx",
  "src/components/dashboard/DashboardInsightFeed.tsx",
  "src/components/dashboard/hooks/useDashboardInsightsReadModel.ts",
  "src/components/dashboard/dashboard-read-model.ts",
  "src/components/dashboard/search-schema.ts",
]) {
  equal(
    read(path),
    `${git("show", `${baseSha}:${path}`)}\n`,
    `FVS4 contract must remain exact: ${path}`,
  );
}

const pkg = JSON.parse(read("package.json")) as {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};
const basePkg = JSON.parse(git("show", `${baseSha}:package.json`)) as typeof pkg;
assert.deepEqual(pkg.dependencies, basePkg.dependencies, "FVS5 must not add runtime dependencies");
assert.deepEqual(
  pkg.devDependencies,
  basePkg.devDependencies,
  "FVS5 must not add development dependencies",
);
assertions += 2;
ok(
  pkg.scripts?.["test:pr-m3-fvs5"]?.includes("run-pr-m3-fvs5-operations-read-only-specs.ts"),
  "focused script must execute the FVS5 matrix",
);
ok(
  pkg.scripts?.["verify:release"]?.includes("test:pr-m3-fvs5"),
  "release verification must include FVS5",
);
ok(
  workflow.includes("Verify PR-M3-FVS5 authenticated operations read-only"),
  "Release Gate must run FVS5 matrix",
);
ok(workflow.includes("PR_M3_FVS5_BASE_SHA"), "remote matrix must use the exact event base");

console.log(`PR-M3-FVS5 operations read-only specs: ${assertions} assertions passed.`);
