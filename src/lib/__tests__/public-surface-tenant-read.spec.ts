import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertTenantScopedRows, withoutTenantId } from "@/lib/public-tenant-read-guards";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`ASSERT: ${message}`);
}
function read(path: string): string { return readFileSync(resolve(process.cwd(), path), "utf8"); }
function section(source: string, start: string, end?: string): string {
  const begin = source.indexOf(start);
  assert(begin >= 0, `missing section: ${start}`);
  const finish = end ? source.indexOf(end, begin + start.length) : source.length;
  assert(finish > begin, `missing section end: ${end}`);
  return source.slice(begin, finish);
}
function tenantBound(block: string, label: string) {
  assert(block.includes("requirePublicTenantFromRequest"), `${label} lacks Host-derived tenant`);
  assert(block.includes('.eq("tenant_id", tenant.id)'), `${label} lacks explicit tenant equality`);
  assert(block.includes("assertTenantScopedRows"), `${label} lacks tenant post-validation`);
  assert(!block.includes("publicClient()") && !block.includes("sbPublic()"), `${label} retains global anonymous authority`);
}

export const specs: Array<{ name: string; run: () => Promise<void> }> = [
  {
    name: "tenant row guard rejects mixed and foreign collections and strips authority",
    run: async () => {
      const accepted = assertTenantScopedRows("tenant-a", [{ tenant_id: "tenant-a", id: "1" }]);
      assert((withoutTenantId(accepted[0]) as { tenant_id?: string }).tenant_id === undefined, "tenant_id leaked into DTO");
      for (const rows of [
        [{ tenant_id: "tenant-b", id: "1" }],
        [{ tenant_id: "tenant-a", id: "1" }, { tenant_id: "tenant-b", id: "2" }],
      ]) {
        let denied = false;
        try { assertTenantScopedRows("tenant-a", rows); } catch { denied = true; }
        assert(denied, "foreign or mixed-tenant collection accepted");
      }
    },
  },
  {
    name: "public blog list categories and detail are tenant-bound with explicit detail cardinality",
    run: async () => {
      const source = read("src/lib/api/blog.functions.ts");
      tenantBound(section(source, "export const listarPostsPublicos", "export const obterPostPublico"), "blog list");
      const detail = section(source, "export const obterPostPublico", "export const listarCategoriasPublicas");
      tenantBound(detail, "blog detail");
      assert(detail.includes(".limit(2)") && !detail.includes(".maybeSingle()"), "blog detail cardinality is implicit");
      tenantBound(section(source, "export const listarCategoriasPublicas", "// ============ ADMIN"), "blog categories");
      assert(source.includes("blog_categorias(tenant_id") && source.includes("corretores(tenant_id"), "blog nested tenant compatibility missing");
    },
  },
  {
    name: "public menu collection is tenant-bound and destination-normalized",
    run: async () => {
      const block = section(read("src/lib/api/menu.functions.ts"), "export const listarMenuPublico", "export const listarMenuAdmin");
      tenantBound(block, "menu");
      assert(block.includes("normalizePublicNavigationUrl"), "menu destination normalization missing");
    },
  },
  {
    name: "public launch collections and detail are tenant plus parent bound",
    run: async () => {
      const source = read("src/lib/api/lancamentos.functions.ts");
      tenantBound(section(source, "export const listarStatusLancamento", "// ===== Amenities"), "launch statuses");
      tenantBound(section(source, "export const listarAmenities", "// ===== Listar empreendimentos"), "launch amenities");
      tenantBound(section(source, "export const listarLancamentosPublico", "export const obterLancamentoPublico"), "launch list");
      const detail = section(source, "export const obterLancamentoPublico");
      tenantBound(detail, "launch detail");
      assert(detail.includes(".limit(2)") && !detail.includes(".maybeSingle()"), "launch detail cardinality is implicit");
      assert(detail.includes('.eq("project_id", projectId)'), "launch child reads are not parent-bound");
      assert(detail.includes('.eq("tenant_id", tenant.id).eq("project_id", projectId)'), "launch child reads are not tenant+parent bound");
    },
  },
  {
    name: "catalog cities neighborhoods and property detail are tenant-bound",
    run: async () => {
      const source = read("src/lib/api/catalogo.functions.ts");
      tenantBound(section(source, "export const listarImoveis", "export const listarCidades"), "property catalog");
      tenantBound(section(source, "export const listarCidades", "export const listarBairros"), "cities");
      tenantBound(section(source, "export const listarBairros", "export const obterImovel"), "neighborhoods");
      const detail = section(source, "export const obterImovel", "const publicLeadSchema");
      tenantBound(detail, "property detail");
      assert(detail.includes(".limit(2)") && !detail.includes(".maybeSingle()"), "property detail cardinality is implicit");
      assert(detail.indexOf("requirePublicTenantFromRequest") < detail.indexOf("supabaseAdmin"), "property service role precedes tenant authority");
      assert(detail.indexOf("assertTenantScopedRows") < detail.indexOf("publicMediaUrl"), "property signing precedes resource authority");
      assert(detail.includes("toEmbedUrl"), "property video/tour policy missing");
    },
  },
  {
    name: "public lead writer boundary remains outside PSG read remediation",
    run: async () => {
      const writer = section(read("src/lib/api/catalogo.functions.ts"), "const publicLeadSchema");
      assert(writer.includes("requirePublicWriterTenantFromRequest"), "PTW Host authority removed");
      assert(writer.includes("writePublicLead"), "PTW writer delegation removed");
      assert(!writer.includes("requirePublicTenantFromRequest"), "PSG read authority replaced PTW writer authority");
    },
  },
];

export async function runPublicSurfaceTenantReadSpecs(): Promise<{ passed: number; failed: number }> {
  let passed = 0;
  let failed = 0;
  for (const spec of specs) {
    try { await spec.run(); passed += 1; }
    catch (error) { failed += 1; console.error(`✗ ${spec.name}\n  ${error instanceof Error ? error.message : error}`); }
  }
  return { passed, failed };
}
