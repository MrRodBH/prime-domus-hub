import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`ASSERT: ${message}`);
}

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260825213000_pr_m3_sec_02_public_surface_security_hardening.sql",
);

function sql() {
  const source = readFileSync(migrationPath, "utf8");
  const executable = source.replace(/--[^\n]*/g, "");
  return { source, executable };
}

export const specs: Array<{ name: string; run: () => Promise<void> }> = [
  {
    name: "migration is transactional, forward-only and preflight fail-closed",
    run: async () => {
      const { executable } = sql();
      assert(/^\s*BEGIN\s*;/i.test(executable), "transaction BEGIN missing");
      assert(/COMMIT\s*;\s*$/i.test(executable), "transaction COMMIT missing");
      assert(executable.includes("DO $preflight$"), "preflight block missing");
      assert(executable.includes("DO $postcondition$"), "postcondition block missing");
      for (const code of [
        "pr_m3_sec_02_required_table_absent",
        "pr_m3_sec_02_rls_not_enabled",
        "pr_m3_sec_02_tenant_isolation_diverged",
        "pr_m3_sec_02_required_public_resolver_grant_absent",
      ]) {
        assert(executable.includes(code), `fail-closed code missing: ${code}`);
      }
    },
  },
  {
    name: "only the three exact legacy policies are retired idempotently",
    run: async () => {
      const { executable } = sql();
      for (const [policy, table] of [
        ["events_public_insert", "cms_campaign_events"],
        ["corretores self update", "corretores"],
        ["lead_origens public read ativo", "lead_origens"],
      ] as const) {
        assert(
          new RegExp(
            `DROP\\s+POLICY\\s+IF\\s+EXISTS\\s+"${policy}"\\s+ON\\s+public\\.${table}\\s*;`,
            "i",
          ).test(executable),
          `exact policy retirement missing: ${table}.${policy}`,
        );
      }
      const drops = executable.match(/DROP\s+POLICY/gi) ?? [];
      assert(drops.length === 3, `unexpected policy drop count: ${drops.length}`);
    },
  },
  {
    name: "campaign event and broker direct mutation grants are removed",
    run: async () => {
      const { executable } = sql();
      assert(
        /REVOKE\s+ALL\s+PRIVILEGES\s+ON\s+TABLE\s+public\.cms_campaign_events\s+FROM\s+anon\s*;/i.test(
          executable,
        ),
        "campaign anon revoke missing",
      );
      assert(
        /REVOKE\s+ALL\s+PRIVILEGES\s+ON\s+TABLE\s+public\.cms_campaign_events\s+FROM\s+authenticated\s*;/i.test(
          executable,
        ),
        "campaign authenticated revoke missing",
      );
      assert(
        /GRANT\s+SELECT\s+ON\s+TABLE\s+public\.cms_campaign_events\s+TO\s+authenticated\s*;/i.test(
          executable,
        ),
        "campaign authenticated SELECT restoration missing",
      );
      assert(
        /REVOKE\s+ALL\s+PRIVILEGES\s+ON\s+TABLE\s+public\.corretores\s+FROM\s+authenticated\s*;/i.test(
          executable,
        ),
        "broker authenticated revoke missing",
      );
      assert(
        /GRANT\s+SELECT\s+ON\s+TABLE\s+public\.corretores\s+TO\s+authenticated\s*;/i.test(
          executable,
        ),
        "broker authenticated SELECT restoration missing",
      );
      assert(
        executable.includes("pr_m3_sec_02_authenticated_mutation_privilege_remains"),
        "authenticated postcondition missing",
      );
    },
  },
  {
    name: "lead source anonymous access and internal helper execution are revoked",
    run: async () => {
      const { executable } = sql();
      assert(
        /REVOKE\s+ALL\s+PRIVILEGES\s+ON\s+TABLE\s+public\.lead_origens\s+FROM\s+anon\s*;/i.test(
          executable,
        ),
        "lead source anon revoke missing",
      );
      assert(
        /REVOKE\s+EXECUTE\s+ON\s+FUNCTION\s+public\.user_belongs_to_tenant\s*\(\s*uuid\s*\)\s+FROM\s+anon\s*;/i.test(
          executable,
        ),
        "internal helper anon revoke missing",
      );
      assert(
        executable.includes("pr_m3_sec_02_anon_internal_helper_execute_remains"),
        "helper postcondition missing",
      );
    },
  },
  {
    name: "required public resolvers and restrictive tenant policies are preserved",
    run: async () => {
      const { executable } = sql();
      for (const signature of [
        "public.resolve_public_tenant_by_host(text)",
        "public.get_canonical_redirect_for_active_alias(text)",
        "public.get_current_tenant_id()",
        "public.is_super_admin()",
      ]) {
        assert(executable.includes(signature), `resolver preservation missing: ${signature}`);
      }
      assert(
        executable.includes("permissive = 'RESTRICTIVE'"),
        "restrictive-policy preflight missing",
      );
      assert(
        executable.includes("pr_m3_sec_02_tenant_isolation_not_preserved"),
        "restrictive-policy postcondition missing",
      );
      assert(
        executable.includes("pr_m3_sec_02_required_public_resolver_grant_regressed"),
        "resolver postcondition missing",
      );
    },
  },
  {
    name: "service-role and postgres privileges are proven before and after",
    run: async () => {
      const { executable } = sql();
      assert(
        executable.includes("has_table_privilege('service_role'"),
        "service-role proof missing",
      );
      assert(
        executable.includes("has_table_privilege('postgres'"),
        "postgres proof missing",
      );
      assert(
        executable.includes("pr_m3_sec_02_service_role_privilege_absent"),
        "service-role preflight failure missing",
      );
      assert(
        executable.includes("pr_m3_sec_02_postgres_privilege_absent"),
        "postgres preflight failure missing",
      );
      assert(
        executable.includes("pr_m3_sec_02_privileged_role_regression"),
        "privileged-role postcondition missing",
      );
    },
  },
  {
    name: "migration contains no row DML, function rewrite or sandbox mutation",
    run: async () => {
      const { executable } = sql();
      assert(!/\bINSERT\s+INTO\b/i.test(executable), "row INSERT present");
      assert(!/\bUPDATE\s+public\./i.test(executable), "row UPDATE present");
      assert(!/\bDELETE\s+FROM\b/i.test(executable), "row DELETE present");
      assert(
        !/CREATE\s+OR\s+REPLACE\s+FUNCTION/i.test(executable),
        "function body rewrite present",
      );
      assert(!/sandbox_exec/i.test(executable), "sandbox_exec privilege mutation present");
      assert(!/ALTER\s+TABLE/i.test(executable), "table structure mutation present");
    },
  },
  {
    name: "migration scope is limited to the three tables and one helper grant",
    run: async () => {
      const { executable } = sql();
      for (const forbidden of [
        "auth.users",
        "tenant_members",
        "tenant_domains",
        "mutate_tenant_membership",
        "storage.",
        "billing_",
        "stripe",
        "cloudflare",
      ]) {
        assert(
          !executable.toLowerCase().includes(forbidden.toLowerCase()),
          `forbidden object referenced: ${forbidden}`,
        );
      }
    },
  },
];

export async function runPublicSurfaceSecuritySqlStructuralSpecs(): Promise<{
  passed: number;
  failed: number;
}> {
  let passed = 0;
  let failed = 0;
  for (const spec of specs) {
    try {
      await spec.run();
      passed += 1;
    } catch (error) {
      failed += 1;
      console.error(`✗ ${spec.name}\n  ${error instanceof Error ? error.message : error}`);
    }
  }
  return { passed, failed };
}
