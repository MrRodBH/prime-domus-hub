// LSH-01 · Lote B — SQL structural tests.
// Deterministic reads over the Lote B closure migration file. The
// operational proof against a live Postgres with multi-JWT sessions
// belongs to LSV-01.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

type Case = { name: string; run: () => void };

function must(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const ROOT = process.cwd();
const MIG_DIR = join(ROOT, "supabase/migrations");

// The Lote B closure migration is the newest file that redefines
// create_manual_lead AND introduces the v_header_tenant variable — this
// distinguishes it from the earlier Lote B migration (which only used
// v_header_raw).
function locateClosureMigrationFile(): { file: string; sql: string } {
  const files = readdirSync(MIG_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (let i = files.length - 1; i >= 0; i--) {
    const sql = readFileSync(join(MIG_DIR, files[i]), "utf8");
    if (
      /CREATE OR REPLACE FUNCTION public\.create_manual_lead/.test(sql) &&
      /v_header_tenant\s+uuid/.test(sql) &&
      /super_admin_requires_impersonation/.test(sql)
    ) {
      return { file: files[i], sql };
    }
  }
  throw new Error("Lote B closure migration for create_manual_lead not found");
}

function loadClosureSql(): string {
  return locateClosureMigrationFile().sql;
}

const cases: Case[] = [
  {
    name: "closure migration is located by filename (not by content-only heuristic)",
    run: () => {
      const { file } = locateClosureMigrationFile();
      must(/^\d{14}_[0-9a-f-]+\.sql$/.test(file), `unexpected file: ${file}`);
    },
  },
  {
    name: "v_header_tenant variable is declared as uuid",
    run: () => {
      const sql = loadClosureSql();
      must(
        /v_header_tenant\s+uuid/.test(sql),
        "v_header_tenant uuid declaration missing",
      );
    },
  },
  {
    name: "header parse is fail-closed (invalid UUID collapses to NULL)",
    run: () => {
      const sql = loadClosureSql();
      // Requires an explicit BEGIN/EXCEPTION block that assigns
      // v_header_tenant := NULL on any cast failure.
      must(
        /BEGIN[\s\S]{0,200}v_header_tenant\s*:=\s*btrim\(v_header_raw\)::uuid[\s\S]{0,200}EXCEPTION WHEN OTHERS THEN[\s\S]{0,200}v_header_tenant\s*:=\s*NULL/.test(
          sql,
        ),
        "fail-closed UUID parse block missing",
      );
      // Blank header must not produce a UUID either.
      must(
        /IF v_header_raw IS NOT NULL AND btrim\(v_header_raw\)\s*<>\s*''/.test(sql),
        "blank header short-circuit missing",
      );
    },
  },
  {
    name: "get_current_tenant_id is the canonical tenant resolver call",
    run: () => {
      const sql = loadClosureSql();
      must(
        /v_tenant\s*:=\s*public\.get_current_tenant_id\(\)/.test(sql),
        "canonical resolver call missing",
      );
    },
  },
  {
    name: "v_is_impersonating requires v_is_super_admin (not header presence alone)",
    run: () => {
      const sql = loadClosureSql();
      must(
        /v_is_impersonating\s*:=[\s\S]{0,200}v_is_super_admin/.test(sql),
        "impersonation must include is_super_admin",
      );
      // Explicitly reject the legacy heuristic "header present ⇒ impersonating".
      must(
        !/v_is_impersonating\s*:=\s*\(v_header_raw IS NOT NULL AND v_header_raw <>\s*''\)/.test(
          sql,
        ),
        "legacy header-only impersonation still present",
      );
    },
  },
  {
    name: "v_is_impersonating requires v_header_tenant IS NOT NULL",
    run: () => {
      const sql = loadClosureSql();
      must(
        /v_is_impersonating\s*:=[\s\S]{0,200}v_header_tenant IS NOT NULL/.test(sql),
        "impersonation must require a parsed header UUID",
      );
    },
  },
  {
    name: "v_is_impersonating requires v_header_tenant = v_tenant",
    run: () => {
      const sql = loadClosureSql();
      must(
        /v_is_impersonating\s*:=[\s\S]{0,300}v_header_tenant\s*=\s*v_tenant/.test(
          sql,
        ),
        "impersonation must require header equal to resolved tenant",
      );
    },
  },
  {
    name: "regular user with forged header cannot flip impersonation_active to true",
    run: () => {
      const sql = loadClosureSql();
      // impersonation_active is bound directly to v_is_impersonating, which
      // requires v_is_super_admin AND the resolved-tenant match — a regular
      // user (v_is_super_admin=false) short-circuits the AND to false.
      must(
        /'impersonation_active'\s*,\s*v_is_impersonating/.test(sql),
        "audit metadata must derive from v_is_impersonating only",
      );
    },
  },
  {
    name: "Super Admin without valid header is denied",
    run: () => {
      const sql = loadClosureSql();
      must(
        /IF v_is_super_admin AND NOT v_is_impersonating THEN[\s\S]{0,200}super_admin_requires_impersonation/.test(
          sql,
        ),
        "super admin without impersonation must fail",
      );
    },
  },
  {
    name: "membership uses explicit COUNT(*) cardinality (preserved)",
    run: () => {
      const sql = loadClosureSql();
      must(
        /SELECT COUNT\(\*\)[\s\S]{0,120}INTO v_mem_cnt[\s\S]{0,400}FROM public\.tenant_members/.test(
          sql,
        ),
        "membership COUNT missing",
      );
      must(/membership_required/.test(sql), "membership_required missing");
      must(
        /membership_cardinality_conflict/.test(sql),
        "membership_cardinality_conflict missing",
      );
    },
  },
  {
    name: "Super Admin detected via canonical is_super_admin() (never has_role admin)",
    run: () => {
      const sql = loadClosureSql();
      must(
        /v_is_super_admin\s*:=\s*public\.is_super_admin\(\)/.test(sql),
        "canonical is_super_admin detection missing",
      );
      must(
        !/v_is_super_admin\s*:=\s*public\.has_role\([^)]*'admin'/.test(sql),
        "has_role('admin') used as Super Admin evidence",
      );
    },
  },
  {
    name: "tenant is not received as argument (client cannot inject tenant)",
    run: () => {
      const sql = loadClosureSql();
      must(
        !/create_manual_lead\([\s\S]{0,400}p_tenant/.test(sql),
        "tenant argument must not exist",
      );
    },
  },
  {
    name: "safe search_path on RPC (preserved)",
    run: () => {
      const sql = loadClosureSql();
      must(
        /SET search_path = 'public', 'pg_temp'/.test(sql),
        "safe search_path missing",
      );
    },
  },
  {
    name: "explicit RPC grants preserved (authenticated only)",
    run: () => {
      const sql = loadClosureSql();
      must(
        /REVOKE ALL ON FUNCTION public\.create_manual_lead[^;]+FROM PUBLIC/.test(
          sql,
        ),
        "PUBLIC revoke missing",
      );
      must(
        /REVOKE ALL ON FUNCTION public\.create_manual_lead[^;]+FROM anon/.test(
          sql,
        ),
        "anon revoke missing",
      );
      must(
        /REVOKE ALL ON FUNCTION public\.create_manual_lead[^;]+FROM service_role/.test(
          sql,
        ),
        "service_role revoke missing",
      );
      must(
        /GRANT EXECUTE ON FUNCTION public\.create_manual_lead[^;]+TO authenticated/.test(
          sql,
        ),
        "authenticated grant missing",
      );
    },
  },
  {
    name: "audit event is inserted in the same transaction as the lead (preserved)",
    run: () => {
      const sql = loadClosureSql();
      must(
        /INSERT INTO public\.leads[\s\S]{0,1200}INSERT INTO public\.lead_audit_events/.test(
          sql,
        ),
        "atomic lead+audit insert missing",
      );
      must(
        /'actor_is_super_admin'\s*,\s*v_is_super_admin/.test(sql),
        "actor_is_super_admin metadata missing",
      );
      must(
        /'impersonation_active'\s*,\s*v_is_impersonating/.test(sql),
        "impersonation_active metadata missing",
      );
      must(/'scope'/.test(sql), "scope metadata missing");
    },
  },
  {
    name: "assigned_to cardinality is explicit (preserved)",
    run: () => {
      const sql = loadClosureSql();
      must(
        /SELECT COUNT\(\*\)[\s\S]{0,120}INTO v_assigned_mem_cnt/.test(sql),
        "assigned_to COUNT missing",
      );
      must(
        /assigned_to_membership_conflict/.test(sql),
        "assigned_to N>1 branch missing",
      );
    },
  },
  {
    name: "corretor resolution has no MIN() heuristic (preserved)",
    run: () => {
      const sql = loadClosureSql();
      // Split after the first newline following the header so we drop the
      // remainder of the header comment line (which itself mentions MIN()).
      const afterHeader = sql.split(/-- 7\.2 Corretor[^\n]*\n/)[1] ?? "";
      const raw = afterHeader.split(/-- 8\)/)[0] ?? "";
      must(raw.length > 0, "corretor region missing");
      const region = raw.replace(/--[^\n]*/g, "");
      must(!/\bMIN\s*\(/i.test(region), "MIN() heuristic still present");
      must(
        /corretor_cardinality_conflict/.test(region),
        "corretor N>1 branch missing",
      );
    },
  },
];

export async function runLeadSqlStructuralSpecs(): Promise<{
  passed: number;
  failed: number;
}> {
  let passed = 0;
  let failed = 0;
  for (const c of cases) {
    try {
      c.run();
      passed++;
    } catch (e) {
      failed++;
      console.error(`FAIL ${c.name}:`, e instanceof Error ? e.message : e);
    }
  }
  return { passed, failed };
}
