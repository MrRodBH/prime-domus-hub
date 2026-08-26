import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const migrations = [
  "20260728165000_pr_m2_tenant_lifecycle.sql",
  "20260728180000_pr_m2_tenant_access_control.sql",
  "20260728233000_pr_m2_configuration_center.sql",
  "20260729103000_pr_m2_portal_functional_completion.sql",
  "20260729183000_pr_m2_cms_workflow_functional_completion.sql",
  "20260729211500_pr_m2_crm_operational_workflow.sql",
  "20260729233000_pr_m2_marketing_channels_lead_ingestion.sql",
  "20260730010000_pr_m2_analytics_tracking_conversion_events.sql",
  "20260730043000_pr_m2_consolidated_final_corrective.sql",
  "20260730050000_pr_m2_cms_functional_inventory.sql",
  "20260730051500_pr_m2_marketing_adapter_activation.sql",
  "20260730053000_pr_m2_marketing_and_cms_corrective_hardening.sql",
  "20260730060000_pr_m2_super_control_plane.sql",
  "20260730100000_pr_m2_content_upload_target_consumers.sql",
  "20260730101000_pr_m2_launch_project_transactional_save.sql",
  "20260803183000_pr_m2_storage_provenance_and_crm_attachment_corrective.sql",
] as const;

const migration = (name: string) => readFileSync(`supabase/migrations/${name}`, "utf8");
const all = migrations.map(migration);
const lifecycle = all[0];
const access = all[1];
const configuration = all[2];
const portals = all[3];
const cms = all[4];
const crm = all[5];
const marketing = all[6];
const tracking = all[7];
const adapter = all[10];
const orchestrator = migration("20260826185014_pca_04_exact_tenant_product_baseline.sql");
const parityManifest = JSON.parse(
  readFileSync(
    "docs/architecture/impact-analysis/manifests/PCA-04-product-schema-parity-manifest.json",
    "utf8",
  ),
) as {
  repositoryMigrations: Array<{ path: string; sha256: string }>;
  liveOnlyQuarantined: Array<{ classification: string }>;
  sameBackendMutation: boolean;
};

for (const [index, sql] of all.entries()) {
  assert.match(sql, /\bBEGIN;/, `${migrations[index]} must begin an explicit transaction`);
  assert.match(sql, /^COMMIT;$/m, `${migrations[index]} must commit explicitly`);
}

for (const marker of [
  "current_setting('app.pr_m2_authorized_tenant_ids', true)",
  "current_setting('app.pr_m2_authorized_tenant_manifest_sha256', true)",
  "current_setting('app.pr_m2_owner_authorization', true)",
  "pr_m2_manifest_sha256_mismatch",
  "pr_m2_manifest_duplicate_tenant_id",
  "IF v_raw IS NULL OR btrim(v_raw) IN ('', '[]') THEN",
  "REVOKE ALL ON FUNCTION prm2_rebaseline.authorized_tenant_ids()",
])
  assert.ok(lifecycle.includes(marker), `exact-manifest boundary missing ${marker}`);

for (const sql of [access, configuration, portals, cms, crm, marketing, tracking, adapter]) {
  assert.ok(
    sql.includes("prm2_rebaseline.authorized_tenant_ids()"),
    "tenant DML migration must use the exact UUID manifest",
  );
}

assert.ok(
  !access.includes("ALTER COLUMN tenant_id SET NOT NULL"),
  "unselected legacy assignments must remain recoverable",
);
assert.ok(
  access.includes("rbac_profiles_tenant_contract") && access.includes(") NOT VALID;"),
  "new RBAC writes need a non-destructive contract",
);
assert.ok(
  access.includes("user_profiles_tenant_required CHECK (tenant_id IS NOT NULL) NOT VALID"),
  "new profile assignments must require exact tenant authority",
);
assert.ok(
  !portals.includes("feed_token = NULL") && !portals.includes("webhook_secret = NULL"),
  "portal secrets must not be erased",
);
assert.ok(
  portals.includes("portal_connectors_no_plaintext_credentials_check") &&
    portals.includes(") NOT VALID;"),
  "new portal writes must reject plaintext without validating legacy rows",
);
assert.ok(
  !portals.includes("ALTER COLUMN connector_id SET NOT NULL"),
  "unselected legacy portal projections must remain recoverable",
);

for (const sql of [...all, orchestrator]) {
  assert.doesNotMatch(
    sql,
    /scp0121|slug\s+(?:NOT\s+)?LIKE|nome\s+(?:NOT\s+)?LIKE/i,
    "tenant selection by prefix or name is forbidden",
  );
  assert.ok(
    !sql.includes("9664d189-4a12-4caa-8243-dc73383447e6"),
    "protected tenant UUID must not be embedded",
  );
}

for (const marker of [
  "FUNCTION public.provision_tenant_product_baseline(_tenant_id uuid)",
  "FUNCTION public.provision_authorized_tenant_product_baselines(",
  "product_baseline_manifest_sha256_mismatch",
  "AFTER INSERT ON public.tenants",
  "PERFORM public.provision_tenant_product_baseline(NEW.id)",
  "product_baseline_postflight_failed",
  "ON CONFLICT (tenant_id, channel_key) DO NOTHING",
  "ON CONFLICT (tenant_id, provider_key) DO NOTHING",
  "GRANT EXECUTE ON FUNCTION public.provision_authorized_tenant_product_baselines(uuid[],text,text) TO service_role",
])
  assert.ok(orchestrator.includes(marker), `orchestrator missing ${marker}`);

assert.ok(orchestrator.trimEnd().endsWith("COMMIT;"), "orchestrator migration must be atomic");
assert.ok(
  !orchestrator.includes(
    "GRANT EXECUTE ON FUNCTION public.provision_tenant_product_baseline(uuid) TO service_role",
  ),
  "single-tenant backfill primitive must not bypass the manifest",
);
assert.doesNotMatch(
  orchestrator,
  /DROP\s+(TABLE|COLUMN)|TRUNCATE|DELETE\s+FROM/i,
  "orchestrator must be additive",
);

assert.equal(parityManifest.repositoryMigrations.length, 17);
for (const entry of parityManifest.repositoryMigrations) {
  const actual = createHash("sha256").update(readFileSync(entry.path)).digest("hex");
  assert.equal(actual, entry.sha256, `manifest hash mismatch: ${entry.path}`);
}
assert.equal(parityManifest.liveOnlyQuarantined.length, 4);
assert.ok(
  parityManifest.liveOnlyQuarantined.every(
    (entry) => entry.classification === "LIVE_ONLY_QUARANTINED",
  ),
);
assert.equal(parityManifest.sameBackendMutation, false);

console.log(
  JSON.stringify(
    {
      status: "PASS",
      correctedHistoricalMigrations: migrations.length,
      totalMigrations: migrations.length + 1,
      explicitTransactions: migrations.length + 1,
      blanketTenantDml: 0,
      irreversibleSecretErasures: 0,
      exactManifestRequired: true,
      futureTenantTrigger: true,
      sameBackendMutated: false,
    },
    null,
    2,
  ),
);
