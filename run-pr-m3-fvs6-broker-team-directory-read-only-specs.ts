import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  classifyBrokerTeamDirectoryReadError,
  filterBrokerDirectory,
  toBrokerTeamDirectoryReadModel,
  type BrokerTeamDirectorySource,
} from "./src/components/directory/broker-team-directory-read-model";
import { brokerTeamDirectorySearchSchema } from "./src/components/directory/search-schema";

const root = process.cwd();
const baseSha =
  process.env.PR_M3_FVS6_BASE_SHA ?? "85941758aa5a56641b0ec8941747e8c8958798b5";
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

function exportBlock(source: string, exportName: string) {
  const start = source.indexOf(`export const ${exportName}`);
  ok(start >= 0, `${exportName} must exist in the server API`);
  const next = source.indexOf("export const ", start + 13);
  return source.slice(start, next < 0 ? undefined : next);
}

const allowlist = new Set([
  "src/routes/_authenticated.admin.corretores.tsx",
  "src/components/directory/BrokerTeamDirectoryReadOnlyPage.tsx",
  "src/components/directory/BrokerDirectoryGrid.tsx",
  "src/components/directory/TeamDirectoryPanel.tsx",
  "src/components/directory/BrokerProfileReadOnlyDetail.tsx",
  "src/components/directory/hooks/useBrokerTeamDirectoryReadModel.ts",
  "src/components/directory/broker-team-directory-read-model.ts",
  "src/components/directory/search-schema.ts",
  "run-pr-m3-fvs6-broker-team-directory-read-only-specs.ts",
  "package.json",
  ".github/workflows/release-gate.yml",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m3-fvs6-broker-team-directory-evidence.md",
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
equal(changed.size, allowlist.size, "FVS6 must change exactly the twelve frozen paths");
for (const path of allowlist) ok(changed.has(path), `FVS6 exact allowlist path must change: ${path}`);
equal(
  read("bun.lock"),
  `${git("show", `${baseSha}:bun.lock`)}\n`,
  "bun.lock must remain byte-for-byte unchanged",
);

const route = read("src/routes/_authenticated.admin.corretores.tsx");
const page = read("src/components/directory/BrokerTeamDirectoryReadOnlyPage.tsx");
const grid = read("src/components/directory/BrokerDirectoryGrid.tsx");
const teamsPanel = read("src/components/directory/TeamDirectoryPanel.tsx");
const detail = read("src/components/directory/BrokerProfileReadOnlyDetail.tsx");
const hook = read("src/components/directory/hooks/useBrokerTeamDirectoryReadModel.ts");
const modelSource = read("src/components/directory/broker-team-directory-read-model.ts");
const searchSource = read("src/components/directory/search-schema.ts");
const brokerServerApi = read("src/lib/api/tenant-broker-directory.functions.ts");
const accessServerApi = read("src/lib/api/tenant-access-control.functions.ts");
const shell = read("src/components/workspace/WorkspaceShell.tsx");
const authenticatedRoute = read("src/routes/_authenticated.tsx");
const workflow = read(".github/workflows/release-gate.yml");
const sources = { route, page, grid, teamsPanel, detail, hook, modelSource, searchSource };

ok(route.includes("BrokerTeamDirectoryReadOnlyPage"), "broker route must render the FVS6 page");
ok(
  route.includes("brokerTeamDirectorySearchSchema.parse"),
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

for (const [name, source] of [
  ["adminListarCorretores", brokerServerApi],
  ["listTenantTeams", accessServerApi],
] as const) {
  ok(hook.includes(name), `hook must consume ${name}`);
  const block = exportBlock(source, name);
  ok(block.includes('createServerFn({ method: "GET" })'), `${name} must be a GET server function`);
  ok(!block.includes('method: "POST"'), `${name} must never expose a POST method`);
}
ok(hook.includes("Promise.all"), "the two server reads must resolve as one complete snapshot");
ok(hook.includes('"read-only"'), "query identity must declare read-only intent");
equal(
  (hook.match(/from "@\/lib\/api\//g) ?? []).length,
  2,
  "hook must import exactly two server API modules",
);

for (const forbidden of [
  "useMutation",
  "mutationFn",
  "adminSalvarCorretor",
  "adminExcluirCorretor",
  "createUploadTarget",
  "consumeTenantBrokerPhotoUploadTarget",
  "salvarEquipe",
  "excluirEquipe",
  "setTenantMemberProfiles",
  "setTenantProfilePermission",
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
  "supabase.from",
  "supabase.storage",
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

const teamId = "11111111-1111-4111-8111-111111111111";
const otherTeamId = "22222222-2222-4222-8222-222222222222";
const parsed = brokerTeamDirectorySearchSchema.parse({
  q: "ana",
  team: teamId,
  view: "teams",
});
equal(parsed.q, "ana", "q must be validated presentation state");
equal(parsed.team, teamId, "team must be validated presentation state");
equal(parsed.view, "teams", "view must be validated presentation state");
for (const forbiddenSearch of [
  { tenant: "client-authority" },
  { tenant_id: "client-authority" },
  { role: "admin" },
  { scope: "global" },
  { status: "ativo" },
  { command: "edit" },
  { action: "assign" },
]) {
  assert.throws(() => brokerTeamDirectorySearchSchema.parse(forbiddenSearch), /unrecognized/i);
  assertions += 1;
}
assert.throws(
  () => brokerTeamDirectorySearchSchema.parse({ team: "not-a-uuid" }),
  /uuid/i,
);
assertions += 1;

const source: BrokerTeamDirectorySource = {
  brokers: [
    {
      id: "broker-1",
      tenant_id: "must-not-project",
      user_id: "must-not-project",
      cpf: "must-not-project",
      nome: "Ana",
      sobrenome: "Prime",
      ativo: true,
      team_id: teamId,
      cargo: "Consultora imobiliária",
      email: "ana@example.com",
      telefone: "+55 31 3333-1111",
      whatsapp: "+55 31 99999-1111",
      foto_url: "must-not-project",
      foto_preview_url: "https://example.com/ana.jpg",
      status: "ativo",
      creci: "MG 12345",
      slug: "must-not-project",
      bio: "Especialista em imóveis residenciais.",
    },
    {
      id: "broker-2",
      tenant_id: "must-not-project",
      user_id: "must-not-project",
      nome: "Bruno",
      sobrenome: "Vale",
      ativo: false,
      team_id: otherTeamId,
      cargo: null,
      email: null,
      telefone: null,
      whatsapp: null,
      foto_url: null,
      foto_preview_url: null,
      status: "inativo",
      creci: null,
      cpf: null,
      slug: "must-not-project",
      bio: null,
    },
  ],
  teams: [
    {
      id: teamId,
      tenant_id: "must-not-project",
      nome: "Equipe Prime",
      descricao: "Atendimento residencial",
      lider_user_id: "must-not-project",
      ativo: true,
      total_membros: 3,
      team_members: [{ user_id: "must-not-project" }],
    },
    {
      id: otherTeamId,
      tenant_id: "must-not-project",
      nome: "Equipe Vale",
      descricao: null,
      lider_user_id: null,
      ativo: false,
      total_membros: 1,
      team_members: [],
    },
  ],
};

const model = toBrokerTeamDirectoryReadModel(source);
equal(model.brokers.length, 2, "all server-returned brokers must project");
equal(model.teams.length, 2, "all server-returned teams must project");
equal(model.brokers[0]?.displayName, "Ana Prime", "broker full name must be projected");
equal(model.brokers[0]?.teamName, "Equipe Prime", "server-owned team context must be presented");
equal(model.brokers[0]?.photoUrl, "https://example.com/ana.jpg", "preview photo must be presented");
equal(model.activeBrokerCount, 1, "active broker metric must reflect server-returned state");
equal(model.totalTeamMembers, 4, "team-member metric must use server-returned counts");
equal(model.totalRecords, 4, "complete model must count brokers and teams");
equal(
  model.metrics.find((metric) => metric.key === "members")?.value,
  4,
  "server-owned membership count must feed the metric",
);
equal(filterBrokerDirectory(model.brokers, "ana", undefined).length, 1, "q must filter projected brokers");
equal(filterBrokerDirectory(model.brokers, undefined, teamId).length, 1, "team must filter projected brokers");
equal(
  filterBrokerDirectory(model.brokers, "bruno", teamId).length,
  0,
  "presentation filters must combine without inventing matches",
);

const serialized = JSON.stringify(model);
for (const forbiddenAuthority of [
  "tenant_id",
  "user_id",
  "lider_user_id",
  "team_members",
  "cpf",
  "foto_url",
  "slug",
  "role",
  "scope",
  "effectiveScope",
  "actorKind",
]) {
  ok(
    !serialized.includes(forbiddenAuthority),
    `read model must strip authority/private field ${forbiddenAuthority}`,
  );
}

equal(
  classifyBrokerTeamDirectoryReadError(new Error("tenant_access_denied")),
  "denied",
  "permission failures must be denied",
);
equal(
  classifyBrokerTeamDirectoryReadError(new Error("tenant selection required")),
  "unavailable",
  "workspace selection failures must be unavailable",
);
equal(
  classifyBrokerTeamDirectoryReadError(new Error("network")),
  "error",
  "unknown failures must be errors",
);

for (const state of ["loading", "empty", "denied", "unavailable", "error"]) {
  ok(page.includes(`"${state}"`), `page must implement deterministic ${state} state`);
}
ok(page.includes('data-directory-mode="complete-read-only"'), "complete state must be explicit");
ok(page.includes("sm:text-4xl") && page.includes("xl:grid-cols"), "page must cover 375/768/1440 progression");
ok(page.includes('aria-live="polite"'), "result count must announce updates politely");
ok(page.includes('aria-label="Visualização do diretório"'), "view control must have an accessible name");
ok(page.includes('aria-label="Buscar no diretório"'), "search must have an accessible name");
ok(grid.includes('aria-label="Diretório de corretores"'), "broker grid must have an accessible name");
ok(grid.includes("aria-pressed={selected}"), "broker selection must expose pressed state");
ok(grid.includes("onError="), "broker images must have deterministic fallback behavior");
ok(grid.includes("motion-safe:") && grid.includes("motion-reduce:"), "broker motion must respect reduced motion");
ok(teamsPanel.includes('aria-label="Filtro por equipe"'), "team filter must have an accessible name");
ok(teamsPanel.includes("aria-pressed="), "team filters must expose pressed state");
ok(detail.includes('aria-live="polite"'), "profile detail must announce changes politely");
ok(detail.includes("onError="), "profile image must have deterministic fallback behavior");
ok(detail.includes("permanecem indisponíveis"), "unavailable operations must be explicit");
ok(page.includes("min-w-0") && grid.includes("min-w-0"), "surfaces must prevent material overflow");

const fvs5FrozenPaths = [
  "src/routes/_authenticated.admin.crm-operacoes.tsx",
  "src/components/operations/OperationsReadOnlyPage.tsx",
  "src/components/operations/OperationsMetricGrid.tsx",
  "src/components/operations/OperationsCollections.tsx",
  "src/components/operations/OperationsAlertFeed.tsx",
  "src/components/operations/hooks/useOperationsReadModel.ts",
  "src/components/operations/operations-read-model.ts",
  "src/components/operations/search-schema.ts",
  "run-pr-m3-fvs5-operations-read-only-specs.ts",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m3-fvs5-operations-read-only-evidence.md",
];
for (const path of fvs5FrozenPaths) {
  equal(read(path), `${git("show", `${baseSha}:${path}`)}\n`, `FVS5 contract must remain exact: ${path}`);
}

const pkg = JSON.parse(read("package.json")) as {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};
const basePkg = JSON.parse(git("show", `${baseSha}:package.json`)) as typeof pkg;
assert.deepEqual(pkg.dependencies, basePkg.dependencies, "FVS6 must not add runtime dependencies");
assert.deepEqual(pkg.devDependencies, basePkg.devDependencies, "FVS6 must not add development dependencies");
assertions += 2;
ok(
  pkg.scripts?.["test:pr-m3-fvs6"]?.includes("run-pr-m3-fvs6-broker-team-directory-read-only-specs.ts"),
  "focused script must execute the FVS6 matrix",
);
ok(
  pkg.scripts?.["verify:release"]?.startsWith("bun run test:pr-m3-fvs6"),
  "release verification must promote FVS6 as the active frontend gate",
);
ok(
  workflow.includes("Verify PR-M3-FVS6 authenticated broker and team directory read-only"),
  "Release Gate must run FVS6 matrix",
);
ok(workflow.includes("PR_M3_FVS6_BASE_SHA"), "remote matrix must use the exact event base");
ok(
  workflow.includes('run-pr-m3-fvs6-broker-team-directory-read-only-specs.ts'),
  "Release Gate must classify the exact FVS6 runner",
);

console.log(`PR-M3-FVS6 broker/team directory read-only specs: ${assertions} assertions passed.`);
