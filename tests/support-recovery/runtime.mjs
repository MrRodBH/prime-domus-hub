import assert from 'node:assert/strict';
import {build} from 'esbuild';
const load=async(entry,plugins=[])=>{
 const b=await build({entryPoints:[entry],bundle:true,platform:'node',format:'esm',write:false,plugins});
 return import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
};
const {workspaceAccess}=await load('src/lib/auth/workspace-access.ts');
for(const path of ['/admin','/admin/site','/rmprime/admin','/rmprime/admin/site','/other/admin']) {
 assert.equal(workspaceAccess(path,true),'platform_account_on_tenant');
 assert.equal(workspaceAccess(path,false),'allowed');
}
assert.equal(workspaceAccess('/super/control-plane',false),'tenant_account_on_platform');
assert.equal(workspaceAccess('/super',true),'allowed');
assert.equal(workspaceAccess('/invitations',false),'allowed');
const {supportRecoveryInput,requireRecentRecoveryAuthentication}=await load('src/lib/auth/support-recovery.ts');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const claims={session_id:id(1),amr:[{method:'password',timestamp:Math.floor(Date.now()/1000)}],aal:'aal1'};
requireRecentRecoveryAuthentication(claims);
for(const c of [{},{...claims,amr:[]},{...claims,amr:[{method:'otp',timestamp:Math.floor(Date.now()/1000)}]},
 {...claims,amr:[{method:'password',timestamp:0}]},{...claims,amr:[{method:'password',timestamp:Math.floor(Date.now()/1000)+100}]},{...claims,session_id:'invalid'}])
 assert.throws(()=>requireRecentRecoveryAuthentication(c));
const input={caseId:id(2),email:'admin@fixture.invalid',requestId:id(3),confirmed:true};
for(const extra of [{tenantId:id(5)},{actorId:id(4)},{redirectTo:'https://evil.invalid'},{password:'secret'},{confirmed:false}])
 assert.equal(supportRecoveryInput.safeParse({...input,...extra}).success,false);
const plugins=[{name:'server-isolation',setup(b){
 b.onResolve({filter:/^@tanstack\/react-start$/},()=>({path:'start',namespace:'fake'}));
 b.onResolve({filter:/auth-middleware$/},()=>({path:'auth',namespace:'fake'}));
 b.onResolve({filter:/client.server$/},()=>({path:'db',namespace:'fake'}));
 b.onLoad({filter:/.*/,namespace:'fake'},a=>({contents:a.path==='start'?`export const createServerFn=()=>({middleware(){return this},inputValidator(v){this.validate=v;return this},handler(fn){return arg=>fn({...arg,data:this.validate(arg.data)})}});`:a.path==='auth'?'export const requireSupabaseAuth={};':'export const supabaseAdmin=globalThis.recoveryDB;',loader:'js'}));
}}];
let calls=[],roleError=false,isSuper=true,prepared={data:{send:true,email:'verified@fixture.invalid'}},sendError=false,throwSend=false,finishError=false,mfa=false;
globalThis.recoveryDB={auth:{admin:{mfa:{listFactors:async()=>({data:{factors:mfa?[{status:'verified'}]:[]}})}},resetPasswordForEmail:async(email,options)=>{calls.push({email,options});if(throwSend)throw Error('transport');return {error:sendError?{}:null}}},rpc:async(name,args)=>{calls.push({name,args});return name.startsWith('reserve')?prepared:{error:finishError?{}:null}}};
const {requestSupportAdminRecovery:run}=await load('src/lib/api/support-admin-recovery.functions.ts',plugins);
const query={select(){return this},eq(){return this},async maybeSingle(){return {data:isSuper?{role:'super_admin'}:null,error:roleError?{}:null}}};
const context={userId:id(4),claims,supabase:{from:()=>query}};
for(const scenario of ['non_super','role_error','stale','mfa']){
 calls=[];isSuper=scenario!=='non_super';roleError=scenario==='role_error';mfa=scenario==='mfa';
 await assert.rejects(run({data:input,context:scenario==='stale'?{...context,claims:{}}:context}));assert.equal(calls.length,0);
}
isSuper=true;roleError=false;mfa=false;calls=[];
assert.equal((await run({data:input,context})).status,'accepted');
assert.equal(calls[0].args.p_actor,id(4));assert.equal(calls[0].args.p_session,id(1));
assert.equal(calls[1].email,'verified@fixture.invalid');assert.equal(calls[1].options.redirectTo,'https://realone.com.br/reset-password');
assert.equal(calls[2].args.p_outcome,'accepted');
calls=[];prepared={data:{send:false}};assert.equal((await run({data:input,context})).status,'already_requested');assert.equal(calls.length,1);
calls=[];prepared={error:{message:'recovery_rate_limited'}};await assert.rejects(run({data:input,context}),/cinco minutos/);assert.equal(calls.length,1);
prepared={data:{send:true,email:'verified@fixture.invalid'}};sendError=true;assert.equal((await run({data:input,context})).status,'failed');
sendError=false;throwSend=true;assert.equal((await run({data:input,context})).status,'unknown');
throwSend=false;finishError=true;assert.equal((await run({data:input,context})).status,'unknown');
console.log('PASS workspace route matrix, strict request/AMR validation, role/MFA denial, server-derived recipient, fixed redirect, duplicate/rate-limit suppression, provider and audit failures. No network/email.');
let currentUser={id:id(4)},superRole=true,roleFailure=false;
globalThis.boundaryFixture={getUser:async()=>({data:{user:currentUser}}),role:async()=>{if(roleFailure)throw Error('role unavailable');return superRole}};
const boundary=await load('src/routes/_authenticated.tsx',[{name:'boundary',setup(b){
 b.onResolve({filter:/^@tanstack\/react-router$/},()=>({path:'router',namespace:'boundary'}));
 b.onResolve({filter:/integrations\/supabase\/client$/},()=>({path:'client',namespace:'boundary'}));
 b.onResolve({filter:/api\/super.functions$/},()=>({path:'role',namespace:'boundary'}));
 b.onResolve({filter:/components\/workspace$/},()=>({path:'shell',namespace:'boundary'}));
 b.onResolve({filter:/useLogout$/},()=>({path:'logout',namespace:'boundary'}));
 b.onLoad({filter:/.*/,namespace:'boundary'},a=>({contents:{router:`export const createFileRoute=()=>x=>x;export const redirect=x=>Object.assign(Error('redirect'),x);export const Link=()=>null;`,client:`export const supabase={auth:{getUser:()=>globalThis.boundaryFixture.getUser()}};`,role:`export const meuAcessoSuperAdmin=()=>globalThis.boundaryFixture.role();`,shell:`export const WorkspaceShell=()=>{throw Error('SHELL_MUST_NOT_RENDER_DURING_AUTHORIZATION')};`,logout:`export const useLogout=()=>({});`}[a.path],loader:'js'}));
}}]);
await assert.rejects(boundary.Route.beforeLoad({location:{pathname:'/rmprime/admin/site'}}),/platform_account_on_tenant/);
superRole=false;assert.equal((await boundary.Route.beforeLoad({location:{pathname:'/rmprime/admin'}})).isSuperAdmin,false);
await assert.rejects(boundary.Route.beforeLoad({location:{pathname:'/super'}}),/tenant_account_on_platform/);
roleFailure=true;await assert.rejects(boundary.Route.beforeLoad({location:{pathname:'/rmprime/admin'}}),/role unavailable/);
currentUser=null;await assert.rejects(boundary.Route.beforeLoad({location:{pathname:'/rmprime/admin'}}),/redirect/);
console.log('PASS real authenticated parent: wrong-account/anonymous/role-error requests stop before workspace mounting.');
