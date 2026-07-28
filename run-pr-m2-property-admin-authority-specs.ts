import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { requireTenantScopedAuthority } from "./src/lib/api/tenant-scoped-authority";

let passed = 0;

function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`✓ ${name}`);
}

function block(source: string, startMarker: string, endMarker?: string) {
  const start = source.indexOf(startMarker);
  assert.ok(start >= 0, `missing marker: ${startMarker}`);
  const end = endMarker ? source.indexOf(endMarker, start + startMarker.length) : source.length;
  assert.ok(end > start, `missing end marker: ${endMarker ?? "EOF"}`);
  return source.slice(start, end);
}

function source(path: string) {
  return readFileSync(path, "utf8");
}

function listSourceFiles(root: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) results.push(...listSourceFiles(path));
    else if (/\.(ts|tsx)$/.test(entry)) results.push(path);
  }
  return results;
}

const tenantId = "11111111-1111-4111-8111-111111111111";

check("property boundary accepts regular tenant and explicit impersonation", () => {
  assert.equal(
    requireTenantScopedAuthority(
      { tenantId, isSuperAdmin: false, impersonation: false, origin: "selection" },
      "Property Admin",
    ),
    tenantId,
  );
  assert.equal(
    requireTenantScopedAuthority(
      { tenantId, isSuperAdmin: true, impersonation: true, origin: "impersonation" },
      "Property Admin",
    ),
    tenantId,
  );
});

check("property boundary rejects Super Admin without impersonation", () => {
  assert.throws(
    () =>
      requireTenantScopedAuthority(
        { tenantId, isSuperAdmin: true, impersonation: false, origin: "selection" },
        "Property Admin",
      ),
    /requires explicit impersonation/,
  );
});

const property = source("src/lib/api/property-admin.functions.ts");
const barrel = source("src/lib/api/admin.functions.ts");
const legacy = source("src/lib/api/admin.functions.legacy.ts");
const uploads = source("src/lib/api/uploads.functions.ts");
const listRoute = source("src/routes/_authenticated.admin.imoveis.index.tsx");
const detailRoute = source("src/routes/_authenticated.admin.imoveis.$id.tsx");
const form = source("src/components/admin/ImovelForm.tsx");

const propertyExports = [
  "adminListarImoveis",
  "adminObterImovel",
  "adminSalvarImovel",
  "adminExcluirImovel",
  "adminAdicionarImagem",
  "adminRemoverImagem",
  "adminReordenarImagens",
  "adminDefinirCapa",
  "adminAssinarUrl",
] as const;

check("all nine canonical property functions use requireTenant", () => {
  assert.equal(property.match(/\.middleware\(\[requireTenant\]\)/g)?.length ?? 0, 9);
  assert.equal(property.includes("requireSupabaseAuth"), false);
  assert.ok(property.includes('requireTenantScopedAuthority(context.tenant, "Property Admin")'));
});

check("property role validation occurs after tenant authority", () => {
  const helper = property.indexOf("async function assertPropertyAdmin");
  const authority = property.indexOf("requireTenantScopedAuthority", helper);
  const role = property.indexOf('context.supabase.rpc("has_role"', authority);
  assert.ok(helper >= 0 && authority > helper && role > authority);
});

check("each property operation contains explicit tenant authority or server-derived tenant persistence", () => {
  const operations: Array<[string, string | undefined, string[]]> = [
    ["export const adminListarImoveis", "export const adminObterImovel", ['.eq("tenant_id", tenantId)']],
    ["export const adminObterImovel", "export const adminSalvarImovel", ['.eq("tenant_id", tenantId)']],
    ["export const adminSalvarImovel", "export const adminExcluirImovel", ['.eq("tenant_id", tenantId)', "tenant_id: tenantId"]],
    ["export const adminExcluirImovel", "export const adminAdicionarImagem", ['.eq("tenant_id", tenantId)']],
    [
      "export const adminAdicionarImagem",
      "export const adminRemoverImagem",
      [
        "await requireProperty(context, tenantId, data.imovel_id)",
        "validatePropertyImagePath(data.url, tenantId, data.imovel_id)",
        "tenant_id: tenantId",
      ],
    ],
    ["export const adminRemoverImagem", "export const adminReordenarImagens", ['.eq("tenant_id", tenantId)']],
    ["export const adminReordenarImagens", "export const adminDefinirCapa", ['.eq("tenant_id", tenantId)']],
    ["export const adminDefinirCapa", "export const adminAssinarUrl", ['.eq("tenant_id", tenantId)']],
    ["export const adminAssinarUrl", undefined, ['.eq("tenant_id", tenantId)']],
  ];
  for (const [start, end, markers] of operations) {
    const operation = block(property, start, end);
    for (const marker of markers) assert.ok(operation.includes(marker), `${start}:${marker}`);
  }
  for (const table of ["imoveis", "imovel_imagens"]) {
    assert.ok(property.includes(`.from(\"${table}\")`), table);
  }
  assert.ok(property.includes('table: "bairros" | "corretores"'));
  assert.ok(property.includes(".from(table)"));
});

check("property insert derives tenant and creator on the server", () => {
  const save = block(property, "export const adminSalvarImovel", "export const adminExcluirImovel");
  assert.ok(save.includes("tenant_id: tenantId"));
  assert.ok(save.includes("created_by: context.userId"));
  assert.ok(save.includes('requireOptionalReference(context, tenantId, "bairros"'));
  assert.ok(save.includes('requireOptionalReference(context, tenantId, "corretores"'));
});

check("property upload registration validates property and server-issued path", () => {
  const add = block(property, "export const adminAdicionarImagem", "export const adminRemoverImagem");
  const parent = add.indexOf("await requireProperty");
  const validation = add.indexOf("validatePropertyImagePath", parent);
  const insert = add.indexOf('.from("imovel_imagens")', validation);
  assert.ok(parent >= 0 && validation > parent && insert > validation);
  assert.ok(add.includes("tenant_id: tenantId"));
});

check("image deletion ignores client path and removes DB-derived path", () => {
  const remove = block(property, "export const adminRemoverImagem", "export const adminReordenarImagens");
  assert.ok(remove.includes("path: z.string().optional()"));
  assert.equal(remove.includes("data.path"), false);
  const lookup = remove.indexOf('.from("imovel_imagens")');
  const validation = remove.indexOf("validatePropertyImagePath(image.url", lookup);
  const storage = remove.indexOf('.remove([path])', validation);
  const deletion = remove.indexOf('.from("imovel_imagens")', storage);
  assert.ok(lookup >= 0 && validation > lookup && storage > validation && deletion > storage);
});

check("image signing treats client path only as an exact tenant-scoped identifier", () => {
  const sign = block(property, "export const adminAssinarUrl");
  const lookup = sign.indexOf('.from("imovel_imagens")');
  const tenant = sign.indexOf('.eq("tenant_id", tenantId)', lookup);
  const identifier = sign.indexOf('.eq("url", data.path)', tenant);
  const cardinality = sign.indexOf('.limit(2)', identifier);
  const persistedPath = sign.indexOf("validatePropertyImagePath(image.url", cardinality);
  const fixedBucket = sign.indexOf('.from("imoveis")', persistedPath);
  assert.ok(lookup >= 0 && tenant > lookup && identifier > tenant);
  assert.ok(cardinality > identifier && persistedPath > cardinality && fixedBucket > persistedPath);
});

check("image ordering validates the full tenant-owned set before writes", () => {
  const reorder = block(property, "export const adminReordenarImagens", "export const adminDefinirCapa");
  assert.equal(reorder.includes("data.imagem_capa"), false);
  assert.ok(reorder.includes("IDs e posições de imagens devem ser únicos."));
  assert.ok(reorder.includes("sequência contínua iniciada em 1"));
  const readSet = reorder.indexOf('.from("imovel_imagens")');
  const verifyCount = reorder.indexOf("rows ?? []).length !== ids.length", readSet);
  const firstWrite = reorder.indexOf('.update({ ordem: item.ordem })', verifyCount);
  assert.ok(readSet >= 0 && verifyCount > readSet && firstWrite > verifyCount);
});

check("property deletion validates all persisted paths before metadata deletion", () => {
  const remove = block(property, "export const adminExcluirImovel", "export const adminAdicionarImagem");
  const images = remove.indexOf('.from("imovel_imagens")');
  const validate = remove.indexOf("validatePropertyImagePath(image.url", images);
  const storage = remove.indexOf('.from("imoveis")', validate);
  const imageDelete = remove.indexOf('.from("imovel_imagens")', storage);
  const propertyDelete = remove.indexOf('.from("imoveis")', imageDelete);
  assert.ok(images >= 0 && validate > images && storage > validate);
  assert.ok(imageDelete > storage && propertyDelete > imageDelete);
});

check("compatibility barrel explicitly overrides every legacy property export", () => {
  assert.ok(barrel.includes('export * from "./admin.functions.legacy"'));
  assert.ok(barrel.includes('from "./property-admin.functions"'));
  for (const name of propertyExports) assert.ok(barrel.includes(name), name);
  assert.ok(legacy.includes("export const adminSalvarImovel"));
});

check("property routes use the canonical module directly", () => {
  assert.ok(listRoute.includes('from "@/lib/api/property-admin.functions"'));
  assert.ok(detailRoute.includes('from "@/lib/api/property-admin.functions"'));
});

check("existing form remains compatible through the secure barrel", () => {
  assert.ok(form.includes('from "@/lib/api/admin.functions"'));
  for (const name of [
    "adminSalvarImovel",
    "adminAdicionarImagem",
    "adminRemoverImagem",
    "adminAssinarUrl",
    "adminReordenarImagens",
    "adminDefinirCapa",
  ]) {
    assert.ok(form.includes(name), name);
    assert.ok(barrel.includes(name), `barrel:${name}`);
  }
});

check("no source imports the preserved legacy module directly", () => {
  const offenders = listSourceFiles("src")
    .filter((path) => path !== "src/lib/api/admin.functions.legacy.ts")
    .filter((path) => source(path).includes("admin.functions.legacy"));
  assert.deepEqual(offenders, ["src/lib/api/admin.functions.ts"]);
});

check("upload target proves property and launch ownership explicitly", () => {
  const propertyCase = block(uploads, 'case "imoveis"', 'case "lancamento-capa"');
  assert.ok(propertyCase.includes('.eq("tenant_id", tenantId)'));
  assert.ok(propertyCase.includes('.limit(2)'));
  const launchCase = block(uploads, 'case "lancamento-capa"', 'case "blog-cover"');
  assert.ok(launchCase.includes('.eq("tenant_id", tenantId)'));
  assert.ok(launchCase.includes('.limit(2)'));
});

console.log(`PR-M2 property admin authority specs: ${passed} passed`);
