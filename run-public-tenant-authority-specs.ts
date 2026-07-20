import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  PublicTenantResolutionError,
  isLocalDevelopmentHostname,
  normalizePublicHostname,
  requireExactlyOneTenant,
  type PublicTenantIdentity,
} from "./src/lib/public-tenant";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function expectCode(fn: () => unknown, code: string) {
  try {
    fn();
  } catch (error) {
    assert(error instanceof PublicTenantResolutionError, `expected PublicTenantResolutionError for ${code}`);
    assert(error.code === code, `expected ${code}, got ${error.code}`);
    return;
  }
  throw new Error(`expected ${code} to be thrown`);
}

const tenant: PublicTenantIdentity = {
  id: "11111111-1111-4111-8111-111111111111",
  nome: "Tenant A",
  slug: "tenant-a",
  dominio_principal: "tenant-a.example.com",
  status: "active",
};

assert(normalizePublicHostname("HTTPS://Tenant-A.Example.com:443/path") === "tenant-a.example.com", "URL host normalization failed");
assert(normalizePublicHostname("tenant-a.example.com:8080") === "tenant-a.example.com", "host:port normalization failed");
assert(normalizePublicHostname("localhost:3000") === "localhost", "localhost normalization failed");
assert(isLocalDevelopmentHostname("localhost"), "localhost must be classified as local");
assert(isLocalDevelopmentHostname("127.0.0.1"), "loopback must be classified as local");
assert(!isLocalDevelopmentHostname("tenant-a.example.com"), "public domain cannot be classified as local");
expectCode(() => normalizePublicHostname(""), "invalid_host");
expectCode(() => requireExactlyOneTenant([], "domain:none"), "tenant_not_found");
expectCode(() => requireExactlyOneTenant([tenant, { ...tenant, id: "22222222-2222-4222-8222-222222222222" }], "domain:duplicate"), "tenant_ambiguous");
assert(requireExactlyOneTenant([tenant], "domain:tenant-a.example.com").id === tenant.id, "exact cardinality failed");

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

const tenantServer = read("src/lib/tenant.server.ts");
assert(!tenantServer.includes("FALLBACK_TENANT_SLUG"), "fallback tenant constant remains");
assert(!tenantServer.includes('"rm-prime"'), "rm-prime fallback remains in tenant resolver");

const scopedModules = [
  "src/lib/api/site.functions.ts",
  "src/lib/api/meta.functions.ts",
  "src/lib/api/pages.functions.ts",
  "src/lib/api/forms.functions.ts",
  "src/lib/api/campaigns.functions.ts",
  "src/lib/api/catalogo.functions.ts",
  "src/lib/api/blog.functions.ts",
  "src/lib/api/lancamentos.functions.ts",
];
for (const path of scopedModules) {
  const source = read(path);
  assert(source.includes("requirePublicTenantContext"), `${path} is not bound to server public tenant context`);
}

const pages = read("src/lib/api/pages.functions.ts");
assert(!pages.includes("tenant_id: z.string().uuid().optional()"), "public page still accepts optional tenant authority");
assert(pages.includes('.eq("tenant_id", tenant.id)'), "public page query lacks tenant equality");

const campaigns = read("src/lib/api/campaigns.functions.ts");
assert(!campaigns.includes("tenantId?:"), "public campaigns still accept client tenant authority");
assert(!campaigns.includes('publicClient(data?.tenantId'), "campaign listing still derives header from client input");
assert(campaigns.includes("tenant_id: tenant.id"), "campaign event insert lacks server tenant attribution");

const forms = read("src/lib/api/forms.functions.ts");
assert(forms.includes('.eq("tenant_id", tenant.id)'), "public forms lack tenant equality");
assert(forms.includes("const tenant_id = tenant.id"), "form submission tenant is not server-derived");

const catalog = read("src/lib/api/catalogo.functions.ts");
assert(catalog.includes("tenant_id: tenant.id"), "public lead insert lacks server tenant attribution");
assert(catalog.includes('.eq("tenant_id", tenant.id)'), "public catalog lacks tenant equality");

const portalLeads = read("src/routes/api/public/portal-leads.ts");
const directIdBlock = portalLeads.slice(portalLeads.indexOf("} else if (imovel_id)"), portalLeads.indexOf("const insertRow"));
assert(directIdBlock.includes('.eq("tenant_id", conn.tenant_id)'), "portal direct property id is not tenant-bound");

console.log(
  JSON.stringify(
    {
      status: "PASS",
      fallbackTenantAuthority: false,
      unknownHostFailsClosed: true,
      clientTenantAuthority: false,
      headerTenantAuthority: false,
      publicSettingsTenantBound: true,
      publicPageTenantBound: true,
      publicFormTenantBound: true,
      publicCampaignTenantBound: true,
      portalDirectPropertyTenantBound: true,
    },
    null,
    2,
  ),
);
