import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const source = (path: string) => readFileSync(path, "utf8");
const walk = (dir: string): string[] => readdirSync(dir).flatMap((name) => { const p = join(dir, name); return statSync(p).isDirectory() ? walk(p) : [p]; });
let passed = 0;
function check(name: string, fn: () => void) { fn(); passed += 1; console.log(`✓ ${name}`); }

const migration = source("supabase/migrations/20260803183000_pr_m2_storage_provenance_and_crm_attachment_corrective.sql");
const media = source("src/lib/api/media.functions.ts");
const broker = source("src/lib/api/tenant-broker-directory.functions.ts");
const crm = source("src/lib/api/tenant-crm-functional.functions.ts");
const blog = source("src/lib/api/blog.functions.ts");
const launch = source("src/lib/api/lancamentos.functions.ts");

check("migration is additive, atomic and search-path hardened", () => {
  assert.ok(migration.includes("BEGIN;"));
  assert.ok(migration.trimEnd().endsWith("COMMIT;"));
  assert.ok((migration.match(/SECURITY DEFINER/g) ?? []).length >= 5);
  assert.ok((migration.match(/SET\s+search_path\s*=\s*public\s*,\s*pg_temp/g) ?? []).length >= 5);
  assert.equal(migration.includes("DROP TABLE"), false);
  assert.equal(migration.includes("DROP COLUMN"), false);
});

check("all target consumers use the shared lock, validation and one-time consumption boundary", () => {
  for (const token of [
    "prm2_lock_upload_target", "FOR UPDATE", "storage.objects",
    "upload_target_origin_mismatch", "upload_target_not_pending", "upload_target_expired",
    "consumed_at=now()", "upload_target_concurrent_consumption",
  ]) assert.ok(migration.includes(token), token);
  assert.ok(/status\s*=\s*'consumed'/.test(migration));
});

check("runtime has no raw caller path authority or signed-url persistence", () => {
  const registration = media.slice(media.indexOf("export const registrarMidia"), media.indexOf("export const atualizarMidia"));
  assert.equal(registration.includes("data.uploadTarget.path"), false);
  assert.equal(registration.includes("data.uploadTarget.bucket"), false);
  assert.equal(broker.includes("foto_url: data.foto_url"), false);
  assert.equal(blog.includes("imagem_capa: z.string"), false);
  assert.equal(launch.includes("imagem_capa: z.string"), false);
  assert.equal(launch.includes("og_image: z.string"), false);
});

check("CRM attachments expose complete server-only lifecycle", () => {
  for (const token of ["consumeTenantCrmAttachmentUploadTarget", "listTenantCrmAttachments", "getTenantCrmAttachmentDownloadUrl", "deleteTenantCrmAttachment"]) assert.ok(crm.includes(token), token);
  assert.equal(crm.includes("bucket: z."), false);
  assert.equal(crm.includes("path: z."), false);
});

check("active application does not import legacy administrative authority", () => {
  const files = walk("src").filter((path) => /\.(ts|tsx)$/.test(path) && !path.endsWith("admin.functions.legacy.ts"));
  const offenders = files.filter((path) => source(path).includes("admin.functions.legacy"));
  assert.deepEqual(offenders, []);
});

console.log(`PR-M2 consolidated corrective specs: ${passed} passed`);
