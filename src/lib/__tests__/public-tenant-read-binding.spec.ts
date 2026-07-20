import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`ASSERT: ${message}`);
}

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function section(source: string, start: string, end?: string): string {
  const startIndex = source.indexOf(start);
  assert(startIndex >= 0, `missing section start: ${start}`);
  if (!end) return source.slice(startIndex);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert(endIndex > startIndex, `missing section end: ${end}`);
  return source.slice(startIndex, endIndex);
}

function assertTenantBoundQuery(block: string, label: string) {
  assert(block.includes("requirePublicTenantFromRequest"), `${label} does not require public tenant authority`);
  assert(block.includes('.eq("tenant_id", tenant.id)'), `${label} lacks explicit tenant equality`);
  assert(block.includes("supabaseAdmin"), `${label} does not use an explicit server-side read client`);
}

export const specs: Array<{ name: string; run: () => Promise<void> }> = [
  {
    name: "required public tenant helper fails closed",
    run: async () => {
      const source = read("src/lib/tenant.server.ts");
      const block = section(source, "export async function requirePublicTenantFromRequest", "export function publicSupabaseForTenant");
      assert(block.includes("resolvePublicTenantFromRequest"), "required helper bypasses accepted PTC resolver");
      assert(block.includes("if (!tenant) throw"), "unresolved public tenant does not throw");
      assert(!block.includes("return null"), "required helper can return null");
    },
  },
  {
    name: "public site settings are tenant-bound",
    run: async () => {
      const source = read("src/lib/api/site.functions.ts");
      const block = section(source, "export const obterSiteSettings", "export const atualizarSiteSettings");
      assertTenantBoundQuery(block, "public site settings");
      assert(!block.includes("publicClient"), "public settings still use a global anonymous client");
      assert(!block.includes("catch"), "public settings silently convert authority/query failure");
    },
  },
  {
    name: "public Meta pixel settings are tenant-bound",
    run: async () => {
      const source = read("src/lib/api/meta.functions.ts");
      const block = section(source, "export const obterMetaPixelId", "export const obterMetaConfigAdmin");
      assertTenantBoundQuery(block, "public Meta settings");
      assert(block.indexOf('.eq("tenant_id", tenant.id)') < block.indexOf('.eq("key", "meta_integracao")'), "Meta tenant equality must precede the key selector");
    },
  },
  {
    name: "public CMS page lookup uses Host tenant plus strict slug input",
    run: async () => {
      const source = read("src/lib/api/pages.functions.ts");
      const block = section(source, "export const obterPaginaPublica");
      assertTenantBoundQuery(block, "public CMS page");
      assert(!block.includes("tenant_id: z.string"), "public page accepts client tenant input");
      assert(block.includes(".strict().parse(d)"), "public page does not reject unknown tenant fields");
      assert(!block.includes("publicClient"), "public page still uses a global anonymous client");
      assert(block.indexOf('.eq("tenant_id", tenant.id)') < block.indexOf('.eq("slug", data.slug)'), "tenant equality must precede slug lookup");
      assert(block.includes('.eq("status", "published")'), "public page does not enforce published status");
    },
  },
  {
    name: "active public campaign listing is tenant-bound with strict empty input",
    run: async () => {
      const source = read("src/lib/api/campaigns.functions.ts");
      const block = section(source, "export const listarCampanhasAtivas", "export const registrarEventoCampanha");
      assertTenantBoundQuery(block, "public campaign listing");
      assert(!block.includes("tenantId"), "campaign listing still accepts client tenant input");
      assert(block.includes("z.object({}).strict()"), "campaign listing does not reject unknown tenant fields");
      assert(!block.includes("publicClient"), "campaign listing still derives transport from client input");
      assert(!block.includes("return []"), "campaign listing converts authority/query failure into empty success");
      assert(block.includes("throw new Error(error.message)"), "campaign listing does not fail closed on query error");
    },
  },
  {
    name: "campaign event writer remains explicitly outside PTR-01",
    run: async () => {
      const source = read("src/lib/api/campaigns.functions.ts");
      const writer = section(source, "export const registrarEventoCampanha");
      assert(writer.includes("tenantId?: string | null"), "PTR-01 silently changed the PTW-01 writer contract");
      assert(writer.includes("publicClient(data.tenantId ?? null)"), "PTR-01 silently changed writer transport");
      assert(writer.includes("PTW-01 owns this public mutation"), "writer ownership boundary is not explicit");
    },
  },
  {
    name: "public campaign consumer supplies no tenant authority",
    run: async () => {
      const source = read("src/components/site/CampaignRenderer.tsx");
      const query = section(source, "queryFn:", "staleTime:");
      assert(query.includes("listarCampanhasAtivas({ data: {} })"), "campaign consumer call shape is unexpected");
      assert(!query.includes("tenantId"), "campaign consumer supplies tenant authority");
    },
  },
];

export async function runPublicTenantReadBindingSpecs(): Promise<{ passed: number; failed: number }> {
  let passed = 0;
  let failed = 0;
  for (const spec of specs) {
    try {
      await spec.run();
      passed++;
    } catch (error) {
      failed++;
      console.error(`✗ ${spec.name}\n  ${error instanceof Error ? error.message : error}`);
    }
  }
  return { passed, failed };
}
