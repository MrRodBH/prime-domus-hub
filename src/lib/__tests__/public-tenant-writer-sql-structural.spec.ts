import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`ASSERT: ${message}`);
}

const migrationsDir = join(process.cwd(), "supabase/migrations");

function locateMigration(): { file: string; sql: string; executable: string } {
  const files = readdirSync(migrationsDir).filter((file) =>
    file.endsWith("_ptw_01_public_writer_dml_hardening.sql"),
  );
  assert(files.length === 1, `expected exactly one PTW-01 migration, got ${files.length}`);
  const file = files[0];
  const sql = readFileSync(join(migrationsDir, file), "utf8");
  const executable = sql.replace(/--[^\n]*/g, "");
  return { file, sql, executable };
}

export const specs: Array<{ name: string; run: () => Promise<void> }> = [
  {
    name: "exactly one PTW-01 migration exists",
    run: async () => {
      const { file } = locateMigration();
      assert(
        /^\d{14}_ptw_01_public_writer_dml_hardening\.sql$/.test(file),
        `unexpected migration name: ${file}`,
      );
    },
  },
  {
    name: "migration records the same-backend grant and policy inventory",
    run: async () => {
      const { sql } = locateMigration();
      assert(sql.includes("EXACT_LEGACY_POLICY_NAME: events_public_insert"), "exact audited policy marker missing");
      assert(sql.includes("DIRECT_PUBLIC_TABLE_GRANTS: none"), "audited PUBLIC grant state missing");
      assert(
        sql.includes("ANON_DIRECT_GRANTS: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE"),
        "audited anon grant inventory missing",
      );
      assert(
        sql.includes("AUTHENTICATED_DIRECT_GRANTS: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE"),
        "audited authenticated grant inventory missing",
      );
      assert(
        sql.includes("SERVICE_ROLE_DIRECT_GRANTS: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE"),
        "audited service-role grant inventory missing",
      );
      assert(sql.includes("SANDBOX_EXEC_DIRECT_GRANTS: INSERT, SELECT"), "audited sandbox_exec inventory missing");
    },
  },
  {
    name: "migration drops only the exact audited legacy policy idempotently",
    run: async () => {
      const { executable } = locateMigration();
      assert(
        /DROP\s+POLICY\s+IF\s+EXISTS\s+"events_public_insert"\s+ON\s+public\.cms_campaign_events\s*;/i.test(
          executable,
        ),
        "exact idempotent policy drop missing",
      );
      assert(!/DROP\s+POLICY\s+%I/i.test(executable), "dynamic policy identifier remains");
      assert(!/EXECUTE\s+format/i.test(executable), "dynamic policy execution remains");
      assert(!/min\s*\(\s*policyname\s*\)/i.test(executable), "first/min policy selection remains");
      assert(!/v_policy_name/i.test(executable), "dynamic selected policy variable remains");
    },
  },
  {
    name: "unexpected additional anonymous INSERT policies fail closed without selecting them",
    run: async () => {
      const { executable } = locateMigration();
      assert(/FROM\s+pg_policies/i.test(executable), "unexpected-policy inspection missing");
      assert(/policyname\s*<>\s*'events_public_insert'/i.test(executable), "exact legacy policy exclusion missing");
      assert(/cmd\s*=\s*'INSERT'/i.test(executable), "INSERT policy filter missing");
      assert(/ARRAY\['anon'\]::name\[\]/i.test(executable), "anon role inspection missing");
      assert(/ARRAY\['public'\]::name\[\]/i.test(executable), "PUBLIC policy-role inspection missing");
      assert(
        /RAISE\s+EXCEPTION[\s\S]*ptw_01_unexpected_anonymous_campaign_event_insert_policies/i.test(
          executable,
        ),
        "unexpected policy fail-closed exception missing",
      );
      assert(
        /COALESCE\s*\(\s*cardinality\(v_unexpected_policy_names\)\s*,\s*0\s*\)\s*>\s*0/i.test(
          executable,
        ),
        "already-hardened zero-policy state is not accepted",
      );
    },
  },
  {
    name: "only anonymous DML grants are revoked from the exact table",
    run: async () => {
      const { executable } = locateMigration();
      assert(
        /REVOKE\s+INSERT\s*,\s*UPDATE\s*,\s*DELETE\s*,\s*TRUNCATE\s+ON\s+TABLE\s+public\.cms_campaign_events\s+FROM\s+anon\s*;/i.test(
          executable,
        ),
        "exact anon DML revoke contract missing",
      );
      assert(!/FROM\s+PUBLIC/i.test(executable), "PUBLIC is revoked despite no audited direct grant");
      assert(!/REVOKE[\s\S]*FROM\s+authenticated/i.test(executable), "authenticated grants are revoked");
      assert(!/REVOKE[\s\S]*FROM\s+service_role/i.test(executable), "service-role grants are revoked");
      assert(!/REVOKE[\s\S]*FROM\s+postgres/i.test(executable), "postgres grants are revoked");
      assert(!/REVOKE[\s\S]*FROM\s+sandbox_exec/i.test(executable), "sandbox_exec grants are revoked");
    },
  },
  {
    name: "migration does not broaden or compensate privileges",
    run: async () => {
      const { executable } = locateMigration();
      assert(!/GRANT\s+/i.test(executable), "migration introduces a grant");
      assert(!/ALTER\s+(DEFAULT\s+PRIVILEGES|TABLE|ROLE)/i.test(executable), "migration alters privilege topology");
    },
  },
  {
    name: "migration supports first, repeated and already-hardened execution",
    run: async () => {
      const { executable } = locateMigration();
      assert(/DROP\s+POLICY\s+IF\s+EXISTS/i.test(executable), "second execution would fail on missing policy");
      assert(!/v_policy_count\s*<>\s*1/i.test(executable), "legacy exact-one gate breaks repeated execution");
      assert(!/policy_cardinality_conflict/i.test(executable), "legacy cardinality exception remains");
    },
  },
  {
    name: "migration changes no unrelated object or accepted Lead boundary",
    run: async () => {
      const { executable } = locateMigration();
      assert(!/create_manual_lead/i.test(executable), "authenticated Lead RPC is referenced");
      assert(!/tenant_members/i.test(executable), "membership boundary is referenced");
      assert(!/storage\./i.test(executable), "Storage is referenced");
      const publicObjects = Array.from(
        executable.matchAll(/public\.([a-zA-Z0-9_]+)/g),
      ).map((match) => match[1]);
      assert(
        publicObjects.every((object) => object === "cms_campaign_events"),
        `unrelated public object referenced: ${publicObjects.join(", ")}`,
      );
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
