import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { requireTenantScopedAuthority } from "./src/lib/api/tenant-scoped-authority";

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`✓ ${name}`);
}

const tenantId = "11111111-1111-4111-8111-111111111111";
const property = readFileSync("src/lib/api/property-admin.functions.ts", "utf8");
const uploads = readFileSync("src/lib/api/uploads.functions.ts", "utf8");
const contract = readFileSync("src/lib/storage/upload-contract.ts", "utf8");
const migration = readFileSync("supabase/migrations/20260730043000_pr_m2_consolidated_final_corrective.sql", "utf8");
const barrel = readFileSync("src/lib/api/admin.functions.ts", "utf8");

check("property boundary accepts regular tenant and explicit impersonation", () => {
  assert.equal(requireTenantScopedAuthority({ tenantId, isSuperAdmin: false, impersonation: false, origin: "selection" }, "Property"), tenantId);
  assert.equal(requireTenantScopedAuthority({ tenantId, isSuperAdmin: true, impersonation: true, origin: "impersonation" }, "Property"), tenantId);
});

check("Super Admin without impersonation is denied", () => {
  assert.throws(() => requireTenantScopedAuthority({ tenantId, isSuperAdmin: true, impersonation: false, origin: "selection" }, "Property"), /requires explicit impersonation/);
});

check("all property server functions use requireTenant", () => {
  assert.equal(property.match(/\.middleware\(\[requireTenant\]\)/g)?.length ?? 0, 9);
  assert.equal(property.includes("requireSupabaseAuth"), false);
});

check("Tenant Access Control is the only property role authority", () => {
  for (const token of [
    "resolveEffectiveTenantPermission",
    "trustedTenantAccessContext",
    "requireTenantScopedAuthority",
    '"cms.paginas"',
    '"cms.midias"',
    'decision.scope !== "global"',
  ]) assert.ok(property.includes(token), token);
  assert.equal(property.includes('.rpc("has_role"'), false);
  assert.equal(property.includes('.from("user_roles")'), false);
});

check("property operations are closed and action-mapped", () => {
  for (const operation of ["list", "read", "create", "update", "delete", "media.manage", "publish"]) {
    assert.ok(property.includes(`"${operation}"`), operation);
  }
  for (const action of ["visualizar", "criar", "editar", "excluir", "publicar"]) {
    assert.ok(property.includes(`action: "${action}"`), action);
  }
});

check("property and related resource reads are tenant filtered with explicit cardinality", () => {
  assert.ok((property.match(/\.eq\("tenant_id", tenantId\)/g)?.length ?? 0) >= 20);
  assert.ok((property.match(/\.limit\(2\)/g)?.length ?? 0) >= 6);
  for (const table of ["imoveis", "imovel_imagens", "bairros", "corretores"]) {
    assert.ok(property.includes(`.from("${table}")`) || property.includes(".from(table)"), table);
  }
});

check("image registration accepts uploadTargetId and never a raw path", () => {
  const start = property.indexOf("export const adminAdicionarImagem");
  const end = property.indexOf("export const adminRemoverImagem", start);
  const block = property.slice(start, end);
  assert.ok(block.includes("uploadTargetId: z.string().uuid()"));
  assert.equal(block.includes("url: z.string"), false);
  assert.equal(block.includes("path: z.string"), false);
  assert.ok(block.includes('"consume_tenant_property_upload_target"'));
  assert.ok(block.includes("_target_id: data.uploadTargetId"));
  assert.equal(block.includes('.from("imovel_imagens").insert'), false);
});

check("image removal ignores client storage path", () => {
  const start = property.indexOf("export const adminRemoverImagem");
  const end = property.indexOf("export const adminReordenarImagens", start);
  const block = property.slice(start, end);
  assert.equal(block.includes("path: z.string"), false);
  assert.ok(block.includes("validatePropertyImagePath(image.url"));
  assert.ok(block.includes(".remove([path])"));
});

check("upload target is persisted before transport data is returned", () => {
  for (const token of [
    "register_tenant_upload_target",
    "targetResultSchema.parse",
    "targetId",
    "expiresAt",
    "context.tenant.origin",
  ]) assert.ok(uploads.includes(token), token);
  assert.ok(contract.includes("targetId: string"));
  assert.ok(contract.includes("dados de transporte"));
});

check("provenance ledger is service-role-only and atomic", () => {
  for (const token of [
    "CREATE TABLE IF NOT EXISTS public.tenant_upload_targets",
    "status IN ('pending', 'consumed', 'expired', 'cancelled')",
    "CREATE OR REPLACE FUNCTION public.register_tenant_upload_target",
    "CREATE OR REPLACE FUNCTION public.consume_tenant_property_upload_target",
    "FROM storage.objects",
    "FOR UPDATE",
    "upload_target_not_pending",
    "upload_target_expired",
    "upload_target_actor_mismatch",
    "upload_target_property_mismatch",
    "upload_target_concurrent_consumption",
    "GRANT EXECUTE ON FUNCTION public.consume_tenant_property_upload_target",
  ]) assert.ok(migration.includes(token), token);
  assert.equal(/GRANT\s+EXECUTE[\s\S]{0,200}\s+TO\s+(anon|authenticated)/i.test(migration), false);
});

check("administrative barrel has no wildcard legacy export", () => {
  assert.equal(barrel.includes('export * from "./admin.functions.legacy"'), false);
  assert.equal(barrel.includes("export * from './admin.functions.legacy'"), false);
  assert.ok(barrel.includes('from "./property-admin.functions"'));
});

console.log(`PR-M2 property admin authority specs: ${passed} passed`);
