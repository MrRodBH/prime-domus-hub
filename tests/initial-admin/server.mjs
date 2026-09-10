import assert from 'node:assert/strict';import {build} from 'esbuild';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
let allowed=false,confirmed=false,prepareError=null,sendError=false,calls=[];
globalThis.ctx={userId:id(1),supabase:{from(){return{select(){return this},eq(){return this},maybeSingle:async()=>({data:allowed?{role:'super_admin'}:null})}}}};
globalThis.db={rpc:async(name,args)=>{calls.push([name,args]);return{error:prepareError,data:{invitationId:id(4),existingConfirmedAccount:confirmed}}},from(table){assert.equal(table,'tenant_initial_admin_setup');let filters={};return{update(v){calls.push(['delivery',v]);return this},eq(k,v){filters[k]=v;return this},is(k,v){filters[k]=v;return this},select:async()=>{assert.equal(filters.tenant_id,id(2));assert.equal(filters.invitation_id,id(4));assert.equal(filters.activated_at,null);return{data:[{invitation_id:id(4)}]}}}},auth:{admin:{inviteUserByEmail:async(email,options)=>{calls.push(['send',email,options]);return{error:sendError?{message:'controlled provider failure'}:null}}}}};
const fixtures={
 '@tanstack/react-start':`export const createServerFn=()=>({middleware(){return this},inputValidator(v){this.v=v;return this},handler(h){let v=this.v;return x=>h({context:globalThis.ctx,data:v?v(x):x})}});`,
 '@tanstack/react-start/server':`export const getRequest=()=>({url:'https://fixture.invalid/_server'});`,
 '@/integrations/supabase/auth-middleware':`export const requireSupabaseAuth={};`,
 '@/integrations/supabase/client.server':`export const supabaseAdmin=globalThis.db;`,
};
const built=await build({entryPoints:['src/lib/api/initial-admin-setup.functions.ts'],bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'isolated',setup(b){b.onResolve({filter:/.*/},a=>a.path in fixtures?{path:a.path,namespace:'fixture'}:undefined);b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:fixtures[a.path],loader:'js'}));}}]});
const api=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const input={tenantId:id(2),name:'Fixture Admin',email:' ADMIN@fixture.invalid ',expectedInvitationId:null};
await assert.rejects(api.inviteInitialAdmin(input),/Super Admin/);assert.deepEqual(calls,[]);
allowed=true;prepareError={message:'setup_company_incomplete'};await assert.rejects(api.inviteInitialAdmin(input),/plano ativo/);assert.ok(!calls.some(c=>c[0]==='send'));
prepareError=null;calls=[];let result=await api.inviteInitialAdmin(input);assert.equal(result.delivery,'sent');assert.equal(calls[0][1].p_actor,id(1));assert.equal(calls[0][1].p_email,'admin@fixture.invalid');assert.deepEqual(calls[1],['send','admin@fixture.invalid',{redirectTo:'https://fixture.invalid/reset-password'}]);
confirmed=true;calls=[];result=await api.inviteInitialAdmin(input);assert.equal(result.delivery,'existing_account');assert.ok(!calls.some(c=>c[0]==='send'));
confirmed=false;sendError=true;result=await api.inviteInitialAdmin(input);assert.equal(result.delivery,'failed');assert.equal(calls.at(-1)[1].delivery_status,'failed');
assert.throws(()=>api.inviteInitialAdmin({...input,role:'super_admin'}));assert.throws(()=>api.inviteInitialAdmin({...input,redirectTo:'https://untrusted.invalid'}));assert.throws(()=>api.registerSetupCompany({id:id(6),name:'Fixture',slug:'fixture',source:'sales_platform',reference:''}));
console.log('PASS actual server handlers: authority before Auth, preparation before delivery, confirmed existing account preserved, send failure persisted, server-derived actor/redirect, injected authority rejected.');
