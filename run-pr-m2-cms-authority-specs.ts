import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = (path: string) => readFileSync(path, "utf8");
let passed = 0;
function check(name: string, fn: () => void) { fn(); passed += 1; console.log(`✓ ${name}`); }

const media = source("src/lib/api/media.functions.ts");
const uploads = source("src/lib/api/uploads.functions.ts");
const blog = source("src/lib/api/blog.functions.ts");
const launch = source("src/lib/api/lancamentos.functions.ts");
const broker = source("src/lib/api/tenant-broker-directory.functions.ts");
const brokerRoute = source("src/routes/_authenticated.admin.corretores.tsx");
const migration = source("supabase/migrations/20260803183000_pr_m2_storage_provenance_and_crm_attachment_corrective.sql");

check("media registration accepts only target ids as storage authority", () => {
  const block = media.slice(media.indexOf("export const registrarMidia"), media.indexOf("export const atualizarMidia"));
  assert.ok(block.includes("uploadTargetId: z.string().uuid()"));
  assert.ok(block.includes("derivativeTargetIds"));
  assert.ok(block.includes("consume_tenant_media_upload_target"));
  for (const token of ["uploadTarget:", "bucket: z.", "path: z.", "storageFileName:"]) assert.equal(block.includes(token), false, token);
});

check("blog and launch legacy mutations reject caller media paths", () => {
  assert.equal(blog.includes("imagem_capa: z.string"), false);
  assert.equal(launch.includes("imagem_capa: z.string"), false);
  assert.equal(launch.includes("og_image: z.string"), false);
  assert.ok(blog.includes(".strict()"));
  assert.ok(launch.includes(".strict()"));
});

check("broker photo target is entity-bound and atomically consumed", () => {
  assert.ok(uploads.includes('case "corretor-foto": {'));
  assert.ok(uploads.includes('.eq("id", data.entityId)'));
  assert.ok(uploads.includes('subPath = `corretores/${entityId}/${storageFileName}`'));
  assert.ok(broker.includes("consumeTenantBrokerPhotoUploadTarget"));
  assert.ok(broker.includes("consume_tenant_broker_photo_upload_target"));
  assert.equal(broker.includes("foto_url: data.foto_url"), false);
  assert.ok(brokerRoute.includes("entityId: editing.id"));
  assert.ok(brokerRoute.includes("uploadTargetId: target.targetId"));
  assert.equal(brokerRoute.includes("adminAssinarUrl"), false);
});

check("migration proves target provenance and service-role-only ACL", () => {
  for (const token of [
    "FOR UPDATE", "storage.objects", "upload_target_not_pending", "upload_target_expired",
    "upload_target_actor_mismatch", "upload_target_origin_mismatch", "upload_target_concurrent_consumption",
    "REVOKE ALL ON FUNCTION", "GRANT EXECUTE ON FUNCTION", "TO service_role",
  ]) assert.ok(migration.includes(token), token);
  assert.equal(/GRANT\s+EXECUTE[\s\S]{0,180}\s+TO\s+(anon|authenticated)/i.test(migration), false);
});

console.log(`PR-M2 CMS authority specs: ${passed} passed`);
