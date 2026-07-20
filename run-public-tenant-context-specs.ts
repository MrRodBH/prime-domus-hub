import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  PublicTenantResolutionError,
  isLocalDevelopmentHostname,
  normalizePublicHostname,
  requireExactlyOneTenant,
  requiresPublicTenantPreflight,
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
};

assert(
  normalizePublicHostname("HTTPS://Tenant-A.Example.com:443/path") === "tenant-a.example.com",
  "URL hostname normalization failed",
);
assert(
  normalizePublicHostname("tenant-a.example.com:8080") === "tenant-a.example.com",
  "host:port normalization failed",
);
assert(
  normalizePublicHostname("www.tenant-a.example.com") === "tenant-a.example.com",
  "www alias normalization failed",
);
assert(normalizePublicHostname("localhost:3000") === "localhost", "localhost normalization failed");
assert(normalizePublicHostname("[::1]") === "::1", "IPv6 loopback normalization failed");
assert(isLocalDevelopmentHostname("localhost"), "localhost must be local");
assert(isLocalDevelopmentHostname("127.0.0.1"), "IPv4 loopback must be local");
assert(isLocalDevelopmentHostname("::1"), "IPv6 loopback must be local");
assert(!isLocalDevelopmentHostname("tenant-a.example.com"), "public domain cannot be local");
expectCode(() => normalizePublicHostname(""), "invalid_host");
expectCode(() => requireExactlyOneTenant([], "domain:none"), "tenant_not_found");
expectCode(
  () => requireExactlyOneTenant([tenant, { ...tenant, id: "22222222-2222-4222-8222-222222222222" }], "domain:duplicate"),
  "tenant_ambiguous",
);
assert(requireExactlyOneTenant([tenant], "domain:tenant-a.example.com").id === tenant.id, "exact cardinality failed");

for (const publicPath of [
  "/",
  "/imoveis",
  "/imovel/casa-a",
  "/blog/",
  "/p/pagina",
  "/sitemap.xml",
  "/administrator",
  "/authentic",
  "/apiary",
  "/unsubscribed",
]) {
  assert(requiresPublicTenantPreflight(publicPath), `${publicPath} must require public tenant preflight`);
}
for (const excludedPath of [
  "/admin",
  "/admin/leads",
  "/super",
  "/auth",
  "/reset-password",
  "/api/public/portal-leads",
  "/lovable/email/queue/process",
  "/email/unsubscribe",
]) {
  assert(!requiresPublicTenantPreflight(excludedPath), `${excludedPath} must not use the public-site preflight`);
}

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

const tenantServer = read("src/lib/tenant.server.ts");
assert(!tenantServer.includes("FALLBACK_TENANT_SLUG"), "fallback tenant constant remains");
assert(!tenantServer.includes('"rm-prime"'), "RM Prime fallback authority remains");
assert(tenantServer.includes("resolvePublicTenantForHostname"), "compatibility resolver does not delegate to canonical authority");
assert(tenantServer.includes("x-tenant-id header is never an"), "transport-only header contract is not explicit");

const resolver = read("src/lib/public-tenant.server.ts");
assert(resolver.includes("getRequest"), "request host is not derived server-side");
assert(resolver.includes(".eq(field, value)"), "tenant registry lookup is not exact");
assert(resolver.includes("requireExactlyOneTenant"), "tenant cardinality is not enforced");
assert(resolver.includes("PUBLIC_DEV_TENANT_SLUG"), "local mapping is not explicit");
assert(resolver.includes("dominio_principal"), "domain authority lookup is missing");
assert(!resolver.includes("x-tenant-id"), "request header is being used as public tenant authority");
assert(!resolver.includes("maybeSingle"), "registry ambiguity could be collapsed by maybeSingle");

const preflight = read("src/lib/api/public-tenant.functions.ts");
assert(preflight.includes("requiresPublicTenantPreflight"), "public/non-public route classification is missing");
assert(preflight.includes("requirePublicTenantContext"), "public preflight does not invoke canonical resolver");
assert(!preflight.includes("tenant_id:"), "preflight discloses tenant id to the client");
assert(!preflight.includes("tenant_slug:"), "preflight discloses tenant slug to the client");
assert(!preflight.includes("authority:"), "preflight discloses internal authority metadata");

const rootRoute = read("src/routes/__root.tsx");
const preflightIndex = rootRoute.indexOf("await preflightPublicTenant()");
const settingsIndex = rootRoute.indexOf("obterSiteSettings");
assert(preflightIndex >= 0, "root loader does not execute tenant preflight");
assert(settingsIndex > preflightIndex, "public data is loaded before tenant preflight");

console.log(
  JSON.stringify(
    {
      status: "PASS",
      fallbackTenantAuthority: false,
      requestHostDerivedServerSide: true,
      hostNormalizationDeterministic: true,
      routeClassificationBoundarySafe: true,
      unknownHostFailsClosed: true,
      absentHostFailsClosed: true,
      ambiguousHostFailsClosed: true,
      developmentHostMappingExplicitOnly: true,
      clientTenantAuthority: false,
      headerTenantAuthority: false,
      tenantIdentityDisclosedByPreflight: false,
      rootPublicTenantPreflight: true,
    },
    null,
    2,
  ),
);
