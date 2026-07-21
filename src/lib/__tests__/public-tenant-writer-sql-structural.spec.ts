import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`ASSERT: ${message}`);
}

const migrationsDir = join(process.cwd(), "supabase/migrations");

function locateMigration(): { file: string; sql: string } {
  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith("_ptw_01_public_writer_dml_hardening.sql"));
  assert(files.length === 1, `expected exactly one PTW-01 migration, got ${files.length}`);
  const file = files[0];
  return { file, sql: readFileSync(join(migrationsDir, file), "utf8") };
}

export const specs: Array<{ name: string; run: () => Promise<void> }> = [
  {
    name: "exactly one PTW-01 migration exists",
    run: async () => {
      const { file } = locateMigration();
      assert(/^\d{14}_ptw_01_public_writer_dml_hardening\.sql$/.test(file), `unexpected migration name: ${file}`);
    },
  },
  {
    name: "migration proves the effective anonymous INSERT policy through pg_policies",
    run: async () => {
      const { sql } = locateMigration();
      assert(/FROM\s+pg_policies/i.test(sql), "pg_policies inspection missing");
      assert(/schemaname\s*=\s*'public'/i.test(sql), "public schema filter missing");
      assert(/tablename\s*=\s*'cms_campaign_events'/i.test(sql), "campaign event table filter missing");
      assert(/cmd\s*=\s*'INSERT'/i.test(sql), "INSERT policy filter missing");
      assert(/ARRAY\['anon'\]::name\[\]/i.test(sql), "anon role inspection missing");
      assert(/ARRAY\['public'\]::name\[\]/i.test(sql), "PUBLIC role inspection missing");
    },
  },
  {
    name: "migration fails closed unless policy cardinality is exactly one",
    run: async () => {
      const { sql } = locateMigration();
      assert(/IF\s+v_policy_count\s*<>\s*1\s+THEN/i.test(sql), "exact 1 policy gate missing");
      assert(/RAISE\s+EXCEPTION[\s\S]*ptw_01_campaign_event_anon_insert_policy_cardinality_conflict/i.test(sql), "cardinality conflict exception missing");
      assert(/DROP\s+POLICY\s+%I/i.test(sql), "proven policy is not dropped by exact identifier");
      assert(/format\([\s\S]*v_policy_name/i.test(sql), "catalog policy name is not used for drop");
    },
  },
  {
    name: "direct anonymous campaign event DML is revoked",
    run: async () => {
      const { sql } = locateMigration();
      assert(/REVOKE\s+INSERT\s*,\s*UPDATE\s*,\s*DELETE\s*,\s*TRUNCATE/i.test(sql), "campaign DML revoke set is incomplete");
      assert(/ON\s+TABLE\s+public\.cms_campaign_events/i.test(sql), "revoke targets wrong table");
      assert(/FROM\s+PUBLIC\s*,\s*anon/i.test(sql), "PUBLIC/anon revoke target missing");
    },
  },
  {
    name: "migration does not broaden authenticated or service-role privileges",
    run: async () => {
      const { sql } = locateMigration();
      const executable = sql.replace(/--[^\n]*/g, "");
      assert(!/GRANT\s+/i.test(executable), "migration introduces a new grant");
      assert(!/REVOKE[\s\S]*FROM\s+authenticated/i.test(executable), "authenticated privileges are revoked");
      assert(!/REVOKE[\s\S]*FROM\s+service_role/i.test(executable), "service_role privileges are revoked");
    },
  },
  {
    name: "migration changes no unrelated table or accepted Lead boundary",
    run: async () => {
      const { sql } = locateMigration();
      const executable = sql.replace(/--[^\n]*/g, "");
      assert(!/create_manual_lead/i.test(executable), "authenticated Lead RPC is referenced");
      assert(!/tenant_members/i.test(executable), "membership boundary is referenced");
      assert(!/storage\./i.test(executable), "Storage is referenced");
      const publicObjects = Array.from(executable.matchAll(/public\.([a-zA-Z0-9_]+)/g)).map((match) => match[1]);
      assert(publicObjects.every((object) => object === "cms_campaign_events"), `unrelated public object referenced: ${publicObjects.join(", ")}`);
    },
  },
];

export async function runPublicTenantWriterSqlStructuralSpecs(): Promise<{
  passed: number;
  failed: number;
}> {
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
