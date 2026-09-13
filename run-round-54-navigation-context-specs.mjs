import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { assertControlledBrowserBundle } from './tests/ci/controlled-browser-boundary.mjs';
const fixture = globalThis.__round54 = { super: false, tenant: null, calls: 0, allowed: true, fail: false, authenticated: true, slug: 'fixture-one' };
const mocks = {
 '@tanstack/react-router': 'export const createFileRoute = () => options => options; export const redirect = options => ({redirect: true, ...options}); export const Outlet = () => null; export const Link = () => null; export const useRouter = () => ({invalidate(){}});',
 '@/lib/api/tenant.functions': `export async function meuTenantWorkspace(){const s=globalThis.__round54;s.calls++;if(s.fail)throw Error('Unavailable');if(s.super)throw Error('platform_account_on_tenant');if(!s.allowed)throw Error('tenant_access_denied');return {slug:s.slug}}`,
 '@/integrations/supabase/client': `export const supabase={auth:{getUser:async()=>({data:{user:globalThis.__round54.authenticated?{id:'fixture-user'}:null},error:null})}};`,
};
const plugin={name:'controlled-navigation',setup(b){b.onResolve({filter:/.*/},a=>a.path in mocks?{path:a.path,namespace:'mock'}:undefined);b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:mocks[a.path],loader:'js'}));}};
async function load(path, plugins=[]){const r=await build({entryPoints:[path],bundle:true,write:false,metafile:true,format:'esm',jsx:'automatic',loader:{'.png':'dataurl'},plugins});assertControlledBrowserBundle(r,'Round54 route');return import(`data:text/javascript;base64,${Buffer.from(r.outputFiles[0].text).toString('base64')}`);}
const {Route:legacy}=await load('src/routes/_authenticated.admin.tsx',[plugin]);
const {Route}=await load('src/routes/_authenticated.$tenantSlug.admin.tsx',[plugin]);
const {workspaceAccess}=await load('src/lib/auth/workspace-access.ts');
// The approved legacy route now redirects through server-resolved tenant identity.
// Keep role denial, unavailable authority and tenant revalidation coverage on the
// actual current route boundaries, without restoring the removed impersonation path.
const location={pathname:'/admin/memberships',searchStr:'?item=draft'};
for (const slug of ['fixture-one','fixture-two','fixture-three']) {
 fixture.slug=slug;
 await assert.rejects(()=>legacy.loader({location}),e=>e.redirect&&e.to===`/${slug}/admin/memberships?item=draft`&&e.replace===true);
 const before=fixture.calls;
 assert.deepEqual(await Route.loader({params:{tenantSlug:slug}}),{tenant:{slug}});
 assert.equal(fixture.calls,before+1,'explicit slug must still resolve server authority');
 await assert.rejects(()=>Route.loader({params:{tenantSlug:'another-tenant'}}),/tenant_address_mismatch/);
}
for(const tenant of [null,'stale-impersonation-selection']) {
 fixture.tenant=tenant;fixture.super=true;
 for(const path of ['/admin','/fixture-one/admin']) assert.equal(workspaceAccess(path,true),'platform_account_on_tenant');
 await assert.rejects(()=>legacy.loader({location}),/platform_account_on_tenant/);
 await assert.rejects(()=>Route.loader({params:{tenantSlug:fixture.slug}}),/platform_account_on_tenant/);
}
fixture.super=false;fixture.allowed=false;
await assert.rejects(()=>Route.loader({params:{tenantSlug:fixture.slug}}),/tenant_access_denied/);
fixture.allowed=true;fixture.fail=true;
await assert.rejects(()=>legacy.loader({location}),/Unavailable/);
await assert.rejects(()=>Route.loader({params:{tenantSlug:fixture.slug}}),/Unavailable/);
fixture.fail=false;fixture.authenticated=false;
const before=fixture.calls;
await assert.rejects(()=>Route.beforeLoad({location:{pathname:'/fixture-three/admin/memberships',searchStr:'?item=draft'}}),e=>e.redirect&&e.to==='/$tenantSlug/auth'&&e.params.tenantSlug==='fixture-three'&&e.search.next==='/fixture-three/admin/memberships?item=draft'&&e.replace===true);
assert.equal(fixture.calls,before,'unauthenticated route must not resolve tenant data');
fixture.authenticated=true;
await Route.beforeLoad({location});
assert.equal(workspaceAccess('/super',false),'tenant_account_on_platform');
assert.equal(typeof Route.errorComponent,'function');
const {workspaceContexts}=await load('src/components/workspace/contexts.ts');
assert.deepEqual(workspaceContexts(undefined,null),[]);
assert.ok(workspaceContexts(true,null).every(c=>c.root.startsWith('/super'))); // Round56 restores all approved global siblings, never tenant routes.
assert.ok(workspaceContexts(true,fixture.tenant='tenant').every(c=>c.root.startsWith('/super')));
assert.ok(!workspaceContexts(false,null).some(c=>c.superOnly));
for(const path of ['NavigationRail','WorkspaceShell','CommandPalette'])assert.ok(readFileSync(`src/components/workspace/${path}.tsx`,'utf8').includes('workspaceContexts('));
const palette=readFileSync('src/components/workspace/CommandPalette.tsx','utf8');assert.equal((palette.match(/enabled: paletteOpen && tenantNavigation/g)||[]).length,2);
console.log('PASS Round54: global/tenant navigation, server role failure, ordinary denial, explicit tenant still revalidated, desktop/mobile/palette shared navigation. Controlled boundaries only; no remote authentication.');
delete globalThis.__round54;
