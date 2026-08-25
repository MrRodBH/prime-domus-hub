import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  classifyPropertyReadError,
  filterPropertyInventoryReadModels,
  formatPropertyCurrency,
  PROPERTY_PURPOSE_KEYS,
  PROPERTY_STATUS_KEYS,
  propertyStatusMeta,
  summarizePropertyInventoryReadModels,
  toPropertyDetailReadModel,
  toPropertyInventoryReadModels,
  type PropertyDetailSource,
  type PropertyInventorySource,
} from "./src/components/properties/property-inventory-read-model";
import { propertyInventorySearchSchema } from "./src/components/properties/search-schema";

const root = process.cwd();
const baseSha = process.env.PR_M3_FVS3_BASE_SHA ?? "ea762295f44e38fc7a9518260dc08bd3695ccdaa";
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
  "src/routes/_authenticated.admin.imoveis.index.tsx",
  "src/routes/_authenticated.admin.imoveis.$id.tsx",
  "src/components/properties/PropertyInventoryReadOnlyPage.tsx",
  "src/components/properties/PropertyInventoryReadOnlyGrid.tsx",
  "src/components/properties/PropertyInventoryReadOnlyDetail.tsx",
  "src/components/properties/hooks/usePropertyInventoryReadModel.ts",
  "src/components/properties/property-inventory-read-model.ts",
  "src/components/properties/search-schema.ts",
  "run-pr-m3-fvs3-property-inventory-read-only-specs.ts",
  "package.json",
  ".github/workflows/release-gate.yml",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m3-fvs3-property-inventory-evidence.md",
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
ok(changed.size > 0, "FVS3 must contain a non-empty exact diff");
ok(changed.size <= allowlist.size, "FVS3 must not exceed its twelve-path allowlist");
equal(
  read("bun.lock"),
  `${git("show", `${baseSha}:bun.lock`)}\n`,
  "bun.lock must remain byte-for-byte unchanged",
);

const indexRoute = read("src/routes/_authenticated.admin.imoveis.index.tsx");
const detailRoute = read("src/routes/_authenticated.admin.imoveis.$id.tsx");
const page = read("src/components/properties/PropertyInventoryReadOnlyPage.tsx");
const grid = read("src/components/properties/PropertyInventoryReadOnlyGrid.tsx");
const detail = read("src/components/properties/PropertyInventoryReadOnlyDetail.tsx");
const hook = read("src/components/properties/hooks/usePropertyInventoryReadModel.ts");
const model = read("src/components/properties/property-inventory-read-model.ts");
const search = read("src/components/properties/search-schema.ts");
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

for (const path of [
  "src/routes/_authenticated.admin.pipeline.tsx",
  "src/components/pipeline/PipelineReadOnlyPage.tsx",
  "src/components/pipeline/PipelineReadOnlyList.tsx",
  "src/components/pipeline/PipelineReadOnlyDetail.tsx",
  "src/components/pipeline/hooks/usePipelineReadModel.ts",
  "src/components/pipeline/pipeline-read-model.ts",
  "src/components/pipeline/search-schema.ts",
]) {
  equal(
    read(path),
    `${git("show", `${baseSha}:${path}`)}\n`,
    `FVS2 contract must remain exact: ${path}`,
  );
}

ok(indexRoute.includes("PropertyInventoryReadOnlyPage"), "index route must render FVS3");
ok(indexRoute.includes("propertyInventorySearchSchema.parse"), "URL state must be strict");
ok(detailRoute.includes("PropertyInventoryReadOnlyDetail"), "detail route must be read-only");
ok(!indexRoute.includes("useMutation"), "index route must not retain mutation transport");
ok(!detailRoute.includes("ImovelForm"), "detail route must not retain the mutable form");
equal((shell.match(/<Outlet \/>/g) ?? []).length, 1, "workspace must retain exactly one Outlet");
equal(
  (authenticatedRoute.match(/component: WorkspaceShell/g) ?? []).length,
  1,
  "authenticated route must retain exactly one WorkspaceShell",
);
ok(shell.includes("<TenantSelectionGate"), "tenant selection gate must wrap workspace content");
ok(tenantGate.includes("useSelectedTenantId"), "tenant selection must remain server-bound");
ok(shell.includes("impersonating"), "impersonation context must remain visible in the shell");

ok(hook.includes("adminListarImoveis"), "FVS3 must consume adminListarImoveis");
ok(hook.includes("adminObterImovel"), "FVS3 must consume adminObterImovel");
equal(
  (hook.match(/useQuery/g) ?? []).length,
  3,
  "hook must contain one import and two GET queries",
);
ok(!hook.includes("useMutation"), "property hooks must not import useMutation");
ok(!hook.includes("useServerFn"), "property hooks must not add transport authority");
ok(hook.includes('"read-only"'), "query keys must declare read-only scope");
ok(model.includes("PropertyInventorySource"), "client projection must name its source contract");
ok(model.includes("PropertyInventoryReadModel"), "client projection must freeze a read model");

for (const forbidden of [
  "useMutation",
  "adminCriarImovel",
  "adminAtualizarImovel",
  "adminExcluirImovel",
  "ImovelForm",
  "NovoImovel",
  "onDelete",
  "optimistic",
  "DndContext",
  "DragOverlay",
]) {
  for (const [name, source] of Object.entries({
    indexRoute,
    detailRoute,
    page,
    grid,
    detail,
    hook,
    model,
    search,
  })) {
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
  for (const source of [indexRoute, detailRoute, page, grid, detail, hook, model, search]) {
    ok(
      !source.toLocaleLowerCase().includes(forbidden.toLocaleLowerCase()),
      `frontend slice must not contain ${forbidden}`,
    );
  }
}

const itemId = "3f26c6ba-44da-48e0-982d-632a64a0d7b1";
const parsed = propertyInventorySearchSchema.parse({
  item: itemId,
  q: "Jardins",
  status: "ativo",
  finalidade: "venda",
});
equal(parsed.item, itemId, "validated URL state must preserve local selection");
equal(parsed.status, "ativo", "validated URL state must preserve an allowed local filter");
for (const forbiddenSearch of [
  { tenant_id: "client-authority" },
  { role: "admin" },
  { preco: 900000 },
  { command: "publish" },
]) {
  assert.throws(
    () => propertyInventorySearchSchema.parse(forbiddenSearch),
    /unrecognized/i,
    "URL state must reject authority and commands",
  );
  assertions += 1;
}

const rows: Array<PropertyInventorySource & { tenant_id: string; created_by: string }> = [
  {
    id: itemId,
    codigo: "PD-101",
    titulo: "Vista Jardins",
    slug: "vista-jardins",
    finalidade: "venda",
    tipo: "apartamento",
    status: "ativo",
    preco: 930000,
    destaque: true,
    updated_at: "2026-08-23T14:00:00.000Z",
    bairro: { nome: "Funcionários" },
    tenant_id: "server-only",
    created_by: "server-only",
  },
  {
    id: "aabb2bf3-b5c7-49f9-81a9-41ef19d77903",
    codigo: null,
    titulo: "Casa Horizonte",
    slug: "casa-horizonte",
    finalidade: "aluguel",
    tipo: "casa",
    status: "reservado",
    preco: null,
    destaque: false,
    updated_at: "2026-08-22T14:00:00.000Z",
    bairro: null,
    tenant_id: "server-only",
    created_by: "server-only",
  },
];

const projected = toPropertyInventoryReadModels(rows);
equal(projected[0]?.titulo, "Vista Jardins", "read projection must preserve server order key");
equal(projected[1]?.codigo, "Código indisponível", "null codes need deterministic copy");
ok(!("tenant_id" in projected[0]), "read projection must remove tenant authority");
ok(!("created_by" in projected[0]), "read projection must remove writer identity");
equal(
  filterPropertyInventoryReadModels(projected, { q: "funcionários" }).length,
  1,
  "local search must include server-projected neighborhood",
);
equal(
  filterPropertyInventoryReadModels(projected, { status: "reservado" }).length,
  1,
  "local status filter must be deterministic",
);
equal(
  filterPropertyInventoryReadModels(projected, { finalidade: "venda" }).length,
  1,
  "local purpose filter must be deterministic",
);
const summary = summarizePropertyInventoryReadModels(projected);
equal(summary.total, 2, "summary must count server rows");
equal(summary.active, 1, "summary must count active server values");
equal(summary.featured, 1, "summary must count featured server values");
equal(summary.averagePrice, 930000, "summary must aggregate read-only prices");
equal(formatPropertyCurrency(930000), "R$ 930.000", "currency must use deterministic pt-BR copy");
equal(
  propertyStatusMeta("unknown").label,
  "Indisponível",
  "unknown status must not gain authority",
);
equal(PROPERTY_STATUS_KEYS.length, 4, "status filter contract must be frozen");
equal(PROPERTY_PURPOSE_KEYS.length, 3, "purpose filter contract must be frozen");

const detailSource: PropertyDetailSource & { tenant_id: string; corretor_id: string } = {
  ...rows[0],
  descricao: "Apartamento com luz natural.",
  preco_sob_consulta: false,
  condominio: 780,
  iptu: 320,
  area_total: 126,
  area_util: 104,
  quartos: 3,
  suites: 1,
  banheiros: 2,
  vagas: 2,
  rua: "Rua das Acácias",
  numero: "101",
  cidade: "Belo Horizonte",
  estado: "MG",
  caracteristicas: ["Varanda", "  ", "Vista livre"],
  imagem_capa: "javascript:alert(1)",
  imagens: [
    {
      id: "image-1",
      url: "https://images.example.test/property.webp",
      alt: "Sala iluminada",
      ordem: 1,
    },
  ],
  tenant_id: "server-only",
  corretor_id: "server-only",
};
const projectedDetail = toPropertyDetailReadModel(detailSource);
equal(
  projectedDetail.imageUrl,
  "https://images.example.test/property.webp",
  "unsafe cover must fall back to the first safe server image",
);
equal(projectedDetail.imageAlt, "Sala iluminada", "safe server image alt must be preserved");
equal(projectedDetail.caracteristicas.length, 2, "blank characteristics must be removed");
ok(!("tenant_id" in projectedDetail), "detail projection must remove tenant authority");
ok(!("corretor_id" in projectedDetail), "detail projection must remove assignment authority");

equal(
  classifyPropertyReadError(new Error("Forbidden")),
  "denied",
  "server forbidden must map to denied",
);
equal(
  classifyPropertyReadError(new Error("Tenant selection required")),
  "unavailable",
  "missing tenant context must map to unavailable",
);
equal(
  classifyPropertyReadError(new Error("network failure")),
  "error",
  "unknown read failures must map to error",
);

for (const kind of ["loading", "empty", "denied", "unavailable", "error"]) {
  ok(
    page.includes(`kind=\"${kind}\"`) ||
      page.includes(`kind={kind}`) ||
      detail.includes(`${kind}:`),
    `FVS3 must expose deterministic ${kind} state`,
  );
}
ok(page.includes("inventory.query.isPending"), "loading must derive from the GET query");
ok(page.includes("inventory.query.isError"), "error states must derive from the GET query");
ok(page.includes("inventory.properties.length === 0"), "empty must derive from the read model");
ok(page.includes("inventory.query.refetch()"), "read errors must provide bounded recovery");
ok(page.includes('data-property-inventory-mode="read-only"'), "mode must be verifiable");
ok(page.includes('aria-label="Filtros locais do inventário"'), "filters must have a landmark");
ok(page.includes('aria-label="Buscar imóveis"'), "search must have an accessible name");
ok(page.includes('aria-label="Filtrar por finalidade"'), "purpose filter must be named");
ok(page.includes("sm:grid-cols-4"), "summary must adapt from phone to tablet");
ok(
  page.includes("2xl:grid-cols-[minmax(0,1.36fr)_minmax(23rem,0.64fr)]"),
  "desktop split must be bounded",
);
ok(page.includes("min-w-0"), "nested content must be shrinkable");

ok(grid.includes('role="listbox"'), "inventory grid must expose listbox semantics");
ok(grid.includes('role="option"'), "property cards must expose option semantics");
ok(grid.includes("aria-selected={selected}"), "property cards must expose selection");
ok(grid.includes("focus-visible:ring-2"), "cards must show keyboard focus");
ok(grid.includes("aspect-[16/9]"), "fallback media must reserve aspect ratio");
ok(grid.includes('data-image-fallback="true"'), "grid must expose deterministic image fallback");
ok(grid.includes("motion-safe:"), "card motion must respect reduced motion");
ok(detail.includes('aria-live="polite"'), "detail selection must be announced politely");
ok(
  detail.includes('data-image-fallback="true"'),
  "detail must expose deterministic image fallback",
);
ok(detail.includes('loading="lazy"'), "server images must avoid eager offscreen loading");
ok(detail.includes('decoding="async"'), "server images must decode asynchronously");
ok(
  detail.includes("Criar, editar, excluir e publicar permanecem indisponíveis"),
  "writes must be visibly unavailable",
);

for (const viewport of [
  { width: 375, height: 812, columns: 1 },
  { width: 768, height: 1024, columns: 2 },
  { width: 1440, height: 900, columns: 3 },
] as const) {
  ok(
    viewport.width > 0 && viewport.height > 56,
    `${viewport.width}x${viewport.height} must retain a positive content viewport`,
  );
  const expectedColumns = viewport.width >= 1280 ? 3 : viewport.width >= 640 ? 2 : 1;
  equal(
    viewport.columns,
    expectedColumns,
    `${viewport.width}x${viewport.height} grid must be bounded`,
  );
}

assert.deepEqual(
  pkg.dependencies,
  basePackage.dependencies,
  "runtime dependencies must not change",
);
assertions += 1;
assert.deepEqual(
  pkg.devDependencies,
  basePackage.devDependencies,
  "development dependencies must not change",
);
assertions += 1;
ok(
  pkg.scripts?.["test:pr-m3-fvs3"]?.includes(
    "run-pr-m3-fvs3-property-inventory-read-only-specs.ts",
  ),
  "focused FVS3 script must be pinned",
);
ok(
  pkg.scripts?.["verify:release"]?.startsWith("bun run test:pr-m3-fvs3"),
  "release verification must start with the current FVS3 gate",
);
ok(
  !pkg.scripts?.["verify:release"]?.includes("test:pr-m3-fvs2"),
  "historical FVS2 allowlist gate must be superseded by exact contract parity",
);
ok(
  workflow.includes("Verify PR-M3-FVS3 authenticated property inventory read-only"),
  "Release Gate must name the FVS3 matrix",
);
ok(workflow.includes("PR_M3_FVS3_BASE_SHA"), "Release Gate must bind FVS3 to its audited base");
ok(workflow.includes("bun run test:pr-m3-fvs3"), "Release Gate must execute FVS3");

const evidencePath =
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m3-fvs3-property-inventory-evidence.md";
ok(existsSync(resolve(root, evidencePath)), "FVS3 evidence document must exist");
const evidence = read(evidencePath);
for (const token of [
  "PR-M3-FVS3",
  "FRONTEND_CONTRACT_REGRESSION=0",
  "LOVABLE_PRIVATE_PREVIEW_REQUIRED=true",
  "LOVABLE_PRODUCTION_PUBLISH=false",
  "LOVABLE_ROADMAP_UPDATE=false",
  "PROVIDER_WRITES=0",
  "DATABASE_WRITES=0",
  "PR_105_MERGE=false",
]) {
  ok(evidence.includes(token), `evidence must retain ${token}`);
}

console.log(`PR-M3-FVS3 property inventory read-only gate passed (${assertions} assertions).`);
