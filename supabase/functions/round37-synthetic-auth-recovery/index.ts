import { createClient } from 'npm:@supabase/supabase-js@2.108.2';
import { recoveryHandler, TARGET, TENANT } from './core.ts';
// Deployment is forbidden until secure input + independent teardown are proven.
const env = (key: string) => Deno.env.get(key) ?? '';
const client = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
Deno.serve(recoveryHandler({
  operator: env('ROUND37_OPERATOR_UUID'),
  expiresAt: Date.parse(env('ROUND37_EXPIRES_AT')),
  expectedUpdatedAt: env('ROUND37_TARGET_UPDATED_AT'),
  now: Date.now,
  async authenticate(jwt) {
    const { data, error } = await client.auth.getUser(jwt);
    return error ? null : data.user?.id ?? null;
  },
  async isAdmin(id) {
    const { data, error } = await client.from('user_roles').select('role').eq('user_id', id).eq('role', 'super_admin').maybeSingle();
    return !error && data?.role === 'super_admin';
  },
  async eligible() {
    const [tenant, member] = await Promise.all([
      client.from('tenants').select('id, slug, status, metadata').eq('id', TENANT).maybeSingle(),
      client.from('tenant_members').select('user_id, tenant_id, membership_status, tenant_role, is_owner').eq('tenant_id', TENANT).eq('user_id', TARGET).maybeSingle(),
    ]);
    return !tenant.error && !member.error && tenant.data?.slug === 'pca11-hml' && tenant.data?.status === 'active' && tenant.data?.metadata?.synthetic === true && member.data?.membership_status === 'active' && member.data?.tenant_role === 'owner' && member.data?.is_owner === true;
  },
  async target() {
    const { data, error } = await client.auth.admin.getUserById(TARGET);
    if (error) throw new Error('target_unavailable');
    return data.user;
  },
  async updatePassword(password) {
    // UUID cannot originate in request; password is the only mutable attribute.
    const { data, error } = await client.auth.admin.updateUserById(TARGET, { password });
    if (error || data.user?.id !== TARGET) throw new Error('update_unconfirmed');
  },
}));
