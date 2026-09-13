import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// The owner's 2026-09-13 corrective supersedes the invitation-first exact-file freeze.
// Runtime denial and ordering are exercised by server.mjs; SQL authority by the native fixture.
const lifecycle=readFileSync('src/lib/api/tenant-lifecycle.functions.ts','utf8');
assert.ok(!lifecycle.includes('rodolfovaz882'), 'Platform exclusion must never hardcode an identity');
assert.ok(!lifecycle.includes('context.tenant.isSuperAdmin) return tenantId'), 'No platform tenant bypass');
const sql=readFileSync('supabase/migrations/20260913170940_tenant_user_administration.sql','utf8');
assert.match(sql,/AS RESTRICTIVE/);
assert.ok(!/GRANT EXECUTE[^;]+TO\s+(?:anon|authenticated)/i.test(sql.replace(/GRANT EXECUTE ON FUNCTION tenant_directory_private\.is_platform_identity\(uuid\) TO authenticated,\s*service_role;/i,'')), 'No public mutation RPC');
assert.ok(!/DELETE FROM (?:public\.)?(?:auth\.users|tenant_members)/i.test(sql), 'No destructive ownership repair');
console.log('PASS tenant directory contract: role-based exclusion, no platform bypass, restrictive directory policy and private mutation RPCs.');
