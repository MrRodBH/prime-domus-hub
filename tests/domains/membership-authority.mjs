import assert from 'node:assert/strict';
import { build } from 'esbuild';

// Exercise the real authority module against a schema-aware, isolated query
// boundary. No network, credentials, production identities or database writes.
const rows = [];
let unavailable = false;
const columns = new Set(['tenant_id', 'user_id', 'tenant_role', 'membership_status']);
globalThis.domainMembershipFixture = {
  from(table) {
    assert.equal(table, 'tenant_members');
    const filters = [];
    let selected = [];
    const query = {
      select(value) { selected = value.split(',').map(v => v.trim()); return this; },
      eq(key, value) { filters.push([key, value]); return this; },
      then(resolve) {
        const unknown = [...selected, ...filters.map(([key]) => key)].find(key => !columns.has(key));
        return Promise.resolve(unknown || unavailable
          ? { data: null, error: { code: unknown ? '42703' : '08006', message: unknown ? `column ${unknown} does not exist` : 'connection unavailable' } }
          : { data: rows.filter(row => filters.every(([key, value]) => row[key] === value)), error: null }
        ).then(resolve);
      },
    };
    return query;
  },
};
const bundle = await build({
  entryPoints: ['src/lib/domains/domain-authority.server.ts'],
  bundle: true, platform: 'node', format: 'esm', write: false,
  plugins: [{ name: 'isolated-membership', setup(b) {
    b.onResolve({ filter: /client\.server$/ }, () => ({ path: 'db', namespace: 'fixture' }));
    b.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export const supabaseAdmin = globalThis.domainMembershipFixture;', loader: 'js' }));
  } }],
});
const { authorizeTenantDomainOperation: authorize } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const context = { userId: 'user-a', tenant: { tenantId: 'tenant-a', userId: 'user-a', isSuperAdmin: false, impersonation: false, origin: 'selection' } };
const member = { tenant_id: 'tenant-a', user_id: 'user-a', tenant_role: 'admin', membership_status: 'active' };
const reset = (...members) => rows.splice(0, rows.length, ...members);
reset(member);
for (const operation of ['read', 'request', 'operate', 'remove']) {
  assert.deepEqual(await authorize(context, operation), { userId: 'user-a', tenantId: 'tenant-a', origin: 'selection', isSuperAdmin: false });
}
for (const membership_status of ['invited', 'suspended', 'revoked']) {
  reset({ ...member, membership_status });
  await assert.rejects(authorize(context, 'read'), { code: 'domain_authority_denied' });
  await assert.rejects(authorize(context, 'operate'), { code: 'domain_authority_denied' });
}
for (const invalid of [[], [{ ...member, tenant_id: 'tenant-b' }], [{ ...member, user_id: 'user-b' }], [member, member]]) {
  reset(...invalid);
  await assert.rejects(authorize(context, 'read'), { code: 'domain_authority_denied' });
}
reset(member);
await assert.rejects(authorize({ ...context, userId: 'user-b' }, 'read'), { code: 'domain_authority_denied' });
await assert.rejects(authorize({ ...context, tenant: { ...context.tenant, isSuperAdmin: true } }, 'read'), { code: 'domain_authority_denied' });
for (const tenant_role of ['agent', 'guest']) {
  reset({ ...member, tenant_role });
  await authorize(context, 'read');
  await assert.rejects(authorize(context, 'operate'), { code: 'domain_authority_denied' });
}
reset({ ...member, tenant_role: 'unexpected' });
await assert.rejects(authorize(context, 'read'), { code: 'domain_authority_denied' });
reset(member); unavailable = true;
await assert.rejects(authorize(context, 'read'), { code: 'domain_provider_unavailable' });
delete globalThis.domainMembershipFixture;
console.log('PASS domain authority: current schema, active Admin, inactive memberships, tenant/user isolation, cardinality, role denial and database failure. No network or writes.');
