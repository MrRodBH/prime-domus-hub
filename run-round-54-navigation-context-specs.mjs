import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
const fixture = globalThis.__round54 = { super: true, tenant: null, calls: 0, allowed: true, fail: false };
const mocks = {
 '@tanstack/react-router': 'export const createFileRoute = () => options => options; export const redirect = options => ({redirect: true, ...options}); export const Outlet = () => null; export const Link = () => null; export const useRouter = () => ({invalidate(){}});',
 '@/lib/api/super.functions': 'export async function meuAcessoSuperAdmin(){if(globalThis.__round54.fail)throw Error("Unavailable");return globalThis.__round54.super}',
 '@/lib/api/admin.functions': 'export async function meuAcessoAdmin(){globalThis.__round54.calls++;if(globalThis.__round54.invalid)throw Error("Invalid tenant");return globalThis.__round54.allowed}',
 '@/integrations/supabase/impersonation-state': 'export function getImpersonationTenantId(){return globalThis.__round54.tenant}',
};
const plugin={name:'controlled-navigation',setup(b){b.onResolve({filter:/.*/},a=>a.path in mocks?{path:a.path,namespace:'mock'}:undefined);b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:mocks[a.path],loader:'js'}));}};
async function load(path, plugins=[]){const r=await build({entryPoints:[path],bundle:true,write:false,format:'esm',jsx:'automatic',plugins});return import(`data:text/javascript;base64,${Buffer.from(r.outputFiles[0].text).toString('base64')}`);}
const {Route}=await load('src/routes/_authenticated.admin.tsx',[plugin]);
await assert.rejects(Route.loader, e=>e.redirect&&e.to==='/super');assert.equal(fixture.calls,0);
fixture.tenant='00000000-0000-4000-8000-000000000001';assert.deepEqual(await Route.loader(),{ok:true});assert.equal(fixture.calls,1);
fixture.invalid=true;await assert.rejects(Route.loader,/Invalid tenant/);fixture.invalid=false;
fixture.super=false;fixture.tenant=null;assert.deepEqual(await Route.loader(),{ok:true});
fixture.allowed=false;await assert.rejects(Route.loader,e=>e.redirect&&e.to==='/auth');
const before=fixture.calls;fixture.fail=true;await assert.rejects(Route.loader,/Unavailable/);assert.equal(fixture.calls,before);
assert.equal(typeof Route.errorComponent,'function');
const {workspaceContexts}=await load('src/components/workspace/contexts.ts');
assert.deepEqual(workspaceContexts(undefined,null),[]);
assert.deepEqual(workspaceContexts(true,null).map(c=>c.root),['/super']);
assert.ok(workspaceContexts(true,fixture.tenant='tenant').some(c=>c.root==='/admin'));
assert.ok(!workspaceContexts(false,null).some(c=>c.superOnly));
for(const path of ['NavigationRail','WorkspaceShell','CommandPalette'])assert.ok(readFileSync(`src/components/workspace/${path}.tsx`,'utf8').includes('workspaceContexts('));
const palette=readFileSync('src/components/workspace/CommandPalette.tsx','utf8');assert.equal((palette.match(/enabled: paletteOpen && tenantNavigation/g)||[]).length,2);
console.log('PASS Round54: global/tenant navigation, server role failure, ordinary denial, explicit tenant still revalidated, desktop/mobile/palette shared navigation. Controlled boundaries only; no remote authentication.');
delete globalThis.__round54;
