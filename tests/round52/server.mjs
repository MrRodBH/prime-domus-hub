import { build } from 'esbuild';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const output=await build({entryPoints:['src/lib/api/super-onboarding.functions.ts'],bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'controlled-boundaries',setup(b){
 b.onResolve({filter:/^(@tanstack\/react-start|@\/integrations\/supabase\/(auth-middleware|client.server))$/},a=>({path:a.path,namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},a=>({loader:'js',contents:a.path==='@tanstack/react-start'?`export const createServerFn=()=>({middleware(m){if(m.length!==1)throw Error('auth');return this;},inputValidator(v){this.v=v;return this;},handler(h){const v=this.v;return data=>h({data:v?v(data):data,context:globalThis.__ctx});}});`:a.path.endsWith('auth-middleware')?`export const requireSupabaseAuth={canonical:true};`:`export const supabaseAdmin={rpc:async(name,args)=>{globalThis.__calls.push({name,args});return {error:null};}};`}));
}}]});
const dir=mkdtempSync(join(tmpdir(),'round52-server-'));const file=join(dir,'bundle.mjs');writeFileSync(file,output.outputFiles[0].text);const api=await import(pathToFileURL(file).href);
let authorized=false;globalThis.__calls=[];globalThis.__ctx={userId:'00000000-0000-4000-8000-000000000001',supabase:{from(){return{select(){return this;},eq(){return this;},async maybeSingle(){return{data:authorized?{role:'super_admin'}:null,error:null};}};}}};
const input={id:'00000000-0000-4000-8000-000000000004',expectedUpdatedAt:null,code:'basic',name:'Basic',description:'',status:'active',monthlyPriceCents:100,propertyLimit:20,features:['CMS'],portal:'',productId:''};
await assert.rejects(api.saveSuperPlan(input),/Super Admin/);assert.equal(globalThis.__calls.length,0);
authorized=true;
assert.throws(()=>api.saveSuperPlan({...input,actor:'forged'}));
assert.throws(()=>api.saveSuperPlan({...input,monthlyPriceCents:-1}));
assert.throws(()=>api.saveSuperCompany({tenantId:input.id,actor:'forged'}));
await api.saveSuperPlan(input);assert.equal(globalThis.__calls[0].args.p_actor,globalThis.__ctx.userId);assert.equal(globalThis.__calls[0].name,'save_super_onboarding_plan');
console.log('PASS server: strict payloads, no client actor, denied authority never reaches privileged RPC. Controlled auth only.');

// Platform customer-service authority: invoke the actual handler with controlled identity.
const supportBundle=await build({entryPoints:['src/lib/api/super-control-plane.functions.ts'],bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'support-boundaries',setup(b){
 b.onResolve({filter:/^(@tanstack\/react-start|@\/integrations\/supabase\/(auth-middleware|tenant-middleware|client.server))$/},a=>({path:a.path,namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},a=>({loader:'js',contents:a.path==='@tanstack/react-start'?`export const createServerFn=()=>({middleware(){return this},inputValidator(v){this.v=v;return this},handler(h){const v=this.v;return data=>h({data:v?v(data):data,context:globalThis.__supportCtx})}});`:a.path.endsWith('client.server')?`export const supabaseAdmin={rpc:async(name,args)=>{globalThis.__supportCalls.push({name,args});return {data:{id:'controlled-case'},error:null}}};`:`export const requireSupabaseAuth={};export const requireTenant={};`}));
}}]});
const supportFile=join(dir,'support.mjs');writeFileSync(supportFile,supportBundle.outputFiles[0].text);const supportApi=await import(pathToFileURL(supportFile).href);
let superRows=[];globalThis.__supportCalls=[];globalThis.__supportCtx={userId:'00000000-0000-4000-8000-000000000001',supabase:{from(table){assert.equal(table,'user_roles');return {select(){return this},eq(){return this},async limit(){return {data:superRows,error:null}}}}}};
const supportInput={operation:'create',caseKey:'SUP-2026-0001',category:'cms',priority:'normal',status:'open',subject:'Pedido de cliente',summary:'Fixture isolada de atendimento'};
await assert.rejects(supportApi.mutatePlatformSupportCase(supportInput),/global_super_admin_required/);assert.equal(__supportCalls.length,0);
superRows=[{role:'super_admin'},{role:'super_admin'}];await assert.rejects(supportApi.mutatePlatformSupportCase(supportInput),/global_super_admin_required/);assert.equal(__supportCalls.length,0);
superRows=[{role:'super_admin'}];assert.throws(()=>supportApi.mutatePlatformSupportCase({...supportInput,actorUserId:'forged'}));assert.throws(()=>supportApi.mutatePlatformSupportCase({...supportInput,status:'invalid'}));assert.equal(__supportCalls.length,0);
await supportApi.mutatePlatformSupportCase(supportInput);assert.equal(__supportCalls.length,1);assert.equal(__supportCalls[0].name,'mutate_platform_support_case');assert.equal(__supportCalls[0].args._actor_user_id,__supportCtx.userId);assert.equal(__supportCalls[0].args._tenant_id,null);
console.log('PASS customer service server: unauthorized/ambiguous global role denied before RPC; forged actor/invalid status rejected; authorized action derives actor from session.');

const legalBundle=await build({stdin:{contents:`export {projectConfigurationToSiteSettings} from './src/lib/api/site.functions';export {getConfigurationDefaults} from './src/lib/api/configuration-registry';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'legal-projection',setup(b){
 b.onResolve({filter:/^@tanstack\/react-start$|^@\/integrations\/supabase\/(tenant-middleware|client.server)$|^@\/lib\/tenant.server$|tenant-configuration-authority.server$/},a=>({path:a.path,namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path==='@tanstack/react-start'?'export const createServerFn=()=>({middleware(){return this},inputValidator(){return this},handler(h){return h}});':`export const requireTenant={};export const requirePublicTenantFromRequest=()=>{throw Error('REMOTE_FORBIDDEN')};export const loadPublishedConfigurationForTenant=()=>{throw Error('REMOTE_FORBIDDEN')};export const supabaseAdmin=new Proxy({},{get(){throw Error('REMOTE_FORBIDDEN')}});`,loader:'js'}));
}}]});
const legalFile=join(dir,'legal.mjs');writeFileSync(legalFile,legalBundle.outputFiles[0].text);const legalApi=await import(pathToFileURL(legalFile).href);const legalSnapshot=legalApi.getConfigurationDefaults();legalSnapshot.legal_links=[{label:'Privacidade',url:'/privacidade'},{label:'Contato legal',url:'mailto:privacy@example.invalid'},{label:'Destino recusado',url:'//other.invalid'}];legalSnapshot.footer_columns=[{title:'Institucional',links:[{label:'Sobre',url:'/sobre'}]}];
const projected=await legalApi.projectConfigurationToSiteSettings('00000000-0000-4000-8000-000000000010',legalSnapshot);assert.equal(projected.footer.legal_links.length,2);assert.equal(projected.footer.legal_links[0].url,'/privacidade');assert.equal(projected.footer.legal_links[1].url,'mailto:privacy@example.invalid');assert.equal(projected.footer.coluna1_links[0].url,'/sobre');
console.log('PASS published legal projection: valid legal links projected, unsafe destination omitted, existing footer links retained, no database or provider calls.');
