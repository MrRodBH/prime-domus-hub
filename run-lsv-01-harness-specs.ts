// LSV-01 · Lote A — Harness runner.
//
// Emits a structured, secret-free report. Live fixture assertions are
// gated on the environment guard authorizing a non-production target;
// when the guard rejects, live tests are reported as skipped and the
// harness returns exit 1 only if guard-scope smoke tests fail.

import { runLsvHarnessSpecs } from "./tests/security/lsv-01/harness-smoke.spec";
import {
  assertLsvTestEnvironment,
  LsvEnvironmentGuardError,
  redactProjectRef,
} from "./tests/security/lsv-01/environment-guard";

interface Report {
  passed: number;
  failed: number;
  skipped: number;
  fixtures_created: number;
  fixtures_cleaned: number;
  orphaned_fixtures: number;
  environment_target: string;
  project_ref_redacted: string;
}

async function main() {
  const report: Report = {
    passed: 0,
    failed: 0,
    skipped: 0,
    fixtures_created: 0,
    fixtures_cleaned: 0,
    orphaned_fixtures: 0,
    environment_target: "<unset>",
    project_ref_redacted: "<unset>",
  };

  // Guard-scope structural smoke tests always run.
  const smoke = await runLsvHarnessSpecs();
  report.passed += smoke.passed;
  report.failed += smoke.failed;

  // Live fixture tests are gated. Never touch production.
  try {
    const env = assertLsvTestEnvironment({
      LSV_TEST_MODE: process.env.LSV_TEST_MODE,
      LSV_TEST_TARGET: process.env.LSV_TEST_TARGET,
      LSV_ALLOWED_PROJECT_REF: process.env.LSV_ALLOWED_PROJECT_REF,
      SUPABASE_URL: process.env.LSV_SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.LSV_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.LSV_SUPABASE_SERVICE_ROLE_KEY,
    });
    report.environment_target = env.target;
    report.project_ref_redacted = redactProjectRef(env.projectRef);
    // Concrete fixture + live-JWT execution is bound by Lote B; the
    // Lote A harness intentionally stops here after proving the guard
    // authorizes the target end-to-end.
    report.skipped += 1;
    console.log(
      "lsv-01-harness: authorized target detected; live-JWT execution deferred to Lote B",
    );
  } catch (e) {
    if (e instanceof LsvEnvironmentGuardError) {
      report.skipped += 1;
      console.log(
        `lsv-01-harness: live tests SKIPPED (${e.code}) — no authorized target configured`,
      );
    } else {
      report.failed += 1;
      console.log(`lsv-01-harness: unexpected guard failure`);
    }
  }

  console.log(
    `lsv-01-harness: passed=${report.passed} failed=${report.failed} skipped=${report.skipped} fixtures_created=${report.fixtures_created} fixtures_cleaned=${report.fixtures_cleaned} orphaned_fixtures=${report.orphaned_fixtures} environment_target=${report.environment_target} project_ref_redacted=${report.project_ref_redacted}`,
  );

  if (report.failed > 0) process.exit(1);
}

void main();
