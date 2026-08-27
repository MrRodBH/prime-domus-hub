import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const ROOT = new URL("../", import.meta.url);
const OUT = new URL("../rehearsal/pca-05r/structural-waves/", import.meta.url);
const MANIFEST = new URL(
  "../docs/architecture/impact-analysis/manifests/PCA-04-product-schema-parity-manifest.json",
  import.meta.url,
);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const stripComments = (sql) => sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--.*$/gm, "");

export function build() {
  const authority = JSON.parse(readFileSync(MANIFEST, "utf8"));
  assert.equal(authority.repositoryMigrations.length, 17);
  assert.equal(authority.structuralExpectation.explicitTransactions, 17);
  const waves = new Map();
  const entries = [];
  for (const item of authority.repositoryMigrations) {
    const source = readFileSync(new URL(item.path, ROOT), "utf8");
    assert.equal(sha256(source), item.sha256, `source hash drift: ${item.path}`);
    let sql = source;
    let projection = "EXACT";
    if (item.version === "20260728180000") {
      const needle = "array_agg(a.attname ORDER BY x.ord)";
      assert.equal(sql.split(needle).length - 1, 4, "PG17 name[] projection shape drift");
      sql = sql.replaceAll(needle, "array_agg(a.attname::text ORDER BY x.ord)");
      projection = "PG17_NAME_ARRAY_TO_TEXT_ARRAY";
    }
    if (item.version === "20260728233000") {
      const needle = "    'map_embed_url', NULLIF(ls.settings->'pagina_contato'->>'mapa_url', ''),\n    'menu_locations', jsonb_build_array('header', 'footer'),";
      assert.equal(sql.split(needle).length - 1, 1, "PG 100-argument projection shape drift");
      sql = sql.replace(needle, "    'map_embed_url', NULLIF(ls.settings->'pagina_contato'->>'mapa_url', '')\n  ) || jsonb_build_object(\n    'menu_locations', jsonb_build_array('header', 'footer'),");
      projection = "PG_MAX_FUNCTION_ARGS_JSONB_OBJECT_SPLIT";
    }
    if (item.version === "20260729211500") {
      const needle = "public.transition_lead_status(uuid,text,bigint,uuid,jsonb)";
      assert.equal(sql.split(needle).length - 1, 1, "transition signature projection shape drift");
      sql = sql.replace(needle, "public.transition_lead_status(uuid,text,integer,uuid,jsonb)");
      projection = "TRANSITION_LEAD_STATUS_INTEGER_SIGNATURE";
    }
    if (item.version === "20260729103000") {
      const needle = "  ALTER COLUMN feed_token DROP NOT NULL,\n  ALTER COLUMN webhook_secret DROP NOT NULL;";
      assert.equal(sql.split(needle).length - 1, 1, "portal credential default projection shape drift");
      sql = sql.replace(needle, "  ALTER COLUMN feed_token DROP NOT NULL,\n  ALTER COLUMN feed_token DROP DEFAULT,\n  ALTER COLUMN webhook_secret DROP NOT NULL,\n  ALTER COLUMN webhook_secret DROP DEFAULT;");
      projection = "PORTAL_CREDENTIAL_NULL_DEFAULTS";
    }
    if (item.version === "20260730050000") {
      const needle = "CREATE UNIQUE INDEX IF NOT EXISTS ux_cms_pages_tenant_id_id\n  ON public.cms_pages (tenant_id, id);";
      assert.equal(sql.split(needle).length - 1, 1, "media library tenant key projection shape drift");
      sql = sql.replace(needle, `${needle}\n\nCREATE UNIQUE INDEX IF NOT EXISTS ux_media_library_tenant_id_id\n  ON public.media_library (tenant_id, id);`);
      projection = "MEDIA_LIBRARY_TENANT_ID_UNIQUE_KEY";
    }
    const executable = stripComments(sql);
    assert.match(executable, /^\s*BEGIN\s*;/i, `missing BEGIN: ${item.path}`);
    assert.match(executable, /COMMIT\s*;\s*$/i, `missing terminal COMMIT: ${item.path}`);
    for (const forbidden of [
      /CREATE\s+EXTENSION[^;]*(?:pg_net|pg_cron|supabase_vault)/i,
      /\b(?:net|http)\.[a-z_]+\s*\(/i,
      /INSERT\s+INTO\s+auth\./i,
      /(?:INSERT|UPDATE|DELETE)\s+(?:INTO\s+|FROM\s+)?storage\.objects/i,
      /INSERT\s+INTO\s+supabase_migrations/i,
    ]) assert.doesNotMatch(executable, forbidden, `external-effect statement: ${item.path}`);
    const chunk = `-- authority: ${item.path}\n-- source-sha256: ${item.sha256}\n${sql.trim()}\n`;
    waves.set(item.wave, `${waves.get(item.wave) ?? ""}${chunk}\n`);
    entries.push({ version: item.version, path: item.path, wave: item.wave, sha256: item.sha256, projection });
  }
  assert.deepEqual([...waves.keys()], ["W1", "W2", "W3", "W4", "W5", "W6"]);
  const outputs = Object.fromEntries([...waves].map(([wave, sql]) => [wave, {
    file: `PCA-05R-${wave}.sql`, sha256: sha256(sql), sql,
  }]));
  return { manifest: {
    schemaVersion: 1,
    gate: "PCA-05R_GITHUB_NATIVE_SYNTHETIC_SUBSTRATE_SOURCE_TARGET_PARITY_CORRECTIVE_IMPLEMENTATION",
    authority: "PROTECTED_GITHUB_MAIN_ONLY",
    sourceMain: "af9967a47785ac3a5d866190d9bb40d2feff9f77",
    sourceTree: "857b166466811828477289be60111e976ca0ac4e",
    migrationCount: entries.length,
    waves: Object.fromEntries(Object.entries(outputs).map(([wave, value]) => [wave, { file: value.file, sha256: value.sha256 }])),
    entries,
    controls: { sameBackendAllowed: false, migrationFilesMutable: false, migrationLedgerWritesAllowed: false, providerMutationAllowed: false, deployAllowed: false },
  }, outputs };
}

if (process.argv.includes("--write")) {
  const { manifest, outputs } = build();
  mkdirSync(OUT, { recursive: true });
  for (const value of Object.values(outputs)) writeFileSync(new URL(value.file, OUT), value.sql);
  writeFileSync(new URL("PCA-05R-structural-wave-manifest.json", OUT), `${JSON.stringify(manifest, null, 2)}\n`);
}
