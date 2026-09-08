import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFileSync} from 'node:fs';
async function load(path,mocks={}) {
 const result=await build({entryPoints:[path],bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'boundary-mocks',setup(b){b.onResolve({filter:/.*/},a=>a.path in mocks?{path:a.path,namespace:'mock'}:undefined);b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:mocks[a.path],loader:'js'}));}}]});
 return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const {resolveTenantContext}=await load('src/integrations/supabase/tenant-middleware.ts',{
 '@tanstack/react-start':'export const createMiddleware=()=>({middleware(){return this},server(){return {}}});',
 '@tanstack/react-start/server':'export const getRequest=()=>null;',
 '@/integrations/supabase/auth-middleware':'export const requireSupabaseAuth={};',
 '@/integrations/supabase/tenant-repository':'export const createSupabaseTenantRepository=()=>({});'
});
const id='00000000-0000-4000-8000-000000000001';
let touched=false;
const forbiddenRepo=new Proxy({},{get(){touched=true;throw Error('Must deny before tenant access')}});
for(const header of [null,id,'invalid'])await assert.rejects(()=>resolveTenantContext({userId:id,isSuperAdmin:true,impersonateHeader:header,repo:forbiddenRepo}),/Super Admin/);
assert.equal(touched,false);
const repo={userHasActiveMembership:async(u,t)=>t===id,listByUser:async()=>[{tenantId:id}]};
assert.equal((await resolveTenantContext({userId:id,isSuperAdmin:false,impersonateHeader:id,repo})).tenantId,id);
await assert.rejects(()=>resolveTenantContext({userId:id,isSuperAdmin:false,impersonateHeader:'00000000-0000-4000-8000-000000000002',repo}),/denied/);
const {requireTenantScopedAuthority}=await load('src/lib/api/tenant-scoped-authority.ts');
assert.throws(()=>requireTenantScopedAuthority({tenantId:id,isSuperAdmin:true,impersonation:true,origin:'impersonation'},'test'),/prohibited/);
const {operationalTenantIds}=await load('src/lib/api/operational-tenants.server.ts');
let predicate;
const db={from(table){assert.equal(table,'tenants');return {select(){return {async eq(field,value){predicate=[field,value];return {data:[{id}]}}}}}}};
assert.deepEqual(await operationalTenantIds(db),[id]);assert.deepEqual(predicate,['operational_kind','customer']);
await assert.rejects(()=>operationalTenantIds({from:()=>({select:()=>({eq:async()=>({error:{message:'offline'}})})})}),/confirmar/);
for(const file of ['src/routes/_authenticated.super.index.tsx','src/components/onboarding/PersistentOnboarding.tsx'])assert.doesNotMatch(readFileSync(file,'utf8'),/onEnterTenant|onClick=.*impersonate|Acessar empresa/);
assert.match(readFileSync('src/components/workspace/WorkspaceShell.tsx','utf8'),/h-dvh w-full flex overflow-hidden/);
assert.match(readFileSync('database/round57-governance.sql','utf8'),/AS RESTRICTIVE FOR ALL TO authenticated/);
console.log('PASS Round57: Super Admin denied before repository access, forged impersonation denied, ordinary membership isolation retained, operational population explicit, failures do not fabricate zero totals.');
