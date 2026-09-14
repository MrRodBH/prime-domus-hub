import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { assertReviewPaths, REVIEW_PATHS } from './owned-origin-historical-scope.mjs';
import { assertPca12bSupabaseCompatibility } from './build-pca-12b-lovable-managed-edge-function-bridge.mjs';
assertReviewPaths([...REVIEW_PATHS]);
for (const path of ['src/server.ts','supabase/config.toml','supabase/migrations/new.sql','.env','unreviewed.md']) {
  assert.throws(()=>assertReviewPaths([...REVIEW_PATHS,path]));
}
const current=readFileSync('supabase/config.toml','utf8');
const legacy=current.split('\n# Service-to-service endpoint:')[0];
assert.equal(createHash('sha256').update(legacy).digest('hex'),'7d405383925631b3bd8b4f5be82b85370316407c631f5a2374d1cec29cbab020');
assertPca12bSupabaseCompatibility(current);
assertPca12bSupabaseCompatibility(legacy);
for (const value of [current.replace('verify_jwt = true','verify_jwt = false'),current+'\n[functions.unknown]\nverify_jwt=false\n',current.replace('rm-prime-local','different-project')]) {
  assert.throws(()=>assertPca12bSupabaseCompatibility(value));
}
console.log('Owned-origin historical scope and locked configuration negative controls: PASS');
