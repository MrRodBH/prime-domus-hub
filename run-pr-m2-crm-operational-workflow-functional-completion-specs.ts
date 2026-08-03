import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = (path: string) => readFileSync(path, "utf8");
let passed = 0;
function check(name: string, fn: () => void) { fn(); passed += 1; console.log(`✓ ${name}`); }

const functions = source("src/lib/api/tenant-crm-functional.functions.ts");
const registry = source("src/lib/crm/crm-functional-registry.ts");
const panel = source("src/components/pipeline/CrmOperationsPanel.tsx");
const migration = source("supabase/migrations/20260803183000_pr_m2_storage_provenance_and_crm_attachment_corrective.sql");

check("CRM attachment contract accepts functional inputs only", () => {
  const schema = registry.slice(registry.indexOf("attachment:"), registry.indexOf("communication:"));
  for (const token of ["leadId", "uploadTargetId", "displayName", "mimeType", "size"]) assert.ok(schema.includes(token), token);
  for (const forbidden of ["bucket", "path", "storageFileName"]) assert.equal(schema.includes(forbidden), false, forbidden);
});

check("all five attachment boundaries are materialized", () => {
  for (const token of [
    "consumeTenantCrmAttachmentUploadTarget", "listTenantCrmAttachments",
    "getTenantCrmAttachmentDownloadUrl", "deleteTenantCrmAttachment",
  ]) assert.ok(functions.includes(token), token);
  for (const token of ["createUploadTarget", 'domain: "crm-attachment"', "uploadTargetId: target.targetId", "Download", "Trash2"]) assert.ok(panel.includes(token), token);
});

check("CRM boundaries never accept caller bucket or path authority", () => {
  const start = functions.indexOf("consumeTenantCrmAttachmentUploadTarget");
  const block = functions.slice(start);
  assert.ok(block.includes("uploadTargetId: z.string().uuid()"));
  assert.equal(block.includes("bucket: z."), false);
  assert.equal(block.includes("path: z."), false);
});

check("tenant, actor, origin, entity, object, replay and scope are fail-closed", () => {
  for (const token of [
    "crm_scope_allows_lead", "FOR UPDATE", "storage.objects", "crm_attachment_target_mismatch",
    "upload_target_actor_mismatch", "upload_target_origin_mismatch", "upload_target_not_pending",
    "upload_target_expired", "upload_target_object_not_found", "upload_target_concurrent_consumption",
  ]) assert.ok(migration.includes(token), token);
});

check("CRM attachment RPCs are service-role-only", () => {
  for (const fn of ["consume_tenant_crm_attachment_upload_target", "delete_tenant_crm_attachment"]) {
    assert.ok(migration.includes(`REVOKE ALL ON FUNCTION public.${fn}`), fn);
    assert.ok(migration.includes(`GRANT EXECUTE ON FUNCTION public.${fn}`), fn);
  }
  assert.equal(/GRANT\s+EXECUTE[\s\S]{0,180}\s+TO\s+(anon|authenticated)/i.test(migration), false);
});

console.log(`PR-M2 CRM workflow specs: ${passed} passed`);
