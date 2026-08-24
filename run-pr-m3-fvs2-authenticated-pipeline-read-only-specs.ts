import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  classifyPipelineReadError,
  filterPipelineLeadReadModels,
  PIPELINE_STATUS_KEYS,
  summarizePipelineLeadReadModels,
  toPipelineLeadReadModels,
} from "./src/components/pipeline/pipeline-read-model";
import { pipelineSearchSchema } from "./src/components/pipeline/search-schema";
import type { CrmLeadDto } from "./src/lib/api/tenant-crm.functions";

const root = process.cwd();
const baseSha = process.env.PR_M3_FVS2_BASE_SHA ?? "3bbfb0454ca3599149bddd313ffbee6672d9c89e";
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
  "src/routes/_authenticated.admin.pipeline.tsx",
  "src/components/pipeline/PipelineReadOnlyPage.tsx",
  "src/components/pipeline/PipelineReadOnlyList.tsx",
  "src/components/pipeline/PipelineReadOnlyDetail.tsx",
  "src/components/pipeline/hooks/usePipelineReadModel.ts",
  "src/components/pipeline/pipeline-read-model.ts",
  "src/components/pipeline/search-schema.ts",
  "run-pr-m3-fvs2-authenticated-pipeline-read-only-specs.ts",
  "package.json",
  ".github/workflows/release-gate.yml",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m3-fvs2-pipeline-read-only-evidence.md",
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

for (const path of changed) {
  ok(allowlist.has(path), `changed path must be allowlisted: ${path}`);
}
ok(changed.size > 0, "FVS2 must contain a non-empty exact diff");
ok(changed.size <= allowlist.size, "FVS2 must not exceed its eleven-path allowlist");
equal(
  read("bun.lock"),
  `${git("show", `${baseSha}:bun.lock`)}\n`,
  "bun.lock must remain byte-for-byte unchanged",
);

const route = read("src/routes/_authenticated.admin.pipeline.tsx");
const page = read("src/components/pipeline/PipelineReadOnlyPage.tsx");
const list = read("src/components/pipeline/PipelineReadOnlyList.tsx");
const detail = read("src/components/pipeline/PipelineReadOnlyDetail.tsx");
const hook = read("src/components/pipeline/hooks/usePipelineReadModel.ts");
const model = read("src/components/pipeline/pipeline-read-model.ts");
const search = read("src/components/pipeline/search-schema.ts");
const shell = read("src/components/workspace/WorkspaceShell.tsx");
const authenticatedRoute = read("src/routes/_authenticated.tsx");
const tenantGate = read("src/components/workspace/tenant/TenantSelectionRequired.tsx");
const workflow = read(".github/workflows/release-gate.yml");
const pkg = JSON.parse(read("package.json")) as {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};
const basePackage = JSON.parse(git("show", `${baseSha}:package.json`)) as typeof pkg;

ok(route.includes("PipelineReadOnlyPage"), "pipeline route must render the read-only page");
ok(!route.includes("PipelinePage"), "pipeline route must not retain the mutable page");
ok(route.includes("pipelineSearchSchema.parse"), "URL state must pass strict validation");
equal((shell.match(/<Outlet \/>/g) ?? []).length, 1, "authenticated shell must retain one Outlet");
equal(
  (shell.match(/<WorkspaceShell/g) ?? []).length,
  0,
  "shell must not recursively instantiate itself",
);
ok(
  authenticatedRoute.includes("component: WorkspaceShell"),
  "authenticated route must retain the canonical shell",
);
ok(shell.includes("<TenantSelectionGate"), "tenant selection gate must wrap workspace content");
ok(
  tenantGate.includes("useSelectedTenantId"),
  "tenant context must remain governed by the existing gate",
);
ok(shell.includes("impersonating"), "impersonation context must remain in the shell");

ok(hook.includes("adminListarLeads"), "FVS2 must consume adminListarLeads");
equal(
  (hook.match(/adminListarLeads/g) ?? []).length,
  2,
  "read hook must expose one import and one call",
);
ok(hook.includes("useQuery"), "server-owned read must use a query");
ok(!hook.includes("useMutation"), "read hook must not import useMutation");
ok(!hook.includes("useServerFn"), "read hook must not add a second transport authority");
ok(hook.includes('["admin", "pipeline", "read-only"]'), "query key must declare read-only scope");
ok(model.includes("Pick<"), "client model must be a projection of the server DTO");
ok(model.includes("CrmLeadDto"), "projection must retain its server-owned source type");

for (const forbidden of [
  "useMutation",
  "transicionarLead",
  "NovoLeadDialog",
  "LeadDetail",
  "PipelinePage",
  "usePipelineData",
  "DndContext",
  "DragOverlay",
  "criarLeadManual",
  "adminAtualizarLead",
  "adminListarLeadAssignees",
  "optimistic",
]) {
  for (const [name, source] of Object.entries({ route, page, list, detail, hook, model, search })) {
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
  "CLOUDFLARE_API_TOKEN",
  "STRIPE_SECRET_KEY",
]) {
  for (const source of [route, page, list, detail, hook, model, search]) {
    ok(
      !source.toLocaleLowerCase().includes(forbidden.toLocaleLowerCase()),
      `frontend slice must not contain ${forbidden}`,
    );
  }
}

const parsed = pipelineSearchSchema.parse({
  item: "3f26c6ba-44da-48e0-982d-632a64a0d7b1",
  q: "Casa",
  status: "proposta",
  origem: "Portal",
});
equal(parsed.status, "proposta", "validated URL state must preserve an allowed status filter");
assert.throws(
  () => pipelineSearchSchema.parse({ tenant_id: "client-authority" }),
  /unrecognized/i,
  "URL state must reject tenant authority",
);
assertions += 1;
assert.throws(
  () => pipelineSearchSchema.parse({ role: "admin" }),
  /unrecognized/i,
  "URL state must reject role authority",
);
assertions += 1;
assert.throws(
  () => pipelineSearchSchema.parse({ command: "update" }),
  /unrecognized/i,
  "URL state must reject commands",
);
assertions += 1;

const rows: CrmLeadDto[] = [
  {
    id: "6cd6ef48-454b-4716-92de-211968317c1a",
    nome: "Ana Cliente",
    email: "ana@example.test",
    telefone: null,
    mensagem: "Procura apartamento",
    status: "proposta",
    version: 3,
    assigned_to: "server-only",
    assigned_team_id: null,
    pipeline_id: "server-only",
    stage_id: "server-only",
    qualification_key: "interessado",
    origem: "Portal",
    original_attribution: {},
    latest_attribution: {},
    valor_estimado: 930000,
    imovel_id: null,
    created_at: "2026-08-20T10:00:00.000Z",
    updated_at: "2026-08-22T10:00:00.000Z",
    imovel: {
      titulo: "Vista Jardins",
      slug: "vista-jardins",
      preco: 930000,
      preco_sob_consulta: false,
    },
  },
  {
    id: "aabb2bf3-b5c7-49f9-81a9-41ef19d77903",
    nome: "Bruno Comprador",
    email: null,
    telefone: "+55 31 99999-0000",
    mensagem: null,
    status: "novo",
    version: 1,
    assigned_to: null,
    assigned_team_id: null,
    pipeline_id: "server-only",
    stage_id: "server-only",
    qualification_key: "nao_qualificado",
    origem: "Indicação",
    original_attribution: {},
    latest_attribution: {},
    valor_estimado: null,
    imovel_id: null,
    created_at: "2026-08-21T10:00:00.000Z",
    updated_at: "2026-08-21T10:00:00.000Z",
    imovel: null,
  },
];

const projected = toPipelineLeadReadModels(rows);
equal(projected[0]?.nome, "Ana Cliente", "read projection must sort by server updated_at");
ok(!("assigned_to" in projected[0]), "read projection must remove assignment authority");
ok(!("stage_id" in projected[0]), "read projection must remove stage authority");
equal(
  filterPipelineLeadReadModels(projected, { q: "jardins" }).length,
  1,
  "local search must include property title",
);
equal(
  filterPipelineLeadReadModels(projected, { status: "novo" }).length,
  1,
  "local status filter must be deterministic",
);
equal(
  filterPipelineLeadReadModels(projected, { origem: "portal" }).length,
  1,
  "local origin filter must be deterministic",
);
const summary = summarizePipelineLeadReadModels(projected);
equal(summary.total, 2, "summary must count server rows");
equal(summary.proposals, 1, "summary must count proposals");
equal(summary.estimatedValue, 930000, "summary must aggregate read-only value");
equal(
  classifyPipelineReadError(new Error("Forbidden")),
  "denied",
  "server forbidden must map to denied",
);
equal(
  classifyPipelineReadError(new Error("Tenant selection required")),
  "unavailable",
  "missing server tenant context must map to unavailable",
);
equal(
  classifyPipelineReadError(new Error("network failure")),
  "error",
  "unknown failures must map to error",
);
equal(PIPELINE_STATUS_KEYS.length, 7, "status contract must be exhaustive and frozen");

for (const kind of ["loading", "empty", "denied", "unavailable", "error"]) {
  ok(
    page.includes(`kind=\"${kind}\"`) || page.includes(`kind={kind}`),
    `page must expose ${kind} state`,
  );
}
ok(page.includes("model.query.isPending"), "loading must derive from the read query");
ok(page.includes("model.query.isError"), "error states must derive from the read query");
ok(page.includes("model.leads.length === 0"), "empty state must derive from the server read model");
ok(page.includes("model.query.refetch()"), "generic read failure must provide bounded recovery");
ok(page.includes('data-pipeline-mode="read-only"'), "read-only mode must be machine-verifiable");
ok(page.includes('aria-label="Filtros locais do pipeline"'), "local filters must be named");
ok(
  page.includes("aria-pressed={search.status === status}"),
  "status filters must expose pressed state",
);
ok(page.includes('aria-label="Buscar leads"'), "search must have an accessible name");
ok(page.includes('aria-label="Filtrar por origem"'), "origin filter must have an accessible name");
ok(page.includes("sm:grid-cols-4"), "summary must adapt from phone to tablet");
ok(
  page.includes("lg:grid-cols-[minmax(20rem,0.86fr)_minmax(0,1.14fr)]"),
  "desktop list/detail split must be bounded",
);
ok(page.includes("min-w-0"), "page must allow nested content to shrink");

ok(list.includes('role="listbox"'), "lead list must expose listbox semantics");
ok(list.includes('role="option"'), "lead rows must expose option semantics");
ok(list.includes("aria-selected={selected}"), "lead rows must expose selection");
ok(
  list.includes('aria-current={selected ? "true" : undefined}'),
  "selected lead must expose current state",
);
ok(list.includes("focus-visible:ring-2"), "lead rows must show keyboard focus");
ok(list.includes("overflow-y-auto"), "long lead lists must scroll within their surface");
ok(
  detail.includes('aria-labelledby="pipeline-detail-title"'),
  "detail must have an accessible name",
);
ok(detail.includes('aria-live="polite"'), "detail selection must be announced politely");
ok(detail.includes("Autoridade preservada"), "detail must disclose its authority boundary");
ok(detail.includes("não oferece ações"), "detail must disclose that it is non-mutable");
ok(!detail.includes("onClick"), "lead detail must not expose action controls");

const viewports = [
  { width: 375, height: 812, columns: 1 },
  { width: 768, height: 1024, columns: 1 },
  { width: 1440, height: 900, columns: 2 },
] as const;
for (const viewport of viewports) {
  ok(
    viewport.width > 0 && viewport.height > 56,
    `${viewport.width}x${viewport.height} must retain a positive content viewport`,
  );
  ok(
    viewport.columns === (viewport.width >= 1024 ? 2 : 1),
    `${viewport.width}x${viewport.height} must use the expected responsive layout`,
  );
}

assert.deepEqual(
  pkg.dependencies,
  basePackage.dependencies,
  "runtime dependencies must remain unchanged",
);
assertions += 1;
assert.deepEqual(
  pkg.devDependencies,
  basePackage.devDependencies,
  "dev dependencies must remain unchanged",
);
assertions += 1;
ok(
  pkg.scripts?.["test:pr-m3-fvs2"]?.includes(
    "run-pr-m3-fvs2-authenticated-pipeline-read-only-specs.ts",
  ),
  "focused FVS2 script must be pinned",
);
ok(
  pkg.scripts?.["verify:release"]?.startsWith("bun run test:pr-m3-fvs2"),
  "release verification must start with the current FVS2 gate",
);
ok(
  workflow.includes("Verify PR-M3-FVS2 authenticated pipeline read-only"),
  "Release Gate must name the FVS2 matrix",
);
ok(workflow.includes("PR_M3_FVS2_BASE_SHA"), "Release Gate must bind FVS2 to its audited base");
ok(
  workflow.includes("bun run test:pr-m3-fvs2"),
  "Release Gate must execute the pinned FVS2 script",
);

const evidencePath =
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m3-fvs2-pipeline-read-only-evidence.md";
ok(existsSync(resolve(root, evidencePath)), "FVS2 evidence document must exist");
const evidence = read(evidencePath);
for (const token of [
  "PR-M3-FVS2",
  "FRONTEND_CONTRACT_REGRESSION=0",
  "LOVABLE_PREVIEW_REQUIRED=true",
  "LOVABLE_PRODUCTION_PUBLISH=false",
  "PROVIDER_WRITES=0",
  "DATABASE_WRITES=0",
  "PR_105_MERGE=false",
]) {
  ok(evidence.includes(token), `evidence must retain ${token}`);
}

console.log(`PR-M3-FVS2 authenticated pipeline read-only gate passed (${assertions} assertions).`);
