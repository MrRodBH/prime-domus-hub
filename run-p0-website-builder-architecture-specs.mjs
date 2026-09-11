import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const registry = read("./src/lib/api/configuration-registry.ts");
const cms = read("./src/lib/api/tenant-cms.functions.ts");
const wizard = read("./src/components/site-builder/WebsiteSetupWizard.tsx");
const route = read("./src/routes/_authenticated.admin.site.tsx");
const tenantRoute = read("./src/routes/_authenticated.$tenantSlug.admin.tsx");
const tenantApi = read("./src/lib/api/tenant.functions.ts");
const contexts = read("./src/components/workspace/contexts.ts");

for (const key of ["website_setup_status", "website_setup_step", "website_theme", "logo_alignment", "website_selected_pages", "website_preview_viewport"]) {
  assert.match(registry, new RegExp(`\\"${key}\\"`), `registry missing ${key}`);
}
assert.match(cms, /middleware\(\[requireTenant\]\)/);
assert.doesNotMatch(cms.match(/export const provisionTenantWebsiteDrafts[\s\S]*?publication: "explicit_only"/)?.[0] ?? "", /tenantId:\s*z\./);
assert.match(cms, /\.eq\("tenant_id", auth\.tenantId\)/);
assert.match(cms, /cms_page_slug_conflict/);
assert.match(cms, /status: "draft"/);
assert.match(cms, /seo: \{ noindex: true \}/);
assert.doesNotMatch(wizard, /localStorage|sessionStorage/);
assert.match(wizard, /Configurar depois/);
assert.match(wizard, /Gerar website como rascunho/);
assert.match(wizard, /Nada será publicado sem confirmação/);
assert.doesNotMatch(wizard, /publishTenant/);
assert.match(route, /<WebsiteSetupWizard \/>/);
assert.match(tenantRoute, /params\.tenantSlug !== tenant\.slug/);
assert.match(tenantRoute, /meuTenantWorkspace/);
assert.match(tenantApi, /middleware\(\[requireTenant\]\)/);
assert.match(tenantApi, /\.eq\("id", context\.tenant\.tenantId\)/);
assert.match(contexts, /root: "\/admin\/site"/);
assert.match(contexts, /label: "Website"/);
console.log("P0 website builder architecture specs: PASS");
