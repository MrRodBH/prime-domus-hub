import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

// Owner-accepted main before PR286. Never inferred from the branch under test.
export const ACCEPTED_MAIN = '18f6a8e7eece84e542df926295b7049f721094ae';
export const REVIEW_PATHS = Object.freeze([
  '.github/workflows/wri-01-worker-runtime-gate.yml',
  'docs/architecture/ADR/DOMAIN_ORIGIN_CHAIN_CORRECTION.md',
  'docs/architecture/ADR/DOMAIN_AUTOMATION_SUPABASE.md',
  'docs/architecture/impact-analysis/IA-007-OwnedTenantOrigin.md',
  'docs/architecture/impact-analysis/manifests/PCA-05R-prerequisite-closure-manifest.json',
  'docs/operations/DOMAIN_AUTOMATION_ROLLOUT.md',
  'docs/operations/OWNED_ORIGIN_PREPARATION.md',
  'run-pr-m2-tenant-lifecycle-specs.ts',
  'run-pca-05r-prerequisite-closure-manifest-specs.mjs',
  'run-pca-12b-lovable-managed-edge-function-bridge-specs.ts',
  'run-pca-12c-r3-tanstack-nitro-pca11-error-namespace-secretless-proof-specs.ts',
  'run-pca-12c-r6d-lovable-development-keep-names-seroval-hydration-corrective-specs.ts',
  'run-pca-12c-r6g-public-supabase-vite-binding-specs.ts',
  'run-pca-15r-managed-custody-source-reconciliation-specs.ts',
  'scripts/build-pca-12b-lovable-managed-edge-function-bridge.mjs',
  'scripts/owned-origin-historical-scope.mjs',
  'scripts/verify-owned-origin-historical-scope.mjs',
  'scripts/verify-owned-origin-workerd.mjs',
  'src/lib/__tests__/public-settings-campaign-read-recovery.spec.ts',
]);
export function assertReviewPaths(paths) {
  assert.deepEqual(paths.filter(path => !REVIEW_PATHS.includes(path)), [],
    'PR286 changed a path outside the exact test/documentation preparation scope');
}
const git = (...args) => execFileSync('git', args, {encoding:'utf8'}).trim();
const diff = (base) => git('diff','--name-only',`${base}..HEAD`).split('\n').filter(Boolean).sort();
export function currentReviewDelta() {
  git('merge-base','--is-ancestor',ACCEPTED_MAIN,'HEAD');
  const paths = diff(ACCEPTED_MAIN); assertReviewPaths(paths); return paths;
}
export function acceptedHistoricalPaths(base) {
  assert.match(base,/^[a-f0-9]{40}$/);
  git('merge-base','--is-ancestor',base,ACCEPTED_MAIN);
  currentReviewDelta();
  // Prior accepted changes are historical evidence, never unbounded permission for new paths.
  return diff(base);
}
