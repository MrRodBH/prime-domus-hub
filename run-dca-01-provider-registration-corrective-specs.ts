import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const correctiveMigrationPath = resolve(
  root,
  "supabase/migrations/20260811234800_dca_01_provider_registration_corrective.sql",
);
const correctiveMigration = readFileSync(correctiveMigrationPath, "utf8");

let assertions = 0;
function ok(value: unknown, message: string): asserts value {
  assert.ok(value, message);
  assertions += 1;
}
function equal<T>(actual: T, expected: T, message: string): void {
  assert.equal(actual, expected, message);
  assertions += 1;
}

ok(
  correctiveMigration.includes("create or replace function public.register_domain_provider_account"),
  "corrective migration must replace register_domain_provider_account",
);
ok(
  correctiveMigration.includes("on conflict on constraint domain_provider_accounts_provider_account_uq"),
  "provider registration must target the named unique constraint",
);
ok(
  !/on\s+conflict\s*\(\s*provider_code\s*,\s*account_identifier\s*\)/i.test(correctiveMigration),
  "corrective migration must not retain the ambiguous conflict inference list",
);

const functionMatches = correctiveMigration.match(/create\s+or\s+replace\s+function\s+public\./gi) ?? [];
equal(functionMatches.length, 1, "corrective migration must replace exactly one function");

const functionStart = correctiveMigration.indexOf(
  "create or replace function public.register_domain_provider_account",
);
const functionEnd = correctiveMigration.indexOf("$$;", functionStart);
ok(functionStart >= 0 && functionEnd > functionStart, "corrective function body must be discoverable");
const functionBody = correctiveMigration.slice(functionStart, functionEnd + 3).toLowerCase();

ok(functionBody.includes("language plpgsql"), "corrective function must remain plpgsql");
ok(functionBody.includes("security definer"), "corrective function must preserve SECURITY DEFINER");
ok(
  functionBody.includes("set search_path = pg_catalog, public"),
  "corrective function must preserve fixed search_path",
);
ok(
  functionBody.includes("'cloudflare', _account_identifier, _credential_reference, true"),
  "corrective function must preserve Cloudflare provider authority",
);
ok(
  functionBody.includes("'credential_reference', '[redacted]'"),
  "corrective audit detail must keep the credential reference redacted",
);

ok(
  correctiveMigration.includes(
    "revoke all on function public.register_domain_provider_account(text,text,jsonb,uuid,text) from public, anon, authenticated;",
  ),
  "corrective migration must revoke execution from PUBLIC, anon, and authenticated",
);
ok(
  correctiveMigration.includes(
    "grant execute on function public.register_domain_provider_account(text,text,jsonb,uuid,text) to service_role;",
  ),
  "corrective migration must preserve service_role execution",
);

for (const prohibited of [
  /create\s+table/i,
  /create\s+type/i,
  /create\s+policy/i,
  /alter\s+table/i,
  /create\s+(unique\s+)?index/i,
]) {
  ok(!prohibited.test(correctiveMigration), `corrective migration must not match ${prohibited}`);
}

console.log(
  JSON.stringify(
    {
      status: "PASS",
      assertions,
      correctiveMigration:
        "supabase/migrations/20260811234800_dca_01_provider_registration_corrective.sql",
      providerRegistrationNamedConstraint: true,
      ambiguousConflictTargetAbsent: true,
      securityDefinerPreserved: true,
      fixedSearchPathPreserved: true,
      clientExecuteRevoked: true,
      serviceRoleExecutePreserved: true,
      structuralExpansionAbsent: true,
    },
    null,
    2,
  ),
);
