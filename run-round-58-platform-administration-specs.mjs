import { execFileSync } from "node:child_process";
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const id='00000000-0000-4000-8000-000000000001';
const other='00000000-0000-4000-8000-000000000002';
const mocked={
 '@tanstack/react-start':`export const createServerFn=()=>({middleware(){return this},inputValidator(v){this.v=v;return this},handler(h){const v=this.v;return x=>h({context:globalThis.__ctx,data:v?v(x):x})}});`,
 '@/integrations/supabase/auth-middleware':'export const requireSupabaseAuth={};',
 '@/lib/api/tenant-lifecycle.functions':'export const bootstrapTenantWithOwner=()=>{};',
 '@/integrations/supabase/client.server':'export const supabaseAdmin=globalThis.__admin;'
};
let allowed=false;let calls=[];let providerError=false;let tenantLinked=false;let targetPlatform=true;let scopeError=false;let ownerLinked=false;
globalThis.__ctx={userId:id,supabase:{from(){return {select(){return this},eq(){return this},maybeSingle:async()=>({data:allowed?{role:'super_admin'}:null})}}}};
globalThis.__admin={from(table){const q={select(){return q},eq(){return q},order(){return q},range(){return Promise.resolve({data:[{user_id:other}]})},in(){return Promise.resolve({error:scopeError?{}:null,data:table==='user_roles'?(targetPlatform?[{user_id:id},{user_id:other}]:[]):table==='tenant_members'?(tenantLinked?[{user_id:id},{user_id:other}]:[]):(ownerLinked?[{owner_user_id:id},{owner_user_id:other}]:[])})}};return q},auth:{admin:{getUserById:async uid=>{calls.push(['get',uid]);return {data:{user:{id:uid,email:'fixture@example.invalid'}}}},deleteUser:async(...args)=>{calls.push(['delete',...args]);return {error:providerError?{code:'dependency'}:null}}}}};
const result=await build({entryPoints:['src/lib/api/super.functions.ts'],bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'boundaries',setup(b){b.onResolve({filter:/.*/},a=>a.path in mocked?{path:a.path,namespace:'mock'}:undefined);b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:mocked[a.path],loader:'js'}));}}]});
const api=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
await assert.rejects(api.superDeleteUser({userId:other,confirmationEmail:'fixture@example.invalid'}),/Forbidden/);assert.equal(calls.length,0);
allowed=true;
for (const kind of ['tenant', 'owner', 'unclassified', 'error']) {
 tenantLinked=kind==='tenant';ownerLinked=kind==='owner';targetPlatform=kind!=='unclassified';scopeError=kind==='error';
 await assert.rejects(api.superDeleteUser({userId:other,confirmationEmail:'fixture@example.invalid'}));
 assert.equal(calls.length,0,'scope must deny before reading Auth identity');
 if(kind!=='error') {assert.deepEqual((await api.superListUsers({page:1})).users,[]);assert.equal(calls.length,0);}
}
tenantLinked=false;ownerLinked=false;targetPlatform=true;scopeError=false;

assert.throws(()=>api.superDeleteUser({userId:other,confirmationEmail:'fixture@example.invalid',actor:id}));
await assert.rejects(api.superDeleteUser({userId:other,confirmationEmail:'wrong@example.invalid'}),/Confirme/);assert.equal(calls.filter(c=>c[0]==='delete').length,0);
assert.equal((await api.superDeleteUser({userId:other,confirmationEmail:'fixture@example.invalid'})).deleted,true);
assert.deepEqual(calls.at(-1),['delete',other,false]);
assert.equal((await api.superDeleteUser({userId:id,confirmationEmail:'fixture@example.invalid'})).self,true);
providerError=true;await assert.rejects(api.superDeleteUser({userId:other,confirmationEmail:'fixture@example.invalid'}),/não foi concluída/);
console.log('PASS global account deletion: server role, strict input, exact account confirmation, permanent deletion, tenant/owner/unclassified accounts excluded before Auth access, provider failure preserved.');

// Round60: verify Git-independent release provenance in the existing release CI.
execFileSync(process.execPath, ["--import", "tsx/esm", "tests/round60/release-identity.ts"], { stdio: "inherit" });
